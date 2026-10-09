const test = require("node:test");
const assert = require("node:assert/strict");
const {
  humanize,
  rankScore,
  PLATFORMS,
  hookCheck,
  parseJSONLoose,
  cleanTranscript
} = require("../static/logic.js");

test("humanize removes em dash and robotic phrasing with at least 2 fixes", () => {
  const result = humanize("A game-changer — really");
  assert.ok(!result.text.includes("—"), "Em dash was not removed");
  assert.ok(!result.text.includes("game-changer"), "'game-changer' was not removed");
  assert.ok(result.n >= 2, `Expected at least 2 fixes, got ${result.n}`);
});

test("rankScore for 'ig' equals the weighted sum from PLATFORMS.ig.weights", () => {
  const sc = { completion: 80, shares: 70, saves: 60, effort: 40 };
  const w = PLATFORMS.ig.weights;
  const ease = 100 - sc.effort;
  const expected = Math.round(
    w.completion * sc.completion +
    w.shares * sc.shares +
    w.saves * sc.saves +
    w.ease * ease
  );
  const actual = rankScore(sc, "ig");
  assert.equal(actual, expected);
});

test("hookCheck scores greeting lower than scroll-stopping specific hook", () => {
  const greetingHook = hookCheck("Hi guys welcome back");
  const specificHook = hookCheck("3 cafés under ₹100 you need to try?");
  assert.ok(
    greetingHook.score < specificHook.score,
    `Expected greeting score (${greetingHook.score}) to be less than specific hook score (${specificHook.score})`
  );
});

test("parseJSONLoose parses json strings, fenced blocks, embedded objects, and throws on invalid input", () => {
  // Plain JSON
  const res1 = parseJSONLoose('{"a":1}');
  assert.deepEqual(res1, { a: 1 });

  // ```json fenced block
  const res2 = parseJSONLoose('```json\n{"a":1}\n```');
  assert.deepEqual(res2, { a: 1 });

  // Embedded object
  const res3 = parseJSONLoose('Here: {"a":1} done');
  assert.deepEqual(res3, { a: 1 });

  // Throws on "nope"
  assert.throws(
    () => {
      parseJSONLoose("nope");
    },
    (err) => {
      return err instanceof Error;
    }
  );
});

test("cleanTranscript removes timestamp lines", () => {
  const input = "1\n00:00:01,000 --> 00:00:02,000\nHello creators!";
  const cleaned = cleanTranscript(input);
  assert.ok(!cleaned.includes("00:00:01,000 --> 00:00:02,000"), "Timestamp line was not removed");
  assert.ok(cleaned.includes("Hello creators!"), "Transcript body text was lost");
});
