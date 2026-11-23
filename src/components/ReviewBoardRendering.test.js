import React from 'react';
import { fireEvent, render, waitForElement, wait } from '@testing-library/react';
import { Link, MemoryRouter } from 'react-router-dom';
import ReviewWorkspace from './ReviewWorkspace';
import * as ChessModule from 'chess.js';
import { useAuth } from '../auth/AuthProvider';
import { trainingRequest, TRAINING_POSITIONS_ADDED } from '../training/workspace';
import { trackEvent } from '../utils/trackEvent';
import { getAggressiveRepertoireReply } from '../data/aggressionTraining';

jest.mock('../auth/AuthProvider', () => ({ useAuth: jest.fn() }));
jest.mock('../training/workspace', () => ({
  ...jest.requireActual('../training/workspace'), trainingRequest: jest.fn()
}));
jest.mock('../firebase', () => ({ auth: {}, db: {}, functions: {} }));
jest.mock('./TopNav', () => () => null);
jest.mock('../utils/trackEvent', () => ({ trackEvent: jest.fn(), getExperimentVariant: () => 'A' }));

class TestStockfish {
  postMessage(command) {
    const respond = (data) => setTimeout(() => this.onmessage({ data }), 1);
    if (command === 'uci') respond('uciok');
    if (command === 'isready') respond('readyok');
    if (command.startsWith('go ')) respond('bestmove e2e4');
  }
  terminate() {}
}

beforeEach(() => {
  useAuth.mockReturnValue({ user: null, authLoading: false });
  trainingRequest.mockReset();
  window.Worker = TestStockfish;
  window.matchMedia = () => ({ matches: false, addListener: jest.fn(), removeListener: jest.fn() });
  jest.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  jest.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue();
});
afterEach(() => jest.restoreAllMocks());

test('lazy review renders actual pieces on first visit and retains its board when analysis completes and the route is revisited', async () => {
  window.innerWidth = 1280;
  let frameWidth = 480;
  jest.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => frameWidth);
  const view = render(<MemoryRouter initialEntries={['/my-games']}><Link to="/">Home test</Link><Link to="/my-games">Review test</Link><ReviewWorkspace /></MemoryRouter>);
  expect(view.getByText('Loading your workspace…')).toBeTruthy();
  await view.findByText('Import Game');
  const stage = () => view.container.querySelector('.gr-stage-card-board');
  const square = name => stage().querySelector('[data-squareid="' + name + '"]');
  const pawnAt = name => square(name).querySelector('[data-testid="wP-' + name + '"]');
  expect(pawnAt('e2')).toBeTruthy();
  await wait(() => expect(stage().querySelector('.gr-board-stack').style.width).toBe('480px'));
  const board = square('e2');
  fireEvent.click(view.getByLabelText('Paste or upload PGN'));
  fireEvent.change(view.getByPlaceholderText('Paste a PGN here'), { target: { value: '1. e4 e5 2. Nf3 Nc6 *' } });
  fireEvent.click(view.getByText('Load PGN'));
  await view.findByText(/^Open review$/i);
  expect(square('e2')).toBe(board);
  fireEvent.keyDown(document.body, { key: 'ArrowRight' });
  await waitForElement(() => pawnAt('e4') || undefined);
  expect(pawnAt('e2')).toBeNull();

  fireEvent.click(view.getByText('Home test'));
  expect(board.closest('[hidden]')).toBeTruthy();
  frameWidth = 410;
  fireEvent.click(view.getByText('Review test'));
  expect(board.closest('[hidden]')).toBeNull();
  await wait(() => expect(stage().querySelector('.gr-board-stack').style.width).toBe('380px'));
  expect(pawnAt('e4')).toBeTruthy();
  view.unmount();
});

test.each([
  ['Chess.com', 'none', 'stockfish_17_lite'],
  ['Lichess', 'startup', 'stockfish_11'],
  ['Chess.com', 'search', 'stockfish_17_lite'],
])('%s username import completes with the selected engine after %s failure', async (source, failure, engine) => {
  const originalFetch = window.fetch;
  const originalWasm = window.WebAssembly;
  const started = [];
  const searched = [];
  let searchFailed = false;
  let archiveRequested = false;
  const pgn = '[White "Example"]\n[Black "Opponent"]\n\n1. e4 e5 2. Nf3 Nc6 *';
  window.WebAssembly = originalWasm || {};
  window.Worker = class extends TestStockfish {
    constructor(path) {
      super();
      this.path = path;
      started.push(path);
    }
    postMessage(command) {
      if (command === 'uci' && failure === 'startup' && this.path.includes('stockfish-17')) {
        setTimeout(() => this.onerror(), 0);
        return;
      }
      if (command.startsWith('go ')) {
        if (failure === 'search' && !searchFailed) {
          searchFailed = true;
          setTimeout(() => this.onerror(), 0);
          return;
        }
        searched.push([this.path, command]);
      }
      super.postMessage(command);
    }
  };
  window.fetch = jest.fn(async (url) => {
    if (url.includes('lichess.org')) {
      return { status: 200, text: async () => JSON.stringify({ id: 'sample', pgn, createdAt: 1700000000000, players: { white: { user: { name: 'Example' } }, black: { user: { name: 'Opponent' } } } }) };
    }
    const games = url.includes('/games/') && !archiveRequested
      ? [{ uuid: 'sample', end_time: 1700000000, pgn, white: { username: 'Example' }, black: { username: 'Opponent' } }]
      : [];
    archiveRequested = true;
    return { status: 200, ok: true, json: async () => ({ games }) };
  });

  const view = render(<MemoryRouter initialEntries={['/my-games']}><ReviewWorkspace /></MemoryRouter>);
  try {
    fireEvent.click(await view.findByLabelText(`Load recent ${source} games`));
    fireEvent.change(view.getByPlaceholderText(`Enter a ${source} username`), { target: { value: 'Example' } });
    const game = await view.findByRole('button', { name: 'Review Example versus Opponent' });
    fireEvent.click(game);
    await view.findByText(/^Open review$/i);

    expect(started[0]).toContain('stockfish-17');
    expect(searched).toHaveLength(5);
    expect(searched.every(([path, command]) => path.includes(failure === 'startup' ? 'stockfish-worker.js' : 'stockfish-17') && command === 'go depth 12')).toBe(true);
    expect(trackEvent).toHaveBeenCalledWith('game_review_complete', expect.objectContaining({ engine, depth: 12, multi_pv: 3 }), null, { persist: false });
  } finally {
    view.unmount();
    window.fetch = originalFetch;
    window.WebAssembly = originalWasm;
  }
});

test.each(['paid', 'already saved', 'failure', 'free'])('completed %s review respects automatic and manual saving', async (scenario) => {
  const membershipActive = scenario !== 'free';
  useAuth.mockReturnValue({ user: { uid: 'player' }, membershipActive, authLoading: false });
  const Chess = ChessModule.Chess || ChessModule.default || ChessModule;
  const game = new Chess();
  const pgn = '1. a3 a6 2. h3 h6 3. b3 b6 4. g3 g6 5. Bg2 Bg7 6. Nc3 Nc6 7. Rb1 Rb8 8. Bb2 Bb7 *';
  const nextMoves = new Map();
  pgn.split(' ').filter((token) => !token.endsWith('.') && token !== '*').forEach((san) => {
    const fen = game.fen();
    const move = game.move(san);
    nextMoves.set(fen, move.from + move.to);
  });
  const searches = [];
  window.Worker = class extends TestStockfish {
    postMessage(command) {
      if (command.startsWith('position fen ')) this.fen = command.slice('position fen '.length);
      if (!command.startsWith('go ')) {
        super.postMessage(command);
        return;
      }
      searches.push(command);
      const board = new Chess(this.fen);
      const candidate = board.moves({ verbose: true }).find((move) => move.from + move.to !== nextMoves.get(this.fen));
      const uci = candidate.from + candidate.to + (candidate.promotion || '');
      setTimeout(() => {
        this.onmessage({ data: `info depth 12 multipv 1 score cp 300 pv ${uci}` });
        this.onmessage({ data: `bestmove ${uci}` });
      }, 1);
    }
  };
  if (scenario === 'failure') trainingRequest.mockRejectedValueOnce(new Error('offline'));
  trainingRequest.mockResolvedValue({ added: scenario === 'already saved' ? 0 : 3 });
  const notified = jest.fn();
  window.addEventListener(TRAINING_POSITIONS_ADDED, notified);
  const view = render(<MemoryRouter initialEntries={['/my-games']}><Link to="/">Leave review</Link><Link to="/my-games">Return to review</Link><ReviewWorkspace /></MemoryRouter>);
  try {
    fireEvent.click(await view.findByLabelText('Paste or upload PGN'));
    fireEvent.change(view.getByPlaceholderText('Paste a PGN here'), { target: { value: pgn } });
    fireEvent.click(view.getByText('Load PGN'));
    await view.findByText(/^Open review$/i);
    expect(view.queryByText(/Saved to Daily Training|positions added to Daily Training|Could not save this review/i)).toBeNull();
    expect(view.queryByText('Engine lines')).toBeNull();
    fireEvent.click(view.getByRole('button', { name: 'Options' }));
    expect(view.getByText('Engine lines').closest('details').open).toBe(false);
    if (scenario === 'free') {
      expect(trainingRequest).not.toHaveBeenCalled();
      expect(view.getByLabelText('Premium required to save to Daily Training')).toBeTruthy();
      return;
    }

    await wait(() => expect(trainingRequest).toHaveBeenCalledTimes(1));
    if (scenario === 'failure') await view.findByText(/Could not save this review/);
    expect(view.queryByText(/Saved to Daily Training|positions added to Daily Training/i)).toBeNull();
    expect(notified).toHaveBeenCalledTimes(scenario === 'paid' ? 1 : 0);
    const automatic = trainingRequest.mock.calls[0][0];
    expect(automatic).toMatchObject({ action: 'save_review', review: { depth: 12, multiPv: 3, puzzleCount: 4 } });
    expect(automatic.review.items).toHaveLength(3);
    const searchCount = searches.length;

    fireEvent.click(view.getByRole('button', { name: 'Options' }));
    fireEvent.click(view.getByText('Open review'));
    expect(view.queryByText('Load a game to review it')).toBeNull();
    expect(view.queryByText(/Saved to Daily Training|positions added to Daily Training|Could not save this review/i)).toBeNull();
    fireEvent.click(view.getByRole('button', { name: 'Practice missed moves from this game' }));
    const progress = view.getByRole('group', { name: 'Puzzle progress' });
    expect(progress.textContent).toBe('');
    expect(view.getByRole('button', { name: 'Puzzle 1: not completed' }).getAttribute('aria-current')).toBe('step');
    const { bestMove } = automatic.review.items[0];
    fireEvent.click(view.container.querySelector(`[data-squareid="${bestMove.slice(0, 2)}"]`));
    fireEvent.click(view.container.querySelector(`[data-squareid="${bestMove.slice(2, 4)}"]`));
    expect(view.getByRole('button', { name: 'Puzzle 1: solved' }).classList.contains('is-solved')).toBe(true);
    fireEvent.click(view.getByRole('button', { name: 'Puzzle 2: not completed' }));
    expect(view.getByRole('button', { name: 'Puzzle 2: not completed' }).getAttribute('aria-current')).toBe('step');
    fireEvent.click(view.getByRole('button', { name: 'Solution' }));
    expect(view.getByRole('button', { name: 'Puzzle 2: failed' }).classList.contains('is-failed')).toBe(true);
    fireEvent.click(view.getByRole('button', { name: 'Options' }));
    expect(view.getByText('Position details').closest('details').open).toBe(false);
    expect(view.getByText('Build Mistake Pack').closest('details').open).toBe(false);
    expect(view.queryByText(/Saved to Daily Training|positions added to Daily Training/i)).toBeNull();
    fireEvent.click(view.getByText('Leave review'));
    fireEvent.click(view.getByText('Return to review'));
    expect(trainingRequest).toHaveBeenCalledTimes(1);
    const options = view.getByRole('button', { name: 'Options' });
    if (options.getAttribute('aria-expanded') === 'false') fireEvent.click(options);
    fireEvent.click(view.getByLabelText('Save game and mistakes to Daily Training'));
    await view.findByText('Saved to your training history.');
    expect(trainingRequest).toHaveBeenCalledTimes(2);
    expect(trainingRequest.mock.calls[1][0].review.items).toHaveLength(4);
    expect(searches).toHaveLength(searchCount);
  } finally {
    view.unmount();
    window.removeEventListener(TRAINING_POSITIONS_ADDED, notified);
  }
}, 15000);


test('London queen training reaches Qb6 through the normal computer play controls', async () => {
  const view = render(<MemoryRouter initialEntries={['/my-games?mode=play']}><ReviewWorkspace /></MemoryRouter>);
  const clickSquare = (square) => fireEvent.click(view.container.querySelector(`[data-squareid="${square}"]`));
  try {
    fireEvent.change(await view.findByLabelText('Choose your opening'), { target: { value: 'london' } });
    fireEvent.change(view.getByLabelText('Training scenario'), { target: { value: 'queen' } });
    fireEvent.click(view.getByText('Play my opening'));
    await view.findByText('London vs Early Queen Attacks');
    clickSquare('d2');
    clickSquare('d4');
    await view.findByText('1. d4 d5');
    clickSquare('c1');
    clickSquare('f4');
    await view.findByText('1. d4 d5 2. Bf4 c5');
    clickSquare('e2');
    clickSquare('e3');
    await view.findByText('1. d4 d5 2. Bf4 c5 3. e3 Qb6');
  } finally {
    view.unmount();
  }
}, 10000);

test.each([
  ['london', ['d4', 'd5', 'Bf4', 'c5', 'Nf3'], 'Qb6'],
  ['london', ['d4', 'd5', 'Nf3', 'c5', 'Bf4'], 'Qb6'],
  ['italian', ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'], 'Qf6'],
  ['viennaGame', ['e4', 'e5', 'Nc3'], 'Qh4'],
  ['sicilian', ['e4', 'c5'], 'Qh5'],
  ['caroKann', ['e4', 'c6'], 'Qh5'],
])('early queen reply for %s preserves its queen', (opening, history, expected) => {
  const Chess = ChessModule.Chess || ChessModule.default || ChessModule;
  const game = new Chess();
  history.forEach((san) => expect(game.move(san)).toBeTruthy());
  const reply = getAggressiveRepertoireReply('queen', opening, history, game.fen());
  expect(reply).toBe(expected);
  expect(game.move(reply)).toBeTruthy();
  expect(game.moves({ verbose: true }).some((move) => move.captured === 'q')).toBe(false);
});

test('the scripted queen reply is skipped when the actual board allows a bishop capture', () => {
  const Chess = ChessModule.Chess || ChessModule.default || ChessModule;
  const game = new Chess();
  const history = ['d4', 'd5', 'Bf4', 'c5', 'e3'];
  history.forEach((san) => game.move(san));
  game.put({ type: 'b', color: 'w' }, 'a5');
  expect(getAggressiveRepertoireReply('queen', 'london', history, game.fen())).toBeNull();
});
