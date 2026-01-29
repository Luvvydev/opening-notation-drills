import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function Login(props) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);

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
      setError(err && err.message ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: 18, maxWidth: 520, margin: "0 auto" }}>
      <h2 style={{ marginTop: 6 }}>Log in</h2>

      {error ? (
        <div style={{ margin: "10px 0", padding: 10, borderRadius: 10, border: "1px solid rgba(255,255,255,0.14)" }}>
          {error}
        </div>
      ) : null}

      <form onSubmit={onSubmit}>
        <div style={{ marginBottom: 10 }}>
          <div style={{ marginBottom: 6 }}>Email</div>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
            style={{ width: "100%", padding: 10, borderRadius: 10 }}
            required
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 6 }}>Password</div>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            style={{ width: "100%", padding: 10, borderRadius: 10 }}
            required
          />
        </div>

        <button disabled={busy} type="submit" style={{ width: "100%", padding: 12, borderRadius: 10 }}>
          {busy ? "Logging in..." : "Log in"}
        </button>
      </form>

      <div style={{ marginTop: 12 }}>
        No account? <Link to="/signup">Sign up</Link>
      </div>
    </div>
  );
}
