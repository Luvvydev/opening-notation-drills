const { test } = require("node:test");
const assert = require("node:assert/strict");
const { normalizeReview, hasTrainingAccess, createTrainingHandler } = require("./trainingWorkspace");
const now = 2000000000000;
const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const review = { gameKey: "e2e4 e7e5", orientation: "white", startFen: fen,
  items: [{ fen, bestMove: "e2e4", theme: "Missed stronger move" }] };
test("trial uses server time and cannot be future dated or extended", () => {
  const user = { trialUsed: true, trialStartedAt: { toMillis: () => now - 1000 } };
  assert.equal(hasTrainingAccess(user, now), true);
  assert.equal(hasTrainingAccess(user, now + 3 * 86400000), false);
  assert.equal(hasTrainingAccess(user, now - 2000), false);
  assert.equal(hasTrainingAccess({ membershipActive: true, membershipTier: "free" }, now), false);
});
test("review identity includes start position and player side", () => {
  const a = normalizeReview(review);
  assert.equal(a.id, normalizeReview(review).id);
  assert.notEqual(a.id, normalizeReview({ ...review, orientation: "black" }).id);
  assert.notEqual(a.id, normalizeReview({ ...review, startFen: "other" }).id);
  assert.equal(normalizeReview({ ...review, items: Array(30).fill(review.items[0]) }).items.length, 1);
  assert.throws(() => normalizeReview({ ...review, items: [{ fen, bestMove: "not a move" }] }));
});
function fixture(premium = true) {
  const docs = new Map([["users/test", { membershipActive: premium, membershipTier: "member" }]]);
  const ref = (key) => ({ key, collection: (name) => ({ doc: (id) => ref(key + "/" + name + "/" + id) }) });
  const snap = (r) => ({ exists: docs.has(r.key), data: () => docs.get(r.key) });
  const db = { collection: (name) => ({ doc: (id) => ref(name + "/" + id) }), runTransaction: async (cb) => {
    const writes = [];
    const result = await cb({ get: async (r) => snap(r),
      create: (r, v) => { assert.equal(docs.has(r.key), false); writes.push([r.key, v]); },
      set: (r, v) => writes.push([r.key, { ...docs.get(r.key), ...v }]),
      update: (r, v) => writes.push([r.key, { ...docs.get(r.key), ...v }]) });
    writes.forEach(([k, v]) => docs.set(k, v)); return result;
  } };
  class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
  return { docs, call: createTrainingHandler({ db, timestamp: () => "time", HttpsError, now: () => now }) };
}
const context = { auth: { uid: "test" } };
test("free accounts cannot save paid history", async () => {
  const { call } = fixture(false);
  await assert.rejects(call({ action: "save_review", review }, context), { code: "permission-denied" });
  await assert.rejects(call({ action: "save_review", review }, {}), { code: "unauthenticated" });
});
test("saving the same review is idempotent and preserves puzzle attempts", async () => {
  const { call, docs } = fixture();
  await call({ action: "save_review", review }, context);
  const itemId = normalizeReview(review).items[0].id;
  const request = { action: "attempt", itemId, correct: true, attemptId: "attempt_123456" };
  await call(request, context);
  await call(request, context);
  await call({ ...request, attemptId: "attempt_another" }, context);
  await call({ action: "save_review", review }, context);
  assert.equal(docs.get("users/test/trainingItems/" + itemId).attempts, 1);
  assert.equal(docs.get("users/test/trainingState/counts").reviews, 1);
  assert.equal(docs.get("users/test/trainingState/counts").items, 1);
});
test("review cap rejects new summaries without touching existing history", async () => {
  const { call, docs } = fixture();
  docs.set("users/test/trainingState/counts", { reviews: 200, items: 500 });
  await assert.rejects(call({ action: "save_review", review }, context), { code: "resource-exhausted" });
  assert.equal(docs.size, 2);
});
