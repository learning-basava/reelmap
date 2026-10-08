# Reelmap

Plan content before you shoot, and get a ready-to-paste post kit after.
Built for faceless, on-camera and product-only creators, in English, Kannada and Kanglish.

## Four ways it runs

| Engine | When | What you need |
|---|---|---|
| **Gemini** | You run `server.py` with `GEMINI_API_KEY` set | Google Gemini API key + Python |
| **Local open-source AI** | You run `server.py` and open http://localhost:8000 | Ollama + Python |
| **Claude** | Someone opens the shared Claude link | A Claude account (it asks once) |
| **Offline templates** | No AI reachable | Nothing. Instant and stage-safe |

The app picks the best one automatically. Click the engine pill (top right) to switch or force one.

## Quickstart

### Option A: Run with Gemini (Cloud AI)

1. **Install the Python packages** (Python 3.10 or newer):
   ```
   pip install -r requirements.txt
   ```

2. **Set your Gemini API key**:
   ```powershell
   # Windows PowerShell:
   $env:GEMINI_API_KEY = "your-gemini-api-key"
   
   # Command Prompt:
   set GEMINI_API_KEY=your-gemini-api-key
   
   # Linux/macOS:
   export GEMINI_API_KEY="your-gemini-api-key"
   ```

3. **Start Reelmap**:
   ```
   python server.py
   ```

4. **Open http://localhost:8000.** The pill in the top right will show `Gemini · gemini-2.5-flash`.

### Option B: Run the open-source version (Ollama)

1. **Install Ollama** from https://ollama.com and pull a model:
   ```
   ollama pull gemma3:4b
   ```
   `gemma3:4b` runs on most laptops (8 GB RAM) and can read images.
   On a stronger machine try `gemma3:12b`. For a text-only model: `llama3.1:8b` or `qwen2.5:7b`.

2. **Install the Python packages**:
   ```
   pip install -r requirements.txt
   ```

3. **Start Reelmap** from this folder:
   ```
   python server.py
   ```

4. **Open http://localhost:8000.** The pill in the top right will say `Local AI · gemma3:4b`.

### Settings

Set these before `python server.py`:

| Variable | Default | Use it to |
|---|---|---|
| `GEMINI_API_KEY` | *(none)* | Your Google Gemini API key |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Custom Gemini model name |
| `REELMAP_MODEL` | `gemma3:4b` | Pick another Ollama model |
| `WHISPER_MODEL` | `small` | `large-v3` gives better Kannada, but it's slower |
| `OLLAMA_URL` | `http://localhost:11434` | Point at Ollama on another machine |
| `HOST` / `PORT` | `127.0.0.1` / `8000` | Use `HOST=0.0.0.0` to open it from your phone on the same Wi-Fi |

The first audio upload downloads the Whisper model (about 500 MB for `small`), so the first transcription is slow.

## Files

- `index.html`: the whole app (UI, prompts, ranking, offline engine, humanizer)
- `server.py`: FastAPI server with `/api/health`, `/api/llm` (Ollama) and `/api/transcribe` (faster-whisper)
- `requirements.txt`: Python packages

## Troubleshooting

- **Pill says "Offline templates" on localhost.** Open the pill. It names the problem: Ollama isn't running, or the model isn't pulled.
- **Answers are slow.** Small local models take 10 to 60 seconds per answer on a CPU. Use `gemma3:4b`, or close other apps.
- **Kannada reads oddly.** Small models write passable Kannada, not perfect Kannada. Try `gemma3:12b`, and have a native speaker check before a demo.
- **No Kannada read-aloud voice.** It depends on the device. Android Chrome and Windows with the Kannada language pack usually have one.
