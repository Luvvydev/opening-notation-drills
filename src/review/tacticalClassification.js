import * as ChessModule from 'chess.js';

const Chess = ChessModule.Chess || ChessModule.default || ChessModule;

export function isCriticalMove(beforeEval, move, lineWinPercentage) {
  if (!beforeEval || !beforeEval.lines || beforeEval.lines.length < 2 || !move) return false;
  if (move.inBook || move.promotion) return false;
  // A routine capture of unprotected material is not a difficult tactical find.
  if (move.captured && move.afterFen) {
    const after = new Chess(move.afterFen);
    if (!after.moves({ verbose: true }).some((reply) => reply.to === move.to && reply.captured)) return false;
  }
  const before = new Chess(move.beforeFen);
  if (before.in_check() || before.moves().length < 2) return false;
  const [first, second] = beforeEval.lines;
  if (!first.pv || !second.pv || !first.pv.length || !second.pv.length) return false;
  const difference = (lineWinPercentage(first) - lineWinPercentage(second)) * (move.color === 'w' ? 1 : -1);
  const moverWin = move.color === 'w' ? lineWinPercentage(first) : 100 - lineWinPercentage(first);
  return difference >= 10 && moverWin >= 45 && moverWin <= 94;
}

// A conservative candidate filter. Engine validation takes place separately.
// Position-wide tactical sacrifice candidates, adapted to the project's chess.js 0.11 API.
// Evaluate every attacked non-pawn, not merely the piece that just moved.
export function getSacrificeCandidate(beforeEval, afterEval, move, positionWinPercentage) {
  if (!move || !beforeEval || !afterEval || !move.beforeFen || !move.afterFen || move.inBook || move.promotion) return null;
  const before = new Chess(move.beforeFen);
  const after = new Chess(move.afterFen);
  const values = { p: 1, n: 3, b: 3.2, r: 5, q: 9 };
  const responses = after.moves({ verbose: true });
  if (after.in_checkmate() || !responses.length) return null;

  // A piece is tactically unsafe only if an enemy has a legal capture of it.
  // This is deliberately a candidate finder; deeper engine analysis decides validity.
  const exposed = [];
  for (const square of Array.from({ length: 64 }, (_, i) => 'abcdefgh'[i % 8] + (8 - Math.floor(i / 8)))) {
    const piece = after.get(square);
    if (!piece || piece.color !== move.color || !values[piece.type]) continue;
    const attackers = responses.filter((reply) => reply.to === square && reply.captured === piece.type);
    const cheap = attackers.filter((reply) => values[reply.piece] < values[piece.type]);
    if (!cheap.length) continue;
    const wasHere = before.get(square);
    const newlyExposed = square === move.to || !wasHere || wasHere.color !== move.color || wasHere.type !== piece.type;
    // Ignore previously hanging stationary pieces, except where the move creates a new sacrifice.
    if (!newlyExposed) {
      const fields = move.beforeFen.split(' ');
      fields[1] = move.color === 'w' ? 'b' : 'w';
      fields[3] = '-';
      try {
        const reversed = new Chess();
        if (reversed.load(fields.join(' ')) && reversed.moves({ verbose: true }).some((reply) =>
          reply.to === square && reply.captured === piece.type && values[reply.piece] < values[piece.type])) continue;
      } catch (_) { /* Some constructed positions cannot legally reverse sides. */ }
    }
    // Prefer major material and pieces newly exposed by the move.
    const score = values[piece.type] + (newlyExposed ? 4 : 0) + (cheap.length > 1 ? 1 : 0);
    exposed.push({ square, piece: piece.type, score });
  }
  if (!exposed.length) return null;
  const moverChance = move.color === 'w' ? positionWinPercentage(afterEval) : 100 - positionWinPercentage(afterEval);
  if (moverChance < 40) return null;
  exposed.sort((a, b) => b.score - a.score);
  return exposed[0];
}

