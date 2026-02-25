import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import TopNav from "./TopNav";
import Chessboard from "chessboardjsx";
import { BOARD_THEMES, DEFAULT_THEME, PIECE_THEMES } from "../theme/boardThemes";
import "./ActivityHeatmap.css";
import { db } from "../firebase";
import { collection, doc, getDoc, getDocs, limit, orderBy, query } from "firebase/firestore";
import { leaderboardScopeKey } from "../utils/periodKeys";

function ymdFromDate(dt) {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(dt, days) {
  const d = new Date(dt);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfWeekSunday(dt) {
  const d = new Date(dt);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sun
  d.setDate(d.getDate() - day);
  return d;
}

function activityLevel(count) {
  const n = Number(count) || 0;
  if (n <= 0) return 0;
  if (n === 1) return 1;
  if (n <= 3) return 2;
  if (n <= 6) return 3;
  return 4;
}

function buildHeatmap(daysMap, weeks, endDate = new Date(), cell = 16, gap = 4) {
  const CELL = Number(cell) || 16;
  const GAP = Number(gap) || 4;

  const today = new Date(endDate);
  today.setHours(0, 0, 0, 0);

  const endWeekStart = startOfWeekSunday(today);
  const start = addDays(endWeekStart, -(weeks - 1) * 7);

  const columns = [];
  for (let w = 0; w < weeks; w += 1) {
    const weekStart = addDays(start, w * 7);
    const cells = [];
    for (let r = 0; r < 7; r += 1) {
      const dt = addDays(weekStart, r);
      dt.setHours(0, 0, 0, 0);

      const isFuture = dt.getTime() > today.getTime();
      const ymd = ymdFromDate(dt);

      const raw =
        !isFuture && daysMap && Object.prototype.hasOwnProperty.call(daysMap, ymd)
          ? daysMap[ymd]
          : 0;
      const count = Number(raw) || 0;

      cells.push({
        ymd,
        count,
        level: isFuture ? 0 : activityLevel(count),
        isFuture
      });
    }
    columns.push({ weekStart, cells });
  }

  const monthLabels = [];
  let lastMonthKey = "";
  for (let w = 0; w < columns.length; w += 1) {
    const ws = columns[w].weekStart;
    const y = ws.getFullYear();
    const m = ws.getMonth();
    const monthKey = `${y}-${m}`;

    if (monthKey !== lastMonthKey) {
      const mon = ws.toLocaleString(undefined, { month: "short" });
      const needsYear = mon === "Jan" || (lastMonthKey && lastMonthKey.slice(0, 4) !== String(y));
      const label = needsYear ? `${mon} '${String(y).slice(2)}` : mon;

      monthLabels.push({
        weekIndex: w,
        label,
        leftPx: w * (CELL + GAP)
      });

      lastMonthKey = monthKey;
    }
  }

  const widthPx = weeks * CELL + (weeks - 1) * GAP;

  return { columns, monthLabels, widthPx };
}

function normalizeUsername(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
}

function getMembershipStatus(profileData) {
  // Inference:
  // - Public profile should not leak paid status unless you explicitly want that.
  // - If you do want it, store a safe public field (e.g. profileData.publicBadge = "Member").
  if (profileData && typeof profileData.publicBadge === "string" && profileData.publicBadge.trim()) {
    return profileData.publicBadge.trim();
  }
  return "";
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

function latestActiveDay(activityDays) {
  const days = activityDays && typeof activityDays === "object" ? activityDays : {};
  const keys = Object.keys(days).filter((k) => (Number(days[k]) || 0) > 0);
  if (!keys.length) return "";
  keys.sort();
  return keys[keys.length - 1];
}

function formatYmdShort(ymd) {
  if (!ymd || typeof ymd !== "string") return "";
  const parts = ymd.split("-");
  if (parts.length !== 3) return ymd;
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  return `${m}/${d}/${String(y).slice(2)}`;
}


export default function PublicProfile() {
  const { username } = useParams();
  const un = normalizeUsername(username);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const heatmapScrollRef = useRef(null);
  const boardWrapRef = useRef(null);
  const [boardWidth, setBoardWidth] = useState(320);
  const [isMobile, setIsMobile] = useState(false);
const [lbLoading, setLbLoading] = useState(false);
const [lbWeek, setLbWeek] = useState({ rank: null, score: 0 });
const [lbAll, setLbAll] = useState({ rank: null, score: 0 });


  useEffect(() => {
    const mq = window.matchMedia ? window.matchMedia("(max-width: 520px)") : null;

    const apply = () => {
      if (mq) setIsMobile(!!mq.matches);
      else setIsMobile((window.innerWidth || 0) <= 520);
    };

    apply();

    if (!mq) {
      window.addEventListener("resize", apply);
      return () => window.removeEventListener("resize", apply);
    }

    const onChange = () => apply();
    try {
      if (mq.addEventListener) mq.addEventListener("change", onChange);
      else mq.addListener(onChange);
    } catch (_) {}

    return () => {
      try {
        if (mq.removeEventListener) mq.removeEventListener("change", onChange);
        else mq.removeListener(onChange);
      } catch (_) {}
    };
  }, []);

  useEffect(() => {
    const el = heatmapScrollRef.current;
    if (!el) return;

    // Auto scroll visitors to the most recent day.
    requestAnimationFrame(() => {
      try {
        el.scrollLeft = el.scrollWidth;
      } catch (_) {}
    });
  }, [profile, isMobile]);


  useEffect(() => {
    const el = boardWrapRef.current;
    if (!el) return;

    const clamp = (n) => Math.max(240, Math.min(360, Math.floor(n)));

    const apply = () => {
      const w = el.getBoundingClientRect().width || 0;
      if (w > 0) setBoardWidth(clamp(w));
    };

    apply();

    let ro;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => apply());
      try {
        ro.observe(el);
      } catch (_) {}
    } else {
      window.addEventListener("resize", apply);
    }

    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener("resize", apply);
    };
  }, []);

  useEffect(() => {
    if (!un) return;

    (async () => {
      const snap = await getDoc(doc(db, "publicProfiles", un));
      setProfile(snap.exists() ? snap.data() : null);
      setLoading(false);
    })();
  }, [un]);

useEffect(() => {
  if (!profile || !profile.uid) return;

  let alive = true;

  async function loadRanks() {
    setLbLoading(true);
    try {
      const weekScope = leaderboardScopeKey("week");
      const weeklySnap = await getDocs(query(collection(db, "leaderboards_drill_weekly"), orderBy("score", "desc"), limit(200)));
      if (!alive) return;

      const weeklyRows = [];
      weeklySnap.forEach((d) => {
        const data = d.data() || {};
        weeklyRows.push({
          uid: d.id,
          score: Number(data.score) || 0,
          weekKey: data.weekKey ? String(data.weekKey) : ""
        });
      });

      const weeklyScoped = weeklyRows.filter((r) => r.score > 0 && r.weekKey === weekScope);
      const weekIdx = weeklyScoped.findIndex((r) => r.uid === profile.uid);
      const weekRank = weekIdx >= 0 ? weekIdx + 1 : null;
      const weekScore = weekIdx >= 0 ? weeklyScoped[weekIdx].score : 0;

      const allSnap = await getDocs(query(collection(db, "leaderboards_drill_alltime"), orderBy("score", "desc"), limit(200)));
      if (!alive) return;

      const allRows = [];
      allSnap.forEach((d) => {
        const data = d.data() || {};
        allRows.push({
          uid: d.id,
          score: Number(data.score) || 0
        });
      });

      const allScoped = allRows.filter((r) => r.score > 0);
      const allIdx = allScoped.findIndex((r) => r.uid === profile.uid);
      const allRank = allIdx >= 0 ? allIdx + 1 : null;
      const allScore = allIdx >= 0 ? allScoped[allIdx].score : 0;

      setLbWeek({ rank: weekRank, score: weekScore });
      setLbAll({ rank: allRank, score: allScore });
    } catch (_) {
      if (!alive) return;
      setLbWeek({ rank: null, score: 0 });
      setLbAll({ rank: null, score: 0 });
    } finally {
      if (alive) setLbLoading(false);
    }
  }

  loadRanks();

  return () => {
    alive = false;
  };
}, [profile]);

  const membershipStatus = useMemo(() => getMembershipStatus(profile), [profile]);
const publicStats = useMemo(() => {
  const ps = profile && profile.publicStats && typeof profile.publicStats === "object" ? profile.publicStats : {};
  return {
    openingsTrained: Number(ps.openingsTrained) || 0,
    linesLearned: Number(ps.linesLearned) || 0,
    totalCompletions: Number(ps.totalCompletions) || 0,
    cleanRuns: Number(ps.cleanRuns) || 0,
    streakBest: Number(ps.streakBest) || 0,
    streakCurrent: Number(ps.streakCurrent) || 0
  };
}, [profile]);

const tier = useMemo(() => {
  const score = (lbAll && lbAll.score) || (lbWeek && lbWeek.score) || 0;
  return tierForScore(score);
}, [lbAll, lbWeek]);

const lastActive = useMemo(() => {
  const ymd = latestActiveDay(profile && profile.activityDays);
  return ymd ? formatYmdShort(ymd) : "";
}, [profile]);

  return (
    <>
      {/* Hide hero here so the public profile layout doesn't get shoved around by the big banner */}
      <TopNav title="Chess Opening Drills" hideHero />

      <style>{`
        .pp-wrap {
          overflow-x: hidden;
          max-width: 1080px;
          margin: 0 auto;
          padding: 22px 16px 48px;
        }

        .pp-card {
          max-width: 920px;
          margin: 0 auto;
          border-radius: 16px;
          background: radial-gradient(1200px 600px at 50% -20%, rgba(255,255,255,0.08), rgba(0,0,0,0)) , rgba(20, 20, 25, 0.62);
          border: 1px solid rgba(255,255,255,0.10);
          box-shadow: 0 16px 52px rgba(0,0,0,0.52);
          padding: 22px 22px 18px;
          color: rgba(255,255,255,0.92);
        }

        .pp-head {
          text-align: center;
          margin-bottom: 14px;
        }

        .pp-avatar {
          width: 78px;
          height: 78px;
          border-radius: 999px;
          object-fit: cover;
          display: block;
          margin: 0 auto 10px;
          border: 1px solid rgba(255,255,255,0.14);
          box-shadow: 0 10px 26px rgba(0,0,0,0.45);
        }

        .pp-name {
          font-size: 28px;
          font-weight: 900;
          letter-spacing: -0.2px;
          margin: 0;
        }

        .pp-handle {
          margin-top: 6px;
          font-size: 13px;
          font-weight: 800;
          opacity: 0.72;
        }

        .pp-badges {
          display: inline-flex;
          justify-content: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 10px;
        }

        .pp-pill {
          display: inline-flex;
          align-items: center;
          padding: 5px 9px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.1px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.10);
          color: rgba(255,255,255,0.92);
          white-space: nowrap;
        }

        .pp-pill.subtle {
          opacity: 0.82;
        }

        .pp-meta {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px 16px;
          align-items: start;
          margin-top: 14px;
        }

        .pp-meta-item {
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(0,0,0,0.18);
          padding: 10px 12px;
        }

        .pp-label {
          font-size: 12px;
          font-weight: 800;
          opacity: 0.62;
          margin-bottom: 6px;
        }

        .pp-value {
          font-size: 14px;
          font-weight: 900;
          color: rgba(255,255,255,0.95);
        }

        .pp-hr {
          height: 1px;
          background: rgba(255,255,255,0.08);
          margin: 16px 0 14px;
        }

        .pp-section-title {
          font-size: 12px;
          font-weight: 900;
          opacity: 0.72;
          margin: 0 0 10px 0;
          letter-spacing: 0.25px;
          text-transform: uppercase;
        }

        .pp-panels {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 14px;
        }

        .pp-panel {
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(0,0,0,0.20);
          padding: 12px;
        }

        .pp-panel-head {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 10px;
        }

        .pp-panel-title {
          font-size: 12px;
          font-weight: 900;
          opacity: 0.82;
          letter-spacing: 0.25px;
          text-transform: uppercase;
        }

        .pp-panel-sub {
          font-size: 12px;
          font-weight: 800;
          opacity: 0.62;
        }

        .pp-rowlist {
          display: grid;
          gap: 8px;
        }

        .pp-row {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
          padding: 8px 10px;
          border-radius: 12px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
        }

        .pp-row-k {
          font-size: 12px;
          font-weight: 800;
          opacity: 0.70;
        }

        .pp-row-v {
          font-size: 14px;
          font-weight: 900;
          color: rgba(255,255,255,0.95);
          white-space: nowrap;
        }

        .pp-note {
          margin-top: 10px;
          font-size: 12px;
          font-weight: 700;
          opacity: 0.60;
        }

        .pp-box {
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(0,0,0,0.20);
          padding: 12px;
        }

        .pp-board-box {
          max-width: 360px;
          margin: 0 auto;
          text-align: center;
        }

        .pp-board-wrap {
          display: block;
          width: 100%;
          max-width: 360px;
          margin: 0 auto;
        }

        .pp-board-wrap > div {
          margin: 0 auto;
        }

        @media (max-width: 820px) {
          .pp-panels {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 520px) {
          .pp-wrap {
            padding: 14px 10px 34px;
          }

          .pp-card {
            padding: 16px 12px 14px;
            border-radius: 14px;
          }

          .pp-avatar {
            width: 68px;
            height: 68px;
          }

          .pp-name {
            font-size: 24px;
          }

          .pp-meta {
            grid-template-columns: 1fr;
          }
        }

      `}</style>

      <div className="pp-wrap">
        {loading && <div style={{ maxWidth: 900, margin: "0 auto", opacity: 0.8 }}>Loading…</div>}

        {!loading && !profile && (
          <div className="pp-card">
            <div className="pp-title">Profile not found</div>
            <div style={{ opacity: 0.75, textAlign: "center" }}>/u/{un}</div>
          </div>
        )}

        {profile && (
          <div className="pp-card">
            
            <div className="pp-head">
              {profile && profile.avatar && profile.avatar.dataUrl ? (
                <img className="pp-avatar" src={profile.avatar.dataUrl} alt="Avatar" />
              ) : null}

              <h1 className="pp-name">{profile.displayName || "Player"}</h1>
              <div className="pp-handle">{profile.username ? `@${profile.username}` : `@${un}`}</div>

              <div className="pp-badges">
                <span className="pp-pill">{tier.label}</span>
                {lastActive ? <span className="pp-pill subtle">Last active {lastActive}</span> : null}
              </div>

              <div className="pp-meta">
                <div className="pp-meta-item">
                  <div className="pp-label">Username</div>
                  <div className="pp-value">{profile.username ? `@${profile.username}` : `@${un}`}</div>
                </div>

                <div className="pp-meta-item">
                  <div className="pp-label">Status</div>
                  <div className="pp-value">{membershipStatus || "Player"}</div>
                </div>
              </div>
            </div>

            <div className="pp-hr" />

            <div className="pp-section-title">Highlights</div>

            {(() => {
              const hasDrill =
                (publicStats.streakBest || 0) > 0 ||
                (publicStats.streakCurrent || 0) > 0 ||
                (publicStats.linesLearned || 0) > 0;

              const hasTraining =
                (publicStats.openingsTrained || 0) > 0 ||
                (publicStats.totalCompletions || 0) > 0 ||
                (publicStats.cleanRuns || 0) > 0;

              const hasLeaderboards =
                (lbWeek && (lbWeek.rank || lbWeek.score)) ||
                (lbAll && (lbAll.rank || lbAll.score));

              if (!hasDrill && !hasTraining && !hasLeaderboards) {
                return <div className="pp-note">No public stats yet. Stats appear after the player trains.</div>;
              }

              return (
                <div className="pp-panels">
                  <div className="pp-panel">
                    <div className="pp-panel-head">
                      <div className="pp-panel-title">Drill strength</div>
                      <div className="pp-panel-sub">{tier.label}</div>
                    </div>

                    <div className="pp-rowlist">
                      <div className="pp-row">
                        <div className="pp-row-k">Best streak</div>
                        <div className="pp-row-v">{publicStats.streakBest || 0}</div>
                      </div>

                      <div className="pp-row">
                        <div className="pp-row-k">Current streak</div>
                        <div className="pp-row-v">{publicStats.streakCurrent || 0}</div>
                      </div>

                      <div className="pp-row">
                        <div className="pp-row-k">Lines learned</div>
                        <div className="pp-row-v">{publicStats.linesLearned || 0}</div>
                      </div>
                    </div>
                  </div>

                  {hasLeaderboards ? (
                    <div className="pp-panel">
                      <div className="pp-panel-head">
                        <div className="pp-panel-title">Leaderboards</div>
                        {lbLoading ? <div className="pp-panel-sub">Loading</div> : <div className="pp-panel-sub">Drill</div>}
                      </div>

                      <div className="pp-rowlist">
                        <div className="pp-row">
                          <div className="pp-row-k">Weekly</div>
                          <div className="pp-row-v">
                            {lbWeek && lbWeek.rank ? `#${lbWeek.rank}` : "Unranked"}{lbWeek && lbWeek.score ? ` (${lbWeek.score})` : ""}
                          </div>
                        </div>

                        <div className="pp-row">
                          <div className="pp-row-k">All time</div>
                          <div className="pp-row-v">
                            {lbAll && lbAll.rank ? `#${lbAll.rank}` : "Unranked"}{lbAll && lbAll.score ? ` (${lbAll.score})` : ""}
                          </div>
                        </div>
                      </div>

                      <div className="pp-note">Ranks show if the player is in the top 200.</div>
                    </div>
                  ) : null}

                  {hasTraining ? (
                    <div className="pp-panel">
                      <div className="pp-panel-head">
                        <div className="pp-panel-title">Training</div>
                        <div className="pp-panel-sub">Totals</div>
                      </div>

                      <div className="pp-rowlist">
                        <div className="pp-row">
                          <div className="pp-row-k">Openings trained</div>
                          <div className="pp-row-v">{publicStats.openingsTrained || 0}</div>
                        </div>

                        <div className="pp-row">
                          <div className="pp-row-k">Completions</div>
                          <div className="pp-row-v">{publicStats.totalCompletions || 0}</div>
                        </div>

                        <div className="pp-row">
                          <div className="pp-row-k">Clean runs</div>
                          <div className="pp-row-v">{publicStats.cleanRuns || 0}</div>
                        </div>
                      </div>

                      <div className="pp-note">Updates when the player trains.</div>
                    </div>
                  ) : null}
                </div>
              );
            })()}

            <div className="pp-section-title">Board</div>
            <div className="pp-box pp-board-box">
              <div className="pp-board-wrap" ref={boardWrapRef}>
                <Chessboard
    width={boardWidth}
    position="start"
    draggable={false}
    pieceTheme={
      profile && profile.settings && profile.settings.pieceTheme
        ? (PIECE_THEMES && PIECE_THEMES[profile.settings.pieceTheme]) || undefined
        : undefined
    }
    {...BOARD_THEMES[(profile && profile.settings && profile.settings.boardTheme) || DEFAULT_THEME]}
  />
              </div>
            </div>

<div className="pp-hr" />

            <div className="pp-section-title">Activity</div>
            <div className="pp-box">
              <div className="activity-legend-row" style={{ marginTop: 0 }}>
                <div className="activity-legend-label">Less</div>
                <div className="activity-legend-swatches">
                  <span className="activity-cell level-0" />
                  <span className="activity-cell level-1" />
                  <span className="activity-cell level-2" />
                  <span className="activity-cell level-3" />
                  <span className="activity-cell level-4" />
                </div>
                <div className="activity-legend-label">More</div>
              </div>

              {(() => {
                const days =
                  profile && profile.activityDays && typeof profile.activityDays === "object"
                    ? profile.activityDays
                    : {};

                const CELL = isMobile ? 12 : 16;
                const GAP = isMobile ? 3 : 4;

                const { columns, monthLabels, widthPx } = buildHeatmap(days, 53, new Date(), CELL, GAP);
                const any = columns.some((col) => col.cells.some((c) => c.level > 0));
                const dowLabels = ["", "Mon", "", "Wed", "", "Fri", ""]; // GitHub-style labels

                if (!any) {
                  return <div className="activity-empty">No public activity yet.</div>;
                }

                return (
                  <div className="activity-scroll" ref={heatmapScrollRef}>
                    <div className="activity-inner">
                      <div className="activity-heatmap-wrap">
                        <div className="activity-dow" aria-hidden="true">
                          {dowLabels.map((lab, idx) => (
                            <div key={idx} className="activity-dow-label">
                              {lab}
                            </div>
                          ))}
                        </div>

                        <div>
                          <div className="activity-months" style={{ width: widthPx }}>
                            {monthLabels.map((m) => (
                              <div
                                key={m.weekIndex + ":" + m.label}
                                className="activity-month"
                                style={{ left: m.leftPx }}
                              >
                                {m.label}
                              </div>
                            ))}
                          </div>

                          <div className="activity-grid" role="img" aria-label="Activity heatmap">
                            {columns.map((col, w) => (
                              <div className="activity-week" key={w}>
                                {col.cells.map((c) => (
                                  <div
                                    key={c.ymd}
                                    className={`activity-cell level-${c.level}${c.isFuture ? " is-future" : ""}`}
                                    title={c.isFuture ? "" : `${c.ymd}  ${c.count} activity`}
                                  />
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
