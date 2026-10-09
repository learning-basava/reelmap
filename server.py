# Reelmap FastAPI server for AI generation, transcription, and static assets.
"""
Reelmap AI server
=================
Runs the Reelmap web app on your own machine with AI engines:

  * Google Gemini (Gemini 2.5 Flash / custom model) via GEMINI_API_KEY
  * Ollama (Gemma 3 / Llama 3.1 / Qwen 2.5) writes ideas, storyboards and post kits
  * Gemma 3's vision and Gemini multimodal read your reference images
  * faster-whisper turns your audio or video into a transcript (Kannada supported)

Start it:
    # With Gemini (cloud AI):
    set GEMINI_API_KEY=your_gemini_api_key   (PowerShell: $env:GEMINI_API_KEY="your_key")
    pip install -r requirements.txt
    python server.py

    # Or with Ollama (local AI):
    ollama pull gemma3:4b
    pip install -r requirements.txt
    python server.py

Then open http://localhost:8000.

Settings (environment variables):
    GEMINI_API_KEY  Gemini API key                default: none (required for Gemini)
    GEMINI_MODEL    Gemini model name             default: gemini-2.5-flash
    REELMAP_MODEL   Ollama model name             default: gemma3:4b
    OLLAMA_URL      where Ollama is running       default: http://localhost:11434
    WHISPER_MODEL   tiny | base | small | medium | large-v3   default: small
    HOST / PORT     where this server listens     default: 127.0.0.1 / 8000
"""

from __future__ import annotations

import base64
from collections import defaultdict
import contextlib
import logging
import os
import pathlib
import tempfile
import threading
import time
from collections.abc import Awaitable, Callable
from typing import Any, Literal

import httpx
import uvicorn
from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, Response, UploadFile
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator


# ==============================================================================
# Config
# ==============================================================================

logger = logging.getLogger("reelmap")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434").rstrip("/")
MODEL = os.getenv("REELMAP_MODEL", "gemma3:4b")
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "small")
GEMINI_MODEL_DEFAULT = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

# Binding to 0.0.0.0 is permitted only via the HOST env var for container deployments.
HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", "8000"))
HERE = pathlib.Path(__file__).resolve().parent
PAGE = HERE / "index.html"
STATIC_DIR = HERE / "static"
MAX_UPLOAD_MB = 500
is_debug = os.getenv("REELMAP_DEBUG", "0") == "1"

SECURITY_HEADERS: dict[str, str] = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Content-Security-Policy": (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src https://fonts.gstatic.com; "
        "img-src 'self' data: blob:; "
        "connect-src 'self'; "
        "frame-ancestors 'none'"
    ),
}

SKELETON_HEAD = (
    '<!doctype html><html lang="en"><head><meta charset="utf-8">'
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
    "<style>[hidden]{display:none!important}img{max-width:100%}body{margin:0}</style>"
    "</head><body>"
)


class LLMRequest(BaseModel):
    """Schema for validating content generation requests sent to LLM endpoints."""

    prompt: str = Field(..., min_length=1, max_length=60_000)
    images: list[str] = Field(default_factory=list, max_length=2)  # base64, no data: prefix
    format: Literal["json", "text"] | None = "json"
    temperature: float = Field(0.8, ge=0, le=2)
    engine: Literal["gemini", "local"] | None = None

    @field_validator("images")
    @classmethod
    def validate_images(cls, v: list[str]) -> list[str]:
        """Validate image payload count, maximum character size, and base64 encoding."""
        for img in v:
            if len(img) > 7_000_000:
                raise ValueError("Image exceeds maximum length of 7,000,000 characters")
            try:
                base64.b64decode(img, validate=True)
            except Exception as e:
                raise ValueError(f"Invalid base64 image encoding: {e}") from e
        return v


# ==============================================================================
# App and Middleware
# ==============================================================================

class RateLimiter:
    """In-memory rate limiter tracking timestamps per client IP address."""

    def __init__(self, limit: int = 20, window_seconds: float = 60.0) -> None:
        """Initialize the in-memory rate limiter with a request limit and window duration."""
        self.limit = limit
        self.window_seconds = window_seconds
        self.requests: dict[str, list[float]] = defaultdict(list)
        self.lock = threading.Lock()

    def check(self, key: str) -> bool:
        """Check whether a client IP has exceeded the allowed request limit in the current window."""
        now = time.time()
        with self.lock:
            for k in list(self.requests.keys()):
                recent = [t for t in self.requests[k] if now - t < self.window_seconds]
                if recent:
                    self.requests[k] = recent
                else:
                    del self.requests[k]

            timestamps = self.requests.get(key, [])
            if len(timestamps) >= self.limit:
                return False
            timestamps.append(now)
            self.requests[key] = timestamps
            return True

    def reset(self) -> None:
        """Reset all tracked client request timestamps."""
        with self.lock:
            self.requests.clear()


rate_limiter = RateLimiter(limit=20, window_seconds=60.0)


def check_rate_limit(request: Request) -> None:
    """Enforce per-client IP rate limits across protected API endpoints."""
    forwarded = request.headers.get("x-forwarded-for")
    ip = forwarded.split(",")[-1].strip() if forwarded else (request.client.host if request.client else "127.0.0.1")
    if not rate_limiter.check(ip):
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please wait a minute before making more requests.",
        )


app = FastAPI(
    title="Reelmap AI",
    version="2.1",
    docs_url="/docs" if is_debug else None,
    redoc_url="/redoc" if is_debug else None,
    openapi_url="/openapi.json" if is_debug else None,
)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.middleware("http")
async def add_security_headers(request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
    """Inject required HTTP security and content protection headers into each response."""
    response = await call_next(request)
    for header, value in SECURITY_HEADERS.items():
        response.headers[header] = value
    return response


# ==============================================================================
# Helpers
# ==============================================================================

_model_info: dict[str, dict[str, bool]] = {}


async def _ollama_status() -> dict[str, Any]:
    """Query local Ollama server for service reachability, model availability, and vision support."""
    try:
        async with httpx.AsyncClient(timeout=4) as client:
            tags = (await client.get(f"{OLLAMA_URL}/api/tags")).json()
            names = {m.get("name", "") for m in tags.get("models", [])}
            pulled = MODEL in names or f"{MODEL}:latest" in names
            if not pulled:
                return {"model_ready": False, "error": f"Model not pulled. Run: ollama pull {MODEL}"}
            if MODEL not in _model_info:
                show = (await client.post(f"{OLLAMA_URL}/api/show", json={"model": MODEL})).json()
                _model_info[MODEL] = {"vision": "vision" in (show.get("capabilities") or [])}
            return {"model_ready": True, "vision": _model_info[MODEL]["vision"]}
    except httpx.HTTPError as e:
        logger.warning("Ollama connection failed: %s", e)
        return {"model_ready": False, "error": "Ollama isn't running. Start the Ollama app, or run: ollama serve"}


def _whisper_installed() -> bool:
    """Check if faster-whisper is installed and available for local transcription."""
    try:
        import faster_whisper  # noqa: F401
        return True
    except ImportError:
        return False


def _detect_mime_type(b64: str) -> str:
    """Infer image MIME content type from initial base64 signature bytes."""
    if b64.startswith("/9j/"):
        return "image/jpeg"
    if b64.startswith("iVBORw0KGgo"):
        return "image/png"
    if b64.startswith("R0lGOD"):
        return "image/gif"
    if b64.startswith("UklGR"):
        return "image/webp"
    return "image/jpeg"


def _get_gemini_key() -> str:
    """Retrieve sanitized GEMINI_API_KEY from environment variables."""
    return os.getenv("GEMINI_API_KEY", "").strip()


def _get_gemini_model() -> str:
    """Retrieve configured Gemini model identifier from environment variables."""
    return os.getenv("GEMINI_MODEL", GEMINI_MODEL_DEFAULT).strip() or GEMINI_MODEL_DEFAULT


async def _call_gemini(req: LLMRequest) -> dict[str, Any]:
    """Send generation request and reference images to Google Gemini API."""
    api_key = _get_gemini_key()
    if not api_key:
        raise HTTPException(
            503,
            "GEMINI_API_KEY is not set. Start server.py with GEMINI_API_KEY set in your environment.",
        )
    model = _get_gemini_model()

    parts: list[dict[str, Any]] = []
    for img in req.images:
        parts.append({
            "inlineData": {
                "mimeType": _detect_mime_type(img),
                "data": img,
            }
        })
    parts.append({"text": req.prompt})

    gen_config: dict[str, Any] = {
        "temperature": req.temperature,
    }
    if req.format == "json":
        gen_config["responseMimeType"] = "application/json"

    body = {
        "contents": [
            {
                "role": "user",
                "parts": parts,
            }
        ],
        "generationConfig": gen_config,
    }

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    headers = {
        "x-goog-api-key": api_key,
        "Content-Type": "application/json",
    }

    t0 = time.time()
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(120, connect=10)) as client:
            r = await client.post(url, headers=headers, json=body)
    except httpx.HTTPError as e:
        logger.error("Failed to reach Gemini API: %s", e)
        raise HTTPException(502, "The AI service returned an error. Please try again.") from e

    elapsed = round(time.time() - t0, 1)

    if r.status_code != 200:
        err_detail = r.text
        with contextlib.suppress(Exception):
            err_json = r.json()
            if "error" in err_json and "message" in err_json["error"]:
                err_detail = err_json["error"]["message"]
        logger.error("Gemini API error (%d): %s", r.status_code, err_detail)
        raise HTTPException(502, "The AI service returned an error. Please try again.")

    data = r.json()
    candidates = data.get("candidates") or []
    if not candidates:
        feedback = data.get("promptFeedback", {})
        block_reason = feedback.get("blockReason", "No response candidates returned")
        logger.warning("Gemini returned no candidates: %s", block_reason)
        raise HTTPException(502, "The AI service returned an error. Please try again.")

    c_parts = candidates[0].get("content", {}).get("parts") or []
    text = "".join(p.get("text", "") for p in c_parts)
    return {"text": text, "model": model, "seconds": elapsed}


_whisper = None
_whisper_lock = threading.Lock()


def _get_whisper() -> Any:
    """Retrieve or lazily initialize the singleton WhisperModel instance."""
    global _whisper
    with _whisper_lock:
        if _whisper is None:
            from faster_whisper import WhisperModel
            # int8 runs on any CPU; a CUDA GPU is used automatically when available.
            _whisper = WhisperModel(WHISPER_MODEL, device="auto", compute_type="int8")
        return _whisper


def _transcribe_file(path: str, language: str | None) -> dict[str, Any]:
    """Transcribe audio or video media file from disk using faster-whisper."""
    model = _get_whisper()
    segments, info = model.transcribe(path, language=language or None, vad_filter=True, beam_size=5)
    segs = [{"start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip()} for s in segments]
    return {"text": " ".join(s["text"] for s in segs).strip(), "language": info.language,
            "duration": round(info.duration, 1), "segments": segs}


# ==============================================================================
# Routes
# ==============================================================================

@app.get("/", response_class=HTMLResponse)
def index() -> HTMLResponse:
    """Serve the single-page application interface document."""
    if not PAGE.exists():
        raise HTTPException(404, "index.html not found next to server.py")
    html = PAGE.read_text(encoding="utf-8")
    stripped = html.lstrip()
    while stripped.startswith("<!--"):
        end_comment = stripped.find("-->")
        if end_comment == -1:
            break
        stripped = stripped[end_comment + 3:].lstrip()
    if not stripped.lower().startswith("<!doctype"):
        html = SKELETON_HEAD + html + "</body></html>"
    return HTMLResponse(html, headers={"Cache-Control": "no-store"})


@app.get("/favicon.ico", include_in_schema=False)
def favicon() -> Response:
    """Return empty 204 No Content response for browser favicon requests."""
    return Response(status_code=204)


@app.get("/api/health")
async def health() -> dict[str, Any]:
    """Report application health and AI engine readiness status."""
    status = await _ollama_status()
    gemini_key = _get_gemini_key()
    gemini_model = _get_gemini_model()
    return {
        "app": "reelmap",
        "model": MODEL,
        "whisper": _whisper_installed(),
        "vision": status.get("vision", False) or bool(gemini_key),
        "gemini_ready": bool(gemini_key),
        "gemini_model": gemini_model,
        "gemini_error": "" if gemini_key else "GEMINI_API_KEY environment variable not set",
        "ollama_ready": status.get("model_ready", False),
        **status,
    }


@app.post("/api/llm", dependencies=[Depends(check_rate_limit)])
async def llm(req: LLMRequest) -> dict[str, Any]:
    """Execute prompt generation routing to Gemini or local Ollama."""
    if req.engine == "gemini":
        return await _call_gemini(req)

    status = await _ollama_status()
    if not status.get("model_ready"):
        if req.engine != "local" and _get_gemini_key():
            return await _call_gemini(req)
        raise HTTPException(503, status.get("error", "Model not ready"))
    message: dict[str, Any] = {"role": "user", "content": req.prompt}
    if req.images and status.get("vision"):
        message["images"] = req.images
    body = {
        "model": MODEL,
        "messages": [message],
        "stream": False,
        "options": {"temperature": req.temperature, "num_ctx": 8192},
    }
    if req.format == "json":
        body["format"] = "json"
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(600, connect=5)) as client:
            r = await client.post(f"{OLLAMA_URL}/api/chat", json=body)
    except httpx.HTTPError as e:
        logger.error("Failed to reach Ollama: %s", e)
        raise HTTPException(502, "The AI service returned an error. Please try again.") from e
    if r.status_code != 200:
        logger.error("Ollama error (%d): %s", r.status_code, r.text[:300])
        raise HTTPException(502, "The AI service returned an error. Please try again.")
    data = r.json()
    return {"text": data.get("message", {}).get("content", ""), "model": MODEL,
            "seconds": round(data.get("total_duration", 0) / 1e9, 1)}


@app.post("/api/gemini", dependencies=[Depends(check_rate_limit)])
async def gemini(req: LLMRequest) -> dict[str, Any]:
    """Execute prompt generation directly against Google Gemini API."""
    return await _call_gemini(req)


@app.post("/api/transcribe", dependencies=[Depends(check_rate_limit)])
async def transcribe(file: UploadFile = File(...), language: str | None = Form(None)) -> dict[str, Any]:
    """Transcribe uploaded audio or video recording to text using Whisper."""
    content_type = file.content_type or ""
    if not (content_type.startswith("audio/") or content_type.startswith("video/")):
        raise HTTPException(415, "Unsupported media type. Only audio and video files are supported.")
    if not _whisper_installed():
        raise HTTPException(503, "Whisper isn't installed. Run: pip install faster-whisper")
    suffix = pathlib.Path(file.filename or "upload").suffix or ".bin"
    size = 0
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        while chunk := await file.read(1 << 20):
            size += len(chunk)
            if size > MAX_UPLOAD_MB << 20:
                tmp.close()
                with contextlib.suppress(OSError):
                    os.unlink(tmp.name)
                raise HTTPException(413, f"File is over {MAX_UPLOAD_MB} MB")
            tmp.write(chunk)
        path = tmp.name
    try:
        from starlette.concurrency import run_in_threadpool
        return await run_in_threadpool(_transcribe_file, path, language)
    except Exception as e:  # decoding errors, unsupported codecs
        logger.error("Audio transcription failed: %s", e)
        raise HTTPException(422, "Couldn't transcribe this file. Please verify the audio format.") from e
    finally:
        with contextlib.suppress(OSError):
            os.unlink(path)


if __name__ == "__main__":
    host_display = "localhost" if HOST in ("127.0.0.1", "0.0.0.0") else HOST  # noqa: S104 # nosec B104 - containers bind to 0.0.0.0 via HOST env var
    print(f"\n  Reelmap is running at http://{host_display}:{PORT}")
    gemini_status = f"configured ({_get_gemini_model()})" if _get_gemini_key() else "not set (GEMINI_API_KEY)"
    print(f"  Gemini: {gemini_status}   Ollama: {MODEL} via {OLLAMA_URL}   Whisper: {WHISPER_MODEL}\n")
    uvicorn.run(app, host=HOST, port=PORT, log_level="warning")
