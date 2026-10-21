import React from 'react';
import { fireEvent, render, waitForElement } from '@testing-library/react';
import { Link, MemoryRouter } from 'react-router-dom';
import GameReview from './GameReview';
import { httpsCallable } from 'firebase/functions';

jest.mock('../auth/AuthProvider', () => ({ useAuth: () => ({ user: { uid: 'test-user' }, hasPaidMembership: false }) }));
jest.mock('../firebase', () => ({ auth: { currentUser: { uid: 'test-user' } }, functions: {} }));
jest.mock('firebase/functions', () => ({ httpsCallable: jest.fn() }));

jest.mock('./TopNav', () => () => null);
jest.mock('chessboardjsx', () => () => <div>Chessboard</div>);
jest.mock('../utils/trackEvent', () => ({ trackEvent: jest.fn() }));

beforeEach(() => {
  jest.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  window.matchMedia = () => ({ matches: false, addListener: jest.fn(), removeListener: jest.fn() });
});

test('puzzle shortcut opens pack creation, computer shortcut changes modes without clearing import fields', () => {
  jest.useFakeTimers();
  const pause = jest.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  const screen = render(<MemoryRouter initialEntries={['/my-games?mode=puzzles']}>
    <Link to="/my-games?mode=play">Computer shortcut</Link>
    <Link to="/my-games">Review shortcut</Link>
    <GameReview />
  </MemoryRouter>);
  expect(screen.getByRole('button', { name: 'Create Mistake Pack from recent games' })).toBeTruthy();
  const name = screen.getByPlaceholderText(/username/i);
  fireEvent.change(name, { target: { value: 'sample-player' } });
  fireEvent.click(screen.getByText('Computer shortcut'));
  expect(screen.getByRole('heading', { name: 'Play vs Computer' })).toBeTruthy();
  fireEvent.click(screen.getByText('Review shortcut'));
  expect(screen.getByPlaceholderText(/username/i).value).toBe('sample-player');
  screen.unmount();
  pause.mockRestore();
  jest.useRealTimers();
});


test('a used preview blocks a new game before analysis and shows membership access', async () => {
  const authorize = jest.fn().mockRejectedValue({ code: 'functions/permission-denied' });
  httpsCallable.mockReturnValue(authorize);
  const screen = render(<MemoryRouter initialEntries={['/my-games']}><GameReview /></MemoryRouter>);
  fireEvent.click(screen.getByLabelText('Paste or upload PGN'));
  fireEvent.change(screen.getByPlaceholderText('Paste a PGN here'), { target: { value: '1. e4 e5 2. Nf3 Nc6 *' } });
  fireEvent.click(screen.getByText('Load PGN'));
  await waitForElement(() => screen.getByText(/Your free game preview has been used/));
  expect(httpsCallable).toHaveBeenCalledWith({}, 'authorizeGameReview');
  expect(authorize.mock.calls[0][0].action).toBe('review');
  expect(screen.queryByText('Full review finished.')).toBeNull();
  expect(screen.getByText('View membership').getAttribute('href')).toBe('/about');
  screen.unmount();
});

test('access verification errors do not grant a preview', async () => {
  httpsCallable.mockReturnValue(jest.fn().mockRejectedValue({ code: 'functions/unavailable' }));
  const screen = render(<MemoryRouter><GameReview /></MemoryRouter>);
  fireEvent.click(screen.getByLabelText('Paste or upload PGN'));
  fireEvent.change(screen.getByPlaceholderText('Paste a PGN here'), { target: { value: '1. e4 e5 2. Nf3 Nc6 *' } });
  fireEvent.click(screen.getByText('Load PGN'));
  await waitForElement(() => screen.getByText(/Could not verify review access/));
  expect(screen.queryByText('Full review finished.')).toBeNull();
  screen.unmount();
});
