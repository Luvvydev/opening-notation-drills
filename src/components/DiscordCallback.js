import React, { useEffect, useRef, useState } from "react";

import { useHistory } from "react-router-dom";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useAuth } from "../auth/AuthProvider";

/**
 * Discord OAuth callback handler.
 *
 * Fixes:
 * - Avoid infinite loops by guarding effect execution.
 * - Wait for Firebase auth to finish initializing before showing "sign in required".
 * - Parse code/state from either ?query or hash query.
 * - Force canonical domain once (chessdrills.net).
 * - Use fixed redirectUri to match Discord portal and backend validation.
 */

const CANONICAL_ORIGIN = "https://chessdrills.net";
const CANONICAL_REDIRECT_URI = `${CANONICAL_ORIGIN}/#/discord`;

function parseOAuthParams(href) {
  try {
    const u = new URL(href);

    // Standard: https://.../?code=...&state=...#/discord
    const codeQ = u.searchParams.get("code");
    const stateQ = u.searchParams.get("state");
    if (codeQ && stateQ) return { code: codeQ, state: stateQ };

    // Hash router variant: #/discord?code=...&state=...
    const hash = u.hash || "";
    const qIdx = hash.indexOf("?");
    if (qIdx >= 0) {
      const qs = hash.slice(qIdx + 1);
      const sp = new URLSearchParams(qs);
      const codeH = sp.get("code");
      const stateH = sp.get("state");
      if (codeH && stateH) return { code: codeH, state: stateH };
    }

    return { code: null, state: null };
  } catch {
    return { code: null, state: null };
  }
}

export default function DiscordCallback() {

  const history = useHistory();
  const { user, authLoading } = useAuth();

  const [status, setStatus] = useState("idle"); // idle | waiting_auth | missing_params | working | success | error
  const [error, setError] = useState("");

  // Guards against strict-mode double effect + rerenders
  const ranRef = useRef(false);

const oauth = parseOAuthParams(window.location.href);

  // Canonical domain bounce (one-time)
  useEffect(() => {
    if (window.location.origin !== CANONICAL_ORIGIN) {
      const target = `${CANONICAL_ORIGIN}${window.location.pathname}${window.location.search}${window.location.hash}`;
      window.location.replace(target);
    }
  }, []);

  useEffect(() => {
    if (ranRef.current) return;

    // Let the bounce happen first
    if (window.location.origin !== CANONICAL_ORIGIN) return;

    // Wait for auth initialization
    if (authLoading) {
      setStatus("waiting_auth");
      return;
    }

    if (!user) {
      setStatus("waiting_auth");
      return;
    }

    const { code, state } = oauth;
    if (!code || !state) {
      setStatus("missing_params");
      return;
    }

    ranRef.current = true;
    setStatus("working");
    setError("");

    const fn = httpsCallable(getFunctions(), "discordOAuthCallback");

    (async () => {
      try {
        const res = await fn({ code, state, redirectUri: CANONICAL_REDIRECT_URI });
        const data = res?.data || {};

        if (data?.ok) {
          setStatus("success");
          setTimeout(() => history.replace("/openings"), 900);
          return;
        }

        setStatus("error");
        setError(data?.error || "Discord linking failed.");
      } catch (e) {
        const msg =
          e?.message ||
          e?.details ||
          (typeof e === "string" ? e : "") ||
          "Discord linking failed.";
        setStatus("error");
        setError(msg);
      }
    })();
  }, [authLoading, user, oauth, history]);

  const openDiscord = () => window.open("https://discord.com/app", "_blank", "noopener,noreferrer");
  const backToTrainer = () => history.push("/openings");
  const signIn = () => history.push("/login", { from: "/discord", reason: "discord_link" });

  return (
    <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div
        style={{
          maxWidth: 560,
          width: "100%",
          padding: 18,
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(0,0,0,0.35)",
        }}
      >
        <h2 style={{ margin: 0, fontSize: 22 }}>Discord</h2>
        <p style={{ marginTop: 10, opacity: 0.85 }}>
          {status === "idle" && "Preparing Discord link..."}
          {status === "waiting_auth" && "Working... confirming your login session."}
          {status === "missing_params" && "Missing Discord authorization data. Click Link Discord again from the menu."}
          {status === "working" && "Working... linking your Discord account."}
          {status === "success" && "Linked. Applying roles. Sending you back..."}
          {status === "error" && "Failed to link Discord."}
        </p>

        {status === "error" && (
          <pre
            style={{
              whiteSpace: "pre-wrap",
              color: "#ffb4b4",
              background: "rgba(255,255,255,0.04)",
              padding: 10,
              borderRadius: 10,
            }}
          >
            {error}
          </pre>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          {status === "waiting_auth" && !authLoading && !user && (
            <button className="btn" onClick={signIn} type="button">
              Sign in
            </button>
          )}
          <button className="btn" onClick={openDiscord} type="button">
            Open Discord
          </button>
          <button className="btn" onClick={backToTrainer} type="button">
            Back to Trainer
          </button>
        </div>

        <div style={{ marginTop: 10, opacity: 0.6, fontSize: 12 }}>
          If you keep landing on GitHub Pages, start from chessdrills.net.
        </div>
      </div>
    </div>
  );
}
