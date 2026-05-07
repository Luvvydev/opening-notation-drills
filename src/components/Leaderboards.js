import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import TopNav from "./TopNav";
import "./Leaderboards.css";
import { db } from "../firebase";
import { collection, limit, query, onSnapshot } from "firebase/firestore";
import { useAuth } from "../auth/AuthProvider";
import { leaderboardScopeKey } from "../utils/periodKeys";
import { SYNTHETIC_LEADERBOARD_PROFILES } from "./syntheticLeaderboardProfiles";

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

function normalizeDayKey(raw) {
  const s = String(raw || "");
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return s;
  return `${m[1]}-${String(m[2]).padStart(2, "0")}-${String(m[3]).padStart(2, "0")}`;
}

function normalizeWeekKey(raw) {
  const s = String(raw || "");
  const m = s.match(/^(\d{4})-W(\d{1,2})$/);
  if (!m) return s;
  return `${m[1]}-W${String(m[2]).padStart(2, "0")}`;
}

function getCollectionName(period) {
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

const SYNTHETIC_TOP_EIGHT = SYNTHETIC_LEADERBOARD_PROFILES.slice(0, 8).map((player) => ({
  username: player.username,
  name: player.displayName,
  points: player.score
}));

const SYNTHETIC_NEARBY = SYNTHETIC_LEADERBOARD_PROFILES.find((player) => player.username === "player6854");
const SYNTHETIC_USER_RANK = 12646;
const SYNTHETIC_NEARBY_RANK = SYNTHETIC_NEARBY ? SYNTHETIC_NEARBY.rank : 12357;

function buildDisplayRows(realRows, user) {
  const meReal = user ? realRows.find((row) => row.uid === user.uid) : null;
  const mePoints = meReal ? Number(meReal.points) || 0 : 0;
  const meName = meReal
    ? meReal.name
    : user && user.displayName
      ? String(user.displayName).trim()
      : "You";
  const meUsername = meReal ? meReal.username : "";

  const topEight = SYNTHETIC_TOP_EIGHT.map((entry, index) => ({
    uid: `synthetic-top-${index + 1}`,
    username: entry.username,
    name: entry.name,
    points: entry.points,
    rank: index + 1,
    tier: tierForScore(entry.points),
    delta: null,
    isFake: true
  }));

  const lowestTopScore = topEight[topEight.length - 1].points;

  if (user && mePoints > lowestTopScore) {
    const meTopRow = {
      ...(meReal || {}),
      uid: user.uid,
      username: meUsername,
      name: meName,
      points: mePoints,
      tier: tierForScore(mePoints),
      delta: meReal ? meReal.delta : null,
      isFake: false,
      isMe: true
    };

    const rankedTop = [...topEight, meTopRow]
      .sort((a, b) => b.points - a.points)
      .slice(0, 8)
      .map((row, index) => ({
        ...row,
        rank: index + 1
      }));

    return rankedTop;
  }

  const nearbyPoints = SYNTHETIC_NEARBY ? Number(SYNTHETIC_NEARBY.score) || 40 : 40;
  const nearbyRow = {
    uid: "synthetic-nearby",
    username: SYNTHETIC_NEARBY ? SYNTHETIC_NEARBY.username : "player6854",
    name: SYNTHETIC_NEARBY ? SYNTHETIC_NEARBY.displayName : "player6854",
    points: nearbyPoints,
    rank: SYNTHETIC_NEARBY_RANK,
    tier: tierForScore(nearbyPoints),
    delta: null,
    isFake: true
  };

  const meRow = {
    ...(meReal || {}),
    uid: user ? user.uid : "synthetic-me",
    username: meUsername,
    name: meName,
    points: mePoints,
    rank: SYNTHETIC_USER_RANK,
    tier: tierForScore(mePoints),
    delta: meReal ? meReal.delta : null,
    isFake: false,
    isMe: true
  };

  return [
    ...topEight,
    { uid: "synthetic-gap", isSpacer: true },
    nearbyRow,
    meRow
  ];
}

export default function Leaderboards() {
  const { user, isMember } = useAuth();

  const [period, setPeriod] = useState("all");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const collectionName = useMemo(() => getCollectionName(period), [period]);

  useEffect(() => {
    if (!user || !isMember) {
      setRows([]);
      setLoading(false);
      return () => {};
    }

    setLoading(true);

    const scopeKey = leaderboardScopeKey(period === "all" ? "all" : period);

    const q = query(collection(db, collectionName), limit(500));
    const unsub = onSnapshot(
      q,
      (snap) => {
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
            monthKey: data && data.monthKey ? String(data.monthKey) : "",
            dayScore: Number(data && data.dayScore) || 0,
            weekScore: Number(data && data.weekScore) || 0,
            monthScore: Number(data && data.monthScore) || 0
          });
        });

        const snapKey = snapshotStorageKey(collectionName, scopeKey);
        const prevRanks = loadRankSnapshot(snapKey);

        const pointsFor = (r) => {
          if (period === "day") {
            if (normalizeDayKey(r.dayKey) !== scopeKey) return 0;
            return Number(r.dayScore) || Number(r.score) || 0;
          }
          if (period === "week") {
            if (normalizeWeekKey(r.weekKey) !== scopeKey) return 0;
            return Number(r.weekScore) || Number(r.score) || 0;
          }
          if (period === "month") {
            if (r.monthKey !== scopeKey) return 0;
            return Number(r.monthScore) || Number(r.score) || 0;
          }
          return Number(r.score) || 0;
        };

        const scoped = out.filter((r) => pointsFor(r) > 0);
        scoped.sort((a, b) => pointsFor(b) - pointsFor(a));

        const ranksNow = {};
        const enriched = scoped.map((r, i) => {
          const rank = i + 1;
          ranksNow[r.uid] = rank;
          const delta = formatDelta(prevRanks[r.uid], rank);
          const points = pointsFor(r);
          const tier = tierForScore(points);
          return { ...r, rank, delta, tier, points };
        });

        saveRankSnapshot(snapKey, ranksNow);
        setRows(enriched);
        setLoading(false);
      },
      () => {
        setRows([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [collectionName, period, user, isMember]);

  const displayRows = useMemo(() => {
    if (!user || !isMember) return [];
    return buildDisplayRows(rows, user);
  }, [rows, user, isMember]);

  const meRow = useMemo(() => {
    if (!user || !isMember) return null;
    return displayRows.find((row) => row && row.uid === user.uid) || null;
  }, [displayRows, user, isMember]);

  const meRank = meRow ? meRow.rank : null;
  const meScore = meRow ? meRow.points : null;

  const scopeLabel = useMemo(() => {
    if (period === "day") return "today";
    if (period === "week") return "this week";
    if (period === "month") return "this month";
    return "all-time";
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
            <button className={"lb-tab" + (period === "all" ? " active" : "")} onClick={() => setPeriod("all")}>
              All Time
            </button>
          </div>
        </div>

        <div className="lb-sub">
          {user ? (
            <>
              You're ranked <span className="lb-rank">{meRank ? "#" + meRank : "unranked"}</span> in <span role="img" aria-label="drill">🔥</span> Drill mode {scopeLabel}
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
                <a className="lb-paywall-btn" href="/signup">Sign up</a>
                <a className="lb-paywall-btn secondary" href="/about">View membership</a>
              </div>
            </div>
          ) : !isMember ? (
            <div className="lb-paywall">
              <div className="lb-paywall-title">Leaderboards are members only.</div>
              <div className="lb-paywall-sub">Upgrade to compete and show your flair.</div>
              <div className="lb-paywall-actions">
                <a className="lb-paywall-btn" href="/about">Upgrade</a>
              </div>
            </div>
          ) : null}

          <div className="lb-card-head">
            <div className="lb-card-title"><span role="img" aria-label="drill">🔥</span> Drill Mode</div>
          </div>

          {user && isMember && loading ? (
            <div className="lb-empty">Loading...</div>
          ) : user && isMember ? (
            <table className="lb-table">
              <thead>
                <tr>
                  <th style={{ width: 90 }}>Rank</th>
                  <th>Player</th>
                  <th style={{ width: 110, textAlign: "right" }}>Points</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((r) => {
                  if (r.isSpacer) {
                    return (
                      <tr key={r.uid} className="lb-gap-row" aria-hidden="true">
                        <td colSpan="3"></td>
                      </tr>
                    );
                  }

                  const isMe = user && r.uid === user.uid;
                  const label = isMe ? r.name + " (you)" : r.name;
                  const un = normalizeUsername(r.username);
                  const canLink = Boolean(un);

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
                        {canLink ? (
                          <Link className="lb-userlink" to={`/u/${un}`} title={`View @${un}`}>
                            {label}
                          </Link>
                        ) : (
                          label
                        )}
                        <span className={"lb-tier " + (r.tier ? r.tier.key : "")} title="Tier based on your best Drill streak">
                          {r.tier ? r.tier.label : "Unranked"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 800 }}>{r.points}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : null}
        </div>

        <div className="lb-note"></div>
      </div>
    </>
  );
}
