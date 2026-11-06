import * as ChessModule from 'chess.js';

const Chess = ChessModule.Chess || ChessModule.default || ChessModule;

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function uciToMoveObject(uci) {
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.slice(4, 5) || undefined,
  };
}

function formatUciPv(fen, uciMoves) {
  const game = new Chess(fen);
  const sanMoves = [];

  for (let i = 0; i < uciMoves.length; i += 1) {
    const uciMove = uciMoves[i];
    try {
      const move = game.move(uciToMoveObject(uciMove));
      if (!move) break;
      sanMoves.push(move.san);
    } catch (_) {
      break;
    }
  }

  return sanMoves;
}

export function getResultProperty(result, property) {
  const parts = String(result || '').split(' ');
  const index = parts.indexOf(property);
  if (index === -1 || index + 1 >= parts.length) return undefined;
  return parts[index + 1];
}

function getResultPv(result) {
  const parts = String(result || '').split(' ');
  const pvIndex = parts.indexOf('pv');
  if (pvIndex === -1 || pvIndex + 1 >= parts.length) return undefined;
  return parts.slice(pvIndex + 1);
}

function sortLines(a, b) {
  if (typeof a.mate === 'number' && typeof b.mate === 'number') {
    if (a.mate > 0 && b.mate < 0) return -1;
    if (a.mate < 0 && b.mate > 0) return 1;
    return a.mate - b.mate;
  }

  if (typeof a.mate === 'number') return -a.mate;
  if (typeof b.mate === 'number') return b.mate;
  return (b.cp || 0) - (a.cp || 0);
}

export function parseEvaluationResults(results, fen) {
  const parsed = { lines: [] };
  const temp = {};

  results.forEach((result) => {
    const text = String(result || '');

    if (text.startsWith('bestmove')) {
      const bestMove = getResultProperty(text, 'bestmove');
      if (bestMove) parsed.bestMove = bestMove;
    }

    if (!text.startsWith('info')) return;

    const depth = parseInt(getResultProperty(text, 'depth') || '', 10);
    const multiPv = parseInt(getResultProperty(text, 'multipv') || '1', 10);
    const pv = getResultPv(text);
    if (!pv || Number.isNaN(depth) || Number.isNaN(multiPv)) return;

    const current = temp[multiPv];
    if (current && depth < current.depth) return;

    const cpRaw = getResultProperty(text, 'cp');
    const mateRaw = getResultProperty(text, 'mate');

    temp[multiPv] = {
      depth,
      multiPv,
      pv,
      cp: cpRaw !== undefined ? parseInt(cpRaw, 10) : undefined,
      mate: mateRaw !== undefined ? parseInt(mateRaw, 10) : undefined,
    };
  });

  // Earlier search depths are discarded. Only replay the final lines on a chess board.
  parsed.lines = Object.values(temp).sort(sortLines).map((line) => ({
    ...line,
    pv: formatUciPv(fen, line.pv),
  }));

  const whiteToPlay = String(fen || '').split(' ')[1] === 'w';
  if (!whiteToPlay) {
    parsed.lines = parsed.lines.map((line) => ({
      ...line,
      cp: typeof line.cp === 'number' ? -line.cp : line.cp,
      mate: typeof line.mate === 'number' ? -line.mate : line.mate,
    }));
  }

  return parsed;
}

export function getPositionLabel(position) {
  const line = position && position.lines && position.lines[0];
  if (!line) return '...';
  if (typeof line.mate === 'number') return `M${Math.abs(line.mate)}`;
  const cp = typeof line.cp === 'number' ? line.cp : 0;
  const value = Math.abs(cp) / 100;
  const prefix = cp > 0 ? '+' : cp < 0 ? '-' : '';
  return `${prefix}${value >= 10 ? value.toFixed(0) : value.toFixed(1)}`;
}

function getWinPercentageFromCp(cp) {
  const ceiled = clamp(cp, -1000, 1000);
  const multiplier = -0.00368208;
  const winChances = 2 / (1 + Math.exp(multiplier * ceiled)) - 1;
  return 50 + 50 * winChances;
}

export function getPositionWinPercentage(position) {
  const line = position && position.lines && position.lines[0];
  if (!line) return 50;
  if (typeof line.mate === 'number') return line.mate > 0 ? 100 : 0;
  return getWinPercentageFromCp(typeof line.cp === 'number' ? line.cp : 0);
}
