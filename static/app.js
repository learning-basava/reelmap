// Main application logic, UI state management, rendering, and event handlers for Reelmap.
"use strict";
/* ============================================================
   Reelmap · plan content before you shoot, post it right after.
   Engines: local open-source server (Ollama + Whisper) → Claude (in
   the shared link) → offline templates. Same prompts for both AIs.
   ============================================================ */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => Math.random().toString(36).slice(2, 10);
const KEY = "reelmap.v2";

const STAGES = ["Idea", "Scripted", "Filmed", "Posted"];

/* ---------- Interface strings (EN / ಕನ್ನಡ) ---------- */
const I18N = {
  en: {},
  kn: {
    "nav.plan": "ಯೋಜನೆ", "nav.publish": "ಪಬ್ಲಿಶ್", "nav.library": "ಲೈಬ್ರರಿ", "nav.how": "Reelmap ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತೆ", "nav.reviews": "ಅಭಿಪ್ರಾಯ", "nav.reviews2": "ಅಭಿಪ್ರಾಯ ಕೊಡಿ",
    "profile.creating": "ಯಾರಿಗೆ", "profile.edit": "ಬದಲಿಸಿ", "optional": "ಐಚ್ಛಿಕ", "more": "ಇನ್ನಷ್ಟು ಆಯ್ಕೆಗಳು",
    "plan.eyebrow": "ಹಂತ 1 · ಶೂಟ್ ಮಾಡುವ ಮೊದಲು", "plan.title": "ಯಾವ ಕಂಟೆಂಟ್ ಮಾಡಬೇಕು?", "plan.topic": "ವಿಷಯ ಅಥವಾ ಐಡಿಯಾ",
    "plan.format": "ಫಾರ್ಮ್ಯಾಟ್", "fmt.faceless": "ಮುಖ ತೋರಿಸದೆ", "fmt.faceless.d": "ವಾಯ್ಸ್‌ಓವರ್, ಕೈಗಳು, ಸ್ಕ್ರೀನ್, ಬಿ-ರೋಲ್",
    "fmt.face": "ಕ್ಯಾಮೆರಾ ಮುಂದೆ", "fmt.face.d": "ನೀವೇ ಮಾತಾಡ್ತೀರಿ", "fmt.product": "ಪ್ರಾಡಕ್ಟ್ ಮಾತ್ರ", "fmt.product.d": "ಪ್ರಾಡಕ್ಟ್ ಹೀರೋ",
    "plan.platform": "ಪ್ಲಾಟ್‌ಫಾರ್ಮ್", "plan.goal": "ಗುರಿ", "plan.refs": "ರೆಫರೆನ್ಸ್ ಚಿತ್ರಗಳು", "plan.refs.max": "2 ವರೆಗೆ",
    "plan.refs.hint": "ನಿಮಗೆ ಇಷ್ಟವಾದ ಲುಕ್‌ನ ಚಿತ್ರ ಸೇರಿಸಿ", "plan.lang": "ಔಟ್‌ಪುಟ್ ಭಾಷೆ", "plan.go": "5 ಐಡಿಯಾ ಪಡೆಯಿರಿ",
    "pub.eyebrow": "ಹಂತ 2 · ಶೂಟ್ ಆದ ಮೇಲೆ", "pub.title": "ಸ್ಕ್ರಿಪ್ಟ್ ಹಾಕಿ, ಪೋಸ್ಟ್ ಕಿಟ್ ಪಡೆಯಿರಿ", "pub.transcript": "ವಿಡಿಯೋದಲ್ಲಿ ನೀವು ಹೇಳೋದು",
    "pub.topic": "ವಿಡಿಯೋ ಯಾವುದರ ಬಗ್ಗೆ?", "pub.platforms": "ಎಲ್ಲಿ ಪೋಸ್ಟ್ ಮಾಡ್ತೀರಿ", "pub.multi": "ಒಂದು ಅಥವಾ ಹೆಚ್ಚು",
    "pub.voice": "ಕ್ಯಾಪ್ಷನ್ ಧ್ವನಿ", "pub.go": "ಪೋಸ್ಟ್ ಕಿಟ್ ಮಾಡಿ",
    "lib.eyebrow": "ನಿಮ್ಮ ಕಂಟೆಂಟ್ ಪೈಪ್‌ಲೈನ್", "lib.title": "ಲೈಬ್ರರಿ", "lib.export": "ಎಲ್ಲಾ ಎಕ್ಸ್‌ಪೋರ್ಟ್",
    "rev.eyebrow": "ಎರಡೂ ಹಂತ ಬಳಸಿದ ಮೇಲೆ, ಎರಡು ನಿಮಿಷ", "rev.title": "Reelmap ವಿಮರ್ಶೆ", "rev.best": "ಯಾವುದು ಹೆಚ್ಚು ಉಪಯೋಗ ಆಯ್ತು?",
    "rev.confusing": "ಯಾವುದು ಗೊಂದಲ ಅಥವಾ ನಿಧಾನ ಅನಿಸಿತು?", "rev.use": "ನಿಮ್ಮ ಕಂಟೆಂಟ್‌ಗೆ ಇದನ್ನು ಬಳಸ್ತೀರಾ?", "rev.role": "ನೀವು…",
    "rev.name": "ಹೆಸರು ಅಥವಾ ಹ್ಯಾಂಡಲ್", "rev.submit": "ವಿಮರ್ಶೆ ಕಳಿಸಿ", "rev.copy": "ಟೆಕ್ಸ್ಟ್ ಆಗಿ ಕಾಪಿ",
    "rev.ownerEyebrow": "ಓನರ್ ನೋಟ", "rev.ownerTitle": "ವಿಮರ್ಶಕರು ಏನು ಹೇಳಿದರು",
    "copy": "ಕಾಪಿ", "copied": "ಕಾಪಿ ಆಯ್ತು", "listen": "ಕೇಳಿ", "save": "ಸೇವ್", "saved": "ಲೈಬ್ರರಿಗೆ ಸೇವ್ ಆಯ್ತು",
    "storyboard": "ಸ್ಟೋರಿಬೋರ್ಡ್", "use": "ಪೋಸ್ಟ್ ಕಿಟ್‌ಗೆ ಬಳಸಿ", "stop": "ನಿಲ್ಲಿಸಿ", "regen": "ಮತ್ತೆ ಮಾಡಿ",
    "thinking": "ಯೋಚಿಸ್ತಿದೆ…", "example": "ಉದಾಹರಣೆ",
    "download": "ಡೌನ್‌ಲೋಡ್", "copyAll": "ಎಲ್ಲಾ ಕಾಪಿ"
  }
};
const EN_DYN = { copy: "Copy", copied: "Copied", listen: "Listen", save: "Save", saved: "Saved to Library", storyboard: "Storyboard",
  use: "Use in Publish", stop: "Stop", regen: "Regenerate", thinking: "Thinking…", ideasFor: "ideas, ranked for", example: "Example",
  download: "Download", copyAll: "Copy all" };
const t = k => (S.uiLang === "kn" && I18N.kn[k]) || EN_DYN[k] || k;

/* ---------- State ---------- */
const DEFAULT_PROFILE = { niche: "Budget food & cafés", audience: "college students", location: "Bengaluru", platforms: ["ig", "yts"], lang: "en", handle: "" };
const S = {
  profile: { ...DEFAULT_PROFILE },
  uiLang: "en",
  plan: { format: "faceless", platform: "ig", goal: "grow", lang: "en", topic: "", refs: [], ideas: [], selected: -1, board: null, engine: "offline", example: true, refStyle: "" },
  pub: { platforms: ["ig", "yts"], voice: "friendly", lang: "en", kits: {}, active: "ig", variant: {}, hook: null, removed: 0, example: true, source: null, engine: "offline", tagsOff: {} },
  library: [],
  libFilter: "All",
  engine: { mode: "auto", local: null, localErr: "", sample: null, sampleBlocked: false, downloads: null, checkingLocal: true },
  busy: null
};

function loadStore() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || "{}");
    if (d.profile) S.profile = { ...DEFAULT_PROFILE, ...d.profile };
    if (Array.isArray(d.library)) S.library = d.library;
    if (d.uiLang) S.uiLang = d.uiLang;
    if (d.engineMode) S.engine.mode = d.engineMode;
    return !!d.profile;
  } catch { return false; }
}
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify({ profile: S.profile, library: S.library, uiLang: S.uiLang, engineMode: S.engine.mode })); } catch {}
}

/* ---------- Small UI helpers ---------- */
function toast(msg, ms = 3200) {
  const el = document.createElement("div");
  el.className = "toast"; el.textContent = msg;
  $("#toasts").append(el);
  setTimeout(() => el.remove(), ms);
}
const COPY = new Map();
function copyId(text) { const id = "c" + uid(); COPY.set(id, text); return id; }
async function copyText(text, btn) {
  try { await navigator.clipboard.writeText(text); flash(btn); }
  catch {
    const ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.append(ta); ta.select();
    let ok = false; try { ok = document.execCommand("copy"); } catch {}
    ta.remove();
    if (ok) flash(btn); else toast("Copy is blocked here. Select the text and copy it manually.");
  }
}
const svgI = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICON = {
  copy: svgI('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>'),
  listen: svgI('<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>'),
  save: svgI('<path d="M7 3h10a1 1 0 0 1 1 1v17l-6-4-6 4V4a1 1 0 0 1 1-1z"/>'),
  regen: svgI('<path d="M20 12a8 8 0 1 1-2.4-5.7M20 4v5h-5"/>'),
  download: svgI('<path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14"/>'),
  check: svgI('<path d="m5 12 5 5 9-10"/>')
};
const ib = (icon, label, attrs = "") => `<button class="ib" type="button" title="${esc(label)}" aria-label="${esc(label)}" ${attrs}>${ICON[icon]}</button>`;
function flash(btn) {
  if (!btn) return; const o = btn.innerHTML;
  if (btn.classList.contains("ib")) { btn.innerHTML = ICON.check; btn.classList.add("ok"); setTimeout(() => { btn.innerHTML = o; btn.classList.remove("ok"); }, 1200); return; }
  btn.textContent = t("copied"); setTimeout(() => { btn.innerHTML = o; }, 1200);
}
function chips(el, opts, selected, { multi = false, onChange } = {}) {
  el.innerHTML = Object.entries(opts).map(([v, label]) =>
    `<button type="button" class="chip" data-v="${esc(v)}" aria-pressed="${multi ? selected.includes(v) : selected === v}">${esc(label)}</button>`).join("");
  el.onclick = e => {
    const b = e.target.closest(".chip"); if (!b) return;
    if (multi) {
      const on = b.getAttribute("aria-pressed") !== "true";
      const cur = $$(".chip", el).filter(x => x === b ? on : x.getAttribute("aria-pressed") === "true").map(x => x.dataset.v);
      if (!cur.length) { toast("Pick at least one."); return; }
      b.setAttribute("aria-pressed", on); onChange?.(cur);
    } else {
      $$(".chip", el).forEach(x => x.setAttribute("aria-pressed", x === b)); onChange?.(b.dataset.v);
    }
  };
}

/* ---------- Read aloud (browser voices) ---------- */
function speak(text, lang) {
  if (!("speechSynthesis" in window)) { toast("Read-aloud isn't supported in this browser."); return; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/#\w+/g, ""));
  const voices = speechSynthesis.getVoices();
  const want = lang === "kn" ? "kn" : "en-IN";
  const v = voices.find(v => v.lang.toLowerCase().startsWith(want.toLowerCase())) || (lang !== "kn" && voices.find(v => v.lang.startsWith("en")));
  if (lang === "kn" && !v) toast("No Kannada voice on this device, so the default voice is reading.");
  if (v) { u.voice = v; u.lang = v.lang; } else u.lang = lang === "kn" ? "kn-IN" : "en-IN";
  u.rate = 1;
  speechSynthesis.speak(u);
}


/* ============================================================
   ENGINES
   ============================================================ */
async function detectLocal() {
  if (location.protocol === "file:") { renderEngineChip(); return; }
  S.engine.checkingLocal = true;
  try {
    const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 1800);
    const r = await fetch("/api/health", { signal: ctl.signal, cache: "no-store" });
    clearTimeout(tm);
    if (r.ok && (r.headers.get("content-type") || "").includes("json")) {
      const j = await r.json();
      if (j && j.app === "reelmap") { S.engine.local = j; S.engine.localErr = j.model_ready ? "" : (j.error || "Model not ready"); }
    }
  } catch {}
  S.engine.checkingLocal = false;
  renderEngineChip();
}
function connectClaude() {
  const c = window.claude;
  if (!c || typeof c.use !== "function") return;
  c.use("sample").then(s => { S.engine.sample = s || null; renderEngineChip(); }).catch(() => {});
  c.use("downloads").then(d => { S.engine.downloads = d || null; }).catch(() => {});
  initReviews();
}
const localReady = () => !!(S.engine.local && S.engine.local.model_ready);
const geminiReady = () => !!(S.engine.local && S.engine.local.gemini_ready);
const claudeReady = () => !!(S.engine.sample && !S.engine.sampleBlocked);
const autoPick = () => geminiReady() ? "gemini" : localReady() ? "local" : claudeReady() ? "claude" : "offline";
function activeEngine() {
  const m = S.engine.mode;
  if (m === "offline") return "offline";
  if (m === "gemini") return geminiReady() ? "gemini" : "offline";
  if (m === "local") return localReady() ? "local" : "offline";
  if (m === "claude") return claudeReady() ? "claude" : "offline";
  return autoPick();
}
function engineName(e) {
  if (e === "gemini") return `Gemini · ${S.engine.local?.gemini_model || "Google AI"}`;
  if (e === "local") return `Local AI · ${S.engine.local?.model || "Ollama"}`;
  if (e === "claude") return "Claude AI";
  return "Offline templates";
}
function renderEngineChip() {
  const e = activeEngine();
  const chip = $("#engineChip"); chip.dataset.engine = e;
  $("#engineLabel").textContent = e === "gemini" ? "Gemini" : e === "local" ? "Local AI" : e === "claude" ? "Claude AI" : "Offline";
  chip.title = `Writing with: ${engineName(e)}. Tap to change.`;
  updateUploadHint();
}

const fileToB64 = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1]); r.onerror = rej; r.readAsDataURL(f); });

/** Ask the active AI engine for JSON. Throws {code} on failure; caller falls back to offline. */
async function aiJSON(prompt, { images = [], signal, onText, fresh = false } = {}) {
  const e = activeEngine();
  if (e === "gemini") {
    const imgs = images.length ? await Promise.all(images.map(fileToB64)) : [];
    const r = await fetch("/api/llm", { method: "POST", headers: { "Content-Type": "application/json" }, signal,
      body: JSON.stringify({ prompt, images: imgs, format: "json", engine: "gemini" }) });
    if (!r.ok) { let d = ""; try { d = (await r.json()).detail; } catch {} throw { code: "gemini_error", message: d || `Server error ${r.status}` }; }
    const j = await r.json();
    onText?.({ text: j.text || "" });
    return parseJSONLoose(j.text);
  }
  if (e === "local") {
    const imgs = (S.engine.local?.vision && images.length) ? await Promise.all(images.map(fileToB64)) : [];
    const r = await fetch("/api/llm", { method: "POST", headers: { "Content-Type": "application/json" }, signal,
      body: JSON.stringify({ prompt, images: imgs, format: "json", engine: "local" }) });
    if (!r.ok) { let d = ""; try { d = (await r.json()).detail; } catch {} throw { code: "local_error", message: d || `Server error ${r.status}` }; }
    const j = await r.json();
    onText?.({ text: j.text || "" });
    return parseJSONLoose(j.text);
  }
  if (e === "claude") {
    const opts = { signal, onText };
    if (images.length) opts.images = images;
    if (fresh) opts.cache = false;
    try { return await S.engine.sample.json(prompt, opts); }
    catch (err) {
      if (err && ["not_granted", "sampling_disabled", "not_declared", "capability_disabled", "capability_removed"].includes(err.code)) {
        S.engine.sampleBlocked = true; renderEngineChip();
      }
      if (err && err.code === "images_unavailable" && images.length) return aiJSON(prompt, { signal, onText, fresh });
      throw err;
    }
  }
  throw { code: "offline" };
}
function failMessage(err) {
  const c = err?.code;
  if (c === "cancelled" || err?.name === "AbortError") return null;
  if (c === "offline") return null;
  if (c === "not_granted") return "Claude AI wasn't allowed for this page, so Reelmap used offline templates.";
  if (c === "rate_limited") return "The AI is busy or your usage limit was reached. Showing offline results; try again in a bit.";
  if (c === "session_expired") return "Your Claude session expired. Sign in again to use AI. Showing offline results.";
  if (c === "local_error") return `Local server: ${err.message}. Showing offline results.`;
  if (c === "gemini_error") return `Gemini API: ${err.message}. Showing offline results.`;
  if (c === "invalid_json") return "The AI reply came back malformed. Showing offline results; press Regenerate to try again.";
  return "The AI didn't answer, so Reelmap used offline templates.";
}

/* Busy state with elapsed timer + Stop */
function startBusy(container, label) {
  S.busy?.ctl.abort();
  const ctl = new AbortController(), t0 = Date.now();
  const el = document.createElement("div");
  el.className = "status";
  el.setAttribute("role", "status");
  el.innerHTML = `<span class="spin" aria-hidden="true"></span><span class="grow"><span class="lbl">${esc(label)}</span> <span class="mono small muted tm">0s</span></span><button type="button" class="btn sm">${t("stop")}</button>`;
  el.querySelector("button").onclick = () => ctl.abort();
  container.prepend(el);
  const iv = setInterval(() => { el.querySelector(".tm").textContent = Math.round((Date.now() - t0) / 1000) + "s"; }, 500);
  S.busy = { ctl, el, done() { clearInterval(iv); el.remove(); if (S.busy?.ctl === ctl) S.busy = null; },
    progress(text) { el.querySelector(".lbl").textContent = label + (text ? ` · ${text.length.toLocaleString()} characters written` : ""); } };
  return S.busy;
}

/* ============================================================
   PROMPTS (shared by local open-source model and Claude)
   ============================================================ */
function profileLine(p = S.profile) {
  return `Niche: ${p.niche}. Audience: ${p.audience}${p.location ? ` in ${p.location}` : ""}.${p.handle ? ` Handle: ${p.handle}.` : ""}`;
}
const WRITING_RULES = `Writing rules (follow all of them):
- Sound like a real creator talking to a friend. Short sentences. Specific details over hype.
- Never use em dashes. Never use: delve, elevate, unlock, game-changer, dive in, seamless, harness, tapestry, testament, embark, "in today's world", "it's important to note".
- No invented statistics, prices or claims the creator didn't give. If unsure, keep it general.
- Hooks must work in the first 2 seconds with the sound off (as on-screen text).`;
function langRule(lang) {
  if (lang === "kn") return "Language: write all creator-facing text (hooks, on-screen text, voiceover, captions, titles, comments) in Kannada script, conversational Bengaluru Kannada. Common English words for platforms and tech (Reel, follow, save, comment) may stay in English. JSON keys stay in English.";
  if (lang === "kanglish") return "Language: write all creator-facing text in Kanglish: Kannada written in English letters, mixed naturally with English, the way Bengaluru creators type on WhatsApp (e.g. \"Idu try maadi, worth aagutte\"). JSON keys stay in English.";
  return "Language: write in simple Indian English.";
}
function buildIdeasPrompt(c) {
  const P = PLATFORMS[c.platform];
  return `You are Reelmap, a content strategist for Indian short-form creators.

Creator profile. ${profileLine()}
Topic or rough idea: ${c.topic || "(none given, choose strong topics inside the niche)"}
Format: ${FORMATS[c.format]} (${c.format === "faceless" ? "no face on screen: voiceover, hands, screen recordings, b-roll, text on screen" : c.format === "face" ? "creator speaks to camera" : "only the product is shown: macro shots, hands, process, before/after"})
Platform: ${P.name}. What it rewards: ${P.notes}
Goal: ${GOALS[c.goal]}
${c.refCount ? `The creator attached ${c.refCount} reference image(s). Describe their visual style in one sentence (colour, framing, light) in "reference_style" and let ideas suit that look.` : ""}

Task: give 5 distinct content ideas. Each must use a different structure (for example: mistakes list, myth vs fact, budget challenge, POV, before/after, ranking, quick tutorial, hidden gem, process, comparison).
Score each from 0 to 100 on: completion (will people watch to the end), saves, shares (will they send it to a friend), effort (how hard to make; 100 = very hard). Be realistic, not generous.

${WRITING_RULES}
${langRule(c.lang)}

Reply with only this JSON:
{"reference_style": "", "ideas": [{"title": "short internal name", "hook": "first line, under 12 words", "angle": "one sentence: what the video shows", "length_sec": ${P.len}, "scores": {"completion": 0, "saves": 0, "shares": 0, "effort": 0}, "why": "one sentence: which platform signal this targets"}]}`;
}
function buildBoardPrompt(c) {
  const P = PLATFORMS[c.platform], i = c.idea;
  return `You are Reelmap, a storyboard artist and producer for short-form video.

Creator profile. ${profileLine()}
Format: ${FORMATS[c.format]}. Platform: ${P.name}. Target length: about ${i.length_sec || P.len} seconds.
Idea: ${i.title}
Hook: ${i.hook}
Angle: ${i.angle}
${c.refCount ? `Reference images attached (${c.refCount}). Match their framing, colour and light in every frame, and set "ref" to the index (0-based) of the image each frame should follow, or null.` : ""}

Task: plan the shoot.
- 5 frames: hook (0 to 3 s), setup, value, payoff, loop/CTA. Each with timing, what the camera sees, on-screen text (max 7 words, must read with sound off), voiceover line, and a camera note (angle, distance, light).
- Keep on-screen text out of the bottom 20% and right 15% of the frame (app buttons cover it).
- shot_list: 5 to 8 concrete shots to capture.
- props: what to keep ready.
- roadmap: 7 days from idea to posted and reviewed, one practical task per day.

${WRITING_RULES}
${langRule(c.lang)}

Reply with only this JSON:
{"style_notes": "", "frames": [{"time": "0:00–0:03", "shot": "Hook", "visual": "", "onscreen": "", "voiceover": "", "camera": "", "ref": null}], "shot_list": [""], "props": [""], "roadmap": [{"day": "Day 1", "task": "", "detail": ""}]}`;
}
function buildKitPrompt(c) {
  const P = PLATFORMS[c.platform];
  return `You are Reelmap, a social media editor who writes captions that sound human.

Creator profile. ${profileLine()}
Platform: ${P.name}. What it rewards: ${P.notes}
Limits: caption ${P.capLimit} characters${P.titleLimit ? `, title ${P.titleLimit} characters (aim for under 60)` : ""}, ${P.tags} hashtags in total.
Caption voice: ${VOICES[c.voice]}.
${c.topic ? `Video topic: ${c.topic}` : ""}
Transcript of the finished video:
"""
${c.transcript.slice(0, 6000)}
"""

Task: write the post kit for this exact video. Use details from the transcript. Do not invent facts.
- titles: 3 options${P.titleLimit ? "" : " (used as the first line / on-cover text)"}.
- caption_short: 1 to 3 lines. caption_story: 4 to 7 short lines with a line break between ideas. Both end with one clear call to action that fits the goal (save, send, comment, follow).
- hashtags: broad (big topic), niche (this niche), micro (this exact video). ${P.tags} total across all three groups, no hashtag stuffing.
- spoken_keywords: 3 to 5 search phrases the creator should say out loud in the first 10 seconds.
- pinned_comment: a question that gets real replies.
- thumbnail_text: 3 options, max 4 words each.
- hook_score 0 to 100 for the transcript's first line, hook_feedback (one sentence), better_hook (one line, under 12 words).
- alt_text: one sentence describing the video for accessibility.
- first_hour: 3 actions for the first hour after posting.

${WRITING_RULES}
${langRule(c.lang)}

Reply with only this JSON:
{"titles": ["", "", ""], "caption_short": "", "caption_story": "", "hashtags": {"broad": [], "niche": [], "micro": []}, "spoken_keywords": [], "pinned_comment": "", "thumbnail_text": ["", "", ""], "hook_score": 0, "hook_feedback": "", "better_hook": "", "alt_text": "", "first_hour": ["", "", ""]}`;
}

/* ============================================================
   OFFLINE ENGINE (templates + rules; never fails on stage)
   ============================================================ */
const ARCH = [
  { id: "mistakes", title: "3 mistakes list", fit: { faceless: 1, face: .9, product: .5 }, s: [72, 84, 62, 35],
    hook: { en: "3 mistakes everyone makes with {t}", kn: "{t} ಬಗ್ಗೆ ಎಲ್ಲರೂ ಮಾಡೋ 3 ತಪ್ಪುಗಳು", kanglish: "{t} bagge ellaru maado 3 mistakes" },
    angle: "Name three common mistakes with {t}, then show the fix for each in one quick shot.",
    why: "List formats get saved for later and finish fast, which helps completion.",
    beats: [["Hook", "3 mistakes with {t}", "You're probably doing at least one of these."], ["Mistake 1", "Mistake #1", "First one, and it's the most common."], ["Mistake 2", "Mistake #2", "This one costs you time and money."], ["Mistake 3 + fix", "Do this instead", "Last one, and here's the simple fix."], ["Loop / CTA", "Save for later", "Which one were you doing? Save this before you forget."]] },
  { id: "myth", title: "Myth vs fact", fit: { faceless: .9, face: 1, product: .5 }, s: [70, 60, 80, 30],
    hook: { en: "Everyone believes this about {t}. It's wrong.", kn: "{t} ಬಗ್ಗೆ ಎಲ್ಲರೂ ನಂಬೋದು ತಪ್ಪು", kanglish: "{t} bagge ellaru nambodu tappu" },
    angle: "Take one popular belief about {t}, show why it's wrong, and give the real answer.",
    why: "Correcting a popular belief makes people send it to friends, which drives shares.",
    beats: [["Hook", "Myth: {t}", "Everyone says this. Let's check it."], ["The myth", "What people think", "Here's what most people believe."], ["The proof", "What actually happens", "But look at this."], ["The fact", "The real answer", "So here's what's actually true."], ["Loop / CTA", "Send this to that friend", "Send this to the friend who still believes it."]] },
  { id: "budget", title: "₹200 challenge", fit: { faceless: .8, face: 1, product: .6 }, s: [82, 70, 72, 45],
    hook: { en: "I tried {t} with just ₹200", kn: "₹200 ಒಳಗೆ {t} ಟ್ರೈ ಮಾಡಿದೆ", kanglish: "₹200 olage {t} try maadide" },
    angle: "Set a strict budget for {t} and show every rupee, ending with a verdict.",
    why: "A money challenge creates suspense, so people stay to see the final total.",
    beats: [["Hook", "₹200. {t}. Let's go.", "I have two hundred rupees. Let's see how far it goes."], ["Stop 1", "₹ spent so far", "First stop, and here's what it cost."], ["Stop 2", "Running total", "Second one. Still under budget?"], ["Verdict", "Final total", "Final total, and was it worth it?"], ["Loop / CTA", "Your ₹200 pick?", "What would you buy with two hundred? Tell me below."]] },
  { id: "pov", title: "POV moment", fit: { faceless: .6, face: 1, product: .4 }, s: [76, 45, 82, 25],
    hook: { en: "POV: you finally figured out {t}", kn: "POV: ಕೊನೆಗೂ {t} ಅರ್ಥ ಆಯ್ತು", kanglish: "POV: kone-gu {t} artha aaytu" },
    angle: "A relatable moment about {t} acted out in under 20 seconds.",
    why: "Relatable moments get tagged and sent in DMs, the strongest Reels signal.",
    beats: [["Hook", "POV: {t}", "That moment when it finally clicks."], ["Before", "Me, before", "Me, every single time before this."], ["The switch", "Then I learned this", "Then someone told me this."], ["After", "Me, now", "And now look at me."], ["Loop / CTA", "Tag that one friend", "Tag the friend who needs this."]] },
  { id: "beforeafter", title: "Before and after", fit: { faceless: .8, face: .6, product: 1 }, s: [84, 58, 64, 50],
    hook: { en: "Before vs after: {t}", kn: "{t}: ಮೊದಲು vs ಈಗ", kanglish: "{t}: modlu vs eega" },
    angle: "Show a clear before, the change, and a satisfying after for {t}.",
    why: "People watch to the end to see the reveal, which lifts completion.",
    beats: [["Hook", "Wait for the after", "Watch what this turns into."], ["Before", "Before", "Here's where it started."], ["Process", "The change", "Here's the one thing that changed."], ["After", "After", "And here's the result."], ["Loop / CTA", "Again from the start?", "Watch it again and spot the moment it changed."]] },
  { id: "tier", title: "Worst-to-best ranking", fit: { faceless: .9, face: .9, product: .7 }, s: [80, 55, 70, 40],
    hook: { en: "Ranking {t} from worst to best", kn: "{t}: ಕೆಟ್ಟದ್ದರಿಂದ ಬೆಸ್ಟ್ ವರೆಗೆ ರ್ಯಾಂಕಿಂಗ್", kanglish: "{t} ranking: worst inda best varege" },
    angle: "Rank 4 or 5 options for {t} with a one-line reason each; save the best for last.",
    why: "Rankings make people wait for number one and argue in the comments.",
    beats: [["Hook", "Worst → best: {t}", "I tried them all so you don't have to."], ["#4–#3", "#4 and #3", "Starting with the ones I wouldn't go back to."], ["#2", "#2", "This one was close."], ["#1", "#1", "And number one, easily."], ["Loop / CTA", "Agree?", "Would you change my number one? Comment yours."]] },
  { id: "tutorial", title: "30-second tutorial", fit: { faceless: 1, face: .8, product: .9 }, s: [74, 88, 55, 30],
    hook: { en: "{t} in 30 seconds", kn: "30 ಸೆಕೆಂಡ್‌ನಲ್ಲಿ {t}", kanglish: "30 seconds alli {t}" },
    angle: "Teach {t} in three clear steps with one tip people usually miss.",
    why: "Step-by-step help is saved to come back to, a strong ranking signal.",
    beats: [["Hook", "{t} in 30 sec", "Here's the fastest way to do this."], ["Step 1", "Step 1", "Start with this."], ["Step 2", "Step 2", "Then this, and don't skip it."], ["Step 3 + tip", "Step 3 + the trick", "Last step, plus the trick most people miss."], ["Loop / CTA", "Save it", "Save this so you have it next time."]] },
  { id: "gem", title: "Hidden gem", fit: { faceless: .9, face: .9, product: .6 }, s: [70, 72, 78, 40],
    hook: { en: "Nobody talks about this {t}", kn: "ಯಾರೂ ಹೇಳದ {t} ಸೀಕ್ರೆಟ್", kanglish: "Yaaru helada {t} secret" },
    angle: "Reveal one little-known spot, product or trick related to {t}.",
    why: "Insider finds get sent to friends and saved for later.",
    beats: [["Hook", "Nobody talks about this", "I can't believe more people don't know this."], ["Where / what", "What it is", "So here's what it is."], ["Why it's good", "Why it's worth it", "And here's why it's worth it."], ["Proof", "See for yourself", "Just look at this."], ["Loop / CTA", "Send to your plan buddy", "Send this to the person you'd go with."]] },
  { id: "dayinlife", title: "Day in the life", fit: { faceless: .5, face: 1, product: .3 }, s: [68, 40, 58, 55],
    hook: { en: "A day of {t} as a {a}", kn: "{a} ಆಗಿ {t} ಜೊತೆ ಒಂದು ದಿನ", kanglish: "{a} aagi {t} jothe ondu dina" },
    angle: "Follow one real day built around {t}, cut to five quick moments.",
    why: "Personal routines build trust and bring people back for the next one.",
    beats: [["Hook", "A day of {t}", "Come with me for a full day of this."], ["Morning", "8 AM", "Starting the day like this."], ["Midday", "1 PM", "Halfway through, and here's the real part."], ["Evening", "7 PM", "End of the day, the best bit."], ["Loop / CTA", "Part 2?", "Want part two? Follow so you don't miss it."]] },
  { id: "process", title: "Process reveal", fit: { faceless: .8, face: .3, product: 1 }, s: [86, 50, 55, 50],
    hook: { en: "Watch this {t} come together", kn: "ಈ {t} ಹೇಗೆ ತಯಾರಾಗುತ್ತೆ ನೋಡಿ", kanglish: "Ee {t} hege ready aagutte nodi" },
    angle: "Satisfying close-ups of {t} being made or set up, with crisp sound.",
    why: "Satisfying process clips get rewatched, which counts for completion.",
    beats: [["Hook", "Wait for it", "Start with the most satisfying second."], ["Raw", "Where it starts", "Every piece, from the start."], ["Build", "Coming together", "Now it starts to take shape."], ["Finish", "Done", "And here's the finished piece."], ["Loop / CTA", "Want one?", "Want one? Comment and I'll share the details."]] },
  { id: "unbox", title: "Is it worth it?", fit: { faceless: .7, face: .8, product: 1 }, s: [78, 66, 60, 30],
    hook: { en: "Is this {t} actually worth it?", kn: "ಈ {t} ನಿಜವಾಗ್ಲೂ ಬೆಲೆಗೆ ತಕ್ಕದ್ದಾ?", kanglish: "Ee {t} nijvaaglu worth aa?" },
    angle: "Honest first impression of {t}: what's good, what's not, final verdict.",
    why: "Buying decisions get saved and the verdict keeps people to the end.",
    beats: [["Hook", "Worth it or not?", "Let's find out if this is actually worth it."], ["Unbox", "First look", "First look, straight out of the box."], ["The good", "What I liked", "Here's what surprised me."], ["The catch", "The catch", "But there's one thing you should know."], ["Loop / CTA", "Verdict", "My verdict, and would you buy it?"]] },
  { id: "compare", title: "Expensive vs cheap", fit: { faceless: .8, face: .7, product: 1 }, s: [76, 80, 64, 45],
    hook: { en: "{t} vs the cheaper version", kn: "{t} vs ಕಡಿಮೆ ಬೆಲೆಯದು: ಯಾವುದು ಬೆಸ್ಟ್?", kanglish: "{t} vs cheap version: yaavdu best?" },
    angle: "Put {t} side by side with a cheaper option on 3 things that matter.",
    why: "Comparisons help people decide, so they save and share them.",
    beats: [["Hook", "Expensive vs cheap", "Is the expensive one really better?"], ["Test 1", "Round 1", "First test."], ["Test 2", "Round 2", "Second test, and this one surprised me."], ["Test 3", "Round 3", "Last test."], ["Loop / CTA", "Which would you pick?", "Which one would you pick? Comment A or B."]] }
];
const VISUALS = {
  faceless: ["Fast cut of hands or b-roll matching the hook, bold text centered", "Top-down or screen recording that sets the context", "Close-up b-roll with a label", "The reveal shot, slightly slower", "Cut back to the first shot so it loops"],
  face: ["Face to camera, tight frame, start mid-sentence", "Medium shot, you point to the on-screen text", "Cutaway b-roll while you keep talking", "Back to your face for the reaction", "Look at the lens, pause, then cut"],
  product: ["Macro detail of the product, quick motion", "Product on a clean surface, hand enters frame", "Feature close-up with a label", "Product in use", "Hero shot with a slow push-in"]
};
const CAMERA = { faceless: "Top-down or 45°, phone on a stand, steady", face: "Eye level, arm's length, face toward a window", product: "45°, soft side light, plain backdrop" };
const PROPS = {
  faceless: ["Phone stand or overhead mount", "Clean surface or desk", "Voiceover recorded in a quiet room (blanket fort works)", "Screen recording turned on"],
  face: ["Phone at eye level", "Window light or a ring light", "Clip-on mic or earphones mic", "Lines written on a sticky note"],
  product: ["Plain backdrop (chart paper works)", "Soft side light", "Microfibre cloth for fingerprints", "Price tag or box for the reveal"]
};
const CTA = {
  en: ["Save this for later.", "Send this to the friend who needs it.", "Follow for part 2."],
  kn: ["ಆಮೇಲೆ ನೋಡೋಕೆ ಸೇವ್ ಮಾಡಿ.", "ಇದು ಬೇಕಿರೋ ಫ್ರೆಂಡ್‌ಗೆ ಕಳಿಸಿ.", "ಪಾರ್ಟ್ 2 ಗೆ ಫಾಲೋ ಮಾಡಿ."],
  kanglish: ["Aamele nodoke save maadi.", "Idu bekiro friend ge kalsi.", "Part 2 ge follow maadi."]
};
const ASK = {
  en: ["Which one would you try first?", "What did I miss? Drop yours below.", "Agree or disagree? Tell me why."],
  kn: ["ನೀವು ಮೊದಲು ಯಾವುದನ್ನ ಟ್ರೈ ಮಾಡ್ತೀರಾ?", "ನಾನು ಏನು ಮಿಸ್ ಮಾಡಿದೆ? ಕಾಮೆಂಟ್ ಮಾಡಿ.", "ಒಪ್ಪುತ್ತೀರಾ? ಯಾಕೆ ಅಂತ ಹೇಳಿ."],
  kanglish: ["Neevu modlu yaavdu try maadtira?", "Naanu enu miss maadide? Comment maadi.", "Oppthira? Yaake anta heli."]
};
const fill = (s, v) => String(s).replace(/\{t\}/g, v.t).replace(/\{a\}/g, v.a);

function shortTopic(c) {
  const raw = (c.topic || S.profile.niche || "your niche").trim().replace(/[.?!]+$/, "");
  return raw.length > 48 ? raw.slice(0, 46).replace(/\s\S*$/, "") : raw;
}
function offlineIdeas(c, seed) {
  const r = rng(seed ?? hash(c.topic + c.format + c.platform + c.goal + S.profile.niche));
  const v = { t: shortTopic(c), a: (S.profile.audience || "creator").replace(/s$/, "") };
  const goalAdj = { grow: [0, 0, 6, 0], saves: [0, 8, 0, 0], sell: [4, 4, 0, 0], trust: [4, 2, 0, -5] }[c.goal];
  return ARCH.filter(a => a.fit[c.format] >= .5).map(a => {
    const j = () => Math.round((r() - .5) * 14);
    const scores = { completion: clamp(a.s[0] + goalAdj[0] + j(), 20, 98), saves: clamp(a.s[1] + goalAdj[1] + j(), 20, 98), shares: clamp(a.s[2] + goalAdj[2] + j(), 20, 98), effort: clamp(a.s[3] + goalAdj[3] + j() + (c.platform === "yt" ? 25 : 0), 5, 95) };
    return { id: uid(), arch: a.id, title: fill(a.title, v), hook: fill(a.hook[c.lang] || a.hook.en, v), angle: fill(a.angle, v), length_sec: PLATFORMS[c.platform].len, scores, why: a.why, _k: rankScore(scores, c.platform) * (.8 + .2 * a.fit[c.format]) + r() * 4 };
  }).sort((a, b) => b._k - a._k).slice(0, 5);
}
function frameTimes(L) {
  const cuts = L > 120 ? [0, 30, L * .3, L * .6, L * .88, L] : [0, 3, L * .4, L * .65, L * .86, L];
  return cuts.slice(0, 5).map((s, i) => `${fmtTime(s)}–${fmtTime(cuts[i + 1])}`);
}
function offlineBoard(c) {
  const i = c.idea, a = ARCH.find(x => x.id === i.arch) || ARCH[0];
  const v = { t: shortTopic(c), a: (S.profile.audience || "creator").replace(/s$/, "") };
  const L = i.length_sec || PLATFORMS[c.platform].len, times = frameTimes(L);
  const frames = a.beats.map((b, k) => ({ time: times[k], shot: b[0], visual: VISUALS[c.format][k], onscreen: k === 0 ? i.hook : fill(b[1], v), voiceover: k === 0 ? i.hook : fill(b[2], v), camera: CAMERA[c.format], ref: c.refCount ? k % c.refCount : null }));
  const P = PLATFORMS[c.platform];
  return {
    style_notes: c.refCount ? `Frames follow your ${c.refCount} reference image${c.refCount > 1 ? "s" : ""}: keep the same framing, colour mood and light in every shot so the video looks like one piece.` : `${FORMATS[c.format]} look: ${CAMERA[c.format].toLowerCase()}. Burn captions in, since most people watch without sound.`,
    frames,
    shot_list: frames.map(f => `${f.shot}: ${f.visual.toLowerCase()}`).concat(["2–3 extra b-roll clips of 3 seconds each for cutaways", "10 seconds of room sound for smooth cuts"]),
    props: PROPS[c.format],
    roadmap: [
      { day: "Day 1", task: "Lock the hook", detail: `Write 3 versions of "${i.hook}" and keep the one that works with the sound off.` },
      { day: "Day 2", task: "Script it", detail: "Turn the 5 frames into lines you'd actually say. Read it out loud and cut anything you stumble on." },
      { day: "Day 3", task: "Shoot", detail: `Shoot every item on the shot list in one session. ${CAMERA[c.format]}.` },
      { day: "Day 4", task: "Edit", detail: `Cut dead air, add captions, keep it near ${L > 120 ? Math.round(L / 60) + " minutes" : L + " seconds"}. Check the first 3 seconds twice.` },
      { day: "Day 5", task: "Post", detail: `Post on ${P.short} in the ${P.slots[0]} slot. Paste the post kit from Reelmap and pin the comment.` },
      { day: "Day 6", task: "Engage", detail: "Reply to every comment in the first hour. Share to Stories or your community tab." },
      { day: "Day 7", task: "Review", detail: "Check where viewers dropped off. Note what worked in your Library before planning the next one." }
    ]
  };
}

function betterHookFrom(kws, ctx) {
  const text = cleanTranscript(ctx.transcript) + " " + (ctx.topic || "");
  const k = kws[0] || shortTopic(ctx), cp = countPhrase(text), price = priceIn(text);
  const what = cp ? `${cp.n} ${cp.what}` : k;
  if (ctx.lang === "kn") return cp ? `${what}${price ? ", ಎಲ್ಲಾ " + price + " ಒಳಗೆ" : ""}. ಕೊನೆಯದು ಮಿಸ್ ಮಾಡ್ಬೇಡಿ` : `${k} ಬಗ್ಗೆ ಯಾರೂ ಹೇಳದ ವಿಷಯ`;
  if (ctx.lang === "kanglish") return cp ? `${what}${price ? ", ella " + price + " olage" : ""}. Last du miss maadbedi` : `${k} bagge yaaru helada vishya`;
  if (cp && price) return `${cap(what)}, all under ${price}. The last one's my favourite.`;
  if (cp) return `${cap(what)} you need to know. Number ${cp.n} surprised me.`;
  return `Nobody tells you this about ${k}.`;
}
function offlineKit(c) {
  const text = cleanTranscript(c.transcript), sents = sentences(text), kws = keywords(text + " " + (c.topic || ""));
  const P = PLATFORMS[c.platform], L = c.lang;
  const k1 = kws[0] || shortTopic(c), k2 = kws[1] || S.profile.niche.split(/\s|&/)[0];
  const cp = countPhrase(text + " " + (c.topic || "")), price = priceIn(text + " " + (c.topic || ""));
  const nums = cp?.n;
  const hc = hookCheck(sents[0]);
  const greet = /^(hi|hey|hello|namaskara|welcome|what's up)\b/i;
  const real = sents.filter(s => !greet.test(s)).map(s => s.replace(/^(so|okay|ok|alright|and),?\s+/i, "")).map(cap);
  const dens = s => kws.filter(k => s.toLowerCase().includes(k)).length;
  const lead = real[0] || sents[0] || "";
  const support = real.slice(1).map((s, i) => [s, dens(s), i]).filter(x => x[0].length < 160).sort((x, y) => y[1] - x[1]).slice(0, 2).sort((x, y) => x[2] - y[2]).map(x => x[0]);
  const body = [lead, ...support].filter(Boolean);
  const ctas = CTA[L], asks = ASK[L];
  const goalCta = c.voice === "expert" ? ctas[0] : c.voice === "witty" ? ctas[1] : ctas[hash(text) % 3];
  const topicLine = c.topic ? cap(c.topic) : cp ? cap(`${cp.n} ${cp.what}${price ? " under " + price : ""}`) : cap(k1);
  const voiceOpen = { friendly: "Okay, this one's for you.", witty: "Your wallet will thank me.", expert: "Here's what actually works.", calm: "A small one, but useful." }[c.voice];
  const titles = L === "en" ? [
    topicLine,
    cp ? `${cap(cp.what)} worth your time${S.profile.location ? " in " + S.profile.location : ""}` : `The ${k1} guide I wish I had`,
    `${cap(k1)}: what nobody tells you`
  ] : L === "kn" ? [topicLine, `${k1}: ಯಾರೂ ಹೇಳದ ವಿಷಯ`, nums ? `${nums} ${cp.what}, ಎಲ್ಲಾ ಟ್ರೈ ಮಾಡಿದೆ` : `${k1} ಗೈಡ್, ಮೊದಲೇ ಗೊತ್ತಿರಬೇಕಿತ್ತು`]
    : [topicLine, `${k1}: yaaru helada vishya`, nums ? `${nums} ${cp.what}, ella try maadide` : `${k1} guide, modle gottirbekittu`];
  const capShort = [L === "en" ? voiceOpen : "", lead || topicLine, goalCta].filter(Boolean).join("\n");
  const capStory = [titles[0] + (L === "en" ? "." : ""), "", ...(body.length ? body : sents.slice(0, 3)), "", asks[hash(text + "q") % 3], goalCta].join("\n").replace(/\n{3,}/g, "\n\n");
  const loc = S.profile.location ? [S.profile.location] : [];
  const nicheWords = S.profile.niche.split(/[&,]/).map(s => s.trim()).filter(Boolean);
  let broad = [toTag(nicheWords[0] || k2)], niche = [toTag(k1), ...loc.map(l => toTag(l + " " + (nicheWords[0] || "").split(" ").pop()))], micro = kws.slice(1, 4).map(toTag);
  if (L !== "en" && (c.platform === "ig" || c.platform === "yts")) broad.push("#Kannada");
  if (c.platform === "yts") broad.push("#Shorts");
  const all = [...new Set([...broad, ...niche, ...micro])];
  const pick = []; for (const g of [broad, niche, micro, broad, niche, micro]) { const x = g.find(h => !pick.includes(h) && all.includes(h)); if (x && pick.length < P.tags) pick.push(x); }
  const H = { broad: broad.filter(h => pick.includes(h)), niche: niche.filter(h => pick.includes(h)), micro: micro.filter(h => pick.includes(h)) };
  return {
    titles: titles.map(x => P.titleLimit ? x.slice(0, P.titleLimit) : x),
    caption_short: capShort, caption_story: capStory, hashtags: H,
    spoken_keywords: kws.slice(0, 5),
    pinned_comment: asks[(hash(text) + 1) % 3],
    thumbnail_text: L === "en" ? [cp && price ? `${cp.n} under ${price}` : `${cap(k1)} hack`, `Don't skip #${nums || 1}`, cap(cp ? cp.what : k1).split(" ").slice(0, 3).join(" ")] : L === "kn" ? [`${k1}?`, "ಮಿಸ್ ಮಾಡ್ಬೇಡಿ", `${nums || 3} ಟಿಪ್ಸ್`] : [`${k1}?`, "Miss maadbedi", `${nums || 3} tips`],
    hook_score: hc.score, hook_feedback: hc.issues[0] || "Strong opening. It states the point straight away.", better_hook: betterHookFrom(kws, c), hook_issues: hc.issues,
    alt_text: `Short video about ${k1}${S.profile.location ? " in " + S.profile.location : ""}, with on-screen captions.`,
    first_hour: ["Reply to every comment within the first hour.", `Share it to your ${c.platform === "li" ? "network with a short note" : "Story with a poll sticker"}.`, "Pin the comment below so the conversation starts."]
  };
}

/* ---------- Normalizers (AI output → safe shape) ---------- */
const arr = x => Array.isArray(x) ? x : (x ? [x] : []);
const str = x => typeof x === "string" ? x : (x == null ? "" : String(x));
function normIdeas(j, c) {
  const ideas = arr(j?.ideas).slice(0, 5).map(i => ({
    id: uid(), arch: null, title: str(i.title) || "Untitled idea", hook: str(i.hook), angle: str(i.angle),
    length_sec: clamp(i.length_sec || PLATFORMS[c.platform].len, 5, 1800),
    scores: { completion: clamp(i.scores?.completion, 0, 100), saves: clamp(i.scores?.saves, 0, 100), shares: clamp(i.scores?.shares, 0, 100), effort: clamp(i.scores?.effort ?? 50, 0, 100) },
    why: str(i.why)
  })).filter(i => i.hook);
  if (ideas.length < 3) throw { code: "invalid_json" };
  return { ideas, refStyle: str(j.reference_style) };
}
function normBoard(j, c) {
  const L = c.idea.length_sec || PLATFORMS[c.platform].len, times = frameTimes(L);
  const frames = arr(j?.frames).slice(0, 6).map((f, k) => ({ time: str(f.time) || times[k] || "", shot: str(f.shot) || `Shot ${k + 1}`, visual: str(f.visual), onscreen: str(f.onscreen), voiceover: str(f.voiceover), camera: str(f.camera), ref: Number.isInteger(f.ref) && f.ref >= 0 && f.ref < c.refCount ? f.ref : (c.refCount ? k % c.refCount : null) }));
  if (frames.length < 3) throw { code: "invalid_json" };
  const road = arr(j.roadmap).slice(0, 7).map((d, k) => ({ day: str(d.day) || `Day ${k + 1}`, task: str(d.task), detail: str(d.detail) }));
  return { style_notes: str(j.style_notes), frames, shot_list: arr(j.shot_list).map(str).filter(Boolean), props: arr(j.props).map(str).filter(Boolean), roadmap: road.length >= 5 ? road : offlineBoard(c).roadmap };
}
function normKit(j, c) {
  if (!j || (!j.caption_short && !j.caption_story)) throw { code: "invalid_json" };
  const tagify = a => arr(a).map(str).filter(Boolean).map(h => h.startsWith("#") ? h.replace(/\s+/g, "") : toTag(h));
  const off = offlineKit(c);
  return {
    titles: arr(j.titles).map(str).filter(Boolean).slice(0, 3).concat(off.titles).slice(0, 3),
    caption_short: str(j.caption_short) || off.caption_short, caption_story: str(j.caption_story) || off.caption_story,
    hashtags: { broad: tagify(j.hashtags?.broad), niche: tagify(j.hashtags?.niche), micro: tagify(j.hashtags?.micro) },
    spoken_keywords: arr(j.spoken_keywords).map(str).filter(Boolean).slice(0, 5),
    pinned_comment: str(j.pinned_comment) || off.pinned_comment,
    thumbnail_text: arr(j.thumbnail_text).map(str).filter(Boolean).slice(0, 3),
    hook_score: clamp(j.hook_score ?? off.hook_score, 0, 100), hook_feedback: str(j.hook_feedback) || off.hook_feedback,
    better_hook: str(j.better_hook) || off.better_hook, hook_issues: off.hook_issues,
    alt_text: str(j.alt_text) || off.alt_text, first_hour: arr(j.first_hour).map(str).filter(Boolean).slice(0, 3)
  };
}

/* ============================================================
   PHASE 1 · PLAN
   ============================================================ */
function planCtx(extra = {}) {
  return { topic: $("#pTopic").value.trim(), format: S.plan.format, platform: S.plan.platform, goal: S.plan.goal, lang: S.plan.lang, refCount: S.plan.refs.length, ...extra };
}
async function generateIdeas({ fresh = false } = {}) {
  const c = planCtx(); S.plan.topic = c.topic;
  const box = $("#planResults");
  const busy = startBusy(box, `${t("thinking")} ${engineName(activeEngine())}`);
  $("#pGo").disabled = true;
  let used = activeEngine(), res;
  try {
    const j = await aiJSON(buildIdeasPrompt(c), { images: S.plan.refs.map(r => r.file), signal: busy.ctl.signal, onText: u => busy.progress(u.text), fresh });
    const counter = { n: 0 }; res = normIdeas(humanizeDeep(j, counter), c);
  } catch (err) {
    if (err?.code === "cancelled" || err?.name === "AbortError") { busy.done(); $("#pGo").disabled = false; toast("Stopped."); return; }
    const m = failMessage(err); if (m) toast(m, 5000);
    used = "offline";
    res = { ideas: offlineIdeas(c, fresh ? Date.now() : undefined), refStyle: "" };
  }
  busy.done(); $("#pGo").disabled = false;
  res.ideas.forEach(i => i.total = rankScore(i.scores, c.platform));
  res.ideas.sort((a, b) => b.total - a.total);
  Object.assign(S.plan, { ideas: res.ideas, refStyle: res.refStyle, selected: -1, board: null, engine: used, example: false, ctx: c, showAll: false });
  renderPlan();
}
async function buildBoard(idx, { fresh = false } = {}) {
  const idea = S.plan.ideas[idx]; if (!idea) return;
  S.plan.selected = idx; S.plan.board = null; renderPlan();
  const c = { ...(S.plan.ctx || planCtx()), idea, refCount: S.plan.refs.length };
  const slot = $("#boardSlot");
  const busy = startBusy(slot, `Drawing the storyboard · ${engineName(activeEngine())}`);
  slot.scrollIntoView({ behavior: "smooth", block: "start" });
  let board, used = activeEngine();
  try {
    const j = await aiJSON(buildBoardPrompt(c), { images: S.plan.refs.map(r => r.file), signal: busy.ctl.signal, onText: u => busy.progress(u.text), fresh });
    board = normBoard(humanizeDeep(j, { n: 0 }), c);
  } catch (err) {
    if (err?.code === "cancelled" || err?.name === "AbortError") { busy.done(); toast("Stopped."); return; }
    const m = failMessage(err); if (m) toast(m, 5000);
    used = "offline";
    board = offlineBoard({ ...c, idea: { ...idea, arch: idea.arch || ARCH[hash(idea.title) % ARCH.length].id } });
    if (!idea.arch) { board.frames[0].onscreen = idea.hook; board.frames[0].voiceover = idea.hook; }
  }
  busy.done();
  S.plan.board = { ...board, engine: used };
  renderPlan();
  requestAnimationFrame(() => $("#board")?.scrollIntoView({ behavior: "smooth", block: "start" }));
}

function renderIdeasHead() {
  const c = S.plan.ctx || planCtx();
  return `<div class="res-head">
    <div class="t">
      <h2>${S.plan.ideas.length} ideas for ${esc(PLATFORMS[c.platform].name)}</h2>
      <p class="small muted">${S.plan.example ? `<span class="badge example">${t("example")}</span> ` : ""}Best first. <button class="linkbtn" data-go="how">How scoring works</button></p>
    </div>
    ${ib("regen", t("regen"), 'data-act="regen"')}
  </div>
  ${S.plan.refStyle ? `<p class="small muted">Matched to your reference look: ${esc(S.plan.refStyle)}</p>` : ""}`;
}
function ideaCard(i, k) {
  const c = S.plan.ctx || planCtx();
  const bar = (lab, v) => `<dt>${lab}</dt><dd><i style="width:${v}%"></i></dd><span class="v">${v}</span>`;
  return `<article class="idea${k === S.plan.selected ? " is-selected" : ""}" data-i="${k}">
    <div class="rank" aria-label="Rank ${k + 1}">${k + 1}</div>
    <div class="idea-main">
      <h3>${esc(i.title)}</h3>
      <p class="hook" lang="${c.lang === "kn" ? "kn" : "en"}">${esc(i.hook)}</p>
    </div>
    <div class="score" title="Estimated ${esc(PLATFORMS[c.platform].short)} score out of 100"><b>${i.total}</b><span>score</span></div>
    <div class="idea-foot">
      <button class="btn primary sm" data-act="board">${t("storyboard")}</button>
      <button class="btn sm" data-act="handoff">${t("use")}</button>
      <span class="grow"></span>
      ${ib("save", t("save"), 'data-act="save-idea"')}${ib("listen", t("listen"), 'data-act="listen"')}${ib("copy", t("copy"), `data-c="${copyId(i.hook)}"`)}
    </div>
    <details class="why">
      <summary>Why this idea</summary>
      <div class="why-body">
        <p>${esc(i.angle)}</p>
        <p class="muted">${esc(i.why)} Strongest on ${esc(topSignal(i.scores, c.platform))}.</p>
        <dl class="bars">${bar("Finish", i.scores.completion)}${bar("Shares", i.scores.shares)}${bar("Saves", i.scores.saves)}${bar("Ease", 100 - i.scores.effort)}</dl>
        <p class="small muted mono">${esc(FORMATS[c.format])} · ~${i.length_sec > 120 ? Math.round(i.length_sec / 60) + " min" : i.length_sec + "s"}</p>
      </div>
    </details>
  </article>`;
}
function boardHTML() {
  const b = S.plan.board, i = S.plan.ideas[S.plan.selected]; if (!b || !i) return "";
  const c = S.plan.ctx || planCtx(), tab = S.plan.boardTab || "shots";
  const frames = b.frames.map((f, k) => {
    const ref = f.ref != null && S.plan.refs[f.ref];
    return `<div class="frame">
      <div class="canvas${ref ? " has-img" : ""}" ${ref ? `style="background-image:url('${ref.url}')"` : ""} role="img" aria-label="Frame ${k + 1}: ${esc(f.visual)}">
        <span class="tc">${String(k + 1).padStart(2, "0")} · ${esc(f.time)}</span>${k === 0 ? `<span class="rec" aria-hidden="true"></span>` : ""}
        ${f.onscreen ? `<div class="ost">${esc(f.onscreen)}</div>` : ""}
        <div class="safe b"></div><div class="safe r"></div>
      </div>
      <div class="frame-notes"><b>${esc(f.shot)}</b><p>${esc(f.visual)}</p>${f.voiceover ? `<p class="vo">“${esc(f.voiceover)}”</p>` : ""}</div>
    </div>`;
  }).join("");
  const shotText = b.frames.map((f, k) => `${k + 1}. [${f.time}] ${f.shot}: ${f.visual}\n   On screen: ${f.onscreen}\n   VO: ${f.voiceover}\n   Camera: ${f.camera}`).join("\n");
  const shots = `<ul class="checks">${b.shot_list.map((s, k) => `<li><label><input type="checkbox" id="shot${k}"><span>${esc(s)}</span></label></li>`).join("")}</ul>
    ${b.props.length ? `<p class="small muted">Keep ready: ${esc(b.props.join(" · "))}</p>` : ""}
    ${b.frames[0]?.camera ? `<p class="small muted">Camera: ${esc(b.frames[0].camera)}</p>` : ""}`;
  const road = `<ol class="road">${b.roadmap.map(d => `<li><span class="d">${esc(d.day)}</span><div><b>${esc(d.task)}</b><span>${esc(d.detail)}</span></div></li>`).join("")}</ol>`;
  return `<section class="card board" id="board">
    <div class="board-head">
      <div><span class="label">Storyboard</span><h2>${esc(i.title)}</h2>${S.plan.refs.length && b.style_notes ? `<p class="small muted">${esc(b.style_notes)}</p>` : ""}</div>
      <div class="actions">${ib("copy", t("copy"), `data-c="${copyId(shotText)}"`)}${ib("save", t("save"), 'data-act="save-board"')}${ib("regen", t("regen"), 'data-act="board-regen"')}<button class="btn primary sm" data-act="handoff-board">${t("use")} →</button></div>
    </div>
    <div class="frames-wrap" tabindex="0" role="region" aria-label="Storyboard frames"><div class="frames" id="frames">${frames}</div></div>
    <label class="small muted safe-key"><input type="checkbox" id="safeToggle" checked> Show where app buttons cover the screen</label>
    <div class="board-tabs">
      <div class="seg" role="group" aria-label="Storyboard details"><button data-btab="shots" aria-pressed="${tab === "shots"}">Shot list</button><button data-btab="road" aria-pressed="${tab === "road"}">7-day plan</button></div>
      <div class="panel">${tab === "shots" ? shots : road}</div>
    </div>
  </section>`;
}
function renderPlan() {
  const box = $("#planResults");
  const keepBusy = S.busy && box.contains(S.busy.el) ? S.busy.el : null;
  const shown = S.plan.showAll || S.plan.selected >= 3 ? S.plan.ideas : S.plan.ideas.slice(0, 3);
  const rest = S.plan.ideas.length - shown.length;
  box.innerHTML = renderIdeasHead() + `<div class="ideas">${shown.map(ideaCard).join("")}</div>` +
    (rest > 0 ? `<button class="btn ghost showmore" data-act="more">Show ${rest} more idea${rest > 1 ? "s" : ""}</button>` : "") +
    `<div id="boardSlot">${boardHTML()}</div>`;
  if (keepBusy) box.prepend(keepBusy);
  const st = $("#safeToggle"); if (st) st.onchange = () => $("#frames").classList.toggle("hide-safe", !st.checked);
}
$("#planResults").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.c) { copyText(COPY.get(b.dataset.c) || "", b); return; }
  if (b.dataset.btab) { S.plan.boardTab = b.dataset.btab; renderPlan(); return; }
  if (b.dataset.go) return;
  const card = b.closest(".idea"), k = card ? +card.dataset.i : S.plan.selected, act = b.dataset.act;
  if (act === "regen") generateIdeas({ fresh: true });
  else if (act === "more") { S.plan.showAll = true; renderPlan(); }
  else if (act === "board") buildBoard(k);
  else if (act === "board-regen") buildBoard(S.plan.selected, { fresh: true });
  else if (act === "listen") speak(S.plan.ideas[k].hook, (S.plan.ctx || planCtx()).lang === "kn" ? "kn" : "en");
  else if (act === "save-idea" || act === "save-board") saveIdea(k);
  else if (act === "handoff" || act === "handoff-board") handoff(k);
});

/* Reference images */
function addRefs(files) {
  const imgs = [...files].filter(f => /^image\/(png|jpe?g|webp)$/.test(f.type));
  if (!imgs.length) { toast("Use PNG, JPG or WebP images."); return; }
  for (const f of imgs) {
    if (S.plan.refs.length >= 2) { toast("Two reference images is the limit."); break; }
    if (f.size > 15e6) { toast(`${f.name} is over 15 MB.`); continue; }
    S.plan.refs.push({ file: f, url: URL.createObjectURL(f), name: f.name });
  }
  renderThumbs();
}
function renderThumbs() {
  try { updateMoreSums(); } catch {}
  $("#pThumbs").innerHTML = S.plan.refs.map((r, k) => `<div class="thumb"><img src="${r.url}" alt="Reference ${k + 1}"><button type="button" data-k="${k}" aria-label="Remove reference ${k + 1}">×</button></div>`).join("");
}
$("#pThumbs").onclick = e => { const b = e.target.closest("button"); if (!b) return; const r = S.plan.refs.splice(+b.dataset.k, 1)[0]; URL.revokeObjectURL(r.url); renderThumbs(); };
$("#pRefs").onchange = e => { addRefs(e.target.files); e.target.value = ""; };
["dragenter", "dragover"].forEach(ev => $("#pDrop").addEventListener(ev, e => { e.preventDefault(); $("#pDrop").classList.add("over"); }));
["dragleave", "drop"].forEach(ev => $("#pDrop").addEventListener(ev, e => { e.preventDefault(); $("#pDrop").classList.remove("over"); }));
$("#pDrop").addEventListener("drop", e => addRefs(e.dataTransfer.files));
$("#planForm").addEventListener("paste", e => { const f = [...(e.clipboardData?.files || [])]; if (f.length) addRefs(f); });

/* ---------- Plan → Publish handoff ---------- */
function handoff(k) {
  const i = S.plan.ideas[k]; if (!i) return;
  const b = k === S.plan.selected ? S.plan.board : null;
  const c = S.plan.ctx || planCtx();
  const script = b ? b.frames.map(f => f.voiceover).filter(Boolean).join("\n") : `${i.hook}\n${i.angle}`;
  S.pub.source = { title: i.title, hook: i.hook };
  $("#uTranscript").value = script;
  $("#uTopic").value = i.title;
  S.pub.platforms = [c.platform]; S.pub.lang = c.lang;
  setupPubControls(); updateWordCount(); renderPubSource();
  switchView("publish");
  toast("Script from your plan is loaded. Swap in your real transcript after filming.");
}
function renderPubSource() {
  const s = S.pub.source;
  $("#pubSource").innerHTML = s ? `<p class="source small">Script from your plan: <b>${esc(s.title)}</b>. Swap in your real words after filming. <button type="button" class="linkbtn" id="clearSource">Clear</button></p>` : "";
  const cs = $("#clearSource"); if (cs) cs.onclick = () => { S.pub.source = null; renderPubSource(); };
}

/* ============================================================
   PHASE 2 · PUBLISH
   ============================================================ */
function pubCtx(platform) {
  return { transcript: $("#uTranscript").value.trim(), topic: $("#uTopic").value.trim(), platform, voice: S.pub.voice, lang: S.pub.lang, goal: S.plan.goal };
}
async function buildKits({ fresh = false } = {}) {
  const transcript = $("#uTranscript").value.trim();
  if (transcript.split(/\s+/).length < 8) { toast("Paste at least a couple of sentences of transcript first."); $("#uTranscript").focus(); return; }
  const plats = [...S.pub.platforms];
  const box = $("#pubResults");
  Object.assign(S.pub, { kits: {}, active: plats[0], removed: 0, example: false, variant: {}, tagsOff: {} });
  const busy = startBusy(box, `${t("thinking")} ${engineName(activeEngine())}`);
  $("#uGo").disabled = true;
  let stopped = false;
  for (const p of plats) {
    if (busy.ctl.signal.aborted) { stopped = true; break; }
    busy.el.querySelector(".lbl").textContent = `Writing the ${PLATFORMS[p].short} kit · ${engineName(activeEngine())}`;
    const c = pubCtx(p); let kit, used = activeEngine();
    try {
      const j = await aiJSON(buildKitPrompt(c), { signal: busy.ctl.signal, onText: u => busy.progress(u.text), fresh });
      kit = normKit(j, c);
    } catch (err) {
      if (err?.code === "cancelled" || err?.name === "AbortError") { stopped = true; break; }
      const m = failMessage(err); if (m) toast(m, 5000);
      used = "offline"; kit = offlineKit(c);
    }
    const counter = { n: 0 };
    kit = humanizeDeep(kit, counter); kit.engine = used; kit.removed = counter.n;
    S.pub.kits[p] = kit; S.pub.removed += counter.n;
    renderPub(); box.prepend(busy.el);
  }
  busy.done(); $("#uGo").disabled = false;
  if (stopped) toast("Stopped. Kits finished so far are kept.");
  renderPub();
}
function counterHTML(text, limit) {
  if (!limit) return `<span class="counter">${[...text].length} chars</span>`;
  const n = [...text].length;
  return `<span class="counter${n > limit ? " over" : ""}">${n} / ${limit}</span>`;
}
function selectedTags(p) {
  const k = S.pub.kits[p], off = S.pub.tagsOff[p] || new Set();
  return [...k.hashtags.broad, ...k.hashtags.niche, ...k.hashtags.micro].filter((h, i, a) => a.indexOf(h) === i && !off.has(h));
}
function captionFor(p) {
  const k = S.pub.kits[p], v = S.pub.variant[p] || "short";
  const capText = v === "short" ? k.caption_short : k.caption_story;
  const tags = selectedTags(p).join(" ");
  return p === "yt" || p === "yts" ? capText + (tags ? "\n\n" + tags : "") : capText + (tags ? "\n.\n" + tags : "");
}
function kitText(p) {
  const k = S.pub.kits[p], P = PLATFORMS[p];
  return [`${P.name.toUpperCase()}`, P.titleLimit ? `Title: ${k.titles[0]}` : `Cover line: ${k.titles[0]}`, "", "Caption:", captionFor(p), "",
    `Pinned comment: ${k.pinned_comment}`, `Say these out loud: ${k.spoken_keywords.join(", ")}`, `Thumbnail text: ${k.thumbnail_text.join(" / ")}`,
    `Alt text: ${k.alt_text}`, `Post: ${P.slots.join(" or ")} (starting point)`, `First hour: ${k.first_hour.join(" · ")}`].join("\n");
}
function kitMarkdown() {
  const plats = Object.keys(S.pub.kits); const first = S.pub.kits[plats[0]];
  return `# Post kit · ${$("#uTopic").value.trim() || first.titles[0]}\n\nMade with Reelmap on ${new Date().toLocaleDateString("en-IN")}\n\n## Hook check\nScore ${first.hook_score}/100. ${first.hook_feedback}\nStronger opening: ${first.better_hook}\n\n` +
    plats.map(p => { const k = S.pub.kits[p], P = PLATFORMS[p];
      return `## ${P.name}\n\n**Titles**\n${k.titles.map(x => `- ${x}`).join("\n")}\n\n**Caption (short)**\n\n${k.caption_short}\n\n**Caption (story)**\n\n${k.caption_story}\n\n**Hashtags:** ${selectedTags(p).join(" ")}\n\n**Pinned comment:** ${k.pinned_comment}\n\n**Say out loud:** ${k.spoken_keywords.join(", ")}\n\n**Thumbnail text:** ${k.thumbnail_text.join(" / ")}\n\n**Alt text:** ${k.alt_text}\n\n**When to post:** ${P.slots.join(" or ")} (starting point, check your own insights)\n\n**First hour**\n${k.first_hour.map(x => `- ${x}`).join("\n")}\n`; }).join("\n");
}
function renderPub() {
  const box = $("#pubResults"), plats = Object.keys(S.pub.kits);
  if (!plats.length) { box.innerHTML = `<div class="empty"><h3>Your post kit appears here</h3><p class="muted small">Paste what you say in the video and press Make post kit.</p></div>`; return; }
  if (!S.pub.kits[S.pub.active]) S.pub.active = plats[0];
  const first = S.pub.kits[plats[0]], lang = S.pub.lang === "kn" ? "kn" : "en";
  const hc = first.hook_score, col = hc >= 70 ? "var(--good)" : hc >= 45 ? "var(--warn)" : "var(--bad)";
  const verdict = hc >= 70 ? "Strong opening" : hc >= 45 ? "Opening could be stronger" : "Weak opening";
  const p = S.pub.active, k = S.pub.kits[p], P = PLATFORMS[p], v = S.pub.variant[p] || "short";
  const off = S.pub.tagsOff[p] || new Set();
  const tagBtns = ["broad", "niche", "micro"].flatMap(g => k.hashtags[g].map(h => `<button class="tag" data-tag="${esc(h)}" aria-pressed="${!off.has(h)}" title="${g} · tap to ${off.has(h) ? "add" : "drop"}">${esc(h)}</button>`)).join("");
  const capText = captionFor(p), capBody = v === "short" ? k.caption_short : k.caption_story;
  const extra = (label, text, body) => `<div class="blk"><div class="blk-head"><span class="label">${label}</span>${text ? ib("copy", t("copy"), `data-c="${copyId(text)}"`) : ""}</div>${body}</div>`;
  box.innerHTML = `
  <div class="res-head"><div class="t">
    <h2>Your post kit</h2>
    <p class="small muted">${S.pub.example ? `<span class="badge example">${t("example")}</span> ` : ""}Ready to paste. Tap a hashtag to drop it.</p>
  </div>
  <div class="actions"><button class="btn primary sm" data-act="copy-all">${t("copyAll")}</button>${ib("download", t("download"), 'data-act="download"')}${ib("save", t("save"), 'data-act="save-kit"')}${ib("regen", t("regen"), 'data-act="regen-kit"')}</div></div>

  <section class="card hookcard">
    <div class="ring" style="--v:${hc};--c:${col}"><b>${hc}</b></div>
    <div style="min-width:0;display:flex;flex-direction:column;gap:4px">
      <span class="label">${verdict}</span>
      <p>Try starting with: <b lang="${lang}">${esc(first.better_hook)}</b> ${ib("copy", t("copy"), `data-c="${copyId(first.better_hook)}"`)}</p>
      <details class="why"><summary>Why</summary><div class="why-body"><p>${esc(first.hook_feedback)}</p>${first.hook_issues && first.hook_issues.length > 1 ? `<ul>${first.hook_issues.slice(1).map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}</div></details>
    </div>
  </section>

  <section class="card kit">
    ${plats.length > 1 ? `<div class="kit-tabs" role="tablist">${plats.map(x => `<button class="kit-tab" role="tab" data-plat="${x}" aria-selected="${x === p}">${esc(PLATFORMS[x].name)}</button>`).join("")}</div>` : `<div class="kit-tabs"><span class="kit-tab active">${esc(P.name)}</span></div>`}
    <div class="kit-body" lang="${lang}">
      <div class="blk">
        <div class="blk-head"><span class="label">${P.titleLimit ? "Title" : "Cover line"}</span><span class="r">${counterHTML(k.titles[0], P.titleLimit || 0)}${ib("copy", t("copy"), `data-c="${copyId(k.titles[0])}"`)}</span></div>
        <p class="title-main">${esc(k.titles[0])}</p>
        ${k.titles.length > 1 ? `<details class="why"><summary>${k.titles.length - 1} more option${k.titles.length > 2 ? "s" : ""}</summary><div class="why-body">${k.titles.slice(1).map(x => `<div class="opt"><span>${esc(x)}</span>${ib("copy", t("copy"), `data-c="${copyId(x)}"`)}</div>`).join("")}</div></details>` : ""}
      </div>
      <div class="blk">
        <div class="blk-head"><span class="seg" role="group" aria-label="Caption length"><button data-var="short" aria-pressed="${v === "short"}">Short</button><button data-var="story" aria-pressed="${v === "story"}">Story</button></span>
          <span class="r">${counterHTML(capText, P.capLimit)}${ib("listen", t("listen"), `data-say="${copyId(capBody)}"`)}<button class="btn sm primary" data-c="${copyId(capText)}">${t("copy")}</button></span></div>
        <div class="blk-text">${esc(capText)}</div>
      </div>
      <div class="blk"><div class="blk-head"><span class="label">Hashtags</span>${ib("copy", t("copy"), `data-c="${copyId(selectedTags(p).join(" "))}"`)}</div><div class="tags">${tagBtns}</div></div>
      <details class="more kit-more">
        <summary>More for this post <span class="sum">pinned comment, timing, thumbnail, alt text</span></summary>
        <div class="kit-grid">
          ${extra("Pinned comment", k.pinned_comment, `<div class="blk-text">${esc(k.pinned_comment)}</div>`)}
          ${extra("When to post", "", `${P.slots.map(s => `<div class="mono small">${esc(s)}</div>`).join("")}<p class="small muted">A starting point. Your own Insights win after a few weeks.</p>`)}
          ${extra("Say these out loud", k.spoken_keywords.join(", "), `<div class="chips">${k.spoken_keywords.map(x => `<span class="chip static">${esc(x)}</span>`).join("")}</div><p class="small muted">In the first 10 seconds. Platforms search your speech.</p>`)}
          ${extra("Thumbnail text", k.thumbnail_text.join(" / "), k.thumbnail_text.map(x => `<div>${esc(x)}</div>`).join(""))}
          ${extra("First hour after posting", "", `<ul class="checks">${k.first_hour.map((x, i) => `<li><label><input type="checkbox" id="fh-${p}-${i}"><span>${esc(x)}</span></label></li>`).join("")}</ul>`)}
          ${extra("Alt text", k.alt_text, `<div class="small">${esc(k.alt_text)}</div>`)}
        </div>
      </details>
      <p class="human"><b>✓</b> ${k.removed ? `Cleaned up ${k.removed} robotic phrase${k.removed > 1 ? "s" : ""}` : "Sounds human: no robotic phrasing found"}</p>
    </div>
  </section>`;
}
$("#pubResults").addEventListener("click", async e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.c) { copyText(COPY.get(b.dataset.c) || "", b); return; }
  if (b.dataset.say) { speak(COPY.get(b.dataset.say) || "", S.pub.lang === "kn" ? "kn" : "en"); return; }
  if (b.dataset.plat) { S.pub.active = b.dataset.plat; renderPub(); return; }
  if (b.dataset.var) { S.pub.variant[S.pub.active] = b.dataset.var; renderPub(); return; }
  if (b.dataset.tag) { const s = S.pub.tagsOff[S.pub.active] ||= new Set(); s.has(b.dataset.tag) ? s.delete(b.dataset.tag) : s.add(b.dataset.tag); renderPub(); return; }
  const act = b.dataset.act;
  if (act === "copy-all") copyText(Object.keys(S.pub.kits).map(kitText).join("\n\n————\n\n"), b);
  else if (act === "download") saveFile(`reelmap-post-kit-${new Date().toISOString().slice(0, 10)}.md`, kitMarkdown());
  else if (act === "save-kit") saveKit();
  else if (act === "regen-kit") buildKits({ fresh: true });
});

async function saveFile(filename, data) {
  const d = S.engine.downloads;
  if (d) {
    try { await d.save({ filename, data }); toast("Saved."); return; }
    catch (err) { if (err?.code === "declined") return; if (err?.code !== "unavailable") { toast("Couldn't save the file here. Use Copy all instead."); return; } }
  }
  if (!window.claude) { // served by the local server: normal download works
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([data], { type: "text/plain" })); a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000); return;
  }
  copyText(data); toast("Downloads aren't available here, so the kit was copied to your clipboard.");
}

/* Transcript upload */
function updateWordCount() { const n = $("#uTranscript").value.trim().split(/\s+/).filter(Boolean).length; $("#uWords").textContent = `${n} words`; }
$("#uTranscript").addEventListener("input", updateWordCount);
function updateUploadHint() {
  const can = (activeEngine() === "local" || activeEngine() === "gemini") && S.engine.local?.whisper;
  $("#uDropText").textContent = can ? "or upload audio, video or a captions file" : "or upload a captions file (.srt, .vtt, .txt)";
}
async function handleTranscriptFile(f) {
  if (!f) return;
  if (/\.(txt|srt|vtt)$/i.test(f.name) || f.type.startsWith("text/")) {
    $("#uTranscript").value = cleanTranscript(await f.text()); updateWordCount(); toast(`Loaded ${f.name}.`); return;
  }
  if (/^(audio|video)\//.test(f.type)) {
    if (!((activeEngine() === "local" || activeEngine() === "gemini") && S.engine.local?.whisper)) { toast("Audio and video transcription runs on the local Reelmap server with Whisper. Here, paste the transcript or upload .srt / .vtt captions.", 6500); return; }
    const box = $("#pubResults"), busy = startBusy(box, `Transcribing ${f.name} with Whisper`);
    try {
      const fd = new FormData(); fd.append("file", f); if (S.pub.lang === "kn") fd.append("language", "kn");
      const r = await fetch("/api/transcribe", { method: "POST", body: fd, signal: busy.ctl.signal });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || `Server error ${r.status}`);
      const j = await r.json(); $("#uTranscript").value = j.text.trim(); updateWordCount();
      toast(`Transcribed ${Math.round(j.duration || 0)}s of audio (${j.language || "auto"}).`);
    } catch (err) { if (err.name !== "AbortError") toast("Transcription failed: " + err.message, 6000); }
    busy.done(); return;
  }
  toast("That file type isn't supported. Use .txt, .srt, .vtt, audio or video.");
}
$("#uFile").onchange = e => { handleTranscriptFile(e.target.files[0]); e.target.value = ""; };
["dragenter", "dragover"].forEach(ev => $("#uTranscript").addEventListener(ev, e => { e.preventDefault(); $("#uDrop").classList.add("over"); }));
["dragleave", "drop"].forEach(ev => $("#uTranscript").addEventListener(ev, e => { e.preventDefault(); $("#uDrop").classList.remove("over"); }));
$("#uTranscript").addEventListener("drop", e => handleTranscriptFile(e.dataTransfer.files[0]));

/* ============================================================
   LIBRARY
   ============================================================ */
function saveIdea(k) {
  const i = S.plan.ideas[k]; if (!i) return;
  const c = S.plan.ctx || planCtx();
  const board = k === S.plan.selected ? S.plan.board : null;
  const ex = S.library.find(x => x.type === "idea" && x.data.idea.id === i.id);
  if (ex) { if (board) ex.data.board = board; ex.stage = board && ex.stage === "Idea" ? "Scripted" : ex.stage; }
  else S.library.unshift({ id: uid(), type: "idea", title: i.title, platform: c.platform, stage: board ? "Scripted" : "Idea", created: Date.now(), data: { idea: i, board, ctx: { ...c, refCount: 0 } } });
  persist(); renderLibCount(); toast(t("saved"));
}
function saveKit() {
  const plats = Object.keys(S.pub.kits); if (!plats.length) return;
  const title = $("#uTopic").value.trim() || S.pub.kits[plats[0]].titles[0];
  S.library.unshift({ id: uid(), type: "kit", title, platform: plats.join(","), stage: "Filmed", created: Date.now(),
    data: { kits: S.pub.kits, transcript: $("#uTranscript").value, topic: $("#uTopic").value, lang: S.pub.lang, voice: S.pub.voice } });
  persist(); renderLibCount(); toast(t("saved"));
}
function renderLibCount() { const c = $("#libCount"); c.textContent = S.library.length; c.hidden = !S.library.length; }
function renderLibrary() {
  const f = S.libFilter;
  chips($("#libFilter"), Object.fromEntries(["All", ...STAGES].map(s => [s, s === "All" ? `All ${S.library.length}` : `${s} ${S.library.filter(x => x.stage === s).length}`])), f, { onChange: v => { S.libFilter = v; renderLibrary(); } });
  const items = S.library.filter(x => f === "All" || x.stage === f);
  $("#libList").innerHTML = items.length ? items.map(x => `<div class="row" data-id="${x.id}">
      <span class="type">${x.type === "idea" ? (x.data.board ? "Storyboard" : "Idea") : "Post kit"}</span>
      <div class="ti"><b>${esc(x.title)}</b><span class="small muted">${esc(x.platform.split(",").map(p => PLATFORMS[p]?.short || p).join(" · "))} · ${new Date(x.created).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span></div>
      <select class="stage" aria-label="Stage" id="stage-${x.id}">${STAGES.map(s => `<option${s === x.stage ? " selected" : ""}>${s}</option>`).join("")}</select>
      <div class="actions"><button class="btn sm" data-act="open">Open</button><button class="btn sm ghost" data-act="del">Remove</button></div>
    </div>`).join("")
    : `<div class="empty"><h3>${S.library.length ? "Nothing at this stage yet" : "Your saved ideas and post kits live here"}</h3><p class="small muted" style="max-width:46ch">Press Save on an idea, a storyboard or a post kit. Move each one from Idea to Scripted, Filmed and Posted as you go. Saved on this device only.</p><button class="btn primary sm" data-act="go-plan">Plan an idea</button></div>`;
}
$("#libList").addEventListener("change", e => {
  const sel = e.target.closest("select.stage"); if (!sel) return;
  const x = S.library.find(i => i.id === sel.closest(".row").dataset.id); if (!x) return;
  x.stage = sel.value; persist(); renderLibrary();
});
$("#libList").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.act === "go-plan") { switchView("plan"); return; }
  const row = b.closest(".row"), x = S.library.find(i => i.id === row?.dataset.id); if (!x) return;
  if (b.dataset.act === "del") {
    if (b.dataset.confirm) { S.library = S.library.filter(i => i !== x); persist(); renderLibCount(); renderLibrary(); toast("Removed."); }
    else { b.dataset.confirm = "1"; b.textContent = "Tap again to remove"; b.classList.remove("ghost"); setTimeout(() => { if (b.isConnected) { delete b.dataset.confirm; b.textContent = "Remove"; b.classList.add("ghost"); } }, 3000); }
  } else if (b.dataset.act === "open") {
    if (x.type === "idea") {
      const c = x.data.ctx; Object.assign(S.plan, { format: c.format, platform: c.platform, goal: c.goal, lang: c.lang, ctx: c, ideas: [x.data.idea], selected: x.data.board ? 0 : -1, board: x.data.board, example: false, engine: x.data.board?.engine || "offline" });
      $("#pTopic").value = c.topic || ""; setupPlanControls(); renderPlan(); switchView("plan");
    } else {
      Object.assign(S.pub, { kits: x.data.kits, active: Object.keys(x.data.kits)[0], example: false, lang: x.data.lang, voice: x.data.voice, platforms: Object.keys(x.data.kits), variant: {}, tagsOff: {} });
      $("#uTranscript").value = x.data.transcript; $("#uTopic").value = x.data.topic || ""; updateWordCount(); setupPubControls(); renderPub(); switchView("publish");
    }
  }
});
$("#libExport").onclick = () => {
  if (!S.library.length) { toast("Nothing saved yet."); return; }
  const md = "# Reelmap library\n\n" + S.library.map(x => `## ${x.title}\n- Type: ${x.type}\n- Stage: ${x.stage}\n- Platform: ${x.platform}\n` +
    (x.type === "idea" ? `- Hook: ${x.data.idea.hook}\n- Angle: ${x.data.idea.angle}\n` + (x.data.board ? x.data.board.frames.map((f, k) => `  ${k + 1}. [${f.time}] ${f.onscreen} / VO: ${f.voiceover}`).join("\n") + "\n" : "")
      : Object.entries(x.data.kits).map(([p, k]) => `- ${PLATFORMS[p].name}: ${k.titles[0]}\n\n${k.caption_short}\n`).join("\n"))).join("\n");
  saveFile("reelmap-library.md", md);
};

/* ============================================================
   HOW IT WORKS
   ============================================================ */
function renderHow() {
  const exIdeas = { topic: "cheap breakfast spots near college", format: "faceless", platform: "ig", goal: "grow", lang: "en", refCount: 0 };
  const exIdea = (S.plan.ideas[0]) || offlineIdeas(exIdeas)[0];
  const exKit = { transcript: "So today I tried five breakfast places near Jayanagar, all under 80 rupees…", topic: "5 breakfasts under ₹80", platform: "ig", voice: "friendly", lang: "en" };
  const local = S.engine.local;
  $("#howBody").innerHTML = `
  <section class="card wide">
    <span class="label">The flow</span><h2>From a blank mind to a posted video</h2>
    <ol class="flow" style="margin:0;padding:0">
      <li><b>Profile</b><span class="muted">Niche, audience and language, set once.</span></li>
      <li><b>Idea engine</b><span class="muted">An LLM proposes 5 ideas in different structures.</span></li>
      <li><b>Ranker</b><span class="muted">Scores are weighted by what each platform rewards.</span></li>
      <li><b>Storyboard</b><span class="muted">9:16 frames, shot list, 7-day roadmap. Reads your reference images.</span></li>
      <li><b>Post kit</b><span class="muted">Titles, captions, hashtags, pinned comment, timing, hook check.</span></li>
      <li><b>Humanizer</b><span class="muted">Strips stock AI phrases and em dashes before you see anything.</span></li>
    </ol>
  </section>
  <section class="card">
    <span class="label">Engines</span><h3>Four ways to run, picked automatically</h3>
    <div class="tbl-wrap"><table><thead><tr><th>Engine</th><th>When</th><th>Status here</th></tr></thead><tbody>
      <tr><td><b>Gemini</b><br><span class="small muted">Google Gemini API via server.py</span></td><td>You run <span class="mono">server.py</span> with <span class="mono">GEMINI_API_KEY</span></td><td>${geminiReady() ? `<span style="color:var(--good)">Ready · ${esc(local?.gemini_model || "Gemini")}</span>` : "Not configured (set GEMINI_API_KEY)"}</td></tr>
      <tr><td><b>Local open-source</b><br><span class="small muted">Ollama (Gemma 3 / Llama 3) + Whisper</span></td><td>You run <span class="mono">python server.py</span> and open localhost:8000</td><td>${localReady() ? `<span style="color:var(--good)">Running · ${esc(local?.model || "")}</span>` : local ? `<span style="color:var(--warn)">${esc(S.engine.localErr)}</span>` : "Not running here"}</td></tr>
      <tr><td><b>Claude</b></td><td>The shared link, so reviewers get real AI without installing anything</td><td>${claudeReady() ? `<span style="color:var(--good)">Available</span>` : "Not available in this view"}</td></tr>
      <tr><td><b>Offline templates</b></td><td>No AI reachable. Rules and templates, instant and stage-safe</td><td><span style="color:var(--good)">Always on</span></td></tr>
    </tbody></table></div>
    <p class="small muted">All AI engines get the exact same prompts and the same JSON schema, so results are comparable.</p>
  </section>
  <section class="card">
    <span class="label">Ranking</span><h3>Estimated platform weights</h3>
    <div class="tbl-wrap"><table><thead><tr><th>Platform</th><th>Finish</th><th>Shares</th><th>Saves</th><th>Ease</th></tr></thead><tbody>
      ${Object.values(PLATFORMS).map(P => `<tr><td>${esc(P.name)}</td>${["completion", "shares", "saves", "ease"].map(k => `<td class="n">${Math.round(P.weights[k] * 100)}%</td>`).join("")}</tr>`).join("")}
    </tbody></table></div>
    <p class="small muted">Our own estimates built from public 2026 research on each algorithm (watch time, DM sends and saves on Reels; completion and rewatches on Shorts; dwell and saves on LinkedIn). Not official figures. Score = Σ weight × signal, with Ease = 100 − effort.</p>
  </section>
  <section class="card">
    <span class="label">Open-source stack</span><h3>What runs where</h3>
    <div class="tbl-wrap"><table><tbody>
      <tr><td><b>Ideas, storyboards, captions</b></td><td>Gemma 3 or Llama 3.1 via Ollama, JSON mode</td></tr>
      <tr><td><b>Reference image reading</b></td><td>Gemma 3 vision (or LLaVA) via Ollama</td></tr>
      <tr><td><b>Transcripts</b></td><td>faster-whisper (Whisper small / large-v3), Kannada supported</td></tr>
      <tr><td><b>Keywords (offline)</b></td><td>Frequency + bigram scoring with stop-words, KeyBERT-style</td></tr>
      <tr><td><b>Server</b></td><td>FastAPI + Uvicorn, one file</td></tr>
      <tr><td><b>Read-aloud</b></td><td>Browser speech synthesis (kn-IN / en-IN voices)</td></tr>
    </tbody></table></div>
  </section>
  <section class="card">
    <span class="label">Humanizer</span><h3>Phrases removed from every output</h3>
    <div class="chips">${["em dashes (—)", "let's dive in", "delve into", "game-changer", "unlock the secrets", "elevate", "seamless", "in today's world", "harness the power", "testament to", "tapestry", "embark on", "it's worth noting", "in conclusion", "cutting-edge", "revolutionize", "buckle up", "without further ado"].map(x => `<span class="chip static">${esc(x)}</span>`).join("")}</div>
    <p class="small muted">The prompts forbid them too. The filter is a second line of defence for smaller local models.</p>
  </section>
  <section class="card wide">
    <span class="label">Prompt design</span><h3>The exact prompts sent to the model</h3>
    <p class="small muted">Each prompt has a role, the creator's profile, platform knowledge, hard writing rules, a language rule and a strict JSON schema. Structured output lets the interface render, rank and validate every answer.</p>
    <details open><summary>1 · Idea prompt</summary><pre class="prompt" tabindex="0">${esc(buildIdeasPrompt(exIdeas))}</pre></details>
    <details><summary>2 · Storyboard prompt</summary><pre class="prompt" tabindex="0">${esc(buildBoardPrompt({ ...exIdeas, idea: exIdea }))}</pre></details>
    <details><summary>3 · Post kit prompt</summary><pre class="prompt" tabindex="0">${esc(buildKitPrompt(exKit))}</pre></details>
  </section>`;
}

/* ============================================================
   REVIEWS (shared via the page's database when available)
   ============================================================ */
const RATE = [["ease", "Easy to use"], ["useful", "Ideas were useful"], ["design", "Looks clean and trustworthy"], ["ai", "Captions sounded human"]];
const R = { ratings: {}, use: "", db: null, user: null, myId: null, owner: false, unsub: null };
function renderRatings() {
  $("#revRatings").innerHTML = RATE.map(([k, lab]) => `<div class="rate-row"><span style="font-weight:600;font-size:.9rem">${lab}</span><div class="stars" role="group" aria-label="${lab}" data-k="${k}">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-n="${n}" aria-pressed="${R.ratings[k] === n}" aria-label="${n} of 5">${n}</button>`).join("")}</div></div>`).join("");
}
$("#revRatings").onclick = e => { const b = e.target.closest("button"); if (!b) return; R.ratings[b.parentElement.dataset.k] = +b.dataset.n; renderRatings(); };
function reviewData() {
  return { ratings: { ...R.ratings }, best: $("#rBest").value.trim(), confusing: $("#rConfusing").value.trim(), wouldUse: R.use, role: $("#rRole").value, name: $("#rName").value.trim(), engine: activeEngine(), updatedAt: Date.now() };
}
function reviewText(d) {
  return `Reelmap review\n${RATE.map(([k, l]) => `${l}: ${d.ratings[k] || "-"}/5`).join("\n")}\nWould use: ${d.wouldUse || "-"}\nMost useful: ${d.best || "-"}\nConfusing: ${d.confusing || "-"}\nRole: ${d.role}${d.name ? `\nFrom: ${d.name}` : ""}`;
}
$("#revForm").addEventListener("submit", async e => {
  e.preventDefault();
  const d = reviewData();
  if (Object.keys(d.ratings).length < RATE.length) { toast("Rate all four lines first."); return; }
  if (!R.db || !R.myId) { copyText(reviewText(d)); $("#revNote").textContent = "Reviews can't be saved from this view, so your review was copied. Paste it to the person who sent you the link."; return; }
  $("#rSubmit").disabled = true;
  try { await R.db.doc("feedback/" + R.myId).set(d); $("#revNote").textContent = "Thanks! Your review was sent. You can update it any time from this page."; toast("Review sent."); }
  catch (err) {
    copyText(reviewText(d));
    $("#revNote").textContent = err?.code === "quota_exceeded" ? "The review box is full, so your review was copied instead. Paste it to the person who sent you the link." : "This link lets you view but not save reviews, so your review was copied. Paste it to the person who sent you the link.";
  }
  $("#rSubmit").disabled = false;
});
$("#rCopy").onclick = e => copyText(reviewText(reviewData()), e.currentTarget);
async function initReviews() {
  const c = window.claude; if (!c?.use) return;
  const [db, user] = await Promise.all([c.use("db").catch(() => null), c.use("user").catch(() => null)]);
  R.db = db; R.user = user;
  if (!db || !user) return;
  try { R.myId = await user.id(); } catch {}
  try { R.owner = await user.isOwner(); } catch {}
  if (R.myId) {
    try { const s = await db.doc("feedback/" + R.myId).get(); if (s.exists) { const d = s.data(); R.ratings = { ...(d.ratings || {}) }; R.use = d.wouldUse || ""; $("#rBest").value = d.best || ""; $("#rConfusing").value = d.confusing || ""; $("#rName").value = d.name || ""; if (d.role) $("#rRole").value = d.role; renderRatings(); setupUseChips(); $("#revNote").textContent = "You've already sent a review. Sending again updates it."; } } catch {}
  }
  if (R.owner) {
    R.unsub = db.collection("feedback").onSnapshot(snap => renderOwner(snap.docs.map(d => d.data()).filter(Boolean)), () => {});
  } else {
    $("#revOwnerBody").innerHTML = `<p class="muted">Thanks for testing. Only the person who shared this page sees everyone's reviews.</p>`;
  }
}
function renderOwner(list) {
  if (!list.length) { $("#revOwnerBody").innerHTML = `<p class="muted">No reviews yet. Share this page with reviewers as Contributors so their reviews save here. Viewers can still copy their review as text and send it to you.</p>`; return; }
  list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const avg = k => { const v = list.map(r => r.ratings?.[k]).filter(Number.isFinite); return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : "–"; };
  const yes = list.filter(r => r.wouldUse === "Yes").length;
  const csv = "updated,role,name,ease,useful,design,ai,would_use,best,confusing\n" + list.map(r => [new Date(r.updatedAt || 0).toISOString(), r.role, r.name, r.ratings?.ease, r.ratings?.useful, r.ratings?.design, r.ratings?.ai, r.wouldUse, r.best, r.confusing].map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  $("#revOwnerBody").innerHTML = `<p><b>${list.length}</b> review${list.length > 1 ? "s" : ""} · <b>${yes}</b> would use it</p>
    <div class="avg">${RATE.map(([k, l]) => `<div><b>${avg(k)}</b><span class="small muted">${l}</span></div>`).join("")}</div>
    <div class="actions"><button class="btn sm" id="revCsv">${t("download")} .csv</button></div>
    ${list.map(r => `<div class="review"><div class="actions"><b>${esc(r.name || "Anonymous")}</b><span class="small muted">${esc(r.role || "")} · ${new Date(r.updatedAt || 0).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · would use: ${esc(r.wouldUse || "–")}</span></div><span class="mono small muted">${RATE.map(([k]) => r.ratings?.[k] ?? "–").join(" · ")}</span>${r.best ? `<p><b>Useful:</b> ${esc(r.best)}</p>` : ""}${r.confusing ? `<p><b>Confusing:</b> ${esc(r.confusing)}</p>` : ""}</div>`).join("")}`;
  $("#revCsv").onclick = () => saveFile("reelmap-reviews.csv", csv);
}
function setupUseChips() { chips($("#rUse"), { Yes: "Yes", Maybe: "Maybe", No: "No" }, R.use, { onChange: v => R.use = v }); }

/* ============================================================
   PROFILE + ENGINE SHEETS
   ============================================================ */
function renderProfileStrip() {
  const p = S.profile;
  $("#profileWho").innerHTML = `<b>${esc(p.niche)}</b> · ${esc(p.audience)}${p.location ? " in " + esc(p.location) : ""} · ${esc(p.platforms.map(x => PLATFORMS[x].short).join(", "))} · ${esc(LANGS[p.lang])}`;
}
let sheetOpener = null;
function closeSheet() {
  $("#sheetRoot").innerHTML = "";
  if (sheetOpener && typeof sheetOpener.focus === "function") {
    try { sheetOpener.focus(); } catch {}
  }
  sheetOpener = null;
}
function openSheet(html, onMount, titleId) {
  if (!$("#sheetRoot")?.contains(document.activeElement)) {
    sheetOpener = document.activeElement;
  }
  const labelledBy = titleId ? ` aria-labelledby="${titleId}"` : "";
  $("#sheetRoot").innerHTML = `<div class="scrim" id="scrim"><div class="sheet" role="dialog" aria-modal="true"${labelledBy}>${html}</div></div>`;
  $("#scrim").onclick = e => { if (e.target.id === "scrim") closeSheet(); };
  onMount?.();
  const firstFocusable = $(".sheet input, .sheet button, .sheet select, .sheet textarea, .sheet [tabindex]:not([tabindex='-1'])");
  firstFocusable?.focus();
}
function openProfile(first = false) {
  const p = { ...S.profile, platforms: [...S.profile.platforms] };
  openSheet(`<div class="sheet-head"><div><span class="label">${first ? "Welcome to Reelmap" : "Creator profile"}</span><h2 id="profileDialogTitle">${first ? "Tell Reelmap who you create for" : "Edit your profile"}</h2><p class="small muted" style="margin-top:4px">Set this once. Both phases use it, so you never retype it.</p></div><button class="btn sm ghost" id="pfX" aria-label="Close">✕</button></div>
    <div class="field"><label for="pfNiche">Your niche</label><input type="text" id="pfNiche" value="${esc(p.niche)}" placeholder="e.g. budget food, skincare, coding tips"></div>
    <div class="grid2"><div class="field"><label for="pfAud">Who watches</label><input type="text" id="pfAud" value="${esc(p.audience)}" placeholder="e.g. college students"></div>
    <div class="field"><label for="pfLoc">City or region</label><input type="text" id="pfLoc" value="${esc(p.location)}" placeholder="e.g. Bengaluru"></div></div>
    <div class="field"><span class="label-row"><span id="lblPfPlat">Where you post</span></span><div class="chips" id="pfPlat" role="group" aria-labelledby="lblPfPlat"></div></div>
    <div class="field"><span class="label-row"><span id="lblPfLang">Language you create in</span></span><div class="chips" id="pfLang" role="group" aria-labelledby="lblPfLang"></div></div>
    <div class="field"><div class="label-row"><label for="pfHandle">Handle</label><span class="small muted">optional</span></div><input type="text" id="pfHandle" value="${esc(p.handle)}" placeholder="@yourhandle"></div>
    <div class="actions"><button class="btn primary" id="pfSave">${first ? "Start planning" : "Save profile"}</button></div>`,
    () => {
      chips($("#pfPlat"), Object.fromEntries(Object.entries(PLATFORMS).map(([k, v]) => [k, v.short])), p.platforms, { multi: true, onChange: v => p.platforms = v });
      chips($("#pfLang"), LANGS, p.lang, { onChange: v => p.lang = v });
      $("#pfX").onclick = () => { persist(); closeSheet(); }; $("#pfSkip") && ($("#pfSkip").onclick = () => { persist(); closeSheet(); });
      $("#pfSave").onclick = () => {
        p.niche = $("#pfNiche").value.trim() || DEFAULT_PROFILE.niche; p.audience = $("#pfAud").value.trim() || "viewers";
        p.location = $("#pfLoc").value.trim(); p.handle = $("#pfHandle").value.trim();
        S.profile = p; S.plan.platform = p.platforms[0]; S.plan.lang = p.lang; S.pub.platforms = [...p.platforms]; S.pub.lang = p.lang;
        persist(); renderProfileStrip(); setupPlanControls(); setupPubControls(); closeSheet(); toast("Profile saved.");
      };
    }, "profileDialogTitle");
}
function openEngine() {
  const st = (ok, yes, no) => `<span class="st ${ok ? "ok" : "no"}">${ok ? yes : no}</span>`;
  const loc = S.engine.local;
  openSheet(`<div class="sheet-head"><div><span class="label">AI engine</span><h2 id="engineDialogTitle">Choose what writes your content</h2></div><button class="btn sm ghost" id="enX" aria-label="Close">✕</button></div>
    ${[["auto", "Automatic", "Uses the best engine available: Gemini / Local first, then Claude, then offline templates.", st(true, "Would use " + engineName(autoPick()), "")],
       ["gemini", "Gemini", "Google Gemini API via server.py with GEMINI_API_KEY.", st(geminiReady(), `Ready · ${loc?.gemini_model || "gemini-2.5-flash"} · reads images`, loc ? (loc.gemini_error || "GEMINI_API_KEY not set") : "Start server.py with GEMINI_API_KEY")],
       ["local", "Local open-source AI", "Ollama + Whisper on your own machine. Run python server.py and open http://localhost:8000.", st(localReady(), `Running · ${loc?.model || ""}${loc?.vision ? " · reads images" : ""}${loc?.whisper ? " · Whisper ready" : ""}`, loc ? (S.engine.localErr || "Model not ready") : "Not reachable from this page")],
       ["claude", "Claude", "Works inside the shared link. The first request asks you to allow it.", st(claudeReady(), "Available", S.engine.sampleBlocked ? "Not allowed in this view" : "Not available in this view")],
       ["offline", "Offline templates", "Rules and templates. Instant, no network, good backup for a live demo.", st(true, "Always available", "")]
      ].map(([v, n, d, s]) => `<label class="engine-opt"><input type="radio" name="eng" value="${v}" ${S.engine.mode === v ? "checked" : ""}><span style="display:flex;flex-direction:column;gap:2px"><b>${n}</b><span class="small muted">${d}</span>${s}</span></label>`).join("")}
    <div class="actions"><button class="btn primary" id="enSave">Done</button><button class="btn ghost" id="enRecheck">Check server again</button></div>`,
    () => {
      $("#enX").onclick = closeSheet;
      $("#enRecheck").onclick = async () => { await detectLocal(); openEngine(); toast(geminiReady() || localReady() ? "Server AI ready." : "No server AI reachable from this page."); };
      $("#enSave").onclick = () => { S.engine.mode = $("input[name=eng]:checked").value; persist(); renderEngineChip(); closeSheet(); toast(`Using ${engineName(activeEngine())}.`); };
    }, "engineDialogTitle");
}
$("#editProfile").onclick = () => openProfile(false);
$("#engineChip").onclick = openEngine;
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && $("#scrim")) closeSheet();
  if (e.key === "Escape" && S.busy) S.busy.ctl.abort();
  if (e.key === "Tab" && $("#scrim")) {
    const sheet = $(".sheet");
    if (sheet) {
      const focusableSel = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
      const focusables = $$(focusableSel, sheet).filter(el => el.offsetParent !== null || el.getClientRects().length > 0);
      if (focusables.length > 0) {
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first || !sheet.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last || !sheet.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }
  }
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    const v = $(".view:not([hidden])").id;
    if (v === "view-plan") { e.preventDefault(); generateIdeas(); }
    if (v === "view-publish") { e.preventDefault(); buildKits(); }
  }
});

/* ============================================================
   VIEWS + LANGUAGE + BOOT
   ============================================================ */
function switchView(v) {
  $$(".tab").forEach(b => {
    if (b.dataset.view === v) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  $$(".view").forEach(s => s.hidden = s.id !== "view-" + v);
  if (v === "library") renderLibrary();
  if (v === "how") renderHow();
  window.scrollTo({ top: 0, behavior: "smooth" });
  try { history.replaceState(null, "", "#" + v); } catch {}
}
$$(".tab").forEach(b => b.onclick = () => switchView(b.dataset.view));
document.addEventListener("click", e => { const g = e.target.closest("[data-go]"); if (g) switchView(g.dataset.go); });
function applyUiLang() {
  document.documentElement.lang = S.uiLang === "kn" ? "kn" : "en";
  $$("[data-i18n]").forEach(el => { if (!el.dataset.en) el.dataset.en = el.textContent; el.textContent = (S.uiLang === "kn" && I18N.kn[el.dataset.i18n]) || el.dataset.en; });
  $$("[data-ui-lang]").forEach(b => b.setAttribute("aria-pressed", b.dataset.uiLang === S.uiLang));
}
$$("[data-ui-lang]").forEach(b => b.onclick = () => { S.uiLang = b.dataset.uiLang; persist(); applyUiLang(); renderPlan(); renderPub(); renderLibCount(); });

function updateMoreSums() {
  $("#pMoreSum").textContent = `${GOALS[S.plan.goal]} · ${LANGS[S.plan.lang]}${S.plan.refs.length ? ` · ${S.plan.refs.length} image${S.plan.refs.length > 1 ? "s" : ""}` : ""}`;
  $("#uMoreSum").textContent = `${VOICES[S.pub.voice]} · ${LANGS[S.pub.lang]}`;
}
function setupPlanControls() {
  $$("#pFormat .choice").forEach(b => { b.setAttribute("aria-pressed", b.dataset.v === S.plan.format); b.onclick = () => { S.plan.format = b.dataset.v; $$("#pFormat .choice").forEach(x => x.setAttribute("aria-pressed", x === b)); }; });
  chips($("#pPlatform"), Object.fromEntries(Object.entries(PLATFORMS).map(([k, v]) => [k, v.short])), S.plan.platform, { onChange: v => S.plan.platform = v });
  chips($("#pGoal"), GOALS, S.plan.goal, { onChange: v => { S.plan.goal = v; updateMoreSums(); } });
  chips($("#pLang"), LANGS, S.plan.lang, { onChange: v => { S.plan.lang = v; updateMoreSums(); } });
  updateMoreSums();
}
function setupPubControls() {
  chips($("#uPlatforms"), Object.fromEntries(Object.entries(PLATFORMS).map(([k, v]) => [k, v.short])), S.pub.platforms, { multi: true, onChange: v => S.pub.platforms = v });
  chips($("#uVoice"), VOICES, S.pub.voice, { onChange: v => { S.pub.voice = v; updateMoreSums(); } });
  chips($("#uLang"), LANGS, S.pub.lang, { onChange: v => { S.pub.lang = v; updateMoreSums(); } });
  updateMoreSums();
}
$("#planForm").addEventListener("submit", e => { e.preventDefault(); generateIdeas(); });
$("#pubForm").addEventListener("submit", e => { e.preventDefault(); buildKits(); });

const EXAMPLE_TRANSCRIPT = `Hey guys, welcome back to my channel. So today I went to five breakfast places near Jayanagar and every single plate was under 80 rupees. First stop was a small darshini near 4th Block. Their rava idli was 45 rupees, soft, and the chutney was really fresh. Second, a filter coffee place where the benne masala dosa costs 70 rupees, crispy outside, and honestly the best dosa of the day. Third was a bakery with egg puffs for 25 rupees, good if you're rushing to class. Fourth, a mess that does unlimited pongal for 60 rupees on weekdays only. The last one was a pushcart near the metro with poha and chai for 40 rupees. If you're a student in Bengaluru, save this list for exam week. Comment which area I should try next.`;

function boot() {
  const returning = loadStore();
  S.plan.platform = S.profile.platforms[0] || "ig"; S.plan.lang = S.profile.lang;
  S.pub.platforms = [...S.profile.platforms]; S.pub.lang = S.profile.lang; S.pub.active = S.pub.platforms[0];
  applyUiLang(); renderProfileStrip(); setupPlanControls(); setupPubControls(); setupUseChips(); renderRatings(); renderLibCount();
  // Example state so the first screen shows what the tool does
  const ex = { topic: "cheap breakfast spots near college", format: "faceless", platform: S.plan.platform, goal: "grow", lang: S.plan.lang, refCount: 0 };
  $("#pTopic").value = ex.topic;
  const ideas = offlineIdeas(ex, 7); ideas.forEach(i => i.total = rankScore(i.scores, ex.platform)); ideas.sort((a, b) => b.total - a.total);
  Object.assign(S.plan, { ideas, ctx: ex, selected: -1, board: null, engine: "offline", example: true, showAll: false });
  renderPlan();
  $("#uTranscript").value = EXAMPLE_TRANSCRIPT; $("#uTopic").value = "5 breakfasts under ₹80 in Jayanagar"; updateWordCount();
  for (const p of S.pub.platforms) { const counter = { n: 0 }; const k = humanizeDeep(offlineKit(pubCtx(p)), counter); k.engine = "offline"; k.removed = counter.n; S.pub.kits[p] = k; }
  S.pub.example = true; renderPub();
  renderEngineChip();
  const h = (location.hash || "").slice(1); if (["plan", "publish", "library", "how", "reviews"].includes(h)) switchView(h);
  detectLocal(); connectClaude();
  if (!returning) {
    $("#welcome").hidden = false;
    $("#welcomeGo").onclick = () => { $("#welcome").hidden = true; openProfile(true); };
    $("#welcomeX").onclick = () => { $("#welcome").hidden = true; persist(); };
  }
}
boot();
