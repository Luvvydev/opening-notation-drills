import * as ChessModule from 'chess.js';
import clockReference from './fairPlayClockReference.json';
import { getPositionWinPercentage } from './positionEvaluation';
import { createReviewWorkerHandle, disposeReviewWorkerHandle, sendCommandsToWorker, WASM_ENGINE_PATH } from './stockfishWorker';

const Chess = ChessModule.Chess || ChessModule.default || ChessModule;
const SEARCH_DEPTH = 12;
const VERIFICATION_DEPTH = 16;
const PROFILE_MIN_COMPARABLE = 25;
const PROFILE_RATING_BAND = 250;
const PROFILE_GAME_SCORE_MAX = 34;
const SEARCH_LINES = 3;
const MIN_MOVES = 8;
const MIN_COVERAGE = 0.8;
const REFERENCE_RATING_FLOOR = 1200;
const MISTAKE_LOSS = 1.5;
const ASSISTANCE_RATES = [0.10, 0.35, 0.85];
const PRIOR_ODDS = 1 / 49;

function clockSeconds(comment, tag) {
  const match = new RegExp(`\\[%${tag}\\s+(\\d+(?::\\d{1,2}){0,2}(?:\\.\\d+)?)\\s*\\]`, 'i').exec(comment || '');
  if (!match) return null;
  const parts = match[1].split(':').map(Number);
  const seconds = parts.reduce((total, part) => total * 60 + part, 0);
  return Number.isFinite(seconds) && parts.slice(1).every((part) => part < 60) ? seconds : null;
}

export function readFairPlayClocks(moves, comments, timeControl, headers = {}) {
  const chessCom = [headers.Site, headers.Link].some((tag) =>
    /^(?:https?:\/\/)?(?:[\w-]+\.)?chess\.com(?:\/|$)/i.test(tag || ''));
  const control = /^(\d+)(?:\+(\d+))?$/.exec(timeControl || '');
  const base = control ? Number(control[1]) : null;
  const increment = control ? Number(control[2] || 0) : 0;
  const previous = { w: base, b: base };
  return moves.map(({ afterFen, color }) => {
    const comment = comments.get(afterFen);
    const remaining = clockSeconds(comment, 'clk');
    const timestamp = chessCom ? /\[%timestamp\s+(\d+)\s*\]/i.exec(comment || '') : null;
    const elapsed = clockSeconds(comment, 'emt') ?? (timestamp ? Number(timestamp[1]) / 10 : null);
    const prior = previous[color];
    previous[color] = remaining;
    if (elapsed !== null) return elapsed;
    if (!control || prior === null || remaining === null) return null;
    // Small backwards differences can come from clock rounding or lag compensation.
    const spent = prior + increment - remaining;
    return spent >= -0.2 ? Math.max(0, spent) : null;
  });
}

export function parseFairPlayLines(messages, depth, legalMoves, singleMove = false) {
  const count = Math.min(SEARCH_LINES, legalMoves.size);
  if (count < (singleMove ? 1 : 2)) return null;
  const lines = new Map();
  let bestMove;
  for (const message of messages) {
    const best = /^bestmove (\S+)/.exec(message);
    if (best) bestMove = best[1];
    const info = /^info depth (\d+)\b.*?\bmultipv (\d+)\b.*?\bscore (cp|mate) (-?\d+)(.*?)\bpv (\S+)/.exec(message);
    if (!info || Number(info[1]) !== depth) continue;
    const [, , rank, type, score, fields, uci] = info;
    if (/\b(?:upperbound|lowerbound)\b/.test(fields) || !legalMoves.has(uci)) {
      lines.delete(Number(rank));
    } else {
      lines.set(Number(rank), { uci, [type]: Number(score) });
    }
  }

  const ranked = Array.from({ length: count }, (_, index) => lines.get(index + 1));
  if (ranked.some((line) => !line) || ranked[0].uci !== bestMove ||
      new Set(ranked.map(({ uci }) => uci)).size !== count) return null;
  return ranked;
}

export function getFairPlayMoveEvidence(move, previousMove, lines, playedLine) {
  // Stockfish scores are all from the moving side's perspective at this root.
  if (Number.isFinite(lines[0].mate)) return null;
  const chances = lines.map((line) => getPositionWinPercentage({ lines: [line] }));
  if (chances.some((chance, index) => index > 0 && chance > chances[index - 1])) return null;

  const first = lines[0].uci;
  const strongMoves = lines.filter((_, index) => chances[0] - chances[index] <= MISTAKE_LOSS)
    .map(({ uci }) => uci);
  const matched = move.uci === first;
  // When every searched line is strong, there is no reliable mistake boundary.
  let hasMistakeBoundary = strongMoves.length < lines.length;
  if (playedLine?.uci === move.uci && !strongMoves.includes(move.uci) && !hasMistakeBoundary) {
    const playedChance = getPositionWinPercentage({ lines: [playedLine] });
    const loss = chances[0] - playedChance;
    if (loss >= -MISTAKE_LOSS) {
      if (loss <= MISTAKE_LOSS) strongMoves.push(move.uci);
      else hasMistakeBoundary = true;
    }
  }
  const mistake = hasMistakeBoundary && !strongMoves.includes(move.uci);
  const recapture = Boolean(previousMove?.captured && first.slice(2, 4) === previousMove.to);
  return {
    strongMoves, matched, mistake, hasMistakeBoundary, recapture,
    playedStrong: strongMoves.includes(move.uci),
    gap: chances[0] - chances[1],
  };
}

function median(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

// Lichess centisecond clocks, grouped by speed, length and numerical rating band.
export function getFairPlayRhythmEvidence(times, rating, timeControl, moveCount) {
  const control = /^(\d+)(?:\+(\d+))?$/.exec(timeControl || '');
  if (!control || !Number.isFinite(rating) || rating <= 0 || times.length < 14 ||
      times.length / Math.max(1, moveCount - 2) < 0.9 ||
      !times.some((seconds) => !Number.isInteger(seconds))) return 0;

  const typical = median(times);
  if (typical < 0.5) return 0;
  const estimatedDuration = Number(control[1]) + 40 * Number(control[2] || 0);
  const speed = estimatedDuration < 180 ? 'bullet' : estimatedDuration < 480 ? 'blitz' : 'rapid';
  if (estimatedDuration >= 1500) return 0;
  const length = moveCount < 24 ? 16 : moveCount < 32 ? 24 : moveCount < 48 ? 32 : 48;
  const bucket = Math.min(2800, Math.floor(rating / 400) * 400);
  const prefix = `${speed}:${length}:`;
  const counts = clockReference.cohorts[prefix + bucket]
    || clockReference.cohorts[prefix + (bucket - 400)]
    || clockReference.cohorts[prefix + (bucket + 400)];
  if (!counts) return 0;
  const spread = median(times.map((seconds) => Math.abs(seconds - typical))) / typical;
  const index = Math.min(counts.length - 1, Math.floor(spread / clockReference.binWidth));
  const total = counts.reduce((sum, count) => sum + count, 0);
  const rank = (1 + counts.slice(0, index + 1).reduce((sum, count) => sum + count, 0)) / (total + 1);
  return rank <= 0.1 ? Math.log(Math.min(5, 0.2 / rank)) : 0;
}

export function getFairPlayClockEvidence(entries) {
  const timed = entries.filter(({ seconds }) => Number.isFinite(seconds) && seconds >= 0);
  if (timed.length < 12 || timed.length / entries.length < 0.75) return 0;
  const times = timed.map(({ seconds }) => seconds).sort((a, b) => a - b);
  const typical = median(times);
  if (typical < 1) return 0;
  const slowThreshold = times[Math.floor(times.length * 0.75)];
  const obvious = timed.filter(({ obvious, firstProbability }) => obvious || firstProbability >= 0.65);
  const slow = obvious.filter(({ seconds }) => seconds >= slowThreshold).length;
  // Compare with the player's pace. Only excess slowness is evidence.
  const slowEvidence = obvious.length >= 2 && slowThreshold > typical
    ? Math.max(0, slow * Math.log(0.25 / 0.10) + (obvious.length - slow) * Math.log(0.75 / 0.90)) : 0;
  return Math.min(Math.log(8), slowEvidence);
}

function resultFromEvidence(logEvidence) {
  const score = Math.round(100 / (1 + PRIOR_ODDS * Math.exp(logEvidence)));
  return { score, label: score >= 90 ? 'Clean' : score >= 35 ? 'Watch' : 'Sus' };
}

export function scoreEngineAgreement(entries, engineAvailable, clockEntries = [], rhythmEvidence = 0) {
  if (!engineAvailable) return { label: 'Unavailable' };
  if (entries.length < MIN_MOVES) return { label: 'Few moves' };

  const modeledMoves = entries.filter(({ firstProbability }) => Number.isFinite(firstProbability)).length;
  const hasModel = modeledMoves >= MIN_MOVES && modeledMoves / entries.length >= MIN_COVERAGE;
  const logModes = ASSISTANCE_RATES.map(() => 0);
  const reviewMoves = [];
  for (const entry of entries) {
    const { matched, mistake, gap, recapture, hasMistakeBoundary, firstProbability, strongProbability,
      playedProbability, playedStrong, strongMoves } = entry;
    if (playedStrong === false && !mistake) continue;
    const known = hasModel && Number.isFinite(firstProbability);
    // The engine-only comparison is deliberately weak and ignores obvious replies.
    if (!known && (recapture || gap >= 12)) continue;
    const humanFirst = known ? Math.max(0.025, Math.min(0.98, firstProbability)) : gap < 2 ? 0.45 : 0.55;
    const humanMistake = hasMistakeBoundary
      ? known ? Math.max(0.025, 1 - strongProbability) : 0.35 : 0;
    const humanNear = Math.max(0.025, 1 - humanFirst - humanMistake);
    const assistedFirst = Math.max(0.72, humanFirst);
    const assistedMistake = hasMistakeBoundary ? Math.min(0.06, humanMistake) : 0;
    const assistedNear = Math.max(0, 1 - assistedFirst - assistedMistake);
    // Give each measured strong alternative an equal share of the assisted near-match rate.
    const nearRatio = known && Number.isFinite(playedProbability) && !matched
      ? assistedNear / Math.max(1, strongMoves.length - 1) / Math.max(0.025, playedProbability)
      : assistedNear / humanNear;
    const ratio = matched ? assistedFirst / humanFirst
      : mistake ? assistedMistake / humanMistake : nearRatio;
    const limited = Math.max(known ? 0.12 : 0.65, Math.min(known ? 20 : 1.25, ratio));
    if (known && limited > 1 && playedStrong && playedProbability <= 0.10 && entry.move) {
      reviewMoves.push({
        ply: entry.move.ply, san: entry.move.san,
        chance: Math.round(playedProbability * 100), ratio: limited,
      });
    }
    ASSISTANCE_RATES.forEach((rate, index) => {
      logModes[index] += Math.log1p(rate * (limited - 1));
    });
  }
  const maxLog = Math.max(...logModes);
  const moveEvidence = maxLog + Math.log(logModes.reduce((sum, log) =>
    sum + Math.exp(log - maxLog), 0) / logModes.length);
  const clockEvidence = Math.min(Math.log(8), getFairPlayClockEvidence(clockEntries) + rhythmEvidence);
  const logEvidence = Math.max(-8, Math.min(12, moveEvidence + clockEvidence));
  return {
    ...resultFromEvidence(logEvidence),
    logEvidence,
    basis: hasModel ? 'combined' : 'stockfish',
    usableMoves: entries.length,
    clockEvidence: Math.abs(clockEvidence) > 0.001,
    reviewMoves: reviewMoves.sort((a, b) => b.ratio - a.ratio || a.chance - b.chance || a.ply - b.ply)
      .slice(0, 3).map(({ ply, san, chance }) => ({ ply, san, chance })),
  };
}

export const FAIR_PLAY_PROFILE_GAME_LIMIT = 250;
const FAIR_PLAY_PROFILE_MIN_GAMES = 5;
const FAIR_PLAY_PROFILE_MAX_WEIGHT = 10;

export const FAIR_PLAY_HISTORY_KEY = 'chessdrills.fairPlayEvidence.v2';

export function saveFairPlayEvidence(storage, game, result) {
  if (!game?.rated) return false;
  try {
    const local = storage || window.localStorage;
    const key = `${game.sourceType}:${game.id}`;
    const all = JSON.parse(local.getItem(FAIR_PLAY_HISTORY_KEY) || '{}') || {};
    const sides = Object.fromEntries(['white', 'black'].flatMap((side) => {
      const evidence = result[side];
      if (!Number.isFinite(evidence?.logEvidence)) return [];
      const entries = [[side, evidence.logEvidence]];
      if (Array.isArray(evidence.reviewMoves)) {
        entries.push([`${side}Moves`, evidence.reviewMoves]);
        if (JSON.stringify(evidence.reviewMoves) !== JSON.stringify(all[key]?.[`${side}Moves`])) {
          entries.push([`${side}Depth`, null]);
        }
      }
      if (typeof evidence.clockEvidence === 'boolean') entries.push([`${side}Clock`, evidence.clockEvidence]);
      return entries;
    }));
    if (!Object.keys(sides).length) return false;
    const previous = all[key];
    delete all[key];
    all[key] = { ...previous, ...sides };
    local.setItem(FAIR_PLAY_HISTORY_KEY, JSON.stringify(Object.fromEntries(Object.entries(all).slice(-500))));
    return true;
  } catch (_) {
    // Storage access is optional, including in private browsing.
    return false;
  }
}

function getFairPlayGames(storage, games, username) {
  const player = username.trim().toLowerCase();
  if (!player) return [];
  let history;
  try {
    const local = storage || window.localStorage;
    history = JSON.parse(local.getItem(FAIR_PLAY_HISTORY_KEY) || '{}') || {};
  } catch (_) {
    history = {};
  }
  const seen = new Set();
  return games.flatMap((game) => {
    const key = `${game.sourceType}:${game.id}`;
    if (!game.rated || seen.has(key)) return [];
    seen.add(key);
    const side = ['white', 'black'].find((color) => game[color]?.name?.toLowerCase() === player);
    if (!side) return [];
    const minimumPlies = MIN_MOVES * 2 - Number(side === 'white');
    if (game.movesNb > 0 && game.movesNb < minimumPlies) return [];
    return [{
      game, side, log: history[key]?.[side],
      reviewMoves: history[key]?.[`${side}Moves`],
      clockEvidence: history[key]?.[`${side}Clock`] === true,
      depthCheck: history[key]?.[`${side}Depth`],
    }];
  });
}

const PROFILE_GAMES_KEY = 'chessdrills.fairPlayProfileGames.v1';

export function readFairPlayProfileGames(profileKey) {
  try {
    const games = JSON.parse(window.localStorage.getItem(PROFILE_GAMES_KEY) || '{}')?.[profileKey];
    return Array.isArray(games) ? games : null;
  } catch (_) {
    return null;
  }
}

export function saveFairPlayProfileGames(profileKey, games, username) {
  const stable = getFairPlayGames(null, games, username).slice(0, FAIR_PLAY_PROFILE_GAME_LIMIT).map(({ game }) => {
    const { id, sourceType, rated, movesNb, url, date, speedClass, white, black } = game;
    return { id, sourceType, rated, movesNb, url, date, speedClass,
      white: { name: white?.name, rating: white?.rating }, black: { name: black?.name, rating: black?.rating } };
  });
  try {
    const entries = JSON.parse(window.localStorage.getItem(PROFILE_GAMES_KEY) || '{}') || {};
    delete entries[profileKey];
    entries[profileKey] = stable;
    window.localStorage.setItem(PROFILE_GAMES_KEY, JSON.stringify(Object.fromEntries(Object.entries(entries).slice(-5))));
  } catch (_) {
    // The current scan still works when storage is unavailable.
  }
  return stable;
}

export function getFairPlayReviewQueue(storage, games, username) {
  const recent = getFairPlayGames(storage, games, username).slice(0, FAIR_PLAY_PROFILE_GAME_LIMIT);
  return recent.length < FAIR_PLAY_PROFILE_MIN_GAMES ? [] : recent.filter(({ log }) => !Number.isFinite(log)).map(({ game }) => game);
}

export function getFairPlayHistory(storage, games, username) {
  const logs = [];
  let pending = 0;
  for (const { log } of getFairPlayGames(storage, games, username).slice(0, FAIR_PLAY_PROFILE_GAME_LIMIT)) {
    if (!Number.isFinite(log)) {
      if (!logs.length) pending += 1;
      continue;
    }
    logs.push(log);
  }
  if (!logs.length) return null;
  // Games by the same player are correlated. Use the full window without
  // increasing score certainty solely because more games were available.
  const weight = Math.min(1, FAIR_PLAY_PROFILE_MAX_WEIGHT / logs.length);
  const result = logs.length >= FAIR_PLAY_PROFILE_MIN_GAMES
    ? resultFromEvidence(weight * logs.reduce((sum, log) => sum + log, 0))
    : { label: 'Few games' };
  return { ...result, games: logs.length, pending };
}

function getComparableProfileGames(reviewed) {
  const cohorts = new Map();
  for (const entry of reviewed) {
    const { game, side } = entry;
    const rating = Number(game[side]?.rating);
    if (!['ultrabullet', 'bullet', 'blitz', 'rapid', 'classical'].includes(game.speedClass?.toLowerCase()) ||
        !Number.isFinite(rating) || rating <= 0) continue;
    const key = `${game.sourceType}:${game.speedClass.toLowerCase()}:${Math.floor(rating / PROFILE_RATING_BAND)}`;
    if (!cohorts.has(key)) cohorts.set(key, []);
    cohorts.get(key).push(entry);
  }
  return [...cohorts.values()].sort((a, b) => b.length - a.length)[0] || [];
}

export function getFairPlayProfileScreening(storage, games, username) {
  const window = getFairPlayGames(storage, games, username).slice(0, FAIR_PLAY_PROFILE_GAME_LIMIT);
  const reviewed = window.filter(({ log }) => Number.isFinite(log));
  const comparable = getComparableProfileGames(reviewed);
  const required = window.length <= 50 ? 2 : window.length <= 150 ? 3 : 4;
  const strongGames = comparable.filter(({ log }) => resultFromEvidence(log).score <= PROFILE_GAME_SCORE_MAX);
  const candidates = strongGames.filter(({ reviewMoves }) => Array.isArray(reviewMoves) && reviewMoves.length > 0)
    .sort((a, b) => b.log - a.log);
  const opponents = new Set(candidates.filter(({ depthCheck }) =>
    depthCheck?.depth === VERIFICATION_DEPTH && depthCheck.plies?.length > 0)
    .map(({ game, side }) => game[side === 'white' ? 'black' : 'white']?.name?.trim().toLowerCase())
    .filter(Boolean));
  const enough = comparable.length >= PROFILE_MIN_COMPARABLE && reviewed.length >= window.length * 0.8;
  const candidatesToCheck = enough && opponents.size < required
    ? candidates.filter(({ depthCheck, game }) => depthCheck?.depth !== VERIFICATION_DEPTH && game.pgn).slice(0, 6)
    : [];
  const needsCheck = candidates.some(({ depthCheck }) => depthCheck?.depth !== VERIFICATION_DEPTH)
    || strongGames.some(({ reviewMoves }) => !Array.isArray(reviewMoves));
  const label = !enough ? 'Too little data'
    : opponents.size >= required ? 'Worth reviewing'
      : needsCheck ? 'Review check pending' : 'No strong signal found';
  return { label, reviewed: reviewed.length, total: window.length, comparable: comparable.length,
    confirmed: opponents.size, candidatesToCheck };
}

export async function verifyFairPlayReviewMoves(game, side, candidates, signal) {
  const handle = await createReviewWorkerHandle(WASM_ENGINE_PATH, SEARCH_LINES, signal);
  const stop = () => disposeReviewWorkerHandle(handle);
  signal.addEventListener('abort', stop, { once: true });
  try {
    const plies = [];
    let checked = 0;
    const color = side === 'white' ? 'w' : 'b';
    const selected = new Set(candidates.slice(0, 3).map(({ ply }) => ply));
    for (const { move, previousMove, legalMoves } of eligibleMoves(game, color)) {
      if (signal.aborted) return null;
      if (!selected.has(move.ply)) continue;
      await sendCommandsToWorker(handle, ['ucinewgame', 'isready'], 'readyok', null, 10000);
      const messages = await sendCommandsToWorker(handle, [
        `position fen ${move.beforeFen}`,
        `go depth ${VERIFICATION_DEPTH}`,
      ], 'bestmove', null, 45000);
      const lines = parseFairPlayLines(messages, VERIFICATION_DEPTH, legalMoves);
      if (!lines) continue;
      checked += 1;
      if (getFairPlayMoveEvidence(move, previousMove, lines)?.playedStrong) plies.push(move.ply);
    }
    return checked === selected.size && checked > 0 ? { depth: VERIFICATION_DEPTH, plies } : null;
  } finally {
    signal.removeEventListener('abort', stop);
    stop();
  }
}

export function saveFairPlayDepthCheck(storage, game, side, moves, verification) {
  if (!verification || !['white', 'black'].includes(side)) return false;
  try {
    const local = storage || window.localStorage;
    const key = `${game.sourceType}:${game.id}`;
    const all = JSON.parse(local.getItem(FAIR_PLAY_HISTORY_KEY) || '{}') || {};
    const evidence = all[key];
    if (!evidence || JSON.stringify(evidence[`${side}Moves`]) !== JSON.stringify(moves)) return false;
    evidence[`${side}Depth`] = verification;
    local.setItem(FAIR_PLAY_HISTORY_KEY, JSON.stringify(all));
    return true;
  } catch (_) {
    return false;
  }
}

export function getFairPlayReviewHighlights(storage, games, username, limit = 3) {
  return getFairPlayGames(storage, games, username).slice(0, FAIR_PLAY_PROFILE_GAME_LIMIT)
    .filter(({ log }) => Number.isFinite(log) && log > 0)
    .sort((a, b) => b.log - a.log)
    .slice(0, limit)
    .map(({ game, side, log, reviewMoves, clockEvidence, depthCheck }) => ({
      game, opponent: game[side === 'white' ? 'black' : 'white']?.name,
      score: resultFromEvidence(log).score,
      hasMoveDetails: Array.isArray(reviewMoves),
      clockEvidence,
      depthCheck,
      moves: Array.isArray(reviewMoves) ? reviewMoves.slice(0, 3) : [],
    }));
}

function eligibleMoves(game, targetColor) {
  return game.moves.flatMap((move, index) => {
    if ((targetColor && move.color !== targetColor) || move.inBook || move.san.endsWith('#')) return [];
    const legalMoves = new Set(new Chess(move.beforeFen).moves({ verbose: true })
      .map(({ from, to, promotion }) => from + to + (promotion || '')));
    return legalMoves.size > 1 ? [{ move, previousMove: game.moves[index - 1], legalMoves }] : [];
  });
}

async function analyzeEngineMoves(queue, sides, signal) {
  const handle = await createReviewWorkerHandle(WASM_ENGINE_PATH, SEARCH_LINES, signal);
  const stop = () => disposeReviewWorkerHandle(handle);
  signal.addEventListener('abort', stop, { once: true });
  try {
    for (const { move, previousMove, legalMoves } of queue) {
      if (signal.aborted) return;
      const side = sides[move.color];
      // Pool scheduling and a previous search's hash must not affect the result.
      await sendCommandsToWorker(handle, ['ucinewgame', 'isready'], 'readyok', null, 10000);
      const messages = await sendCommandsToWorker(handle, [
        `position fen ${move.beforeFen}`,
        `go depth ${SEARCH_DEPTH}`,
      ], 'bestmove', null, 45000);
      const lines = parseFairPlayLines(messages, SEARCH_DEPTH, legalMoves);
      if (!lines) continue;
      side.completed += 1;
      let evidence = getFairPlayMoveEvidence(move, previousMove, lines);
      if (evidence && !evidence.playedStrong && !evidence.hasMistakeBoundary) {
        const playedMessages = await sendCommandsToWorker(handle, [
          `position fen ${move.beforeFen}`,
          `go depth ${SEARCH_DEPTH} searchmoves ${move.uci}`,
        ], 'bestmove', null, 45000);
        const playedLines = parseFairPlayLines(playedMessages, SEARCH_DEPTH, new Set([move.uci]), true);
        if (playedLines) evidence = getFairPlayMoveEvidence(move, previousMove, lines, playedLines[0]);
      }
      if (evidence) side.items.push({ move, evidence });
    }
  } finally {
    signal.removeEventListener('abort', stop);
    stop();
  }
}

function readHumanPrediction(worker, request, signal) {
  return new Promise((resolve, reject) => {
    const finish = (error, moves) => {
      window.clearTimeout(timer);
      signal.removeEventListener('abort', cancel);
      worker.onmessage = null;
      worker.onerror = null;
      if (error) reject(error);
      else resolve(moves);
    };
    const cancel = () => finish(new Error('Maia analysis stopped'));
    const timer = window.setTimeout(cancel, 60000);
    worker.onerror = cancel;
    worker.onmessage = ({ data }) => {
      if (data?.id !== request.id) return;
      if (data.failed || !Array.isArray(data.moves)) cancel();
      else finish(null, data.moves);
    };
    if (signal.aborted) {
      cancel();
      return;
    }
    signal.addEventListener('abort', cancel, { once: true });
    try {
      worker.postMessage(request);
    } catch (error) {
      finish(error);
    }
  });
}

async function analyzeHumanMoves(queue, game, ratings, signal, batchModel) {
  if (!queue.length || signal.aborted) return;
  if (batchModel?.failed) return;
  const worker = batchModel?.worker || new window.Worker('/engines/human-model/worker.js', { type: 'module' });
  if (batchModel) batchModel.worker = worker;
  try {
    for (const { move, evidence } of queue) {
      const predictions = new Map(await readHumanPrediction(worker, {
        id: move.ply,
        fen: move.beforeFen,
        priorFens: game.positions.slice(Math.max(0, move.ply - 8), move.ply - 1).map(({ fen }) => fen),
        selfElo: ratings[move.color],
        oppoElo: ratings[move.color === 'w' ? 'b' : 'w'],
      }, signal));
      const probabilities = evidence.strongMoves.map((uci) => predictions.get(uci));
      if (probabilities.every((p) => Number.isFinite(p) && p >= 0 && p <= 1)) {
        const total = probabilities.reduce((sum, p) => sum + p, 0);
        if (total <= 1.000001) {
          evidence.firstProbability = probabilities[0];
          evidence.strongProbability = Math.min(1, total);
          if (evidence.playedStrong) evidence.playedProbability = predictions.get(move.uci);
        }
      }
    }
  } catch (error) {
    if (batchModel) batchModel.failed = true;
    throw error;
  } finally {
    if (!batchModel) worker.terminate();
  }
}

export function createFairPlayBatchAnalyzer() {
  const model = { worker: null, failed: false };
  return {
    run(game, players, onResult, side) {
      return runFairPlayIndicator(game, players, onResult, side, model);
    },
    dispose() {
      if (model.worker) model.worker.terminate();
      model.worker = null;
    },
  };
}

export function runFairPlayIndicator(game, players, onResult, targetSide, batchModel) {
  const controller = new AbortController();
  const { signal } = controller;
  const sides = {
    w: { requested: 0, completed: 0, items: [] },
    b: { requested: 0, completed: 0, items: [] },
  };
  const referenceRating = (rating) => {
    const number = Number(rating);
    return Number.isFinite(number) && number > 0 ? Math.max(REFERENCE_RATING_FLOOR, number) : null;
  };
  const ratings = { w: referenceRating(players.white.rating), b: referenceRating(players.black.rating) };
  const hasEngineCoverage = (side) => side.requested < MIN_MOVES || side.completed / side.requested >= MIN_COVERAGE;
  const summarize = (color) => {
    const side = sides[color];
    const byPly = new Map(side.items.map(({ move, evidence }) => [move.ply, evidence]));
    const moves = game.moves.filter((move) => move.color === color);
    const clocks = moves.filter((move) => !move.inBook).map((move) => ({
      seconds: move.fairPlaySeconds,
      obvious: move.san.endsWith('#') || byPly.get(move.ply)?.recapture,
      firstProbability: byPly.get(move.ply)?.firstProbability,
    }));
    const rhythmTimes = moves.slice(2).map(({ fairPlaySeconds }) => fairPlaySeconds)
      .filter((seconds) => Number.isFinite(seconds) && seconds >= 0);
    const rhythm = getFairPlayRhythmEvidence(rhythmTimes, Number(players[color === 'w' ? 'white' : 'black'].rating),
      game.headers.TimeControl, moves.length);
    return scoreEngineAgreement(side.items.map(({ move, evidence }) => ({ ...evidence, move })), hasEngineCoverage(side), clocks, rhythm);
  };

  const analyze = async () => {
    if (signal.aborted) return;
    try {
      const targetColor = targetSide === 'white' ? 'w' : targetSide === 'black' ? 'b' : null;
      const queue = eligibleMoves(game, targetColor);
      queue.forEach(({ move }) => { sides[move.color].requested += 1; });
      const eligible = queue.filter(({ move }) => sides[move.color].requested >= MIN_MOVES);
      if (eligible.length) await analyzeEngineMoves(eligible, sides, signal);
      if (ratings.w && ratings.b && !signal.aborted) {
        const modeledQueue = Object.values(sides)
          .filter((side) => hasEngineCoverage(side) && side.items.length >= MIN_MOVES)
          .flatMap(({ items }) => items);
        await analyzeHumanMoves(modeledQueue, game, ratings, signal, batchModel);
      }
    } catch (_) {
      // Preserve any usable evidence and report the actual coverage after a worker failure.
    }
    if (!signal.aborted) {
      const report = {};
      if (targetSide !== 'black') report.white = summarize('w');
      if (targetSide !== 'white') report.black = summarize('b');
      onResult(report);
    }
  };
  Promise.resolve().then(analyze);
  return () => controller.abort();
}
