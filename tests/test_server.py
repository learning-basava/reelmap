import sys
from pathlib import Path

# Ensure root directory is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import httpx
import pytest
from fastapi.testclient import TestClient

import server
from server import app


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    server.rate_limiter.reset()
    yield
    server.rate_limiter.reset()


def test_index_and_static(client):
    r_index = client.get("/")
    assert r_index.status_code == 200
    assert "Reelmap" in r_index.text

    r_static = client.get("/static/logic.js")
    assert r_static.status_code == 200


def test_health_without_gemini_key(client, monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    async def fake_ollama_status():
        return {"model_ready": False, "error": "offline"}

    monkeypatch.setattr(server, "_ollama_status", fake_ollama_status)

    r = client.get("/api/health")
    assert r.status_code == 200
    data = r.json()
    assert data.get("app") == "reelmap"
    assert data.get("gemini_ready") is False


def test_llm_prompt_validation(client):
    r_empty = client.post("/api/llm", json={"prompt": ""})
    assert r_empty.status_code == 422

    r_long = client.post("/api/llm", json={"prompt": "a" * 60_001})
    assert r_long.status_code == 422


def test_llm_invalid_engine(client):
    r = client.post("/api/llm", json={"prompt": "test", "engine": "openai"})
    assert r.status_code == 422


def test_llm_invalid_base64_image(client):
    r = client.post("/api/llm", json={"prompt": "test", "images": ["invalid_base64!!!"]})
    assert r.status_code == 422


def test_gemini_without_key(client, monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    r = client.post("/api/gemini", json={"prompt": "test prompt"})
    assert r.status_code == 503


def test_gemini_success_with_key(client, monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "fake-key")

    async def fake_post_200(self, *args, **kwargs):
        return httpx.Response(
            200,
            json={
                "candidates": [
                    {
                        "content": {
                            "parts": [
                                {"text": '{"ok":true}'}
                            ]
                        }
                    }
                ]
            },
        )

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post_200)

    r = client.post("/api/gemini", json={"prompt": "test prompt"})
    assert r.status_code == 200
    data = r.json()
    assert data.get("text") == '{"ok":true}'


def test_gemini_failure_returns_502(client, monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "fake-key")

    async def fake_post_500(self, *args, **kwargs):
        return httpx.Response(500, json={"error": {"message": "Gemini API failure"}})

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post_500)

    r = client.post("/api/gemini", json={"prompt": "test prompt"})
    assert r.status_code == 502


def test_rate_limiter_21st_request_returns_429(client, monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    for _ in range(20):
        r = client.post("/api/gemini", json={"prompt": "ping"})
        assert r.status_code != 429
    r21 = client.post("/api/gemini", json={"prompt": "ping"})
    assert r21.status_code == 429
    assert "Rate limit exceeded" in r21.text or "rate limit" in r21.text.lower()


def test_security_headers_present(client):
    r = client.get("/")
    assert r.status_code == 200
    assert r.headers["X-Content-Type-Options"] == "nosniff"
    assert r.headers["X-Frame-Options"] == "DENY"
    assert r.headers["Referrer-Policy"] == "no-referrer"
    assert r.headers["Permissions-Policy"] == "camera=(), microphone=(), geolocation=()"
    assert "default-src 'self'" in r.headers["Content-Security-Policy"]
    assert "frame-ancestors 'none'" in r.headers["Content-Security-Policy"]


def test_docs_disabled(client, monkeypatch):
    monkeypatch.delenv("REELMAP_DEBUG", raising=False)
    r = client.get("/docs")
    assert r.status_code == 404


def test_transcribe_without_whisper(client, monkeypatch):
    monkeypatch.setattr(server, "_whisper_installed", lambda: False)

    files = {"file": ("audio.mp3", b"dummy audio content", "audio/mpeg")}
    r = client.post("/api/transcribe", files=files)
    assert r.status_code == 503


def test_transcribe_unsupported_media_type(client):
    files = {"file": ("test.txt", b"plain text", "text/plain")}
    r = client.post("/api/transcribe", files=files)
    assert r.status_code == 415
