import * as ChessModule from 'chess.js';
import { getSacrificeCandidate, isCriticalMove } from './tacticalClassification';

const Chess = ChessModule.Chess || ChessModule.default || ChessModule;
const neutral = { lines: [{ cp: 0, pv: ['e4'] }] };
const percent = () => 55;

function playedMove(game, san) {
  const beforeFen = game.fen();
  const move = game.move(san);
  return { ...move, beforeFen, afterFen: game.fen(), inBook: false };
}

test('routine pawn development does not create a sacrifice candidate', () => {
  const game = new Chess();
  const move = playedMove(game, 'e4');
  expect(getSacrificeCandidate(neutral, neutral, move, percent)).toBeNull();
});

test('an exposed queen can be considered for deeper sacrifice verification', () => {
  const game = new Chess();
  ['e4', 'e5', 'Qh5', 'Nc6'].forEach((move) => game.move(move));
  const move = playedMove(game, 'Qxe5+');
  const candidate = getSacrificeCandidate(neutral, neutral, move, percent);
  expect(candidate).not.toBeNull();
  expect(candidate.square).toBe('e5');
  expect(candidate.piece).toBe('q');
});

test('great moves exclude captures where the opponent has no recapture', () => {
  const game = new Chess();
  ['e4', 'd5'].forEach((move) => game.move(move));
  const move = playedMove(game, 'exd5');
  const evalBefore = { lines: [
    { pv: ['exd5'], cp: 150 },
    { pv: ['e5'], cp: 0 },
  ] };
  expect(isCriticalMove(evalBefore, move, (line) => line.cp === 150 ? 80 : 55)).toBe(false);
});
