import React from 'react';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LandingPage from './LandingPage';
import WorkspaceShell from './WorkspaceShell';
import { useAuth } from '../auth/AuthProvider';
import { LANDING_TACTICS } from './landingTactics';

jest.mock('../auth/AuthProvider', () => ({ useAuth: jest.fn() }));
jest.mock('../utils/trackEvent', () => ({ trackEvent: jest.fn() }));
jest.mock('./HomeOpeningDemo', () => () => <div>Opening demo</div>);
let mockPreviewProps;
jest.mock('chessboardjsx', () => (props) => { if (props.id === 'landing-review-preview') mockPreviewProps = props; return <div data-testid={props.id === 'landing-review-preview' ? 'preview-board' : props.id} data-fen={props.position} />; });
jest.mock('./TopNav', () => () => <div>Training navigation</div>);

beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
  jest.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  useAuth.mockReturnValue({ user: null });
  window.matchMedia = () => ({ matches: false, addListener: jest.fn(), removeListener: jest.fn() });
});

afterEach(() => { cleanup(); jest.clearAllTimers(); jest.useRealTimers(); jest.restoreAllMocks(); });

test('visitor can reveal a legal fork and reset the example', () => {
  const screen = render(<MemoryRouter><LandingPage /></MemoryRouter>);
  const before = screen.getByTestId('preview-board').getAttribute('data-fen');
  fireEvent.click(screen.getByRole('button', { name: /Show the better move/ }));
  const Chess = require('chess.js').Chess;
  const game = new Chess(screen.getByTestId('preview-board').getAttribute('data-fen'));
  expect(game.in_check()).toBe(true);
  expect(game.get('c7')).toEqual({ type: 'n', color: 'w' });
  expect(game.get('a8')).toEqual({ type: 'r', color: 'b' });
  fireEvent.click(screen.getByRole('button', { name: /Reset the example/ }));
  expect(screen.getByTestId('preview-board').getAttribute('data-fen')).toBe(before);
});

test('landing navigation and opening buttons link to the training pages', () => {
  const screen = render(<MemoryRouter><LandingPage /></MemoryRouter>);
  const navigation = within(screen.getByRole('navigation', { name: 'Landing page navigation' }));
  expect(navigation.getByRole('link', { name: 'Home' }).getAttribute('href')).toBe('/home');
  expect(navigation.getByRole('link', { name: 'Openings' }).getAttribute('href')).toBe('/openings/library');
  expect(navigation.getByRole('link', { name: 'Game Review' }).getAttribute('href')).toBe('/my-games');
  expect(navigation.getByRole('link', { name: 'Log in' }).getAttribute('href')).toBe('/login');
  expect(navigation.queryByRole('link', { name: 'How it works' })).toBeNull();
  expect(screen.getByRole('link', { name: 'Try the London demo' }).getAttribute('href')).toBe('#opening-demo');
  const openingButtons = screen.getAllByRole('link', { name: 'Try opening training' });
  expect(openingButtons).toHaveLength(3);
  openingButtons.forEach((link) => expect(link.getAttribute('href')).toBe('/openings/library'));
});

test('landing hides training navigation and existing home retains it', () => {
  const screen = render(<MemoryRouter><WorkspaceShell><LandingPage /></WorkspaceShell></MemoryRouter>);
  expect(screen.queryByLabelText('Main navigation')).toBeNull();
  expect(screen.queryByText('Training navigation')).toBeNull();
  screen.unmount();
  const training = render(<MemoryRouter initialEntries={['/home']}><WorkspaceShell><p>Existing home</p></WorkspaceShell></MemoryRouter>);
  expect(training.getByLabelText('Main navigation')).toBeTruthy();
  expect(training.getByText('Existing home')).toBeTruthy();
});

test('signed in visitors get a training shortcut and membership links', () => {
  useAuth.mockReturnValue({ user: { uid: 'member' } });
  const screen = render(<MemoryRouter><LandingPage /></MemoryRouter>);
  expect(screen.getByRole('link', { name: 'Home' }).getAttribute('href')).toBe('/home');
  screen.getAllByRole('link', { name: /See Premium/ }).forEach((link) => expect(link.getAttribute('href')).toBe('/about'));
});


test('incorrect moves reset the same position before dragging and tapping can solve it', () => {
  const screen = render(<MemoryRouter><LandingPage /></MemoryRouter>);
  const before = screen.getByTestId('preview-board').getAttribute('data-fen');
  act(() => { mockPreviewProps.onDrop({ sourceSquare: 'd5', targetSquare: 'd6' }); });
  expect(screen.getByRole('status').textContent).toMatch(/not legal/);
  expect(mockPreviewProps.draggable).toBe(false);
  act(() => { jest.advanceTimersByTime(1400); });
  expect(mockPreviewProps.draggable).toBe(true);
  act(() => { mockPreviewProps.onDrop({ sourceSquare: 'd5', targetSquare: 'f4' }); });
  expect(screen.getByTestId('preview-board').getAttribute('data-fen')).not.toBe(before);
  expect(screen.getByRole('status').textContent).toMatch(/Not quite/);
  expect(screen.container.querySelector('.landing-confetti')).toBeNull();
  act(() => { jest.advanceTimersByTime(1400); });
  expect(screen.getByTestId('preview-board').getAttribute('data-fen')).toBe(before);
  act(() => { mockPreviewProps.onDrop({ sourceSquare: 'd5', targetSquare: 'c7' }); });
  const solved = screen.getByTestId('preview-board').getAttribute('data-fen');
  expect(screen.container.querySelector('.landing-confetti')).not.toBeNull();
  expect(screen.getByRole('status').textContent).toMatch(/Correct/);
  fireEvent.click(screen.getByRole('button', { name: /Reset the example/ }));
  act(() => { mockPreviewProps.onSquareClick('d5'); });
  expect(mockPreviewProps.squareStyles.c7).toBeTruthy();
  act(() => { mockPreviewProps.onSquareClick('c7'); });
  expect(screen.getByTestId('preview-board').getAttribute('data-fen')).toBe(solved);
});

test('all four legal tactics advance automatically and wrap back to the knight fork', () => {
  const screen = render(<MemoryRouter><LandingPage /></MemoryRouter>);
  const before = mockPreviewProps.position;
  const Chess = require('chess.js').Chess;
  LANDING_TACTICS.forEach((tactic, index) => {
    expect(screen.getByText(`Position ${index + 1} of 4`)).toBeTruthy();
    act(() => { mockPreviewProps.onDrop({ sourceSquare: tactic.answer.from, targetSquare: tactic.answer.to }); });
    const game = new Chess(mockPreviewProps.position);
    if (index === 1 || index === 3) expect(game.in_checkmate()).toBe(true);
    if (index === 2) expect(game.get('d5')).toEqual({ color: 'w', type: 'b' });
    expect(screen.getByRole('status').textContent).toMatch(/Correct/);
    act(() => { jest.advanceTimersByTime(2600); });
    expect(screen.container.querySelector('.landing-confetti')).toBeNull();
  });
  expect(mockPreviewProps.position).toBe(before);
  expect(screen.getByText('Position 1 of 4')).toBeTruthy();
});

test('capture and check sounds follow the move, and mute stops queued audio', () => {
  const screen = render(<MemoryRouter><LandingPage /></MemoryRouter>);
  act(() => { mockPreviewProps.onDrop({ sourceSquare: 'd5', targetSquare: 'c7' }); });
  const soundSources = () => window.HTMLMediaElement.prototype.play.mock.instances.map((audio) => audio.src);
  expect(soundSources().some((src) => src.endsWith('/capture.mp3'))).toBe(true);
  act(() => { jest.advanceTimersByTime(130); });
  expect(soundSources().some((src) => src.endsWith('/landing-check.wav'))).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: /Reset the example/ }));
  window.HTMLMediaElement.prototype.play.mockClear();
  act(() => { mockPreviewProps.onDrop({ sourceSquare: 'd5', targetSquare: 'c7' }); });
  fireEvent.click(screen.getByRole('button', { name: 'Mute tactic sounds' }));
  act(() => { jest.advanceTimersByTime(130); });
  expect(soundSources().some((src) => src.endsWith('/landing-check.wav'))).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: /Reset the example/ }));
  window.HTMLMediaElement.prototype.play.mockClear();
  act(() => { mockPreviewProps.onDrop({ sourceSquare: 'd5', targetSquare: 'c7' }); });
  expect(window.HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
});

test('moving to a new position cancels the pending reset and unmount clears timers', () => {
  const screen = render(<MemoryRouter><LandingPage /></MemoryRouter>);
  act(() => { mockPreviewProps.onDrop({ sourceSquare: 'd5', targetSquare: 'c7' }); });
  fireEvent.click(screen.getByRole('button', { name: 'Next position' }));
  const next = mockPreviewProps.position;
  act(() => { jest.advanceTimersByTime(3000); });
  expect(mockPreviewProps.position).toBe(next);
  expect(screen.getByText('Position 2 of 4')).toBeTruthy();
  act(() => { mockPreviewProps.onDrop({ sourceSquare: 'h5', targetSquare: 'f7' }); });
  screen.unmount();
  expect(jest.getTimerCount()).toBe(0);
});


test('opening training leads the page while game review and all tactics remain available', () => {
  const screen = render(<MemoryRouter><LandingPage /></MemoryRouter>);
  expect(screen.container.querySelector('h1').textContent).toBe('Learn your openings.Know what to play.');
  expect(screen.container.querySelector('.landing-hero').textContent).toContain('Opening demo');
  expect(screen.container.querySelector('.landing-review').querySelector('[data-testid="preview-board"]')).not.toBeNull();
  expect(screen.getByRole('link', { name: 'Train the Italian Game' }).getAttribute('href')).toBe('/openings?opening=italian');
  expect(screen.getByRole('link', { name: 'Train the Caro Kann Defense' }).getAttribute('href')).toBe('/openings?opening=carokann');
  expect(screen.getByRole('link', { name: 'Train the Sicilian Defense' }).getAttribute('href')).toBe('/openings?opening=sicilian');
  expect(screen.getAllByText('Opening demo').length).toBe(1);
  expect(screen.getByRole('link', { name: /Review my first game/ }).getAttribute('href')).toBe('/my-games');
});
