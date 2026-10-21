import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import ProtectedRoute from '../auth/ProtectedRoute';
import GameReview from './GameReview';

// Keep this workspace mounted after its first visit. Its engine, imported game,
// analysis and puzzle pack stay in memory while the user visits another section.
// Nothing is retained across sign out, account changes or a browser refresh.
export default function ReviewWorkspace() {
  const { user, authLoading } = useAuth();
  const location = useLocation();
  const active = location.pathname === '/my-games' || location.pathname === '/review';
  const [owner, setOwner] = useState(null);
  const uid = user && user.uid;

  useEffect(() => {
    if (!uid) setOwner(null);
    else if (active) setOwner(uid);
  }, [uid, active]);

  if (authLoading) return active ? <p className="workspace-review-loading" role="status">Loading your workspace…</p> : null;
  if (!uid) return active ? <ProtectedRoute exact path={['/my-games', '/review']} component={GameReview} /> : null;
  if (!active && owner !== uid) return null;
  return <div hidden={!active}><GameReview key={uid} active={active} /></div>;
}
