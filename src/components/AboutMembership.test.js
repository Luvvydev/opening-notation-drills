import React from 'react';
import { fireEvent, render, wait } from '@testing-library/react';
import About from './About';
import { useAuth } from '../auth/AuthProvider';
import { httpsCallable } from 'firebase/functions';

jest.mock('../auth/AuthProvider', () => ({ useAuth: jest.fn() }));
jest.mock('../firebase', () => ({ db: {}, functions: {}, serverTimestamp: jest.fn() }));
jest.mock('firebase/firestore', () => ({ doc: jest.fn(), runTransaction: jest.fn() }));
jest.mock('firebase/functions', () => ({ httpsCallable: jest.fn() }));
jest.mock('../utils/trackEvent', () => ({ trackEvent: jest.fn(), trackOncePerUser: jest.fn() }));
jest.mock('./TopNav', () => () => null);
jest.mock('./SEO', () => () => null);
jest.mock('chessboardjsx', () => () => <div />);

beforeEach(() => {
  jest.clearAllMocks();
  useAuth.mockReturnValue({ user: { uid: 'member-test' }, trialEligible: true });
});

test('guest can start signup for a trial even when auth eligibility is unset', () => {
  useAuth.mockReturnValue({ user: null, trialEligible: false });
  const screen = render(<About />);
  expect(screen.getByRole('button', { name: 'Start free trial' }).disabled).toBe(false);
  expect(screen.queryByText('Trial already used')).toBeNull();
});

test('expired trial offers paid plans without a dead trial button', () => {
  useAuth.mockReturnValue({ user: { uid: 'expired' }, trialEligible: false, trialExpired: true });
  const screen = render(<About />);
  expect(screen.getByText('Your free trial has ended')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Start free trial' })).toBeNull();
  expect(screen.getByText('$39')).toBeTruthy();
});

test('selected monthly plan and card method reach the existing checkout function', async () => {
  const checkout = jest.fn().mockResolvedValue({ data: { alreadyActive: true } });
  httpsCallable.mockReturnValue(checkout);
  const history = { replace: jest.fn() };
  const screen = render(<About history={history} location={{ state: { from: '/practice' } }} />);
  fireEvent.click(screen.getByRole('button', { name: /Monthly.*5.99/ }));
  expect(screen.getByText('Continue with monthly membership')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /Continue with Card/ }));
  await wait(() => expect(checkout).toHaveBeenCalledWith({ plan: 'monthly', method: 'card' }));
  expect(httpsCallable).toHaveBeenCalledWith({}, 'createPaypalCheckout');
  expect(history.replace).toHaveBeenCalledWith('/practice');
});

test('existing membership shows continue training instead of checkout', () => {
  useAuth.mockReturnValue({ user: { uid: 'paid' }, hasPaidMembership: true });
  const screen = render(<About />);
  expect(screen.getByRole('button', { name: 'Continue training' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: /Continue with Card/ })).toBeNull();
});
