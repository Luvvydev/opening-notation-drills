import React from 'react';
import { Redirect } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import LandingPage from '../components/LandingPage';

export default function PublicHome() {
  const { user } = useAuth();

  // Show the public page while Firebase restores a saved session.
  if (user) return <Redirect to="/home" />;

  return <LandingPage />;
}
