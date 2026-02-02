import React, { useEffect, useMemo, useState } from "react";
import TopNav from "./TopNav";
import "./Leaderboards.css";
import { db } from "../firebase";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { useAuth } from "../auth/AuthProvider";

function safeName(d) {
  if (!d) return "Anonymous";
  const dn = d.displayName ? String(d.displayName).trim() : "";
  if (dn) return dn;
  const un = d.username ? String(d.username).trim() : "";
  if (un) return "@" + un;
  return "Anonymous";
}

function getCollectionName(period) {
  if (period === "day") return "leaderboards_drill_daily";
  if (period === "week") return "leaderboards_drill_weekly";
  if (period === "month") return "leaderboards_drill_monthly";
  return "leaderboards_drill_alltime";
}

export default function Leaderboards() {
  const { user } = useAuth();

  const [period, setPeriod] = useState("all");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const collectionName = useMemo(() => getCollectionName(period), [period]);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      try {
                const q = query(collection(db, collectionName), orderBy("score", "desc"), limit(50));
        const snap = await getDocs(q);
        if (!alive) return;
        const out = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data() || {};
                    out.push({
            uid: docSnap.id,
                        name: safeName(data),
            score: Number(data && data.score) || 0
          });
        });

        setRows(out.filter((r) => r.score > 0));
      } catch (_) {
        if (alive) setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [collectionName]);

  const meRank = useMemo(() => {
    if (!user) return null;
    const idx = rows.findIndex((r) => r.uid === user.uid);
    return idx >= 0 ? idx + 1 : null;
  }, [rows, user]);

  const meScore = useMemo(() => {
    if (!user) return null;
    const r = rows.find((x) => x.uid === user.uid);
    return r ? r.score : null;
  }, [rows, user]);

  return (
    <>
      <TopNav title="Leaderboards" hideHero active="leaderboards" />

      <div className="lb-wrap">
        <div className="lb-title">
          <div className="lb-h1">
            <span aria-hidden="true">🏆</span> Leaderboards
          </div>

          <div className="lb-tabs">
            <button className={"lb-tab" + (period === "day" ? " active" : "")} onClick={() => setPeriod("day")}>
              Daily
            </button>
            <button className={"lb-tab" + (period === "week" ? " active" : "")} onClick={() => setPeriod("week")}>
              Weekly
            </button>
            <button className={"lb-tab" + (period === "all" ? " active" : "")} onClick={() => setPeriod("all")}>
              All Time
            </button>
          </div>
        </div>

        <div className="lb-sub">
          {user ? (
            <>
              You're ranked <span className="lb-rank">{meRank ? "#" + meRank : "unranked"}</span> in <span role="img" aria-label="drill">🔥</span> Drill mode{" "}
              {period === "all" ? "all-time" : period}.
              {meScore != null ? <span className="lb-score"> ({meScore} pts)</span> : null}
            </>
          ) : (
            <>Sign in to see your rank.</>
          )}
        </div>

        <div className="lb-card">
          <div className="lb-card-head">
            <div className="lb-card-title"><span role="img" aria-label="drill">🔥</span> Drill Mode</div>
          </div>

          {loading ? (
            <div className="lb-empty">Loading...</div>
          ) : rows.length ? (
            <table className="lb-table">
              <thead>
                <tr>
                  <th style={{ width: 90 }}>Rank</th>
                  <th>Player</th>
                  <th style={{ width: 110, textAlign: "right" }}>Points</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const isMe = user && r.uid === user.uid;
                  return (
                    <tr key={r.uid} className={isMe ? "me" : ""}>
                      <td>
                        <span className="lb-rank-pill">#{i + 1}</span>
                      </td>
                      <td>{isMe ? r.name + " (you)" : r.name}</td>
                      <td style={{ textAlign: "right", fontWeight: 800 }}>{r.score}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="lb-empty">No scores yet. Play <span role="img" aria-label="drill">🔥</span> Drill Mode.</div>
          )}
        </div>

        <div className="lb-note">
          
        </div>
      </div>
    </>
  );
}
