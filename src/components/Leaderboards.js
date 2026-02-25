import React, { useEffect, useMemo, useState } from "react";
import TopNav from "./TopNav";
import "./Leaderboards.css";
import { db } from "../firebase";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { useAuth } from "../auth/AuthProvider";
import { leaderboardScopeKey } from "../utils/periodKeys";

function safeName(d) {
  if (!d) return "Anonymous";
  const dn = d.displayName ? String(d.displayName).trim() : "";
  if (dn) return dn;
  const un = d.username ? String(d.username).trim() : "";
  if (un) return "@" + un;
  return "Anonymous";
}

function normalizeUsername(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
}

function getCollectionName(period) {

  if (period === "day") return "leaderboards_drill_daily";
  if (period === "week") return "leaderboards_drill_weekly";
  if (period === "month") return "leaderboards_drill_monthly";
  return "leaderboards_drill_alltime";
}



function tierForScore(score) {
  const s = Number(score) || 0;
  if (s >= 40) return { key: "memory_machine", label: "Memory Machine" };
  if (s >= 20) return { key: "repertoire_architect", label: "Repertoire Architect" };
  if (s >= 10) return { key: "theorist", label: "Theorist" };
  if (s >= 5) return { key: "bookworm", label: "Bookworm" };
  if (s >= 1) return { key: "novice", label: "Novice" };
  return { key: "unranked", label: "Unranked" };
}

function snapshotStorageKey(collectionName, scopeKey) {
  return `chessdrills.lb.snapshot.${collectionName}.${scopeKey}`;
}

function loadRankSnapshot(key) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_) {
    return {};
  }
}

function saveRankSnapshot(key, ranksByUid) {
  try {
    window.localStorage.setItem(key, JSON.stringify(ranksByUid || {}));
  } catch (_) {
    // ignore
  }
}

function formatDelta(prevRank, nextRank) {
  const p = Number(prevRank);
  const n = Number(nextRank);
  if (!p || !n) return null;
  const delta = p - n;
  if (!delta) return null;
  return delta;
}

export default function Leaderboards() {
  const { user, isMember } = useAuth();

  const [period, setPeriod] = useState("all");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const collectionName = useMemo(() => getCollectionName(period), [period]);

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!user || !isMember) {
        setRows([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
                const q = query(collection(db, collectionName), orderBy("score", "desc"), limit(200));
        const snap = await getDocs(q);
        if (!alive) return;
        const out = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data() || {};
                    out.push({
            uid: docSnap.id,
            username: data && data.username ? String(data.username).trim() : "",
            name: safeName(data),
            score: Number(data && data.score) || 0,
            dayKey: data && data.dayKey ? String(data.dayKey) : "",
            weekKey: data && data.weekKey ? String(data.weekKey) : "",
            monthKey: data && data.monthKey ? String(data.monthKey) : ""
          });
        });

        const scopeKey = leaderboardScopeKey(period === "all" ? "all" : period);
        const snapKey = snapshotStorageKey(collectionName, scopeKey);
        const prevRanks = loadRankSnapshot(snapKey);

        let scoped = out.filter((r) => r.score > 0);

        // Filter by scope key locally to avoid requiring a Firestore composite index.
        if (period === "day") scoped = scoped.filter((r) => r.dayKey === scopeKey);
        if (period === "week") scoped = scoped.filter((r) => r.weekKey === scopeKey);
        if (period === "month") scoped = scoped.filter((r) => r.monthKey === scopeKey);

        // Attach rank, tier, and movement since last visit.
        const ranksNow = {};
        const enriched = scoped.map((r, i) => {
          const rank = i + 1;
          ranksNow[r.uid] = rank;
          const delta = formatDelta(prevRanks[r.uid], rank);
          const tier = tierForScore(r.score);
          return { ...r, rank, delta, tier };
        });

        saveRankSnapshot(snapKey, ranksNow);
        setRows(enriched);
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
  }, [collectionName, period, user, isMember]);
  const meRank = useMemo(() => {
    if (!user) return null;
    const r = rows.find((x) => x.uid === user.uid);
    return r && r.rank ? r.rank : null;
  }, [rows, user]);

  const meScore = useMemo(() => {
    if (!user) return null;
    const r = rows.find((x) => x.uid === user.uid);
    return r ? r.score : null;
  }, [rows, user]);

  const rivals = useMemo(() => {
    if (!user) return [];
    const idx = rows.findIndex((r) => r.uid === user.uid);
    if (idx < 0) return [];
    const start = Math.max(0, idx - 3);
    const endIdx = Math.min(rows.length, idx + 4);
    return rows.slice(start, endIdx);
  }, [rows, user]);

  const scopeLabel = useMemo(() => {
    if (period === "day") return "today";
    if (period === "week") return "this week";
    if (period === "month") return "this month";
    return "all time";
  }, [period]);


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
              {scopeLabel}. <span className="lb-since">Movement is shown since your last visit.</span>
              {meScore != null ? <span className="lb-score"> ({meScore} pts)</span> : null}
            </>
          ) : (
            <>Sign in to see your rank.</>
          )}
        </div>

        <div className="lb-card">
          {!user ? (
            <div className="lb-paywall">
              <div className="lb-paywall-title">Create a free account to upgrade.</div>
              <div className="lb-paywall-sub">Leaderboards are members only. You need an account to purchase a membership.</div>
              <div className="lb-paywall-actions">
                <a className="lb-paywall-btn" href="#/signup">Sign up</a>
                <a className="lb-paywall-btn secondary" href="#/about">View membership</a>
              </div>
            </div>
          ) : !isMember ? (
            <div className="lb-paywall">
              <div className="lb-paywall-title">Leaderboards are members only.</div>
              <div className="lb-paywall-sub">Upgrade to compete and show your flair.</div>
              <div className="lb-paywall-actions">
                <a className="lb-paywall-btn" href="#/about">Upgrade</a>
              </div>
            </div>
          ) : null}

          <div className="lb-card-head">
            <div className="lb-card-title"><span role="img" aria-label="drill">🔥</span> Drill Mode</div>
          </div>


          {user && isMember && !loading && rows.length > 0 ? (
            <div className="lb-rivals">
              <div className="lb-rivals-head">
                <div className="lb-rivals-title">Local rivals</div>
                <div className="lb-rivals-sub">3 above you and 3 below you, {scopeLabel}.</div>
              </div>

              <div className="lb-rivals-list">
                {rivals.length > 0 ? (
                  rivals.map((r) => {
                    const isMe = user && r.uid === user.uid;
                    const un = normalizeUsername(r.username);
                    const label = isMe ? r.name + " (you)" : r.name;

                    return (
                      <div key={r.uid} className={"lb-rival-row" + (isMe ? " me" : "")}>
                        <div className="lb-rival-rank">
                          <span className="lb-rank-pill">#{r.rank}</span>
                          {r.delta ? (
                            <span className={"lb-delta " + (r.delta > 0 ? "up" : "down")} title="Rank change since your last visit">
                              {r.delta > 0 ? "↑" : "↓"} {Math.abs(r.delta)}
                            </span>
                          ) : null}
                        </div>
                        <div className="lb-rival-name">
                          {un ? (
                            <a className="lb-userlink" href={`#/u/${un}`} title={`View @${un}`}>
                              {label}
                            </a>
                          ) : (
                            label
                          )}
                          <span className={"lb-tier " + (r.tier ? r.tier.key : "")}>
                            {r.tier ? r.tier.label : "Unranked"}
                          </span>
                        </div>
                        <div className="lb-rival-score">{r.score}</div>
                      </div>
                    );
                  })
                ) : (
                  <div className="lb-empty">You're unranked for {scopeLabel}. Play Drill to place.</div>
                )}
              </div>

              {meRank && meRank > 200 ? (
                <div className="lb-rivals-note">You're outside the top 200, so this window may be incomplete.</div>
              ) : null}
            </div>
          ) : null}

          {user && isMember && loading ? (
  <div className="lb-empty">Loading...</div>
) : user && isMember && rows.length > 0 ? (
  <table className="lb-table">
    <thead>
      <tr>
        <th style={{ width: 90 }}>Rank</th>
        <th>Player</th>
        <th style={{ width: 110, textAlign: "right" }}>Points</th>
      </tr>
    </thead>
    <tbody>
      {rows.slice(0, 50).map((r) => {
        const isMe = user && r.uid === user.uid;
        const label = isMe ? r.name + " (you)" : r.name;
        const un = normalizeUsername(r.username);

        return (
          <tr key={r.uid} className={isMe ? "me" : ""}>
            <td>
              <span className="lb-rank-pill">#{r.rank}</span>
              {r.delta ? (
                <span className={"lb-delta " + (r.delta > 0 ? "up" : "down")} title="Rank change since your last visit">
                  {r.delta > 0 ? "↑" : "↓"} {Math.abs(r.delta)}
                </span>
              ) : null}
            </td>
            <td>
              {un ? (
                <a className="lb-userlink" href={`#/u/${un}`} title={`View @${un}`}>
                  {label}
                </a>
              ) : (
                label
              )}
              <span className={"lb-tier " + (r.tier ? r.tier.key : "")} title="Tier based on your best Drill streak">
                {r.tier ? r.tier.label : "Unranked"}
              </span>
            </td>
            <td style={{ textAlign: "right", fontWeight: 800 }}>{r.score}</td>
          </tr>
        );
      })}
    </tbody>
  </table>
) : user && isMember ? (
  <div className="lb-empty">
    No scores yet. Play <span role="img" aria-label="drill">🔥</span> Drill Mode.
  </div>
) : null}

        </div>

        <div className="lb-note">
          
        </div>
      </div>
    </>
  );
}
