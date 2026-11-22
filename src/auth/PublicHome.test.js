import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Link } from 'react-router-dom';
import PublicHome from './PublicHome';

function View({ entry = '/' }) {
  return <MemoryRouter initialEntries={[entry]}><Link to="/">Logo</Link><Route exact path="/" component={PublicHome} /><Route exact path="/home" render={({ location }) => <><h1>Training home</h1><span>{location.search}{location.hash}</span></>} /></MemoryRouter>;
}

test('the site root opens the training home immediately', () => {
  const screen = render(<View />);
  expect(screen.getByText('Training home')).toBeTruthy();
  fireEvent.click(screen.getByText('Logo'));
  expect(screen.getByText('Training home')).toBeTruthy();
});

test('the root redirect preserves the query string and hash', () => {
  const screen = render(<View entry="/?utm_source=youtube#opening-demo" />);
  expect(screen.getByText('Training home')).toBeTruthy();
  expect(screen.getByText('?utm_source=youtube#opening-demo')).toBeTruthy();
});
