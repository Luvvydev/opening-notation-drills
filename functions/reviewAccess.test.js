const { test } = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
const { hasTrainingAccess } = require("./trainingWorkspace");

function fixture(user, training = false) {
  const db = { collection: () => ({ doc: () => ({ get: async () => ({ exists: !!user, data: () => user }) }) }) };
  class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
  const firestore = () => db;
  const FieldValue = { serverTimestamp: () => "time" };
  const sandbox = { exports: {}, require: (name) => {
    if (name === "crypto") return require("node:crypto");
    if (name === "./trainingWorkspace") return { hasTrainingAccess, createTrainingHandler: ({ timestamp }) => () => timestamp() };
    if (name === "firebase-admin/firestore") return { FieldValue };
    if (name === "firebase-admin") return { initializeApp() {}, firestore };
    if (name === "firebase-functions") return { https: { HttpsError },
      region: () => ({ https: { onCall: (fn) => fn, onRequest: (fn) => fn } }) };
    throw new Error(name);
  } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "index.js"), "utf8"), sandbox);
  return training ? sandbox.exports.trainingWorkspace : sandbox.exports.authorizeGameReview;
}
const review = { action: "review", gameKey: "e2e4 e7e5" };
const context = { auth: { uid: "test" } };
test("anonymous review is unlimited and requires no Firebase writes", async () => {
  const call = fixture();
  for (const gameKey of ["e2e4 e7e5", "d2d4 d7d5", "e2e4 e7e5"]) {
    assert.equal((await call({ ...review, gameKey }, {})).allowed, true);
  }
});
test("legacy review requests still validate input", async () => {
  for (const data of [{ action: "unknown" }, { action: "review", gameKey: "" },
    { action: "review", gameKey: "e2e4 ".repeat(5000) }]) {
    await assert.rejects(fixture()(data, {}), { code: "invalid-argument" });
  }
});
test("pack requires an account and Premium or an active trial", async () => {
  await assert.rejects(fixture()({ action: "pack" }, {}), { code: "unauthenticated" });
  await assert.rejects(fixture({})({ action: "pack" }, context), { code: "permission-denied" });
  for (const user of [
    { membershipActive: true, membershipTier: "member" },
    { membershipActive: true, membershipTier: "lifetime" },
    { trialUsed: true, trialStartedAt: { toMillis: () => Date.now() - 1000 } }
  ]) assert.equal((await fixture(user)({ action: "pack" }, context)).allowed, true);
  await assert.rejects(fixture({ trialUsed: true, trialStartedAt: { toMillis: () => Date.now() - 4 * 86400000 } })({ action: "pack" }, context), { code: "permission-denied" });
});

test("training timestamps work without the legacy namespace FieldValue property", () => {
  assert.equal(fixture(undefined, true)(), "time");
});
