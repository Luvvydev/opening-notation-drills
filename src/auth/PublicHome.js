import React from 'react';
import { Redirect } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import LandingPage from '../components/LandingPage';

export default function PublicHome() {
  const { user, authLoading } = useAuth();

  // Wait for the saved session before choosing the public or signed in home.
  if (authLoading) return <p className="workspace-review-loading" role="status">Loading…</p>;
  if (user) return <Redirect to="/home" />;

  return <LandingPage />;
}
