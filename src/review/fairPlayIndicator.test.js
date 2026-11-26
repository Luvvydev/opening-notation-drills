import { getFairPlayMoveEvidence, getFairPlayClockEvidence, getFairPlayRhythmEvidence, getFairPlayHistory, getFairPlayProfileScreening, getFairPlayReviewHighlights, getFairPlayReviewQueue, parseFairPlayLines, readFairPlayClocks, saveFairPlayDepthCheck, saveFairPlayEvidence, scoreEngineAgreement, verifyFairPlayReviewMoves } from './fairPlayIndicator';

const legal = new Set(['e2e4', 'd2d4', 'g1f3', 'c2c4']);
const line = (depth, rank, score, move) => `info depth ${depth} seldepth 14 multipv ${rank} score ${score} nodes 100 pv ${move}`;

test('requires comparable exact lines at the requested depth and keeps their engine rank', () => {
  const exact = [
    line(12, 1, 'cp 50', 'e2e4'),
    line(12, 2, 'cp 45', 'd2d4'),
    line(12, 3, 'cp 0', 'g1f3'),
  ];
  const finish = 'bestmove e2e4 ponder e7e5';
  expect(parseFairPlayLines([line(11, 2, 'cp 72', 'c2c4'), ...exact, finish], 12, legal)).toEqual([
    { uci: 'e2e4', cp: 50 }, { uci: 'd2d4', cp: 45 }, { uci: 'g1f3', cp: 0 },
  ]);
  expect(parseFairPlayLines([...exact.slice(0, 2), finish], 12, legal)).toBeNull();
  expect(parseFairPlayLines([...exact, line(12, 2, 'cp 49 lowerbound', 'd2d4'), finish], 12, legal)).toBeNull();
  expect(parseFairPlayLines([...exact, 'bestmove d2d4'], 12, legal)).toBeNull();
  expect(parseFairPlayLines([...exact, line(12, 2, 'cp 45', 'e2e4'), finish], 12, legal)).toBeNull();
  expect(parseFairPlayLines([...exact.slice(0, 2), finish], 12, new Set(['e2e4', 'd2d4']))).toHaveLength(2);
});

test('distinguishes first choice, close alternatives and costly moves at the same root', () => {
  const lines = [{ uci: 'e2e4', cp: 50 }, { uci: 'd2d4', cp: 45 }, { uci: 'g1f3', cp: 0 }];
  expect(getFairPlayMoveEvidence({ uci: 'e2e4' }, null, lines)).toMatchObject({ matched: true, mistake: false });
  expect(getFairPlayMoveEvidence({ uci: 'd2d4' }, null, lines)).toMatchObject({ matched: false, mistake: false });
  expect(getFairPlayMoveEvidence({ uci: 'g1f3' }, null, lines)).toMatchObject({ matched: false, mistake: true });
  expect(getFairPlayMoveEvidence({ uci: 'c2c4' }, null, lines.slice(0, 2))).toMatchObject({ hasMistakeBoundary: false });
  expect(getFairPlayMoveEvidence({ uci: 'd2d4' }, null, [{ uci: 'e2e4', mate: 2 }, lines[1]])).toBeNull();
});

test('returns a final engine estimate without Maia and weighs repeated evidence against ordinary moves', () => {
  const first = { matched: true, gap: 3, firstProbability: 0.06, strongProbability: 0.30, hasMistakeBoundary: true };
  const mistake = { ...first, matched: false, mistake: true, firstProbability: 0.40, strongProbability: 0.55 };
  const ordinary = [...Array(11).fill(mistake), first];
  const repeated = Array(12).fill(first);
  expect(scoreEngineAgreement(ordinary, false).label).toBe('Unavailable');
  expect(scoreEngineAgreement(ordinary.slice(0, 7), true).label).toBe('Few moves');
  expect(scoreEngineAgreement(repeated.map(({ matched, gap }) => ({ matched, gap })), true))
    .toMatchObject({ basis: 'stockfish', label: 'Clean' });
  expect(scoreEngineAgreement(ordinary, true)).toMatchObject({ basis: 'combined', label: 'Clean' });
  expect(scoreEngineAgreement(repeated, true)).toMatchObject({ basis: 'combined', label: 'Sus' });
});

test('weights slow obvious moves against the same player pace and tolerates missing clocks', () => {
  const varied = [1, 1.5, 2, 2.5, 3, 4, 4, 5, 5, 6, 7, 8, 9, 10, 11, 44]
    .map((seconds, index) => ({ seconds, obvious: index === 4 }));
  const withSlowMate = varied.map((entry, index) => index === 15 ? { ...entry, obvious: true } : entry);
  expect(getFairPlayClockEvidence(withSlowMate)).toBeGreaterThan(getFairPlayClockEvidence(varied));
  expect(getFairPlayClockEvidence([])).toBe(0);
  const even = Array(20).fill(1.25);
  expect(getFairPlayRhythmEvidence(even, 865, '180', 22)).toBeGreaterThan(0);
  expect(getFairPlayRhythmEvidence(even.slice(0, 14), 865, '180', 22)).toBe(0);
  expect(getFairPlayRhythmEvidence(even.map(Math.round), 865, '180', 22)).toBe(0);
});

test('pools evidence from a recent block of reviewed games with correct player sides and pending count', () => {
  const storage = { raw: null, getItem: () => storage.raw, setItem: (_, value) => { storage.raw = value; } };
  const games = Array.from({ length: 10 }, (_, id) => ({
    id: String(id), rated: id !== 1, sourceType: 'chesscom',
    white: { name: id % 2 === 0 ? 'Player' : 'Opponent' },
    black: { name: id % 2 === 0 ? 'Opponent' : 'Player' },
  }));
  games.slice(2, 7).forEach((game, index) => {
    const own = index === 0 ? 1.5 : -2;
    saveFairPlayEvidence(storage, game, {
      white: { logEvidence: Number(game.id) % 2 === 0 ? own : 9 },
      black: { logEvidence: Number(game.id) % 2 === 0 ? 9 : own },
    });
  });
  saveFairPlayEvidence(storage, games[8], { white: { logEvidence: -2 } });
  expect(getFairPlayHistory(storage, games, 'PLAYER')).toEqual({
    score: 100, label: 'Clean', games: 6, pending: 1,
  });
  expect(getFairPlayHistory(storage, games.slice(0, 5), 'player')).toEqual({
    label: 'Few games', games: 3, pending: 1,
  });
  expect(getFairPlayReviewQueue(storage, games, 'player').map(({ id }) => id)).toEqual(['0', '7', '9']);
  expect(getFairPlayReviewQueue(storage, games.slice(0, 4), 'player')).toEqual([]);
});

test('reconstructs each side clock with increment and skips gaps in clock data', () => {
  const moves = [
    { color: 'w', afterFen: 'w1' }, { color: 'b', afterFen: 'b1' },
    { color: 'w', afterFen: 'w2' }, { color: 'w', afterFen: 'w3' },
    { color: 'w', afterFen: 'w4' },
  ];
  const comments = new Map([
    ['w1', '[%clk 0:05:01]'], ['b1', '[%clk 0:05:00]'],
    ['w3', '[%clk 0:04:57]'], ['w4', '[%clk 0:04:58] [%emt 0:00:03.5]'],
  ]);
  expect(readFairPlayClocks(moves, comments, '300+2')).toEqual([1, 2, null, null, 3.5]);
});

test('uses the actual strong alternative probability instead of credit for nearby moves as a group', () => {
  const strong = { matched: false, mistake: false, playedStrong: true, gap: 1,
    firstProbability: 0.25, strongProbability: 0.65, hasMistakeBoundary: true,
    strongMoves: ['e2e4', 'd2d4', 'g1f3'] };
  const rare = scoreEngineAgreement(Array(12).fill({ ...strong, playedProbability: 0.03 }), true);
  const common = scoreEngineAgreement(Array(12).fill({ ...strong, playedProbability: 0.37 }), true);
  expect(rare.logEvidence).toBeGreaterThan(common.logEvidence);
  expect(rare.score).toBeLessThan(common.score);

  const move = { uci: 'c2c4' };
  const lines = [{ uci: 'e2e4', cp: 50 }, { uci: 'd2d4', cp: 49 }, { uci: 'g1f3', cp: 48 }];
  expect(getFairPlayMoveEvidence(move, null, lines)).toMatchObject({ playedStrong: false });
  expect(getFairPlayMoveEvidence(move, null, lines, { uci: move.uci, cp: 49 }))
    .toMatchObject({ playedStrong: true, mistake: false });
  expect(getFairPlayMoveEvidence(move, null, lines, { uci: move.uci, cp: 0 }))
    .toMatchObject({ playedStrong: false, mistake: true });
});

test('uses Chess.com decisecond timestamps and leaves other sites to their clock tags', () => {
  const moves = [{ color: 'w', afterFen: 'w1' }];
  const comments = new Map([['w1', '[%clk 0:04:59] [%timestamp 14]']]);
  expect(readFairPlayClocks(moves, comments, '300', { Site: 'Chess.com' })).toEqual([1.4]);
  expect(readFairPlayClocks(moves, comments, '300', { Site: 'https://lichess.org' })).toEqual([1]);
});

test('reviews the newest 250 eligible games and preserves evidence beyond the old limit', () => {
  const storage = { raw: null, getItem: () => storage.raw, setItem: (_, value) => { storage.raw = value; } };
  const games = Array.from({ length: 255 }, (_, id) => ({
    id: String(id), rated: true, sourceType: 'chesscom', movesNb: id === 0 ? 8 : 45,
    white: { name: 'Player' }, black: { name: 'Opponent' },
  }));
  const queue = getFairPlayReviewQueue(storage, games, 'Player');
  expect(queue).toHaveLength(250);
  expect(queue[0].id).toBe('1');
  expect(queue[249].id).toBe('250');
  queue.forEach((game) => saveFairPlayEvidence(storage, game, { white: { logEvidence: 0.3 } }));
  expect(getFairPlayReviewQueue(storage, games, 'Player')).toEqual([]);
  expect(getFairPlayHistory(storage, games, 'Player')).toMatchObject({ games: 250, pending: 0, score: 71 });
});

test('ranks profile games by the selected side and keeps old evidence readable', () => {
  const key = 'chessdrills.fairPlayEvidence.v2';
  const storage = { value: JSON.stringify({ 'chesscom:old': { black: 2 } }) };
  storage.getItem = (name) => name === key ? storage.value : null;
  storage.setItem = (_, value) => { storage.value = value; };
  const makeGame = (id, side) => ({
    id, sourceType: 'chesscom', rated: true,
    white: { name: side === 'white' ? 'Player' : 'Other' },
    black: { name: side === 'black' ? 'Player' : 'Other' },
  });
  const old = makeGame('old', 'black');
  const leading = makeGame('leading', 'white');
  const ordinary = makeGame('ordinary', 'white');
  const moves = [{ ply: 17, san: 'Qd3', chance: 3 }];
  saveFairPlayEvidence(storage, leading, { white: { logEvidence: 4, reviewMoves: moves } });
  saveFairPlayEvidence(storage, leading, { black: { logEvidence: 12, reviewMoves: [] } });
  saveFairPlayEvidence(storage, ordinary, { white: { logEvidence: -1, reviewMoves: [] } });
  const highlights = getFairPlayReviewHighlights(storage, [old, ordinary, leading, leading], 'PLAYER');
  expect(highlights.map(({ game }) => game.id)).toEqual(['leading', 'old']);
  expect(highlights[0]).toMatchObject({ opponent: 'Other', moves, hasMoveDetails: true });
  expect(highlights[1]).toMatchObject({ moves: [], hasMoveDetails: false });
});

test('records rare strong moves that contributed positive evidence without changing the score', () => {
  const strong = { matched: false, mistake: false, playedStrong: true, gap: 1,
    firstProbability: 0.25, strongProbability: 0.6, hasMistakeBoundary: true,
    strongMoves: ['e2e4', 'd2d4', 'g1f3'], playedProbability: 0.03 };
  const source = Array(8).fill(strong);
  const original = scoreEngineAgreement(source, true);
  const result = scoreEngineAgreement(source.map((entry, index) => ({
    ...entry, move: { ply: 17 + index * 2, san: 'Qd3' },
  })), true);
  expect(result.score).toBe(original.score);
  expect(result.logEvidence).toBe(original.logEvidence);
  expect(result.reviewMoves).toEqual([17, 19, 21].map(ply => ({ ply, san: 'Qd3', chance: 3 })));
});


test('profile screening needs comparable coverage and deeper signals against distinct opponents', () => {
  const storage = { raw: null, getItem: () => storage.raw, setItem: (_, value) => { storage.raw = value; } };
  const games = Array.from({ length: 250 }, (_, id) => ({
    id: String(id), sourceType: 'chesscom', rated: true, speedClass: 'blitz', pgn: 'fixture',
    white: { name: 'Player', rating: 1650 },
    black: { name: id < 2 ? 'Repeated' : `Other ${id}` },
  }));
  const moves = [{ ply: 17, san: 'Qd3', chance: 3 }];
  games.forEach((game, i) => {
    saveFairPlayEvidence(storage, game, { white: { logEvidence: i < 6 ? 6 : -1, reviewMoves: i < 6 ? moves : [] } });
  });
  const screen = (count) => getFairPlayProfileScreening(storage, games.slice(0, count), 'Player');
  expect(screen(24)).toMatchObject({ label: 'Too little data', comparable: 24 });
  expect(screen(25)).toMatchObject({ label: 'Review check pending', confirmed: 0 });
  expect(screen(25).candidatesToCheck).toHaveLength(6);
  expect(saveFairPlayDepthCheck(storage, games[0], 'white', [], { depth: 16, plies: [17] })).toBe(false);
  const save = (index, plies) => saveFairPlayDepthCheck(storage, games[index], 'white', moves, { depth: 16, plies });
  save(0, [17]);
  save(1, [17]);
  save(2, []);
  expect(screen(25)).toMatchObject({ label: 'Review check pending', confirmed: 1 });
  save(3, [17]);
  expect(screen(25)).toMatchObject({ label: 'Worth reviewing', confirmed: 2 });
  expect(screen(100).label).toBe('Review check pending');
  save(4, [17]);
  expect(screen(100).label).toBe('Worth reviewing');
  expect(screen(250).label).toBe('Review check pending');
  save(5, []);
  expect(screen(250)).toMatchObject({ label: 'No strong signal found', confirmed: 3 });
  expect(getFairPlayProfileScreening(storage, games.map(game => ({
    ...game, speedClass: Number(game.id) < 24 ? 'blitz' : undefined,
  })), 'Player').label).toBe('Too little data');
});

test('checks shortlisted moves at depth 16 and keeps only confirmed plies', async () => {
  const originalWorker = window.Worker;
  const sent = [];
  window.Worker = class {
    postMessage(command) {
      sent.push(command);
      const reply = command === 'uci' ? ['uciok'] : command === 'isready' ? ['readyok']
        : command === 'go depth 16' ? [
          line(16, 1, 'cp 80', 'e2e4'), line(16, 2, 'cp 20', 'd2d4'),
          line(16, 3, 'cp 10', 'g1f3'), 'bestmove e2e4',
        ] : [];
      if (reply.length) Promise.resolve().then(() => reply.forEach(data => this.onmessage({ data })));
    }
    terminate() {}
  };
  try {
    const move = { ply: 1, uci: 'e2e4', color: 'w', san: 'e4', beforeFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' };
    const signal = new AbortController().signal;
    await expect(verifyFairPlayReviewMoves({ moves: [move] }, 'white', [{ ply: 1 }], signal))
      .resolves.toEqual({ depth: 16, plies: [1] });
    await expect(verifyFairPlayReviewMoves({ moves: [{ ...move, uci: 'd2d4', san: 'd4' }] }, 'white', [{ ply: 1 }], signal))
      .resolves.toEqual({ depth: 16, plies: [] });
    expect(sent.filter(command => command === 'go depth 16')).toHaveLength(2);
  } finally {
    window.Worker = originalWorker;
  }
});
