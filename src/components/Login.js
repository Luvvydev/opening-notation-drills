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
    padding: 18,
    maxWidth: 520,
    margin: "0 auto",
  };

  const cardStyle = {
    marginTop: 10,
    padding: 16,
    borderRadius: 14,
    background: "rgba(20, 20, 25, 0.65)",
    border: "1px solid rgba(255,255,255,0.12)",
  };

  const labelStyle = { marginBottom: 6, fontWeight: 800 };
  const inputStyle = {
    width: "100%",
    padding: 10,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.04)",
    color: "#e9edf2",
    outline: "none",
  };

  const buttonStyle = {
    width: "100%",
    padding: 12,
    borderRadius: 10,
    border: "1px solid rgba(244, 197, 66, 0.35)",
    background: "rgba(244, 197, 66, 0.14)",
    color: "#e9edf2",
    fontWeight: 900,
    cursor: busy ? "default" : "pointer",
    opacity: busy ? 0.75 : 1,
  };

  const errorStyle = {
    margin: "10px 0",
    padding: 10,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255, 90, 90, 0.10)",
    color: "#e9edf2",
  };

  return (
    <div style={pageStyle}>
      <TopNav active="login" title="Chess Opening Drills" />

      <div style={wrapStyle}>
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0, marginBottom: 12 }}>Log In</h2>

          {error ? <div style={errorStyle}>{error}</div> : null}

          <form onSubmit={onSubmit}>
            <div style={{ marginBottom: 10 }}>
              <div style={labelStyle}>Email</div>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
                style={inputStyle}
                required
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={labelStyle}>Password</div>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="current-password"
                style={inputStyle}
                required
              />
            </div>

            <button disabled={busy} type="submit" style={buttonStyle}>
              {busy ? "Logging in..." : "Log In"}
            </button>
          </form>

          <div style={{ marginTop: 12, color: "rgba(255,255,255,0.75)" }}>
            No account? <Link to="/signup">Sign Up</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
