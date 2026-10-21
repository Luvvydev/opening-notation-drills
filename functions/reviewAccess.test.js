const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

// Exercise the exported callable without credentials or live Firebase writes.
function fixture(users = {}) {
  const docs = new Map(Object.entries(users).map(([uid, data]) => [`users/${uid}`, data]));
  const ref = (key) => ({ key, collection: (name) => ({ doc: (id) => ref(`${key}/${name}/${id}`) }) });
  let queue = Promise.resolve();
  const db = {
    collection: (name) => ({ doc: (uid) => ref(`${name}/${uid}`) }),
    runTransaction: (callback) => {
      const pending = queue.then(async () => {
        const writes = [];
        const result = await callback({
          get: async ({ key }) => ({ exists: docs.has(key), data: () => docs.get(key) }),
          create: ({ key }, value) => { assert.equal(docs.has(key), false); writes.push([key, value]); }
        });
        writes.forEach(([key, value]) => docs.set(key, value));
        return result;
      });
      queue = pending.catch(() => {});
      return pending;
    }
  };
  class HttpsError extends Error {
    constructor(code, message) { super(message); this.code = code; }
  }
  const firestore = () => db;
  firestore.FieldValue = { serverTimestamp: () => 'server-time' };
  const sandbox = { exports: {}, require: (name) => {
    if (name === 'crypto') return require('node:crypto');
    if (name === 'firebase-admin') return { initializeApp() {}, firestore };
    if (name === 'firebase-functions') return {
      https: { HttpsError }, region: () => ({ https: { onCall: (fn) => fn, onRequest: (fn) => fn } })
    };
    throw new Error(`Unexpected dependency: ${name}`);
  } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8'), sandbox);
  return { call: sandbox.exports.authorizeGameReview, docs };
}
const context = { auth: { uid: 'free' } };
const first = { action: 'review', gameKey: 'e2e4 e7e5 g1f3' };
const next = { action: 'review', gameKey: 'd2d4 d7d5' };

test('requires authentication and validates action and game identity', async () => {
  const { call } = fixture();
  await assert.rejects(call(first, {}), { code: 'unauthenticated' });
  for (const request of [{ action: 'unknown' }, { action: 'review', gameKey: '' },
    { action: 'review', gameKey: 'invalid' }, { action: 'review', gameKey: 'e2e4 '.repeat(5000) }]) {
    await assert.rejects(call(request, context), { code: 'invalid-argument' });
  }
});

test('first review persists once, same game can resume, another game is denied', async () => {
  const { call, docs } = fixture();
  assert.equal((await call(first, context)).paid, false);
  assert.equal(docs.size, 1);
  assert.equal((await call(first, context)).allowed, true);
  await assert.rejects(call(next, context), { code: 'permission-denied' });
  assert.equal(docs.size, 1);
});

test('concurrent requests cannot reserve two preview games', async () => {
  const { call, docs } = fixture();
  const results = await Promise.allSettled([call(first, context), call(next, context)]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(docs.size, 1);
});

test('free and timed trial accounts cannot build a pack or exceed preview', async () => {
  for (const user of [{}, { trialUsed: true, trialStartedAt: Date.now() }]) {
    const { call } = fixture({ free: user });
    await assert.rejects(call({ action: 'pack' }, context), { code: 'permission-denied' });
    await call(first, context);
    await assert.rejects(call(next, context), { code: 'permission-denied' });
  }
});

test('monthly, yearly and lifetime members have access without consuming preview', async () => {
  for (const user of [
    { membershipActive: true, membershipTier: 'member', membershipPlan: 'monthly' },
    { membershipActive: true, membershipTier: 'member', membershipPlan: 'yearly' },
    { membershipActive: true, membershipTier: 'lifetime' }
  ]) {
    const { call, docs } = fixture({ free: user });
    for (const request of [first, next, { action: 'pack' }]) {
      assert.equal((await call(request, context)).paid, true);
    }
    assert.equal(docs.has('users/free/reviewAccess/preview'), false);
  }
});

test('inactive and invalid tier accounts receive only the preview', async () => {
  for (const user of [
    { membershipActive: false, membershipTier: 'member' },
    { membershipActive: false, membershipTier: 'lifetime' },
    { membershipActive: true, membershipTier: 'free' }
  ]) {
    const { call } = fixture({ free: user });
    await call(first, context);
    await assert.rejects(call(next, context), { code: 'permission-denied' });
  }
});

test('separate accounts have separate previews and upgrading unlocks new games', async () => {
  const { call, docs } = fixture();
  await call(first, context);
  await call(next, { auth: { uid: 'other' } });
  docs.set('users/free', { membershipActive: true, membershipTier: 'member' });
  assert.equal((await call(next, context)).paid, true);
  docs.set('users/free', { membershipActive: false, membershipTier: 'free' });
  await assert.rejects(call(next, context), { code: 'permission-denied' });
  assert.equal((await call(first, context)).allowed, true);
});
