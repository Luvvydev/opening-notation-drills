import React, { lazy, Suspense, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';

const GameReview = lazy(() => import('./GameReview'));

// Keep this workspace mounted after its first visit. Its engine, imported game,
// analysis and puzzle pack stay in memory while the user visits another section.
// Nothing is retained across sign out, account changes or a browser refresh.
export default function ReviewWorkspace() {
  const { user, authLoading } = useAuth();
  const location = useLocation();
  const pathname = location.pathname.replace(/\/+$/, '');
  const active = pathname === '/my-games' || pathname === '/review';
  const [owner, setOwner] = useState(null);
  const uid = (user && user.uid) || 'guest';

  useEffect(() => {
    if (active) setOwner(uid);
  }, [uid, active]);

  const loading = active ? <p className="workspace-review-loading" role="status">Loading your workspace…</p> : null;
  if (authLoading) return loading;
  if (!active && owner !== uid) return null;
  return (
    <div hidden={!active}>
      <Suspense fallback={loading}>
        <GameReview key={uid} active={active} />
      </Suspense>
    </div>
  );
}
