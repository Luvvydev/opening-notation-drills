import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './TopNav.css';
import { getStreakState } from '../utils/streak';

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

  useEffect(() => {
    setSubtitle(wittySubtitles[Math.floor(Math.random() * wittySubtitles.length)]);
  }, []);

  useEffect(() => {
    const refresh = () => setStreak(getStreakState());

    // Custom event fired by markLineCompletedToday()
    window.addEventListener("streak:updated", refresh);

    // If user leaves tab open across midnight, update on focus/visibility.
    const onVis = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVis);

    // Low cost periodic refresh for safety
    const t = setInterval(refresh, 60000);

    return () => {
      window.removeEventListener("streak:updated", refresh);
      document.removeEventListener("visibilitychange", onVis);
      clearInterval(t);
    };
  }, []);

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

<div
  className="topnav-streak"
  title={streak.best ? `Best: ${streak.best}` : ""}
  style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}
>
  <span style={{ fontWeight: 700 }}>
    <span role="img" aria-label="streak">🔥</span> {streak.current || 0}
  </span>
</div>

          </div>
        </div>
      </div>

          </>
  );
}

export default TopNav;
