const crypto = require("crypto");

const MAX_REVIEWS = 200;
const MAX_ITEMS = 500;
const MAX_REVIEW_ITEMS = 12;
const DAY_MS = 86400000;

function hasTrainingAccess(user, now = Date.now()) {
  if (!user) return false;
  if (user.membershipActive === true && ["member", "lifetime"].includes(user.membershipTier)) return true;
  const start = user.trialStartedAt;
  const millis = start && typeof start.toMillis === "function" ? start.toMillis() : 0;
  return user.trialUsed === true && millis > 0 && millis <= now && now < millis + 3 * DAY_MS;
}

function text(value, max) {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function normalizeReview(input) {
  if (!input || typeof input !== "object") throw new Error("invalid_review");
  const gameKey = input.gameKey;
  if (typeof gameKey !== "string" || gameKey.length > 20000 ||
      !/^[a-h][1-8][a-h][1-8][qrbn]?( [a-h][1-8][a-h][1-8][qrbn]?)*$/.test(gameKey)) throw new Error("invalid_game");
  if (!["white", "black"].includes(input.orientation)) throw new Error("invalid_side");
  const startFen = text(input.startFen, 100);
  const id = crypto.createHash("sha256").update(startFen + ":" + input.orientation + ":" + gameKey).digest("hex");
  const items = (Array.isArray(input.items) ? input.items : []).slice(0, MAX_REVIEW_ITEMS).map((item) => {
    if (!item || typeof item.fen !== "string" || item.fen.length > 100 ||
        !/^[prnbqkPRNBQK1-8/]+ [wb] [KQkq-]+ [a-h1-8-]+ [0-9]+ [0-9]+$/.test(item.fen) ||
        typeof item.bestMove !== "string" || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(item.bestMove)) throw new Error("invalid_position");
    const theme = text(item.theme, 60) || "Missed stronger move";
    const itemId = crypto.createHash("sha256").update(item.fen + ":" + item.bestMove).digest("hex");
    return { id: itemId, fen: item.fen, bestMove: item.bestMove, theme,
      opening: text(item.opening, 80), sourceReview: id,
      severity: ["blunder", "mistake", "miss", "inaccuracy"].includes(item.severity) ? item.severity : "mistake" };
  });
  return { id, summary: {
    schemaVersion: 1, engineVersion: "stockfish-11-asm", orientation: input.orientation,
    depth: Math.max(1, Math.min(30, Math.floor(Number(input.depth) || 12))),
    multiPv: Math.max(1, Math.min(5, Math.floor(Number(input.multiPv) || 3))),
    opening: text(input.opening, 80), label: text(input.label, 120) || "Reviewed game",
    puzzleCount: Math.max(0, Math.min(500, Math.floor(Number(input.puzzleCount) || 0))),
    // Counts describe analyzed positions, never a verified coaching diagnosis.
    themes: items.map((item) => item.theme), analyzedAtMs: Date.now()
  }, items: [...new Map(items.map((item) => [item.id, item])).values()] };
}

function createTrainingHandler({ db, timestamp, HttpsError, now = Date.now }) {
  return async (data, context) => {
    if (!context.auth || !context.auth.uid) throw new HttpsError("unauthenticated", "sign_in_required");
    const uid = context.auth.uid;
    const userRef = db.collection("users").doc(uid);
    const action = data && data.action;
    if (action === "load") {
      const [reviews, items] = await Promise.all([
        userRef.collection("reviewSummaries").limit(MAX_REVIEWS).get(),
        userRef.collection("trainingItems").limit(MAX_ITEMS).get()
      ]);
      return { reviews: reviews.docs.map((doc) => ({ ...doc.data(), id: doc.id })),
        items: items.docs.map((doc) => ({ ...doc.data(), id: doc.id })) };
    }
    if (action !== "save_review" && action !== "attempt") throw new HttpsError("invalid-argument", "invalid_training_action");
    let review;
    if (action === "save_review") {
      try { review = normalizeReview(data.review); }
      catch (_) { throw new HttpsError("invalid-argument", "invalid_review"); }
    } else if (typeof data.itemId !== "string" || !/^[a-f0-9]{64}$/.test(data.itemId) ||
        typeof data.correct !== "boolean" || typeof data.attemptId !== "string" ||
        !/^[a-zA-Z0-9_]{8,100}$/.test(data.attemptId)) {
      throw new HttpsError("invalid-argument", "invalid_attempt");
    }
    return db.runTransaction(async (tx) => {
      const user = await tx.get(userRef);
      if (!user.exists || !hasTrainingAccess(user.data(), now())) throw new HttpsError("permission-denied", "premium_or_trial_required");
      if (action === "attempt") {
        const ref = userRef.collection("trainingItems").doc(data.itemId);
        const snap = await tx.get(ref);
        if (!snap.exists) throw new HttpsError("not-found", "training_item_missing");
        const item = snap.data();
        if (item.lastAttemptId === data.attemptId) return { ok: true, duplicate: true };
        // One credited attempt per position per 30 seconds, also limits retry abuse.
        if (item.lastAttemptAtMs && now() - item.lastAttemptAtMs < 30000) return { ok: true, duplicate: true };
        const successes = (Number(item.successes) || 0) + (data.correct ? 1 : 0);
        tx.update(ref, { attempts: (Number(item.attempts) || 0) + 1, successes,
          lastCorrect: data.correct, lastAttemptId: data.attemptId, lastAttemptAtMs: now(),
          dueAtMs: now() + (data.correct ? Math.min(7, Math.max(1, successes)) * DAY_MS : 600000),
          updatedAt: timestamp() });
        return { ok: true };
      }
      const reviewRef = userRef.collection("reviewSummaries").doc(review.id);
      const stateRef = userRef.collection("trainingState").doc("counts");
      const [existing, state, ...itemSnaps] = await Promise.all([
        tx.get(reviewRef), tx.get(stateRef),
        ...review.items.map((item) => tx.get(userRef.collection("trainingItems").doc(item.id)))
      ]);
      const counts = state.exists ? state.data() : { reviews: 0, items: 0 };
      if (!existing.exists && counts.reviews >= MAX_REVIEWS) throw new HttpsError("resource-exhausted", "review_storage_full");
      const fresh = review.items.filter((_, i) => !itemSnaps[i].exists);
      const room = Math.max(0, MAX_ITEMS - (Number(counts.items) || 0));
      const additions = fresh.slice(0, room);
      tx.set(reviewRef, { ...review.summary, updatedAt: timestamp() }, { merge: true });
      additions.forEach((item) => tx.create(userRef.collection("trainingItems").doc(item.id),
        { ...item, schemaVersion: 1, attempts: 0, successes: 0, dueAtMs: now(), updatedAt: timestamp() }));
      tx.set(stateRef, { reviews: (Number(counts.reviews) || 0) + (existing.exists ? 0 : 1),
        items: (Number(counts.items) || 0) + additions.length, updatedAt: timestamp() });
      return { ok: true, reviewId: review.id, added: additions.length, itemLimitReached: additions.length < fresh.length };
    });
  };
}

module.exports = { hasTrainingAccess, normalizeReview, createTrainingHandler, MAX_REVIEWS, MAX_ITEMS };
