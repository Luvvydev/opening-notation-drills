// Weighted practice line selection.
// Intentionally UI-agnostic. Expects per-line stats to live in progress via getLineStats().

function clamp01(x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return x;
}

function weightedPick(items, weightFn) {
  let total = 0;
  const weights = items.map((it) => {
    const w = Math.max(0, Number(weightFn(it)) || 0);
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
  const ids = Array.isArray(lineIds) ? lineIds.filter(Boolean) : [];
  if (!openingKey || ids.length === 0) return null;
  const excludes = Array.isArray(excludeLineIds) ? excludeLineIds.map(String).filter(Boolean) : [];
  const canExclude = ids.length > 1 && excludes.length > 0;
  const idsFiltered = canExclude ? ids.filter((id) => !excludes.includes(String(id))) : ids;
  const idsToUse = (idsFiltered && idsFiltered.length) ? idsFiltered : ids;


  // Hard rule: if you failed a line, it is the next line again.
  if (forceRepeatLineId) return forceRepeatLineId;

  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;

  // Build scored buckets using persisted per-line stats.
  const scored = idsToUse.map((id) => {
    const s = getLineStats(progress, openingKey, id);
    const timesSeen = Number(s.timesSeen) || 0;
    const timesCompleted = Number(s.timesCompleted) || 0;
    const timesClean = Number(s.timesClean) || 0;
    const timesFailed = Number(s.timesFailed) || 0;
    const lastFailedAt = Number(s.lastFailedAt) || 0;
    const lastSeenAt = Number(s.lastSeenAt) || 0;

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
      lastSeenAt,
      failedRecently,
      lowAccuracy
    };
  });

  const unseen = scored.filter((x) => x.timesSeen <= 0).map((x) => x.id);
  if (unseen.length > 0) {
    // Unseen lines first: pick one, but do not immediately repeat the last clean line.
    const pool = unseen.filter((id) => id !== lastLineId);
    const choice = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : unseen[0];
    return choice || null;
  }

  const recentlyFailed = scored
    .filter((x) => x.failedRecently && x.timesFailed > 0)
    .sort((a, b) => (b.lastFailedAt || 0) - (a.lastFailedAt || 0))
    .map((x) => x.id);

  if (recentlyFailed.length > 0) {
    // Recent failures next: bias to the most recent, but allow some variety.
    const pool = recentlyFailed.slice(0, Math.min(6, recentlyFailed.length));
    const pick = weightedPick(pool, (_id, idx) => 10 - idx);
    return pick || recentlyFailed[0] || null;
  }

  // Otherwise: weighted by low accuracy and failure count.
  const pick = weightedPick(scored, (x) => {
    let w = 1;

    // Emphasize problem lines (but don't get stuck repeating two lines forever).
    w += x.lowAccuracy * 12;
    w += Math.min(10, x.timesFailed) * 2;

    // Mildly prefer lines you have not done much.
    w += 1 / (1 + x.timesSeen);

    // Avoid immediate repeats after success.
    if (x.id === lastLineId) w *= 0.08;

    // Cooldown: strongly de-prioritize lines seen very recently (unless they were failed recently).
    if (!x.failedRecently && x.lastSeenAt && (now - x.lastSeenAt) < (3 * 60 * 1000)) {
      w *= 0.15;
    }

    return w;
  });

  return (pick && pick.id) || null;
}


// Learn selection uses the same backbone as practice, but slightly favors unseen lines
// and recently failed lines to keep sessions feeling progressive.
export function pickNextLearnLineId(opts) {
  // Reuse the practice picker. Learn's "force repeat" is handled by passing forceRepeatLineId.
  return pickNextPracticeLineId(opts);
}
