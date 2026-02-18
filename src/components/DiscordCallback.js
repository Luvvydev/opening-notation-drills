import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import TopNav from "./TopNav";

import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";
import { useAuth } from "../auth/AuthProvider";

const CHESSDRILLS_BASE_URL = "https://chessdrills.net";

function useQuery() {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
}

export default function DiscordCallback() {
  const { user } = useAuth();
  const q = useQuery();

  const [status, setStatus] = useState("Working...");
  const [detail, setDetail] = useState("");

  useEffect(() => {
    const run = async () => {
      const code = q.get("code");
      const state = q.get("state");
      const err = q.get("error");

      if (err) {
        setStatus("Discord linking cancelled");
        setDetail(err);
        return;
      }

      if (!user) {
        setStatus("Sign in required");
        setDetail("Please sign in first, then try linking Discord again.");
        return;
      }

      if (!code) {
        setStatus("Missing code");
        setDetail("Discord did not return an authorization code.");
        return;
      }

      try {
        const redirectUri = CHESSDRILLS_BASE_URL + "/#/discord";

        // Exchange code for token, store Discord user id, and ensure they are in the guild.
        const finish = httpsCallable(functions, "discordOAuthCallback");
        await finish({ code, state, redirectUri });

        // Apply roles based on current Firestore membership status.
        const sync = httpsCallable(functions, "syncDiscordRoles");
        await sync({});

        setStatus("Discord linked");
        setDetail("Your Discord roles should update shortly.");
      } catch (e) {
        setStatus("Discord linking failed");
        setDetail("Backend is not configured or returned an error.");
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <TopNav title="Discord" hideHero={false} active="" />

      <div className="page about-page" style={{ maxWidth: 900, margin: "0 auto", padding: "24px 18px" }}>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 16, padding: 18 }}>
          <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 8 }}>{status}</div>
          {detail ? <div style={{ opacity: 0.82 }}>{detail}</div> : null}

          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a
              className="topnav-button"
              href="https://discord.gg/BtCHkuDqJq"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Discord
            </a>

            <Link className="topnav-button" to="/openings">
              Back to Trainer
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
