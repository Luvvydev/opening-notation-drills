// Profile.js
import React, { useEffect, useRef, useState } from "react";
import TopNav from "./TopNav";
import { useAuth } from "../auth/AuthProvider";
import { db, serverTimestamp } from "../firebase";
import { doc, onSnapshot, runTransaction } from "firebase/firestore";
import "./ActivityHeatmap.css";
import "./Profile.css";
import { getActivityDays } from "../utils/activityDays";

function normalizeUsername(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
}

function ymdFromDate(dt) {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfWeekSunday(dt) {
  const d = new Date(dt);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 Sun
  d.setDate(d.getDate() - day);
  return d;
}

function addDays(dt, days) {
  const d = new Date(dt);
  d.setDate(d.getDate() + days);
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

function buildHeatmap(daysMap, weeks) {
  const CELL = 16;
  const GAP = 4;

  const today = new Date();
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

      const raw = !isFuture && daysMap && Object.prototype.hasOwnProperty.call(daysMap, ymd) ? daysMap[ymd] : 0;
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
    const m = ws.getMonth(); // 0-11
    const monthKey = `${y}-${m}`;

    if (monthKey !== lastMonthKey) {
      const mon = ws.toLocaleString(undefined, { month: "short" });

      // If "Jan" appears twice in a 53 week window, disambiguate by adding the year suffix.
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

export default function Profile() {
  const { user } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [userData, setUserData] = useState(null);
  const [activityTick, setActivityTick] = useState(0);

  const [editingUsername, setEditingUsername] = useState(false);
  const [editingDisplayName, setEditingDisplayName] = useState(false);

  const usernameInputRef = useRef(null);
  const displayNameInputRef = useRef(null);
  const heatmapScrollRef = useRef(null);

  useEffect(() => {
    const onAct = () => setActivityTick((x) => x + 1);
    window.addEventListener("activity:updated", onAct);
    return () => window.removeEventListener("activity:updated", onAct);
  }, []);

  useEffect(() => {
    const el = heatmapScrollRef.current;
    if (!el) return;
    el.scrollLeft = el.scrollWidth;
  }, [activityTick]);

  useEffect(() => {
    if (!user) return;

    const ref = doc(db, "users", user.uid);

    // Live updates so activityDays written by cloudSync shows up immediately
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = snap.exists() ? snap.data() : {};
        setUserData(data);
        setDisplayName(data.displayName || "");
        setUsername(data.username || "");
      },
      () => {
        // ignore
      }
    );

    return () => {
      try { unsub(); } catch (_) {}
    };
  }, [user]);

  useEffect(() => {
    if (editingUsername && usernameInputRef.current) {
      usernameInputRef.current.focus();
    }
  }, [editingUsername]);

  useEffect(() => {
    if (editingDisplayName && displayNameInputRef.current) {
      displayNameInputRef.current.focus();
    }
  }, [editingDisplayName]);

  const saveProfile = async () => {
    const dn = displayName.trim();
    const un = normalizeUsername(username);

    if (!dn || !un || un.length < 3) return;

    await runTransaction(db, async (tx) => {
      const userRef = doc(db, "users", user.uid);
      const usernameRef = doc(db, "usernames", un);
      const publicRef = doc(db, "publicProfiles", un);

      const usernameSnap = await tx.get(usernameRef);
      if (usernameSnap.exists() && usernameSnap.data().uid !== user.uid) {
        throw new Error("Username already taken");
      }

      tx.set(usernameRef, { uid: user.uid }, { merge: true });

      tx.set(
        userRef,
        {
          displayName: dn,
          username: un,
          email: user.email,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );

      tx.set(
        publicRef,
        {
          uid: user.uid,
          username: un,
          displayName: dn,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    });

    setEditingUsername(false);
    setEditingDisplayName(false);
  };

  if (!user) return null;

  return (
    <>
      <TopNav title="Chess Opening Drills" hideHero />

      <div className="profile-wrap">
        <div className="profile-card">
          <h1 style={{ textAlign: "center" }}>Profile</h1>

          <div className="profile-toprow">
            <div>
              <div className="profile-label">Username</div>
              {!editingUsername ? (
                <div className="profile-row">
                  <div className="profile-value">@{username}</div>
                  <button onClick={() => setEditingUsername(true)}>✎</button>
                </div>
              ) : (
                <input
                  ref={usernameInputRef}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              )}

              <div style={{ marginTop: 16 }}>
                <div className="profile-label">Display name</div>
                {!editingDisplayName ? (
                  <div className="profile-row">
                    <div className="profile-value">{displayName}</div>
                    <button onClick={() => setEditingDisplayName(true)}>✎</button>
                  </div>
                ) : (
                  <input
                    ref={displayNameInputRef}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                )}
              </div>
            </div>

            <div>
              <div className="profile-label">Email</div>
              <div className="profile-value">{user.email}</div>
            </div>

            <div>
              <div className="profile-label">Membership Status</div>
              <div className="profile-value">Active Member</div>
            </div>
          </div>

          {(editingUsername || editingDisplayName) && (
            <div style={{ marginTop: 16 }}>
              <button onClick={saveProfile}>Save profile</button>
              <button
                onClick={() => {
                  setEditingUsername(false);
                  setEditingDisplayName(false);
                  setDisplayName(userData?.displayName || "");
                  setUsername(userData?.username || "");
                }}
              >
                Cancel
              </button>
            </div>
          )}

          <div className="activity-section">
            <div className="profile-label">Your Activity</div>

            <div className="activity-legend-row">
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
              const localDays = getActivityDays();
              const remoteDays =
                userData && userData.activityDays && typeof userData.activityDays === "object"
                  ? userData.activityDays
                  : {};

              const merged = { ...remoteDays };
              Object.keys(localDays).forEach((k) => {
                const a = Number(merged[k]) || 0;
                const b = Number(localDays[k]) || 0;
                merged[k] = Math.max(a, b);
              });

              const { columns, monthLabels, widthPx } = buildHeatmap(merged, 53);
              const any = columns.some((col) => col.cells.some((c) => c.level > 0));

              return (
                <div className="activity-scroll" ref={heatmapScrollRef}>
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

                  {!any && (
                    <div className="activity-empty">Keep drilling to start building your history.</div>
                  )}

                  <div className="activity-note">
                    Each square represents a day. Lighter colors indicate more activity.
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </>
  );
}
