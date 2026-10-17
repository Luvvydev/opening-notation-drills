import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import TopNav from "./TopNav";

export default function Login(props) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
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
      await signIn(email, password);

      const from =
        props &&
        props.location &&
        props.location.state &&
        props.location.state.from
          ? props.location.state.from
          : "/profile";

      if (props && props.history) props.history.push(from);
    } catch (err) {
      if (isMountedRef.current) {
        setError(err && err.message ? err.message : "Login failed");
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
    color: "#c6d7eb"
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
    <div className="login-page" style={pageStyle}>
      <TopNav active="login" title="Chess Opening Drills" />
      <main style={wrapStyle}>
        <div style={cardStyle}>
          <h1 style={h1Style}>Sign in to ChessDrills</h1>
          <p style={subStyle}>Pick up where you left off.</p>

          {error ? <div role="alert" style={errorStyle}>{error}</div> : null}

          <form onSubmit={onSubmit}>
            <div style={{ marginBottom: 18 }}>
              <label htmlFor="chessdrills-login-email" style={labelStyle}>Email</label>
              <input
                id="chessdrills-login-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
                style={inputStyle}
                required
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label htmlFor="chessdrills-login-password" style={labelStyle}>Password</label>
              <input
                id="chessdrills-login-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="current-password"
                style={inputStyle}
                required
              />
            </div>
            <button disabled={busy} type="submit" style={primaryBtn}>
              {busy ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div style={{ marginTop: 20, color: "#b8c0cb", textAlign: "center", fontSize: 14 }}>
            No account? <Link to="/signup">Create an account</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
