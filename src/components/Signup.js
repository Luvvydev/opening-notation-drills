import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import TopNav from "./TopNav";
import { getSignupSourceFromReason, trackEvent } from "../utils/trackEvent";
import "./Signup.css";

export default function Signup(props) {
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");

  const queryParams = useMemo(() => {
    try {
      return new URLSearchParams((props && props.location && props.location.search) || "");
    } catch (_) {
      return null;
    }
  }, [props]);

  const gateReason =
    props && props.location && props.location.state && props.location.state.reason
      ? props.location.state.reason
      : queryParams && queryParams.get("reason")
      ? queryParams.get("reason")
      : null;

  const from =
    props && props.location && props.location.state && props.location.state.from
      ? props.location.state.from
      : queryParams && queryParams.get("from")
      ? queryParams.get("from")
      : null;

  const signupSource =
    props && props.location && props.location.state && props.location.state.source
      ? props.location.state.source
      : queryParams && queryParams.get("source")
      ? queryParams.get("source")
      : getSignupSourceFromReason(gateReason, "direct");

  const signupCopy = "Analyze games. Practice mistakes. Improve your openings.";

  useEffect(() => {
    trackEvent("signup_page_view", { source: signupSource, reason: gateReason || "", from: from || "" }, null, { persist: false });
  }, [signupSource, gateReason, from]);

  const [busy, setBusy] = useState(false);

  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (isMountedRef.current) {
      setError("");
      setBusy(true);
    }

    try {
      const credential = await signUp(email, password);
      const createdUser = credential && credential.user ? credential.user : null;

      trackEvent(
        "signup_complete",
        {
          source: signupSource,
          from: from || "",
          reason: gateReason || "",
          had_onboarding: false
        },
        createdUser
      );

      if (props && props.history) {
        const destination = from && from.charAt(0) === "/" ? from : "/about";
        props.history.push(destination);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err && err.message ? err.message : "Sign up failed");
      }
    } finally {
      if (isMountedRef.current) {
        setBusy(false);
      }
    }
  };

  const pageStyle = { minHeight: "100vh", background: "#0f1115" };
  const wrapStyle = {
    boxSizing: "border-box",
    width: "100%",
    maxWidth: 1320,
    padding: "clamp(16px, 2.5vw, 32px)",
    margin: "clamp(12px, 2vw, 30px) auto 0"
  };
  const cardStyle = {
    padding: "clamp(26px, 3vw, 46px)",
    borderRadius: 16,
    background: "#15171d",
    border: "1px solid rgba(255,255,255,0.12)"
  };
  const h1Style = {
    margin: "0 0 10px",
    fontSize: "clamp(28px, 2.4vw, 40px)",
    lineHeight: 1.16,
    letterSpacing: "-0.03em",
    color: "#eed7a3"
  };
  const subStyle = {
    margin: "0 0 24px",
    color: "#b8c0cb",
    fontSize: "clamp(14px, 1.1vw, 17px)",
    lineHeight: 1.5
  };
  const labelStyle = { display: "block", marginBottom: 8, fontWeight: 700, color: "#e9edf2" };
  const inputStyle = {
    boxSizing: "border-box",
    width: "100%",
    minHeight: 52,
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "#1c1f27",
    color: "#e9edf2",
    fontSize: 16
  };
  const primaryBtn = {
    width: "100%",
    minHeight: 52,
    padding: "12px 16px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "#e9edf2",
    color: "#0b0d12",
    fontWeight: 800,
    fontSize: 15,
    cursor: busy ? "default" : "pointer",
    opacity: busy ? 0.65 : 1
  };
  const errorStyle = {
    margin: "0 0 18px",
    padding: 12,
    borderRadius: 10,
    border: "1px solid rgba(255, 105, 105, 0.35)",
    background: "rgba(255, 90, 90, 0.10)",
    color: "#e9edf2"
  };

  return (
    <div className="signup-page" style={pageStyle}>
      <TopNav active="signup" title="Chess Opening Drills" />
      <main className="signup-layout" style={wrapStyle}>
        <div className="signup-card" style={cardStyle}>
          <h1 style={h1Style}>Create your account</h1>
          <p style={subStyle}>{signupCopy}</p>

          {error ? <div role="alert" style={errorStyle}>{error}</div> : null}

          <form onSubmit={onSubmit}>
            <div style={{ marginBottom: 18 }}>
              <label htmlFor="chessdrills-signup-email" style={labelStyle}>Email</label>
              <input
                id="chessdrills-signup-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
                style={inputStyle}
                required
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label htmlFor="chessdrills-signup-password" style={labelStyle}>Password</label>
              <input
                id="chessdrills-signup-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="new-password"
                style={inputStyle}
                required
              />
            </div>
            <button disabled={busy} type="submit" style={primaryBtn}>
              {busy ? "Creating account..." : "Create free account"}
            </button>
          </form>

          <p className="signup-trial-note">
            No card required. Try opening training for 3 days, plus one Game Review preview with puzzles.
            {" "}Additional reviews and Mistake Packs require <Link to="/about">Premium</Link>.
          </p>

          <div style={{ marginTop: 20, color: "#b8c0cb", textAlign: "center", fontSize: 14 }}>
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </div>
        <SignupIntro source={signupSource} />
      </main>
    </div>
  );
}

function SignupIntro({ source }) {
  const [watching, setWatching] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef(null);
  const trackedStart = useRef(false);
  const trackedEnd = useRef(false);
  const mediaBase = `${process.env.PUBLIC_URL || ""}/media/chessdrills-intro`;

  useEffect(() => {
    if (!watching || !videoRef.current) return;
    videoRef.current.focus();
    const playback = videoRef.current.play();
    if (playback && playback.catch) playback.catch(() => {});
  }, [watching]);

  const onPlay = () => {
    if (trackedStart.current) return;
    trackedStart.current = true;
    trackEvent("signup_video_start", { source }, null, { persist: false });
  };

  const onEnded = () => {
    if (trackedEnd.current) return;
    trackedEnd.current = true;
    trackEvent("signup_video_complete", { source }, null, { persist: false });
  };

  return (
    <section className="signup-intro" aria-labelledby="signup-intro-title">
      <p className="signup-intro-eyebrow">YOUR GAME. YOUR NEXT MOVE.</p>
      <h2 id="signup-intro-title">Stop missing the moves <span>that win games.</span></h2>
      <p className="signup-intro-description">See how the mistakes from your own games become your next practice session.</p>

      <div className="signup-video-frame">
        {watching ? (
          <video
            ref={videoRef}
            className="signup-video"
            aria-label="How ChessDrills works"
            controls
            playsInline
            preload="metadata"
            poster={`${mediaBase}.jpg`}
            src={`${mediaBase}.mp4`}
            tabIndex={0}
            onPlay={onPlay}
            onEnded={onEnded}
            onError={() => setVideoError(true)}
          >
            <track kind="captions" src={`${mediaBase}.vtt`} srcLang="en" label="English" />
            <a href={`${mediaBase}.mp4`}>Watch the ChessDrills introduction</a>
          </video>
        ) : (
          <button
            className="signup-video-poster"
            type="button"
            onClick={() => setWatching(true)}
            aria-label="Watch how ChessDrills works, 3 minutes 58 seconds"
          >
            <img src={`${mediaBase}.jpg`} alt="You missed this: a highlighted queen on a chessboard" width="1280" height="720" />
            <span className="signup-video-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg></span>
            <span className="signup-video-label">Watch the training overview <span>3:58</span></span>
          </button>
        )}
      </div>
      {videoError && <p className="signup-video-error" role="status">The video could not load. <a href={`${mediaBase}.mp4`}>Open the video</a>, or continue with your account.</p>}

      <ol className="signup-training-flow" aria-label="Your training routine">
        <li><span>01</span><div><strong>Review your game</strong><p>Find the moves you missed.</p></div></li>
        <li><span>02</span><div><strong>Practice your mistakes</strong><p>Play those positions yourself.</p></div></li>
        <li><span>03</span><div><strong>Train your openings</strong><p>Recall the moves on the board.</p></div></li>
      </ol>
    </section>
  );
}
