// TopNav.js
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";
import './TopNav.css';
import { getStreakState, ymdLocal } from '../utils/streak';
import { getActivityDays } from '../utils/activityDays';
import { useAuth } from "../auth/AuthProvider";
import logo from "../assets/chessdrillslogo.png";

const DISCORD_INVITE_URL = "https://discord.gg/BtCHkuDqJq";
const CHESSDRILLS_BASE_URL = "https://chessdrills.net";

const wittySubtitles = [
  "Because guessing on move six is not a plan",
  "So your openings stop collapsing by move ten",
  "Memorize first, improvise later",
  "Make the first ten moves feel automatic",
  "So the opening feels familiar instead of stressful",
  "Build muscle memory before the clock starts ticking",
  "Confidence starts before move one",
  "Drills now so the middlegame feels easier",
  "Turn preparation into a quiet advantage",
  "Openings that feel boring to practice and great to play",
  "Because clarity beats scrambling",
  "Get comfortable early and play better later",
  "Less thinking early, more thinking where it matters",
  "Drills now, blunders later",
];

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function buildCurrentWeek(activityDays) {
  const today = new Date();
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  start.setDate(today.getDate() - today.getDay());

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = ymdLocal(date);
    return {
      key,
      label: WEEKDAY_LABELS[index],
      isToday: key === ymdLocal(),
      done: (Number(activityDays[key]) || 0) > 0,
    };
  });
}

function TopNav(props) {
  const title = props.title || 'Chess Opening Drills';
  const hideHero = props.hideHero !== false;

  const [subtitle, setSubtitle] = useState('');
  const [streak, setStreak] = useState(() => getStreakState());
  const [activityDays, setActivityDays] = useState(() => getActivityDays());
  const [streakOpen, setStreakOpen] = useState(false);

  const { user, signOut, isMember } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [ctaLabel, setCtaLabel] = useState('Start for free');
  const menuWrapRef = useRef(null);
  const streakWrapRef = useRef(null);

  useEffect(() => {
    setSubtitle(wittySubtitles[Math.floor(Math.random() * wittySubtitles.length)]);
  }, []);

  useEffect(() => {
    if (isMember) return;

    const isLoggedIn = !!user;
    const key = isLoggedIn
      ? 'chessdrills.cta.startfree.freeuser.v1'
      : 'chessdrills.cta.startfree.loggedout.v1';

    const variants = isLoggedIn
      ? { A: 'Upgrade', B: 'Go Premium' }
      : { A: 'Start for free', B: 'Create free account' };

    let v = 'A';
    try {
      const stored = window.localStorage.getItem(key);
      if (stored === 'A' || stored === 'B') {
        v = stored;
      } else {
        v = Math.random() < 0.5 ? 'A' : 'B';
        window.localStorage.setItem(key, v);
      }
    } catch (_) {}

    setCtaLabel(variants[v] || variants.A);
  }, [user, isMember]);

  useEffect(() => {
    const refresh = () => {
      setStreak(getStreakState());
      setActivityDays(getActivityDays());
    };

    window.addEventListener("streak:updated", refresh);
    window.addEventListener("activity:updated", refresh);

    const onVis = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVis);

    const t = setInterval(refresh, 60000);

    return () => {
      window.removeEventListener("streak:updated", refresh);
      window.removeEventListener("activity:updated", refresh);
      document.removeEventListener("visibilitychange", onVis);
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen && !streakOpen) return;

    const onDocMouseDown = (e) => {
      if (menuWrapRef.current && !menuWrapRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
      if (streakWrapRef.current && !streakWrapRef.current.contains(e.target)) {
        setStreakOpen(false);
      }
    };

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setStreakOpen(false);
      }
    };

    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen, streakOpen]);

  const profileHref = user ? "/profile" : "/signup";

  const onToggleMenu = () => {
    if (!user) return;
    setStreakOpen(false);
    setMenuOpen((v) => !v);
  };

  const onToggleStreak = () => {
    setMenuOpen(false);
    setStreakOpen((v) => !v);
  };

  const onJoinDiscord = () => {
    try {
      window.open(DISCORD_INVITE_URL, "_blank", "noopener,noreferrer");
    } catch (e) {
      window.location.href = DISCORD_INVITE_URL;
    }
  };

  const onLinkDiscord = async () => {
    if (!user) return;
    try {
      setMenuOpen(false);
      const redirectUri = CHESSDRILLS_BASE_URL + "/#/discord";
      const fn = httpsCallable(functions, "getDiscordOAuthUrl");
      const res = await fn({ redirectUri });
      const url = res && res.data ? res.data.url : null;

      if (typeof url === "string" && url.startsWith("http")) {
        window.location.href = url;
        return;
      }

      window.location.href = redirectUri;
    } catch (e) {
      alert("Discord linking is not available yet.");
    }
  };

  const onSignOut = async () => {
    try {
      setMenuOpen(false);
      await signOut();
    } catch (e) {}
  };

  const weekDays = buildCurrentWeek(activityDays);
  const streakTitle = `${streak.current || 0} ${(streak.current || 0) === 1 ? 'day' : 'days'} streak`;
  const streakSubtitle = streak.completedToday
    ? "You've done your line for today!"
    : 'Complete a line today to keep it going.';

  return (
    <>
      <div className="topnav">
        <div className="topnav-inner">
          <Link to="/" className="topnav-logo-link" aria-label="Home">
            <img src={logo} alt="chessdrills.net" className="topnav-logo" />
          </Link>

          <div className="topnav-actions">
            <div className="topnav-right">
              {(!user || !isMember) && (
                <Link
                  to={
                    user
                      ? { pathname: "/about", state: { from: "topnav", reason: "upgrade_cta" } }
                      : { pathname: "/signup", state: { from: "topnav", reason: "start_free" } }
                  }
                  className="topnav-button topnav-startfree topnav-startfree-pulse"
                  onClick={() => setMenuOpen(false)}
                >
                  {ctaLabel}
                </Link>
              )}

              <div className="topnav-streak-wrap" ref={streakWrapRef}>
                <button
                  type="button"
                  className="topnav-streak"
                  title={streak.best ? `Best: ${streak.best}` : "Open streak"}
                  onClick={onToggleStreak}
                  aria-haspopup="dialog"
                  aria-expanded={streakOpen ? 'true' : 'false'}
                >
                  <span className="topnav-streak-text">
                    <span className="topnav-streak-flame" role="img" aria-label="streak">🔥</span>
                    <span>{streak.current || 0}</span>
                  </span>
                </button>

                {streakOpen ? (
                  <div className="topnav-streak-popover" role="dialog" aria-label="Streak calendar">
                    <div className="topnav-streak-card-head">
                      <div>
                        <div className="topnav-streak-card-title">{streakTitle}</div>
                        <div className="topnav-streak-card-subtitle">{streakSubtitle}</div>
                      </div>
                      <div className="topnav-streak-card-flame" aria-hidden="true">🔥</div>
                    </div>

                    <div className="topnav-streak-weekdays">
                      {weekDays.map((day) => (
                        <div key={day.key} className="topnav-streak-weekday-label">{day.label}</div>
                      ))}
                    </div>

                    <div className="topnav-streak-weekgrid">
                      {weekDays.map((day) => (
                        <div
                          key={day.key + '-cell'}
                          className={
                            'topnav-streak-day' +
                            (day.done ? ' is-done' : '') +
                            (day.isToday ? ' is-today' : '')
                          }
                          title={day.key}
                          aria-label={`${day.key}${day.done ? ' completed' : ' not completed'}`}
                        >
                          {day.done ? '✓' : ''}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              {user ? (
                <div
                  className={
                    "topnav-member-pill " +
                    (isMember ? "member" : "free")
                  }
                  title={
                    isMember ? "Member" : "Free"
                  }
                >
                  {isMember ? "⭐" : "🆓"}
                </div>
              ) : null}

              <Link to="/leaderboards" title="Leaderboards" className="topnav-icon-link" aria-label="Leaderboards">
                <div className={`topnav-profile ${props.active === "leaderboards" ? "active" : ""}`}>
                  <span className="topnav-profile-icon" aria-hidden="true">🏆</span>
                </div>
              </Link>

              <div ref={menuWrapRef}>
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
                          to="/practice"
                          className="topnav-menu-item"
                          role="menuitem"
                          onClick={() => setMenuOpen(false)}
                        >
                          Notation Trainer
                        </Link>

                        <Link
                          to="/openings"
                          className="topnav-menu-item"
                          role="menuitem"
                          onClick={() => setMenuOpen(false)}
                        >
                          Opening Trainer
                        </Link>

                        <button
                          type="button"
                          className="topnav-menu-item"
                          role="menuitem"
                          onClick={onJoinDiscord}
                        >
                          Join Discord
                        </button>

                        <button
                          type="button"
                          className="topnav-menu-item"
                          role="menuitem"
                          onClick={onLinkDiscord}
                        >
                          Link Discord
                        </button>

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

              <Link
                to="/about"
                title="About"
                className="topnav-icon-link"
              >
                <div className={`topnav-profile ${props.active === 'about' ? 'active' : ''}`}>
                  <span className="topnav-profile-icon" aria-hidden="true">ⓘ</span>
                </div>
              </Link>
            </div>

            {props.showSpeedDrill ? (
              <button className="topnav-button primary" onClick={props.onSpeedDrill}>
                Start Notation Drill
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {!hideHero ? (
        <div className="page-hero">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      ) : null}
    </>
  );
}

export default TopNav;
