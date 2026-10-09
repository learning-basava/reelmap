// Pure helper utilities, text processors, scoring algorithms, and configuration constants for Reelmap.
"use strict";

/* ---------- Platform knowledge (from 2026 public research; weights are our estimates) ---------- */
const PLATFORMS = {
  ig:  { name: "Instagram Reels", short: "IG Reels", len: 30, capLimit: 2200, titleLimit: 0, tags: 5,
         weights: { completion: .30, shares: .30, saves: .25, ease: .15 },
         slots: ["Tue–Thu · 7–9 PM IST", "Sat · 11 AM–1 PM IST"],
         notes: "Watch time and completion, DM sends (shares) and saves drive reach. Original content only. Captions are searchable, so use plain keywords. 3–5 relevant hashtags." },
  yts: { name: "YouTube Shorts", short: "Shorts", len: 40, capLimit: 5000, titleLimit: 100, tags: 3,
         weights: { completion: .45, shares: .20, saves: .15, ease: .20 },
         slots: ["Fri–Sun · 6–9 PM IST", "Weekdays · 1–3 PM IST"],
         notes: "Completion and rewatches, low swipe-away. 25–50 seconds suits most niches. One clear niche. Reused or compiled clips are demoted. Titles and spoken words are indexed." },
  yt:  { name: "YouTube video", short: "YouTube", len: 480, capLimit: 5000, titleLimit: 100, tags: 3,
         weights: { completion: .45, shares: .15, saves: .15, ease: .25 },
         slots: ["Thu–Sat · publish 5 PM IST, 2 h before evening peak"],
         notes: "Click-through rate times average view duration. Keep the visible title under about 60 characters. Chapters help. The first 30 seconds decide retention." },
  li:  { name: "LinkedIn", short: "LinkedIn", len: 60, capLimit: 3000, titleLimit: 0, tags: 3,
         weights: { completion: .20, shares: .25, saves: .35, ease: .20 },
         slots: ["Tue–Thu · 8–10 AM IST", "Wed · 12–1 PM IST"],
         notes: "Dwell time, genuine comments in the first hour and saves. Keep links out of the post body. Three hashtags at most." }
};
const GOALS = { grow: "Grow followers", saves: "Get saves", sell: "Sell a product", trust: "Build trust" };
const LANGS = { en: "English", kn: "ಕನ್ನಡ", kanglish: "Kanglish" };
const VOICES = { friendly: "Friendly", witty: "Witty", expert: "Expert", calm: "Calm" };
const FORMATS = { faceless: "Faceless", face: "On camera", product: "Product only" };

/* ---------- Humanizer: strips stock AI phrasing ---------- */
const ROBOTIC = [
  [/\s*—\s*/g, ", "], [/\s–\s/g, ", "],
  [/[,\s]*\b(let's|lets) dive in\b[.!:]?/gi, ""], [/\b(let's|lets) dive into\b/gi, "let's look at"], [/\bdive (deep )?into\b/gi, "look at"], [/\bdelve(s|d)? into\b/gi, "get into"],
  [/\bgame[- ]changer\b/gi, "big help"], [/\bunlock(ing)? the (secrets?|power) of\b/gi, "using"], [/\bunlock\b/gi, "get"],
  [/\belevate\b/gi, "improve"], [/\bseamless(ly)?\b/gi, "smooth$1"], [/\bin today's (fast[- ]paced |digital )?world,?\s*/gi, ""],
  [/\bharness(ing)? the power of\b/gi, "using"], [/\btestament to\b/gi, "proof of"], [/\btapestry of\b/gi, "mix of"],
  [/\bembark on\b/gi, "start"], [/\bit'?s (important|worth) (to note|noting) that\s*/gi, ""], [/\bin conclusion,?\s*/gi, ""],
  [/\bcutting[- ]edge\b/gi, "new"], [/\brevolutioni[sz]e\b/gi, "change"], [/\bnavigat(e|ing) the (world|landscape) of\b/gi, "figuring out"],
  [/\bbuckle up\b/gi, "okay"], [/\bwithout further ado,?\s*/gi, ""], [/\bmust[- ]try\b/gi, "worth trying"], [/!{2,}/g, "!"]
];

/* Transcript analysis for the offline post kit */
const STOP = new Set("a an the and or but if so to of in on at for with from by is are was were be been am i me my we our you your he she it its they them their this that these those there here what which who whom how why when where all any both each few more most other some such no nor not only own same than too very can will just dont should now also get got go going went come came like really one two three four five first second last thing things then them okay ok yeah guys hey hi hello welcome back today video channel so um uh actually basically literally let lets gonna wanna know see look much many im ive its thats theres youre dont didnt cant wont isnt about into over under again out up down off still even every rupees rupee rs single near best honestly good next try tried went stop area which comment save list place day".split(" "));
const NUMW = { two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };

/* ---------- Helper Functions & Algorithms ---------- */

/**
 * Clamps a number within the inclusive bounds [a, b].
 * @param {number} n - Number to clamp.
 * @param {number} a - Minimum bound.
 * @param {number} b - Maximum bound.
 * @returns {number} Clamped number.
 */
const clamp = (n, a, b) => Math.max(a, Math.min(b, Number.isFinite(+n) ? +n : a));

/**
 * Capitalizes the first character of a string.
 * @param {string} s - Input string.
 * @returns {string} String with capitalized first character.
 */
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;

/**
 * Computes a 32-bit FNV-1a hash of a string.
 * @param {string|*} s - Value to hash.
 * @returns {number} Unsigned 32-bit integer hash.
 */
function hash(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

/**
 * Creates a deterministic pseudorandom number generator function seeded with an integer.
 * @param {number} seed - PRNG seed.
 * @returns {function(): number} PRNG function returning a float in [0, 1).
 */
function rng(seed) { return () => { seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ seed >>> 15, 1 | seed); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; }; }

/**
 * Formats seconds into an M:SS time string.
 * @param {number} s - Time in seconds.
 * @returns {string} Formatted duration string (M:SS).
 */
const fmtTime = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

/**
 * Escapes HTML characters in a string to prevent XSS injection.
 * @param {string|*} s - String or value to escape.
 * @returns {string} HTML-escaped string.
 */
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/**
 * Strips robotic AI phrasing and buzzwords from text.
 * @param {string} str - Text to humanize.
 * @returns {{text: string, n: number}} Cleaned text and replacement count.
 */
function humanize(str) {
  let n = 0, s = String(str ?? "");
  for (const [re, rep] of ROBOTIC) s = s.replace(re, (...m) => {
    n++; let r = rep.replace("$1", typeof m[1] === "string" && rep.includes("$1") ? m[1] : "");
    const lead = m[0].replace(/^[\s,]+/, "");
    if (r && /^[A-Z]/.test(lead) && /^[a-z]/.test(r)) r = r[0].toUpperCase() + r.slice(1);
    return r;
  });
  s = s.replace(/[,\s]+$/g, (m) => m.includes("\n") ? m.replace(/,/g, "") : "");
  s = s.replace(/ ,/g, ",").replace(/,[ \t]*,/g, ",").replace(/[ \t]{2,}/g, " ").replace(/[ \t]+\n/g, "\n").replace(/^\s*,\s*/, "").trim();
  if (s) s = s[0].toUpperCase() + s.slice(1);
  return { text: s, n };
}

/**
 * Recursively humanizes all string values within an object or array.
 * @param {*} obj - Object or array to traverse.
 * @param {{n: number}} counter - Counter tracking total replacements.
 * @returns {*} Processed copy with humanized strings.
 */
function humanizeDeep(obj, counter) {
  if (typeof obj === "string") { const r = humanize(obj); counter.n += r.n; return r.text; }
  if (Array.isArray(obj)) return obj.map(x => humanizeDeep(x, counter));
  if (obj && typeof obj === "object") { const o = {}; for (const k in obj) o[k] = (k === "hashtags" || k === "scores") ? obj[k] : humanizeDeep(obj[k], counter); return o; }
  return obj;
}

/**
 * Loosely parses JSON from text, extracting from markdown code fences or brackets.
 * @param {string|*} text - Input string containing JSON.
 * @returns {*} Parsed JavaScript value.
 * @throws {Error} Throws if valid JSON cannot be found or parsed.
 */
function parseJSONLoose(text) {
  if (typeof text !== "string") return text;
  try { return JSON.parse(text); } catch {}
  const f = text.match(/```(?:json)?\s*([\s\S]*?)```/); if (f) { try { return JSON.parse(f[1]); } catch {} }
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  if (a >= 0 && b > a) { try { return JSON.parse(text.slice(a, b + 1)); } catch {} }
  throw Object.assign(new Error("The AI reply wasn't valid JSON."), { code: "invalid_json" });
}

/**
 * Calculates a weighted performance rank score for a given platform.
 * @param {{completion: number, shares: number, saves: number, effort: number}} sc - Score breakdown.
 * @param {string} plat - Platform key ('ig', 'yts', 'yt', 'li').
 * @returns {number} Weighted rank score rounded to nearest integer.
 */
function rankScore(sc, plat) {
  const w = PLATFORMS[plat].weights, ease = 100 - clamp(sc.effort, 0, 100);
  return Math.round(w.completion * clamp(sc.completion, 0, 100) + w.shares * clamp(sc.shares, 0, 100) + w.saves * clamp(sc.saves, 0, 100) + w.ease * ease);
}

/**
 * Determines the highest impact performance signal and its weight for a platform.
 * @param {{completion: number, shares: number, saves: number, effort: number}} sc - Score breakdown.
 * @param {string} plat - Platform key ('ig', 'yts', 'yt', 'li').
 * @returns {string} Description of the top contributing signal and its weight percentage.
 */
function topSignal(sc, plat) {
  const w = PLATFORMS[plat].weights;
  const parts = { completion: w.completion * sc.completion, shares: w.shares * sc.shares, saves: w.saves * sc.saves, ease: w.ease * (100 - sc.effort) };
  const k = Object.entries(parts).sort((a, b) => b[1] - a[1])[0][0];
  const label = { completion: "completion", shares: "shares", saves: "saves", ease: "low effort" }[k];
  return `${label} (${Math.round(w[k] * 100)}% of the ${PLATFORMS[plat].short} score)`;
}

/**
 * Strips subtitle timestamps, WebVTT markers, HTML tags, and cleans whitespace.
 * @param {string} raw - Raw transcript or subtitle string.
 * @returns {string} Cleaned plain text transcript.
 */
function cleanTranscript(raw) {
  return String(raw || "").replace(/^WEBVTT.*$/gm, "").replace(/^\d+\s*$/gm, "").replace(/^\s*[\d:.,]+\s*-->\s*[\d:.,]+.*$/gm, "").replace(/<[^>]+>/g, "").replace(/\n{2,}/g, "\n").replace(/[ \t]+/g, " ").trim();
}

/**
 * Splits text into non-empty sentences.
 * @param {string} text - Input text.
 * @returns {string[]} Array of non-empty trimmed sentences.
 */
function sentences(text) { return text.replace(/\n+/g, " ").split(/(?<=[.!?।])\s+/).map(s => s.trim()).filter(s => s.length > 2); }

/**
 * Extracts top unigram and bigram keywords from text, filtering stop words.
 * @param {string} text - Text to analyze.
 * @param {number} [n=8] - Maximum number of keywords to return.
 * @returns {string[]} List of extracted keywords.
 */
function keywords(text, n = 8) {
  const words = text.toLowerCase().replace(/[^\p{L}\p{N}\s₹]/gu, " ").split(/\s+/).filter(w => w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w));
  const uni = new Map(), bi = new Map();
  words.forEach((w, i) => { uni.set(w, (uni.get(w) || 0) + 1); if (i && words[i - 1] !== w) { const b = words[i - 1] + " " + w; bi.set(b, (bi.get(b) || 0) + 1); } });
  const bis = [...bi].filter(([, c]) => c > 1).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([b]) => b);
  const unis = [...uni].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length).map(([w]) => w).filter(w => !bis.some(b => b.includes(w)));
  return [...bis, ...unis].slice(0, n);
}

/**
 * Finds number and subject phrases (e.g. '5 tips', 'three reasons') in text.
 * @param {string} text - Text to search.
 * @returns {{n: string, what: string}|null} Matched phrase details or null.
 */
function countPhrase(text) {
  for (const m of text.matchAll(/\b(\d{1,2}|two|three|four|five|six|seven|eight|nine|ten)\s+((?:[a-z]+\s+)?[a-z]{3,}s)\b/gi)) {
    if (/rupee|minute|second|hour|year|day|time/i.test(m[2])) continue;
    return { n: String(NUMW[m[1].toLowerCase()] || m[1]), what: m[2].toLowerCase() };
  }
  return null;
}

/**
 * Extracts a rupee price from text if present.
 * @param {string} text - Text to search.
 * @returns {string} Price string starting with ₹ or empty string.
 */
function priceIn(text) { const m = text.match(/₹\s?(\d+)|(\d+)\s?(?:rupees|rs\b)/i); return m ? "₹" + (m[1] || m[2]) : ""; }

/**
 * Evaluates the opening hook of a video script for engagement and scroll-stopping factors.
 * @param {string} first - Hook text.
 * @returns {{score: number, issues: string[]}} Hook retention score and list of detected issues.
 */
function hookCheck(first) {
  const s = (first || "").trim(), w = s.split(/\s+/).filter(Boolean), issues = [];
  let score = 30;
  const greet = /^(hi|hey|hello|namaskara|welcome|so,? today|today i|in this video)\b/i.test(s);
  if (greet) issues.push("It opens with a greeting. Viewers swipe before you reach the point."); else score += 25;
  if (w.length && w.length <= 12) score += 20; else issues.push(`It's ${w.length} words. Aim for 12 or fewer so it fits on screen.`);
  if (/\d|₹/.test(s)) score += 10; else issues.push("Add a number or price. Specifics stop the scroll.");
  if (/\b(you|your|nimma|neevu)\b|ನೀವು|ನಿಮ್ಮ/i.test(s)) score += 8;
  if (/\?|\b(why|secret|mistake|stop|never|nobody|worth|wrong|best|worst)\b/i.test(s)) score += 10; else issues.push("Open a loop: a question, a surprise or a stake.");
  return { score: clamp(score, 5, 98), issues };
}

/**
 * Converts a keyword or phrase into a PascalCase hashtag.
 * @param {string} s - Phrase to convert.
 * @returns {string} Hashtag string.
 */
const toTag = s => "#" + String(s).split(/\s+/).map(w => cap(w.replace(/[^\p{L}\p{N}]/gu, ""))).join("");

if (typeof module !== "undefined") {
  module.exports = {
    clamp, cap, hash, rng, fmtTime, esc, humanize, humanizeDeep,
    parseJSONLoose, rankScore, topSignal, cleanTranscript, sentences,
    keywords, countPhrase, priceIn, hookCheck, toTag,
    PLATFORMS, GOALS, LANGS, VOICES, FORMATS, ROBOTIC, STOP, NUMW
  };
}
