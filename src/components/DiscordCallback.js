import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import TopNav from "./TopNav";

import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";
import { useAuth } from "../auth/AuthProvider";

const CANONICAL_REDIRECT = "https://chessdrills.net/#/discord";
const DISCORD_INVITE_URL = "https://discord.gg/BtCHkuDqJq";

function useAllQueryParams() {
  const loc = useLocation();

  return useMemo(() => {
    // Discord typically appends ?code=...&state=... to the redirect URI.
    // With HashRouter, those params can end up either in location.search or after the hash.
    const params = new URLSearchParams(loc.search || "");

    if (!params.get("code") && !params.get("error") && window.location.hash) {
      const hash = window.location.hash;
      const qIndex = hash.indexOf("?");
      if (qIndex !== -1) {
        const hashQuery = hash.slice(qIndex + 1);
        const hashParams = new URLSearchParams(hashQuery);
        for (const [k, v] of hashParams.entries()) {
          if (!params.has(k)) params.set(k, v);
        }
      }
    }

    return params;
  }, [loc.search]);
}

export default function DiscordCallback() {
  const { user, authLoading } = useAuth();
  const q = useAllQueryParams();

  const [status, setStatus] = useState("Working...");
  const [detail, setDetail] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    // If a user lands on github pages or localhost for any reason, immediately bounce to the real domain.
    // Preserve the full URL so we don't lose the code/state params.
    try {
      const href = window.location.href || "";
      const isCanonical = href.startsWith("https://chessdrills.net/");
      if (!isCanonical) {
        const rest = href.replace(/^[^#]+/, "https://chessdrills.net");
        window.location.replace(rest);
        return;
      }
    } catch (_) {}

    const run = async () => {
      const err = q.get("error");
      const errDesc = q.get("error_description");
      const code = q.get("code");
      const state = q.get("state");

      if (err) {
        setStatus("Discord linking cancelled");
        setDetail(errDesc || err);
        setDone(true);
        return;
      }

      // Wait until Firebase auth resolves.
      if (authLoading) {
        setStatus("Checking sign-in...");
        setDetail("");
        return;
      }

      if (!user) {
        setStatus("Sign in required");
        setDetail("Please sign in, then click Link Discord again.");
        setDone(true);
        return;
      }

      if (!code) {
        setStatus("No code found");
        setDetail("If you just wanted the invite link, use Open Discord below. Otherwise go back and click Link Discord again.");
        setDone(true);
        return;
      }

      try {
        setStatus("Linking Discord...");
        setDetail("Finishing authorization and syncing roles.");

        // Exchange code for token, store Discord user id, and ensure they are in the guild.
        const finish = httpsCallable(functions, "discordOAuthCallback");
        await finish({ code, state, redirectUri: CANONICAL_REDIRECT });

        // Apply roles based on current Firestore membership status.
        const sync = httpsCallable(functions, "syncDiscordRoles");
        await sync({});

        setStatus("Discord linked");
        setDetail("You’re linked. If your roles don’t update within a few seconds, re-open Discord or re-link.");
        setDone(true);
      } catch (e) {
        const msg = (e && (e.message || e.toString())) || "Unknown error";
        setStatus("Discord linking failed");
        setDetail(msg);
        setDone(true);
      }
    };

    run();
  }, [authLoading, user, q]);

  const cardStyle = {
    maxWidth: 720,
    margin: "0 auto",
    padding: "24px 18px",
  };

  const innerStyle = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 18,
    padding: 20,
    textAlign: "left",
  };

  return (
    <>
      <TopNav title="Discord" hideHero={false} active="" />

      <div className="page about-page" style={cardStyle}>
        <div style={innerStyle}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 900 }}>{status}</div>
            {!done && <div style={{ opacity: 0.65, fontSize: 12 }}>working</div>}
          </div>

          {detail ? <div style={{ marginTop: 8, opacity: 0.82, lineHeight: 1.4 }}>{detail}</div> : null}

          <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a className="topnav-button" href={DISCORD_INVITE_URL} target="_blank" rel="noopener noreferrer">
              Open Discord
            </a>

            {!user && !authLoading ? (
              <Link className="topnav-button" to="/login">
                Sign in
              </Link>
            ) : null}

            <Link className="topnav-button" to="/openings">
              Back to Trainer
            </Link>
          </div>

          <div style={{ marginTop: 14, opacity: 0.6, fontSize: 12 }}>
            Tip: if you have multiple site tabs open, close old ones. OAuth params can land on the wrong tab.
          </div>
        </div>
      </div>
    </>
  );
}
