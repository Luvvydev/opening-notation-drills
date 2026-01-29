import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './TopNav.css';
import { getStreakState } from '../utils/streak';
import { useAuth } from "../auth/AuthProvider";

const wittySubtitles = [
  "Because guessing on move six is not a plan",
  "So your openings stop collapsing by move ten",
  "Memorize first, improvise later",
  "Make the first ten moves feel automatic",
  "So the opening feels familiar instead of stressful",
  "Build muscle memory before the clock starts ticking",
  "Confidence starts before move one",
  "Reps now so the middlegame feels easier",
  "Turn preparation into a quiet advantage",
  "Openings that feel boring to practice and great to play",
  "Because clarity beats scrambling",
  "Get comfortable early and play better later",
  "Less thinking early, more thinking where it matters",
  "Reps now, blunders later",
];

function TopNav(props) {
  const title = props.title || 'Chess Opening Reps';

  const [subtitle, setSubtitle] = useState('');
  const [streak, setStreak] = useState(() => getStreakState());

  const { user, signOut } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuWrapRef = useRef(null);

  useEffect(() => {
    setSubtitle(wittySubtitles[Math.floor(Math.random() * wittySubtitles.length)]);
  }, []);

  useEffect(() => {
    const refresh = () => setStreak(getStreakState());

    window.addEventListener("streak:updated", refresh);

    const onVis = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVis);

    const t = setInterval(refresh, 60000);

    return () => {
      window.removeEventListener("streak:updated", refresh);
      document.removeEventListener("visibilitychange", onVis);
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const onDocMouseDown = (e) => {
      if (!menuWrapRef.current) return;
      if (!menuWrapRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };

    const onKeyDown = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const homeButton =
    props.active === 'home' && props.onHome ? (
      <button className="topnav-button active" onClick={props.onHome}>
        Home
      </button>
    ) : (
      <Link to="/">
        <button className={props.active === 'home' ? 'topnav-button active' : 'topnav-button'}>
          Home
        </button>
      </Link>
    );

  const profileHref = user ? "/profile" : "/signup";

  const onToggleMenu = () => {
    if (!user) return;
    setMenuOpen((v) => !v);
  };

  const onSignOut = async () => {
    try {
      setMenuOpen(false);
      await signOut();
    } catch (e) {
      // keep silent here; Profile page already has visible error states for edits,
      // and auth signout failures are rare. If you want, we can surface a toast.
    }
  };

  return (
    <>
      <div className="page-hero">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      <div className="topnav">
        <div className="topnav-inner">
          <div className="topnav-actions">
            {homeButton}

            <Link to="/practice">
              <button className={props.active === 'practice' ? 'topnav-button active' : 'topnav-button'}>
                Practice Notation
              </button>
            </Link>

            <Link to="/openings">
              <button className={props.active === 'openings' ? 'topnav-button active' : 'topnav-button'}>
                Openings Trainer
              </button>
            </Link>

            <Link to="/about">
              <button className={props.active === 'about' ? 'topnav-button active' : 'topnav-button'}>
                About
              </button>
            </Link>

            {props.showSpeedDrill ? (
              <button className="topnav-button primary" onClick={props.onSpeedDrill}>
                Start Notation Drill
              </button>
            ) : null}

            <div className="topnav-right" ref={menuWrapRef}>
              <div className="topnav-streak" title={streak.best ? `Best: ${streak.best}` : ""}>
                <span className="topnav-streak-text">
                  <span role="img" aria-label="streak">🔥</span> {streak.current || 0}
                </span>
              </div>

              {user ? (
                <>
                  <button
                    type="button"
                    className="topnav-profile topnav-profile-btn"
                    onClick={onToggleMenu}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen ? "true" : "false"}
                    title="Profile"
                  >
                    <span className="topnav-profile-icon" aria-hidden="true">👤</span>
                  </button>

                  {menuOpen ? (
                    <div className="topnav-menu" role="menu">
                      <Link
                        to={profileHref}
                        className="topnav-menu-item"
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                      >
                        My Profile
                      </Link>

                      <button
                        type="button"
                        className="topnav-menu-item topnav-menu-danger"
                        role="menuitem"
                        onClick={onSignOut}
                      >
                        Log out
                      </button>
                    </div>
                  ) : null}
                </>
              ) : (
                <Link to={profileHref} className="topnav-profile-link" title="Sign up">
                  <div className="topnav-profile">
                    <span className="topnav-profile-icon" aria-hidden="true">👤</span>
                  </div>
                </Link>
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

export default TopNav;
