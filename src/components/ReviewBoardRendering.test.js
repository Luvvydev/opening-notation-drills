import React from 'react';
import { fireEvent, render, waitForElement, wait } from '@testing-library/react';
import { Link, MemoryRouter } from 'react-router-dom';
import ReviewWorkspace from './ReviewWorkspace';
import { trackEvent } from '../utils/trackEvent';

jest.mock('../auth/AuthProvider', () => ({ useAuth: () => ({ user: null, authLoading: false }) }));
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
