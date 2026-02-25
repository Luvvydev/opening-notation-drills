import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import TopNav from "./TopNav";
import Chessboard from "chessboardjsx";
import { BOARD_THEMES, DEFAULT_THEME, PIECE_THEMES } from "../theme/boardThemes";
import "./ActivityHeatmap.css";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

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

export default function PublicProfile() {
  const { username } = useParams();
  const un = normalizeUsername(username);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const heatmapScrollRef = useRef(null);
  const boardWrapRef = useRef(null);
  const [boardWidth, setBoardWidth] = useState(320);
  const [isMobile, setIsMobile] = useState(false);


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

  const membershipStatus = useMemo(() => getMembershipStatus(profile), [profile]);

  return (
    <>
      {/* Hide hero here so the public profile layout doesn't get shoved around by the big banner */}
      <TopNav title="Chess Opening Drills" hideHero />

      <style>{`
        .pp-wrap {
          overflow-x: hidden;
          max-width: 1080px;
          margin: 0 auto;
          padding: 24px 16px 48px;
        }

        .pp-card {
          max-width: 900px;
          margin: 0 auto;
          border-radius: 16px;
          background: rgba(20, 20, 25, 0.65);
          border: 1px solid rgba(255,255,255,0.12);
          box-shadow: 0 14px 40px rgba(0,0,0,0.45);
          padding: 26px 26px 22px;
          color: rgba(255,255,255,0.92);
        }

        .pp-title {
          text-align: center;
          font-size: 36px;
          font-weight: 900;
          margin: 6px 0 18px;
        }

        .pp-avatar {
          width: 92px;
          height: 92px;
          border-radius: 999px;
          object-fit: cover;
          display: block;
          margin: 0 auto 14px;
          border: 1px solid rgba(255,255,255,0.14);
          box-shadow: 0 12px 30px rgba(0,0,0,0.45);
        }

        .pp-toprow {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 18px;
          align-items: start;
        }

        .pp-label {
          font-size: 13px;
          opacity: 0.65;
          margin-bottom: 6px;
          color: rgba(255,255,255,0.70);
        }

        .pp-value {
          font-size: 16px;
          font-weight: 800;
          color: rgba(255,255,255,0.95);
        }

        .pp-hr {
          height: 1px;
          background: rgba(255,255,255,0.10);
          margin: 16px 0;
        }

        .pp-section-title {
          font-size: 14px;
          font-weight: 900;
          opacity: 0.75;
          margin-bottom: 12px;
        }

        .pp-box {
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(0,0,0,0.25);
          padding: 14px;
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
          .pp-toprow {
            grid-template-columns: 1fr;
          }

        }

        @media (max-width: 480px) {
          .pp-wrap {
            padding: 12px 10px 34px;
          }

          .pp-card {
            padding: 16px 12px 14px;
            border-radius: 14px;
          }

          .pp-title {
            font-size: 28px;
            margin: 2px 0 10px;
          }

          .pp-avatar {
            width: 76px;
            height: 76px;
            margin: 0 auto 10px;
          }

          .pp-toprow {
            gap: 10px;
          }

          .pp-toprow > div {
            text-align: center;
          }

          .pp-label {
            font-size: 12px;
            margin-bottom: 4px;
          }

          .pp-value {
            font-size: 15px;
          }

          .pp-hr {
            margin: 10px 0;
          }

          .pp-section-title {
            margin-bottom: 8px;
          }

          .pp-box {
            padding: 10px;
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
            <div className="pp-title">Profile</div>

            {profile && profile.avatar && profile.avatar.dataUrl ? (
              <img
                className="pp-avatar"
                src={profile.avatar.dataUrl}
                alt="Avatar"
              />
            ) : null}

            <div className="pp-toprow">
              <div>
                <div className="pp-label">Username</div>
                <div className="pp-value">{profile.username ? `@${profile.username}` : `@${un}`}</div>
              </div>

              <div>
                <div className="pp-label">Display name</div>
                <div className="pp-value">{profile.displayName || "Player"}</div>
              </div>

              <div>
                <div className="pp-label">Status</div>
                <div className="pp-value">{membershipStatus}</div>
              </div>
            </div>

            <div className="pp-hr" />

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
