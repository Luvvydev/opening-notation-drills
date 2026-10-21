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

beforeEach(() => { localStorage.clear(); useAuth.mockReturnValue({ user: null }); });

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
  expect(screen.getByRole('status').textContent).toMatch(/this line calls for Bf4/);
  expect(screen.getByTestId('demo-board').getAttribute('data-fen')).toBe(startingFen);
  for (let ply = 2; ply < HOME_DEMO_LINE.moves.length; ply += 2) {
    play(HOME_DEMO_LINE.moves[ply]);
    act(() => { jest.advanceTimersByTime(500); });
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
  expect(screen.getByRole('status').textContent).toMatch(/Your move: Bf4/);
  screen.unmount();
  jest.useRealTimers();
});

test('full library search and side filters combine, then clear without losing openings', () => {
  const screen = render(<MemoryRouter initialEntries={['/openings/library']}><Route path="/openings/library" component={Home} /></MemoryRouter>);
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
