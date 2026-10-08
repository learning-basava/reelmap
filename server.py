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

import os
import pathlib
import tempfile
import threading
import time

import httpx
import uvicorn
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434").rstrip("/")
MODEL = os.getenv("REELMAP_MODEL", "gemma3:4b")
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "small")
GEMINI_MODEL_DEFAULT = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", "8000"))
HERE = pathlib.Path(__file__).resolve().parent
PAGE = HERE / "index.html"
MAX_UPLOAD_MB = 500

app = FastAPI(title="Reelmap AI", version="2.1")

# ---------------------------------------------------------------- page
SKELETON_HEAD = (
    '<!doctype html><html lang="en"><head><meta charset="utf-8">'
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
    "<style>[hidden]{display:none!important}img{max-width:100%}body{margin:0}</style>"
    "</head><body>"
)


@app.get("/", response_class=HTMLResponse)
def index() -> HTMLResponse:
    """Serve the app. index.html is written for Claude artifacts (no <html> wrapper), so wrap it."""
    if not PAGE.exists():
        raise HTTPException(404, "index.html not found next to server.py")
    html = PAGE.read_text(encoding="utf-8")
    if not html.lstrip().lower().startswith("<!doctype"):
        html = SKELETON_HEAD + html + "</body></html>"
    return HTMLResponse(html, headers={"Cache-Control": "no-store"})


# ---------------------------------------------------------------- health
_model_info: dict = {}


async def _ollama_status() -> dict:
    """Is Ollama up, is the model pulled, can it read images?"""
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
    except httpx.HTTPError:
        return {"model_ready": False, "error": "Ollama isn't running. Start the Ollama app, or run: ollama serve"}


def _whisper_installed() -> bool:
    try:
        import faster_whisper  # noqa: F401
        return True
    except ImportError:
        return False


def _detect_mime_type(b64: str) -> str:
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
    return os.getenv("GEMINI_API_KEY", "").strip()


def _get_gemini_model() -> str:
    return os.getenv("GEMINI_MODEL", GEMINI_MODEL_DEFAULT).strip() or GEMINI_MODEL_DEFAULT


async def _call_gemini(req: LLMRequest) -> dict:
    api_key = _get_gemini_key()
    if not api_key:
        raise HTTPException(
            503,
            "GEMINI_API_KEY is not set. Start server.py with GEMINI_API_KEY set in your environment.",
        )
    model = _get_gemini_model()

    parts: list[dict] = []
    for img in req.images:
        parts.append({
            "inlineData": {
                "mimeType": _detect_mime_type(img),
                "data": img,
            }
        })
    parts.append({"text": req.prompt})

    gen_config: dict = {
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
        raise HTTPException(502, f"Couldn't reach Gemini API: {e}") from e

    elapsed = round(time.time() - t0, 1)

    if r.status_code != 200:
        err_detail = r.text
        try:
            err_json = r.json()
            if "error" in err_json and "message" in err_json["error"]:
                err_detail = err_json["error"]["message"]
        except Exception:
            pass
        raise HTTPException(502, f"Gemini error {r.status_code}: {err_detail[:300]}")

    data = r.json()
    candidates = data.get("candidates") or []
    if not candidates:
        feedback = data.get("promptFeedback", {})
        block_reason = feedback.get("blockReason", "No response candidates returned")
        raise HTTPException(502, f"Gemini returned no response: {block_reason}")

    c_parts = candidates[0].get("content", {}).get("parts") or []
    text = "".join(p.get("text", "") for p in c_parts)
    return {"text": text, "model": model, "seconds": elapsed}


@app.get("/api/health")
async def health() -> dict:
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


# ---------------------------------------------------------------- LLM
class LLMRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=60_000)
    images: list[str] = Field(default_factory=list, max_length=4)  # base64, no data: prefix
    format: str | None = "json"
    temperature: float = Field(0.8, ge=0, le=2)
    engine: str | None = None


@app.post("/api/llm")
async def llm(req: LLMRequest) -> dict:
    """One prompt in, one answer out. The browser builds the prompts so engines share them."""
    if req.engine == "gemini":
        return await _call_gemini(req)

    status = await _ollama_status()
    if not status.get("model_ready"):
        if req.engine != "local" and _get_gemini_key():
            return await _call_gemini(req)
        raise HTTPException(503, status.get("error", "Model not ready"))
    message: dict = {"role": "user", "content": req.prompt}
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
        raise HTTPException(502, f"Couldn't reach Ollama: {e}") from e
    if r.status_code != 200:
        raise HTTPException(502, f"Ollama error {r.status_code}: {r.text[:300]}")
    data = r.json()
    return {"text": data.get("message", {}).get("content", ""), "model": MODEL,
            "seconds": round(data.get("total_duration", 0) / 1e9, 1)}


@app.post("/api/gemini")
async def gemini(req: LLMRequest) -> dict:
    """Direct endpoint to call Gemini API."""
    return await _call_gemini(req)


# ---------------------------------------------------------------- Whisper
_whisper = None
_whisper_lock = threading.Lock()


def _get_whisper():
    global _whisper
    with _whisper_lock:
        if _whisper is None:
            from faster_whisper import WhisperModel
            # int8 runs on any CPU; a CUDA GPU is used automatically when available.
            _whisper = WhisperModel(WHISPER_MODEL, device="auto", compute_type="int8")
        return _whisper


def _transcribe_file(path: str, language: str | None) -> dict:
    model = _get_whisper()
    segments, info = model.transcribe(path, language=language or None, vad_filter=True, beam_size=5)
    segs = [{"start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip()} for s in segments]
    return {"text": " ".join(s["text"] for s in segs).strip(), "language": info.language,
            "duration": round(info.duration, 1), "segments": segs}


@app.post("/api/transcribe")
async def transcribe(file: UploadFile = File(...), language: str | None = Form(None)) -> dict:
    """Audio or video in, transcript out. Pass language="kn" to force Kannada."""
    if not _whisper_installed():
        raise HTTPException(503, "Whisper isn't installed. Run: pip install faster-whisper")
    suffix = pathlib.Path(file.filename or "upload").suffix or ".bin"
    size = 0
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        while chunk := await file.read(1 << 20):
            size += len(chunk)
            if size > MAX_UPLOAD_MB << 20:
                tmp.close(); os.unlink(tmp.name)
                raise HTTPException(413, f"File is over {MAX_UPLOAD_MB} MB")
            tmp.write(chunk)
        path = tmp.name
    try:
        from starlette.concurrency import run_in_threadpool
        return await run_in_threadpool(_transcribe_file, path, language)
    except Exception as e:  # decoding errors, unsupported codecs
        raise HTTPException(422, f"Couldn't transcribe this file: {e}") from e
    finally:
        try:
            os.unlink(path)
        except OSError:
            pass


if __name__ == "__main__":
    print(f"\n  Reelmap is running at http://{'localhost' if HOST in ('127.0.0.1', '0.0.0.0') else HOST}:{PORT}")
    gemini_status = f"configured ({_get_gemini_model()})" if _get_gemini_key() else "not set (GEMINI_API_KEY)"
    print(f"  Gemini: {gemini_status}   Ollama: {MODEL} via {OLLAMA_URL}   Whisper: {WHISPER_MODEL}\n")
    uvicorn.run(app, host=HOST, port=PORT, log_level="warning")
