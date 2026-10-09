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

## Deploy to Cloud Run

Deploy Reelmap directly to Google Cloud Run using the Google Cloud CLI:

```bash
gcloud run deploy reelmap \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY="your-gemini-api-key"
```

Or build and run the container locally with Docker:

```bash
docker build -t reelmap .
docker run -p 8080:8080 -e GEMINI_API_KEY="your-gemini-api-key" reelmap
```

## Architecture

The browser builds the prompts → `server.py` routes to Gemini, Ollama or the offline fallback → JSON is validated, humanized and rendered.

Specifically, the single-page web app structures user inputs (topic, format, creator niche, audience, and reference images) into deterministic, schema-constrained prompts directly on the client. Requests are dispatched to `server.py`, which enforces in-memory rate limiting and security headers before routing generation to Google Gemini (cloud), Ollama (local open-source models like Gemma 3), or falling back to client-side rule-based templates if no AI engine is reachable. Returned JSON is strictly validated, scrubbed of generic AI clichés by the humanizer engine, ranked according to platform-specific algorithm weights, and rendered into interactive storyboards and ready-to-post publishing kits.

## Problem → Solution

| Creator Pain Point | Reelmap Solution |
|---|---|
| **No roadmap** | Generates an actionable 7-day production roadmap with daily tasks from scripting to shooting, editing, and publishing. |
| **Blank mind** | Produces 5 tailored, niche-specific video ideas with viral hooks and platform ranking scores (completion, shares, saves, effort). |
| **Storyboard** | Builds shot-by-shot 9:16 visual cards with app safe zones, timecodes, camera angles, on-screen text, voiceover, and props list. |
| **Captions** | Generates humanized, conversational short and story-style captions stripped of stock AI clichés and buzzwords. |
| **Hashtags and SEO** | Extracts searchable spoken keywords, title variations, thumbnail hooks, and balanced broad/niche/micro hashtags. |
| **Posting time** | Recommends optimal platform-specific posting time slots (in IST) based on creator niche and audience behavior. |

## Project structure

```
reelmap/
├── .github/
│   └── workflows/
│       └── tests.yml              # CI workflow (ruff linting, pytest, node tests)
├── static/
│   ├── app.js                     # UI state, event handling, modals, and rendering
│   ├── logic.js                   # Pure helper logic, algorithms, scoring, and constants
│   └── styles.css                 # Design system, accessible components, and dark mode
├── tests/
│   ├── index.js                   # Test entrypoint for Node.js test runner
│   ├── logic.test.js              # Pure JavaScript logic and algorithm unit tests
│   └── test_server.py             # FastAPI backend tests (endpoints, rate limits, headers)
├── .dockerignore                  # Docker build ignore rules
├── .env.example                   # Environment variable template
├── .gitignore                     # Git ignore patterns
├── Dockerfile                     # Cloud Run container specification
├── index.html                     # Semantic SPA markup, skip link, accessible landmarks
├── pyproject.toml                 # Tool configuration for pytest and ruff
├── README.md                      # Project documentation and guide
├── requirements.txt               # Production Python dependencies
├── requirements-cloud.txt         # Lightweight Cloud Run dependencies
├── requirements-dev.txt           # Development dependencies (pytest, ruff, testclient)
├── SECURITY.md                    # Security policy, CSP documentation, and headers
└── server.py                      # FastAPI backend with rate limiting and AI routing
```

## Testing

Install development dependencies:
```bash
pip install -r requirements-dev.txt
```

Run Python tests:
```bash
pytest -q
```

Run JavaScript logic tests:
```bash
node --test tests/
```

## Accessibility

Reelmap is built to WCAG 2.2 AA standards and audited with axe-core:

- **Keyboard support**: Full keyboard navigation across all views with high-contrast `:focus-visible` outlines on every control. Includes a "Skip to main content" link at the top of the page, focus trapping inside modal dialogs with return-to-trigger focus management, keyboard-scrollable storyboard frames (`tabindex="0" role="region"`), `Escape` shortcuts to close dialogs or abort generation, `Ctrl+Enter` (`Cmd+Enter`) shortcuts to generate, and hit targets of at least 24×24 px.
- **Screen-reader labels**: Accessible document hierarchy (`<h1>` branding, `<nav aria-label="Main">` with `aria-current="page"`, `<main id="main">`, `<section aria-label="Your creator profile">`). Form controls and chip groups (format, platform, goal, language, voice, post to) use `role="group"` with `aria-labelledby` referencing their visible labels. Dynamic generation indicators use `role="status"` and `aria-live="polite"`.
- **Reduced motion**: Respects `prefers-reduced-motion: reduce` by disabling CSS animations and transitions across the interface.
- **Dark mode**: Automatic system-matched dark mode via `prefers-color-scheme: dark` (plus `[data-theme]` support) with WCAG-compliant contrast ratios across surfaces, text, and interactive states.
- **English/Kannada interface**: Full bilingual UI support for English and Kannada (`ಕನ್ನಡ`), styled with `Noto Sans Kannada` for clear, readable typography across desktop and mobile.

## Troubleshooting

- **Pill says "Offline templates" on localhost.** Open the pill. It names the problem: Ollama isn't running, or the model isn't pulled.
- **Answers are slow.** Small local models take 10 to 60 seconds per answer on a CPU. Use `gemma3:4b`, or close other apps.
- **Kannada reads oddly.** Small models write passable Kannada, not perfect Kannada. Try `gemma3:12b`, and have a native speaker check before a demo.
- **No Kannada read-aloud voice.** It depends on the device. Android Chrome and Windows with the Kannada language pack usually have one.
