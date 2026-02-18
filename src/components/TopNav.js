// TopNav.js
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";
import './TopNav.css';
import { getStreakState } from '../utils/streak';
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

function TopNav(props) {
  const title = props.title || 'Chess Opening Drills';
  const hideHero = props.hideHero !== false;

  const [subtitle, setSubtitle] = useState('');
  const [streak, setStreak] = useState(() => getStreakState());

  const { user, signOut, isMember, membershipTier } = useAuth();

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

  const profileHref = user ? "/profile" : "/signup";

  const onToggleMenu = () => {
    if (!user) return;
    setMenuOpen((v) => !v);
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

    // Backend should return a Discord OAuth URL that redirects back to #/discord.
    const redirectUri = CHESSDRILLS_BASE_URL + "/#/discord";
    const fn = httpsCallable(functions, "getDiscordOAuthUrl");
    const res = await fn({ redirectUri });
    const url = res?.data?.url;

    if (typeof url === "string" && url.startsWith("http")) {
      window.location.href = url;
      return;
    }

    // Safe fallback: at least send them to the server so they can see an error message there.
    window.location.href = redirectUri;
  } catch (e) {
    // Do not hard crash nav if functions are not deployed yet.
    alert("Discord linking is not available yet.");
  }
};

  const onSignOut = async () => {
    try {
      setMenuOpen(false);
      await signOut();
    } catch (e) {
      // silent
    }
  };

  return (
    <>
      <div className="topnav">
        <div className="topnav-inner">
          <Link to="/" className="topnav-logo-link" aria-label="Home">
            <img src={logo} alt="chessdrills.net" className="topnav-logo" />
          </Link>

          <div className="topnav-actions">
            <div className="topnav-right" ref={menuWrapRef}>
              <div className="topnav-streak" title={streak.best ? `Best: ${streak.best}` : ""}>
                <span className="topnav-streak-text">
                  <span role="img" aria-label="streak">🔥</span> {streak.current || 0}
                </span>
              </div>

              {user ? (
                <div
                  className={
                    "topnav-member-pill " +
                    (isMember ? (membershipTier === "lifetime" ? "lifetime" : "member") : "free")
                  }
                  title={
                    isMember
                      ? membershipTier === "lifetime"
                        ? "Lifetime"
                        : "Member"
                      : "Free"
                  }
                >
                  {isMember ? (membershipTier === "lifetime" ? "💎" : "⭐") : "🆓"}
                </div>
              ) : null}

              <Link to="/leaderboards" title="Leaderboards" className="topnav-icon-link" aria-label="Leaderboards">
                <div className={`topnav-profile ${props.active === "leaderboards" ? "active" : ""}`}>
                  <span className="topnav-profile-icon" aria-hidden="true">🏆</span>
                </div>
              </Link>

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
