import { getPositionWinPercentage } from './positionEvaluation';

const MIN_MOVES = 8;
const MIN_SUS_MOVES = 12;
const MIN_RATING = 600;

function labelForScore(score) {
  if (score >= 90) return 'Clean';
  if (score >= 50) return 'Watch';
  return 'Sus';
}

function clockSeconds(comment, tag) {
  const match = new RegExp(`\\[%${tag}\\s+(\\d+(?::\\d{1,2}){0,2}(?:\\.\\d+)?)\\s*\\]`, 'i').exec(comment || '');
  if (!match) return null;
  const parts = match[1].split(':').map(Number);
  const seconds = parts.reduce((total, part) => total * 60 + part, 0);
  return Number.isFinite(seconds) && parts.slice(1).every((part) => part < 60) ? seconds : null;
}

export function readFairPlayClocks(moves, comments, timeControl) {
  const control = /^(\d+)(?:\+(\d+))?$/.exec(timeControl || '');
  const base = control ? Number(control[1]) : null;
  const increment = control ? Number(control[2] || 0) : 0;
  const previous = { w: base, b: base };
  return moves.map(({ afterFen, color }) => {
    const comment = comments.get(afterFen);
    const remaining = clockSeconds(comment, 'clk');
    const elapsed = clockSeconds(comment, 'emt');
    const prior = previous[color];
    previous[color] = remaining;
    if (elapsed !== null) return elapsed;
    if (!control || prior === null || remaining === null) return null;
    // Small backwards differences can come from clock rounding or lag compensation.
    const spent = prior + increment - remaining;
    return spent >= -0.2 ? Math.max(0, spent) : null;
  });
}

function hasEvaluation(line) {
  return Boolean(line && (Number.isFinite(line.cp) || Number.isFinite(line.mate)));
}

function moveEvidence(move, previousMove) {
  const before = move.evaluationBefore;
  const after = move.evaluationAfter;
  const [best, alternative] = before.lines || [];
  const mover = move.color === 'w' ? 1 : -1;
  const bestChance = getPositionWinPercentage(before);
  const playedBest = move.uci === before.bestMove;
  const loss = !playedBest && hasEvaluation(best) && hasEvaluation(after?.lines?.[0])
    ? Math.max(0, mover * (bestChance - getPositionWinPercentage(after))) : 0;
  const recapture = move.captured && previousMove?.captured && previousMove.to === move.to;
  const gap = hasEvaluation(best) && hasEvaluation(alternative) && best.depth === alternative.depth
    ? Math.max(0, mover * (bestChance - getPositionWinPercentage({ lines: [alternative] }))) : null;
  const candidates = (before.lines || [])
    .filter((line) => line.depth === best?.depth && line.firstMove && hasEvaluation(line))
    .map((line) => ({
      uci: line.firstMove,
      loss: Math.max(0, mover * (bestChance - getPositionWinPercentage({ lines: [line] }))),
    }));
  return { playedBest, loss, gap, recapture, candidates, ply: move.ply, seconds: move.fairPlaySeconds };
}

function humanMoveEvidence(entry, move, probabilities) {
  const playedProbability = probabilities.get(move.uci);
  const candidates = entry.candidates || [];
  if (candidates.length < 2 || candidates[0].uci !== move.evaluationBefore.bestMove ||
      !Number.isFinite(playedProbability) || candidates.some(({ uci }) => !probabilities.has(uci))) return null;

  let covered = 0;
  let expectedLoss = 0;
  for (const { uci, loss } of candidates) {
    const probability = probabilities.get(uci);
    covered += probability;
    expectedLoss += probability * loss;
  }
  // Approximate unsearched choices with the loss of the last ranked engine line.
  // This avoids assuming that every unsearched alternative is a blunder.
  expectedLoss += Math.max(0, 1 - covered) * candidates[candidates.length - 1].loss;
  const played = candidates.find(({ uci }) => uci === move.uci);
  const gain = played ? Math.max(0, expectedLoss - played.loss) : 0;
  return { expectedLoss, playedProbability, gain };
}

function median(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function clockPenalty(entries, probabilityByEntry) {
  const timed = entries.filter(({ seconds }) => Number.isFinite(seconds) && seconds >= 0);
  if (timed.length < 12 || timed.length / entries.length < 0.75) return 0;

  const typical = median(timed.map(({ seconds }) => seconds));
  // Very short moves are vulnerable to premoves, coarse clocks and lag.
  if (typical < 2) return 0;
  const spread = median(timed.map(({ seconds }) => Math.abs(seconds - typical)));
  const steady = spread / typical <= 0.15 ? 2 : 0;
  const sorted = timed.map(({ seconds }) => seconds).sort((a, b) => a - b);
  const slowThreshold = Math.max(4, sorted[Math.floor(sorted.length * 0.75)]);
  const easyMoves = timed.filter((entry) => probabilityByEntry.get(entry) >= 0.65);
  const slowEasyMoves = easyMoves.filter(({ seconds }) => seconds >= slowThreshold).length;
  const slowOnObvious = slowThreshold > typical && easyMoves.length >= 6 && slowEasyMoves >= 3 &&
    slowEasyMoves / easyMoves.length >= 0.5 ? 2 : 0;
  return Math.min(3, steady + slowOnObvious);
}

function hasEngineMatchRun(entries, probabilityByEntry, humanByEntry) {
  for (let start = 0; start < entries.length; start += 1) {
    // Eight turns for this side, including any excluded or unmodeled moves.
    const lastPly = entries[start].ply + 14;
    let matches = 0;
    let unlikelyMatches = 0;
    for (let index = start; index < entries.length && entries[index].ply <= lastPly; index += 1) {
      const entry = entries[index];
      if (!entry.playedBest || !probabilityByEntry.has(entry)) continue;
      matches += 1;
      const human = humanByEntry.get(entry);
      const unlikely = human ? human.gain >= 3 && human.playedProbability < 0.15
        : entry.gap !== null && entry.gap >= 2 && probabilityByEntry.get(entry) < 0.15;
      if (!entry.recapture && unlikely) {
        unlikelyMatches += 1;
      }
      if (matches >= 4 && unlikelyMatches >= 2) return true;
    }
  }
  return false;
}

export function scoreEngineAgreement(entries, probabilityByEntry = new Map(), humanByEntry = new Map()) {
  if (entries.length < MIN_MOVES) return { label: 'Few moves' };
  let matches = 0;
  let criticalMatches = 0;
  let costlyMoves = 0;
  let observed = 0;
  let expected = 0;
  let variance = 0;
  let modelMoves = 0;
  let rareMatches = 0;
  let rareMoveEvidence = 0;
  let commonAlternatives = 0;

  for (const entry of entries) {
    const { playedBest, loss, gap, recapture } = entry;
    const critical = !recapture && gap !== null && gap >= 12;
    if (playedBest) matches += 1;
    if (playedBest && critical) criticalMatches += 1;
    if (loss >= 10) costlyMoves += 1;

    const probability = probabilityByEntry.get(entry);
    if (probability === undefined) continue;
    modelMoves += 1;
    // Maia supplies human likelihood. Stockfish supplies the cost of an alternative.
    const baseWeight = probability >= 0.75 || recapture ? 0.5 : critical ? 1.25 : 1;
    const human = humanByEntry.get(entry);
    if (!playedBest && !recapture && human && human.playedProbability >= 0.2 &&
        human.playedProbability > probability) {
      commonAlternatives += 1;
    }
    // A narrow gap can still hide a difficult position if common human choices lose ground.
    const nearTieWeight = human ? Math.min(1, 0.5 + human.expectedLoss / 8) : 0.25;
    const weight = gap !== null && gap < 5 ? baseWeight * nearTieWeight : baseWeight;
    observed += weight * Number(playedBest);
    expected += weight * probability;
    variance += weight * weight * probability * (1 - probability);
    if (playedBest && !recapture && probability < 0.05) rareMatches += 1;
    if (!recapture && human && human.playedProbability < 0.15 && human.gain >= 1.5) {
      // A single rare strong move should move the bar without creating a Watch on its own.
      rareMoveEvidence += Math.min(8, human.gain * Math.log10(1 / Math.max(0.001, human.playedProbability)));
    }
  }

  const matchRate = matches / entries.length;
  const enginePressure = Math.max(0, matchRate - 0.6) * Math.min(1, criticalMatches / 5);
  const enginePenalty = 125 * enginePressure;
  const hasMaia = modelMoves >= MIN_MOVES && modelMoves / entries.length >= 0.8;
  const excess = hasMaia ? Math.max(0, (observed - expected) / Math.sqrt(Math.max(4, variance))) : 0;
  const modelPenalty = 15 * Math.max(0, excess - 1);
  const suspicious = hasMaia
    ? modelMoves >= MIN_SUS_MOVES && excess >= 4 && rareMatches >= 4
    : entries.length >= 20 && matchRate >= 0.9 && criticalMatches >= 5 && costlyMoves <= 1;
  const movePenalty = hasMaia ? Math.max(modelPenalty * 0.8 + enginePenalty * 0.2, rareMoveEvidence) : enginePenalty;
  const timePenalty = hasMaia ? clockPenalty(entries, probabilityByEntry) : 0;
  const moveEstimate = Math.round(100 - movePenalty);
  const estimate = Math.max(moveEstimate >= 90 ? 90 : 0, Math.round(100 - movePenalty - timePenalty));
  // Clock patterns can refine the bar but may not trigger a Sus label.
  let score = suspicious ? Math.min(49, Math.max(0, estimate)) : Math.max(50, estimate);
  if (score >= 90 && hasMaia && hasEngineMatchRun(entries, probabilityByEntry, humanByEntry)) score = 89;
  // Common human alternatives can offset mild move evidence. They cannot clear a flag.
  if (score >= 90 && hasMaia && commonAlternatives >= 2) {
    const coverage = Math.min(1, (6 * commonAlternatives) / modelMoves);
    score += Math.min(100 - score, Math.round(Math.min(movePenalty, 10) * coverage * 0.5));
  }
  return { score, label: labelForScore(score), basis: hasMaia ? 'combined' : 'stockfish', usedClocks: estimate < moveEstimate };
}

export function runFairPlayIndicator(game, players, onResult) {
  const items = { w: [], b: [] };
  const ratings = { w: Number(players.white.rating), b: Number(players.black.rating) };
  game.moves.forEach((move, index) => {
    const best = move.evaluationBefore?.bestMove;
    if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(best || '') ||
        move.inBook || move.classification === 'forced' || move.san.endsWith('#')) return;
    items[move.color].push({ move, evidence: moveEvidence(move, game.moves[index - 1]) });
  });

  const probabilities = new Map();
  const humanEvidence = new Map();
  const evidence = { w: items.w.map((entry) => entry.evidence), b: items.b.map((entry) => entry.evidence) };
  const report = () => ({
    white: scoreEngineAgreement(evidence.w, probabilities, humanEvidence),
    black: scoreEngineAgreement(evidence.b, probabilities, humanEvidence),
  });
  const fallback = report();
  onResult(fallback);

  const queue = ['w', 'b'].flatMap((color) =>
    items[color].length >= MIN_MOVES && Number.isFinite(ratings[color]) && ratings[color] > 0 ? items[color] : []);
  if (!queue.length) return undefined;

  let worker;
  try {
    worker = new window.Worker('/engines/human-model/worker.js', { type: 'module' });
  } catch (_) {
    return undefined;
  }

  let index = 0;
  let timer;
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    window.clearTimeout(timer);
    worker.terminate();
  };
  const next = () => {
    const item = queue[index];
    if (!item) {
      stop();
      onResult(report());
      return;
    }
    const { move } = item;
    const selfElo = Math.max(MIN_RATING, ratings[move.color]);
    const otherRating = ratings[move.color === 'w' ? 'b' : 'w'];
    const oppoElo = Number.isFinite(otherRating) && otherRating > 0 ? Math.max(MIN_RATING, otherRating) : selfElo;
    timer = window.setTimeout(stop, 60000);
    try {
      worker.postMessage({
        id: index,
        fen: move.beforeFen,
        priorFens: game.positions.slice(Math.max(0, move.ply - 8), move.ply - 1).map(({ fen }) => fen),
        selfElo,
        oppoElo,
      });
    } catch (_) {
      stop();
    }
  };
  worker.onerror = stop;
  worker.onmessage = ({ data }) => {
    if (stopped || data.id !== index) return;
    window.clearTimeout(timer);
    const { move, evidence: entry } = queue[index];
    if (data.failed || !Array.isArray(data.moves)) {
      stop();
      return;
    }
    const best = move.evaluationBefore.bestMove;
    const predictions = new Map(data.moves.filter(([, p]) => Number.isFinite(p) && p >= 0 && p <= 1));
    if (predictions.has(best)) {
      probabilities.set(entry, predictions.get(best));
      const human = humanMoveEvidence(entry, move, predictions);
      if (human) humanEvidence.set(entry, human);
    }
    index += 1;
    next();
  };
  next();
  return stop;
}
