import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { Link, MemoryRouter } from 'react-router-dom';
import GameReview from './GameReview';

jest.mock('./TopNav', () => () => null);
jest.mock('chessboardjsx', () => () => <div>Chessboard</div>);
jest.mock('../utils/trackEvent', () => ({ trackEvent: jest.fn() }));

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
