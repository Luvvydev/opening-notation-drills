
// Weighted practice line selection.
// Intentionally UI-agnostic. Expects per-line stats to live in progress via getLineStats().

const DAY_MS = 24 * 60 * 60 * 1000;

function clamp01(x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return x;
}

function weightedPick(items, weightFn) {
  let total = 0;
  const weights = items.map((it, idx) => {
    const w = Math.max(0, Number(weightFn(it, idx)) || 0);
    total += w;
    return w;
  });

  if (total <= 0) return null;

  let r = Math.random() * total;
  for (let i = 0; i < items.length; i += 1) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1] || null;
}

export function pickNextPracticeLineId({
  openingKey,
  lineIds,
  progress,
  getLineStats,
  lastLineId,
  forceRepeatLineId,
  excludeLineIds
}) {
  const idsAll = Array.isArray(lineIds) ? lineIds.filter(Boolean) : [];
  if (!openingKey || idsAll.length === 0) return null;

  const exclude = Array.isArray(excludeLineIds) ? excludeLineIds.filter(Boolean).map(String) : [];
  const excludeSet = new Set(exclude);
  const ids = excludeSet.size > 0 ? idsAll.filter((id) => !excludeSet.has(String(id))) : idsAll;

  if (forceRepeatLineId) return forceRepeatLineId;

  const now = Date.now();

  const scored = ids.map((id) => {
    const s = getLineStats(progress, openingKey, id);
    const timesSeen = Number(s.timesSeen) || 0;
    const timesCompleted = Number(s.timesCompleted) || 0;
    const timesClean = Number(s.timesClean) || 0;
    const timesFailed = Number(s.timesFailed) || 0;
    const lastFailedAt = Number(s.lastFailedAt) || 0;

    const accuracy = timesCompleted > 0 ? (timesClean / timesCompleted) : 0;
    const lowAccuracy = 1 - clamp01(accuracy);

    const failedRecently = lastFailedAt > 0 && (now - lastFailedAt) <= DAY_MS;

    return {
      id,
      timesSeen,
      timesCompleted,
      timesClean,
      timesFailed,
      lastFailedAt,
      failedRecently,
      lowAccuracy
    };
  });

  const unseen = scored.filter((x) => x.timesSeen <= 0).map((x) => x.id);
  if (unseen.length > 0) {
    const pool = unseen.filter((id) => id !== lastLineId);
    const choice = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : unseen[0];
    return choice || null;
  }

  const recentlyFailed = scored
    .filter((x) => x.failedRecently && x.timesFailed > 0)
    .sort((a, b) => (b.lastFailedAt || 0) - (a.lastFailedAt || 0))
    .map((x) => x.id);

  if (recentlyFailed.length > 0) {
    const pool = recentlyFailed.slice(0, Math.min(6, recentlyFailed.length));
    const pick = weightedPick(pool, (_id, idx) => 10 - idx);
    return pick || recentlyFailed[0] || null;
  }

  const pick = weightedPick(scored, (x) => {
    let w = 1;
    w += x.lowAccuracy * 20;
    w += Math.min(10, x.timesFailed) * 3;
    w += 1 / (1 + x.timesSeen);
    if (x.id === lastLineId) w *= 0.05;
    return w;
  });

  return (pick && pick.id) || null;
}

export function pickNextLearnLineId({
  openingKey,
  lineIds,
  learnProgress,
  getLearnLineStats,
  lastLineId,
  forceRepeatLineId
}) {
  if (!openingKey) return null;

  const ids = Array.isArray(lineIds) ? lineIds.filter(Boolean) : [];
  if (ids.length === 0) return null;

  if (forceRepeatLineId) return forceRepeatLineId;

  const now = Date.now();

  const scored = ids.map((id) => {
    const s = getLearnLineStats(learnProgress, openingKey, id) || {};

    const timesSeen = Number(s.timesSeen) || 0;
    const timesCompleted = Number(s.timesCompleted) || 0;
    const timesClean = Number(s.timesClean) || 0;
    const timesFailed = Number(s.timesFailed) || 0;
    const lastFailedAt = Number(s.lastFailedAt) || 0;

    const accuracy = timesCompleted > 0 ? (timesClean / timesCompleted) : 0;
    const lowAccuracy = 1 - clamp01(accuracy);

    const failedRecently = lastFailedAt > 0 && (now - lastFailedAt) <= DAY_MS;

    return {
      id,
      timesSeen,
      timesCompleted,
      timesClean,
      timesFailed,
      lastFailedAt,
      failedRecently,
      lowAccuracy
    };
  });

  const unseen = scored.filter((x) => x.timesSeen <= 0).map((x) => x.id);
  if (unseen.length > 0) {
    const pool = unseen.filter((id) => id !== lastLineId);
    const choice = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : unseen[0];
    return choice || null;
  }

  const recentlyFailed = scored
    .filter((x) => x.failedRecently)
    .sort((a, b) => (b.lastFailedAt || 0) - (a.lastFailedAt || 0))
    .map((x) => x.id);

  if (recentlyFailed.length > 0) {
    const pool = recentlyFailed.filter((id) => id !== lastLineId);
    const choice = pool.length > 0 ? pool[0] : recentlyFailed[0];
    return choice || null;
  }

  const pick = weightedPick(scored, (x) => {
    let w = 1;
    w += x.lowAccuracy * 20;
    w += Math.min(10, x.timesFailed) * 3;
    w += 1 / (1 + x.timesSeen);
    if (x.id === lastLineId) w *= 0.05;
    return w;
  });

  return (pick && pick.id) || null;
}
