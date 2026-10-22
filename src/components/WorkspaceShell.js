import React, { createContext, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import TopNav from './TopNav';
import WorkspaceIcon from './WorkspaceIcon';
import logo from '../assets/chessdrillslogo.png';
import './WorkspaceShell.css';

export const WorkspaceContext = createContext(null);

const navigation = [
  { label: 'Home', icon: 'home', to: '/' },
  { label: 'Game Review', icon: 'review', to: '/my-games', mode: 'review' },
  { label: 'Openings', icon: 'openings', to: '/openings/library' },
  { label: 'Notation Practice', icon: 'notation', to: '/practice', secondary: true },
  { label: 'Play vs Computer', icon: 'computer', to: '/my-games?mode=play', mode: 'play' },
  { label: 'Leaderboards', icon: 'trophy', to: '/leaderboards' },
];

export default function WorkspaceShell({ children }) {
  const location = useLocation();
  const pathname = location.pathname.replace(/\/+$/, '') || '/';
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(() => {
    try { return localStorage.getItem('chessdrills.sidebar.expanded') !== 'false'; } catch (_) { return true; }
  });
  const [mobile, setMobile] = useState(() => window.innerWidth < 1024);
  const [open, setOpen] = useState(false);
  const [reviewMode, setReviewMode] = useState('review');
  const drawer = useRef(null);
  const toggle = useRef(null);
  const reviewing = ['/my-games', '/review'].includes(pathname);
  const activeMode = reviewMode;

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)');
    const update = () => { setMobile(media.matches); setOpen(false); };
    media.addListener(update);
    const updateMode = (event) => setReviewMode(event.detail);
    window.addEventListener('chessdrills:review-mode', updateMode);
    return () => { media.removeListener(update); window.removeEventListener('chessdrills:review-mode', updateMode); };
  }, []);

  useEffect(() => { setOpen(false); }, [location.pathname, location.search]);

  useEffect(() => {
    // Existing trainers listen for resize; recalculate after the rail changes width.
    const frame = window.requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    return () => window.cancelAnimationFrame(frame);
  }, [expanded]);

  useEffect(() => {
    if (!open || !mobile) return undefined;
    const previous = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () => Array.from(drawer.current.querySelectorAll('a, button'));
    focusable()[0].focus();
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
      if (event.key !== 'Tab') return;
      const items = focusable();
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener('keydown', onKey);
      if (previous && previous.focus) previous.focus();
    };
  }, [open, mobile]);

  const selected = (item) => item.mode
    ? reviewing && activeMode === item.mode
    : item.to === '/openings/library' ? pathname.startsWith('/openings') || pathname === '/demo'
      : pathname === item.to;
  const toggleExpanded = () => {
    setExpanded((value) => {
      try { localStorage.setItem('chessdrills.sidebar.expanded', String(!value)); } catch (_) {}
      return !value;
    });
  };

  return (
    <WorkspaceContext.Provider value={{ toggle, openMenu: () => setOpen(true) }}>
      <div className={`workspace-shell ${expanded ? 'is-expanded' : 'is-collapsed'}`}>
        <a className="workspace-skip" href="#workspace-content">Skip to content</a>
        {open && mobile && <button className="workspace-scrim" tabIndex={-1} aria-label="Close navigation" onClick={() => setOpen(false)} />}
        {(!mobile || open) && <aside ref={drawer} className={`workspace-rail ${open ? 'is-open' : ''}`} role={mobile ? 'dialog' : undefined} aria-modal={mobile ? 'true' : undefined} aria-label="Main navigation">
          <div className="workspace-brand">
            <Link to="/" aria-label="ChessDrills home" title="ChessDrills home"><img src={logo} alt="ChessDrills" /></Link>
            {mobile && <button type="button" className="workspace-icon-button" aria-label="Close menu" onClick={() => setOpen(false)}><WorkspaceIcon name="close" /></button>}
          </div>
          <nav aria-label="Training">
            {navigation.map((item) => <Link key={item.label} to={item.to} className={`workspace-nav-link ${selected(item) ? 'is-active' : ''} ${item.secondary ? 'starts-group' : ''}`} aria-current={selected(item) ? 'page' : undefined} title={item.label} onClick={() => setOpen(false)}>
              <WorkspaceIcon name={item.icon} /><span>{item.label}</span>
            </Link>)}
          </nav>
          <div className="workspace-rail-bottom">
            <Link to={user ? '/profile' : '/signup'} className={`workspace-nav-link ${pathname === '/profile' ? 'is-active' : ''}`} title={user ? 'Profile' : 'Create account'}><WorkspaceIcon name="profile" /><span>{user ? 'Profile' : 'Create account'}</span></Link>
            <Link to="/about" className="workspace-nav-link" title="Membership"><WorkspaceIcon name="info" /><span>Membership</span></Link>
            {!mobile && <button type="button" className="workspace-nav-link workspace-collapse" title={expanded ? 'Collapse sidebar' : 'Expand sidebar'} aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'} aria-expanded={expanded} onClick={toggleExpanded}><WorkspaceIcon name="collapse" /><span>Collapse</span></button>}
          </div>
        </aside>}
        <div className="workspace-main">
          <header className="workspace-header"><TopNav shellHeader hideHero /></header>
          <main id="workspace-content" tabIndex={-1}>{children}</main>
        </div>
      </div>
    </WorkspaceContext.Provider>
  );
}
