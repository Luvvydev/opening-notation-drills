const assert = require("node:assert/strict");
const { test } = require("node:test");
const project = process.env.GCLOUD_PROJECT || "demo-chessdrills";
if (!project.startsWith("demo-")) throw new Error("Emulator tests require a demo project");
const authBase = "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1";
const storeBase = "http://127.0.0.1:8080/v1/projects/" + project + "/databases/(default)/documents/";
const callBase = "http://127.0.0.1:5001/" + project + "/us-central1/";
async function account(label) {
  const res = await fetch(authBase + "/accounts:signUp?key=fake-api-key", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: label + Date.now() + "@example.test", password: "LocalTest123!", returnSecureToken: true })
  });
  assert.equal(res.status, 200);
  return res.json();
}
function value(v) {
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return { integerValue: String(v) };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  return { stringValue: v };
}
async function write(path, fields, token = "owner") {
  return fetch(storeBase + path, { method: "PATCH", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, value(v)])) }) });
}
async function read(path, token) {
  return fetch(storeBase + path, { headers: { Authorization: "Bearer " + token } });
}
async function call(name, data, token) {
  if (process.env.CHESSDRILLS_DIRECT_CALLABLES === "true") {
    // Exercise the actual exported handlers with emulator-verified identities.
    // Useful where the Functions emulator's Unix IPC socket is unavailable.
    const handlers = require("../functions/index");
    const admin = require("../functions/node_modules/firebase-admin");
    const codes = { unauthenticated: 401, "permission-denied": 403, "invalid-argument": 400, "not-found": 404, "resource-exhausted": 429 };
    try {
      const decoded = token ? await admin.auth().verifyIdToken(token) : null;
      const result = await handlers[name].run(data, decoded ? { auth: { uid: decoded.uid, token: decoded } } : {});
      return { status: 200, body: { result } };
    } catch (error) {
      return { status: codes[error.code] || 500, body: { error: error.message } };
    }
  }
  const res = await fetch(callBase + name, { method: "POST",
    signal: AbortSignal.timeout(15000),
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
    body: JSON.stringify({ data }) });
  return { status: res.status, body: await res.json() };
}
const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const review = { gameKey: "e2e4 e7e5", startFen: fen, orientation: "white", depth: 12, multiPv: 3,
  label: "Local test game", items: [{ fen, bestMove: "e2e4", theme: "Missed stronger move" }] };
test("conversion access and rules against real Auth, Firestore and Functions emulators", async () => {
  const free = await account("free");
  const member = await account("member");
  const trial = await account("trial");
  const lifetime = await account("lifetime");
  const expired = await account("expired");
  for (const [a, fields] of [
    [free, { displayName: "Free" }],
    [member, { membershipActive: true, membershipTier: "member" }],
    [lifetime, { membershipActive: true, membershipTier: "lifetime" }],
    [trial, { trialUsed: true, trialStartedAt: new Date(Date.now() - 1000) }],
    [expired, { trialUsed: true, trialStartedAt: new Date(Date.now() - 4 * 86400000) }]
  ]) assert.equal((await write("users/" + a.localId, fields)).status, 200);
  assert.equal((await call("authorizeGameReview", { action: "review", gameKey: "e2e4" })).status, 200);
  assert.equal((await call("authorizeGameReview", { action: "review", gameKey: "d2d4" })).status, 200);
  assert.equal((await call("authorizeGameReview", { action: "pack" })).status, 401);
  assert.equal((await call("authorizeGameReview", { action: "pack" }, free.idToken)).status, 403);
  assert.equal((await call("authorizeGameReview", { action: "pack" }, expired.idToken)).status, 403);
  for (const a of [member, trial, lifetime]) {
    assert.equal((await call("authorizeGameReview", { action: "pack" }, a.idToken)).status, 200);
    const saved = await call("trainingWorkspace", { action: "save_review", review }, a.idToken);
    assert.equal(saved.status, 200, JSON.stringify(saved.body));
    const repeated = await call("trainingWorkspace", { action: "save_review", review }, a.idToken);
    assert.equal(repeated.body.result.added, 0);
  }
  assert.equal((await call("trainingWorkspace", { action: "save_review", review }, free.idToken)).status, 403);
  assert.equal((await call("trainingWorkspace", { action: "save_review", review }, expired.idToken)).status, 403);
  assert.equal((await write("users/" + free.localId, { membershipActive: true, membershipTier: "member" }, free.idToken)).status, 403);
  assert.equal((await write("users/" + free.localId + "/trainingItems/forged", { fen }, free.idToken)).status, 403);
  const loaded = await call("trainingWorkspace", { action: "load" }, member.idToken);
  assert.equal(loaded.body.result.reviews.length, 1);
  assert.equal(loaded.body.result.items.length, 1);
  const item = loaded.body.result.items[0];
  const request = { action: "attempt", itemId: item.id, correct: true, attemptId: "local_attempt_123" };
  assert.equal((await call("trainingWorkspace", request, member.idToken)).status, 200);
  assert.equal((await call("trainingWorkspace", request, member.idToken)).body.result.duplicate, true);
  const after = await call("trainingWorkspace", { action: "load" }, member.idToken);
  assert.equal(after.body.result.items[0].attempts, 1);
  assert.equal((await read("users/" + member.localId + "/trainingItems/" + item.id, free.idToken)).status, 403);
  assert.equal((await read("users/" + member.localId + "/trainingItems/" + item.id, member.idToken)).status, 200);
  // Expiry retains owner read access, while new paid writes are denied.
  await write("users/" + member.localId, { membershipActive: false, membershipTier: "free" });
  assert.equal((await read("users/" + member.localId + "/trainingItems/" + item.id, member.idToken)).status, 200);
  assert.equal((await call("trainingWorkspace", { action: "attempt", ...request }, member.idToken)).status, 403);
  assert.equal((await call("trainingWorkspace", { action: "load" }, member.idToken)).status, 200);
  // Trial membership is consistent in rules and callable checks.
  assert.equal((await read("leaderboards_drill_alltime/example", trial.idToken)).status, 404);
  assert.equal((await read("leaderboards_drill_alltime/example", expired.idToken)).status, 403);
  // Trial start requires a server timestamp. Existing trials cannot be reset.
  const startBody = { writes: [{ update: { name: "projects/" + project + "/databases/(default)/documents/users/" + free.localId,
    fields: { trialUsed: { booleanValue: true } } }, updateMask: { fieldPaths: ["trialUsed"] },
    updateTransforms: [{ fieldPath: "trialStartedAt", setToServerValue: "REQUEST_TIME" }] }] };
  const commit = () => fetch(storeBase.replace(/documents\/$/, "documents:commit"), { method: "POST",
    headers: { Authorization: "Bearer " + free.idToken, "Content-Type": "application/json" }, body: JSON.stringify(startBody) });
  assert.equal((await commit()).status, 200);
  assert.equal((await commit()).status, 403);
  console.log("Verified guest, free, trial, expired, monthly/lifetime, idempotency, ownership and forged write rejection.");
});
