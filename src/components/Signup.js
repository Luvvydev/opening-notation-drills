import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import TopNav from "./TopNav";
import { getSignupSourceFromReason, trackEvent } from "../utils/trackEvent";

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
    maxWidth: 820,
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
      <main style={wrapStyle}>
        <div style={cardStyle}>
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

          <div style={{ marginTop: 20, color: "#b8c0cb", textAlign: "center", fontSize: 14 }}>
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
