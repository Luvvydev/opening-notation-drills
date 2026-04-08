import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Chessboard from 'chessboardjsx';
import * as Chess from 'chess.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBars,
  faBookOpen,
  faChartLine,
  faChessKnight,
  faCog,
  faListOl,
  faCopy,
  faFastBackward,
  faFastForward,
  faPaste,
  faPlay,
  faSearch,
  faSpinner,
  faStepBackward,
  faStepForward,
  faStopCircle,
  faUpload,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import TopNav from './TopNav';
import { OPENING_CATALOG } from '../openings/openingCatalog';
import { BOARD_THEMES, DEFAULT_THEME, PIECE_THEMES } from '../theme/boardThemes';
import './GameReview.css';

function ReviewConfetti({ active }) {
  if (!active) return null;

  const pieces = [];
  for (let i = 0; i < 60; i += 1) {
    const left = 6 + Math.random() * 88;
    const delay = Math.random() * 0.14;
    const duration = 0.85 + Math.random() * 0.55;
    const rotation = Math.floor(Math.random() * 360);
    const size = 6 + Math.floor(Math.random() * 6);

    pieces.push(
      <span
        key={i}
        className="gr-confetti"
        style={{
          left: `${left}vw`,
          animationDelay: `${delay}s`,
          animationDuration: `${duration}s`,
          transform: `rotate(${rotation}deg)`,
          width: `${size}px`,
          height: `${Math.max(4, Math.floor(size * 0.55))}px`,
        }}
      />
    );
  }

  return <div className="gr-confetti-layer">{pieces}</div>;
}

const ENGINE_PATH = '/engines/stockfish-worker.js';
const DEFAULT_DEPTH = 12;
const DEFAULT_MULTI_PV = 3;
const DEFAULT_SOURCE = 'chesscom';
const DEFAULT_PLAY_TIME = 500;
const DEFAULT_PACK_BATCH = 10;
const PACK_SEED_PUZZLES = 2;
const MAX_PACK_PUZZLES = 24;
const REVIEW_SETTINGS_KEY = 'notation_trainer_opening_settings_v1';
const SAMPLE_PGN = `[Event "Rated Blitz game"]
[Site "https://lichess.org/"]
[Date "2026.04.02"]
[White "White"]
[Black "Black"]
[Result "1-0"]

1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Be3 e6 7. f3 b5 8. Qd2 Nbd7 9. O-O-O Bb7 10. g4 h6 11. h4 b4 12. Nce2 d5 13. Nf4 e5 14. Nxd5 exd4 15. Bf4 Nxd5 16. exd5 Be7 17. Qxd4 O-O 18. g5 h5 19. d6 Bxf3 20. dxe7 Qxe7 21. Bd6 Qe6 22. Bc4 Qe4 23. Qxe4 Bxe4 24. Rhe1 1-0`;

const CLASSIFICATION_META = {
  best: { label: 'Best', className: 'best' },
  excellent: { label: 'Excellent', className: 'excellent' },
  good: { label: 'Good', className: 'good' },
  inaccuracy: { label: 'Inaccuracy', className: 'inaccuracy' },
  mistake: { label: 'Mistake', className: 'mistake' },
  blunder: { label: 'Blunder', className: 'blunder' },
  forced: { label: 'Forced', className: 'forced' },
  book: { label: 'Book', className: 'book' },
};


const SOURCE_TABS = [
  {
    key: 'chesscom',
    label: 'Chess.com',
    logoSrc: 'https://cdn.simpleicons.org/chessdotcom/ffffff',
    logoAlt: 'Chess.com',
  },
  {
    key: 'lichess',
    label: 'Lichess',
    logoSrc: 'https://cdn.simpleicons.org/lichess/ffffff',
    logoAlt: 'Lichess',
  },
  {
    key: 'pgn',
    label: 'PGN',
    badge: 'PGN',
  },
];


function loadReviewSettings() {
  const defaults = {
    showConfetti: true,
    playSounds: true,
    boardTheme: DEFAULT_THEME,
    pieceTheme: 'default',
    coachTheme: 'default',
  };

  try {
    const raw = window.localStorage.getItem(REVIEW_SETTINGS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return {
      showConfetti: parsed && parsed.showConfetti !== false,
      playSounds: parsed && parsed.playSounds !== false,
      boardTheme: (parsed && parsed.boardTheme) || DEFAULT_THEME,
      pieceTheme: (parsed && parsed.pieceTheme) || 'default',
      coachTheme: (parsed && parsed.coachTheme) || 'default',
    };
  } catch (_) {
    return defaults;
  }
}

function getPieceThemeUrl(pieceThemeKey) {
  const key = pieceThemeKey ? String(pieceThemeKey) : 'default';
  const url = PIECE_THEMES && Object.prototype.hasOwnProperty.call(PIECE_THEMES, key) ? PIECE_THEMES[key] : null;
  return url || undefined;
}

function isCaptureLike(move) {
  if (!move) return false;
  if (move.captured) return true;
  return typeof move.flags === 'string' && /[ce]/.test(move.flags);
}

function getReviewMoveSoundKey(move, gameData) {
  if (!move) return null;
  if (isCaptureLike(move)) return 'capture';
  const reviewColor = gameData && gameData.orientation === 'black' ? 'b' : 'w';
  return move.color === reviewColor ? 'moveSelf' : 'moveOpponent';
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeSan(value) {
  return String(value || '')
    .trim()
    .replace(/[!?+#]+$/g, '')
    .replace(/\s+/g, '');
}

function moveToUci(move) {
  if (!move || !move.from || !move.to) return '';
  return `${move.from}${move.to}${move.promotion || ''}`;
}

function uciToMoveObject(uci) {
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

function getResultProperty(result, property) {
  const parts = String(result || '').split(' ');
  const index = parts.indexOf(property);
  if (index === -1 || index + 1 >= parts.length) return undefined;
  return parts[index + 1];
}

function getResultPv(result, fen) {
  const parts = String(result || '').split(' ');
  const pvIndex = parts.indexOf('pv');
  if (pvIndex === -1 || pvIndex + 1 >= parts.length) return undefined;
  return formatUciPv(fen, parts.slice(pvIndex + 1));
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

function parseEvaluationResults(results, fen) {
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
    const pv = getResultPv(text, fen);
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

  parsed.lines = Object.values(temp).sort(sortLines);

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

function getIsStalemate(fen) {
  try {
    const game = new Chess(fen);
    return game.in_stalemate();
  } catch (_) {
    return false;
  }
}

function getWhoIsCheckmated(fen) {
  try {
    const game = new Chess(fen);
    if (!game.in_checkmate()) return null;
    return game.turn();
  } catch (_) {
    return null;
  }
}

function getPositionCp(position) {
  const line = position && position.lines && position.lines[0];
  if (!line) return 0;
  if (typeof line.cp === 'number') return clamp(line.cp, -1000, 1000);
  if (typeof line.mate === 'number') return line.mate > 0 ? 1000 : -1000;
  return 0;
}

function getPositionLabel(position) {
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

function getPositionWinPercentage(position) {
  const line = position && position.lines && position.lines[0];
  if (!line) return 50;
  if (typeof line.mate === 'number') return line.mate > 0 ? 100 : 0;
  return getWinPercentageFromCp(typeof line.cp === 'number' ? line.cp : 0);
}

function getAccuracyWeights(winPercentages) {
  const count = Math.max(1, winPercentages.length - 1);
  const windowSize = clamp(Math.ceil(count / 10), 2, 8);
  const weights = [];
  const halfWindow = Math.round(windowSize / 2);

  for (let i = 1; i < winPercentages.length; i += 1) {
    const start = clamp(i - halfWindow, 0, Math.max(0, winPercentages.length - windowSize));
    const window = winPercentages.slice(start, start + windowSize);
    const mean = window.reduce((sum, value) => sum + value, 0) / Math.max(1, window.length);
    const variance = window.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / Math.max(1, window.length);
    weights.push(clamp(Math.sqrt(variance), 0.5, 12));
  }

  return weights;
}

function getMovesAccuracy(winPercentages) {
  return winPercentages.slice(1).map((current, index) => {
    const previous = winPercentages[index];
    const isWhiteMove = index % 2 === 0;
    const diff = isWhiteMove
      ? Math.max(0, previous - current)
      : Math.max(0, current - previous);

    const raw = 103.1668100711649 * Math.exp(-0.04354415386753951 * diff) - 3.166924740191411;
    return clamp(raw + 1, 0, 100);
  });
}

function getWeightedMean(values, weights) {
  if (!values.length || !weights.length) return 0;
  let totalWeight = 0;
  let weighted = 0;
  values.forEach((value, index) => {
    const weight = weights[index] || 0;
    weighted += value * weight;
    totalWeight += weight;
  });
  return totalWeight ? (weighted / totalWeight) : 0;
}

function getHarmonicMean(values) {
  if (!values.length) return 0;
  const denom = values.reduce((sum, value) => sum + (1 / Math.max(0.0001, value)), 0);
  return denom ? values.length / denom : 0;
}

function computeAccuracy(positions) {
  if (!positions || positions.length < 2) {
    return { white: 0, black: 0 };
  }

  const winPercentages = positions.map(getPositionWinPercentage);
  const weights = getAccuracyWeights(winPercentages);
  const movesAccuracy = getMovesAccuracy(winPercentages);

  const getPlayerAccuracy = (player) => {
    const remainder = player === 'white' ? 0 : 1;
    const playerAccuracies = movesAccuracy.filter((_, index) => index % 2 === remainder);
    const playerWeights = weights.filter((_, index) => index % 2 === remainder);
    const weightedMean = getWeightedMean(playerAccuracies, playerWeights);
    const harmonicMean = getHarmonicMean(playerAccuracies.map((value) => Math.max(value, 10)));
    return (weightedMean + harmonicMean) / 2;
  };

  return {
    white: clamp(getPlayerAccuracy('white'), 0, 100),
    black: clamp(getPlayerAccuracy('black'), 0, 100),
  };
}

function computeAcpl(positions, moves) {
  if (!positions || positions.length < 2 || !moves || !moves.length) {
    return { white: 0, black: 0 };
  }

  let whiteLoss = 0;
  let whiteMoves = 0;
  let blackLoss = 0;
  let blackMoves = 0;

  for (let i = 0; i < moves.length; i += 1) {
    const previousCp = getPositionCp(positions[i]);
    const currentCp = getPositionCp(positions[i + 1]);
    const move = moves[i];

    if (move.color === 'w') {
      whiteLoss += Math.max(0, previousCp - currentCp);
      whiteMoves += 1;
    } else {
      blackLoss += Math.max(0, currentCp - previousCp);
      blackMoves += 1;
    }
  }

  return {
    white: whiteMoves ? (whiteLoss / whiteMoves) : 0,
    black: blackMoves ? (blackLoss / blackMoves) : 0,
  };
}

function classifyMove(beforeEval, afterEval, move) {
  if (!beforeEval || !afterEval || !move) return 'good';

  const beforeLine = beforeEval.lines && beforeEval.lines[0];
  if (beforeLine && beforeEval.lines.length === 1) return 'forced';
  if (move.inBook) return 'book';

  const playedUci = move.uci;
  if (playedUci && beforeEval.bestMove && playedUci === beforeEval.bestMove) {
    return 'best';
  }

  const before = getPositionWinPercentage(beforeEval);
  const after = getPositionWinPercentage(afterEval);
  const signedDiff = (after - before) * (move.color === 'w' ? 1 : -1);

  if (signedDiff < -20) return 'blunder';
  if (signedDiff < -10) return 'mistake';
  if (signedDiff < -5) return 'inaccuracy';
  if (signedDiff < -2) return 'good';
  return 'excellent';
}

function getMatchSummary(sanMoves) {
  if (!sanMoves || !sanMoves.length) return null;

  let best = null;

  OPENING_CATALOG.forEach((opening) => {
    (opening.lines || []).forEach((line) => {
      const lineMoves = Array.isArray(line.moves) ? line.moves : [];
      let matched = 0;

      while (
        matched < sanMoves.length &&
        matched < lineMoves.length &&
        normalizeSan(sanMoves[matched]) === normalizeSan(lineMoves[matched])
      ) {
        matched += 1;
      }

      if (!best || matched > best.matchedPlies) {
        best = {
          openingKey: opening.key,
          openingTitle: opening.title,
          lineName: line.name || null,
          matchedPlies: matched,
          finishedLine: matched === lineMoves.length && lineMoves.length > 0,
        };
      }
    });
  });

  if (!best || best.matchedPlies < 2) return null;
  return best;
}

function parsePgn(rawText, orientationOverride) {
  const text = String(rawText || '').trim();
  if (!text) {
    return { ok: false, error: 'Paste a PGN first.' };
  }

  const game = new Chess();
  let loaded = false;

  try {
    loaded = game.load_pgn(text, { sloppy: true });
  } catch (_) {
    return { ok: false, error: 'Could not parse that PGN.' };
  }

  if (!loaded) {
    return { ok: false, error: 'Could not parse that PGN.' };
  }

  const headers = game.header();
  const verboseMoves = game.history({ verbose: true });

  if (!verboseMoves.length) {
    return { ok: false, error: 'No moves found in that PGN.' };
  }

  const replay = new Chess();
  const positions = [{ fen: replay.fen(), ply: 0, san: null, uci: null }];
  const moves = [];

  for (let i = 0; i < verboseMoves.length; i += 1) {
    const verboseMove = verboseMoves[i];
    const beforeFen = replay.fen();
    const applied = replay.move(verboseMove.san, { sloppy: true });

    if (!applied) {
      return { ok: false, error: `Move ${i + 1} could not be replayed.` };
    }

    const move = {
      index: i,
      ply: i + 1,
      turnNumber: Math.floor(i / 2) + 1,
      color: applied.color,
      san: applied.san,
      uci: moveToUci(applied),
      from: applied.from,
      to: applied.to,
      flags: applied.flags || '',
      captured: applied.captured || null,
      promotion: applied.promotion || null,
      isCapture: Boolean(applied.captured || (applied.flags && /[ce]/.test(applied.flags))),
      beforeFen,
      afterFen: replay.fen(),
      inBook: false,
    };

    moves.push(move);
    positions.push({
      fen: replay.fen(),
      ply: i + 1,
      san: applied.san,
      uci: move.uci,
    });
  }

  const match = getMatchSummary(moves.map((move) => move.san));
  if (match && match.matchedPlies > 0) {
    for (let i = 0; i < moves.length && i < match.matchedPlies; i += 1) {
      moves[i].inBook = true;
    }
  }

  return {
    ok: true,
    pgn: text,
    headers,
    moves,
    positions,
    orientation: orientationOverride || 'white',
    result: headers.Result || '*',
    match,
  };
}



function sendCommandsToWorker(workerHandle, commands, finalPrefix, onMessage, timeoutMs) {
  return new Promise((resolve, reject) => {
    const messages = [];
    let finished = false;
    const timeoutId = timeoutMs ? window.setTimeout(() => {
      if (finished) return;
      finished = true;
      reject(new Error(`Worker timeout waiting for ${finalPrefix}`));
    }, timeoutMs) : null;

    workerHandle.listener = (data) => {
      const text = String(data || '');
      messages.push(text);
      if (onMessage) onMessage(messages, text);
      if (!finished && text.startsWith(finalPrefix)) {
        finished = true;
        if (timeoutId) window.clearTimeout(timeoutId);
        resolve(messages);
      }
    };

    try {
      commands.forEach((command) => {
        workerHandle.worker.postMessage(command);
      });
    } catch (error) {
      if (timeoutId) window.clearTimeout(timeoutId);
      reject(error);
    }
  });
}

function getPaddedNumber(value) {
  return String(value).padStart(2, '0');
}

async function getChessComUserRecentGames(username, signal) {
  const trimmed = String(username || '').trim();
  if (!trimmed) return [];

  const date = new Date();
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const paddedMonth = getPaddedNumber(month);

  const urls = [
    `https://api.chess.com/pub/player/${encodeURIComponent(trimmed.toLowerCase())}/games/${year}/${paddedMonth}`,
  ];

  if (month === 1) {
    urls.push(`https://api.chess.com/pub/player/${encodeURIComponent(trimmed.toLowerCase())}/games/${year - 1}/12`);
  } else {
    urls.push(`https://api.chess.com/pub/player/${encodeURIComponent(trimmed.toLowerCase())}/games/${year}/${getPaddedNumber(month - 1)}`);
  }

  const chunks = await Promise.all(urls.map(async (url) => {
    const response = await fetch(url, { method: 'GET', signal });
    const data = await response.json();
    if (response.status >= 400 && data && data.message !== 'Date cannot be set in the future') {
      throw new Error('Could not load games from Chess.com.');
    }
    return Array.isArray(data && data.games) ? data.games : [];
  }));

  return chunks
    .reduce((acc, games) => acc.concat(games), [])
    .filter((game) => game && game.pgn && game.end_time)
    .sort((a, b) => (b.end_time || 0) - (a.end_time || 0))
    .slice(0, 50)
    .map((game) => {
      const result = game.pgn.match(/\[Result "(.*?)"\]/)?.[1] || '*';
      const movesNb = game.pgn.match(/\d+?\. /g)?.length;
      const [base, inc] = String(game.time_control || '').split('+');
      const baseSeconds = Number(base || 0);
      let timeControl = game.time_class || 'Game';
      if (baseSeconds > 0) {
        if (baseSeconds < 60) timeControl = `${baseSeconds}s${inc ? `+${inc}` : ''}`;
        else timeControl = `${Math.floor(baseSeconds / 60)}m${inc ? `+${inc}` : ''}`;
      }

      return {
        id: game.uuid || game.url || `${game.end_time}`,
        pgn: game.pgn,
        result,
        url: game.url,
        date: game.end_time ? new Date(game.end_time * 1000).toLocaleDateString() : '',
        timeControl,
        speedClass: game.time_class || getSpeedClassFromSeconds(baseSeconds),
        sourceType: 'chesscom',
        movesNb: movesNb ? movesNb * 2 : 0,
        white: {
          name: game.white && game.white.username ? game.white.username : 'White',
          rating: game.white && game.white.rating ? game.white.rating : 0,
          title: game.white && game.white.title ? game.white.title : '',
        },
        black: {
          name: game.black && game.black.username ? game.black.username : 'Black',
          rating: game.black && game.black.rating ? game.black.rating : 0,
          title: game.black && game.black.title ? game.black.title : '',
        },
      };
    });
}

async function getLichessUserRecentGames(username, signal) {
  const trimmed = String(username || '').trim();
  if (!trimmed) return [];

  const response = await fetch(
    `https://lichess.org/api/games/user/${encodeURIComponent(trimmed)}?until=${Date.now()}&max=50&pgnInJson=true&sort=dateDesc&clocks=true`,
    { method: 'GET', headers: { accept: 'application/x-ndjson' }, signal }
  );

  if (response.status >= 400) {
    throw new Error('Could not load games from Lichess.');
  }

  const raw = await response.text();
  return raw
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .map((game) => ({
      id: game.id,
      pgn: game.pgn,
      result: game.status === 'draw' ? '1/2-1/2' : game.winner === 'white' ? '1-0' : game.winner === 'black' ? '0-1' : '*',
      url: `https://lichess.org/${game.id}`,
      date: new Date(game.createdAt || game.lastMoveAt).toLocaleDateString(),
      timeControl: game.clock ? `${Math.floor((game.clock.initial || 0) / 60)}+${game.clock.increment || 0}` : 'Game',
      speedClass: game.speed || (game.clock ? getSpeedClassFromSeconds(game.clock.initial || 0) : 'game'),
      sourceType: 'lichess',
      movesNb: game.moves ? game.moves.split(' ').length : 0,
      white: {
        name: game.players && game.players.white && game.players.white.user ? game.players.white.user.name : 'White',
        rating: game.players && game.players.white ? game.players.white.rating : 0,
        title: game.players && game.players.white && game.players.white.user ? game.players.white.user.title : '',
      },
      black: {
        name: game.players && game.players.black && game.players.black.user ? game.players.black.user.name : 'Black',
        rating: game.players && game.players.black ? game.players.black.rating : 0,
        title: game.players && game.players.black && game.players.black.user ? game.players.black.user.title : '',
      },
    }));
}

function getPerspectiveResult(result, game, focusUsername) {
  const normalized = String(focusUsername || '').trim().toLowerCase();
  const whiteName = String((game && game.white && game.white.name) || '').trim().toLowerCase();
  const blackName = String((game && game.black && game.black.name) || '').trim().toLowerCase();
  const score = String(result || '*');

  if (!normalized || (normalized !== whiteName && normalized !== blackName)) {
    return { label: score, className: 'neutral' };
  }

  if (score === '1/2-1/2') {
    return { label: '½', className: 'draw' };
  }

  const isWhite = normalized === whiteName;
  const won = (score === '1-0' && isWhite) || (score === '0-1' && !isWhite);
  const lost = (score === '1-0' && !isWhite) || (score === '0-1' && isWhite);

  if (won) return { label: 'W', className: 'win' };
  if (lost) return { label: 'L', className: 'loss' };
  return { label: score, className: 'neutral' };
}

function getHeaderPlayer(headers, side) {
  const prefix = side === 'black' ? 'Black' : 'White';
  return {
    name: headers && headers[`${prefix}`] ? headers[`${prefix}`] : prefix,
    rating: headers && headers[`${prefix}Elo`] ? headers[`${prefix}Elo`] : '',
    title: headers && headers[`${prefix}Title`] ? headers[`${prefix}Title`] : '',
  };
}

function getPlayerInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) return '?';
  return parts.map((part) => part.charAt(0).toUpperCase()).join('');
}

function createEmptyClassificationBucket() {
  return {
    book: 0,
    best: 0,
    excellent: 0,
    good: 0,
    inaccuracy: 0,
    mistake: 0,
    blunder: 0,
    forced: 0,
  };
}

function getMoveClassificationCounts(moves) {
  const counts = {
    white: createEmptyClassificationBucket(),
    black: createEmptyClassificationBucket(),
  };

  (moves || []).forEach((move) => {
    if (!move || !move.color) return;

    const side = move.color === 'w' ? 'white' : 'black';
    const key = move.classification;

    if (!key || counts[side][key] === undefined) return;
    counts[side][key] += 1;
  });

  return counts;
}

function getPerspectiveCpValue(cp, color) {
  const numeric = Number(cp || 0);
  return color === 'b' ? -numeric : numeric;
}

function getPerspectivePositionCp(position, color) {
  return getPerspectiveCpValue(getPositionCp(position), color);
}

function getPerspectiveWinPercentage(position, color) {
  const value = clamp(getPositionWinPercentage(position), 0, 100);
  return color === 'b' ? 100 - value : value;
}

function getPuzzleSeverityRank(classification) {
  if (classification === 'blunder') return 3;
  if (classification === 'mistake') return 2;
  if (classification === 'inaccuracy') return 1;
  return 0;
}

function formatCpSwing(cpLoss) {
  const numeric = Number(cpLoss || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return '0.0';
  return (numeric / 100).toFixed(1);
}

function getPuzzleGoalLabel(classification) {
  return classification === 'inaccuracy' ? 'Find a better move' : 'Find the best move';
}

function isSanPieceMove(san) {
  return /^[KQRBN]/.test(String(san || ''));
}

function isSanCastleMove(san) {
  return /^O-O(-O)?/.test(String(san || ''));
}

function isSanPawnMove(san) {
  const value = String(san || '');
  if (!value) return false;
  if (isSanCastleMove(value)) return false;
  return !isSanPieceMove(value);
}

function getPuzzleHintText(puzzle) {
  if (!puzzle) return '';

  const bestSan = String(puzzle.bestSan || '');
  const playedSan = String(puzzle.playedSan || '');

  if (bestSan.indexOf('#') !== -1) return 'There is a direct finish here.';
  if (bestSan.indexOf('+') !== -1) return 'Start with a forcing check.';
  if (bestSan.indexOf('x') !== -1) return 'There is a stronger capture here.';
  if (isSanCastleMove(bestSan)) return 'King safety mattered more than the game move.';
  if (isSanPieceMove(bestSan) && isSanPawnMove(playedSan)) return 'A piece move fixes this faster than another pawn move.';
  if (isSanPieceMove(bestSan) && isSanPieceMove(playedSan)) return 'A different piece move was stronger here.';
  if (isSanPieceMove(bestSan)) return 'A more active piece move was stronger here.';
  return 'The game move was too slow. Look for the move that changes the position immediately.';
}

function getPuzzleLeadText(puzzle) {
  if (!puzzle) return 'Load a game to start training.';

  if (puzzle.classification === 'blunder') {
    return `You played ${puzzle.playedSan}. This was the big swing in the game. ${getPuzzleGoalLabel(puzzle.classification)}.`;
  }

  if (puzzle.classification === 'mistake') {
    return `You played ${puzzle.playedSan}. There was a cleaner move here. ${getPuzzleGoalLabel(puzzle.classification)}.`;
  }

  return `You played ${puzzle.playedSan}. There was a stronger continuation available. ${getPuzzleGoalLabel(puzzle.classification)}.`;
}

function getSpeedClassFromSeconds(totalSeconds) {
  const numeric = Number(totalSeconds || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return 'game';
  if (numeric < 180) return 'bullet';
  if (numeric < 600) return 'blitz';
  if (numeric < 1500) return 'rapid';
  return 'classical';
}

function getGameSideForUsername(game, username) {
  const normalized = String(username || '').trim().toLowerCase();
  if (!normalized || !game) return 'white';

  const blackName = String((game.black && game.black.name) || '').trim().toLowerCase();

  if (blackName === normalized) return 'black';
  return 'white';
}

function matchesPackFilters(game, username, sideFilter, speedFilter) {
  if (!game) return false;

  if (sideFilter && sideFilter !== 'all') {
    const userSide = getGameSideForUsername(game, username);
    if (userSide !== sideFilter) return false;
  }

  if (speedFilter && speedFilter !== 'all') {
    const speedClass = String(game.speedClass || '').toLowerCase();
    if (speedClass !== speedFilter) return false;
  }

  return true;
}

function getPackThemeLabel(puzzle) {
  if (!puzzle) return 'Missed stronger move';

  const bestSan = String(puzzle.bestSan || '');
  const playedSan = String(puzzle.playedSan || '');

  if (bestSan.indexOf('#') !== -1) return 'Missed mate';
  if (bestSan.indexOf('+') !== -1) return 'Missed forcing move';
  if (bestSan.indexOf('x') !== -1 && playedSan.indexOf('x') === -1) return 'Missed capture';
  if (/^O-O(-O)?/.test(bestSan)) return 'King safety';
  if (/^[NBRQ].*x/.test(bestSan)) return 'Missed tactic';
  if (/^[NBRQ]/.test(bestSan) && /^[a-h]/.test(playedSan)) return 'Slow pawn move';
  if (playedSan.indexOf('x') !== -1 && bestSan.indexOf('x') === -1) return 'Bad recapture';
  if (puzzle.classification === 'blunder') return 'Big tactical miss';
  return 'Missed stronger move';
}

function getPackPuzzleSignature(puzzle) {
  const fenKey = String(puzzle && puzzle.beforeFen ? puzzle.beforeFen : '')
    .split(' ')
    .slice(0, 4)
    .join(' ');

  return [fenKey, puzzle && puzzle.bestMove ? puzzle.bestMove : '', puzzle && puzzle.color ? puzzle.color : ''].join('|');
}

function getEvaluationLineScore(line) {
  if (!line) return 0;
  if (typeof line.mate === 'number') {
    const distance = Math.max(0, 100 - Math.abs(line.mate));
    return line.mate > 0 ? 100000 + distance : -100000 - distance;
  }
  return typeof line.cp === 'number' ? line.cp : 0;
}

function getTopLineGap(position) {
  const lines = position && Array.isArray(position.lines) ? position.lines : [];
  if (!lines.length) return 0;
  if (lines.length === 1) return 999999;
  return Math.max(0, getEvaluationLineScore(lines[0]) - getEvaluationLineScore(lines[1]));
}

function isForcingSan(value) {
  const san = String(value || '');
  return san.indexOf('#') !== -1 || san.indexOf('+') !== -1 || san.indexOf('x') !== -1;
}

function shouldKeepPackPuzzle(puzzle) {
  if (!puzzle) return false;
  if (puzzle.classification !== 'mistake' && puzzle.classification !== 'blunder') return false;
  if (puzzle.inBook) return false;
  if (puzzle.turnNumber <= 3) return false;
  if (puzzle.beforePerspectiveCp <= -260) return false;
  if (puzzle.winSwing < 6) return false;

  const tactical = Boolean(puzzle.isCapture || puzzle.isForcingBest || puzzle.isForcingPlayed);
  const lineGap = Number(puzzle.lineGap || 0);

  if (lineGap < 70 && !tactical) return false;
  if (puzzle.turnNumber <= 5 && (!tactical || lineGap < 120)) return false;
  if (puzzle.classification === 'mistake' && !tactical && lineGap < 110) return false;

  return true;
}

function shouldKeepSingleGamePuzzle(puzzle) {
  if (!puzzle) return false;
  if (puzzle.inBook) return false;

  const tactical = Boolean(puzzle.isCapture || puzzle.isForcingBest || puzzle.isForcingPlayed);
  const lineGap = Number(puzzle.lineGap || 0);
  const openingTagged = Boolean(puzzle.openingKey || puzzle.lineName);

  if (puzzle.turnNumber <= 6) {
    if (puzzle.classification !== 'blunder') return false;
    if (!tactical) return false;
    if (lineGap < 160) return false;
  }

  if (puzzle.turnNumber <= 8 && openingTagged && !tactical) return false;
  if (puzzle.turnNumber <= 8 && !tactical && lineGap < 140) return false;

  return true;
}

function waitForNextPaint() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 0);
  });
}

function getPackEvaluationIndexes(parsed) {
  if (!parsed || !Array.isArray(parsed.moves) || !Array.isArray(parsed.positions) || !parsed.positions.length) {
    return [];
  }

  const focusColor = parsed.orientation === 'black' ? 'b' : 'w';
  const needed = new Set();

  parsed.moves.forEach((move, index) => {
    if (!move || move.color !== focusColor) return;
    if (!parsed.positions[index] || !parsed.positions[index + 1]) return;
    needed.add(index);
    needed.add(index + 1);
  });

  return Array.from(needed).sort((a, b) => a - b);
}

function buildPersonalPack(analyzedGames) {
  const strongestBySignature = new Map();

  (analyzedGames || []).forEach((entry, index) => {
    if (!entry || !entry.gameData) return;

    const sourceGame = entry.sourceGame || {};
    const queue = buildPuzzleQueue(entry.gameData, {
      idPrefix: `${sourceGame.id || `game-${index}`}`,
      sourceUrl: sourceGame.url || '',
      date: sourceGame.date || '',
      gameId: sourceGame.id || '',
      sourceType: sourceGame.sourceType || '',
      white: sourceGame.white || null,
      black: sourceGame.black || null,
      strictPackMode: true,
    }).map((puzzle) => ({
      ...puzzle,
      themeLabel: getPackThemeLabel(puzzle),
    }));

    queue.forEach((puzzle) => {
      const signature = getPackPuzzleSignature(puzzle);
      const existing = strongestBySignature.get(signature);

      if (!existing) {
        strongestBySignature.set(signature, puzzle);
        return;
      }

      const nextRank = getPuzzleSeverityRank(puzzle.classification);
      const existingRank = getPuzzleSeverityRank(existing.classification);

      if (nextRank > existingRank || (nextRank === existingRank && puzzle.cpLoss > existing.cpLoss)) {
        strongestBySignature.set(signature, puzzle);
      }
    });
  });

  const deduped = Array.from(strongestBySignature.values());
  const themeCounts = deduped.reduce((acc, puzzle) => {
    const key = puzzle.themeLabel || 'Missed stronger move';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const openingCounts = deduped.reduce((acc, puzzle) => {
    const key = puzzle.openingTitle || '';
    if (!key) return acc;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const sorted = deduped
    .sort((a, b) => (
      (themeCounts[b.themeLabel || ''] || 0) - (themeCounts[a.themeLabel || ''] || 0) ||
      getPuzzleSeverityRank(b.classification) - getPuzzleSeverityRank(a.classification) ||
      b.cpLoss - a.cpLoss ||
      a.ply - b.ply
    ))
    .slice(0, MAX_PACK_PUZZLES);

  return {
    puzzles: sorted,
    themes: Object.entries(themeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([label, count]) => ({ label, count })),
    topOpenings: Object.entries(openingCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([label, count]) => ({ label, count })),
    candidateCount: deduped.length,
  };
}

function mergePackPuzzleQueue(existingPuzzles, nextPuzzles) {
  const merged = Array.isArray(existingPuzzles) ? existingPuzzles.slice() : [];
  const seen = new Set(merged.map((puzzle) => getPackPuzzleSignature(puzzle)));

  (nextPuzzles || []).forEach((puzzle) => {
    const signature = getPackPuzzleSignature(puzzle);
    if (seen.has(signature)) return;
    seen.add(signature);
    merged.push(puzzle);
  });

  return merged.slice(0, MAX_PACK_PUZZLES);
}

function buildPuzzleQueue(gameData, options) {
  if (!gameData || !Array.isArray(gameData.moves) || !gameData.moves.length) return [];

  const settings = options || {};
  const focusColor = gameData.orientation === 'black' ? 'b' : 'w';
  const headers = gameData.headers || {};
  const whitePlayer = settings.white || getHeaderPlayer(headers, 'white');
  const blackPlayer = settings.black || getHeaderPlayer(headers, 'black');
  const playerName = focusColor === 'w' ? (whitePlayer.name || 'White') : (blackPlayer.name || 'Black');
  const opponentName = focusColor === 'w' ? (blackPlayer.name || 'Black') : (whitePlayer.name || 'White');
  const sourceUrl = settings.sourceUrl || (typeof headers.Site === 'string' && /^https?:/i.test(headers.Site) ? headers.Site : '');
  const opening = gameData.match || null;
  const idPrefix = settings.idPrefix ? `${settings.idPrefix}-` : '';
  const totalPlies = gameData.moves.length;

  const thresholds = {
    blunder: 120,
    mistake: 75,
    inaccuracy: 40,
  };

  return gameData.moves
    .filter((move) => (
      move &&
      move.color === focusColor &&
      move.bestMove &&
      move.evaluationBefore &&
      move.evaluationAfter &&
      (move.classification === 'blunder' || move.classification === 'mistake' || move.classification === 'inaccuracy')
    ))
    .map((move) => {
      const beforePerspectiveCp = getPerspectivePositionCp(move.evaluationBefore, focusColor);
      const afterPerspectiveCp = getPerspectivePositionCp(move.evaluationAfter, focusColor);
      const cpLoss = Math.max(0, beforePerspectiveCp - afterPerspectiveCp);
      const beforeWin = getPerspectiveWinPercentage(move.evaluationBefore, focusColor);
      const afterWin = getPerspectiveWinPercentage(move.evaluationAfter, focusColor);
      const winSwing = Math.max(0, beforeWin - afterWin);
      const bestSan = getBestMoveSan(move.beforeFen, move.bestMove);
      const lineGap = getTopLineGap(move.evaluationBefore);

      return {
        id: `${idPrefix}puzzle-${move.ply}`,
        gameId: settings.gameId || '',
        ply: move.ply,
        turnNumber: move.turnNumber,
        color: focusColor,
        sideLabel: focusColor === 'w' ? 'White' : 'Black',
        beforeFen: move.beforeFen,
        playedMove: move.uci,
        playedSan: move.san,
        bestMove: move.bestMove,
        bestSan,
        classification: move.classification,
        inBook: Boolean(move.inBook),
        isCapture: Boolean(move.isCapture),
        isForcingBest: isForcingSan(bestSan),
        isForcingPlayed: isForcingSan(move.san),
        lineGap,
        cpLoss,
        lossLabel: formatCpSwing(cpLoss),
        beforePerspectiveCp,
        afterPerspectiveCp,
        winSwing,
        goalLabel: getPuzzleGoalLabel(move.classification),
        playerName,
        opponentName,
        whiteName: whitePlayer.name || 'White',
        whiteRating: whitePlayer.rating || 0,
        whiteTitle: whitePlayer.title || '',
        blackName: blackPlayer.name || 'Black',
        blackRating: blackPlayer.rating || 0,
        blackTitle: blackPlayer.title || '',
        totalPlies,
        result: gameData.result || headers.Result || '*',
        sourceUrl,
        sourceType: settings.sourceType || '',
        date: settings.date || headers.Date || '',
        openingKey: opening && opening.openingKey ? opening.openingKey : '',
        openingTitle: opening && opening.openingTitle ? opening.openingTitle : '',
        lineName: opening && opening.lineName ? opening.lineName : '',
      };
    })
    .filter((puzzle) => (
      puzzle.bestSan &&
      puzzle.beforePerspectiveCp > -320 &&
      puzzle.cpLoss >= (thresholds[puzzle.classification] || 0) &&
      puzzle.winSwing >= 4 &&
      (settings.strictPackMode ? shouldKeepPackPuzzle(puzzle) : shouldKeepSingleGamePuzzle(puzzle))
    ))
    .sort((a, b) => (
      getPuzzleSeverityRank(b.classification) - getPuzzleSeverityRank(a.classification) ||
      b.cpLoss - a.cpLoss ||
      a.ply - b.ply
    ))
    .slice(0, 12);
}

function getBestMoveSan(fen, bestMove) {
  if (!fen || !bestMove) return '';
  try {
    const game = new Chess(fen);
    const applied = game.move(uciToMoveObject(bestMove));
    return applied ? applied.san : '';
  } catch (_) {
    return '';
  }
}

function getMoveInsight(move, classification, match) {
  if (!move) {
    return {
      title: 'Load a game to review it',
      body: 'Pull recent games from Chess.com or Lichess, or paste a PGN.',
      tone: 'idle',
      bestSan: '',
    };
  }

  const bestSan = getBestMoveSan(move.beforeFen, move.bestMove);
  const san = move.san || 'This move';

  switch (move.classification) {
    case 'book':
      return {
        title: `${san} is a book move`,
        body: match && match.lineName
          ? `Still inside ${match.lineName}.`
          : 'Still inside your saved opening path.',
        tone: 'book',
        bestSan,
      };
    case 'best':
      return {
        title: `${san} is best`,
        body: bestSan && bestSan !== san ? `It matches the engine pick. ${bestSan} was the top continuation.` : 'It matches the engine top line.',
        tone: 'best',
        bestSan,
      };
    case 'excellent':
      return {
        title: `${san} keeps the edge`,
        body: bestSan && bestSan !== san ? `The top engine move was ${bestSan}. Your move stayed very close.` : 'Very little was lost here.',
        tone: 'excellent',
        bestSan,
      };
    case 'inaccuracy':
      return {
        title: `${san} is an inaccuracy`,
        body: bestSan ? `Stronger was ${bestSan}. This gave away some control.` : 'This slipped a little without losing the game immediately.',
        tone: 'inaccuracy',
        bestSan,
      };
    case 'mistake':
      return {
        title: `${san} is a mistake`,
        body: bestSan ? `Best was ${bestSan}. This changed the evaluation in a real way.` : 'This dropped a chunk of the evaluation.',
        tone: 'mistake',
        bestSan,
      };
    case 'blunder':
      return {
        title: `${san} is a blunder`,
        body: bestSan ? `Best was ${bestSan}. This was the big swing in the position.` : 'This was the biggest swing in the position.',
        tone: 'blunder',
        bestSan,
      };
    default:
      return {
        title: `Selected move: ${san}`,
        body: bestSan ? `Best move from this position was ${bestSan}.` : 'Run analysis to classify this move.',
        tone: classification ? classification.className : 'neutral',
        bestSan,
      };
  }
}

function getSquareCenter(square, orientation, boardSize = 100) {
  if (!square || square.length < 2) return null;
  const file = square.charCodeAt(0) - 97;
  const rank = parseInt(square[1], 10);
  if (Number.isNaN(file) || Number.isNaN(rank)) return null;

  const col = orientation === 'white' ? file : 7 - file;
  const row = orientation === 'white' ? 8 - rank : rank - 1;
  const cellSize = boardSize / 8;
  const x = (col + 0.5) * cellSize;
  const y = (row + 0.5) * cellSize;

  return {
    x,
    y,
    left: `${x}px`,
    top: `${y}px`,
  };
}

function BoardOverlay({ move, orientation, classification, boardSize }) {
  const arrowMarkerId = useMemo(() => `grArrowHead-${Math.random().toString(36).slice(2, 9)}`, []);

  if (!move || !move.from || !move.to || !boardSize) return null;

  const from = getSquareCenter(move.from, orientation, boardSize);
  const to = getSquareCenter(move.to, orientation, boardSize);
  if (!from || !to) return null;

  const className = classification && classification.className ? classification.className : 'neutral';
  const badgeText = move.classification === 'book'
    ? '📘'
    : move.classification === 'best'
      ? '★'
      : move.classification === 'excellent'
        ? '!'
        : move.classification === 'inaccuracy'
          ? '?!'
          : move.classification === 'mistake'
            ? '?'
            : move.classification === 'blunder'
              ? '??'
              : '•';

  return (
    <div className="gr-board-overlay" aria-hidden="true">
      <svg viewBox={`0 0 ${boardSize} ${boardSize}`} className={`gr-board-arrow gr-board-arrow-${className}`}>
        <defs>
          <marker id={arrowMarkerId} markerWidth="10" markerHeight="10" refX="7" refY="5" orient="auto" markerUnits="userSpaceOnUse">
            <path d="M0,0 L10,5 L0,10 z" />
          </marker>
        </defs>
        <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} markerEnd={`url(#${arrowMarkerId})`} />
      </svg>
      <div className={`gr-board-badge gr-board-badge-${className}`} style={{ left: to.left, top: to.top }}>
        {badgeText}
      </div>
    </div>
  );
}

function PlayerAvatar({ name, avatarUrl, className }) {
  return avatarUrl ? (
    <img src={avatarUrl} alt={name} className={className || 'gr-avatar'} />
  ) : (
    <div className={className || 'gr-avatar'}>{getPlayerInitials(name)}</div>
  );
}

function RemoteGameList({ games, selectedId, onSelect, loading, error, emptyMessage, focusUsername }) {
  if (loading) {
    return (
      <div className="gr-remote-state">
        <FontAwesomeIcon icon={faSpinner} spin />
        <span>Loading recent games…</span>
      </div>
    );
  }

  if (error) {
    return <div className="gr-error">{error}</div>;
  }

  if (!games.length) {
    return emptyMessage ? <div className="gr-empty">{emptyMessage}</div> : null;
  }

  return (
    <div className="gr-remote-list">
      {games.map((game) => {
        const isActive = selectedId === game.id;
        const perspective = getPerspectiveResult(game.result, game, focusUsername);

        return (
          <button
            key={game.id}
            type="button"
            className={isActive ? 'gr-remote-item is-active' : 'gr-remote-item'}
            onClick={() => onSelect(game)}
          >
            <div className="gr-remote-avatars">
              <PlayerAvatar name={game.white.name} className="gr-remote-avatar" />
              <PlayerAvatar name={game.black.name} className="gr-remote-avatar gr-remote-avatar-stack" />
            </div>
            <div className="gr-remote-copy">
              <div className="gr-remote-topline">
                <span className="gr-remote-player">{game.white.name}</span>
                <span className="gr-remote-vs">vs</span>
                <span className="gr-remote-player">{game.black.name}</span>
                <span className={`gr-remote-result gr-remote-result-${perspective.className}`}>{perspective.label}</span>
              </div>
              <div className="gr-remote-meta">
                <span>{game.timeControl}</span>
                <span>{game.movesNb || 0} plies</span>
                <span>{game.date}</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function GameReview() {
  const [source, setSource] = useState(DEFAULT_SOURCE);
  const [pgnText, setPgnText] = useState('');
  const [gameData, setGameData] = useState(null);
  const [currentPly, setCurrentPly] = useState(0);
  const [orientation, setOrientation] = useState('white');
  const [engineState, setEngineState] = useState('idle');
  const [engineError, setEngineError] = useState('');
  const [depth, setDepth] = useState(DEFAULT_DEPTH);
  const [multiPv, setMultiPv] = useState(DEFAULT_MULTI_PV);
  const [positionEval, setPositionEval] = useState(null);
  const [gameAnalysis, setGameAnalysis] = useState(null);
  const [gameProgress, setGameProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Load a game to start review.');
  const [copied, setCopied] = useState(false);
  const [remoteUsername, setRemoteUsername] = useState('');
  const [remoteGames, setRemoteGames] = useState([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState('');
  const [selectedRemoteGameId, setSelectedRemoteGameId] = useState('');
  const [packBatchSize, setPackBatchSize] = useState(DEFAULT_PACK_BATCH);
  const [packSideFilter, setPackSideFilter] = useState('all');
  const [packSpeedFilter, setPackSpeedFilter] = useState('all');
  const [packBuilding, setPackBuilding] = useState(false);
  const [packProgress, setPackProgress] = useState({ current: 0, total: 0, label: '' });
  const [, setPackSummary] = useState(null);
  const [packPuzzles, setPackPuzzles] = useState([]);
  const [trainingSource, setTrainingSource] = useState('single');
  const [playOrientation, setPlayOrientation] = useState('white');
  const [playFen, setPlayFen] = useState('start');
  const [playStatus, setPlayStatus] = useState('Choose a side and start a game.');
  const [playThinking, setPlayThinking] = useState(false);
  const [playMoveHistory, setPlayMoveHistory] = useState([]);
  const [playLastMove, setPlayLastMove] = useState(null);
  const [playTimeMs, setPlayTimeMs] = useState(DEFAULT_PLAY_TIME);
  const [playResult, setPlayResult] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarMode, setSidebarMode] = useState('load');
  const [autoReviewQueued, setAutoReviewQueued] = useState(false);
  const [showEngineBoard, setShowEngineBoard] = useState(false);
  const [boardWidth, setBoardWidth] = useState(500);
  const [playerVisuals, setPlayerVisuals] = useState({ white: null, black: null });
  const [reviewSettings, setReviewSettings] = useState(loadReviewSettings);
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [puzzleFen, setPuzzleFen] = useState('start');
  const [puzzleStatus, setPuzzleStatus] = useState('idle');
  const [puzzleFeedback, setPuzzleFeedback] = useState('Load a game to start training.');
  const [puzzleResults, setPuzzleResults] = useState({});
  const [puzzleHintOpen, setPuzzleHintOpen] = useState(false);
  const [puzzleShowSolution, setPuzzleShowSolution] = useState(false);
  const [puzzleSelectedSquare, setPuzzleSelectedSquare] = useState(null);
  const [puzzleLegalTargets, setPuzzleLegalTargets] = useState([]);
  const [playSelectedSquare, setPlaySelectedSquare] = useState(null);
  const [playLegalTargets, setPlayLegalTargets] = useState([]);
  const [puzzleConfettiActive, setPuzzleConfettiActive] = useState(false);

  const fileInputRef = useRef(null);
  const engineRef = useRef(null);
  const initPromiseRef = useRef(null);
  const positionRequestRef = useRef(0);
  const runRequestRef = useRef(0);
  const cacheRef = useRef(new Map());
  const remoteAbortRef = useRef(null);
  const playGameRef = useRef(new Chess());
  const boardFrameRef = useRef(null);
  const autoReviewRunningRef = useRef(false);
  const sfxRef = useRef({});
  const lastReviewPlySoundRef = useRef(0);
  const puzzleRequestRef = useRef(0);
  const puzzleAdvanceTimerRef = useRef(null);
  const puzzleConfettiTimerRef = useRef(null);

  const currentPosition = gameData && gameData.positions ? gameData.positions[currentPly] : null;
  const currentMove = gameData && gameData.moves && currentPly > 0 ? gameData.moves[currentPly - 1] : null;
  const currentClassification = currentMove && currentMove.classification ? CLASSIFICATION_META[currentMove.classification] : null;
  const playerSummary = useMemo(() => {
    const headers = gameData && gameData.headers ? gameData.headers : null;
    return {
      white: getHeaderPlayer(headers, 'white'),
      black: getHeaderPlayer(headers, 'black'),
    };
  }, [gameData]);
  const classificationCounts = useMemo(() => getMoveClassificationCounts(gameData && gameData.moves), [gameData]);
  const currentInsight = useMemo(() => getMoveInsight(currentMove, currentClassification, gameData && gameData.match), [currentMove, currentClassification, gameData]);
  const boardSquareStyles = useMemo(() => {
    if (!currentMove) return {};
    return {
      [currentMove.from]: { backgroundColor: 'rgba(255, 208, 96, 0.24)' },
      [currentMove.to]: { backgroundColor: currentMove.classification === 'best' ? 'rgba(136, 214, 82, 0.28)' : 'rgba(137, 97, 255, 0.20)' },
    };
  }, [currentMove]);
  const boardThemeStyles = useMemo(() => {
    const key = reviewSettings && reviewSettings.boardTheme ? reviewSettings.boardTheme : DEFAULT_THEME;
    return BOARD_THEMES[key] || BOARD_THEMES[DEFAULT_THEME] || {};
  }, [reviewSettings]);
  const pieceThemeUrl = useMemo(() => getPieceThemeUrl(reviewSettings && reviewSettings.pieceTheme), [reviewSettings]);
  const playSquareStyles = useMemo(() => {
    const styles = {};

    if (playLastMove) {
      styles[playLastMove.from] = { backgroundColor: 'rgba(255, 208, 96, 0.24)' };
      styles[playLastMove.to] = { backgroundColor: 'rgba(137, 97, 255, 0.2)' };
    }

    if (playSelectedSquare) {
      styles[playSelectedSquare] = {
        ...(styles[playSelectedSquare] || {}),
        boxShadow: 'inset 0 0 0 3px rgba(137, 97, 255, 0.82)',
        backgroundColor: 'rgba(137, 97, 255, 0.22)',
      };
    }

    playLegalTargets.forEach((square) => {
      styles[square] = {
        ...(styles[square] || {}),
        boxShadow: 'inset 0 0 0 3px rgba(255, 208, 96, 0.70)',
        backgroundColor: 'rgba(255, 208, 96, 0.18)',
      };
    });

    return styles;
  }, [playLastMove, playLegalTargets, playSelectedSquare]);
  const puzzleSquareStyles = useMemo(() => {
    const styles = {};

    if (puzzleSelectedSquare) {
      styles[puzzleSelectedSquare] = {
        boxShadow: 'inset 0 0 0 3px rgba(137, 97, 255, 0.82)',
        backgroundColor: 'rgba(137, 97, 255, 0.22)',
      };
    }

    puzzleLegalTargets.forEach((square) => {
      styles[square] = {
        ...(styles[square] || {}),
        boxShadow: 'inset 0 0 0 3px rgba(255, 208, 96, 0.70)',
        backgroundColor: 'rgba(255, 208, 96, 0.18)',
      };
    });

    return styles;
  }, [puzzleLegalTargets, puzzleSelectedSquare]);
  const hasLoadedGame = Boolean(gameData && gameData.moves && gameData.moves.length);
  const hasFullReview = Boolean(gameAnalysis && gameAnalysis.positions && gameAnalysis.positions.length);
  const puzzleQueue = useMemo(() => buildPuzzleQueue(gameData), [gameData]);
  const activePuzzleQueue = trainingSource === 'pack' ? packPuzzles : puzzleQueue;
  const currentPuzzle = activePuzzleQueue[puzzleIndex] || null;
  const currentPuzzleResult = currentPuzzle ? puzzleResults[currentPuzzle.id] : '';
  const solvedPuzzleCount = activePuzzleQueue.filter((puzzle) => puzzleResults[puzzle.id] === 'solved').length;
  const canOpenSingleGameViews = hasLoadedGame && trainingSource !== 'pack';
  const isPuzzleMode = (hasLoadedGame || activePuzzleQueue.length > 0) && sidebarMode === 'puzzles';
  const stagePlayerSummary = trainingSource === 'pack' && currentPuzzle
    ? {
        white: {
          name: currentPuzzle.whiteName || 'White',
          rating: currentPuzzle.whiteRating || '',
          title: currentPuzzle.whiteTitle || '',
        },
        black: {
          name: currentPuzzle.blackName || 'Black',
          rating: currentPuzzle.blackRating || '',
          title: currentPuzzle.blackTitle || '',
        },
      }
    : playerSummary;
  const effectiveBoardOrientation = trainingSource === 'pack' && currentPuzzle ? (currentPuzzle.color === 'b' ? 'black' : 'white') : orientation;
  const topProgressPercent = activePuzzleQueue.length
    ? Math.round((solvedPuzzleCount / activePuzzleQueue.length) * 100)
    : engineState === 'analyzing-game'
      ? gameProgress
      : 0;
  const shellProgressStyle = { '--gr-top-progress': `${topProgressPercent}%` };
  const sidebarPanelStyle = { '--gr-sidebar-target-height': `${boardWidth + 26}px` };
  const puzzlePlayedMarkerId = useMemo(() => `grPuzzleArrowHeadPlayed-${Math.random().toString(36).slice(2, 9)}`, []);
  const puzzleBestMarkerId = useMemo(() => `grPuzzleArrowHeadBest-${Math.random().toString(36).slice(2, 9)}`, []);
  const sidebarHeading = !hasLoadedGame && !activePuzzleQueue.length ? 'Import' : sidebarMode === 'overview' ? 'Overview' : sidebarMode === 'moves' ? 'Move Review' : sidebarMode === 'puzzles' ? (trainingSource === 'pack' ? 'Personal Pack' : 'Mistake Training') : 'Import';
  const shouldShowLoadView = (!hasLoadedGame && !activePuzzleQueue.length) || sidebarMode === 'load';
  const shouldShowOverviewView = canOpenSingleGameViews && sidebarMode === 'overview';
  const queueAutoReview = useCallback(() => {
    setSidebarMode('load');
    setAutoReviewQueued(true);
  }, []);

  const setPuzzleOutcome = useCallback((puzzleId, outcome) => {
    if (!puzzleId || !outcome) return;

    setPuzzleResults((previous) => {
      const existing = previous[puzzleId];

      if (existing === 'failed') return previous;
      if (existing === outcome) return previous;

      return {
        ...previous,
        [puzzleId]: outcome,
      };
    });
  }, []);

  const playSfx = useCallback((key) => {
    if (!reviewSettings || !reviewSettings.playSounds) return;
    const audio = sfxRef.current && sfxRef.current[key];
    if (!audio) return;

    try {
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') playPromise.catch(() => {});
    } catch (_) {}
  }, [reviewSettings]);

  const clearPuzzleSelection = useCallback(() => {
    setPuzzleSelectedSquare(null);
    setPuzzleLegalTargets([]);
  }, []);

  const clearPlaySelection = useCallback(() => {
    setPlaySelectedSquare(null);
    setPlayLegalTargets([]);
  }, []);

  const getLegalTargetsForFen = useCallback((fen, fromSquare) => {
    if (!fen || !fromSquare) return [];

    try {
      const game = new Chess(fen);
      const moves = game.moves({ square: fromSquare, verbose: true });
      if (!moves || !moves.length) return [];
      return moves.map((move) => move.to);
    } catch (_) {
      return [];
    }
  }, []);

  const triggerPuzzleSolvedCelebration = useCallback(() => {
    if (!reviewSettings || reviewSettings.showConfetti === false) return;

    setPuzzleConfettiActive(true);

    if (puzzleConfettiTimerRef.current) {
      window.clearTimeout(puzzleConfettiTimerRef.current);
    }

    puzzleConfettiTimerRef.current = window.setTimeout(() => {
      setPuzzleConfettiActive(false);
      puzzleConfettiTimerRef.current = null;
    }, 1100);
  }, [reviewSettings]);

  const ensureEngineReady = useCallback(async () => {
    if (engineRef.current) return engineRef.current;
    if (initPromiseRef.current) return initPromiseRef.current;

    initPromiseRef.current = new Promise((resolve, reject) => {
      try {
        setEngineState('starting');
        setEngineError('');
        setStatusMessage('Starting Stockfish…');

        const worker = new window.Worker(ENGINE_PATH);
        const handle = { worker, listener: null };

        worker.onmessage = (event) => {
          if (handle.listener) handle.listener(String(event.data || ''));
        };

        worker.onerror = () => {
          setEngineState('error');
          setEngineError('The analysis worker failed to start.');
          setStatusMessage('Stockfish failed to start.');
          initPromiseRef.current = null;
          reject(new Error('worker start failed'));
        };

        sendCommandsToWorker(handle, ['uci'], 'uciok', null, 10000)
          .then(() => sendCommandsToWorker(handle, [`setoption name MultiPV value ${multiPv}`, 'isready'], 'readyok', null, 10000))
          .then(() => {
            engineRef.current = handle;
            setEngineState('ready');
            setStatusMessage('Stockfish is ready.');
            resolve(handle);
          })
          .catch((error) => {
            setEngineState('error');
            setEngineError('Engine startup failed.');
            setStatusMessage('Stockfish failed to start.');
            initPromiseRef.current = null;
            reject(error);
          });
      } catch (error) {
        setEngineState('error');
        setEngineError('Your browser blocked engine startup.');
        setStatusMessage('Stockfish failed to start.');
        initPromiseRef.current = null;
        reject(error);
      }
    });

    return initPromiseRef.current;
  }, [multiPv]);

  const stopSearch = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) return;
    try {
      await sendCommandsToWorker(engine, ['stop', 'isready'], 'readyok', null, 4000);
    } catch (_) {}
  }, []);

  const evaluateFen = useCallback(async (fen, options) => {
    const { depth: nextDepth, multiPv: nextMultiPv, partialCallback, requestId } = options;
    const cacheKey = `${fen}|d${nextDepth}|pv${nextMultiPv}`;
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      if (partialCallback) partialCallback(cached);
      return cached;
    }

    const whoIsCheckmated = getWhoIsCheckmated(fen);
    if (whoIsCheckmated) {
      const mateEval = { lines: [{ pv: [], depth: 0, multiPv: 1, mate: whoIsCheckmated === 'w' ? -1 : 1 }] };
      cacheRef.current.set(cacheKey, mateEval);
      if (partialCallback) partialCallback(mateEval);
      return mateEval;
    }

    if (getIsStalemate(fen)) {
      const drawEval = { lines: [{ pv: [], depth: 0, multiPv: 1, cp: 0 }] };
      cacheRef.current.set(cacheKey, drawEval);
      if (partialCallback) partialCallback(drawEval);
      return drawEval;
    }

    const engine = await ensureEngineReady();
    await stopSearch();
    await sendCommandsToWorker(engine, [`setoption name MultiPV value ${nextMultiPv}`, 'isready'], 'readyok', null, 10000);

    const results = await sendCommandsToWorker(
      engine,
      [`position fen ${fen}`, `go depth ${nextDepth}`],
      'bestmove',
      (messages) => {
        if (requestId !== undefined && requestId !== positionRequestRef.current && requestId !== runRequestRef.current) {
          return;
        }
        if (!partialCallback) return;
        const parsed = parseEvaluationResults(messages, fen);
        if (parsed.lines.length) partialCallback(parsed);
      },
      45000
    );

    const parsed = parseEvaluationResults(results, fen);
    cacheRef.current.set(cacheKey, parsed);
    return parsed;
  }, [ensureEngineReady, stopSearch]);

  const analyzeCurrentPosition = useCallback(async (plyOverride) => {
    if (!gameData || !gameData.positions) return;

    const targetPly = typeof plyOverride === 'number' ? plyOverride : currentPly;
    const position = gameData.positions[targetPly];
    if (!position) return;

    positionRequestRef.current += 1;
    const requestId = positionRequestRef.current;
    setEngineState('analyzing-position');
    setStatusMessage(`Analyzing move ${targetPly}…`);
    setEngineError('');

    try {
      const result = await evaluateFen(position.fen, {
        depth,
        multiPv,
        requestId,
        partialCallback: (partial) => {
          if (requestId !== positionRequestRef.current) return;
          setPositionEval(partial);
        },
      });

      if (requestId !== positionRequestRef.current) return;
      setPositionEval(result);
      setEngineState('ready');
      setStatusMessage(`Position ${targetPly} analyzed.`);
    } catch (_) {
      if (requestId !== positionRequestRef.current) return;
      setEngineState('error');
      setEngineError('Position analysis failed.');
      setStatusMessage('Position analysis failed.');
    }
  }, [currentPly, depth, evaluateFen, gameData, multiPv]);

  const analyzeWholeGame = useCallback(async () => {
    if (!gameData || !gameData.positions || !gameData.moves) return;

    runRequestRef.current += 1;
    const requestId = runRequestRef.current;
    positionRequestRef.current = requestId;
    setEngineState('analyzing-game');
    setEngineError('');
    setGameProgress(0);
    setStatusMessage('Analyzing every position…');

    try {
      const evaluatedPositions = [];

      for (let i = 0; i < gameData.positions.length; i += 1) {
        if (requestId !== runRequestRef.current) return;

        const position = gameData.positions[i];
        const result = await evaluateFen(position.fen, {
          depth,
          multiPv,
          requestId,
          partialCallback: i === currentPly
            ? (partial) => {
                if (requestId !== runRequestRef.current) return;
                setPositionEval(partial);
              }
            : null,
        });

        evaluatedPositions.push(result);
        setGameProgress(Math.round(((i + 1) / gameData.positions.length) * 100));
      }

      if (requestId !== runRequestRef.current) return;

      const enrichedMoves = gameData.moves.map((move, index) => ({
        ...move,
        classification: classifyMove(evaluatedPositions[index], evaluatedPositions[index + 1], move),
        bestMove: evaluatedPositions[index] && evaluatedPositions[index].bestMove ? evaluatedPositions[index].bestMove : null,
        evaluationBefore: evaluatedPositions[index],
        evaluationAfter: evaluatedPositions[index + 1],
      }));

      const updatedGameData = {
        ...gameData,
        moves: enrichedMoves,
      };

      setGameData(updatedGameData);
      setPositionEval(evaluatedPositions[currentPly] || null);
      setGameAnalysis({
        positions: evaluatedPositions,
        accuracy: computeAccuracy(evaluatedPositions),
        acpl: computeAcpl(evaluatedPositions, enrichedMoves),
      });
      setEngineState('ready');
      setStatusMessage('Full review finished.');
    } catch (_) {
      if (requestId !== runRequestRef.current) return;
      setEngineState('error');
      setEngineError('Full game analysis failed.');
      setStatusMessage('Full game analysis failed.');
    }
  }, [currentPly, depth, evaluateFen, gameData, multiPv]);

  const handleStop = useCallback(async () => {
    runRequestRef.current += 1;
    positionRequestRef.current += 1;
    await stopSearch();
    setEngineState(engineRef.current ? 'ready' : 'idle');
    setStatusMessage(engineRef.current ? 'Analysis stopped.' : 'Stockfish is idle.');
  }, [stopSearch]);

  const resetReviewStateFromParsed = useCallback((parsed, nextPgn, nextOrientation) => {
    setEngineError('');
    setGameAnalysis(null);
    setPositionEval(null);
    setGameProgress(0);
    setCurrentPly(0);
    setSidebarMode('load');
    setOrientation(nextOrientation || parsed.orientation || 'white');
    setGameData(parsed);
    setPgnText(nextPgn);
    setTrainingSource('single');
    setPuzzleIndex(0);
    setPuzzleFen('start');
    setPuzzleStatus('idle');
    setPuzzleFeedback('Game loaded. Building training spots...');
    setPuzzleResults({});
    setPuzzleHintOpen(false);
    setPuzzleShowSolution(false);
    setStatusMessage('Game loaded.');
  }, []);

  const handleLoadPgn = useCallback(() => {
    const parsed = parsePgn(pgnText, orientation);
    if (!parsed.ok) {
      setEngineError(parsed.error || 'Could not parse that PGN.');
      return;
    }
    resetReviewStateFromParsed(parsed, pgnText, orientation);
    queueAutoReview();
  }, [orientation, pgnText, queueAutoReview, resetReviewStateFromParsed]);

  const handleUseSample = useCallback(() => {
    const parsed = parsePgn(SAMPLE_PGN, 'white');
    if (parsed.ok) {
      resetReviewStateFromParsed(parsed, SAMPLE_PGN, 'white');
      setEngineError('');
      setSource('pgn');
      queueAutoReview();
    }
  }, [queueAutoReview, resetReviewStateFromParsed]);

  const handleUpload = useCallback((event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const parsed = parsePgn(text, orientation);
      if (!parsed.ok) {
        setEngineError(parsed.error || 'Could not parse that file.');
        return;
      }
      resetReviewStateFromParsed(parsed, text, orientation);
      setStatusMessage(`${file.name} loaded.`);
      setSource('pgn');
      queueAutoReview();
    };
    reader.readAsText(file);
    event.target.value = '';
  }, [orientation, queueAutoReview, resetReviewStateFromParsed]);

  const handleCopyPgn = useCallback(async () => {
    if (!gameData || !gameData.pgn) return;
    try {
      await navigator.clipboard.writeText(gameData.pgn);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch (_) {}
  }, [gameData]);

  const handleLoadRemoteGames = useCallback(async () => {
    const username = remoteUsername.trim();
    if (!username) {
      setRemoteError('Enter a username first.');
      setRemoteGames([]);
      return;
    }

    if (remoteAbortRef.current) {
      try { remoteAbortRef.current.abort(); } catch (_) {}
    }
    const controller = new window.AbortController();
    remoteAbortRef.current = controller;

    setRemoteLoading(true);
    setRemoteError('');
    setRemoteGames([]);
    setSelectedRemoteGameId('');

    try {
      const loader = source === 'lichess' ? getLichessUserRecentGames : getChessComUserRecentGames;
      const games = await loader(username, controller.signal);
      setRemoteGames(games);
      if (!games.length) {
        setRemoteError(`No recent ${source === 'lichess' ? 'Lichess' : 'Chess.com'} games were found.`);
      }
    } catch (_) {
      if (controller.signal.aborted) return;
      setRemoteError(`Could not load games from ${source === 'lichess' ? 'Lichess' : 'Chess.com'}.`);
    } finally {
      if (remoteAbortRef.current === controller) {
        remoteAbortRef.current = null;
      }
      setRemoteLoading(false);
    }
  }, [remoteUsername, source]);

  const handleSelectRemoteGame = useCallback((game) => {
    const username = remoteUsername.trim().toLowerCase();
    const nextOrientation = game.black.name.toLowerCase() === username ? 'black' : 'white';
    const parsed = parsePgn(game.pgn, nextOrientation);
    if (!parsed.ok) {
      setEngineError(parsed.error || 'Could not parse that game.');
      return;
    }
    setSelectedRemoteGameId(game.id);
    resetReviewStateFromParsed(parsed, game.pgn, nextOrientation);
    setStatusMessage(`${source === 'lichess' ? 'Lichess' : 'Chess.com'} game loaded.`);
    queueAutoReview();
  }, [queueAutoReview, remoteUsername, resetReviewStateFromParsed, source]);

  const handleBuildPersonalPack = async () => {
    const username = remoteUsername.trim();
    if (!username) {
      setRemoteError('Enter a username first.');
      return;
    }

    const selectedGames = remoteGames
      .filter((game) => matchesPackFilters(game, username, packSideFilter, packSpeedFilter))
      .slice(0, packBatchSize);
    const prioritizedGames = selectedGames
      .slice()
      .sort((a, b) => (a.movesNb || 0) - (b.movesNb || 0));

    if (!selectedGames.length) {
      setStatusMessage('No recent games matched the current pack filters.');
      setPackSummary(null);
      setPackPuzzles([]);
      return;
    }

    runRequestRef.current += 1;
    const requestId = runRequestRef.current;
    const requestPrefix = `pack-${requestId}`;

    setEngineError('');
    setPackBuilding(true);
    setPackProgress({ current: 0, total: selectedGames.length, label: '' });
    setPackSummary(null);
    setPackPuzzles([]);
    setPuzzleResults({});
    setPuzzleIndex(0);
    setPuzzleFen('start');
    setPuzzleStatus('idle');
    setPuzzleHintOpen(false);
    setPuzzleShowSolution(false);
    clearPuzzleSelection();
    setSidebarMode('load');
    setEngineState('analyzing');
    setStatusMessage(`Building pack from ${selectedGames.length} games...`);

    try {
      await stopSearch();
      const analyzedGames = [];
      let revealedSeedQueue = false;
      let visiblePackQueue = [];

      for (let gameIndex = 0; gameIndex < prioritizedGames.length; gameIndex += 1) {
        if (requestId !== runRequestRef.current) {
          return;
        }

        const remoteGame = prioritizedGames[gameIndex];
        const nextOrientation = getGameSideForUsername(remoteGame, username);
        const parsed = parsePgn(remoteGame.pgn, nextOrientation);

        setPackProgress({
          current: gameIndex + 1,
          total: selectedGames.length,
          label: `${remoteGame.white.name} vs ${remoteGame.black.name}`,
        });

        if (!parsed.ok || !parsed.positions || !parsed.positions.length) {
          continue;
        }

        const evaluationIndexes = getPackEvaluationIndexes(parsed);
        if (!evaluationIndexes.length) {
          continue;
        }

        const evaluatedPositions = new Array(parsed.positions.length);
        for (let i = 0; i < evaluationIndexes.length; i += 1) {
          if (requestId !== runRequestRef.current) {
            return;
          }

          const positionIndex = evaluationIndexes[i];
          const position = parsed.positions[positionIndex];
          if (!position) {
            continue;
          }

          const result = await evaluateFen(position.fen, {
            depth,
            multiPv,
            requestId: `${requestPrefix}-${gameIndex}-${positionIndex}`,
          });
          evaluatedPositions[positionIndex] = result;
        }

        const enrichedMoves = parsed.moves.map((move, index) => ({
          ...move,
          classification: classifyMove(evaluatedPositions[index], evaluatedPositions[index + 1], move),
          bestMove: evaluatedPositions[index] && evaluatedPositions[index].bestMove ? evaluatedPositions[index].bestMove : null,
          evaluationBefore: evaluatedPositions[index],
          evaluationAfter: evaluatedPositions[index + 1],
        }));

        analyzedGames.push({
          sourceGame: remoteGame,
          gameData: {
            ...parsed,
            moves: enrichedMoves,
          },
        });

        const partialPack = buildPersonalPack(analyzedGames);
        const partialSummary = {
          gamesRequested: selectedGames.length,
          gamesAnalyzed: analyzedGames.length,
          puzzles: partialPack.puzzles.length,
          themes: partialPack.themes,
          topOpenings: partialPack.topOpenings,
          candidateCount: partialPack.candidateCount,
        };

        setPackSummary(partialSummary);

        if (!revealedSeedQueue && partialPack.puzzles.length) {
          visiblePackQueue = partialPack.puzzles.slice(0, PACK_SEED_PUZZLES);
          setPackPuzzles(visiblePackQueue);
          setTrainingSource('pack');
          setSidebarMode('puzzles');
          setStatusMessage(
            visiblePackQueue.length > 1
              ? `First ${visiblePackQueue.length} personal pack puzzles ready. Loading the rest...`
              : 'First personal pack puzzle ready. Loading the rest...'
          );
          revealedSeedQueue = true;
          await waitForNextPaint();
          continue;
        }

        if (revealedSeedQueue) {
          const nextVisibleQueue = mergePackPuzzleQueue(visiblePackQueue, partialPack.puzzles);
          if (nextVisibleQueue.length !== visiblePackQueue.length) {
            visiblePackQueue = nextVisibleQueue;
            setPackPuzzles((previous) => {
              const merged = mergePackPuzzleQueue(previous, partialPack.puzzles);
              return merged.length === previous.length ? previous : merged;
            });
            setStatusMessage(`Loaded ${visiblePackQueue.length} personal pack puzzles. Analyzing the rest...`);
            await waitForNextPaint();
          }
        }
      }

      if (requestId !== runRequestRef.current) {
        return;
      }

      if (!analyzedGames.length) {
        setPackSummary({
          gamesRequested: selectedGames.length,
          gamesAnalyzed: 0,
          puzzles: 0,
          themes: [],
          topOpenings: [],
          candidateCount: 0,
        });
        setTrainingSource('pack');
        setSidebarMode('puzzles');
        setEngineState('ready');
        setStatusMessage('No analyzable games were found for this pack.');
        return;
      }

      const finalPack = buildPersonalPack(analyzedGames);
      const finalQueue = revealedSeedQueue
        ? mergePackPuzzleQueue(visiblePackQueue, finalPack.puzzles)
        : finalPack.puzzles;

      setPackPuzzles(finalQueue);
      setPackSummary({
        gamesRequested: selectedGames.length,
        gamesAnalyzed: analyzedGames.length,
        puzzles: finalQueue.length,
        themes: finalPack.themes,
        topOpenings: finalPack.topOpenings,
        candidateCount: finalPack.candidateCount,
      });
      setTrainingSource('pack');
      setSidebarMode('puzzles');
      setEngineState('ready');
      setStatusMessage(finalQueue.length ? `Personal pack ready with ${finalQueue.length} puzzles.` : 'Pack analysis finished, but no strong puzzle spots survived filtering.');
    } catch (_) {
      if (requestId !== runRequestRef.current) {
        return;
      }
      setEngineState('error');
      setEngineError('Personal pack analysis failed.');
      setStatusMessage('Personal pack analysis failed.');
    } finally {
      if (requestId === runRequestRef.current) {
        setPackBuilding(false);
        setPackProgress({ current: 0, total: 0, label: '' });
      }
    }
  };

  const getBestMoveForCurrentPosition = useCallback(async (fen, movetime) => {
    const engine = await ensureEngineReady();
    await stopSearch();

    const results = await sendCommandsToWorker(
      engine,
      [`position fen ${fen}`, `go movetime ${movetime}`],
      'bestmove',
      null,
      Math.max(8000, movetime + 6000)
    );

    const bestLine = String(results.find((line) => String(line).startsWith('bestmove')) || '');
    const move = getResultProperty(bestLine, 'bestmove');
    if (!move || move === '(none)') {
      throw new Error('No best move returned.');
    }
    return move;
  }, [ensureEngineReady, stopSearch]);

  const syncPlayState = useCallback((statusText, moveOverride) => {
    setPlayFen(playGameRef.current.fen());
    setPlayMoveHistory(playGameRef.current.history({ verbose: true }));
    if (moveOverride) {
      setPlayLastMove({ from: moveOverride.from, to: moveOverride.to });
    }
    const game = playGameRef.current;
    if (game.in_checkmate()) {
      const winner = game.turn() === 'w' ? 'Black' : 'White';
      setPlayResult(`${winner} wins by checkmate.`);
      setPlayStatus(`${winner} wins by checkmate.`);
      return;
    }
    if (game.in_draw() || game.in_stalemate() || game.in_threefold_repetition()) {
      setPlayResult('Game drawn.');
      setPlayStatus('Game drawn.');
      return;
    }
    setPlayResult('');
    setPlayStatus(statusText);
  }, []);

  const makeEngineMove = useCallback(async () => {
    const game = playGameRef.current;
    if (game.game_over()) return;

    setPlayThinking(true);
    setPlayStatus('Engine thinking…');

    try {
      const bestMove = await getBestMoveForCurrentPosition(game.fen(), playTimeMs);
      const applied = game.move(uciToMoveObject(bestMove));
      if (!applied) {
        throw new Error('Engine move was illegal.');
      }
      playSfx(isCaptureLike(applied) ? 'capture' : 'moveOpponent');
      syncPlayState('Your move.', applied);
    } catch (_) {
      setEngineError('Engine move failed.');
      setPlayStatus('Engine move failed.');
    } finally {
      setPlayThinking(false);
    }
  }, [getBestMoveForCurrentPosition, playSfx, playTimeMs, syncPlayState]);

  const startPlayGame = useCallback(async (side) => {
    await handleStop();
    playGameRef.current = new Chess();
    setPlayOrientation(side);
    setPlayLastMove(null);
    clearPlaySelection();
    setPlayThinking(false);
    setPlayResult('');
    setShowEngineBoard(true);
    syncPlayState(side === 'black' ? 'Engine to move first…' : 'Your move.');

    if (side === 'black') {
      await makeEngineMove();
    }
  }, [clearPlaySelection, handleStop, makeEngineMove, syncPlayState]);

  const handlePlayDrop = useCallback(async ({ sourceSquare, targetSquare }) => {
    if (playThinking || playResult) return;
    clearPlaySelection();
    const game = playGameRef.current;
    const playerTurn = playOrientation === 'white' ? 'w' : 'b';
    if (game.turn() !== playerTurn) return;

    const move = game.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q',
    });

    if (!move) {
      playSfx('illegal');
      return;
    }

    playSfx(isCaptureLike(move) ? 'capture' : 'moveSelf');
    syncPlayState('Engine thinking…', move);
    await makeEngineMove();
  }, [clearPlaySelection, makeEngineMove, playOrientation, playResult, playSfx, playThinking, syncPlayState]);

  const handlePlaySquareClick = useCallback((square) => {
    if (playThinking || playResult) return;

    const game = playGameRef.current;
    const playerTurn = playOrientation === 'white' ? 'w' : 'b';
    if (game.turn() !== playerTurn) return;

    const piece = game.get(square);

    if (!playSelectedSquare) {
      if (!piece || piece.color !== playerTurn) return;
      setPlaySelectedSquare(square);
      setPlayLegalTargets(getLegalTargetsForFen(game.fen(), square));
      return;
    }

    if (square === playSelectedSquare) {
      clearPlaySelection();
      return;
    }

    if (piece && piece.color === playerTurn) {
      setPlaySelectedSquare(square);
      setPlayLegalTargets(getLegalTargetsForFen(game.fen(), square));
      return;
    }

    const selectedPiece = game.get(playSelectedSquare);
    const pieceCode = selectedPiece ? `${selectedPiece.color}${selectedPiece.type.toUpperCase()}` : undefined;
    handlePlayDrop({ sourceSquare: playSelectedSquare, targetSquare: square, piece: pieceCode });
  }, [clearPlaySelection, getLegalTargetsForFen, handlePlayDrop, playOrientation, playResult, playSelectedSquare, playThinking]);

  const goToPreviousPuzzle = useCallback(() => {
    if (!activePuzzleQueue.length) return;
    setPuzzleIndex((value) => Math.max(0, value - 1));
  }, [activePuzzleQueue.length]);

  const goToNextPuzzle = useCallback(() => {
    if (!activePuzzleQueue.length) return;
    setPuzzleIndex((value) => Math.min(activePuzzleQueue.length - 1, value + 1));
  }, [activePuzzleQueue.length]);

  const handleRevealPuzzleSolution = useCallback(() => {
    if (!currentPuzzle) return;

    clearPuzzleSelection();
    setPuzzleFen(currentPuzzle.beforeFen);
    setPuzzleShowSolution(true);
    setPuzzleHintOpen(false);
    setPuzzleStatus('revealed');
    setPuzzleOutcome(currentPuzzle.id, 'failed');
    setPuzzleFeedback(`Best was ${currentPuzzle.bestSan}. In the game you played ${currentPuzzle.playedSan}.`);
  }, [clearPuzzleSelection, currentPuzzle, setPuzzleOutcome]);

  const handlePuzzleDrop = useCallback(async ({ sourceSquare, targetSquare, piece }) => {
    if (!currentPuzzle || puzzleStatus === 'checking' || puzzleStatus === 'solved') {
      return;
    }

    clearPuzzleSelection();
    const game = new Chess(currentPuzzle.beforeFen);
    const shouldPromote = /P$/i.test(String(piece || '')) && (targetSquare[1] === '1' || targetSquare[1] === '8');
    const move = game.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: shouldPromote ? 'q' : undefined,
    });

    if (!move) {
      playSfx('illegal');
      return;
    }

    playSfx(isCaptureLike(move) ? 'capture' : 'moveSelf');
    setPuzzleHintOpen(false);
    setPuzzleShowSolution(false);
    setPuzzleStatus('checking');
    setPuzzleFen(game.fen());

    const attemptedUci = moveToUci(move);
    const attemptedSan = move.san;

    try {
      let accepted = attemptedUci === currentPuzzle.bestMove;

      if (!accepted) {
        puzzleRequestRef.current += 1;
        const candidateEval = await evaluateFen(game.fen(), {
          depth,
          multiPv: 1,
          requestId: `puzzle-${puzzleRequestRef.current}`,
        });

        const candidatePerspectiveCp = getPerspectivePositionCp(candidateEval, currentPuzzle.color);
        const cpLossFromBest = Math.max(0, currentPuzzle.beforePerspectiveCp - candidatePerspectiveCp);
        const cpGainVsPlayed = candidatePerspectiveCp - currentPuzzle.afterPerspectiveCp;

        accepted = cpLossFromBest <= 45 || (cpGainVsPlayed >= 110 && cpLossFromBest <= 110);
      }

      if (accepted) {
        setPuzzleStatus('solved');
        setPuzzleOutcome(currentPuzzle.id, 'solved');
        triggerPuzzleSolvedCelebration();
        setPuzzleFeedback(
          attemptedUci === currentPuzzle.bestMove
            ? `Best move found: ${attemptedSan}. In the game you played ${currentPuzzle.playedSan}.`
            : `${attemptedSan} is much better than ${currentPuzzle.playedSan}. Engine best was ${currentPuzzle.bestSan}.`
        );
        return;
      }

      setPuzzleOutcome(currentPuzzle.id, 'failed');
      setPuzzleStatus('failed');
      setPuzzleFen(currentPuzzle.beforeFen);
      setPuzzleFeedback(`${attemptedSan} still misses it. In the game you played ${currentPuzzle.playedSan}. Use Hint or Solution and look again.`);
    } catch (_) {
      setPuzzleOutcome(currentPuzzle.id, 'failed');
      setPuzzleStatus('failed');
      setPuzzleFen(currentPuzzle.beforeFen);
      setPuzzleFeedback('That move could not be scored cleanly. Try again or reveal the solution.');
    }
  }, [clearPuzzleSelection, currentPuzzle, depth, evaluateFen, playSfx, puzzleStatus, setPuzzleOutcome, triggerPuzzleSolvedCelebration]);

  const handlePuzzleSquareClick = useCallback((square) => {
    if (!currentPuzzle || puzzleStatus === 'checking' || puzzleStatus === 'solved') {
      return;
    }

    const game = new Chess(puzzleFen || currentPuzzle.beforeFen);
    const piece = game.get(square);

    if (!puzzleSelectedSquare) {
      if (!piece || piece.color !== currentPuzzle.color) return;
      setPuzzleSelectedSquare(square);
      setPuzzleLegalTargets(getLegalTargetsForFen(game.fen(), square));
      return;
    }

    if (square === puzzleSelectedSquare) {
      clearPuzzleSelection();
      return;
    }

    if (piece && piece.color === currentPuzzle.color) {
      setPuzzleSelectedSquare(square);
      setPuzzleLegalTargets(getLegalTargetsForFen(game.fen(), square));
      return;
    }

    const selectedPiece = game.get(puzzleSelectedSquare);
    const pieceCode = selectedPiece ? `${selectedPiece.color}${selectedPiece.type.toUpperCase()}` : undefined;
    handlePuzzleDrop({ sourceSquare: puzzleSelectedSquare, targetSquare: square, piece: pieceCode });
  }, [clearPuzzleSelection, currentPuzzle, getLegalTargetsForFen, handlePuzzleDrop, puzzleFen, puzzleSelectedSquare, puzzleStatus]);

  useEffect(() => {
    if (!gameData || !gameData.positions || !gameData.positions[currentPly]) return;
    if (!gameAnalysis || !gameAnalysis.positions || !gameAnalysis.positions[currentPly]) {
      setPositionEval(null);
      return;
    }
    setPositionEval(gameAnalysis.positions[currentPly]);
  }, [currentPly, gameAnalysis, gameData]);

  useEffect(() => {
    if (!autoReviewQueued || !gameData || !gameData.positions || !gameData.moves || !gameData.moves.length) {
      return undefined;
    }

    if (autoReviewRunningRef.current) {
      return undefined;
    }

    autoReviewRunningRef.current = true;
    let cancelled = false;

    const run = async () => {
      try {
        await analyzeWholeGame();
        if (!cancelled) {
          setSidebarMode('puzzles');
        }
      } finally {
        autoReviewRunningRef.current = false;
        if (!cancelled) {
          setAutoReviewQueued(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [analyzeWholeGame, autoReviewQueued, gameData]);


  useEffect(() => {
    if (!activePuzzleQueue.length) {
      setPuzzleIndex(0);
      setPuzzleFen(hasLoadedGame && currentPosition ? currentPosition.fen : 'start');
      setPuzzleStatus('idle');
      setPuzzleHintOpen(false);
      setPuzzleShowSolution(false);
      if (trainingSource === 'pack' || hasFullReview) {
        setPuzzleFeedback(trainingSource === 'pack' ? 'No clear training spots were found in this pack.' : 'No clear training spots were found in this game.');
      }
      return;
    }

    if (puzzleIndex >= activePuzzleQueue.length) {
      setPuzzleIndex(0);
    }
  }, [activePuzzleQueue, currentPosition, hasFullReview, hasLoadedGame, puzzleIndex, trainingSource]);

  useEffect(() => {
    if (!currentPuzzle) return;

    clearPuzzleSelection();
    setPuzzleFen(currentPuzzle.beforeFen);
    setPuzzleStatus('idle');
    setPuzzleHintOpen(false);
    setPuzzleShowSolution(false);
    setPuzzleFeedback(getPuzzleLeadText(currentPuzzle));
  }, [clearPuzzleSelection, currentPuzzle]);

  useEffect(() => {
    if (puzzleAdvanceTimerRef.current) {
      window.clearTimeout(puzzleAdvanceTimerRef.current);
      puzzleAdvanceTimerRef.current = null;
    }

    if (puzzleStatus !== 'solved' || !currentPuzzle) {
      return undefined;
    }

    if (puzzleIndex >= activePuzzleQueue.length - 1) {
      return undefined;
    }

    puzzleAdvanceTimerRef.current = window.setTimeout(() => {
      goToNextPuzzle();
      puzzleAdvanceTimerRef.current = null;
    }, 1250);

    return () => {
      if (puzzleAdvanceTimerRef.current) {
        window.clearTimeout(puzzleAdvanceTimerRef.current);
        puzzleAdvanceTimerRef.current = null;
      }
    };
  }, [activePuzzleQueue.length, currentPuzzle, goToNextPuzzle, puzzleIndex, puzzleStatus]);

  useEffect(() => {
    const syncSettings = () => setReviewSettings(loadReviewSettings());

    syncSettings();

    if (typeof Audio !== 'undefined') {
      const base = '';
      const sounds = {
        capture: new Audio(base + '/sounds/capture.mp3'),
        illegal: new Audio(base + '/sounds/illegal.mp3'),
        moveSelf: new Audio(base + '/sounds/move-self.mp3'),
        moveOpponent: new Audio(base + '/sounds/move-opponent.mp3'),
      };

      Object.values(sounds).forEach((audio) => {
        if (!audio) return;
        audio.preload = 'auto';
        audio.volume = 0.55;
      });

      sfxRef.current = sounds;
    }

    window.addEventListener('storage', syncSettings);
    window.addEventListener('focus', syncSettings);

    return () => {
      window.removeEventListener('storage', syncSettings);
      window.removeEventListener('focus', syncSettings);
      if (puzzleAdvanceTimerRef.current) {
        window.clearTimeout(puzzleAdvanceTimerRef.current);
        puzzleAdvanceTimerRef.current = null;
      }
      if (puzzleConfettiTimerRef.current) {
        window.clearTimeout(puzzleConfettiTimerRef.current);
        puzzleConfettiTimerRef.current = null;
      }
      Object.values(sfxRef.current || {}).forEach((audio) => {
        try {
          audio.pause();
          audio.src = '';
        } catch (_) {}
      });
      sfxRef.current = {};
    };
  }, []);

  useEffect(() => {
    if (isPuzzleMode) {
      lastReviewPlySoundRef.current = currentPly;
      return;
    }

    if (!gameData || !gameData.moves || !gameData.moves.length) {
      lastReviewPlySoundRef.current = 0;
      return;
    }

    const previousPly = lastReviewPlySoundRef.current;
    if (previousPly === currentPly) return;

    lastReviewPlySoundRef.current = currentPly;

    if (currentPly <= 0) return;

    const move = gameData.moves[currentPly - 1];
    const key = getReviewMoveSoundKey(move, gameData);
    if (key) playSfx(key);
  }, [currentPly, gameData, isPuzzleMode, playSfx]);

  useEffect(() => () => {
    if (remoteAbortRef.current) {
      try { remoteAbortRef.current.abort(); } catch (_) {}
    }
    const engine = engineRef.current;
    if (engine && engine.worker) {
      try { engine.worker.postMessage('quit'); } catch (_) {}
      try { engine.worker.terminate(); } catch (_) {}
    }
  }, []);

  useEffect(() => {
    const node = boardFrameRef.current;
    if (!node) return undefined;

    let frame = null;
    const update = () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      frame = window.requestAnimationFrame(() => {
        const viewportWidth = typeof window !== 'undefined' ? Number(window.innerWidth) || 0 : 0;
        const frameWidth = node.clientWidth || 0;
        const mobileCap = Math.max(260, viewportWidth - 24);
        let desktopCap = 500;
        if (viewportWidth >= 1800) desktopCap = 600;

        let nextWidth;
        if (viewportWidth && viewportWidth < 1100) {
          const mobileWidth = frameWidth || mobileCap;
          nextWidth = Math.max(260, Math.min(mobileCap, mobileWidth));
        } else {
          const desktopWidth = frameWidth || desktopCap;
          nextWidth = Math.max(260, Math.min(desktopCap, desktopWidth));
        }

        setBoardWidth(nextWidth);
      });
    };

    update();
    let observer = null;
    if (window.ResizeObserver) {
      observer = new window.ResizeObserver(update);
      observer.observe(node);
    }
    window.addEventListener('resize', update);

    return () => {
      window.removeEventListener('resize', update);
      if (observer) observer.disconnect();
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      const tagName = event.target && event.target.tagName ? event.target.tagName.toLowerCase() : '';
      if (tagName === 'input' || tagName === 'textarea' || tagName === 'select' || (event.target && event.target.isContentEditable)) {
        return;
      }

      const totalMoves = gameData && gameData.moves ? gameData.moves.length : 0;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setCurrentPly((value) => Math.max(0, value - 1));
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        setCurrentPly((value) => Math.min(totalMoves, value + 1));
      } else if (event.key === 'Home') {
        event.preventDefault();
        setCurrentPly(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        setCurrentPly(totalMoves);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [gameData]);

  useEffect(() => {
    const headers = gameData && gameData.headers ? gameData.headers : null;
    if (!headers) {
      setPlayerVisuals({ white: null, black: null });
      return undefined;
    }

    let cancelled = false;
    const whiteName = headers.White || 'White';
    const blackName = headers.Black || 'Black';
    const site = String(headers.Site || '').toLowerCase();
    const shouldUseChessCom = source === 'chesscom' || site.indexOf('chess.com') !== -1;

    setPlayerVisuals({ white: null, black: null });

    if (!shouldUseChessCom) {
      return undefined;
    }

    const fetchProfile = async (name) => {
      try {
        const response = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(String(name || '').toLowerCase())}`);
        if (!response.ok) return null;
        const data = await response.json();
        return data && data.avatar ? data.avatar : null;
      } catch (_) {
        return null;
      }
    };

    Promise.all([fetchProfile(whiteName), fetchProfile(blackName)]).then(([whiteAvatar, blackAvatar]) => {
      if (cancelled) return;
      setPlayerVisuals({ white: whiteAvatar, black: blackAvatar });
    });

    return () => {
      cancelled = true;
    };
  }, [gameData, source, selectedRemoteGameId]);

  const moveCount = gameData && gameData.moves ? gameData.moves.length : 0;
  const statusTone = engineState === 'error' ? 'error' : engineState === 'ready' ? 'ready' : engineState === 'idle' ? 'idle' : 'working';

  return (
    <div className="gr-page">
      <TopNav title="My Games" hideHero />

      <div className="gr-shell gr-shell-review" style={shellProgressStyle}>
        <div className="gr-top-progress-shell" aria-hidden="true">
          <div className="gr-top-progress-track">
            <div className="gr-top-progress-fill" />
          </div>
        </div>

        <div className="gr-stage-shell">

          <section className="gr-stage-card gr-stage-card-board">
            <div className="gr-stage-board-only">
              <div className="gr-board-frame" ref={boardFrameRef}>
                <div className="gr-board-stack" style={{ width: `${boardWidth}px` }}>
                  <Chessboard
                    key={`review-board-${effectiveBoardOrientation}-${isPuzzleMode && currentPuzzle ? puzzleFen : currentPosition ? currentPosition.fen : 'start'}`}
                    width={boardWidth}
                    position={isPuzzleMode && currentPuzzle ? puzzleFen : currentPosition ? currentPosition.fen : 'start'}
                    orientation={effectiveBoardOrientation}
                    arePiecesDraggable={isPuzzleMode ? Boolean(currentPuzzle) && puzzleStatus !== 'checking' && puzzleStatus !== 'solved' : false}
                    onDrop={isPuzzleMode ? handlePuzzleDrop : undefined}
                    onSquareClick={isPuzzleMode ? handlePuzzleSquareClick : undefined}
                    onSquareRightClick={isPuzzleMode ? clearPuzzleSelection : undefined}
                    showNotation
                    squareStyles={isPuzzleMode ? puzzleSquareStyles : boardSquareStyles}
                    pieceTheme={pieceThemeUrl}
                    {...boardThemeStyles}
                  />
                  {isPuzzleMode ? (
                    puzzleFen === (currentPuzzle ? currentPuzzle.beforeFen : '') ? (
                      <div className="gr-board-overlay" aria-hidden="true">
                        <svg viewBox={`0 0 ${boardWidth} ${boardWidth}`} className="gr-board-arrow gr-board-arrow-puzzle">
                          <defs>
                            <marker id={puzzlePlayedMarkerId} markerWidth="10" markerHeight="10" refX="7" refY="5" orient="auto" markerUnits="userSpaceOnUse">
                              <path d="M0,0 L10,5 L0,10 z" className="gr-board-arrow-played-head" />
                            </marker>
                            <marker id={puzzleBestMarkerId} markerWidth="10" markerHeight="10" refX="7" refY="5" orient="auto" markerUnits="userSpaceOnUse">
                              <path d="M0,0 L10,5 L0,10 z" className="gr-board-arrow-best-head" />
                            </marker>
                          </defs>
                          {currentPuzzle ? (() => {
                            const playedFrom = getSquareCenter(currentPuzzle.playedMove && currentPuzzle.playedMove.slice(0, 2), effectiveBoardOrientation, boardWidth);
                            const playedTo = getSquareCenter(currentPuzzle.playedMove && currentPuzzle.playedMove.slice(2, 4), effectiveBoardOrientation, boardWidth);
                            const bestFrom = getSquareCenter(currentPuzzle.bestMove && currentPuzzle.bestMove.slice(0, 2), effectiveBoardOrientation, boardWidth);
                            const bestTo = getSquareCenter(currentPuzzle.bestMove && currentPuzzle.bestMove.slice(2, 4), effectiveBoardOrientation, boardWidth);

                            return (
                              <>
                                {playedFrom && playedTo ? (
                                  <line
                                    x1={playedFrom.x}
                                    y1={playedFrom.y}
                                    x2={playedTo.x}
                                    y2={playedTo.y}
                                    className="gr-board-arrow-played-line"
                                    markerEnd={`url(#${puzzlePlayedMarkerId})`}
                                  />
                                ) : null}
                                {puzzleShowSolution && bestFrom && bestTo ? (
                                  <line
                                    x1={bestFrom.x}
                                    y1={bestFrom.y}
                                    x2={bestTo.x}
                                    y2={bestTo.y}
                                    className="gr-board-arrow-best-line"
                                    markerEnd={`url(#${puzzleBestMarkerId})`}
                                  />
                                ) : null}
                              </>
                            );
                          })() : null}
                        </svg>
                      </div>
                    ) : null
                  ) : (
                    <BoardOverlay move={currentMove} orientation={effectiveBoardOrientation} classification={currentClassification} boardSize={boardWidth} />
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className="gr-sidebar">
          <section className="gr-panel gr-sidebar-shell" style={sidebarPanelStyle}>
            <div className="gr-sidebar-topbar">
              <div className="gr-sidebar-title-wrap">
                <div className="gr-panel-kicker">My Games</div>
                <h2>{sidebarHeading}</h2>
              </div>
              <div className="gr-sidebar-actions">
                <button
                  type="button"
                  className={sidebarMode === 'load' || (!hasLoadedGame && !activePuzzleQueue.length) ? 'gr-panel-gear is-active' : 'gr-panel-gear'}
                  onClick={() => setSidebarMode('load')}
                  title="Load or change game"
                >
                  <FontAwesomeIcon icon={faUpload} />
                </button>
                <button
                  type="button"
                  className={shouldShowOverviewView ? 'gr-panel-gear is-active' : 'gr-panel-gear'}
                  onClick={() => canOpenSingleGameViews && setSidebarMode('overview')}
                  title="Show review overview"
                  disabled={!canOpenSingleGameViews}
                >
                  <FontAwesomeIcon icon={faBars} />
                </button>
                <button
                  type="button"
                  className={isPuzzleMode ? 'gr-panel-gear is-active' : 'gr-panel-gear'}
                  onClick={() => (hasLoadedGame || activePuzzleQueue.length) && setSidebarMode('puzzles')}
                  title="Show mistake training"
                  disabled={!hasLoadedGame && !activePuzzleQueue.length}
                >
                  <FontAwesomeIcon icon={faChessKnight} />
                </button>
                <button
                  type="button"
                  className={canOpenSingleGameViews && sidebarMode === 'moves' ? 'gr-panel-gear is-active' : 'gr-panel-gear'}
                  onClick={() => canOpenSingleGameViews && setSidebarMode('moves')}
                  title="Show move review"
                  disabled={!canOpenSingleGameViews}
                >
                  <FontAwesomeIcon icon={faListOl} />
                </button>
                <button
                  type="button"
                  className={settingsOpen ? 'gr-panel-gear is-active' : 'gr-panel-gear'}
                  onClick={() => setSettingsOpen((value) => !value)}
                  aria-expanded={settingsOpen ? 'true' : 'false'}
                  title="Review settings"
                >
                  <FontAwesomeIcon icon={faCog} />
                </button>
              </div>
            </div>

            {settingsOpen ? (
              <div className="gr-settings-drawer gr-settings-drawer-shell">
                <div className="gr-settings-row">
                  <label className="gr-compact-field">
                    <span>Depth</span>
                    <select value={depth} onChange={(event) => setDepth(parseInt(event.target.value, 10))}>
                      {[8, 10, 12, 14, 16].map((value) => (
                        <option key={value} value={value}>{value}</option>
                      ))}
                    </select>
                  </label>
                  <label className="gr-compact-field">
                    <span>Lines</span>
                    <select value={multiPv} onChange={(event) => setMultiPv(parseInt(event.target.value, 10))}>
                      {[1, 2, 3].map((value) => (
                        <option key={value} value={value}>{value}</option>
                      ))}
                    </select>
                  </label>
                  <label className="gr-compact-field">
                    <span>Engine time</span>
                    <select value={playTimeMs} onChange={(event) => setPlayTimeMs(parseInt(event.target.value, 10))}>
                      {[
                        { label: 'Fast', value: 250 },
                        { label: 'Normal', value: 500 },
                        { label: 'Slow', value: 1000 },
                      ].map((value) => (
                        <option key={value.value} value={value.value}>{value.label}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="gr-inline-actions">
                  <button type="button" className="gr-button" onClick={handleUseSample}>
                    <FontAwesomeIcon icon={faPlay} />
                    <span>Sample</span>
                  </button>
                  <button type="button" className="gr-button" onClick={handleCopyPgn} disabled={!gameData || !gameData.pgn}>
                    <FontAwesomeIcon icon={faCopy} />
                    <span>{copied ? 'Copied' : 'Copy PGN'}</span>
                  </button>
                  <button type="button" className="gr-button" onClick={() => fileInputRef.current && fileInputRef.current.click()}>
                    <FontAwesomeIcon icon={faUpload} />
                    <span>Upload</span>
                  </button>
                  <button type="button" className="gr-button" onClick={() => startPlayGame('white')}>
                    <FontAwesomeIcon icon={faChessKnight} />
                    <span>Play White</span>
                  </button>
                  <button type="button" className="gr-button" onClick={() => startPlayGame('black')}>
                    <FontAwesomeIcon icon={faChessKnight} />
                    <span>Play Black</span>
                  </button>
                </div>
              </div>
            ) : null}

            <div className="gr-sidebar-body">
              {shouldShowLoadView ? (
                <div className="gr-sidebar-view gr-sidebar-view-load">
                  <section className="gr-view-section">
                    <div className="gr-source-tabs">
                      {SOURCE_TABS.map((tab) => (
                        <button
                          key={tab.key}
                          type="button"
                          className={source === tab.key ? 'gr-source-tab is-active' : 'gr-source-tab'}
                          onClick={() => setSource(tab.key)}
                        >
                          {tab.logoSrc ? (
                            <span className="gr-source-tab-logo-wrap">
                              <img className="gr-source-tab-logo" src={tab.logoSrc} alt={tab.logoAlt} />
                            </span>
                          ) : (
                            <span className="gr-source-tab-badge">{tab.badge}</span>
                          )}
                          <span>{tab.label}</span>
                        </button>
                      ))}
                    </div>

                    {source === 'pgn' ? (
                      <div className="gr-pgn-panel">
                        <textarea
                          className="gr-pgn-input"
                          value={pgnText}
                          onChange={(event) => setPgnText(event.target.value)}
                          spellCheck={false}
                          placeholder="Paste a PGN here"
                        />
                        <div className="gr-inline-actions">
                          <button type="button" className="gr-button gr-button-primary" onClick={handleLoadPgn}>
                            <FontAwesomeIcon icon={faPaste} />
                            <span>Load PGN</span>
                          </button>
                          <button type="button" className="gr-button" onClick={() => fileInputRef.current && fileInputRef.current.click()}>
                            <FontAwesomeIcon icon={faUpload} />
                            <span>Upload</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="gr-remote-panel">
                        <form className="gr-remote-toolbar" onSubmit={(event) => { event.preventDefault(); handleLoadRemoteGames(); }}>
                          <label className="gr-compact-field gr-compact-field-wide">
                            <span>{source === 'lichess' ? 'Lichess username' : 'Chess.com username'}</span>
                            <input
                              className="gr-text-input"
                              value={remoteUsername}
                              onChange={(event) => setRemoteUsername(event.target.value)}
                              placeholder={source === 'lichess' ? 'Enter a Lichess username' : 'Enter a Chess.com username'}
                            />
                          </label>
                          <button type="submit" className="gr-button gr-button-primary">
                            <FontAwesomeIcon icon={faUser} />
                            <span>Load</span>
                          </button>
                        </form>
                        <RemoteGameList
                          games={remoteGames}
                          selectedId={selectedRemoteGameId}
                          onSelect={handleSelectRemoteGame}
                          loading={remoteLoading}
                          error={remoteError}
                          emptyMessage=""
                          focusUsername={remoteUsername}
                        />

                        <section className="gr-pack-builder">
                          <div className="gr-pack-builder-head">
                            <div className="gr-loader-summary-title">Mistake pack</div>
                          </div>

                          <div className="gr-settings-row">
                            <label className="gr-compact-field">
                              <span>Games</span>
                              <select value={packBatchSize} onChange={(event) => setPackBatchSize(parseInt(event.target.value, 10))}>
                                {[10, 20, 30].map((value) => (
                                  <option key={value} value={value}>{value}</option>
                                ))}
                              </select>
                            </label>
                            <label className="gr-compact-field">
                              <span>Side</span>
                              <select value={packSideFilter} onChange={(event) => setPackSideFilter(event.target.value)}>
                                <option value="all">All</option>
                                <option value="white">White</option>
                                <option value="black">Black</option>
                              </select>
                            </label>
                            <label className="gr-compact-field">
                              <span>Speed</span>
                              <select value={packSpeedFilter} onChange={(event) => setPackSpeedFilter(event.target.value)}>
                                <option value="all">All</option>
                                <option value="rapid">Rapid</option>
                                <option value="blitz">Blitz</option>
                              </select>
                            </label>
                          </div>


                          <div className="gr-inline-actions">
                            <button type="button" className="gr-button gr-button-primary" onClick={handleBuildPersonalPack} disabled={packBuilding || remoteLoading}>
                              <FontAwesomeIcon icon={packBuilding ? faSpinner : faChessKnight} spin={packBuilding} />
                              <span>{packBuilding ? 'Building...' : 'Build pack'}</span>
                            </button>
                            {trainingSource === 'pack' && packPuzzles.length ? (
                              <button type="button" className="gr-button" onClick={() => setSidebarMode('puzzles')}>
                                <FontAwesomeIcon icon={faPlay} />
                                <span>Open pack</span>
                              </button>
                            ) : null}
                          </div>

                          {packBuilding ? (
                            <div className="gr-pack-status">
                              <span>Analyzing {packProgress.current}/{packProgress.total}</span>
                              {packProgress.label ? <strong>{packProgress.label}</strong> : null}
                            </div>
                          ) : null}

                        </section>
                      </div>
                    )}
                  </section>
                </div>
              ) : isPuzzleMode ? (
                <div className="gr-sidebar-view gr-sidebar-view-puzzles">
                  {!activePuzzleQueue.length ? (
                    <section className="gr-view-section gr-puzzle-card gr-puzzle-card-empty">
                      <div className="gr-puzzle-title">No clean training spots found</div>
                      <div className="gr-puzzle-copy">{trainingSource === 'pack' ? 'This batch did not produce a strong queue of personalized training spots. Adjust the filters or build a new pack.' : 'This game did not produce a strong queue of better-move positions. Open the move review or load another game.'}</div>
                      <div className="gr-inline-actions">
                        {trainingSource !== 'pack' ? (
                          <button type="button" className="gr-button gr-button-primary" onClick={() => setSidebarMode('moves')}>
                            <FontAwesomeIcon icon={faListOl} />
                            <span>Open moves</span>
                          </button>
                        ) : null}
                        <button type="button" className={trainingSource === 'pack' ? 'gr-button gr-button-primary' : 'gr-button'} onClick={() => setSidebarMode('load')}>
                          <FontAwesomeIcon icon={faUpload} />
                          <span>{trainingSource === 'pack' ? 'Adjust pack' : 'Load another'}</span>
                        </button>
                      </div>
                    </section>
                  ) : (
                    <>
                      <section className="gr-view-section gr-puzzle-card gr-puzzle-card-primary">
                        <div className="gr-puzzle-kicker">{currentPuzzle ? `${currentPuzzle.sideLabel} to move` : 'Training spot'}</div>
                        <div className="gr-puzzle-title">{currentPuzzle ? currentPuzzle.goalLabel : 'Find the move'}</div>
                        <div className="gr-puzzle-copy">{puzzleFeedback}</div>
                        {puzzleHintOpen && currentPuzzle ? (
                          <div className="gr-puzzle-hint">{getPuzzleHintText(currentPuzzle)}</div>
                        ) : null}
                        {currentPuzzle ? (
                          <div className="gr-puzzle-chip-row">
                            <span className={`gr-puzzle-chip gr-puzzle-chip-${currentPuzzle.classification}`}>{CLASSIFICATION_META[currentPuzzle.classification] ? CLASSIFICATION_META[currentPuzzle.classification].label : currentPuzzle.classification}</span>
                            <span className="gr-puzzle-chip">Move {currentPuzzle.turnNumber}</span>
                            <span className="gr-puzzle-chip">Swing {currentPuzzle.lossLabel}</span>
                            {currentPuzzle.themeLabel ? <span className="gr-puzzle-chip">{currentPuzzle.themeLabel}</span> : null}
                          </div>
                        ) : null}
                      </section>

                      <div className="gr-puzzle-action-row">
                        <button type="button" className="gr-button gr-button-secondary gr-puzzle-action-btn" onClick={() => setPuzzleHintOpen((value) => !value)} disabled={!currentPuzzle}>
                          <FontAwesomeIcon icon={faSearch} />
                          <span>{puzzleHintOpen ? 'Hide hint' : 'Hint'}</span>
                        </button>
                        <button type="button" className="gr-button gr-button-secondary gr-puzzle-action-btn" onClick={handleRevealPuzzleSolution} disabled={!currentPuzzle}>
                          <FontAwesomeIcon icon={faPlay} />
                          <span>Solution</span>
                        </button>
                      </div>

                      <section className="gr-puzzle-stat-card gr-puzzle-progress-card">
                        <div className="gr-puzzle-progress-title-row">
                          <div className="gr-puzzle-stat-label">Progress</div>
                          <div className="gr-puzzle-progress-mini-count">{solvedPuzzleCount}/{activePuzzleQueue.length}</div>
                        </div>
                        <div className="gr-puzzle-progress-cells">
                          {activePuzzleQueue.map((puzzle, index) => {
                            const result = puzzleResults[puzzle.id];
                            const isActive = currentPuzzle && puzzle.id === currentPuzzle.id;
                            const className = result === 'solved'
                              ? 'is-solved'
                              : result === 'failed'
                                ? 'is-failed'
                                : 'is-pending';

                            return (
                              <button
                                key={puzzle.id}
                                type="button"
                                className={`gr-puzzle-progress-cell ${className}${isActive ? ' is-active' : ''}`}
                                onClick={() => setPuzzleIndex(index)}
                                title={`Move ${puzzle.turnNumber}`}
                              />
                            );
                          })}
                        </div>
                      </section>

                      <div className="gr-puzzle-footer">
                        <button
                          type="button"
                          className="gr-button gr-puzzle-next-btn"
                          onClick={goToPreviousPuzzle}
                          disabled={puzzleIndex <= 0}
                        >
                          <FontAwesomeIcon icon={faStepBackward} />
                          <span>Previous</span>
                        </button>
                        <div className={`gr-puzzle-status-pill is-${puzzleStatus}${currentPuzzleResult ? ` has-${currentPuzzleResult}` : ''}`}>
                          {puzzleStatus === 'checking'
                            ? 'Checking...'
                            : puzzleStatus === 'solved'
                              ? 'Solved'
                              : puzzleStatus === 'revealed'
                                ? 'Shown'
                                : currentPuzzleResult === 'failed'
                                  ? 'Missed'
                                  : 'Live'}
                        </div>
                        <button
                          type="button"
                          className="gr-button gr-button-primary gr-puzzle-next-btn"
                          onClick={goToNextPuzzle}
                          disabled={puzzleIndex >= activePuzzleQueue.length - 1}
                        >
                          <span>Next Puzzle</span>
                          <FontAwesomeIcon icon={faStepForward} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : shouldShowOverviewView ? (
                <div className="gr-sidebar-view gr-sidebar-view-overview">
                  <section className="gr-view-section gr-loader-summary-card gr-overview-card">
                    <button type="button" className="gr-button gr-button-primary gr-open-review-btn gr-open-review-btn-top" onClick={() => setSidebarMode('moves')} disabled={!hasLoadedGame}>
                      <FontAwesomeIcon icon={faListOl} />
                      <span>{hasFullReview ? 'Open review' : 'Open moves'}</span>
                    </button>

                    <div className="gr-scoreboard-players gr-scoreboard-players-overview">
                      <div className="gr-score-player">
                        <PlayerAvatar name={stagePlayerSummary.white.name} avatarUrl={playerVisuals.white} className="gr-score-avatar" />
                        <div className="gr-score-name">{stagePlayerSummary.white.name}</div>
                        <div className="gr-score-accuracy">{hasFullReview ? gameAnalysis.accuracy.white.toFixed(1) : '--'}</div>
                      </div>
                      <div className="gr-score-center-pill">{gameData ? gameData.result : '*'}</div>
                      <div className="gr-score-player">
                        <PlayerAvatar name={stagePlayerSummary.black.name} avatarUrl={playerVisuals.black} className="gr-score-avatar" />
                        <div className="gr-score-name">{stagePlayerSummary.black.name}</div>
                        <div className="gr-score-accuracy">{hasFullReview ? gameAnalysis.accuracy.black.toFixed(1) : '--'}</div>
                      </div>
                    </div>

                    <div className="gr-count-table">
                      {[
                        { key: 'book', icon: faBookOpen, label: 'Book' },
                        { key: 'best', icon: faChessKnight, label: 'Best' },
                        { key: 'excellent', icon: faChartLine, label: 'Excellent' },
                        { key: 'inaccuracy', icon: faSearch, label: 'Inaccuracy' },
                        { key: 'mistake', icon: faUser, label: 'Mistake' },
                        { key: 'blunder', icon: faStopCircle, label: 'Blunder' },
                      ].map((row) => (
                        <div key={row.key} className="gr-count-row">
                          <span className="gr-count-value">{classificationCounts.white[row.key]}</span>
                          <span className={`gr-count-icon gr-count-icon-${row.key}`} title={row.label}>
                            <FontAwesomeIcon icon={row.icon} />
                          </span>
                          <span className="gr-count-value">{classificationCounts.black[row.key]}</span>
                        </div>
                      ))}
                    </div>

                    {positionEval && positionEval.lines && positionEval.lines.length ? (
                      <div className="gr-mini-lines">
                        {positionEval.lines.map((line) => (
                          <div key={`${line.multiPv}-${line.depth}-${line.pv.join('-')}`} className="gr-mini-line">
                            <span className="gr-mini-line-eval">{typeof line.mate === 'number' ? `M${Math.abs(line.mate)}` : getPositionLabel({ lines: [line] })}</span>
                            <span className="gr-mini-line-text">{line.pv.length ? line.pv.join(' ') : 'No continuation.'}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </section>
                </div>
              ) : (
                <div className="gr-sidebar-view gr-sidebar-view-moves">
                  <div className="gr-move-summary">
                    <div className={`gr-insight-bubble gr-insight-bubble-${currentInsight.tone || 'neutral'}`}>
                      <div className="gr-insight-title">{currentInsight.title}</div>
                      <div className="gr-insight-body">{currentInsight.body}</div>
                    </div>

                    <div className={`gr-status-strip is-${statusTone}`}>
                      <span>{hasFullReview ? 'Full review finished.' : statusMessage}</span>
                      {engineState === 'analyzing-game' ? <span>{gameProgress}%</span> : null}
                    </div>
                    {engineError ? <div className="gr-error">{engineError}</div> : null}
                  </div>

                  <div className="gr-moves-head">
                    <span>Moves</span>
                    <span>{currentPly === 0 ? 'Start' : `${currentPly}/${moveCount}`}</span>
                  </div>

                  <div className="gr-control-dock">
                    <button type="button" className="gr-dock-btn" onClick={() => setCurrentPly(0)} title="Start">
                      <FontAwesomeIcon icon={faFastBackward} />
                    </button>
                    <button type="button" className="gr-dock-btn" onClick={() => setCurrentPly((value) => Math.max(0, value - 1))} title="Previous">
                      <FontAwesomeIcon icon={faStepBackward} />
                    </button>
                    <button type="button" className="gr-dock-btn gr-dock-btn-primary" onClick={() => analyzeCurrentPosition()} title="Analyze current position">
                      {engineState === 'analyzing-position' ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faSearch} />}
                    </button>
                    <button type="button" className="gr-dock-btn gr-dock-btn-primary" onClick={analyzeWholeGame} title="Analyze full game">
                      {engineState === 'analyzing-game' ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faChartLine} />}
                    </button>
                    <button type="button" className="gr-dock-btn" onClick={() => setCurrentPly((value) => Math.min(moveCount, value + 1))} title="Next">
                      <FontAwesomeIcon icon={faStepForward} />
                    </button>
                    <button type="button" className="gr-dock-btn" onClick={() => setCurrentPly(moveCount)} title="End">
                      <FontAwesomeIcon icon={faFastForward} />
                    </button>
                  </div>

                  <div className="gr-move-list">
                    {gameData && gameData.moves && gameData.moves.length ? (
                      Array.from({ length: Math.ceil(gameData.moves.length / 2) }, (_, rowIndex) => {
                        const whiteMove = gameData.moves[rowIndex * 2];
                        const blackMove = gameData.moves[rowIndex * 2 + 1];

                        return (
                          <div key={rowIndex} className="gr-move-row">
                            <div className="gr-move-number">{rowIndex + 1}</div>
                            {[whiteMove, blackMove].map((move) => {
                              if (!move) {
                                return <div key={`${rowIndex}-empty`} className="gr-move-cell is-empty" />;
                              }

                              const meta = move.classification ? CLASSIFICATION_META[move.classification] : null;
                              const isActive = currentPly === move.ply;
                              const badge = move.classification === 'book'
                                ? 'B'
                                : move.classification === 'best'
                                  ? '★'
                                  : move.classification === 'excellent'
                                    ? '!'
                                    : move.classification === 'inaccuracy'
                                      ? '?!'
                                      : move.classification === 'mistake'
                                        ? '?'
                                        : move.classification === 'blunder'
                                          ? '??'
                                          : '';

                              return (
                                <button
                                  key={move.ply}
                                  type="button"
                                  className={isActive ? 'gr-move-cell is-active' : 'gr-move-cell'}
                                  onClick={() => setCurrentPly(move.ply)}
                                >
                                  <span className="gr-move-san">{move.san}</span>
                                  {meta ? <span className={`gr-move-badge gr-move-badge-${meta.className}`}>{badge}</span> : <span className="gr-move-badge gr-move-badge-empty" />}
                                </button>
                              );
                            })}
                          </div>
                        );
                      })
                    ) : (
                      <div className="gr-empty">Load a game to see the move list.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept=".pgn,text/plain" onChange={handleUpload} hidden />
          </section>
        </aside>
      </div>

      <ReviewConfetti active={puzzleConfettiActive} />

      {showEngineBoard ? (
        <div className="gr-engine-shell">
          <section className="gr-engine-card">
            <div className="gr-panel-head">
              <div>
                <div className="gr-panel-kicker">Engine Game</div>
                <h2>{playOrientation === 'white' ? 'You are White' : 'You are Black'}</h2>
              </div>
              <button type="button" className="gr-panel-gear" onClick={() => setShowEngineBoard(false)} title="Hide engine board">
                <FontAwesomeIcon icon={faStopCircle} />
              </button>
            </div>

            <div className="gr-engine-grid">
              <div className="gr-engine-board-wrap">
                <Chessboard
                  width={340}
                  position={playFen}
                  orientation={playOrientation}
                  onDrop={handlePlayDrop}
                  onSquareClick={handlePlaySquareClick}
                  onSquareRightClick={clearPlaySelection}
                  arePiecesDraggable={!playThinking && !playResult}
                  squareStyles={playSquareStyles}
                  pieceTheme={pieceThemeUrl}
                  {...boardThemeStyles}
                />
              </div>
              <div className="gr-engine-side">
                <div className="gr-status-strip is-ready">
                  <span>{playThinking ? 'Engine thinking…' : playStatus}</span>
                </div>
                {playResult ? <div className="gr-status-pill">{playResult}</div> : null}
                <div className="gr-inline-actions">
                  <button type="button" className="gr-button" onClick={() => startPlayGame('white')}>
                    Play White
                  </button>
                  <button type="button" className="gr-button" onClick={() => startPlayGame('black')}>
                    Play Black
                  </button>
                </div>
                <div className="gr-play-history">
                  {playMoveHistory.length ? playMoveHistory.map((move, index) => (
                    <span key={`${index}-${move.san}`} className="gr-play-history-move">{index % 2 === 0 ? `${Math.floor(index / 2) + 1}.` : ''} {move.san}</span>
                  )) : <div className="gr-empty">Start an engine game to see the moves.</div>}
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

export default GameReview;
