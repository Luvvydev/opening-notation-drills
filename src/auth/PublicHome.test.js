import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Link } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import PublicHome from './PublicHome';

jest.mock('./AuthProvider', () => ({ useAuth: jest.fn() }));
jest.mock('../components/LandingPage', () => () => <h1>Public landing page</h1>);

function View() {
  return <MemoryRouter><Link to="/">Logo</Link><Route exact path="/" component={PublicHome} /><Route exact path="/home" render={() => <h1>Training home</h1>} /></MemoryRouter>;
}

test('signed out visitors see the landing page after the session check', () => {
  useAuth.mockReturnValue({ user: null, authLoading: false });
  const screen = render(<View />);
  expect(screen.getByText('Public landing page')).toBeTruthy();
  expect(screen.queryByText('Training home')).toBeNull();
});

test('a restored signed in session redirects to the training home', () => {
  useAuth.mockReturnValue({ user: null, authLoading: true });
  const screen = render(<View />);
  expect(screen.getByText('Public landing page')).toBeTruthy();
  useAuth.mockReturnValue({ user: { uid: 'member' }, authLoading: false });
  screen.rerender(<View />);
  expect(screen.getByText('Training home')).toBeTruthy();
  expect(screen.queryByText('Public landing page')).toBeNull();
  fireEvent.click(screen.getByText('Logo'));
  expect(screen.getByText('Training home')).toBeTruthy();
  expect(screen.queryByText('Public landing page')).toBeNull();
});

test('the landing page is visible while a signed out session resolves', () => {
  useAuth.mockReturnValue({ user: null, authLoading: true });
  const screen = render(<View />);
  expect(screen.getByText('Public landing page')).toBeTruthy();
  useAuth.mockReturnValue({ user: null, authLoading: false });
  screen.rerender(<View />);
  expect(screen.getByText('Public landing page')).toBeTruthy();
});
