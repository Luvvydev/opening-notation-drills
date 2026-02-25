// Profile.js
import React, { useEffect, useRef, useState, useCallback } from "react";
import TopNav from "./TopNav";
import { useAuth } from "../auth/AuthProvider";
import { db, serverTimestamp, functions } from "../firebase";
import { httpsCallable } from "firebase/functions";
import { doc, onSnapshot, runTransaction, setDoc } from "firebase/firestore";
import Chessboard from "chessboardjsx";
import { BOARD_THEMES, DEFAULT_THEME, PIECE_THEMES } from "../theme/boardThemes";
import "./ActivityHeatmap.css";
import "./Profile.css";
import { getActivityDays } from "../utils/activityDays";

const LS_SETTINGS_KEY = "notation_trainer_opening_settings_v1";
const SECRET_UNLOCK_KEY = "chessdrills.secret_easteregg_v1";
const AVATAR_KEY = "chessdrills.avatar_v1";

const KONAMI_KEYS = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];

function loadSecretUnlocked() {
  try {
    return window.localStorage.getItem(SECRET_UNLOCK_KEY) === "1";
  } catch (_) {
    return false;
  }
}

function saveSecretUnlocked(v) {
  try {
    window.localStorage.setItem(SECRET_UNLOCK_KEY, v ? "1" : "0");
  } catch (_) {}

}

function loadAvatar() {
  try {
    const raw = window.localStorage.getItem(AVATAR_KEY);
    return raw ? String(raw) : "";
  } catch (_) {
    return "";
  }
}

function saveAvatar(dataUrl) {
  try {
    if (!dataUrl) window.localStorage.removeItem(AVATAR_KEY);
    else window.localStorage.setItem(AVATAR_KEY, String(dataUrl));
  } catch (_) {}
}

function safeJsonParse(text, fallback) {
  try {
    return JSON.parse(text);
  } catch (_) {
    return fallback;
  }
}

function loadLocalSettings() {
  const defaults = {
    showConfetti: true,
    playSounds: true,
    boardTheme: DEFAULT_THEME,
    pieceTheme: "default"
  };

  try {
    const raw = window.localStorage.getItem(LS_SETTINGS_KEY);
    if (!raw) return defaults;
    const parsed = safeJsonParse(raw, defaults);
    return {
      showConfetti: parsed.showConfetti !== false,
      playSounds: parsed.playSounds !== false,
      boardTheme: parsed.boardTheme || DEFAULT_THEME,
      pieceTheme: parsed.pieceTheme || "default"
    };
  } catch (_) {
    return defaults;
  }
}

function saveLocalSettings(patch) {
  const cur = loadLocalSettings();
  const next = { ...cur, ...(patch || {}) };
  try {
    window.localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(next));
  } catch (_) {}
  return next;
}

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
  const { user, membershipTier, membershipActive, userDoc } = useAuth();

 

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [userData, setUserData] = useState(null);
  const [activityTick, setActivityTick] = useState(0);
  const [billingBusy, setBillingBusy] = useState(false);
  const [billingError, setBillingError] = useState("");
  const [profileError, setProfileError] = useState("");

  const [editingUsername, setEditingUsername] = useState(false);
  const [editingDisplayName, setEditingDisplayName] = useState(false);
  const [boardTheme, setBoardTheme] = useState(DEFAULT_THEME);
  const [pieceTheme, setPieceTheme] = useState("default");
  const [secretUnlocked, setSecretUnlocked] = useState(false);
  const [avatarDataUrl, setAvatarDataUrl] = useState("");
  const [previewWidth, setPreviewWidth] = useState(320);
  const boardPreviewRef = useRef(null);
  const konamiRef = useRef({ idx: 0 });
  const longPressTimerRef = useRef(null);
  const longPressFiredRef = useRef(false);
  const avatarInputRef = useRef(null);
  const unlockSecretRef = useRef(null);
  const membershipPlan = (userData && userData.membershipPlan) || (userDoc && userDoc.membershipPlan) || null;

  useEffect(() => {
    const el = boardPreviewRef.current;
    if (!el) return;

    const update = () => {
      const w = el.getBoundingClientRect().width;
      if (!w || Number.isNaN(w)) return;
      const next = Math.max(220, Math.min(360, Math.floor(w)));
      setPreviewWidth(next);
    };

    update();

    let ro;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => update());
      ro.observe(el);
    } else {
      window.addEventListener("resize", update);
    }

    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener("resize", update);
    };
  }, []);


  const usernameInputRef = useRef(null);
  const displayNameInputRef = useRef(null);
  const heatmapScrollRef = useRef(null);

  useEffect(() => {
    const onAct = () => setActivityTick((x) => x + 1);
    window.addEventListener("activity:updated", onAct);
    return () => window.removeEventListener("activity:updated", onAct);
  }, [])

  useEffect(() => {
    // Load theme from localStorage on first mount
    const s = loadLocalSettings();
    setBoardTheme(s.boardTheme || DEFAULT_THEME);
    setPieceTheme(s.pieceTheme || "default");
    setSecretUnlocked(loadSecretUnlocked());
    setAvatarDataUrl(loadAvatar());
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (!e) return;
      const t = e.target;
      const tag = t && t.tagName;
      const editable = t && t.isContentEditable;
      if (editable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const key = e.key === "B" ? "b" : e.key === "A" ? "a" : e.key;
      const st = konamiRef.current || { idx: 0 };

      if (key === KONAMI_KEYS[st.idx]) {
        st.idx += 1;
      } else {
        st.idx = key === KONAMI_KEYS[0] ? 1 : 0;
      }

      if (st.idx >= KONAMI_KEYS.length) {
        st.idx = 0;
        if (unlockSecretRef.current) unlockSecretRef.current();
      }

      konamiRef.current = st;
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    return () => {
      try { cancelLongPress(); } catch (_) {}
    };
  }, []);

  useEffect(() => {
    const el = boardPreviewRef.current;
    if (!el) return;

    const recalc = () => {
      const w = Math.min(360, Math.max(240, el.clientWidth || 320));
      setPreviewWidth(w);
    };

    recalc();
    window.addEventListener("resize", recalc);
    return () => window.removeEventListener("resize", recalc);
  }, []);
;

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

        const remoteTheme = data && data.settings && data.settings.boardTheme;
        if (remoteTheme) {
          setBoardTheme((cur) => (cur === remoteTheme ? cur : remoteTheme));
          saveLocalSettings({ boardTheme: remoteTheme });
        }

        const remoteAvatar = data && data.avatar && data.avatar.dataUrl ? String(data.avatar.dataUrl) : "";
        if (remoteAvatar) {
          setAvatarDataUrl((cur) => {
            if (cur) return cur;
            saveAvatar(remoteAvatar);
            return remoteAvatar;
          });
        }

        const remotePieceTheme = data && data.settings && data.settings.pieceTheme;
        if (remotePieceTheme) {
          setPieceTheme((cur) => (cur === remotePieceTheme ? cur : remotePieceTheme));
          saveLocalSettings({ pieceTheme: remotePieceTheme });
        }
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

  function unlockSecret() {
    if (loadSecretUnlocked()) {
      setSecretUnlocked(true);
      return;
    }

    saveSecretUnlocked(true);
    setSecretUnlocked(true);

    // Immediate payoff.
    const next = saveLocalSettings({ boardTheme: "purpleblack", pieceTheme: "alpha" });
    setBoardTheme(next.boardTheme || DEFAULT_THEME);

    setPieceTheme(next.pieceTheme || "default");


    syncPublicProfile({ settings: { boardTheme: "purpleblack", pieceTheme: "alpha" } });

    if (!user) return;
    try {
      const ref = doc(db, "users", user.uid);
      runTransaction(db, async (tx) => {
        tx.set(
          ref,
          { settings: { boardTheme: "purpleblack", pieceTheme: "alpha" }, updatedAt: serverTimestamp() },
          { merge: true }
        );
      });
    } catch (_) {
      // ignore
    }
  }

  function normalizeSecretInput(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9]/g, "");
  }

  useEffect(() => {
    unlockSecretRef.current = unlockSecret;
  });

  function matchesSecret(s) {
    const x = normalizeSecretInput(s);
    if (!x) return false;

    // "Konami" string formats.
    if (x === "uuddlrlrba") return true;
    if (x === "upupdowndownleftrightleftrightba") return true;
    if (x === "upupdowndownleftrightleftrightbastart") return true;

    // Allow letters only typed with no arrows.
    if (x === "konami") return true;

    return false;
  }

  function promptForSecret() {
    const v = window.prompt("Enter secret code");
    if (!v) return;
    if (matchesSecret(v)) unlockSecret();
  }

  function beginLongPress() {
    if (longPressTimerRef.current) return;
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null;
      longPressFiredRef.current = true;
      promptForSecret();
    }, 650);
  }

  function cancelLongPress() {
    if (!longPressTimerRef.current) return;
    clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  }


const resizeImageToDataUrl = useCallback((file, maxSize) => {
  return new Promise((resolve, reject) => {
    try {
      if (!file) return resolve("");

      const reader = new FileReader();
      reader.onerror = () => reject(new Error("read_failed"));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("image_failed"));
        img.onload = () => {
          try {
            const w0 = img.width || 0;
            const h0 = img.height || 0;
            if (!w0 || !h0) return resolve("");

            const s = Math.max(w0, h0);
            const scale = s > maxSize ? (maxSize / s) : 1;
            const w = Math.max(1, Math.round(w0 * scale));
            const h = Math.max(1, Math.round(h0 * scale));

            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;

            const ctx = canvas.getContext("2d");
            if (!ctx) return resolve("");
            ctx.drawImage(img, 0, 0, w, h);

            // JPEG keeps size down. 0.86 usually looks fine for avatars.
            const dataUrl = canvas.toDataURL("image/jpeg", 0.86);
            resolve(dataUrl);
          } catch (e) {
            reject(e);
          }
        };
        img.src = String(reader.result || "");
      };
      reader.readAsDataURL(file);
    } catch (e) {
      reject(e);
    }
  });
}, []);

async function onAvatarFileChange(e) {
  const f = e && e.target && e.target.files && e.target.files[0] ? e.target.files[0] : null;
  if (!f) return;
  try {
    const dataUrl = await resizeImageToDataUrl(f, 256);
    if (!dataUrl) return;

    saveAvatar(dataUrl);
    setAvatarDataUrl(dataUrl);

    await syncPublicProfile({ avatar: { dataUrl } });

    // Best effort cloud sync. If it fails (rules/size), local still works.
    if (user) {
      try {
        const ref = doc(db, "users", user.uid);
        await runTransaction(db, async (tx) => {
          tx.set(ref, { avatar: { dataUrl, updatedAt: serverTimestamp() }, updatedAt: serverTimestamp() }, { merge: true });
        });
      } catch (_) {}
    }
  } catch (_) {
    // ignore
  } finally {
    try {
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    } catch (_) {}
  }
}

function openAvatarPicker() {
  try {
    if (avatarInputRef.current) avatarInputRef.current.click();
  } catch (_) {}
}

function onAvatarClick() {
  // Prevent click firing after long press prompt.
  if (longPressFiredRef.current) {
    longPressFiredRef.current = false;
    return;
  }
  openAvatarPicker();
}


async function syncPublicProfile(patch) {
  if (!user) return;
  const un = normalizeUsername(username);
  if (!un) return;

  const publicRef = doc(db, "publicProfiles", un);

  const base = {
    uid: user.uid,
    username: un,
    displayName: (displayName || "").trim() || "Player",
    updatedAt: serverTimestamp()
  };

  const merged = { ...base, ...(patch || {}) };

  try {
    await setDoc(publicRef, merged, { merge: true });
  } catch (_) {
    // ignore
  }
}

  const saveProfile = async () => {
    setProfileError("");
    const dn = displayName.trim();
    const un = normalizeUsername(username);

    if (!user) return;

    if (!dn) {
      setProfileError("Display name is required.");
      return;
    }

    if (!un || un.length < 3) {
      setProfileError("Username must be at least 3 characters.");
      return;
    }

    const userRef = doc(db, "users", user.uid);
    const usernameRef = doc(db, "usernames", un);
    const publicRef = doc(db, "publicProfiles", un);

    try {
      // 1) Claim username mapping (create if missing, never update)
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(usernameRef);
        if (snap.exists()) {
          const existingUid = snap.data() && snap.data().uid ? snap.data().uid : "";
          if (existingUid && existingUid !== user.uid) {
            throw new Error("Username already taken");
          }
          // If it already belongs to this uid, leave it untouched (avoid update permissions).
          return;
        }
        tx.set(usernameRef, { uid: user.uid });
      });

      // 2) Save private profile fields (this must succeed even if public sync fails)
      await setDoc(
        userRef,
        {
          displayName: dn,
          username: un,
          email: user.email,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );

      // 3) Best-effort public profile sync (do not block saving)
      try {
        await setDoc(
          publicRef,
          {
            uid: user.uid,
            username: un,
            displayName: dn,
            avatar: { dataUrl: avatarDataUrl || "" },
            activityDays:
              userData && userData.activityDays && typeof userData.activityDays === "object"
                ? userData.activityDays
                : {},
            settings: { boardTheme: boardTheme || DEFAULT_THEME, pieceTheme: pieceTheme || "default" },
            publicBadge:
              membershipTier === "lifetime"
                ? "Lifetime Member"
                : membershipActive
                ? "Member"
                : "",
            updatedAt: serverTimestamp()
          },
          { merge: true }
        );
      } catch (_) {
        // ignore (public profile rules might be stricter than private profile rules)
      }

      setEditingUsername(false);
      setEditingDisplayName(false);
    } catch (err) {
      const msg = err && err.message ? String(err.message) : "Could not save profile. Try again.";
      setProfileError(msg);
    }
  };

const onChangeBoardTheme = async (nextTheme) => {
  const next = saveLocalSettings({ boardTheme: nextTheme });
  setBoardTheme(next.boardTheme || DEFAULT_THEME);

  await syncPublicProfile({ settings: { boardTheme: nextTheme, pieceTheme } });

  if (!user) return;
  try {
    const ref = doc(db, "users", user.uid);
    await runTransaction(db, async (tx) => {
      tx.set(
        ref,
        { settings: { boardTheme: nextTheme }, updatedAt: serverTimestamp() },
        { merge: true }
      );
    });
  } catch (_) {
    // ignore
  }
};

const onChangePieceTheme = async (nextPieceTheme) => {
  const next = saveLocalSettings({ pieceTheme: nextPieceTheme });
  setPieceTheme(next.pieceTheme || "default");

  await syncPublicProfile({ settings: { boardTheme, pieceTheme: nextPieceTheme } });

  if (!user) return;
  try {
    const ref = doc(db, "users", user.uid);
    await runTransaction(db, async (tx) => {
      tx.set(
        ref,
        { settings: { pieceTheme: nextPieceTheme }, updatedAt: serverTimestamp() },
        { merge: true }
      );
    });
  } catch (_) {
    // ignore
  }
};



  const openBillingPortal = async () => {
    setBillingError("");
    if (!user) return;

    // Lifetime purchases have no subscription to cancel.
    if (!membershipActive || membershipTier !== "member") {
      return;
    }

    setBillingBusy(true);
    try {
      const fn = httpsCallable(functions, "createBillingPortalLink");
      const res = await fn({});
      const url = res && res.data && res.data.url ? String(res.data.url) : "";
      if (url) {
        window.location.href = url;
      } else {
        setBillingError("Could not open billing portal. Try again.");
      }
    } catch (_) {
      setBillingError("Could not open billing portal. Try again.");
    } finally {
      setBillingBusy(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <TopNav title="Chess Opening Drills" hideHero />

      <div className="profile-wrap">
        <div className="profile-card">
          <h1 style={{ textAlign: "center" }}>Profile</h1>



<input
  ref={avatarInputRef}
  type="file"
  accept="image/*"
  onChange={onAvatarFileChange}
  style={{ display: "none" }}
/>

          <div
            onMouseDown={beginLongPress}
            onMouseUp={cancelLongPress}
            onMouseLeave={cancelLongPress}
            onTouchStart={beginLongPress}
            onTouchEnd={cancelLongPress}
            onTouchCancel={cancelLongPress}
            onClick={onAvatarClick}
            style={{
              width: 72,
              height: 72,
              borderRadius: 999,
              margin: "10px auto 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 800,
              background: "radial-gradient(circle at 30% 30%, rgba(183,177,255,0.95), rgba(58,44,110,0.95))",
              border: "1px solid rgba(255,255,255,0.14)",
              boxShadow: "0 10px 26px rgba(0,0,0,0.35)",
              userSelect: "none",
              WebkitUserSelect: "none",
              touchAction: "manipulation",
              cursor: "pointer"
            }}
            title="avatar"
            aria-label="avatar"
            role="button"
          >
{avatarDataUrl ? (
              <img
                src={avatarDataUrl}
                alt="Avatar"
                style={{ width: "100%", height: "100%", borderRadius: 999, objectFit: "cover" }}
              />
            ) : (
              (displayName || username || "?").trim().slice(0, 1).toUpperCase()
            )}
          </div>

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
              <div className="profile-value">
                {membershipTier === "lifetime" ? "Lifetime Member" : (membershipActive ? (membershipPlan === "yearly" ? "Member (Yearly)" : "Member (Monthly)") : "Free")}
              </div>
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

              {profileError ? (
                <div style={{ marginTop: 10, fontSize: 13, color: "rgba(255, 180, 180, 0.95)" }}>
                  {profileError}
                </div>
              ) : null}
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
              const dowLabels = ["", "Mon", "", "Wed", "", "Fri", ""]; // GitHub-style labels

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

                  {!any && (
                    <div className="activity-empty">Keep drilling to start building your history.</div>
                  )}

                  <div className="activity-note">
                    Each square represents a day. Lighter colors indicate more activity.
                  </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="profile-divider" />

          <div className="profile-section">
            <div
              className="profile-section-title"
              onMouseDown={beginLongPress}
              onMouseUp={cancelLongPress}
              onMouseLeave={cancelLongPress}
              onTouchStart={beginLongPress}
              onTouchEnd={cancelLongPress}
              onTouchCancel={cancelLongPress}
            >
              Board Appearance
            </div>

            <div className="profile-setting-row">
              <div className="profile-setting-label">Board Color</div>
              <select
                className="profile-select"
                value={boardTheme || DEFAULT_THEME}
                onChange={(e) => onChangeBoardTheme(e.target.value)}
              >
                <option value="chesscom">Chess.com</option>
                <option value="lichess">Lichess</option>
                <option value="darkblue">Dark Blue</option>
                {secretUnlocked ? <option value="purpleblack">Princess</option> : null}
              </select>
            </div>

            {secretUnlocked ? (
              <div className="profile-setting-row">
                <div className="profile-setting-label">Piece Set</div>
                <select
                  className="profile-select"
                  value={pieceTheme || "default"}
                  onChange={(e) => onChangePieceTheme(e.target.value)}
                >
                  <option value="default">Default</option>
                  <option value="alpha">High Contrast</option>
                </select>
              </div>
            ) : null}

            <div className="profile-board-preview" ref={boardPreviewRef}>
              <Chessboard
                width={previewWidth}
                position="start"
                draggable={false}
                pieceTheme={(PIECE_THEMES && PIECE_THEMES[pieceTheme || "default"]) || undefined}
                {...BOARD_THEMES[boardTheme || DEFAULT_THEME]}
              />
            </div>

            <div className="profile-membership-tools">
              <div className="profile-membership-title">Membership</div>

              {
              membershipTier === "lifetime" ? (
                <div className="profile-membership-row">
                  <div className="profile-membership-text">Lifetime Member</div>
                </div>
              ) : membershipActive ? (
                <div className="profile-membership-row">
                  <div className="profile-membership-text">
                    {membershipPlan === "yearly" ? "Yearly subscription" : "Monthly subscription"}
                  </div>
                  <button
                    type="button"
                    className="profile-membership-btn"
                    onClick={openBillingPortal}
                    disabled={billingBusy}
                  >
                    {billingBusy ? "Opening..." : "Manage subscription"}
                  </button>
                </div>
              ) : (
                <div className="profile-membership-row">
                  <div className="profile-membership-text">Start your 7 day free trial.</div>
                  <button
                    type="button"
                    className="profile-membership-btn"
                    onClick={() => { try { window.location.href = "#/about"; } catch (_) {} }}
                  >
                    Start Free Trial
                  </button>
                </div>
              )
            }

              {billingError ? <div className="profile-membership-error">{billingError}</div> : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}