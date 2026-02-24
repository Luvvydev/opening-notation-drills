import React, { Component } from "react";
import Chessboard from "chessboardjsx";
import * as Chess from "chess.js";
import { OPENING_SETS as CATALOG_OPENING_SETS } from "../openings/openingCatalog";
import { useAuth } from "../auth/AuthProvider";
import TopNav from "./TopNav";
import { BOARD_THEMES, DEFAULT_THEME } from "../theme/boardThemes";
import "./OpeningTrainer.css";
import { getStreakState, markLineCompletedTodayDetailed } from "../utils/streak";
import { getActivityDays, markActivityToday, touchActivityToday } from "../utils/activityDays";
import { calcWidth, X_SVG_DATA_URI, pickRandomLineId, splitMovesText, validateSanMoves, countMovesForSide, countDoneMovesForSide, groupLines } from "./openingTrainer/otUtils";
import { getOrderedLineIds } from "../utils/lineIndex";
import { pickNextPracticeLineId, pickNextLearnLineId } from "./openingTrainer/practicePicker";

import { loadProgress, saveProgress, loadLearnProgress, saveLearnProgress, loadSettings, saveSettings, loadCustomLines, saveCustomLines, makeCustomId, ensureOpening, getLineStats, isCompleted, ensureLearnOpening, getLearnLineStats } from "./openingTrainer/otStorage";
import OpeningTrainerCustomModal from "./openingTrainer/OpeningTrainerCustomModal";
import OpeningTrainerConfetti from "./openingTrainer/OpeningTrainerConfetti";
import { db } from "../firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";


const OPENING_SETS = CATALOG_OPENING_SETS;

// ---- Logged-out free drills limiter ----
const FREE_DRILLS_KEY = "chessdrills_free_drills_v1";

function loadFreeDrillsMap() {
  try {
    const raw = window.localStorage.getItem(FREE_DRILLS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_) {
    return {};
  }
}

function saveFreeDrillsMap(map) {
  try {
    window.localStorage.setItem(FREE_DRILLS_KEY, JSON.stringify(map || {}));
  } catch (_) {}
}

function getFreeDrillsCount(openingKey) {
  const key = String(openingKey || "");
  const map = loadFreeDrillsMap();
  const n = map && typeof map[key] === "number" ? map[key] : 0;
  return Math.max(0, n);
}

function incFreeDrillsCount(openingKey) {
  const key = String(openingKey || "");
  const map = loadFreeDrillsMap();
  const cur = map && typeof map[key] === "number" ? map[key] : 0;
  const next = Math.max(0, cur) + 1;
  map[key] = next;
  saveFreeDrillsMap(map);
  return next;
}


// ---- Learn shuffle bag (prevents repeating same few lines) ----
const _learnBagKey = (openingKey) => `chessdrills.learn_bag.v1.${String(openingKey || "")}`;

function _shuffleIds(ids) {
  const a = Array.isArray(ids) ? ids.slice() : [];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

function _loadLearnBag(openingKey) {
  try {
    const raw = window.localStorage.getItem(_learnBagKey(openingKey));
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || !Array.isArray(obj.order)) return null;
    const idx = Number(obj.idx) || 0;
    return { order: obj.order.map(String), idx };
  } catch (_) {
    return null;
  }
}

function _saveLearnBag(openingKey, bag) {
  try {
    window.localStorage.setItem(_learnBagKey(openingKey), JSON.stringify(bag || {}));
  } catch (_) {}
}

function _sameIdSet(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  const sa = a.map(String).slice().sort();
  const sb = b.map(String).slice().sort();
  for (let i = 0; i < sa.length; i += 1) {
    if (sa[i] !== sb[i]) return false;
  }
  return true;
}

function _pickNextLearnFromBag({ openingKey, lineIds, excludeLineIds, lastLineId, forceRepeatLineId }) {
  if (!openingKey) return null;
  const idsAll = Array.isArray(lineIds) ? lineIds.filter(Boolean).map(String) : [];
  if (idsAll.length === 0) return null;

  if (forceRepeatLineId) return String(forceRepeatLineId);

  const exclude = Array.isArray(excludeLineIds) ? excludeLineIds.filter(Boolean).map(String) : [];
  const excludeSet = new Set(exclude);

  let bag = _loadLearnBag(openingKey);
  if (!bag || !_sameIdSet(bag.order, idsAll) || bag.order.length === 0) {
    bag = { order: _shuffleIds(idsAll), idx: 0 };
  }

  // Try up to N picks from the bag to find a non-excluded line.
  // If everything is excluded, we will fall back to allowing excluded lines.
  const maxTries = bag.order.length;
  let tries = 0;
  let pick = null;

  while (tries < maxTries) {
    const i = bag.idx % bag.order.length;
    const candidate = bag.order[i];
    bag.idx = i + 1;
    tries += 1;

    if (excludeSet.size > 0 && excludeSet.has(String(candidate))) continue;
    if (lastLineId && String(candidate) === String(lastLineId) && bag.order.length > 1) continue;

    pick = candidate;
    break;
  }

  // If we couldn't find a non-excluded candidate, allow excluded but still avoid immediate repeat if possible.
  if (!pick) {
    for (let k = 0; k < bag.order.length; k += 1) {
      const candidate = bag.order[(bag.idx + k) % bag.order.length];
      if (lastLineId && String(candidate) === String(lastLineId) && bag.order.length > 1) continue;
      pick = candidate;
      bag.idx = (bag.idx + k + 1) % bag.order.length;
      break;
    }
  }

  // If we've effectively exhausted the bag, reshuffle for the next cycle.
  if (bag.idx >= bag.order.length) {
    bag.order = _shuffleIds(idsAll);
    bag.idx = 0;
  }

  _saveLearnBag(openingKey, bag);
  return pick || null;
}

// ---- End Learn shuffle bag ----

class OpeningTrainer extends Component {
  constructor(props) {
    super(props);

    this._openCustomOnMount = false;
    this.game = new Chess();

    this._settingsAnchorEl = null;
    this._linePickerAnchorEl = null;

    let firstSetKey = "london";
    try {
      const search = (props && props.location && props.location.search) || "";
      const params = new URLSearchParams(search);
      
      this._openCustomOnMount = params.get("custom") === "1";
      const fromHome = params.get("opening");
      if (fromHome && OPENING_SETS[fromHome]) firstSetKey = fromHome;
    } catch (_) {
      // ignore
    }

    const firstLinesBuiltIn = OPENING_SETS[firstSetKey].lines;
    const customAll = loadCustomLines();
    const customForFirst = customAll.filter((l) => l && l.openingKey === firstSetKey);
    const firstLines = firstLinesBuiltIn.concat(customForFirst);
    const firstId = pickRandomLineId(firstLines, null) || (firstLines[0] ? firstLines[0].id : "");

    this._autoNextTimer = null;
    this._confettiTimer = null;
    this._streakToastTimer = null;

    const progress = loadProgress();
    const learnProgress = loadLearnProgress();
    const settings = loadSettings(DEFAULT_THEME);

    const drillStats = this.loadDrillStats();

    this.state = {
      openingKey: firstSetKey,
      lineId: firstId,
      sessionLineId: null,
      practiceForceRepeat: false,
      prevPracticeLineId: null,
      prevLearnLineId: null,
      learnRecentLineIds: [],
      linePicker: "random",
      gameMode: "learn",
      modePanelVisible: true,
      userHasPlayedThisLine: false,
      helpUsed: false,
      drillStreak: 0,
      drillBestAllTime: (drillStats && drillStats.bestAllTime) || 0,
      drillRunDead: false,
      fen: "start",
      stepIndex: 0,
      mistakeUnlocked: false,
      lastMistake: null,
      completed: false,
      confettiActive: false,
      wrongAttempt: null,
      progress: progress,
      learnProgress: learnProgress,
      learnForceRepeat: false,
      showHint: false,
      settingsOpen: false,
      lineMenuOpen: false,
      settings: settings,
      customLines: customAll,
      customModalOpen: false,
      customName: "",
      customMovesText: "",
      customError: ""
    ,
      viewing: false,
      viewIndex: 0,
      viewFen: "start",
      hintFromSquare: null,
      solveArmed: false,
      selectedSquare: null,
      legalTargets: [],
      streakToastOpen: false,
      streakToastText: "",
      lastMove: null, // { from, to }
      memberGateOpen: false,
      memberGateMode: "",
      isMobile: false,
      mobileBoardSize: null,
      mobileHeaderMenu: null,
      learnRewardPending: false,
      learnNextReady: false
    
    };
    
    // Mobile layout measurement refs (used only when isMobile)
    this._mobileTopbarRef = React.createRef();
    this._mobilePillsRef = React.createRef();
    this._mobileCoachRef = React.createRef();
    this._mobileDockRef = React.createRef();
this._countedSeenForRun = false;

    const base = process.env.PUBLIC_URL || "";
    this.sfx = {
      capture: new Audio(base + "/sounds/capture.mp3"),
      illegal: new Audio(base + "/sounds/illegal.mp3"),
      moveSelf: new Audio(base + "/sounds/move-self.mp3"),
      moveOpponent: new Audio(base + "/sounds/move-opponent.mp3")
    };

    Object.values(this.sfx).forEach((a) => {
      if (!a) return;
      a.preload = "auto";
      a.volume = 0.55;
    });
  }

  _backfillActivityFromStreak = () => {
    // Heatmap uses activity_days, streak uses daily_streak.
    // Older users may have streak data but no activity history, so backfill 1 square.
    try {
      const s = getStreakState();
      const last = s && s.lastCompletedDate ? String(s.lastCompletedDate) : "";
      if (!last) return;

      const days = getActivityDays();
      if (days && Object.prototype.hasOwnProperty.call(days, last)) return;

      const next = { ...(days || {}) };
      next[last] = Math.max(1, Number(next[last]) || 0);

      try {
        window.localStorage.setItem("chessdrills.activity_days.v1", JSON.stringify(next));
      } catch (_) {}

      try {
        window.dispatchEvent(new Event("activity:updated"));
      } catch (_) {}
    } catch (_) {
      // ignore
    }
  };


  isOpeningLocked = (openingKey) => {
    const set = OPENING_SETS[openingKey];
    if (!set) return false;

    // "New" openings are gated behind a free account signup.
    if (set.access === "signup" && !this.props.user) return true;

    // Member-only openings.
    if (set.access === "member" && !this.props.isMember) return true;

    // Time-based early access for members.
    if (set.earlyAccessUntil && !this.props.isMember) {
      try {
        const until = new Date(set.earlyAccessUntil);
        if (!Number.isNaN(until.getTime()) && Date.now() < until.getTime()) return true;
      } catch (_) {}
    }

    return false;
  };

  maybeRedirectForLockedOpening = (openingKey) => {
    if (this.props.authLoading) return false;
    if (!this.isOpeningLocked(openingKey)) return false;

    const set = OPENING_SETS[openingKey];
    const pathname = this.props && this.props.location ? this.props.location.pathname : "/openings";
    const search = this.props && this.props.location ? this.props.location.search : "";
    const from = `${pathname}${search}`;

    const reason = set && set.access === "member" ? "member_opening" : "new_opening";

    // Account required gates to signup, membership gates to About upgrade.
    if (set && set.access === "signup" && !this.props.user) {
      if (this.props && this.props.history && this.props.history.replace) {
        this.props.history.replace({
          pathname: "/signup",
          state: { from, reason }
        });
      }
      return true;
    }

    if (this.props && this.props.history && this.props.history.replace) {
      this.props.history.replace({
        pathname: "/about",
        state: { from, reason }
      });
    }

    return true;
  };

  enforceLearnGate = () => {
    if (this.props.authLoading) return false;

    const mode = this.state.gameMode || "learn";
    const hasPaidAccess = !!(this.props.user && this.props.membershipActive === true);

    // Practice + Drill are premium only.
    if (mode === "practice" || mode === "drill") {
      if (hasPaidAccess) return false;

      if (this.props && this.props.history && this.props.history.replace) {
        const pathname = this.props && this.props.location ? this.props.location.pathname : "/openings";
        const search = this.props && this.props.location ? this.props.location.search : "";
        const from = `${pathname}${search}`;

        // Force them to About to start the Stripe trial.
        this.props.history.replace({
          pathname: "/about",
          state: { from, reason: "membership_required" }
        });
      }
      return true;
    }

    // Learn is free up to 3 completed drills per opening for non-members.
    if (mode === "learn" && !hasPaidAccess) {
      const openingKey = this.state.openingKey;
      const used = getFreeDrillsCount(openingKey);

      if (used >= 3) {
        if (this.props && this.props.history && this.props.history.replace) {
          const pathname = this.props && this.props.location ? this.props.location.pathname : "/openings";
          const search = this.props && this.props.location ? this.props.location.search : "";
          const from = `${pathname}${search}`;

          this.props.history.replace({
            pathname: "/about",
            state: { from, reason: "trial_required" }
          });
        }
        return true;
      }
    }

    return false;
  };


  componentDidMount() {
    window.addEventListener("mousedown", this.onWindowClick);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("resize", this._onResizeMobileLayout);
    this._onResizeMobileLayout();
    if (this.maybeRedirectForLockedOpening(this.state.openingKey)) return;
    if (this.enforceLearnGate()) return;
    this._backfillActivityFromStreak();
    this.resetLine(false);
  
    if (this._openCustomOnMount) {
      this._openCustomOnMount = false;
      this.openCustomModal();
    }
}

  
  componentDidUpdate(prevProps, prevState) {
    if (prevProps.authLoading && !this.props.authLoading) {
      this.maybeRedirectForLockedOpening(this.state.openingKey);
    }

    if (!this.props.authLoading) {
      if (this.enforceLearnGate()) return;
    }

    if (prevState.gameMode !== this.state.gameMode) {
      if (this.enforceLearnGate()) return;
    }

    if (prevState.openingKey !== this.state.openingKey) {
      this.maybeRedirectForLockedOpening(this.state.openingKey);
    }
 
    // Mobile board sizing depends on actual rendered heights (coach text can change as you advance).
    if (this.state.isMobile) {
      const lineChanged = prevState.lineId !== this.state.lineId;
      const stepChanged = prevState.stepIndex !== this.state.stepIndex;
      const menuChanged = prevState.mobileHeaderMenu !== this.state.mobileHeaderMenu;
      if (lineChanged || stepChanged || menuChanged) {
        try {
          window.requestAnimationFrame(() => this._onResizeMobileLayout());
        } catch (_) {
          // ignore
        }
      }
    }

  }

componentWillUnmount() {
    if (this._autoNextTimer) clearTimeout(this._autoNextTimer);
    if (this._confettiTimer) clearTimeout(this._confettiTimer);
    if (this._streakToastTimer) clearTimeout(this._streakToastTimer);
    window.removeEventListener("mousedown", this.onWindowClick);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("resize", this._onResizeMobileLayout);
  }

  _mobileBreakpointPx = 560;

  _isMobileViewport = () => {
    try {
      return typeof window !== "undefined" && window.innerWidth <= this._mobileBreakpointPx;
    } catch (_) {
      return false;
    }
  };

  _computeMobileBoardSize = () => {
    try {
      if (typeof window === "undefined") return null;

      const w = Number(window.innerWidth) || 0;
      const h = Number(window.innerHeight) || 0;

      // Measure real rendered heights so the board can take the remaining space.
      const getH = (ref) => {
        try {
          const el = ref && ref.current;
          if (!el) return 0;
          const r = el.getBoundingClientRect();
          return Math.ceil(r.height || 0);
        } catch (_) {
          return 0;
        }
      };

      const topbarH = getH(this._mobileTopbarRef);
      const pillsH = getH(this._mobilePillsRef);
      const coachH = getH(this._mobileCoachRef);
      const dockH = getH(this._mobileDockRef) || 56;

      // Keep a little slack for borders and iOS safe areas.
      const safety = 10 + (typeof window !== "undefined" ? 0 : 0);

      const availH = Math.max(0, h - topbarH - pillsH - coachH - dockH - safety);
      const stageSidePad = 20; // matches .ot-mobile-stage padding: 0 10px
      const boardPad = 6; // prevents piece clipping against rounded containers
      const availW = Math.max(0, w - stageSidePad - boardPad * 2);
      const availH2 = Math.max(0, availH - boardPad * 2);

      const size = Math.floor(Math.max(0, Math.min(availW, availH2)));
      if (!size) return null;

      return size;
    } catch (_) {
      return null;
    }
  };

  _onResizeMobileLayout = () => {
    const isMobile = this._isMobileViewport();
    const mobileBoardSize = isMobile ? this._computeMobileBoardSize() : null;

    if (this.state.isMobile === isMobile && this.state.mobileBoardSize === mobileBoardSize) return;

    this.setState({ isMobile, mobileBoardSize });
  };

  onWindowClick = (e) => {
    if (!this.state.settingsOpen && !this.state.lineMenuOpen && !this.state.mobileHeaderMenu) return;

    let t = e && e.target;

    // On some mobile browsers the target can be a Text node, which breaks closest().
    if (t && t.nodeType === 3) t = t.parentElement;

    // Clicking pill buttons should not auto-close (otherwise open then instantly close).
    try {
      if (t && t.closest && (t.closest(".ot-pill-btn") || t.closest(".ot-mobile-pill-btn"))) return;
    } catch (_) {}

    // Clicking inside the mobile header menu should not auto-close it.
    try {
      if (t && t.closest && t.closest(".ot-mobile-menu")) return;
    } catch (_) {}

    if (this._settingsAnchorEl && t && this._settingsAnchorEl.contains(t)) return;
    if (this._linePickerAnchorEl && t && this._linePickerAnchorEl.contains(t)) return;
    if (this._desktopMenuEl && t && this._desktopMenuEl.contains(t)) return;

    this.setState({ settingsOpen: false, lineMenuOpen: false, mobileHeaderMenu: null });
  };

  onKeyDown = (e) => {
    const t = e && e.target;
    const tag = t && t.tagName;
    const editable = t && t.isContentEditable;

    if (editable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    const key = e.key;

    if (key === "ArrowUp" || key === "Up") {
      e.preventDefault();
      this.viewLive();
      return;
    }

    if (key === "ArrowLeft" || key === "Left") {
      e.preventDefault();
      this.viewBack();
      return;
    }

    if (key === "ArrowRight" || key === "Right") {
      e.preventDefault();
      this.viewForward();
      return;
    }

    const isSpace = e.code === "Space" || key === " " || key === "Spacebar";
    if (isSpace) {
      if (e.repeat) return;
      e.preventDefault();

      if (this.state.solveArmed) {
        this.playMoveForMe();
      } else {
        this.onHint();
      }
    }
  };


  getOpeningSet = () => {
    return OPENING_SETS[this.state.openingKey] || OPENING_SETS.london;
  };
openCustomModal = () => {
  this.setState({
    customModalOpen: true,
    customName: "",
    customMovesText: "",
    customError: ""
  });
};

closeCustomModal = () => {
  this.setState({ customModalOpen: false, customError: "" });
};

saveCustomModal = () => {
  const openingKey = this.state.openingKey;
  const nameRaw = String(this.state.customName || "").trim();
  const moves = splitMovesText(this.state.customMovesText);

  if (!moves.length) {
    this.setState({ customError: "Paste moves in SAN format first." });
    return;
  }

  const v = validateSanMoves(moves);
  if (!v.ok) {
    this.setState({
      customError: `Bad move at #${(v.index || 0) + 1}: ${v.san || ""}`
    });
    return;
  }

  const name = nameRaw || `My rep (${moves.length} moves)`;

  const nextLine = {
    id: makeCustomId(),
    openingKey: openingKey,
    category: "My Reps",
    name: name,
    description: "",
    moves: moves,
    explanations: moves.map(() => "")
  };

  const existing = (this.state.customLines || []).slice();
  const next = existing.concat([nextLine]);
  saveCustomLines(next);

  this.setState(
    {
      customLines: next,
      customModalOpen: false,
      customError: "",
      linePicker: nextLine.id,
      lineId: nextLine.id,
      lineMenuOpen: false
    },
    () => this.resetLine(false)
  );
};


  getLines = () => {
    const set = this.getOpeningSet();
    const builtIn = (set && set.lines) || [];

    const openingKey = this.state.openingKey;
    const customAll = this.state.customLines || [];
    const customForOpening = customAll.filter((l) => l && l.openingKey === openingKey);

    return builtIn.concat(customForOpening);
  };

  getPlayerColor = () => {
    const set = this.getOpeningSet();
    return (set && set.playerColor) || "w";
  };

  getLine = () => {
    const lines = this.getLines();
    return lines.find((l) => l.id === this.state.lineId) || lines[0];
  };

  getHintFromSquare = (expectedSan) => {
    if (!expectedSan) return null;

    try {
      const fen = this.state.fen;
      const g = !fen || fen === "start" ? new Chess() : new Chess(fen);
      const mv = g.move(expectedSan, { sloppy: true });
      if (!mv) return null;
      return mv.from || null;
    } catch (_) {
      return null;
    }
  };

  onHint = () => {
    if (this.state.completed) return;
    if (this.state.gameMode === "drill") return;

    const line = this.getLine();
    if (!line) return;

    const expected = line.moves[this.state.stepIndex];
    if (!expected) return;

    const mode = this.state.gameMode || "learn";
    if (mode === "drill") return;

    const playerColor = this.getPlayerColor();
    if (this.game.turn() !== playerColor) return;

    const fromSq = this.getHintFromSquare(expected);

    this.setState({
      showHint: true,
      solveArmed: true,
      hintFromSquare: fromSq,
      helpUsed: true
    });
  };

  playMoveForMe = () => {
    if (this.state.completed) return;

    const line = this.getLine();
    if (!line) return;

    const playerColor = this.getPlayerColor();
    if (this.game.turn() !== playerColor) return;

    const expected = line.moves[this.state.stepIndex];
    if (!expected) return;

    const mode = this.state.gameMode || "learn";
    if (mode === "drill") return;

    if (this.state.viewing) this.viewLive();

    const mv = this.game.move(expected, { sloppy: true });
    if (!mv) return;

    const flags = typeof mv.flags === "string" ? mv.flags : "";
    const isCapture = flags.includes("c") || flags.includes("e");
    this.playSfx(isCapture ? "capture" : "moveSelf");

    const nextStep = this.state.stepIndex + 1;

    this.setState(
      {
        fen: this.game.fen(),
        stepIndex: nextStep,
        viewing: false,
        viewIndex: nextStep,
        viewFen: this.game.fen(),
        lastMistake: null,
        wrongAttempt: null,
        showHint: false,
        solveArmed: false,
        hintFromSquare: null,
        // Solve breaks clean completion
        helpUsed: true,
        lastMove: { from: mv.from, to: mv.to }
      },
      () => {
        this.playAutoMovesIfNeeded();
      }
    );
  };

  toggleSettingsOpen = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    this.setState({ settingsOpen: !this.state.settingsOpen });
  };

  toggleLineMenuOpen = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    this.setState({ lineMenuOpen: !this.state.lineMenuOpen });
  };


  setSetting = (key, value) => {
    const next = { ...(this.state.settings || {}) };
    next[key] = value;
    saveSettings(next);
    this.setState({ settings: next });
  };

  _sfxLastAt = {};

  playSfx = (key) => {
    if (!this.state.settings || !this.state.settings.playSounds) return;

    const a = this.sfx && this.sfx[key];
    if (!a) return;

    const now = Date.now();
    const last = this._sfxLastAt[key] || 0;

    if (now - last < 80) return;
    this._sfxLastAt[key] = now;

    try {
      if (!a.paused) a.pause();
      a.currentTime = 0;

      const p = a.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch (_) {
      // ignore
    }
  };

  showStreakToast = (text) => {
    if (this._streakToastTimer) clearTimeout(this._streakToastTimer);

    this.setState({ streakToastOpen: true, streakToastText: text });

    this._streakToastTimer = setTimeout(() => {
      this.setState({ streakToastOpen: false, streakToastText: "" });
    }, 2200);
  };


  openMemberGate = (mode) => {
    // Unified UX: even if buttons look disabled, explain why.
    const m = String(mode || "");
    this.setState({ memberGateOpen: true, memberGateMode: m });
  };

  closeMemberGate = () => {
    this.setState({ memberGateOpen: false, memberGateMode: "" });
  };

  goToUpgrade = () => {
    const pathname = this.props && this.props.location ? this.props.location.pathname : "/openings";
    const search = this.props && this.props.location ? this.props.location.search : "";
    const from = `${pathname}${search}`;

    // Prefer router state when available, fall back to hash.
    if (this.props && this.props.history && this.props.history.push) {
      this.props.history.push({
        pathname: "/about",
        state: { from, reason: "membership_required" }
      });
      return;
    }

    try {
      window.location.href = "#/about";
    } catch (_) {}
  };


  goHome = () => {
    // Close any open mobile menus before navigating.
    if (this.state && (this.state.mobileHeaderMenu || this.state.lineMenuOpen || this.state.settingsOpen)) {
      this.setState({ mobileHeaderMenu: null, lineMenuOpen: false, settingsOpen: false });
    }

    // Prefer router navigation if available.
    if (this.props && typeof this.props.navigate === "function") {
      this.props.navigate("/");
      return;
    }
    if (this.props && this.props.history && typeof this.props.history.push === "function") {
      this.props.history.push("/");
      return;
    }

    // HashRouter fallback (GitHub Pages).
    try {
      window.location.hash = "/";
      return;
    } catch (_) {}

    // Last resort.
    try {
      window.location.href = "#/";
    } catch (_) {}
  };


  closeMobileHeaderMenu = () => {
    if (!this.state.mobileHeaderMenu) return;
    this.setState({ mobileHeaderMenu: null });
  };

  toggleMobileHeaderMenu = (which) => {
    const next = this.state.mobileHeaderMenu === which ? null : which;
    this.setState({
      mobileHeaderMenu: next,
      lineMenuOpen: false,
      settingsOpen: false
    });
  };

  getFenAtIndex = (index) => {
    const line = this.getLine();
    if (!line) return "start";

    const g = new Chess();
    const n = Math.max(0, Math.min(index || 0, line.moves.length));

    for (let i = 0; i < n; i += 1) {
      const mv = g.move(line.moves[i]);
      if (!mv) break;
    }

    return g.fen();
  };

  getViewIndex = () => {
    return this.state.viewing ? this.state.viewIndex : this.state.stepIndex;
  };

  goToViewIndex = (nextIndex) => {
    const line = this.getLine();
    if (!line) return;

    const clamped = Math.max(0, Math.min(nextIndex, this.state.stepIndex));

    if (clamped === this.state.stepIndex) {
      this.setState({
        viewing: false,
        viewIndex: clamped,
        viewFen: this.state.fen
      });
      return;
    }

    this.setState({
      viewing: true,
      viewIndex: clamped,
      viewFen: this.getFenAtIndex(clamped),
      showHint: false
    });
  };

  viewBack = () => {
    const i = this.getViewIndex();
    if (i <= 0) return;
    this.goToViewIndex(i - 1);
  };

  viewForward = () => {
    const i = this.getViewIndex();
    if (i >= this.state.stepIndex) return;
    this.goToViewIndex(i + 1);
  };

  viewLive = () => {
    this.goToViewIndex(this.state.stepIndex);
  };

  undoMistake = () => {
    if (!this.state.lastMistake && !this.state.wrongAttempt) return;
    this.setState({
      fen: this.game.fen(),
      wrongAttempt: null,
      lastMistake: null,
      completed: false,
      showHint: false
    });
  };

  resetLine = (keepUnlocked) => {
    this.game.reset();
    this.setState(
      {
        fen: "start",
        stepIndex: 0,
      viewing: false,
      viewIndex: 0,
      viewFen: "start",
        completed: false,
        mistakeUnlocked: keepUnlocked ? this.state.mistakeUnlocked : false,
        lastMistake: null,
        wrongAttempt: null,
        showHint: false,
        lastMove: null,
        selectedSquare: null,
        legalTargets: [],
        userHasPlayedThisLine: false,
        modePanelVisible: true,
        helpUsed: false,
        learnRewardPending: false,
        learnNextReady: false
      },
      () => {
        this._countedSeenForRun = false;
        this.bumpSeenForMode();
        this.playAutoMovesIfNeeded();
      }
    );
  };

  startRandomLine = () => {
    const lines = this.getLines();
    const nextId = pickRandomLineId(lines, this.state.lineId);
    if (!nextId) return;
    this.setState(
      {
        lineId: nextId,
        sessionLineId: nextId,
        practiceForceRepeat: false,
        linePicker: "random",
        mistakeUnlocked: false,
        lastMistake: null,
        completed: false,
        wrongAttempt: null,
        showHint: false,
        lastMove: null,
        userHasPlayedThisLine: false,
        modePanelVisible: true,
        helpUsed: false,
        drillRunDead: false
      },
      () => {
        const mode = this.state.gameMode || "learn";
        if (mode === "practice" && this.state.linePicker === "random") {
          this.startPracticeLine({ reason: "next" });
          return;
        }
        if (mode === "learn" && this.state.linePicker === "random") {
          this.startLearnLine({ reason: "next" });
          return;
        }
        this.resetLine(false);
      }
    );
  };



nextLine = () => {
  const mode = this.state.gameMode || "learn";

  // Practice: Next always advances to the next practice-picked line
  if (mode === "practice") {
    this.startPracticeLine({ reason: "next_button" });
    return;
  }

  // Learn: only use the learn picker when Random is selected
  if (this.state.linePicker === "random" && mode === "learn") {
    this.startLearnLine({ reason: "next_button" });
    return;
  }

  // Drill and fixed-line selections fall back to random selection
  this.startRandomLine();
};



  startPracticeLine = (opts) => {
    const _reason = opts && opts.reason ? String(opts.reason) : "";
    if (_reason) {
      // reserved for future analytics hooks
    }
    const openingKey = this.state.openingKey;
    const lineIdsRaw = getOrderedLineIds(openingKey);
    const lineIds = (lineIdsRaw && lineIdsRaw.length) ? lineIdsRaw : this.getLines().map((l) => l.id);
    const shouldExcludeRecent = (_reason === "clean_complete" || _reason === "next_button")
      && !this.state.practiceForceRepeat;

    const excludeLineIds = shouldExcludeRecent
      ? [this.state.lineId, this.state.prevPracticeLineId].filter(Boolean).map(String)
      : [];

    const nextId = pickNextPracticeLineId({
      openingKey,
      lineIds,
      progress: this.state.progress,
      getLineStats,
      lastLineId: this.state.lineId,
      forceRepeatLineId: this.state.practiceForceRepeat ? this.state.lineId : null,
      excludeLineIds
    });

    const safeNextId = nextId || (lineIds && lineIds.length ? lineIds[0] : null);
    if (!safeNextId) return;

    this.setState(
      {
        lineId: safeNextId,
        sessionLineId: safeNextId,
        linePicker: "random",
        practiceForceRepeat: false,
        prevPracticeLineId: this.state.lineId,
        mistakeUnlocked: false,
        lastMistake: null,
        completed: false,
        wrongAttempt: null,
        showHint: false,
        lastMove: null,
        userHasPlayedThisLine: false,
        modePanelVisible: true,
        helpUsed: false,
        learnRewardPending: false,
        learnNextReady: false,
        drillRunDead: false
      },
      () => {
        this.resetLine(false);
      }
    );
  };

  startLearnLine = (opts) => {
    const _reason = opts && opts.reason ? String(opts.reason) : "";
    if (_reason) {
      // reserved for future analytics hooks
    }

    const openingKey = this.state.openingKey;
    const lineIdsRaw = getOrderedLineIds(openingKey);
    const lineIds = (lineIdsRaw && lineIdsRaw.length) ? lineIdsRaw : this.getLines().map((l) => l.id);
    const shouldExcludeRecent = (_reason === "clean_complete" || _reason === "next_button")
      && !this.state.learnForceRepeat;

    const recent = Array.isArray(this.state.learnRecentLineIds) ? this.state.learnRecentLineIds : [];
    const excludeLineIds = shouldExcludeRecent
      ? [this.state.lineId, this.state.prevLearnLineId].concat(recent).filter(Boolean).map(String).slice(0, 6)
      : [];

    let nextId = _pickNextLearnFromBag({
      openingKey,
      lineIds,
      excludeLineIds,
      lastLineId: this.state.lineId,
      forceRepeatLineId: this.state.learnForceRepeat ? this.state.lineId : null
    });

    // Safety: if bag selection fails for any reason, fall back to weighted picker
    if (!nextId) {
      nextId = pickNextLearnLineId({
        openingKey,
        lineIds,
        learnProgress: this.state.learnProgress,
        getLearnLineStats: getLearnLineStats,
        lastLineId: this.state.lineId,
        forceRepeatLineId: this.state.learnForceRepeat ? this.state.lineId : null,
        excludeLineIds
      });
    }

    const safeNextId = nextId || (lineIds && lineIds.length ? lineIds[0] : null);
    if (!safeNextId) return;

    this.setState(
      {
        lineId: safeNextId,
        sessionLineId: safeNextId,
        linePicker: "random",
        learnForceRepeat: false,
        prevLearnLineId: this.state.lineId,
        learnRecentLineIds: [this.state.lineId].concat(recent).filter(Boolean).map(String).slice(0, 6),
        mistakeUnlocked: false,
        lastMistake: null,
        completed: false,
        wrongAttempt: null,
        showHint: false,
        lastMove: null,
        userHasPlayedThisLine: false,
        modePanelVisible: true,
        helpUsed: false,
        learnRewardPending: false,
        learnNextReady: false,
        drillRunDead: false
      },
      () => {
        this.resetLine(false);
      }
    );
  };
  startLine = () => {
    this.resetLine(true);
  };

  retryLine = () => {
    this.resetLine(true);
  };

  setOpeningKey = (e) => {
    const nextKey = e && e.target ? e.target.value : "london";
    if (this.maybeRedirectForLockedOpening(nextKey)) return;
    const nextSet = OPENING_SETS[nextKey] || OPENING_SETS.london;
    const nextLines = nextSet.lines || [];
    
const orderedIdsRaw = getOrderedLineIds(nextKey);
const orderedIds = (orderedIdsRaw && orderedIdsRaw.length) ? orderedIdsRaw : nextLines.map((l) => l.id);

let nextId = "";

if (this.state.linePicker === "random" && this.state.gameMode === "practice") {
  nextId = pickNextPracticeLineId({
    openingKey: nextKey,
    lineIds: orderedIds,
    progress: this.state.progress,
    getLineStats,
    lastLineId: null,
    forceRepeatLineId: null
  }) || "";
} else if (this.state.linePicker === "random" && this.state.gameMode === "learn") {
  nextId = _pickNextLearnFromBag({
    openingKey: nextKey,
    lineIds: orderedIds,
    excludeLineIds: [],
    lastLineId: null,
    forceRepeatLineId: null
  }) || "";
} else {
  nextId = pickRandomLineId(nextLines, null) || "";
}

if (!nextId) nextId = nextLines[0] ? nextLines[0].id : "";

    this.setState(
      {
        openingKey: nextKey,
        lineId: nextId,
        linePicker: "random",
        prevPracticeLineId: null,
        prevLearnLineId: null,
        learnRecentLineIds: [],
        mistakeUnlocked: false,
        lastMistake: null,
        completed: false,
        wrongAttempt: null,
        showHint: false,
        lastMove: null,
        userHasPlayedThisLine: false,
        modePanelVisible: true,
        helpUsed: false,
        drillRunDead: false
      },
      () => {
        this.resetLine(false);
      }
    );
  };

  setLinePicker = (e) => {
    const val = e && e.target ? e.target.value : "random";
    if (!val) return;
    if (val === "__divider__") return;

    if (val === "random") {
      this.setState({ linePicker: "random", practiceForceRepeat: false }, () => {
        const mode = this.state.gameMode || "learn";
        if (mode === "practice") {
          this.startPracticeLine({ reason: "picker_random" });
          return;
        }
        if (mode === "learn") {
          this.startLearnLine({ reason: "picker_random" });
          return;
        }
        this.startRandomLine();
      });
      return;
    }

    this.setState(
      {
        linePicker: val,
        lineId: val,
        sessionLineId: val,
        practiceForceRepeat: false,
        prevPracticeLineId: this.state.lineId,
        prevLearnLineId: this.state.lineId,
        learnRecentLineIds: [],
        mistakeUnlocked: false,
        lastMistake: null,
        completed: false,
        wrongAttempt: null,
        showHint: false,
        lastMove: null,
        userHasPlayedThisLine: false,
        modePanelVisible: true,
        helpUsed: false,
        drillRunDead: false
      },
      () => {
        this.resetLine(false);
      }
    );
  };

  bumpSeen = () => {
    if (this._countedSeenForRun) return;
    const openingKey = this.state.openingKey;
    const lineId = this.state.lineId;
    if (!openingKey || !lineId) return;

    const progress = { ...this.state.progress };
    ensureOpening(progress, openingKey);
    progress.openings[openingKey].lastPlayedAt = Date.now();
    const s = getLineStats(progress, openingKey, lineId);
    s.timesSeen += 1;
    s.lastSeenAt = Date.now();

    saveProgress(progress);
    this._countedSeenForRun = true;
    this.setState({ progress });
  };

  bumpMistake = () => {
    const openingKey = this.state.openingKey;
    const lineId = this.state.lineId;
    if (!openingKey || !lineId) return;

    const progress = { ...this.state.progress };
    const s = getLineStats(progress, openingKey, lineId);
    s.lastResult = "fail";
    s.timesFailed = (Number(s.timesFailed) || 0) + 1;
    s.lastFailedAt = Date.now();
    saveProgress(progress);

    const patch = { progress };
    if ((this.state.gameMode || "learn") === "practice") {
      patch.practiceForceRepeat = true;
    }

    this.setState(patch);
  };

  bumpCompleted = (wasClean) => {
    const openingKey = this.state.openingKey;
    const lineId = this.state.lineId;
    if (!openingKey || !lineId) return;

    const progress = { ...this.state.progress };
    ensureOpening(progress, openingKey);
    const o = progress.openings[openingKey];
    const s = getLineStats(progress, openingKey, lineId);

    s.timesCompleted += 1;
    s.lastResult = wasClean ? "success" : "fail";
    s.lastSeenAt = Date.now();

    o.totalCompleted = (o.totalCompleted || 0) + 1;
    o.completedToday = (o.completedToday || 0) + 1;

    if (wasClean) {
      s.timesClean += 1;
      o.totalClean = (o.totalClean || 0) + 1;
      o.streak = (o.streak || 0) + 1;
      o.bestStreak = Math.max(o.bestStreak || 0, o.streak);
    } else {
      o.streak = 0;
      s.timesFailed = (Number(s.timesFailed) || 0) + 1;
      s.lastFailedAt = Date.now();
    }

    saveProgress(progress);
    this.setState({ progress });
  };

  bumpLearnSeen = () => {
    if (this._countedSeenForRun) return;
    const openingKey = this.state.openingKey;
    const lineId = this.state.lineId;
    if (!openingKey || !lineId) return;

    const learnProgress = { ...this.state.learnProgress };
    ensureLearnOpening(learnProgress, openingKey);
    learnProgress.openings[openingKey].lastPlayedAt = Date.now();

    const s = getLearnLineStats(learnProgress, openingKey, lineId);
    s.timesSeen += 1;
    s.lastSeenAt = Date.now();

    saveLearnProgress(learnProgress);
    this._countedSeenForRun = true;
    this.setState({ learnProgress });
  };

  bumpLearnMistake = () => {
    const openingKey = this.state.openingKey;
    const lineId = this.state.lineId;
    if (!openingKey || !lineId) return;

    const learnProgress = { ...this.state.learnProgress };
    const s = getLearnLineStats(learnProgress, openingKey, lineId);
    s.lastResult = "fail";
    s.timesFailed = (Number(s.timesFailed) || 0) + 1;
    s.lastFailedAt = Date.now();

    saveLearnProgress(learnProgress);
    this.setState({ learnProgress, learnForceRepeat: true });
  };

  bumpLearnCompleted = (wasClean) => {
    const openingKey = this.state.openingKey;
    const lineId = this.state.lineId;
    if (!openingKey || !lineId) return;

    const learnProgress = { ...this.state.learnProgress };
    ensureLearnOpening(learnProgress, openingKey);
    const s = getLearnLineStats(learnProgress, openingKey, lineId);

    s.timesCompleted += 1;
    s.lastResult = wasClean ? "success" : "fail";
    s.lastSeenAt = Date.now();

    if (wasClean) {
      s.timesClean += 1;
    }

    saveLearnProgress(learnProgress);
    this.setState({ learnProgress });
  };

  bumpSeenForMode = () => {
    const mode = this.state.gameMode || "learn";
    if (mode === "drill") return;
    if (mode === "learn") {
      this.bumpLearnSeen();
    } else {
      this.bumpSeen();
    }
  };

  bumpMistakeForMode = () => {
    const mode = this.state.gameMode || "learn";
    if (mode === "drill") return;
    if (mode === "learn") {
      this.bumpLearnMistake();
    } else {
      this.bumpMistake();
    }
  };

  bumpCompletedForMode = (wasClean) => {
    const mode = this.state.gameMode || "learn";
    if (mode === "drill") return;
    if (mode === "learn") {
      this.bumpLearnCompleted(wasClean);
    } else {
      this.bumpCompleted(wasClean);
    }
  };



  playAutoMovesIfNeeded = () => {
    const line = this.getLine();
    if (!line) return;

    let stepIndex = this.state.stepIndex;
    const playerColor = this.getPlayerColor();

    let didAutoMove = false;
    let lastAutoMove = null;

    while (stepIndex < line.moves.length && this.game.turn() !== playerColor) {
      const expected = line.moves[stepIndex];
      const mv = this.game.move(expected);
      if (!mv) {
        this.setState({ fen: this.game.fen() });
        return;
      }
      lastAutoMove = mv;
      stepIndex += 1;
      didAutoMove = true;
    }

    const completed = stepIndex >= line.moves.length;

    this.setState(
      {
        fen: this.game.fen(),
        stepIndex: stepIndex,
        completed: completed,
        lastMove: lastAutoMove ? { from: lastAutoMove.from, to: lastAutoMove.to } : this.state.lastMove
      },
      () => {
        if (didAutoMove) this.playSfx("moveOpponent");
        if (completed) this.onCompletedLine();
      }
    );
  };

onCompletedLine = () => {
  if (this._autoNextTimer) clearTimeout(this._autoNextTimer);
  if (this._confettiTimer) clearTimeout(this._confettiTimer);

  const streakResult = markLineCompletedTodayDetailed();
  if (streakResult && streakResult.didMarkToday && streakResult.state) {
    const s = streakResult.state;
    this.showStreakToast(`🔥 ${s.current}`);
  }

  // Mark daily activity for every completed line (heatmap counts lines per day)
  try { markActivityToday(); } catch (_) {}

  const mode = this.state.gameMode || "learn";

  const wasClean = !this.state.mistakeUnlocked && !this.state.helpUsed;

  this.bumpCompletedForMode(wasClean);

  const hasPaidAccess = !!(this.props.user && this.props.membershipActive === true);

  if (!hasPaidAccess && mode === "learn") {
    const nextCount = incFreeDrillsCount(this.state.openingKey);
    if (nextCount >= 3) {
      try {
        if (this.props && this.props.history && this.props.history.replace) {
          const pathname = this.props && this.props.location ? this.props.location.pathname : "/openings";
          const search = this.props && this.props.location ? this.props.location.search : "";
          const from = `${pathname}${search}`;

          this.props.history.replace({
            pathname: "/about",
            state: { from, reason: "trial_required" }
          });
        }
      } catch (_) {}
    }
  }

  if (mode === "practice" && !wasClean) {
    // Practice still advances, but unclean completions will be prioritized again soon.
    this.setState({ modePanelVisible: true });
  }

  if (mode === "learn" && !wasClean) {
    // Learn repeats until clean completion.
    this.setState({ learnForceRepeat: true, modePanelVisible: true });

    if (this._autoNextTimer) clearTimeout(this._autoNextTimer);
    this._autoNextTimer = setTimeout(() => {
      this.resetLine(false);
      this.playAutoMovesIfNeeded();
    }, 700);

    return;
  }

  if (mode === "drill") {
    const nextStreak = this.state.drillRunDead ? 0 : (Number(this.state.drillStreak) || 0) + 1;
    const nextBest = Math.max(Number(this.state.drillBestAllTime) || 0, nextStreak);

    const statsNow = this.loadDrillStats();
    const todayKey = this.getTodayKey();
    const weekKey = this.getIsoWeekKey();
    const monthKey = this.getMonthKey();

    let bestDay = Number(statsNow.bestDay) || 0;
    let bestWeek = Number(statsNow.bestWeek) || 0;
    let bestMonth = Number(statsNow.bestMonth) || 0;

    if (statsNow.dayKey !== todayKey) bestDay = 0;
    if (statsNow.weekKey !== weekKey) bestWeek = 0;
    if (statsNow.monthKey !== monthKey) bestMonth = 0;

    bestDay = Math.max(bestDay, nextStreak);
    bestWeek = Math.max(bestWeek, nextStreak);
    bestMonth = Math.max(bestMonth, nextStreak);

    const nextStats = {
      bestAllTime: Math.max(Number(statsNow.bestAllTime) || 0, nextStreak),
      dayKey: todayKey,
      bestDay,
      weekKey,
      bestWeek,
      monthKey,
      bestMonth
    };

    this.saveDrillStats(nextStats);
    this.maybeWriteDrillStatsToFirestore(nextStats);

    this.setState({
      drillStreak: nextStreak,
      drillBestAllTime: nextBest,
      drillRunDead: false,
      modePanelVisible: true
    });
  } else {
    this.setState({ modePanelVisible: true });
  }

  // Confetti + Learn reward gating for Next
  const wantsConfetti = !!(this.state.settings && this.state.settings.showConfetti);

  // Next is a Learn only reward, reset it on every completion
  if (mode === "learn") {
    this.setState({ learnNextReady: false, learnRewardPending: wasClean });
  }

  if (wantsConfetti) {
    this.setState({ confettiActive: true });

    this._confettiTimer = setTimeout(() => {
      this.setState((prev) => {
        const next = { confettiActive: false };

        // If Learn just completed cleanly, unlock Next after confetti ends
        if (prev.gameMode === "learn" && prev.learnRewardPending) {
          next.learnNextReady = true;
          next.learnRewardPending = false;
        }

        return next;
      });
    }, 1200);
  } else {
    this.setState((prev) => {
      const next = { confettiActive: false };

      // If confetti is disabled, unlock Next immediately on clean Learn completion
      if (mode === "learn" && wasClean) {
        next.learnNextReady = true;
        next.learnRewardPending = false;
      }

      return next;
    });
  }

  if (mode === "practice") {
    this._autoNextTimer = setTimeout(() => {
      this.startPracticeLine({ reason: "clean_complete" });
    }, 900);
    return;
  }

  if (mode === "drill") {
    this._autoNextTimer = setTimeout(() => {
      this.startRandomLine();
    }, 900);
  }
};

  onDrop = ({ sourceSquare, targetSquare }) => {
    if (this.state.completed) return;

    const line = this.getLine();
    if (!line) return;

    const playerColor = this.getPlayerColor();
    if (this.game.turn() !== playerColor) return;

    const expected = line.moves[this.state.stepIndex];
    if (!expected) return;

    const mode = this.state.gameMode || "learn";

    const move = this.game.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: "q"
    });

    if (!move) return;

    // Any legal move counts as activity (throttled to avoid spam)
    try { touchActivityToday(); } catch (_) {}

    const playedSAN = move.san;

    if (playedSAN !== expected) {
      this.playSfx("illegal");

      this.bumpMistakeForMode();
      this.game.undo();

      if (mode === "drill") {
        this.setState({
          fen: this.game.fen(),
          completed: false,
          showHint: false,
          solveArmed: false,
          hintFromSquare: null,
          lastMistake: {
            expected: expected,
            played: playedSAN,
            explanation: ""
          },
          wrongAttempt: {
            from: sourceSquare,
            to: targetSquare
          },
          selectedSquare: null,
          legalTargets: [],
          userHasPlayedThisLine: true,
          modePanelVisible: false,
          drillStreak: 0,
          drillRunDead: true
        });

        return;
      }

      const explanation = line.explanations[this.state.stepIndex] || "";

      this.setState({
        fen: this.game.fen(),
        completed: false,
        mistakeUnlocked: true,
        showHint: false,
        solveArmed: false,
        hintFromSquare: null,
        lastMistake: {
          expected: expected,
          played: playedSAN,
          explanation: explanation
        },
        wrongAttempt: {
          from: sourceSquare,
          to: targetSquare
        },
        selectedSquare: null,
        legalTargets: [],
        userHasPlayedThisLine: true,
        modePanelVisible: false
      });

      return;
    }

    const flags = typeof move.flags === "string" ? move.flags : "";
    const isCapture = flags.includes("c") || flags.includes("e");
    this.playSfx(isCapture ? "capture" : "moveSelf");

    const nextStep = this.state.stepIndex + 1;

    this.setState(
      {
        fen: this.game.fen(),
        stepIndex: nextStep,
        lastMistake: null,
        wrongAttempt: null,
        showHint: false,
        solveArmed: false,
        hintFromSquare: null,
        selectedSquare: null,
        legalTargets: [],
        lastMove: { from: sourceSquare, to: targetSquare },
        userHasPlayedThisLine: true,
        modePanelVisible: false
      },
      () => {
        this.playAutoMovesIfNeeded();
      }
    );
  };

  allowDrag = ({ piece }) => {
    if (this.state.completed) return false;
    if (this.state.wrongAttempt) return false;
    if (this.state.viewing) return false;

    const playerColor = this.getPlayerColor();
    if (this.game.turn() !== playerColor) return false;

    return piece && piece.charAt(0) === playerColor;
  };

  clearSelection = () => {
    if (this.state.selectedSquare || (this.state.legalTargets && this.state.legalTargets.length)) {
      this.setState({ selectedSquare: null, legalTargets: [] });
    }
  };

  getLegalTargets = (fromSquare) => {
    if (!fromSquare) return [];
    try {
      const moves = this.game.moves({ square: fromSquare, verbose: true });
      if (!moves || !moves.length) return [];
      return moves.map((m) => m.to);
    } catch (_) {
      return [];
    }
  };

  onSquareClick = (square) => {
    if (this.state.completed) return;
    if (this.state.wrongAttempt) return;
    if (this.state.viewing) return;

    const line = this.getLine();
    if (!line) return;

    const playerColor = this.getPlayerColor();
    if (this.game.turn() !== playerColor) return;

    const piece = this.game.get(square);

    if (!this.state.selectedSquare) {
      if (!piece || piece.color !== playerColor) return;

      const targets = this.getLegalTargets(square);
      this.setState({ selectedSquare: square, legalTargets: targets });
      return;
    }

    if (square === this.state.selectedSquare) {
      this.clearSelection();
      return;
    }

    if (piece && piece.color === playerColor) {
      const targets = this.getLegalTargets(square);
      this.setState({ selectedSquare: square, legalTargets: targets });
      return;
    }

    const from = this.state.selectedSquare;
    const to = square;

    this.setState({ selectedSquare: null, legalTargets: [] }, () => {
      this.onDrop({ sourceSquare: from, targetSquare: to });
    });
  };

  onSquareRightClick = () => {
    this.clearSelection();
  };

  stripMovePrefix = (text) => {
  if (!text) return "";
  const s = String(text).trim();

  const idx = s.indexOf(":");
  if (idx > 0 && idx <= 8) {
    const head = s.slice(0, idx).trim();
    const isSAN =
      head === "O-O" ||
      head === "O-O-O" ||
      /^[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](=[QRBN])?[+#]?$/.test(head) ||
      /^[a-h][1-8](=[QRBN])?[+#]?$/.test(head);

    if (isSAN) return s.slice(idx + 1).trim();
  }

  return s;
};

sanitizeExplanation = (text, expectedSan) => {
  let s = this.stripMovePrefix(text);
  if (!s) return "";

  if (expectedSan) {
    const esc = String(expectedSan).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const reSan = new RegExp("\\b" + esc + "\\b", "g");
    s = s.replace(reSan, "this move");
  }

  return s;
};


renderCoachBubble = (line) => {
  if (!line) return null;

  const mode = this.state.gameMode || "learn";
  const unlocked =
    mode === "learn"
      ? true
      : mode === "practice"
      ? !!this.state.mistakeUnlocked || !!this.state.helpUsed
      : false;

  const coachIndex = this.getViewIndex();
  const raw = unlocked
    ? line.explanations[coachIndex] || ""
    : mode === "drill"
    ? "No help in Drill Mode"
    : "What's the best move?";

  const text = unlocked ? this.stripMovePrefix(raw) : raw;

  return (
    <div className="ot-bubble">
      <div className="ot-bubble-row">
        <div className="ot-buddy" title="Your drill buddy">♞</div>
        <div className="ot-coach-text">{text}</div>
      </div>
    </div>
  );
};

renderCoachArea = (line, doneYourMoves, totalYourMoves, expectedSan) => {
  if (!line) return null;

  const canUndo = !!(this.state.lastMistake || this.state.wrongAttempt);

  const mode = this.state.gameMode || "learn";

  const unlocked = mode === "learn" ? true : mode === "practice" ? (!!this.state.mistakeUnlocked || !!this.state.helpUsed) : false;

  const coachIndex = this.getViewIndex();
  const raw = unlocked ? (line.explanations[coachIndex] || "") : mode === "drill" ? "No help in Drill Mode" : "What's the best move?";
  const text = unlocked ? this.stripMovePrefix(raw) : raw;

  return (
    <div className="ot-coach" style={{ position: "relative" }}>
      <div className="ot-coach-head">
        <div className="ot-coach-left">
          <div className="ot-coach-title">
            <button className="ot-mode-pill ot-pill-btn" onClick={() => this.toggleMobileHeaderMenu("mode")} title="Mode" aria-label="Mode">
              {mode === "learn" ? (
                <>
                  <span role="img" aria-label="learn">📘</span> Learn
                </>
              ) : mode === "practice" ? (
                <>
                  <span role="img" aria-label="practice">🎯</span> Practice
                </>
              ) : (
                <>
                  <span role="img" aria-label="drill">🔥</span> Drill
                </>
              )}
            </button>
            <button className="ot-open-pill ot-pill-btn" onClick={() => this.toggleMobileHeaderMenu("opening")} title="Opening" aria-label="Opening">{(() => { const s = OPENING_SETS[this.state.openingKey]; return (s && (s.name || s.title || s.label)) || this.state.openingKey; })()} ▾</button>
            <button className="ot-line-pill ot-pill-btn" onClick={() => this.toggleMobileHeaderMenu("line")} title="Line" aria-label="Line">{line.name} ▾</button>
          </div>
        </div>

        <div className="ot-card-head-right">
          <span className="ot-mini-count">
            {doneYourMoves}/{totalYourMoves}
          </span>
          {mode === "drill" ? (
            <div className="ot-drill-stats">
              <div className="ot-drill-stat">
                <div className="ot-drill-label">Score</div>
                <div className="ot-drill-value">{Number(this.state.drillStreak) || 0}</div>
              </div>
              <div className="ot-drill-stat">
                <div className="ot-drill-label">High</div>
                <div className="ot-drill-value">{Number(this.state.drillBestAllTime) || 0}</div>
              </div>
            </div>
          ) : null}
          {canUndo ? (
            <button className="ot-mini-btn" onClick={this.undoMistake} title="Undo mistake">
              Undo
            </button>
          ) : null}
        
      {!this.state.isMobile && this.state.mobileHeaderMenu ? (
        <div
          className="ot-desktop-pill-menu"
          ref={(el) => (this._desktopMenuEl = el)}
          onClick={(e) => e.stopPropagation()}
          style={{ position: "absolute", top: 44, right: 12, width: 280, maxHeight: 360, overflowY: "auto", padding: 10, borderRadius: 14, background: "rgba(10, 10, 12, 0.96)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 16px 40px rgba(0,0,0,0.45)", zIndex: 9999 }}
        >
          {this.state.mobileHeaderMenu === "mode" ? (
            <>
              <div className="ot-mobile-menu-title">Mode</div>
              <div className="ot-mode-list">
                <button className="ot-mode-item" onClick={() => { this.setGameMode("learn"); this.closeMobileHeaderMenu(); }}>
                  <span><span role="img" aria-label="learn">📘</span> Learn</span>
                  <span />
                </button>

                <button
                  className={"ot-mode-item" + (!this.props.user || !this.props.isMember ? " locked" : "")}
                  onClick={() => { this.setGameMode("practice"); this.closeMobileHeaderMenu(); }}
                >
                  <span><span role="img" aria-label="practice">🎯</span> Practice</span>
                  <span>{!this.props.user || !this.props.isMember ? "Member" : ""}</span>
                </button>

                <button
                  className={"ot-mode-item" + (!this.props.user || !this.props.isMember ? " locked" : "")}
                  onClick={() => { this.setGameMode("drill"); this.closeMobileHeaderMenu(); }}
                >
                  <span><span role="img" aria-label="drill">🔥</span> Drill</span>
                  <span>{!this.props.user || !this.props.isMember ? "Member" : ""}</span>
                </button>
              </div>
            </>
          ) : this.state.mobileHeaderMenu === "opening" ? (
            <>
              <div className="ot-mobile-menu-title">Opening</div>
              <select
                className="ot-select"
                value={this.state.openingKey}
                onChange={(e) => {
                  this.setOpeningKey(e);
                  this.closeMobileHeaderMenu();
                }}
              >
                {Object.keys(OPENING_SETS).map((k) => {
                  const s = OPENING_SETS[k];
                  const label = (s && (s.name || s.title || s.label)) || k;
                  return (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </>
          ) : (
            <>
              <div className="ot-mobile-menu-title">Line</div>
              <select
                className="ot-line-select ot-line-select-compact"
                value={this.state.linePicker}
                onChange={(e) => {
                  this.setLinePicker(e);
                  this.closeMobileHeaderMenu();
                }}
              >
                <option value="random">Random line</option>
                <option value="__divider__" disabled>
                  ─────────
                </option>

                {(() => {
                  const grouped = groupLines(this.getLines());
                  return grouped.cats.map((cat) => {
                    const arr = grouped.map[cat] || [];
                    return (
                      <optgroup key={cat} label={cat}>
                        {arr.map((l) => {
                          const s = getLineStats(this.state.progress, this.state.openingKey, l.id);
                          const symbol = isCompleted(s) ? "✓" : s.timesSeen > 0 ? "•" : "○";
                          return (
                            <option key={l.id} value={l.id}>
                              {symbol} {l.name}
                            </option>
                          );
                        })}
                      </optgroup>
                    );
                  });
                })()}
              </select>
            </>
          )}
        </div>
      ) : null}

</div>
      </div>

      <div className="ot-bubble">
        <div className="ot-bubble-row">
          <div className="ot-buddy" title="Your drill buddy">♞</div>
          <div className="ot-coach-text">{text}</div>
        </div>
      </div>
    </div>
  );
};
  setGameMode = (nextMode) => {
    const mode = nextMode || "learn";

    const hasPaidAccess = !!(this.props.user && this.props.membershipActive === true);

    // Practice and Drill are always premium (Stripe trial counts as premium).
    if ((mode === "practice" || mode === "drill") && !hasPaidAccess) {
      if (this.props && this.props.history && this.props.history.replace) {
        const pathname = this.props && this.props.location ? this.props.location.pathname : "/openings";
        const search = this.props && this.props.location ? this.props.location.search : "";
        const from = `${pathname}${search}`;

        this.props.history.replace({
          pathname: "/about",
          state: { from, reason: "membership_required" }
        });
      } else {
        this.openMemberGate(mode);
      }
      return;
    }

    // Free users (logged out or free account) get up to 3 completed Learn drills per opening.
    if (mode === "learn" && !hasPaidAccess) {
      const openingKey = this.state.openingKey;
      const used = getFreeDrillsCount(openingKey);

      if (used >= 3) {
        if (this.props && this.props.history && this.props.history.replace) {
          const pathname = this.props && this.props.location ? this.props.location.pathname : "/openings";
          const search = this.props && this.props.location ? this.props.location.search : "";
          const from = `${pathname}${search}`;

          this.props.history.replace({
            pathname: "/about",
            state: { from, reason: "trial_required" }
          });
        }
        return;
      }
    }

    if (mode === this.state.gameMode) return;

    this.setState(
      {
        gameMode: mode,
        modePanelVisible: true,
        userHasPlayedThisLine: false,
        helpUsed: false,
        learnRewardPending: false,
        learnNextReady: false,
        drillStreak: mode === "drill" ? 0 : this.state.drillStreak,
        drillRunDead: false,
        mistakeUnlocked: false,
        lastMistake: null,
        wrongAttempt: null,
        showHint: false,
        solveArmed: false,
        hintFromSquare: null,
        completed: false,
        lastMove: null,
        selectedSquare: null,
        legalTargets: []
      },
      () => {
        if (mode === "practice" && this.state.linePicker === "random") {
          this.startPracticeLine({ reason: "mode_enter" });
          return;
        }
        if (mode === "learn" && this.state.linePicker === "random") {
          this.startLearnLine({ reason: "mode_enter" });
          return;
        }
        this.resetLine(false);
      }
    );
  };// ---- Drill stats + keys (localStorage + optional Firestore) ----
  getTodayKey = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  getMonthKey = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  };

  getIsoWeekKey = () => {
    // ISO week date (yyyy-Www)
    const d = new Date();
    // Copy and force UTC to avoid DST weirdness
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    // Thursday in current week decides the year
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
    return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
  };

  loadDrillStats = () => {
    const key = "chessdrills.drill_stats.v1";
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) {
        return {
          bestAllTime: 0,
          dayKey: this.getTodayKey(),
          bestDay: 0,
          weekKey: this.getIsoWeekKey(),
          bestWeek: 0,
          monthKey: this.getMonthKey(),
          bestMonth: 0
        };
      }
      const obj = JSON.parse(raw);

      return {
        bestAllTime: Number(obj.bestAllTime) || 0,
        dayKey: String(obj.dayKey || this.getTodayKey()),
        bestDay: Number(obj.bestDay) || 0,
        weekKey: String(obj.weekKey || this.getIsoWeekKey()),
        bestWeek: Number(obj.bestWeek) || 0,
        monthKey: String(obj.monthKey || this.getMonthKey()),
        bestMonth: Number(obj.bestMonth) || 0
      };
    } catch (_) {
      return {
        bestAllTime: 0,
        dayKey: this.getTodayKey(),
        bestDay: 0,
        weekKey: this.getIsoWeekKey(),
        bestWeek: 0,
        monthKey: this.getMonthKey(),
        bestMonth: 0
      };
    }
  };

  saveDrillStats = (stats) => {
    const key = "chessdrills.drill_stats.v1";
    try {
      window.localStorage.setItem(key, JSON.stringify(stats || {}));
    } catch (_) {}
  };

  writeDrillStatsToFirestore = async (stats) => {
    // No anticheat. Just best streaks reported by client.
    const user = this.props && this.props.user;
    const uid = user && user.uid;
    if (!uid) return;

    try {
      const ref = doc(db, "users", uid);
      await setDoc(
        ref,
        {
          drillLeaderboard: {
            bestAllTime: Number(stats.bestAllTime) || 0,
            dayKey: String(stats.dayKey || ""),
            bestDay: Number(stats.bestDay) || 0,
            weekKey: String(stats.weekKey || ""),
            bestWeek: Number(stats.bestWeek) || 0,
            monthKey: String(stats.monthKey || ""),
            bestMonth: Number(stats.bestMonth) || 0,
            updatedAt: serverTimestamp()
          }
        },
        { merge: true }
      );
    } catch (_) {
      // ignore write errors (offline, permissions, etc)
    }
  };


  renderModePanel = () => {
    const mode = this.state.gameMode || "learn";
    const show = !this.state.userHasPlayedThisLine || this.state.completed;
    if (!show) return null;

    return (
      <div className="ot-mode-panel">
        <button
          className={"ot-mode-card ot-mode-card-big" + (mode === "learn" ? " active" : "") + ((!this.props.user || (!this.props.isMember && !false)) ? " locked" : "")}
          onClick={() => this.setGameMode("learn")}
          type="button"
        >
          <div className="ot-mode-card-title"><span role="img" aria-label="learn">📘</span> Learn</div>
          <div className="ot-mode-card-sub">Explanations on. Repeat until clean.</div>
        </button>

        <button
          className={"ot-mode-card" + (mode === "practice" ? " active" : "") + (!this.props.isMember ? " locked" : "")}
          onClick={() => (this.props.isMember ? this.setGameMode("practice") : this.openMemberGate("practice"))}
          type="button"

        >
          <div className="ot-mode-card-title"><span role="img" aria-label="practice">🎯</span> Practice</div>
          <div className="ot-mode-card-sub">Auto next. Help unlocks explanations.</div>
        </button>

        <button
          className={"ot-mode-card" + (mode === "drill" ? " active" : "") + (!this.props.isMember ? " locked" : "")}
          onClick={() => (this.props.isMember ? this.setGameMode("drill") : this.openMemberGate("drill"))}
          type="button"

        >
          <div className="ot-mode-card-title"><span role="img" aria-label="drill">🔥</span> Drill</div>
          <div className="ot-mode-card-sub">No hints. Streak resets on mistake.</div>
        </button>
      </div>
    );
  };


  
  maybeWriteDrillStatsToFirestore = async (stats) => {
    // Best-effort write, no anticheat. Must never crash UI.
    try {
      const u = this.props && this.props.user ? this.props.user : null;
      if (!u || !u.uid) return;

      // Cache username so we don't read Firestore every completion.
      let username = "";
      try {
        if (this._lbUserCache && this._lbUserCache.uid === u.uid) {
          username = String(this._lbUserCache.username || "");
        }
      } catch (_) {}

      if (!username) {
        try {
          const snap = await getDoc(doc(db, "users", u.uid));
          if (snap.exists()) {
            const d = snap.data() || {};
            const un = d.username ? String(d.username).trim() : "";
            const dn = d.displayName ? String(d.displayName).trim() : "";
            username = un || dn || "";
          }
        } catch (_) {}
      }

      if (!username) {
        const dn = u.displayName ? String(u.displayName).trim() : "";
        const em = u.email ? String(u.email).trim() : "";
        username = dn || (em ? em.split("@")[0] : "") || "Anonymous";
      }

      this._lbUserCache = { uid: u.uid, username };

      const pack = (score) => ({
        uid: u.uid,
        username: username,
        score: Number(score) || 0,
        updatedAt: serverTimestamp()
      });

      const writes = [];

      // All Time
      writes.push(setDoc(doc(db, "leaderboards_drill_alltime", u.uid), pack(stats.bestAllTime), { merge: true }));

      // Daily, Weekly, Monthly
      writes.push(setDoc(doc(db, "leaderboards_drill_daily", u.uid), pack(stats.bestDay), { merge: true }));
      writes.push(setDoc(doc(db, "leaderboards_drill_weekly", u.uid), pack(stats.bestWeek), { merge: true }));
      writes.push(setDoc(doc(db, "leaderboards_drill_monthly", u.uid), pack(stats.bestMonth), { merge: true }));

      await Promise.all(writes);
    } catch (_) {
      // swallow
    }
  };
render() {
    const line = this.getLine();
    if (!line) return null;
    const nextExpected = line.moves[this.state.stepIndex] || null;

    const viewIndex = this.getViewIndex();
    const coachExpected = line.moves[viewIndex] || null;
    const boardFen = this.state.viewing ? this.state.viewFen : this.state.fen;
    const canViewBack = viewIndex > 0;
    const canViewForward = viewIndex < this.state.stepIndex;

    const canUndo = !!(this.state.lastMistake || this.state.wrongAttempt);

    const playerColor = this.getPlayerColor();

    const totalYourMoves = countMovesForSide(line.moves, playerColor);
    const doneYourMoves = countDoneMovesForSide(this.state.stepIndex, playerColor);

    const yourProgressPct = totalYourMoves > 0 ? Math.round((doneYourMoves / totalYourMoves) * 100) : 0;

    const squareStyles = {};

    if (this.state.wrongAttempt && this.state.wrongAttempt.to) {
      squareStyles[this.state.wrongAttempt.to] = {
        backgroundImage: `url("${X_SVG_DATA_URI}")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        backgroundSize: "70%"
      };
    }

    if (this.state.lastMove) {
      const { from, to } = this.state.lastMove;
      squareStyles[from] = {
        ...(squareStyles[from] || {}),
        backgroundColor: "rgba(255, 215, 0, 0.45)"
      };
      squareStyles[to] = {
        ...(squareStyles[to] || {}),
        backgroundColor: "rgba(255, 215, 0, 0.45)"
      };
    }

    if (this.state.hintFromSquare) {
      squareStyles[this.state.hintFromSquare] = {
        background: "rgba(80, 170, 255, 0.45)"
      };
    }

    if (this.state.selectedSquare) {
      squareStyles[this.state.selectedSquare] = {
        ...(squareStyles[this.state.selectedSquare] || {}),
        boxShadow: "inset 0 0 0 3px rgba(170, 80, 255, 0.75)"
      };
    }

    if (this.state.legalTargets && this.state.legalTargets.length) {
      for (const toSq of this.state.legalTargets) {
        const existing = squareStyles[toSq] || {};
        const dot = "radial-gradient(circle at center, rgba(170, 80, 255, 0.55) 18%, rgba(0,0,0,0) 20%)";
        const mergedBg = existing.backgroundImage ? (existing.backgroundImage + ", " + dot) : dot;
        squareStyles[toSq] = {
          ...existing,
          backgroundImage: mergedBg,
          backgroundRepeat: existing.backgroundRepeat ? existing.backgroundRepeat + ", no-repeat" : "no-repeat",
          backgroundPosition: existing.backgroundPosition ? existing.backgroundPosition + ", center" : "center",
          backgroundSize: existing.backgroundSize ? existing.backgroundSize + ", 100% 100%" : "100% 100%"
        };
      }
    }

    return (
      <div className={"ot-container" + (this.state.isMobile ? " ot-mobile" : "")}>
        <OpeningTrainerConfetti active={this.state.confettiActive} />
        <OpeningTrainerCustomModal
          open={this.state.customModalOpen}
          error={this.state.customError}
          name={this.state.customName}
          movesText={this.state.customMovesText}
          onChangeName={(v) => this.setState({ customName: v })}
          onChangeMovesText={(v) => this.setState({ customMovesText: v })}
          onCancel={this.closeCustomModal}
          onSave={this.saveCustomModal}
        />

        {this.state.memberGateOpen ? (
          <div className="ot-gate-overlay" role="dialog" aria-modal="true">
            <div className="ot-gate-card">
              <div className="ot-gate-title">Members only. Upgrade to access Practice and Drill.</div>
              <div className="ot-gate-sub">
                {this.state.memberGateMode === "practice" ? "Practice Mode" : "Drill Mode"} requires a paid membership.
              </div>
              <div className="ot-gate-actions">
                <button type="button" className="ot-gate-btn" onClick={this.goToUpgrade}>
                  Upgrade
                </button>
                <button type="button" className="ot-gate-btn secondary" onClick={this.closeMemberGate}>
                  Not now
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {this.state.streakToastOpen ? (
          <div
            style={{
              position: "fixed",
              top: 16,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 9999,
              padding: "10px 14px",
              borderRadius: 12,
              background: "rgba(20, 20, 25, 0.92)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "white",
              fontWeight: 700,
              letterSpacing: "0.1px",
              maxWidth: "92vw",
              textAlign: "center",
              boxShadow: "0 12px 28px rgba(0,0,0,0.35)"
            }}
          >
            {this.state.streakToastText}
          </div>
        ) : null}


        {this.state.isMobile ? (
          <style id="ot-mobile-root-style">
            {`
              .ot-container.ot-mobile {

                width: 100vw;
                overflow-x: hidden;
                box-sizing: border-box;                height: 100dvh;
                min-height: 100dvh;
                padding: 0;
                margin: 0;
                display: flex;
                flex-direction: column;
              }

              .ot-container.ot-mobile .ot-top-line {
                display: none;
              }

              .ot-container.ot-mobile .ot-controls {
                display: none;
              }

              .ot-container.ot-mobile .ot-main {

                min-height: 0;                flex: 1;
                display: flex;
                flex-direction: column;
                padding: 0;
                margin: 0;
              }

              
              .ot-container.ot-mobile .ot-mobile-root {
                width: var(--ot-mobile-board-w, 100%);
                max-width: 100%;
                margin-left: auto;
                margin-right: auto;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                align-items: stretch;
              }

.ot-container.ot-mobile .ot-mobile-coach {
                padding: 8px 10px 6px 10px;
                max-height: 190px;
                overflow: auto;
              }

              .ot-container.ot-mobile .ot-mobile-board-wrap {

                min-height: 0;
                flex: 0 0 auto;
                display: flex;
                align-items: flex-start;
                justify-content: flex-start;
                padding: 0;
                width: 100%;
              }

              .ot-container.ot-mobile .ot-board {
                width: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 0;
                margin: 0;
                              overflow: visible;
}

              .ot-container.ot-mobile .ot-board-head {
                display: none;
              }

              .ot-container.ot-mobile .ot-side {
                display: none;
              }

              .ot-container.ot-mobile .ot-mobile-dock {
                height: 56px;
                padding: 0 0 calc(8px + env(safe-area-inset-bottom)) 0;
                display: flex;
                align-items: center;
                justify-content: flex-start;
                gap: 8px;
                overflow-x: auto;
                border-top: 1px solid rgba(255,255,255,0.08);
                background: rgba(10, 10, 12, 0.85);
                -webkit-backdrop-filter: blur(10px);
                backdrop-filter: blur(10px);
              }

              .ot-container.ot-mobile .ot-mobile-dock button,
              .ot-container.ot-mobile .ot-mobile-dock select {
                flex: 0 0 auto;
                height: 38px;
                padding: 0 10px;
                border-radius: 10px;
                font-size: 14px;
              }

              .ot-container.ot-mobile .ot-mobile-dock .ot-mobile-icon {
                width: 40px;
                padding: 0;
                display: inline-flex;
                align-items: center;
                justify-content: center;
              }

              

              .ot-container.ot-mobile .ot-mobile-header {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px 10px 8px 10px;
              }


              .ot-container.ot-mobile .ot-mobile-header-area {
                padding: 10px 0 0 0;
                width: 100%;
                box-sizing: border-box;
              }

              .ot-container.ot-mobile .ot-mobile-stage {
                flex: 0 0 auto;
                min-height: 0;
                display: flex;
                flex-direction: column;
                align-items: stretch;
                justify-content: flex-start;
                gap: 8px;
                padding: 0;
              }

              .ot-container.ot-mobile .ot-mobile-back {

                width: 40px;
                height: 40px;
                border-radius: 12px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
              }

              .ot-container.ot-mobile .ot-mobile-topbar {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 8px 0 6px 0;
              }

              .ot-container.ot-mobile .ot-mobile-progress-inline {
                flex: 1;
                min-width: 0;
              }

              .ot-container.ot-mobile .ot-mobile-progress-inline .ot-progress-bar {
                height: 10px;
                border-radius: 999px;
              }

              .ot-container.ot-mobile .ot-mobile-pillrow {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 0 0 8px 0;
                overflow-x: auto;
                -webkit-overflow-scrolling: touch;
              }

              .ot-container.ot-mobile .ot-mobile-coach {
                padding: 0;
              }

              .ot-container.ot-mobile .ot-mobile-coach-scroll {
                padding: 0 0 6px 0;
                height: clamp(72px, 14vh, 110px);
                overflow-y: auto;
                overflow-x: hidden;
                scrollbar-gutter: stable;
                box-sizing: border-box;
                width: 100%;
              }

              .ot-container.ot-mobile .ot-mobile-header-mid {
                flex: 1;
                min-width: 0;
                display: flex;
                align-items: center;
                gap: 8px;
                overflow: hidden;
              }

              .ot-container.ot-mobile .ot-mobile-pill-btn {
                max-width: 44vw;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                height: 34px;
                padding: 0 8px;
                border-radius: 10px;
                font-size: 14px;
                border: 1px solid rgba(255,255,255,0.14);
                background: rgba(255,255,255,0.04);
                box-shadow: none;
                color: rgba(255,255,255,0.95);
              }

              .ot-container.ot-mobile .ot-mobile-pill-btn.active {
                border-color: rgba(255,255,255,0.22);
                background: rgba(255,255,255,0.08);
              }

              .ot-container.ot-mobile .ot-mobile-mini-count {
                flex: 0 0 auto;
                font-size: 13px;
                opacity: 0.85;
              }

              .ot-container.ot-mobile .ot-mobile-progress {
                padding: 0 10px 6px 10px;
              }

              .ot-container.ot-mobile .ot-mobile-menu {
                position: fixed;
                left: 10px;
                right: 10px;
                top: 58px;
                z-index: 9999;
                border-radius: 14px;
                padding: 10px;
                background: rgba(10, 10, 12, 0.96);
                border: 1px solid rgba(255,255,255,0.12);
                box-shadow: 0 16px 40px rgba(0,0,0,0.45);
              }

              .ot-container.ot-mobile .ot-mobile-menu-title {
                font-weight: 800;
                margin-bottom: 8px;
              }

              .ot-container.ot-mobile .ot-mobile-menu button,
              .ot-container.ot-mobile .ot-mobile-menu select {
                width: 100%;
              }

              .ot-container.ot-mobile .ot-mobile-menu .ot-mode-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
              }

              .ot-container.ot-mobile .ot-mobile-menu .ot-mode-item {
                height: 42px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0 12px;
              }

              .ot-container.ot-mobile .ot-mobile-menu .ot-mode-item.locked {
                opacity: 0.55;
              }

              .ot-container.ot-mobile .ot-coach-text {
                font-size: 15px;
                line-height: 1.25;
              }
              .ot-container.ot-mobile .ot-bubble,
              .ot-container.ot-mobile .ot-bubble-row {
                width: 100%;
                box-sizing: border-box;
              }

              .ot-container.ot-mobile .ot-coach-text {
                min-width: 0;
                overflow-wrap: anywhere;
              }

              .ot-container.ot-mobile .ot-bubble,
              .ot-container.ot-mobile .ot-bubble-row {
                background: #ececf1;
                color: #111111;
                border: 1px solid rgba(0,0,0,0.08);
              }

              .ot-container.ot-mobile .ot-coach-text {
                color: #000000;
              }

              .ot-container.ot-mobile .ot-bubble-icon {
                color: rgba(0,0,0,0.75);
              }

            `}
          </style>
        ) : null}

        {this.state.isMobile ? null : <TopNav title="Chess Opening Drills" />}
{/* Per-line progress (moved to top) */}
        <div className="ot-top-line">
          <div className="ot-top-line-row">
            <div className="ot-top-line-count">
              
            </div>
          </div>

          <div className="ot-progress-bar ot-progress-bar-top">
            <div className="ot-progress-fill" style={{ width: yourProgressPct + "%" }} />
          </div>
        </div>

                <div className="ot-main">
          {this.state.isMobile ? (
            <div className="ot-mobile-root" style={{ "--ot-mobile-board-w": (this.state.mobileBoardSize ? `${this.state.mobileBoardSize}px` : "100%") }}>
              
              <div className="ot-mobile-header-area">

                <div className="ot-mobile-pillrow" ref={this._mobilePillsRef}>
                  <button
                    className={"ot-mobile-pill-btn" + (this.state.mobileHeaderMenu === "mode" ? " active" : "")}
                    onClick={() => this.toggleMobileHeaderMenu("mode")}
                    title="Mode"
                    aria-label="Mode"
                  >
                    {(() => {
                      const mode = this.state.gameMode || "learn";
                      return mode === "learn" ? (
                        <>
                          <span role="img" aria-label="learn">📘</span> Learn
                        </>
                      ) : mode === "practice" ? (
                        <>
                          <span role="img" aria-label="practice">🎯</span> Practice
                        </>
                      ) : (
                        <>
                          <span role="img" aria-label="drill">🔥</span> Drill
                        </>
                      );
                    })()}{" "}
                    ▾
                  </button>

                  <button
                    className={"ot-mobile-pill-btn" + (this.state.mobileHeaderMenu === "opening" ? " active" : "")}
                    onClick={() => this.toggleMobileHeaderMenu("opening")}
                    title="Opening"
                    aria-label="Opening"
                  >
                    {(() => {
                      const s = OPENING_SETS[this.state.openingKey];
                      return (s && (s.name || s.title || s.label)) || this.state.openingKey;
                    })()}{" "}
                    ▾
                  </button>

                  <button
                    className={"ot-mobile-pill-btn" + (this.state.mobileHeaderMenu === "line" ? " active" : "")}
                    onClick={() => this.toggleMobileHeaderMenu("line")}
                    title="Line"
                    aria-label="Line"
                  >
                    {(line && line.name) || "Line"} ▾
                  </button>
                </div>

                <div className="ot-mobile-topbar" ref={this._mobileTopbarRef}>
                  <button className="ot-icon-btn ot-mobile-back" onClick={this.goHome} title="Back" aria-label="Back">
                    ←
                  </button>

                  <div className="ot-mobile-progress-inline" aria-label="Progress">
                    <div className="ot-progress-bar ot-progress-bar-top">
                      <div className="ot-progress-fill" style={{ width: yourProgressPct + "%" }} />
                    </div>
                  </div>

                  <div className="ot-mobile-mini-count">
                    {doneYourMoves}/{totalYourMoves}
                  </div>
                </div>

                {this.state.mobileHeaderMenu ? (
                  <>
                    <div
                      onClick={this.closeMobileHeaderMenu}
                      style={{ position: "fixed", inset: 0, zIndex: 9998 }}
                    />
                    <div className="ot-mobile-menu" onClick={(e) => e.stopPropagation()}>
                      {this.state.mobileHeaderMenu === "mode" ? (
                        <>
                          <div className="ot-mobile-menu-title">Mode</div>
                          <div className="ot-mode-list">
                            <button className="ot-mode-item" onClick={() => { this.setGameMode("learn"); this.closeMobileHeaderMenu(); }}>
                              <span><span role="img" aria-label="learn">📘</span> Learn</span>
                              <span />
                            </button>

                            <button
                              className={"ot-mode-item" + (!this.props.user || !this.props.isMember ? " locked" : "")}
                              onClick={() => { this.setGameMode("practice"); this.closeMobileHeaderMenu(); }}
                            >
                              <span><span role="img" aria-label="practice">🎯</span> Practice</span>
                              <span>{!this.props.user || !this.props.isMember ? "Member" : ""}</span>
                            </button>

                            <button
                              className={"ot-mode-item" + (!this.props.user || !this.props.isMember ? " locked" : "")}
                              onClick={() => { this.setGameMode("drill"); this.closeMobileHeaderMenu(); }}
                            >
                              <span><span role="img" aria-label="drill">🔥</span> Drill</span>
                              <span>{!this.props.user || !this.props.isMember ? "Member" : ""}</span>
                            </button>
                          </div>
                        </>
                      ) : this.state.mobileHeaderMenu === "opening" ? (
                        <>
                          <div className="ot-mobile-menu-title">Opening</div>
                          <select
                            className="ot-select"
                            value={this.state.openingKey}
                            onChange={(e) => {
                              this.setOpeningKey(e);
                              this.closeMobileHeaderMenu();
                            }}
                          >
                            {Object.keys(OPENING_SETS).map((k) => {
                              const s = OPENING_SETS[k];
                              const label = (s && (s.name || s.title || s.label)) || k;
                              return (
                                <option key={k} value={k}>
                                  {label}
                                </option>
                              );
                            })}
                          </select>
                        </>
                      ) : (
                        <>
                          <div className="ot-mobile-menu-title">Line</div>
                          <select
                            className="ot-line-select ot-line-select-compact"
                            value={this.state.linePicker}
                            onChange={(e) => {
                              this.setLinePicker(e);
                              this.closeMobileHeaderMenu();
                            }}
                          >
                            <option value="random">Random line</option>
                            <option value="__divider__" disabled>
                              ─────────
                            </option>

                            {(() => {
                              const grouped = groupLines(this.getLines());
                              return grouped.cats.map((cat) => {
                                const arr = grouped.map[cat] || [];
                                return (
                                  <optgroup key={cat} label={cat}>
                                    {arr.map((l) => {
                                      const s = getLineStats(this.state.progress, this.state.openingKey, l.id);
                                      const symbol = isCompleted(s) ? "✓" : s.timesSeen > 0 ? "•" : "○";
                                      return (
                                        <option key={l.id} value={l.id}>
                                          {symbol} {l.name}
                                        </option>
                                      );
                                    })}
                                  </optgroup>
                                );
                              });
                            })()}
                          </select>
                        </>
                      )}
                    </div>
                  </>
                ) : null}

                
              </div>


              <div className="ot-mobile-stage">
                <div className="ot-mobile-coach-scroll" ref={this._mobileCoachRef}>{this.renderCoachBubble(line)}</div>

              <div className="ot-mobile-board-wrap">
                <div className="ot-board">
                  <Chessboard
                    width={this.state.mobileBoardSize || undefined}
                    position={boardFen}
                    onDrop={this.onDrop}
                    allowDrag={this.allowDrag}
                    orientation={playerColor === "b" ? "black" : "white"}
                    showNotation={true}
                    squareStyles={squareStyles}
                    onSquareClick={this.onSquareClick}
                    onSquareRightClick={this.onSquareRightClick}
                    {...BOARD_THEMES[this.state.settings.boardTheme || DEFAULT_THEME]}
                  />
                </div>
              </div>

              </div>

              <div className="ot-mobile-dock" ref={this._mobileDockRef}>
                <button
                  className="ot-gear ot-mobile-icon"
                  onClick={this.toggleSettingsOpen}
                  title="Settings"
                  aria-label="Settings"
                >
                  <span role="img" aria-label="settings">⚙</span>
                </button>

                {canUndo ? (
                  <button className="ot-mini-btn" onClick={this.undoMistake} title="Undo mistake">
                    Undo
                  </button>
                ) : null}

                {this.state.gameMode === "drill" ? null : (
                  <button
                    className={
                      "ot-button ot-button-small ot-button-dock ot-hint-btn" +
                      (this.state.showHint ? " ot-hint-btn-on" : "")
                    }
                    onClick={this.state.solveArmed ? this.playMoveForMe : this.onHint}
                    disabled={!nextExpected || this.state.completed || this.state.viewing}
                    title={
                      !nextExpected
                        ? "Line complete"
                        : this.state.solveArmed
                        ? "Play the move (breaks clean completion)"
                        : "Highlight the piece to move"
                    }
                  >
                    {this.state.solveArmed ? "Solve" : "Hint"}
                  </button>
                )}

                <button
                  className="ot-button ot-button-small ot-button-dock"
                  onClick={this.retryLine}
                  title="Retry"
                >
                  Retry
                </button>

                {this.state.gameMode === "learn" && this.state.learnNextReady ? (
                <button
                  className="ot-button ot-button-small ot-button-dock"
                  onClick={this.nextLine}
                  title="Pick the next line"
                >
                  Next
                </button>
              ) : null}

         <button
                  className="ot-icon-btn ot-mobile-icon"
                  onClick={this.viewBack}
                  disabled={!canViewBack}
                  title="Back"
                  aria-label="Back"
                >
                  ‹
                </button>

                <button
                  className="ot-icon-btn ot-mobile-icon"
                  onClick={this.viewForward}
                  disabled={!canViewForward}
                  title="Forward"
                  aria-label="Forward"
                >
                  ›
                </button>
              </div>

              {this.state.lineMenuOpen ? (
                <div
                  className="ot-line-popover"
                  onClick={(e) => e.stopPropagation()}
                  ref={(el) => (this._linePickerAnchorEl = el)}
                  style={{ position: "fixed", left: 10, right: 10, bottom: 64, zIndex: 9998 }}
                >
                  <div className="ot-line-popover-title">Line select</div>
                  <button className="ot-mini-btn ot-add-rep-btn" onClick={this.openCustomModal} title="Paste a custom rep">
                    + Add rep
                  </button>

                  <select
                    className="ot-line-select ot-line-select-compact"
                    value={this.state.linePicker}
                    onChange={(e) => {
                      this.setLinePicker(e);
                      this.setState({ lineMenuOpen: false });
                    }}
                  >
                    <option value="random">Random line</option>
                    <option value="__divider__" disabled>
                      ─────────
                    </option>

                    {(() => {
                      const grouped = groupLines(this.getLines());
                      return grouped.cats.map((cat) => {
                        const arr = grouped.map[cat] || [];
                        return (
                          <optgroup key={cat} label={cat}>
                            {arr.map((l) => {
                              const s = getLineStats(this.state.progress, this.state.openingKey, l.id);
                              const symbol = isCompleted(s) ? "✓" : s.timesSeen > 0 ? "•" : "○";
                              return (
                                <option key={l.id} value={l.id}>
                                  {symbol} {l.name}
                                </option>
                              );
                            })}
                          </optgroup>
                        );
                      });
                    })()}
                  </select>
                </div>
              ) : null}

              {this.state.settingsOpen ? (
                <div
                  className="ot-settings-menu"
                  onClick={(e) => e.stopPropagation()}
                  ref={(el) => (this._settingsAnchorEl = el)}
                  style={{ position: "fixed", left: 10, right: 10, bottom: 64, zIndex: 9999 }}
                >
                  <div className="ot-settings-title">Settings</div>

                  <label className="ot-settings-row">
                    <input
                      type="checkbox"
                      checked={!!(this.state.settings && this.state.settings.showConfetti)}
                      onChange={(e) => this.setSetting("showConfetti", !!e.target.checked)}
                    />
                    <span>Show Confetti</span>
                  </label>

                  <label className="ot-settings-row">
                    <input
                      type="checkbox"
                      checked={!!(this.state.settings && this.state.settings.playSounds)}
                      onChange={(e) => this.setSetting("playSounds", !!e.target.checked)}
                    />
                    <span>Play Sounds</span>
                  </label>

                  <div className="ot-settings-title" style={{ marginTop: "12px" }}>Board Theme</div>

                  <label className="ot-settings-row">
                    <input
                      type="radio"
                      name="boardThemeMobile"
                      checked={this.state.settings.boardTheme === "chesscom"}
                      onChange={() => this.setSetting("boardTheme", "chesscom")}
                    />
                    <span>Chess.com</span>
                  </label>

                  <label className="ot-settings-row">
                    <input
                      type="radio"
                      name="boardThemeMobile"
                      checked={this.state.settings.boardTheme === "lichess"}
                      onChange={() => this.setSetting("boardTheme", "lichess")}
                    />
                    <span>Lichess</span>
                  </label>

                  <label className="ot-settings-row">
                    <input
                      type="radio"
                      name="boardThemeMobile"
                      checked={this.state.settings.boardTheme === "darkblue"}
                      onChange={() => this.setSetting("boardTheme", "darkblue")}
                    />
                    <span>Dark Blue</span>
                  </label>
                </div>
              ) : null}
            </div>
          ) : (
            <>
          <div className="ot-board">

            <div className="ot-board-head">
              <select className="ot-opening-select" value={this.state.openingKey} onChange={this.setOpeningKey}>
                <option value="london">London</option>
                <option value="sicilian">Sicilian Defense</option>
<option value="ruy">Ruy Lopez</option>
<option value="friedliver">Fried Liver Attack</option>
                <option value="stafford">Stafford Gambit</option>
            <option value="carokann">Caro-Kann Defense</option>
            <option value="qga">Queen’s Gambit Accepted</option>
            <option value="qgd">Queen’s Gambit Declined</option>
              
            <option value="italian">Italian Game</option>
            <option value="kingsindian">King's Indian Defense</option>
            <option value="french">French Defense</option>
            <option value="englund">Englund Gambit</option>
<option value="english">English Opening</option>
<option value="scotchgame">Scotch Game</option>
</select>
            </div>
<Chessboard
  calcWidth={calcWidth}
  position={boardFen}
  onDrop={this.onDrop}
  allowDrag={this.allowDrag}
  orientation={playerColor === "b" ? "black" : "white"}
  showNotation={true}
  squareStyles={squareStyles}
  onSquareClick={this.onSquareClick}
  onSquareRightClick={this.onSquareRightClick}
  {...BOARD_THEMES[this.state.settings.boardTheme || DEFAULT_THEME]}
/>
          </div>

          
          <div className="ot-side">
            <div className="ot-panel">
              <div className="ot-panel-body">
              {this.renderCoachArea(line, doneYourMoves, totalYourMoves, coachExpected)}
              {this.renderModePanel()}

              <div className="ot-dock">
                <div className="ot-dock-left" style={{ position: "relative" }}>
                  <div
                    className="ot-panel-header-actions"
                    ref={(el) => {
                      this._settingsAnchorEl = el;
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button className="ot-gear" onClick={this.toggleSettingsOpen} title="Settings" aria-label="Settings">
                      <span role="img" aria-label="settings">⚙</span>
                    </button>

                    {this.state.settingsOpen ? (
                      <div className="ot-settings-menu" onClick={(e) => e.stopPropagation()} style={{ position: "absolute", left: 0, bottom: "calc(100% + 10px)", zIndex: 9999, maxWidth: 320 }}>
                        <div className="ot-settings-title">Settings</div>

                        <label className="ot-settings-row">
                          <input
                            type="checkbox"
                            checked={!!(this.state.settings && this.state.settings.showConfetti)}
                            onChange={(e) => this.setSetting("showConfetti", !!e.target.checked)}
                          />
                          <span>Show Confetti</span>
                        </label>

                        <label className="ot-settings-row">
                          <input
                            type="checkbox"
                            checked={!!(this.state.settings && this.state.settings.playSounds)}
                            onChange={(e) => this.setSetting("playSounds", !!e.target.checked)}
                          />
                          <span>Play Sounds</span>
                        </label>

                        <div className="ot-settings-title" style={{ marginTop: "12px" }}>Board Theme</div>
                        
                        <label className="ot-settings-row">
                          <input
                            type="radio"
                            name="boardTheme"
                            checked={this.state.settings.boardTheme === "chesscom"}
                            onChange={() => this.setSetting("boardTheme", "chesscom")}
                          />
                          <span>Chess.com</span>
                        </label>
                        
                        <label className="ot-settings-row">
                          <input
                            type="radio"
                            name="boardTheme"
                            checked={this.state.settings.boardTheme === "lichess"}
                            onChange={() => this.setSetting("boardTheme", "lichess")}
                          />
                          <span>Lichess</span>
                        </label>
                        
                        <label className="ot-settings-row">
                          <input
                            type="radio"
                            name="boardTheme"
                            checked={this.state.settings.boardTheme === "darkblue"}
                            onChange={() => this.setSetting("boardTheme", "darkblue")}
                          />
                          <span>Dark Blue</span>
                        </label>
                      </div>
                    ) : null}
                  </div>

                  {canUndo ? (
                    <button className="ot-mini-btn" onClick={this.undoMistake} title="Undo mistake">
                      Undo
                    </button>
                  ) : null}
                </div>

                <div className="ot-dock-center">
                  <button className="ot-button ot-button-small ot-button-dock" onClick={this.retryLine}>
                    Retry
                  </button>

                  {this.state.gameMode === "learn" ? (
                    this.state.learnNextReady ? (
                      <button
                        className="ot-button ot-button-small ot-button-dock"
                        onClick={this.nextLine}
                        title="Pick the next line"
                      >
                        Next
                      </button>
                    ) : null
                  ) : (
                    <button
                      className="ot-button ot-button-small ot-button-dock"
                      onClick={this.nextLine}
                      disabled={this.state.gameMode === "drill" && this.state.linePicker !== "random"}
                      title={
                        this.state.gameMode === "drill" && this.state.linePicker !== "random"
                          ? "Switch to Random line to use this"
                          : "Pick the next line"
                      }
                    >
                      Next
                    </button>
                  )}
                  {this.state.gameMode === "drill" ? null : (

                  <button
                    className={
                      "ot-button ot-button-small ot-button-dock ot-hint-btn" +
                      (this.state.showHint ? " ot-hint-btn-on" : "")
                    }
                    onClick={this.state.solveArmed ? this.playMoveForMe : this.onHint}
                    disabled={!nextExpected || this.state.completed || this.state.viewing}
                    title={
                      !nextExpected
                        ? "Line complete"
                        : this.state.solveArmed
                        ? "Play the move (breaks clean completion)"
                        : "Highlight the piece to move"
                    }
                  >
                    {this.state.solveArmed ? "Solve" : "Hint"}
                  </button>
                  )}
                </div>

                <div className="ot-dock-right">
                  <button
                    className="ot-icon-btn"
                    onClick={this.viewBack}
                    disabled={!canViewBack}
                    title="Back"
                    aria-label="Back"
                  >
                    ‹
                  </button>

                  <button
                    className="ot-icon-btn"
                    onClick={this.viewForward}
                    disabled={!canViewForward}
                    title="Forward"
                    aria-label="Forward"
                  >
                    ›
                  </button>
                </div>
              </div>

              </div>
            </div>
          </div>
            </>
          )}

        </div>
      </div>
    );
  }
}

function OpeningTrainerWithAuth(props) {
  const { user, authLoading, isMember, membershipTier, membershipActive } = useAuth();
  return (
    <OpeningTrainer
      {...props}
      user={user}
      authLoading={authLoading}
      isMember={!!isMember}
      membershipTier={membershipTier}
      membershipActive={membershipActive}
    />
  );
}

export default OpeningTrainerWithAuth;