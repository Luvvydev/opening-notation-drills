import React, { useEffect, useRef, useState } from "react";
import TopNav from "./TopNav";
import { useAuth } from "../auth/AuthProvider";
import { db, serverTimestamp } from "../firebase";
import { doc, getDoc, runTransaction } from "firebase/firestore";
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
  const today = new Date();
  const end = new Date(today);
  end.setHours(0, 0, 0, 0);

  const start = startOfWeekSunday(addDays(end, -(weeks * 7 - 1)));

  const columns = [];
  for (let w = 0; w < weeks; w += 1) {
    const weekStart = addDays(start, w * 7);
    const cells = [];
    for (let r = 0; r < 7; r += 1) {
      const dt = addDays(weekStart, r);
      const ymd = ymdFromDate(dt);
      const c = daysMap && Object.prototype.hasOwnProperty.call(daysMap, ymd) ? daysMap[ymd] : 0;
      cells.push({ ymd, count: Number(c) || 0, level: activityLevel(c) });
    }
    columns.push({ weekStart, cells });
  }

  // Month labels aligned to weeks
  const monthLabels = [];
  let lastMonth = -1;
  for (let w = 0; w < columns.length; w += 1) {
    const m = columns[w].weekStart.getMonth();
    if (m !== lastMonth) {
      monthLabels.push({ weekIndex: w, label: columns[w].weekStart.toLocaleString(undefined, { month: "short" }) });
      lastMonth = m;
    }
  }

  return { columns, monthLabels };
}






export default function Profile() {
  const { user } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [userData, setUserData] = useState(null);

  const [editingUsername, setEditingUsername] = useState(false);
  const [editingDisplayName, setEditingDisplayName] = useState(false);

  const usernameInputRef = useRef(null);
  const displayNameInputRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    (async () => {
      const snap = await getDoc(doc(db, "users", user.uid));
      const data = snap.exists() ? snap.data() : {};
      setUserData(data);
      setDisplayName(data.displayName || "");
      setUsername(data.username || "");
    })();
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
      <TopNav title="Chess Opening Drills" />

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

              // Merge by max per-day count to avoid inflating totals when devices sync.
              const merged = { ...remoteDays };
              Object.keys(localDays).forEach((k) => {
                const a = Number(merged[k]) || 0;
                const b = Number(localDays[k]) || 0;
                merged[k] = Math.max(a, b);
              });

              const { columns, monthLabels } = buildHeatmap(merged, 53);
              const any = columns.some((col) => col.cells.some((c) => c.level > 0));

              return (
                <div className="activity-scroll">

                  <div className="activity-months">
                    {monthLabels.map((m) => (
                      <div
                        key={m.weekIndex + ":" + m.label}
                        className="activity-month"
                        style={{ gridColumnStart: m.weekIndex + 1 }}
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
                            className={`activity-cell level-${c.level}`}
                            title={`${c.ymd}  ${c.count} line${c.count === 1 ? "" : "s"} completed`}
                          />
                        ))}
                      </div>
                    ))}
                  </div>

                  {!any && (
                    <div className="activity-empty">Keep drilling to start building your history.</div>
                  )}

                  <div className="activity-note">
                    Each square represents a day. Lighter colors indicate more lines completed.
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
