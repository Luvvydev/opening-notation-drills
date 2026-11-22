import React from 'react';
import { Redirect, useLocation } from 'react-router-dom';

export default function PublicHome() {
  const location = useLocation();
  return <Redirect to={{ ...location, pathname: '/home' }} />;
}
