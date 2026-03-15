import * as Chess from "chess.js";

export function uciToMove(uci) {
  const raw = String(uci || "").trim();
  if (raw.length < 4) return null;
  return {
    from: raw.slice(0, 2),
    to: raw.slice(2, 4),
    promotion: raw.length > 4 ? raw.slice(4, 5).toLowerCase() : undefined
  };
}

export function normalizeMove(move) {
  if (!move || !move.from || !move.to) return null;
  return {
    from: String(move.from).toLowerCase(),
    to: String(move.to).toLowerCase(),
    promotion: move.promotion ? String(move.promotion).toLowerCase() : undefined
  };
}

export function moveMatchesUci(move, uci) {
  const a = normalizeMove(move);
  const b = normalizeMove(uciToMove(uci));
  if (!a || !b) return false;
  return a.from === b.from && a.to === b.to && (a.promotion || "") === (b.promotion || "");
}

export function preparePuzzle(rawPuzzle) {
  if (!rawPuzzle || !rawPuzzle.fen || !Array.isArray(rawPuzzle.moves) || rawPuzzle.moves.length < 2) return null;
  const game = new Chess(rawPuzzle.fen);
  const first = uciToMove(rawPuzzle.moves[0]);
  if (!first) return null;
  const applied = game.move(first);
  if (!applied) return null;
  return {
    startFen: game.fen(),
    solution: rawPuzzle.moves.slice(1),
    playerColor: game.turn(),
    firstOpponentMove: rawPuzzle.moves[0]
  };
}

export function getLegalTargets(fen, square) {
  try {
    const game = new Chess(fen);
    const moves = game.moves({ square, verbose: true }) || [];
    return moves.map((m) => m.to);
  } catch (_) {
    return [];
  }
}

export function getSquarePieceColor(fen, square) {
  try {
    const game = new Chess(fen);
    const piece = game.get(square);
    return piece && piece.color ? piece.color : null;
  } catch (_) {
    return null;
  }
}
