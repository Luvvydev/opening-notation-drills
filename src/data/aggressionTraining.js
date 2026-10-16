// Curated opening continuations. These are examples, not Lichess-sourced games.
// A scripted reply is used only while the played SAN history matches a line.
// On any deviation the existing Stockfish worker takes over.
import * as Chess from 'chess.js';
import { OPENING_CATALOG } from '../openings/openingCatalog';

export const TRAINING_SCENARIOS = [
  { id: 'normal', title: 'Normal Game', description: 'Play from the starting position.' },
  { id: 'queen', title: 'Early Queen Attacks', description: 'Defend against early queen moves and threats.' },
  { id: 'scholar', title: "Scholar's Mate", description: 'Stop early bishop and queen attacks on f7 or f2.' },
  { id: 'sacrifice', title: 'Early Sacrifices', description: 'Handle checks, gambits and early sacrifices.' },
  { id: 'pawns', title: 'Aggressive Pawn Pushes', description: 'Respond to early pawn advances.' },
];

// The training side determines which color must be the aggressor.
const LINES = {
  queen: {
    black: [ ['e4', 'e5', 'Qh5', 'Nc6', 'Bc4'], ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5'] ],
    white: [ ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qa5'] ],
  },
  scholar: {
    black: [ ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5'], ['e4', 'e5', 'Qh5', 'Nc6', 'Bc4'] ],
    white: [ ['e4', 'e5', 'Bc4', 'Qh4'] ],
  },
  sacrifice: {
    black: [ ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Nxd5', 'Nxf7'], ['e4', 'e5', 'f4', 'exf4', 'Nf3'] ],
    white: [ ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'g5'], ['d4', 'd5', 'c4', 'e5'] ],
  },
  pawns: {
    black: [ ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'g5'] ],
    white: [ ['d4', 'f5', 'c4', 'Nf6'], ['e4', 'e5', 'Nf3', 'f5'] ],
  },
};

// Start selected training from a position where the opponent has already
// played the aggressive moves. Otherwise one player deviation causes the
// scripted line to stop before the attack ever appears.
const START_LINES = {
  queen: {
    white: ['e4', 'e5', 'Nc3', 'Qh4'],
    black: ['e4', 'e5', 'Qh5'],
  },
  scholar: {
    white: ['e4', 'e5', 'Bc4', 'Bc5', 'Nc3', 'Qh4'],
    black: ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5'],
  },
  sacrifice: {
    white: ['e4', 'e5', 'Nf3', 'f5'],
    black: ['e4', 'e5', 'f4'],
  },
  pawns: {
    white: ['d4', 'f5'],
    black: ['e4', 'e5', 'f4'],
  },
};

export function getScenarioStartMoves(scenarioId, playerSide) {
  const scenarios = START_LINES[scenarioId];
  return scenarios ? (scenarios[playerSide] || []).slice() : [];
}

export function getScenarioReply(scenarioId, history, playerSide) {
  const lines = (LINES[scenarioId] || {})[playerSide] || [];
  const played = Array.isArray(history) ? history : [];
  const match = lines.find((line) => played.length < line.length && played.every((move, index) => line[index] === move));
  return match ? match[played.length] : null;
}

// Repertoire training starts at move one. Use the opponent moves from the
// selected opening only while the entire played sequence matches a saved line.
// No predetermined move is played if the user has changed the position.
function legalSan(fen, san) {
  if (!san) return null;
  try {
    const game = new Chess(fen);
    const move = game.move(san, { sloppy: true });
    return move ? move.san : null;
  } catch (_) { return null; }
}

export function getRepertoireReply(openingKey, history, fen) {
  const opening = OPENING_CATALOG.find((item) => item.key === openingKey);
  if (!opening || !Array.isArray(opening.lines)) return null;
  const played = Array.isArray(history) ? history : [];
  const candidates = opening.lines.filter((line) =>
    Array.isArray(line.moves) && line.moves.length > played.length &&
    played.every((move, index) => move === line.moves[index])
  );
  for (const line of candidates) {
    const next = legalSan(fen, line.moves[played.length]);
    if (next) return next;
  }
  return null;
}

// Curated exceptions for common repertoire starts. Each condition checks all
// preceding moves, and legalSan checks the actual board before playing a move.
// If an attack does not fit the opening, fall back to its regular repertoire.
const OPENING_ATTACK_REPLIES = {
  queen: {
    london: [{ after: ['d4', 'd5', 'Bf4'], move: 'Qd6' }],
    italian: [{ after: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'], move: 'Qh4' }],
    viennaGame: [{ after: ['e4', 'e5', 'Nc3'], move: 'Qh4' }],
    sicilian: [{ after: ['e4', 'c5'], move: 'Qh5' }],
    caroKann: [{ after: ['e4', 'c6'], move: 'Qh5' }],
  },
  scholar: {
    italian: [{ after: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'], move: 'Qh4' }],
    sicilian: [{ after: ['e4', 'c5'], move: 'Bc4' }, { after: ['e4', 'c5', 'Bc4', 'Nc6'], move: 'Qh5' }],
  },
  pawns: {
    london: [{ after: ['d4'], move: 'f5' }],
    italian: [{ after: ['e4', 'e5', 'Nf3'], move: 'f5' }],
    sicilian: [{ after: ['e4', 'c5'], move: 'f4' }],
  },
  sacrifice: {
    italian: [{ after: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'], move: 'Nf6' }],
    sicilian: [{ after: ['e4', 'c5'], move: 'd4' }],
  },
};

export function getAggressiveRepertoireReply(scenarioId, openingKey, history, fen) {
  const rules = (OPENING_ATTACK_REPLIES[scenarioId] || {})[openingKey] || [];
  const played = Array.isArray(history) ? history : [];
  for (const rule of rules) {
    if (rule.after.length !== played.length || !rule.after.every((move, index) => move === played[index])) continue;
    const reply = legalSan(fen, rule.move);
    if (reply) return reply;
  }
  return null;
}

export function supportsOpeningAttack(scenarioId, openingKey) {
  return scenarioId === 'normal' || Boolean(((OPENING_ATTACK_REPLIES[scenarioId] || {})[openingKey] || []).length);
}
