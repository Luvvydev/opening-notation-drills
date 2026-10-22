import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { Link, MemoryRouter, Route } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import ReviewWorkspace from './ReviewWorkspace';
import WorkspaceShell from './WorkspaceShell';

jest.mock('../auth/AuthProvider', () => ({ useAuth: jest.fn() }));
jest.mock('./GameReview', () => function Review() {
  const React = require('react');
  const [value, setValue] = React.useState(0);
  return <button onClick={() => setValue(value + 1)}>Review session {value}</button>;
});
jest.mock('./TopNav', () => function TopNav() {
  const React = require('react');
  const { WorkspaceContext } = require('./WorkspaceShell');
  const context = React.useContext(WorkspaceContext);
  return <button onClick={context.openMenu}>Open navigation menu</button>;
});

beforeEach(() => {
  localStorage.clear();
  useAuth.mockReturnValue({ user: { uid: 'test-user' }, authLoading: false });
  window.matchMedia = () => ({ matches: false, addListener: jest.fn(), removeListener: jest.fn() });
});

test.each(['/my-games', '/my-games/', '/review/'])('review state at %s survives section and account changes correctly', (url) => {
  const View = () => <MemoryRouter initialEntries={[url]}><Link to="/">Home</Link><Link to="/my-games?mode=puzzles">Puzzles</Link><Route exact path="/" render={() => <p>Homepage</p>} /><ReviewWorkspace /></MemoryRouter>;
  const screen = render(<View />);
  fireEvent.click(screen.getByText('Review session 0'));
  fireEvent.click(screen.getByText('Home'));
  expect(screen.getByText('Review session 1').closest('[hidden]')).not.toBeNull();
  fireEvent.click(screen.getByText('Puzzles'));
  expect(screen.getByText('Review session 1').closest('[hidden]')).toBeNull();
  useAuth.mockReturnValue({ user: { uid: 'another-user' }, authLoading: false });
  screen.rerender(<View />);
  expect(screen.getByText('Review session 0')).toBeTruthy();
});

test.each(['/my-games?mode=puzzles', '/my-games/?mode=puzzles'])('guest review shortcut %s keeps the puzzle mode through signup', (url) => {
  useAuth.mockReturnValue({ user: null, authLoading: false });
  const screen = render(<MemoryRouter initialEntries={[url]}><ReviewWorkspace /><Route path="/signup" render={({ location }) => <p>{location.search}</p>} /></MemoryRouter>);
  expect(screen.getByText(/from=.*mode%3Dpuzzles/)).toBeTruthy();
  expect(screen.queryByText('Review session 0')).toBeNull();
});

test.each([
  ['/my-games/', 'Game Review'],
  ['/review/', 'Game Review'],
  ['/openings/library/', 'Openings'],
  ['/demo/', 'Openings'],
  ['/practice/', 'Notation Practice'],
  ['/leaderboards/', 'Leaderboards'],
  ['/profile/', 'Profile'],
  ['/', 'Home']
])('sidebar highlights the correct item at %s', (url, label) => {
  const screen = render(<MemoryRouter initialEntries={[url]}><WorkspaceShell><p>Page content</p></WorkspaceShell></MemoryRouter>);
  expect(screen.getByRole('link', { name: label }).classList.contains('is-active')).toBe(true);
});

test('desktop rail collapses and mobile drawer closes with Escape', () => {
  const screen = render(<MemoryRouter><WorkspaceShell><p>Page content</p></WorkspaceShell></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
  expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeTruthy();
  screen.unmount();
  const originalWidth = window.innerWidth;
  window.innerWidth = 390;
  const mobile = render(<MemoryRouter><WorkspaceShell><p>Page content</p></WorkspaceShell></MemoryRouter>);
  fireEvent.click(mobile.getByText('Open navigation menu'));
  expect(mobile.getByRole('dialog', { name: 'Main navigation' })).toBeTruthy();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(mobile.queryByRole('dialog')).toBeNull();
  expect(document.body.style.overflow).not.toBe('hidden');
  mobile.unmount();
  window.innerWidth = originalWidth;
});
