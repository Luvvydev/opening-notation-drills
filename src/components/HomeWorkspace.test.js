import React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { MemoryRouter, Route } from 'react-router-dom';
import HomeOpeningDemo, { HOME_DEMO_LINE } from './HomeOpeningDemo';
import Home from './Home';
import { useAuth } from '../auth/AuthProvider';

jest.mock('../auth/AuthProvider', () => ({ useAuth: jest.fn() }));
jest.mock('../utils/trackEvent', () => ({ trackEvent: jest.fn() }));
let mockBoardProps;
jest.mock('chessboardjsx', () => (props) => { mockBoardProps = props; return <div data-testid="demo-board" data-fen={props.position} />; });

beforeEach(() => { jest.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve()); jest.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => {}); localStorage.clear(); useAuth.mockReturnValue({ user: null }); });

test('homepage demo rejects illegal and off-line moves, completes its London line, and resets', () => {
  jest.useFakeTimers();
  const screen = render(<MemoryRouter><HomeOpeningDemo /></MemoryRouter>);
  const Chess = require('chess.js').Chess;
  const play = (san) => {
    const game = new Chess(mockBoardProps.position);
    const move = game.moves({ verbose: true }).find((candidate) => candidate.san === san);
    act(() => { mockBoardProps.onDrop({ sourceSquare: move ? move.from : 'd1', targetSquare: move ? move.to : 'h5' }); });
  };
  const startingFen = screen.getByTestId('demo-board').getAttribute('data-fen');
  play('Qh5');
  expect(screen.getByRole('status').textContent).toMatch(/not legal/);
  expect(screen.getByTestId('demo-board').getAttribute('data-fen')).toBe(startingFen);
  play('Nf3');
  expect(screen.getByRole('status').textContent).toMatch(/try the idea in the instruction/);
  expect(screen.getByTestId('demo-board').getAttribute('data-fen')).toBe(startingFen);
  for (let ply = 2; ply < HOME_DEMO_LINE.moves.length; ply += 2) {
    play(HOME_DEMO_LINE.moves[ply]);
    act(() => { jest.advanceTimersByTime(700); });
  }
  expect(screen.getByRole('status').textContent).toMatch(/Line complete/);
  expect(screen.getByText('Train the London System →').getAttribute('href')).toBe('/openings?opening=london');
  fireEvent.click(screen.getByText('Reset'));
  expect(screen.getByTestId('demo-board').getAttribute('data-fen')).toBe(startingFen);
  screen.unmount();
  jest.useRealTimers();
});

test('reset cancels a pending automatic reply', () => {
  jest.useFakeTimers();
  const screen = render(<MemoryRouter><HomeOpeningDemo /></MemoryRouter>);
  const startingFen = screen.getByTestId('demo-board').getAttribute('data-fen');
  act(() => { mockBoardProps.onSquareClick('c1'); });
  act(() => { mockBoardProps.onSquareClick('f4'); });
  fireEvent.click(screen.getByText('Reset'));
  act(() => { jest.advanceTimersByTime(600); });
  expect(screen.getByTestId('demo-board').getAttribute('data-fen')).toBe(startingFen);
  expect(screen.getByRole('status').textContent).toMatch(/The London Bishop/);
  screen.unmount();
  jest.useRealTimers();
});

test.each(['/openings/library', '/openings/library/'])('full library search and filters work at %s', (pathname) => {
  const screen = render(<MemoryRouter initialEntries={[pathname]}><Route path="/openings/library" component={Home} /></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Opening library' }).hidden).toBe(false);
  expect(screen.container.querySelector('.home-workspace-hero')).toBeNull();
  const cards = () => screen.container.querySelectorAll('.home-opening-card');
  const total = cards().length;
  expect(total).toBeGreaterThan(20);
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'sicilian' } });
  expect(cards().length).toBe(1);
  fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
  fireEvent.click(screen.getByLabelText('White'));
  expect(cards().length).toBe(0);
  expect(screen.getByText('No openings match those filters.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Clear search and filters' }));
  expect(cards().length).toBe(total);
});

test('guest homepage shows the full opening library without a separate puzzle shortcut', () => {
  const screen = render(<MemoryRouter><Route path="/" component={Home} /></MemoryRouter>);
  expect(screen.container.querySelectorAll('.home-opening-card').length).toBe(25);
  expect(screen.queryByText(/0\/.*lines learned/)).toBeNull();
  expect(screen.queryByText('Mistake Puzzles')).toBeNull();
  expect(screen.queryByLabelText('Move in chess notation')).toBeNull();
  expect(screen.getByText(/Enter your username, select a game/)).toBeTruthy();
});

test('lesson guidance hides the answer until Hint and waits before Black replies', () => {
  jest.useFakeTimers();
  const screen = render(<MemoryRouter><HomeOpeningDemo /></MemoryRouter>);
  expect(screen.getByRole('status').textContent).toContain(HOME_DEMO_LINE.explanations[2]);
  expect(screen.queryByText(/Play Bf4:/)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
  expect(screen.getByText('Play Bf4: c1 → f4.')).toBeTruthy();
  expect(mockBoardProps.squareStyles.f4).toBeTruthy();
  act(() => { mockBoardProps.onDrop({ sourceSquare: 'c1', targetSquare: 'f4' }); });
  const playerFen = mockBoardProps.position;
  expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();
  act(() => { jest.advanceTimersByTime(600); });
  expect(mockBoardProps.position).toBe(playerFen);
  act(() => { jest.advanceTimersByTime(100); });
  expect(mockBoardProps.position).not.toBe(playerFen);
  expect(screen.getByRole('status').textContent).toContain('Solidify!');
  expect(screen.queryByText(/Play Bf4:/)).toBeNull();
  screen.unmount();
  jest.useRealTimers();
});
