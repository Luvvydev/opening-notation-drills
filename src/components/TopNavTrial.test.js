import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TopNav from './TopNav';
import { WorkspaceContext } from './WorkspaceShell';

jest.mock('../firebase', () => ({ functions: {} }));
jest.mock('../auth/AuthProvider', () => ({
  useAuth: () => ({ user: { uid: 'trial-user' }, isMember: true, trialActive: true,
    trialEndsAtMs: Date.now() + 2 * 86400000, signOut: jest.fn() })
}));
jest.mock('../utils/trackEvent', () => ({ trackEvent: jest.fn() }));
jest.mock('./WorkspaceShell', () => ({ WorkspaceContext: require('react').createContext(null) }));

test('trial status stays in account controls instead of a separate page banner', () => {
  const screen = render(<MemoryRouter><WorkspaceContext.Provider value={{ toggle: React.createRef(), openMenu: jest.fn() }}>
    <TopNav shellHeader hideHero />
  </WorkspaceContext.Provider></MemoryRouter>);
  expect(screen.getByText(/Trial · \d+ days left/)).toBeTruthy();
  expect(screen.container.querySelector('.topnav-trial-banner')).toBeNull();
  expect(screen.queryByText('Join Now')).toBeNull();
});
