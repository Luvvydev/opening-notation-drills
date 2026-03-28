import React, { Component } from "react";
import Chessboard from "chessboardjsx";
import * as Chess from "chess.js";
import { OPENING_SETS as CATALOG_OPENING_SETS } from "../openings/openingCatalog";
import { buildMoveFeedback } from "../openings/feedback";
import { useAuth } from "../auth/AuthProvider";
import TopNav from "./TopNav";
import SEO from "./SEO";
import { BOARD_THEMES, DEFAULT_THEME, PIECE_THEMES } from "../theme/boardThemes";
import "./OpeningTrainer.css";
import { getStreakState, markLineCompletedTodayDetailed } from "../utils/streak";
import { getActivityDays, markActivityToday, touchActivityToday } from "../utils/activityDays";
import { X_SVG_DATA_URI, pickRandomLineId, countMovesForSide, countDoneMovesForSide, groupLines, detectCustomInputFormat, parseCustomLineInput, lineToSanText, lineToPgn, encodeSharedCustomLine, decodeSharedCustomLine, getLineStartFen } from "./openingTrainer/otUtils";
import { getOrderedLineIds } from "../utils/lineIndex";
import { pickNextPracticeLineId } from "./openingTrainer/practicePicker";
import { getOpeningPuzzlePack, getOpeningPuzzleTagHints } from "./openingTrainer/openingPuzzleCatalog";
import { preparePuzzle, moveMatchesUci, getLegalTargets, getSquarePieceColor } from "./openingTrainer/puzzleUtils";
import { getCoachConfig } from "./openingTrainer/coachConfig";

import { loadProgress, saveProgress, loadLearnProgress, saveLearnProgress, loadSettings, saveSettings, loadCustomLines, saveCustomLines, deleteCustomLineById, makeCustomId, ensureOpening, getLineStats, isCompleted, ensureLearnOpening, getLearnLineStats } from "./openingTrainer/otStorage";
import OpeningTrainerCustomModal from "./openingTrainer/OpeningTrainerCustomModal";
import OpeningTrainerConfetti from "./openingTrainer/OpeningTrainerConfetti";
import { db } from "../firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { dayKeyFromDate, isoWeekKeyFromDate, monthKeyFromDate } from "../utils/periodKeys";

class BoardErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    // swallow; parent can remount via key
  }

  handleReload = () => {
    this.setState({ hasError: false });
    if (this.props.onReset) this.props.onReset();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="ot-board ot-board-error">
          <div className="ot-board-error-title">Board crashed</div>
          <button className="ot-button ot-button-small" onClick={this.handleReload}>Reload board</button>
        </div>
      );
    }
    return this.props.children;
  }
}



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



function pickDefaultLearnLineId(openingKey, lines, preferredId = null) {
  const safeLines = Array.isArray(lines) ? lines.filter(Boolean) : [];
  if (!safeLines.length) return "";

  if (preferredId && safeLines.find((line) => line && line.id === preferredId)) {
    return String(preferredId);
  }

  const orderedIds = getOrderedLineIds(openingKey) || [];
  for (let i = 0; i < orderedIds.length; i += 1) {
    const candidateId = String(orderedIds[i] || "");
    if (candidateId && safeLines.find((line) => line && line.id === candidateId)) {
      return candidateId;
    }
  }

  return safeLines[0] && safeLines[0].id ? String(safeLines[0].id) : "";
}

function getOrderedLineIdsForLines(openingKey, lines) {
  const safeLines = Array.isArray(lines) ? lines.filter(Boolean) : [];
  if (!safeLines.length) return [];

  const lineIds = safeLines.map((line) => String(line.id || "")).filter(Boolean);
  const available = new Set(lineIds);
  const orderedRaw = getOrderedLineIds(openingKey) || [];
  const seen = new Set();
  const ordered = [];

  for (let i = 0; i < orderedRaw.length; i += 1) {
    const candidateId = String(orderedRaw[i] || "");
    if (!candidateId || !available.has(candidateId) || seen.has(candidateId)) continue;
    ordered.push(candidateId);
    seen.add(candidateId);
  }

  for (let i = 0; i < lineIds.length; i += 1) {
    const candidateId = lineIds[i];
    if (!candidateId || seen.has(candidateId)) continue;
    ordered.push(candidateId);
    seen.add(candidateId);
  }

  return ordered;
}

function getLineNumberForLines(openingKey, lines, lineId) {
  const ids = getOrderedLineIdsForLines(openingKey, lines);
  const targetId = String(lineId || "");
  if (!targetId || !ids.length) return null;
  const idx = ids.indexOf(targetId);
  return idx >= 0 ? idx + 1 : null;
}

function getLearnDiscoveredCountForLines(openingKey, lines, learnProgress) {
  const ids = getOrderedLineIdsForLines(openingKey, lines);
  if (!ids.length) return 0;

  let count = 0;
  for (let i = 0; i < ids.length; i += 1) {
    const stats = getLearnLineStats(learnProgress, openingKey, ids[i]);
    if ((Number(stats && stats.timesClean) || 0) >= 1) count += 1;
  }
  return count;
}

function pickNextOrderedLearnLineId({ openingKey, lines, learnProgress, currentLineId = null, advancePastCurrent = false, preferredId = null }) {
  const ids = getOrderedLineIdsForLines(openingKey, lines);
  if (!ids.length) return "";

  const preferred = String(preferredId || "");
  if (preferred && ids.includes(preferred)) return preferred;

  const currentId = String(currentLineId || "");
  const currentIdx = currentId ? ids.indexOf(currentId) : -1;

  if (advancePastCurrent && currentIdx >= 0) {
    for (let i = currentIdx + 1; i < ids.length; i += 1) {
      const stats = getLearnLineStats(learnProgress, openingKey, ids[i]);
      if ((Number(stats && stats.timesClean) || 0) < 1) return ids[i];
    }
    for (let i = 0; i < currentIdx; i += 1) {
      const stats = getLearnLineStats(learnProgress, openingKey, ids[i]);
      if ((Number(stats && stats.timesClean) || 0) < 1) return ids[i];
    }
  }

  for (let i = 0; i < ids.length; i += 1) {
    const stats = getLearnLineStats(learnProgress, openingKey, ids[i]);
    if ((Number(stats && stats.timesClean) || 0) < 1) return ids[i];
  }

  if (currentIdx >= 0) return ids[currentIdx];
  return ids[0];
}

function normalizeFenKey(fen) {
  const raw = String(fen || "").trim();
  if (!raw || raw === "start") return "start";
  const parts = raw.split(/\s+/);
  return parts.slice(0, 4).join(" ");
}

function findTranspositionMatch({ lines, fen, minStepIndex, preferredLineId }) {
  const safeLines = Array.isArray(lines) ? lines.filter(Boolean) : [];
  if (!safeLines.length) return null;

  const targetFenKey = normalizeFenKey(fen);
  if (!targetFenKey || targetFenKey === "start") return null;

  const safeMinStepIndex = Math.max(0, Number(minStepIndex) || 0);
  const preferredId = preferredLineId ? String(preferredLineId) : "";
  let best = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let lineIdx = 0; lineIdx < safeLines.length; lineIdx += 1) {
    const line = safeLines[lineIdx];
    const moves = Array.isArray(line && line.moves) ? line.moves : [];
    if (!moves.length || !line || !line.id) continue;

    const startFen = getLineStartFen(line);
    const game = startFen && startFen !== "start" ? new Chess(startFen) : new Chess();

    for (let moveIdx = 0; moveIdx < moves.length; moveIdx += 1) {
      const applied = game.move(moves[moveIdx], { sloppy: true });
      if (!applied) break;

      const nextStepIndex = moveIdx + 1;
      if (nextStepIndex < safeMinStepIndex) continue;
      if (normalizeFenKey(game.fen()) !== targetFenKey) continue;

      const sameLinePenalty = preferredId && String(line.id) === preferredId ? 0 : 1000;
      const stepDistance = Math.max(0, nextStepIndex - safeMinStepIndex);
      const score = sameLinePenalty + stepDistance;

      if (score < bestScore) {
        best = {
          lineId: String(line.id),
          stepIndex: nextStepIndex,
          matchedMoveIndex: moveIdx,
          matchedSan: moves[moveIdx]
        };
        bestScore = score;
      }

      if (score === 0) return best;
      break;
    }
  }

  return best;
}

class OpeningTrainer extends Component {
  constructor(props) {
    super(props);

    this._openCustomOnMount = false;
    this.game = new Chess();

    this._settingsAnchorEl = null;
    this._linePickerAnchorEl = null;
    let firstSetKey = "london";
    let sharedCustomLine = null;
    try {
      const search = (props && props.location && props.location.search) || "";
      const params = new URLSearchParams(search);
      
      this._openCustomOnMount = params.get("custom") === "1";
      const fromHome = params.get("opening");
      if (fromHome && OPENING_SETS[fromHome]) firstSetKey = fromHome;
      sharedCustomLine = decodeSharedCustomLine(params.get("customRep"), firstSetKey);
      if (sharedCustomLine && sharedCustomLine.openingKey && OPENING_SETS[sharedCustomLine.openingKey]) firstSetKey = sharedCustomLine.openingKey;
    } catch (_) {
      // ignore
    }

    const initialIsMobile = (() => {
      try {
        return typeof window !== "undefined" && window.innerWidth <= (this._mobileBreakpointPx || 560);
      } catch (_) {
        return false;
      }
    })();

    const firstLinesBuiltIn = OPENING_SETS[firstSetKey].lines;
    const customAll = loadCustomLines();
    if (sharedCustomLine && !customAll.find((l) => l && l.id === sharedCustomLine.id)) customAll.push(sharedCustomLine);
    const customForFirst = customAll.filter((l) => l && l.openingKey === firstSetKey);
    const firstLines = firstLinesBuiltIn.concat(customForFirst);

    this._autoNextTimer = null;
    this._confettiTimer = null;
    this._streakToastTimer = null;
    this._shareStatusTimer = null;
    this._transpositionNoticeTimer = null;

    const progress = loadProgress();
    const learnProgress = loadLearnProgress();
    const settings = loadSettings(DEFAULT_THEME);
    const firstId = pickNextOrderedLearnLineId({
      openingKey: firstSetKey,
      lines: firstLines,
      learnProgress,
      preferredId: sharedCustomLine ? sharedCustomLine.id : null
    }) || pickDefaultLearnLineId(firstSetKey, firstLines, sharedCustomLine ? sharedCustomLine.id : null);

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
      boardRenderToken: 0,
      stepIndex: 0,
      mistakeUnlocked: false,
      lastMistake: null,
      lastMoveFeedback: null,
      feedbackExpanded: false,
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
      transpositionNotice: null,
      customLines: customAll,
      customModalOpen: false,
      customName: "",
      customMovesText: "",
      customError: "",
      customDetectedFormat: "empty",
      shareStatus: "",
      shareStatusError: false,
      viewing: false,
      viewIndex: 0,
      viewFen: "start",
      hintFromSquare: null,
      solveArmed: false,
      selectedSquare: null,
      coachHighlight: null,
      legalTargets: [],
      streakToastOpen: false,
      streakToastText: "",
      lastMove: null, // { from, to }
      memberGateOpen: false,
      memberGateMode: "",
      isMobile: initialIsMobile,
      mobileBoardSize: null,
      boardSize: 500,
      mobileHeaderMenu: null,
      learnRewardPending: false,
      learnNextReady: false,
      feedbackPreview: null,
      feedbackPreviewPosition: "before",
      puzzlePackSize: 0,
      puzzleIndex: 0,
      puzzleRawId: "",
      puzzleSource: "",
      puzzleRating: 0,
      puzzleThemes: [],
      puzzleFen: "start",
      puzzlePlayerColor: "w",
      puzzleSolution: [],
      puzzleMoveIndex: 0,
      puzzleSolved: false,
      puzzleStatus: "",
      puzzleMistakes: 0,
      puzzleWrongAttempt: null,
      puzzleSelectedSquare: null,
      puzzleLegalTargets: [],
      puzzleHintArmed: false
    
    };
    this._handleResize = () => {
      const size = this.computeBoardSize();
      // avoid setState storms during resize
      if (size && size !== this.state.boardSize) {
        this.setState({ boardSize: size });
      }
    };

    // set an initial deterministic board size (prevents chessboardjsx internal null coord map)
    this.state.boardSize = this.computeBoardSize();
    
    // Mobile layout measurement refs (used only when isMobile)
    this._mobileTopbarRef = React.createRef();
    this._mobilePillsRef = React.createRef();
    this._mobileCoachRef = React.createRef();
    this._mobileDockRef = React.createRef();
this._countedSeenForRun = false;

    const base = "";
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



  computeBoardSize = () => {
    try {
      const vw = (window && window.innerWidth) ? window.innerWidth : 360;
      const usable = Math.max(260, vw - 100);
      if (vw < 550) return usable;
      if (vw < 1800) return 500;
      return 600;
    } catch (_) {
      return 500;
    }
  };

  componentDidMount() {
    // keep chessboard width deterministic across renders
    if (typeof window !== "undefined") {
      window.addEventListener("resize", this._handleResize);
    }

    window.addEventListener("mousedown", this.onWindowClick);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("resize", this._onResizeMobileLayout);
    this._onResizeMobileLayout();
    if (this.maybeRedirectForLockedOpening(this.state.openingKey)) return;
    if (this.enforceLearnGate()) return;
    this._backfillActivityFromStreak();
    this.resetLine(false);
    if ((this.state.gameMode || "learn") === "puzzles") this.loadPuzzleForOpening(this.state.openingKey, { resetIndex: true });
  
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
      if (this.state.gameMode === "puzzles") {
        this.loadPuzzleForOpening(this.state.openingKey, { resetIndex: true });
      }
    }

    if (prevState.openingKey !== this.state.openingKey) {
      this.maybeRedirectForLockedOpening(this.state.openingKey);
      if ((this.state.gameMode || "learn") === "puzzles") {
        this.loadPuzzleForOpening(this.state.openingKey, { resetIndex: true });
      }
    }

    if (this.state.coachHighlight) {
      const coachContextChanged =
        prevState.openingKey !== this.state.openingKey ||
        prevState.lineId !== this.state.lineId ||
        prevState.gameMode !== this.state.gameMode ||
        prevState.stepIndex !== this.state.stepIndex ||
        prevState.fen !== this.state.fen ||
        prevState.viewFen !== this.state.viewFen ||
        prevState.viewing !== this.state.viewing ||
        prevState.boardRenderToken !== this.state.boardRenderToken;

      if (coachContextChanged) {
        this.setState({ coachHighlight: null });
        return;
      }
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
    this.clearFeedbackPreviewTimers();

    if (typeof window !== "undefined" && this._handleResize) {
      window.removeEventListener("resize", this._handleResize);
    }

    if (this._autoNextTimer) clearTimeout(this._autoNextTimer);
    if (this._confettiTimer) clearTimeout(this._confettiTimer);
    if (this._streakToastTimer) clearTimeout(this._streakToastTimer);
    if (this._shareStatusTimer) clearTimeout(this._shareStatusTimer);
    if (this._transpositionNoticeTimer) clearTimeout(this._transpositionNoticeTimer);
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
    customError: "",
    customDetectedFormat: "empty"
  });
};

closeCustomModal = () => {
  this.setState({ customModalOpen: false, customError: "", customDetectedFormat: "empty" });
};

setCustomMovesText = (value) => {
  this.setState({
    customMovesText: value,
    customDetectedFormat: detectCustomInputFormat(value),
    customError: ""
  });
};

setShareStatus = (message, isError) => {
  if (this._shareStatusTimer) clearTimeout(this._shareStatusTimer);
  this.setState({ shareStatus: message || "", shareStatusError: !!isError });
  if (!message) return;
  this._shareStatusTimer = setTimeout(() => {
    this.setState({ shareStatus: "", shareStatusError: false });
  }, 2400);
};

clearTranspositionNotice = () => {
  if (this._transpositionNoticeTimer) clearTimeout(this._transpositionNoticeTimer);
  this._transpositionNoticeTimer = null;
  this.setState({ transpositionNotice: null });
};

showTranspositionNotice = (notice) => {
  if (this._transpositionNoticeTimer) clearTimeout(this._transpositionNoticeTimer);
  this.setState({ transpositionNotice: notice || null });
  if (!notice) {
    this._transpositionNoticeTimer = null;
    return;
  }
  this._transpositionNoticeTimer = setTimeout(() => {
    this._transpositionNoticeTimer = null;
    this.setState({ transpositionNotice: null });
  }, 3200);
};

copyTextToClipboard = async (text, successMessage) => {
  const value = String(text || "");
  if (!value) {
    this.setShareStatus("Nothing to copy.", true);
    return;
  }

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(value);
    } else {
      const area = document.createElement("textarea");
      area.value = value;
      area.setAttribute("readonly", "readonly");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.focus();
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
    }
    this.setShareStatus(successMessage || "Copied.", false);
  } catch (_) {
    this.setShareStatus("Copy failed.", true);
  }
};

getShareUrlForLine = (line) => {
  if (!line) return "";
  const encoded = encodeSharedCustomLine(line, this.state.openingKey);
  if (!encoded) return "";
  const origin = window.location.origin || "";
  const base = "";
  const path = `${base}/#/openings`;
  return `${origin}${path}?opening=${encodeURIComponent(this.state.openingKey)}&customRep=${encodeURIComponent(encoded)}`;
};

copySanText = () => {
  this.copyTextToClipboard(lineToSanText(this.getLine()), "SAN copied.");
};

copyPgnText = () => {
  this.copyTextToClipboard(lineToPgn(this.getLine()), "PGN copied.");
};

copyFenText = () => {
  const fen = this.state.viewing ? this.state.viewFen : this.state.fen;
  this.copyTextToClipboard(fen || "", "FEN copied.");
};

shareCurrentRep = async () => {
  const line = this.getLine();
  const shareUrl = this.getShareUrlForLine(line);
  if (!shareUrl) {
    this.setShareStatus("Share link unavailable.", true);
    return;
  }

  try {
    if (navigator.share) {
      await navigator.share({
        title: line.name || "ChessDrills rep",
        text: line.name || "ChessDrills rep",
        url: shareUrl
      });
      this.setShareStatus("Share ready.", false);
      return;
    }
  } catch (_) {
    // fall through
  }

  this.copyTextToClipboard(shareUrl, "Share link copied.");
};

isCurrentLineCustom = () => {
  const lineId = String(this.state.lineId || "");
  if (!lineId) return false;
  return (this.state.customLines || []).some((line) => line && String(line.id || "") === lineId);
};

deleteCurrentCustomRep = () => {
  const line = this.getLine();
  if (!line || !this.isCurrentLineCustom()) return;

  const lineName = String(line.name || "this custom rep");
  const confirmed = window.confirm(`Delete "${lineName}"?`);
  if (!confirmed) return;

  const nextCustomLines = deleteCustomLineById(line.id);
  const remainingForOpening = nextCustomLines.filter((entry) => entry && entry.openingKey === this.state.openingKey);
  const builtInLines = ((this.getOpeningSet() || {}).lines || []).slice();
  const nextLines = builtInLines.concat(remainingForOpening);
  const fallbackLineId = pickRandomLineId(nextLines, line.id) || (nextLines[0] ? nextLines[0].id : "");
  const nextPicker = fallbackLineId || "random";

  this.setState({
    customLines: nextCustomLines,
    settingsOpen: false,
    lineMenuOpen: false,
    shareStatus: "",
    shareStatusError: false,
    lineId: fallbackLineId,
    linePicker: nextPicker,
    sessionLineId: null,
    practiceForceRepeat: false,
    learnForceRepeat: false,
    prevPracticeLineId: null,
    prevLearnLineId: null,
    learnRecentLineIds: []
  }, () => {
    if (fallbackLineId) this.resetLine(false);
  });
};

saveCustomModal = () => {
  const openingKey = this.state.openingKey;
  const nameRaw = String(this.state.customName || "").trim();
  const parsed = parseCustomLineInput(this.state.customMovesText);

  if (!parsed.ok) {
    this.setState({ customError: parsed.error || "Could not parse that input." });
    return;
  }

  const name = nameRaw || (parsed.format === "fen" ? "My saved position" : `My rep (${parsed.moves.length} moves)`);
  const nextLine = {
    id: makeCustomId(),
    openingKey: openingKey,
    category: "My Reps",
    name: name,
    description: "",
    moves: parsed.moves,
    explanations: parsed.moves.map(() => ""),
    sourceType: parsed.format
  };

  if (parsed.startFen) nextLine.startFen = parsed.startFen;
  if (parsed.sourcePgn) nextLine.sourcePgn = parsed.sourcePgn;

  const existing = (this.state.customLines || []).slice();
  const next = existing.concat([nextLine]);
  saveCustomLines(next);

  this.setState(
    {
      customLines: next,
      customModalOpen: false,
      customError: "",
      customDetectedFormat: "empty",
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

  getTranspositionMatchForFen = (fen, minStepIndex) => {
    const currentLine = this.getLine();
    return findTranspositionMatch({
      lines: this.getLines(),
      fen,
      minStepIndex,
      preferredLineId: currentLine && currentLine.id ? currentLine.id : this.state.lineId
    });
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
        lastMoveFeedback: null,
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

    if (key === "allowTranspositions" && !value) {
      if (this._transpositionNoticeTimer) clearTimeout(this._transpositionNoticeTimer);
      this._transpositionNoticeTimer = null;
      this.setState({ settings: next, transpositionNotice: null });
      return;
    }

    this.setState({ settings: next });
  };

  getPieceThemeUrl = () => {
    const k = (this.state.settings && this.state.settings.pieceTheme) ? String(this.state.settings.pieceTheme) : "default";
    const url = PIECE_THEMES && Object.prototype.hasOwnProperty.call(PIECE_THEMES, k) ? PIECE_THEMES[k] : null;
    if (!url) return undefined;
    const v = this.state.boardRenderToken || 0;
    // Cache-bust on remount to avoid stale piece images on some mobile browsers.
    const sep = url.includes("?") ? "&" : "?";
    return url + sep + "v=" + encodeURIComponent(String(v));
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
    const startFen = getLineStartFen(line);
    if (startFen !== "start") {
      try {
        g.load(startFen);
      } catch (_) {
        return "start";
      }
    }

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
      lastMoveFeedback: null,
      feedbackExpanded: false,
      completed: false,
      showHint: false
    });
  };

  resetLine = (keepUnlocked) => {
    const line = this.getLine();
    const startFen = getLineStartFen(line);

    if (startFen !== "start") {
      try {
        this.game.load(startFen);
      } catch (_) {
        this.game.reset();
      }
    } else {
      this.game.reset();
    }

    const currentFen = this.game.fen();

    this.setState(
      (prev) => ({
        fen: currentFen,
        boardRenderToken: (prev.boardRenderToken || 0) + 1,
        stepIndex: 0,
        viewing: false,
        viewIndex: 0,
        viewFen: currentFen,
        completed: false,
        mistakeUnlocked: keepUnlocked ? prev.mistakeUnlocked : false,
        lastMistake: null,
        lastMoveFeedback: null,
        feedbackExpanded: false,
        wrongAttempt: null,
        showHint: false,
        lastMove: null,
        selectedSquare: null,
        legalTargets: [],
        userHasPlayedThisLine: false,
        modePanelVisible: true,
        helpUsed: false,
        learnRewardPending: false,
        learnNextReady: false,
        transpositionNotice: null
      }),
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
        lastMoveFeedback: null,
        completed: false,
        wrongAttempt: null,
        showHint: false,
        lastMove: null,
        userHasPlayedThisLine: false,
        modePanelVisible: true,
        helpUsed: false,
        drillRunDead: false,
        transpositionNotice: null
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
        lastMoveFeedback: null,
        completed: false,
        wrongAttempt: null,
        showHint: false,
        lastMove: null,
        userHasPlayedThisLine: false,
        modePanelVisible: true,
        helpUsed: false,
        learnRewardPending: false,
        learnNextReady: false,
        drillRunDead: false,
        transpositionNotice: null
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
    const lines = this.getLines();
    const orderedIds = getOrderedLineIdsForLines(openingKey, lines);
    const shouldAdvancePastCurrent = _reason === "next_button" || _reason === "mode_continue" || _reason === "mode_reselect";

    let nextId = "";
    if (this.state.learnForceRepeat && this.state.lineId) {
      nextId = String(this.state.lineId);
    } else {
      nextId = pickNextOrderedLearnLineId({
        openingKey,
        lines,
        learnProgress: this.state.learnProgress,
        currentLineId: shouldAdvancePastCurrent ? this.state.lineId : null,
        advancePastCurrent: shouldAdvancePastCurrent
      });
    }

    const safeNextId = nextId || (orderedIds && orderedIds.length ? orderedIds[0] : null);
    if (!safeNextId) return;

    this.setState(
      {
        lineId: safeNextId,
        sessionLineId: safeNextId,
        linePicker: "random",
        learnForceRepeat: false,
        prevLearnLineId: this.state.lineId,
        learnRecentLineIds: [],
        mistakeUnlocked: false,
        lastMistake: null,
        lastMoveFeedback: null,
        completed: false,
        wrongAttempt: null,
        showHint: false,
        lastMove: null,
        userHasPlayedThisLine: false,
        modePanelVisible: true,
        helpUsed: false,
        learnRewardPending: false,
        learnNextReady: false,
        drillRunDead: false,
        transpositionNotice: null
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
  nextId = pickNextOrderedLearnLineId({
    openingKey: nextKey,
    lines: nextLines,
    learnProgress: this.state.learnProgress
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
        lastMoveFeedback: null,
        completed: false,
        wrongAttempt: null,
        showHint: false,
        lastMove: null,
        userHasPlayedThisLine: false,
        modePanelVisible: true,
        helpUsed: false,
        drillRunDead: false,
        transpositionNotice: null
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
        lastMoveFeedback: null,
        completed: false,
        wrongAttempt: null,
        showHint: false,
        lastMove: null,
        userHasPlayedThisLine: false,
        modePanelVisible: true,
        helpUsed: false,
        drillRunDead: false,
        transpositionNotice: null
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

  const wasClean = mode === "learn"
    ? !this.state.mistakeUnlocked
    : !this.state.mistakeUnlocked && !this.state.helpUsed;

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
    const flags = typeof move.flags === "string" ? move.flags : "";
    const isCapture = flags.includes("c") || flags.includes("e");

    if (playedSAN !== expected) {
      const allowTranspositions = !!(this.state.settings && this.state.settings.allowTranspositions);
      const transpositionMatch = allowTranspositions ? this.getTranspositionMatchForFen(this.game.fen(), this.state.stepIndex + 1) : null;

      if (transpositionMatch) {
        const matchedLine = this.getLines().find((entry) => entry && entry.id === transpositionMatch.lineId) || line;
        const matchedExpected = (matchedLine && matchedLine.moves && matchedLine.moves[transpositionMatch.matchedMoveIndex]) || transpositionMatch.matchedSan || playedSAN;
        const matchedFeedback = this.resolveMoveFeedback({
          line: matchedLine,
          index: transpositionMatch.matchedMoveIndex,
          expectedSan: matchedExpected,
          playedSan: playedSAN,
          isCorrect: true
        });
        const nextLinePicker = this.state.linePicker === "random" ? "random" : transpositionMatch.lineId;
        const previousLineId = line && line.id ? String(line.id) : "";
        const nextLineId = transpositionMatch.lineId ? String(transpositionMatch.lineId) : "";
        const nextLineNumber = nextLineId ? getLineNumberForLines(this.state.openingKey, this.getLines(), nextLineId) : null;
        const showLineNotice = previousLineId && nextLineId && previousLineId !== nextLineId;
        const transpositionNotice = showLineNotice
          ? {
              text: `You transposed into ${nextLineNumber ? `line #${nextLineNumber}` : "another line"}.`
            }
          : null;

        this.setState(
          {
            fen: this.game.fen(),
            lineId: transpositionMatch.lineId,
            sessionLineId: transpositionMatch.lineId,
            linePicker: nextLinePicker,
            stepIndex: transpositionMatch.stepIndex,
            completed: false,
            lastMistake: null,
            lastMoveFeedback: matchedFeedback,
            feedbackExpanded: false,
            wrongAttempt: null,
            showHint: false,
            solveArmed: false,
            hintFromSquare: null,
            selectedSquare: null,
            legalTargets: [],
            lastMove: { from: sourceSquare, to: targetSquare },
            userHasPlayedThisLine: true,
            modePanelVisible: false,
            transpositionNotice: transpositionNotice
          },
          () => {
            if (showLineNotice) {
              this.showTranspositionNotice(transpositionNotice);
            } else if (this.state.transpositionNotice) {
              this.clearTranspositionNotice();
            }
            this.playSfx(isCapture ? "capture" : "moveSelf");
            this.playAutoMovesIfNeeded();
          }
        );

        return;
      }

      this.playSfx("illegal");

      this.bumpMistakeForMode();
      this.game.undo();

      const wrongFeedback = this.resolveMoveFeedback({
        line,
        index: this.state.stepIndex,
        expectedSan: expected,
        playedSan: playedSAN,
        isCorrect: false
      });

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
            explanation: wrongFeedback.text
          },
          lastMoveFeedback: wrongFeedback,
          feedbackExpanded: false,
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
          explanation: wrongFeedback.text
        },
        lastMoveFeedback: wrongFeedback,
        feedbackExpanded: false,
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

    this.playSfx(isCapture ? "capture" : "moveSelf");

    const nextStep = this.state.stepIndex + 1;

    const correctFeedback = this.resolveMoveFeedback({
      line,
      index: this.state.stepIndex,
      expectedSan: expected,
      playedSan: playedSAN,
      isCorrect: true
    });

    this.setState(
      {
        fen: this.game.fen(),
        stepIndex: nextStep,
        lastMistake: null,
        lastMoveFeedback: correctFeedback,
        feedbackExpanded: false,
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

parseSquareLabel = (label) => {
  const match = String(label || "").match(/(?<=\{\{square )[a-h][1-8](?=\}\})/i);
  return match ? match[0].toLowerCase() : null;
};

parsePieceLabel = (label) => {
  const match = String(label || "").match(/(?<=\{\{)(king|queen|rook|bishop|knight|pawn) ([a-h][1-8])( full)?(?=\}\})/i);
  if (!match) return null;

  return {
    role: String(match[1] || "").toLowerCase(),
    square: String(match[2] || "").toLowerCase(),
    full: !!match[3]
  };
};

tokenizeExplanation = (text) => {
  if (!text) return [];

  return String(text)
    .split(/(\{\{.+?\}\})/)
    .filter((part) => part !== "")
    .map((part) => {
      const square = this.parseSquareLabel(part);
      if (square) return { type: "square", square };

      const piece = this.parsePieceLabel(part);
      if (piece) return { type: "piece", ...piece };

      return {
        type: "text",
        text: String(part)
          .replace(/(\{\{|\}\})/g, "")
          .replace(/( |^)[a-h][1-8]( |$)/g, (value) => value.toLowerCase())
      };
    });
};

getExplanationTokenText = (token) => {
  if (!token) return "";
  if (token.type === "square") return token.square;
  if (token.type !== "piece") return token.text || "";

  const roleShort = {
    king: "K",
    queen: "Q",
    rook: "R",
    bishop: "B",
    knight: "N",
    pawn: ""
  };

  if (token.full) return `${token.role} on ${token.square}`;
  return `${roleShort[token.role] || ""}${token.square}`;
};

handleExplanationTokenClick = (token) => {
  if (!token || (token.type !== "square" && token.type !== "piece")) return;

  const nextSquare = token.square;
  const nextKind = token.type === "piece" ? "piece" : "square";

  this.setState((prev) => {
    const current = prev.coachHighlight;
    const isSame = current && current.square === nextSquare && current.kind === nextKind;
    return { coachHighlight: isSame ? null : { square: nextSquare, kind: nextKind } };
  });
};

renderExplanationTokens = (text) => {
  const tokens = this.tokenizeExplanation(text);
  if (!tokens.length) return text || "";

  return tokens.map((token, index) => {
    if (token.type === "text") {
      return <React.Fragment key={`text-${index}`}>{token.text}</React.Fragment>;
    }

    const isActive =
      this.state.coachHighlight &&
      this.state.coachHighlight.square === token.square &&
      this.state.coachHighlight.kind === token.type;
    const className = `ot-inline-token ot-inline-token-${token.type}${isActive ? " is-active" : ""}`;

    return (
      <button
        key={`${token.type}-${token.square}-${index}`}
        type="button"
        className={className}
        onClick={() => this.handleExplanationTokenClick(token)}
        title={token.type === "piece" ? `Highlight ${token.role} on ${token.square}` : `Highlight ${token.square}`}
      >
        {this.getExplanationTokenText(token)}
      </button>
    );
  });
};


getFeedbackEntry = (line, index) => {
  if (!line || index == null || index < 0) return null;

  if (Array.isArray(line.feedback) && line.feedback[index]) {
    return line.feedback[index];
  }

  const correct = Array.isArray(line.correctFeedback) ? line.correctFeedback[index] : "";
  const wrong = Array.isArray(line.wrongFeedback) ? line.wrongFeedback[index] : "";
  const tags = Array.isArray(line.feedbackTags) ? line.feedbackTags[index] : [];

  if (!correct && !wrong) return null;
  return { correct, wrong, tags: Array.isArray(tags) ? tags : [] };
};

resolveMoveFeedback = ({ line, index, expectedSan, playedSan, isCorrect }) => {
  const entry = this.getFeedbackEntry(line, index) || {};
  const explanation = this.sanitizeExplanation((line && line.explanations && line.explanations[index]) || "", expectedSan);

  const normalizedEntry = {
    ...entry,
    why: entry.why || explanation || entry.correct || "",
    correct: entry.correct || explanation || "This move follows the main idea of the position.",
    wrong: entry.wrong || "The position had a stronger continuation.",
    wrongYourMove: entry.wrongYourMove || "Your move looked playable, but it missed the priority of the position.",
    wrongMissed: entry.wrongMissed || explanation || "The stronger move kept the main idea of the position.",
    severity: entry.severity || "Inaccuracy"
  };

  return buildMoveFeedback(normalizedEntry, {
    expectedSan,
    playedSan,
    isCorrect
  });
};

toggleFeedbackExpanded = () => {
  this.setState((prev) => ({ feedbackExpanded: !prev.feedbackExpanded }));
};

getExpectedMovePreview = (expectedSan, fenOverride = null) => {
  if (!expectedSan) return null;

  try {
    const fen = fenOverride || this.state.fen;
    const normalizedFen = !fen || fen === "start" ? null : fen;
    const g = normalizedFen ? new Chess(normalizedFen) : new Chess();
    const beforeFen = normalizedFen || "start";
    const mv = g.move(expectedSan, { sloppy: true });

    if (!mv) return null;

    return {
      san: expectedSan,
      beforeFen: beforeFen,
      afterFen: g.fen(),
      from: mv.from || null,
      to: mv.to || null
    };
  } catch (_) {
    return null;
  }
};

clearFeedbackPreviewTimers = () => {
  if (this._feedbackPreviewTimer) {
    clearTimeout(this._feedbackPreviewTimer);
    this._feedbackPreviewTimer = null;
  }

  if (this._feedbackPreviewReplayTimer) {
    clearTimeout(this._feedbackPreviewReplayTimer);
    this._feedbackPreviewReplayTimer = null;
  }
};

scheduleFeedbackPreviewReplay = (expectedSan) => {
  this.clearFeedbackPreviewTimers();

  this._feedbackPreviewTimer = setTimeout(() => {
    this.setState((prev) => {
      if (!prev.feedbackPreview || prev.feedbackPreview.san !== expectedSan) return null;
      return { feedbackPreviewPosition: "after" };
    });

    this._feedbackPreviewReplayTimer = setTimeout(() => {
      this.setState((prev) => {
        if (!prev.feedbackPreview || prev.feedbackPreview.san !== expectedSan) return null;
        return { feedbackPreviewPosition: "before" };
      }, () => {
        if (!this.state.feedbackPreview || this.state.feedbackPreview.san !== expectedSan) return;
        this.scheduleFeedbackPreviewReplay(expectedSan);
      });
    }, 5000);
  }, 360);
};

openFeedbackPreview = (expectedSan) => {
  const preview = this.getExpectedMovePreview(expectedSan);
  if (!preview) return;

  this.clearFeedbackPreviewTimers();

  this.setState({
    feedbackPreview: preview,
    feedbackPreviewPosition: "before"
  }, () => {
    this.scheduleFeedbackPreviewReplay(expectedSan);
  });
};

closeFeedbackPreview = () => {
  this.clearFeedbackPreviewTimers();

  this.setState({
    feedbackPreview: null,
    feedbackPreviewPosition: "before"
  });
};

renderFeedbackPreviewPopover = (expectedSan) => {
  const preview = this.state.feedbackPreview;
  if (!preview || preview.san !== expectedSan) return null;

  const boardFen = this.state.feedbackPreviewPosition === "after"
    ? preview.afterFen
    : preview.beforeFen;

  const squareStyles = {};

  if (preview.from) {
    squareStyles[preview.from] = {
      boxShadow: "inset 0 0 0 3px rgba(126, 196, 255, 0.9)"
    };
  }

  if (preview.to) {
    squareStyles[preview.to] = {
      backgroundImage: "radial-gradient(circle at center, rgba(255, 225, 120, 0.98) 0 18%, rgba(255, 225, 120, 0.28) 19 38%, rgba(0,0,0,0) 39%)",
      backgroundRepeat: "no-repeat",
      backgroundPosition: "center",
      backgroundSize: "100% 100%",
      boxShadow: "inset 0 0 0 3px rgba(255, 225, 120, 0.95)"
    };
  }

  return (
    <div className="ot-feedback-preview-popover">
      <div className="ot-feedback-preview-top">
        <span className="ot-feedback-preview-label">Preview</span>
        <span className="ot-feedback-preview-move">{expectedSan}</span>
      </div>
      <div className="ot-feedback-preview-board">
        <Chessboard
          width={150}
          position={boardFen || "start"}
          orientation={this.getPlayerColor() === "b" ? "black" : "white"}
          draggable={false}
          allowDrag={() => false}
          showNotation={false}
          squareStyles={squareStyles}
          pieceTheme={this.getPieceThemeUrl()}
          {...BOARD_THEMES[this.state.settings.boardTheme || DEFAULT_THEME]}
        />
      </div>
      <div className="ot-feedback-preview-copy">
        {this.state.feedbackPreviewPosition === "after"
          ? ""
          : ""}
      </div>
    </div>
  );
};

getOpeningPuzzles = (openingKey) => {
  return getOpeningPuzzlePack(openingKey || this.state.openingKey);
};

getPuzzleProgressStorageKey = (openingKey) => `chessdrills:puzzleProgress:${openingKey || this.state.openingKey}`;

loadSavedPuzzleIndex = (openingKey) => {
  try {
    const raw = window.localStorage.getItem(this.getPuzzleProgressStorageKey(openingKey));
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
  } catch (_) {
    return null;
  }
};

saveSavedPuzzleIndex = (openingKey, index) => {
  try {
    window.localStorage.setItem(this.getPuzzleProgressStorageKey(openingKey), String(Math.max(0, Number(index) || 0)));
  } catch (_) {}
};

clearSavedPuzzleIndex = (openingKey) => {
  try {
    window.localStorage.removeItem(this.getPuzzleProgressStorageKey(openingKey));
  } catch (_) {}
};

onPuzzleModeSelect = (e) => {
  const nextMode = e && e.target ? e.target.value : 'puzzles';
  if (!nextMode) return;
  this.setGameMode(nextMode);
};

onPuzzleHintOrSolve = () => {
  if ((this.state.gameMode || 'learn') !== 'puzzles') return;
  if (this.state.puzzleSolved || this.state.puzzleWrongAttempt) return;

  const expected = this.state.puzzleSolution[this.state.puzzleMoveIndex];
  if (!expected) return;

  const fromSquare = String(expected).slice(0, 2);
  const toSquare = String(expected).slice(2, 4);
  const promotion = String(expected).length > 4 ? String(expected).slice(4, 5).toLowerCase() : undefined;

  if (this.state.puzzleHintArmed) {
    this.tryPuzzleMove({ from: fromSquare, to: toSquare, promotion });
    return;
  }

  this.setState({
    puzzleHintArmed: true,
    puzzleSelectedSquare: fromSquare,
    puzzleLegalTargets: toSquare ? [toSquare] : [],
    puzzleStatus: 'Hint: start with the highlighted piece.'
  });
};

loadPuzzleForOpening = (openingKey, opts) => {
  if (this._autoNextTimer) clearTimeout(this._autoNextTimer);
  if (this._confettiTimer) clearTimeout(this._confettiTimer);

  const pack = this.getOpeningPuzzles(openingKey);
  const options = opts || {};
  if (!Array.isArray(pack) || pack.length === 0) {
    this.setState({
      puzzlePackSize: 0,
      puzzleIndex: 0,
      puzzleRawId: "",
      puzzleSource: "",
      puzzleRating: 0,
      puzzleThemes: [],
      puzzleFen: "start",
      puzzlePlayerColor: "w",
      puzzleSolution: [],
      puzzleMoveIndex: 0,
      puzzleSolved: false,
      puzzleStatus: "",
      puzzleMistakes: 0,
      puzzleWrongAttempt: null,
      puzzleSelectedSquare: null,
      puzzleLegalTargets: [],
      puzzleHintArmed: false,
      confettiActive: false
    });
    return;
  }

  const max = pack.length;
  const savedIndex = this.loadSavedPuzzleIndex(openingKey);
  const nextIndex = Number.isInteger(options.index)
    ? Math.max(0, Math.min(options.index, max - 1))
    : Number.isInteger(savedIndex)
    ? Math.max(0, Math.min(savedIndex, max - 1))
    : options.resetIndex
    ? 0
    : ((Number(this.state.puzzleIndex) || 0) % max);

  const rawPuzzle = pack[nextIndex];
  const prepared = preparePuzzle(rawPuzzle);
  if (!prepared) {
    this.setState({
      puzzlePackSize: max,
      puzzleIndex: nextIndex,
      puzzleStatus: "This puzzle could not be loaded.",
      puzzleSolved: false,
      puzzleWrongAttempt: null,
      puzzleSelectedSquare: null,
      puzzleLegalTargets: []
    });
    return;
  }

  this.saveSavedPuzzleIndex(openingKey, nextIndex);

  this.setState({
    puzzlePackSize: max,
    puzzleIndex: nextIndex,
    puzzleRawId: rawPuzzle.id || "",
    puzzleSource: rawPuzzle.source || "Lichess",
    puzzleRating: Number(rawPuzzle.rating) || 0,
    puzzleThemes: Array.isArray(rawPuzzle.themes) ? rawPuzzle.themes : [],
    puzzleFen: prepared.startFen,
    puzzlePlayerColor: prepared.playerColor || "w",
    puzzleSolution: prepared.solution || [],
    puzzleMoveIndex: 0,
    puzzleSolved: false,
    puzzleStatus: "",
    puzzleMistakes: 0,
    puzzleWrongAttempt: null,
    puzzleSelectedSquare: null,
    puzzleLegalTargets: [],
    puzzleHintArmed: false,
    confettiActive: false
  });
};

prevPuzzle = () => {
  const pack = this.getOpeningPuzzles(this.state.openingKey);
  if (!Array.isArray(pack) || pack.length === 0) return;
  const currentIndex = Math.max(0, Number(this.state.puzzleIndex) || 0);
  const prevIndex = Math.max(0, currentIndex - 1);
  this.loadPuzzleForOpening(this.state.openingKey, { index: prevIndex });
};

nextPuzzle = () => {
  const pack = this.getOpeningPuzzles(this.state.openingKey);
  if (!Array.isArray(pack) || pack.length === 0) return;
  const nextIndex = (((Number(this.state.puzzleIndex) || 0) + 1) % pack.length);
  this.loadPuzzleForOpening(this.state.openingKey, { index: nextIndex });
};

retryPuzzle = () => {
  this.loadPuzzleForOpening(this.state.openingKey, { index: Number(this.state.puzzleIndex) || 0 });
};

resetPuzzleProgress = () => {
  this.clearSavedPuzzleIndex(this.state.openingKey);
  this.loadPuzzleForOpening(this.state.openingKey, { index: 0, resetIndex: true });
};

tryPuzzleMove = (move) => {
  if (!move || this.state.puzzleSolved || this.state.puzzleWrongAttempt) return;
  const expected = this.state.puzzleSolution[this.state.puzzleMoveIndex];
  if (!expected) return;

  if (!moveMatchesUci(move, expected)) {
    this.playSfx("illegal");
    this.setState((prev) => ({
      puzzleStatus: "Wrong move. Retry the puzzle.",
      puzzleMistakes: (Number(prev.puzzleMistakes) || 0) + 1,
      puzzleWrongAttempt: {
        from: move && move.from ? move.from : null,
        to: move && move.to ? move.to : null
      },
      puzzleSelectedSquare: null,
      puzzleLegalTargets: [],
      puzzleHintArmed: false,
      confettiActive: false
    }));
    return;
  }

  const game = new Chess(this.state.puzzleFen);
  const played = game.move(move);
  if (!played) return;

  let nextIndex = (Number(this.state.puzzleMoveIndex) || 0) + 1;
  let solved = nextIndex >= this.state.puzzleSolution.length;
  let status = solved ? "Solved." : "Good. Find the next move.";

  if (!solved) {
    const reply = this.state.puzzleSolution[nextIndex];
    const replyPlayed = game.move({
      from: String(reply || "").slice(0, 2),
      to: String(reply || "").slice(2, 4),
      promotion: String(reply || "").length > 4 ? String(reply || "").slice(4, 5).toLowerCase() : undefined
    });
    if (replyPlayed) nextIndex += 1;
    solved = nextIndex >= this.state.puzzleSolution.length;
    status = solved ? "Solved." : "Keep going.";
  }

  this.playSfx(solved ? "capture" : "moveSelf");

  if (solved) {
    if (this._autoNextTimer) clearTimeout(this._autoNextTimer);
    if (this._confettiTimer) clearTimeout(this._confettiTimer);

    const wantsConfetti = !!(this.state.settings && this.state.settings.showConfetti);
    const nextPuzzleDelay = wantsConfetti ? 1200 : 450;

    this.setState({
      puzzleFen: game.fen(),
      puzzleMoveIndex: nextIndex,
      puzzleSolved: true,
      puzzleStatus: status,
      puzzleWrongAttempt: null,
      puzzleSelectedSquare: null,
      puzzleLegalTargets: [],
      puzzleHintArmed: false,
      confettiActive: wantsConfetti
    });

    if (wantsConfetti) {
      this._confettiTimer = setTimeout(() => {
        this.setState({ confettiActive: false });
      }, 1200);
    }

    this._autoNextTimer = setTimeout(() => {
      this.nextPuzzle();
    }, nextPuzzleDelay);
    return;
  }

  this.setState({
    puzzleFen: game.fen(),
    puzzleMoveIndex: nextIndex,
    puzzleSolved: false,
    puzzleStatus: status,
    puzzleWrongAttempt: null,
    puzzleSelectedSquare: null,
    puzzleLegalTargets: [],
    puzzleHintArmed: false
  });
};

onPuzzleDrop = ({ sourceSquare, targetSquare, piece }) => {
  if (this.state.puzzleWrongAttempt) return null;
  if (!sourceSquare || !targetSquare || !piece) return null;
  let promotion;
  if ((piece === "wP" && targetSquare.endsWith("8")) || (piece === "bP" && targetSquare.endsWith("1"))) {
    promotion = "q";
  }
  this.tryPuzzleMove({ from: sourceSquare, to: targetSquare, promotion });
  return null;
};

onPuzzleSquareClick = (square) => {
  if (this.state.puzzleWrongAttempt) return;
  if (!square) return;
  const currentFen = this.state.puzzleFen || "start";
  const selected = this.state.puzzleSelectedSquare;
  const turn = this.state.puzzlePlayerColor || "w";
  const pieceColor = getSquarePieceColor(currentFen, square);

  if (!selected) {
    if (pieceColor === turn) {
      this.setState({
        puzzleSelectedSquare: square,
        puzzleLegalTargets: getLegalTargets(currentFen, square)
      });
    }
    return;
  }

  if (selected === square) {
    this.setState({ puzzleSelectedSquare: null, puzzleLegalTargets: [] });
    return;
  }

  if (pieceColor === turn) {
    this.setState({
      puzzleSelectedSquare: square,
      puzzleLegalTargets: getLegalTargets(currentFen, square)
    });
    return;
  }

  let promotion;
  if ((turn === "w" && selected && square.endsWith("8")) || (turn === "b" && selected && square.endsWith("1"))) {
    promotion = "q";
  }
  this.tryPuzzleMove({ from: selected, to: square, promotion });
};

renderPuzzleMode = () => {
  const opening = OPENING_SETS[this.state.openingKey] || {};
  const openingLabel = (opening && (opening.name || opening.title || opening.label)) || this.state.openingKey;
  const tags = getOpeningPuzzleTagHints(this.state.openingKey);
  const mobileViewportWidth = (() => {
    try {
      return typeof window !== "undefined" ? Number(window.innerWidth) || 0 : 0;
    } catch (_) {
      return 0;
    }
  })();
  const mobilePuzzleBoardMaxWidth = this.state.isMobile
    ? Math.max(260, mobileViewportWidth - 40)
    : 0;
  const boardWidth = this.state.isMobile
    ? Math.min(this.state.mobileBoardSize || this.state.boardSize, mobilePuzzleBoardMaxWidth || (this.state.mobileBoardSize || this.state.boardSize))
    : this.state.boardSize;
  const currentMode = this.state.gameMode || "learn";
  const modeClass = ` ot-mode-${currentMode}`;
  const hasPack = this.state.puzzlePackSize > 0;
  const puzzleStatus = this.state.puzzleStatus || (this.state.puzzleSolved ? "Solved." : "Solve the puzzle.");
  const currentPuzzleNumber = hasPack ? this.state.puzzleIndex + 1 : 0;
  const packProgressPct = hasPack ? Math.max(0, Math.min(100, Math.round((currentPuzzleNumber / this.state.puzzlePackSize) * 100))) : 0;
  const squareStyles = {};
  const selected = this.state.puzzleSelectedSquare;
  if (selected) {
    squareStyles[selected] = {
      boxShadow: "inset 0 0 0 3px rgba(69, 208, 123, 0.9)"
    };
  }
  if (this.state.puzzleLegalTargets && this.state.puzzleLegalTargets.length) {
    for (const toSq of this.state.puzzleLegalTargets) {
      squareStyles[toSq] = {
        ...(squareStyles[toSq] || {}),
        backgroundImage: "radial-gradient(circle at center, rgba(69, 208, 123, 0.72) 18%, rgba(0,0,0,0) 20%)",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        backgroundSize: "100% 100%"
      };
    }
  }
  if (this.state.puzzleWrongAttempt && this.state.puzzleWrongAttempt.to) {
    squareStyles[this.state.puzzleWrongAttempt.to] = {
      ...(squareStyles[this.state.puzzleWrongAttempt.to] || {}),
      backgroundImage: `url("${X_SVG_DATA_URI}")`,
      backgroundRepeat: "no-repeat",
      backgroundPosition: "center",
      backgroundSize: "70%",
      boxShadow: "inset 0 0 0 999px rgba(255, 64, 64, 0.16)"
    };
  }

  const puzzleBoard = (
    <div className="ot-board">
      <BoardErrorBoundary onReset={this.resetBoardRender}>
        <Chessboard
          key={`puzzle:${this.state.puzzleRawId || "none"}:${this.state.puzzleMoveIndex || 0}:${this.state.puzzleFen || "start"}`}
          width={boardWidth}
          position={this.state.puzzleFen || "start"}
          onDrop={this.onPuzzleDrop}
          allowDrag={({ piece }) => {
            if (this.state.puzzleWrongAttempt || this.state.puzzleSolved) return false;
            const turn = this.state.puzzlePlayerColor || "w";
            return !!piece && piece[0].toLowerCase() === turn;
          }}
          orientation={(this.state.puzzlePlayerColor || "w") === "b" ? "black" : "white"}
          showNotation={true}
          squareStyles={squareStyles}
          onSquareClick={this.onPuzzleSquareClick}
          onSquareRightClick={this.onSquareRightClick}
          pieceTheme={this.getPieceThemeUrl()}
          {...BOARD_THEMES[this.state.settings.boardTheme || DEFAULT_THEME]}
        />
      </BoardErrorBoundary>
    </div>
  );

  const desktopModeBar = (
    <div className="ot-mode-panel-puzzles ot-puzzle-modebar ot-puzzle-modebar-compact">
      <button className={"ot-puzzle-modebtn" + (currentMode === "learn" ? " active" : "")} onClick={() => this.setGameMode("learn")} type="button">
        <span className="ot-puzzle-modebtn-label">Learn</span>
      </button>
      <button className={"ot-puzzle-modebtn" + (currentMode === "practice" ? " active" : "") + (!this.props.isMember ? " locked" : "")} onClick={() => (this.props.isMember ? this.setGameMode("practice") : this.openMemberGate("practice"))} type="button">
        <span className="ot-puzzle-modebtn-label">Practice</span>
      </button>
      <button className={"ot-puzzle-modebtn" + (currentMode === "drill" ? " active" : "") + (!this.props.isMember ? " locked" : "")} onClick={() => (this.props.isMember ? this.setGameMode("drill") : this.openMemberGate("drill"))} type="button">
        <span className="ot-puzzle-modebtn-label">Drill</span>
      </button>
      <button className={"ot-puzzle-modebtn" + (currentMode === "puzzles" ? " active" : "")} onClick={() => this.setGameMode("puzzles")} type="button">
        <span className="ot-puzzle-modebtn-label">Puzzles</span>
      </button>
    </div>
  );

  const mobileMenu = this.state.mobileHeaderMenu ? (
    <div className="ot-mobile-menu ot-puzzle-mobile-menu" onClick={(e) => e.stopPropagation()}>
      {this.state.mobileHeaderMenu === "mode" ? (
        <>
          <div className="ot-puzzle-mobile-menu-title">Mode</div>
          <div className="ot-puzzle-mobile-menu-list">
            <button className={"ot-puzzle-mobile-menu-item" + (currentMode === "learn" ? " active" : "")} type="button" onClick={() => { this.setGameMode("learn"); this.closeMobileHeaderMenu(); }}>
              <span><span role="img" aria-label="learn">📘</span> Learn</span>
            </button>
            <button className={"ot-puzzle-mobile-menu-item" + (currentMode === "practice" ? " active" : "") + (!this.props.isMember ? " locked" : "")} type="button" onClick={() => { if (this.props.isMember) this.setGameMode("practice"); else this.openMemberGate("practice"); this.closeMobileHeaderMenu(); }}>
              <span><span role="img" aria-label="practice">🎯</span> Practice</span>
            </button>
            <button className={"ot-puzzle-mobile-menu-item" + (currentMode === "drill" ? " active" : "") + (!this.props.isMember ? " locked" : "")} type="button" onClick={() => { if (this.props.isMember) this.setGameMode("drill"); else this.openMemberGate("drill"); this.closeMobileHeaderMenu(); }}>
              <span><span role="img" aria-label="drill">🔥</span> Drill</span>
            </button>
            <button className={"ot-puzzle-mobile-menu-item" + (currentMode === "puzzles" ? " active" : "")} type="button" onClick={() => { this.setGameMode("puzzles"); this.closeMobileHeaderMenu(); }}>
              <span><span role="img" aria-label="puzzles">🧩</span> Puzzles</span>
            </button>
            {hasPack ? (
              <>
                <button className="ot-puzzle-mobile-menu-item" type="button" onClick={() => { this.retryPuzzle(); this.closeMobileHeaderMenu(); }}>
                  <span>Retry puzzle</span>
                </button>
                <button className="ot-puzzle-mobile-menu-item" type="button" onClick={() => { this.resetPuzzleProgress(); this.closeMobileHeaderMenu(); }} disabled={currentPuzzleNumber <= 1}>
                  <span>Reset progress</span>
                </button>
              </>
            ) : null}
          </div>
        </>
      ) : (
        <>
          <div className="ot-puzzle-mobile-menu-title">Opening</div>
          <select
            className="ot-select ot-puzzle-mobile-menu-select"
            value={this.state.openingKey}
            onChange={(e) => {
              this.setOpeningKey(e);
              this.closeMobileHeaderMenu();
            }}
          >
            {Object.keys(OPENING_SETS).map((k) => {
              const s = OPENING_SETS[k];
              const label = (s && (s.name || s.title || s.label)) || k;
              return <option key={k} value={k}>{label}</option>;
            })}
          </select>
        </>
      )}
    </div>
  ) : null;

  if (this.state.isMobile) {
    return (
      <div className={"ot-container ot-mobile ot-puzzle-mobile-root" + modeClass}>
        <div className="ot-puzzle-mobile-shell">
          {mobileMenu}

          <div className="ot-puzzle-mobile-topbar">
            <div className="ot-puzzle-mobile-topbar-left">
              <button className="ot-icon-btn ot-mobile-back ot-puzzle-mobile-back" onClick={this.goHome} title="Back" aria-label="Back">
                ←
              </button>
              <div className="ot-puzzle-mobile-titleblock">
                <div className="ot-puzzle-mobile-kicker"><span role="img" aria-label="puzzles">🧩</span> Puzzles</div>
                <button className="ot-puzzle-mobile-openingbtn" type="button" onClick={() => this.toggleMobileHeaderMenu("opening")}>
                  {openingLabel}
                </button>
              </div>
            </div>
            <div className="ot-puzzle-mobile-count">
              {hasPack ? `Puzzle ${currentPuzzleNumber} of ${this.state.puzzlePackSize}` : "No pack loaded"}
            </div>
          </div>

          <div className="ot-puzzle-mobile-progress">
            <div className="ot-progress-bar ot-progress-bar-top">
              <div className="ot-progress-fill ot-progress-fill-puzzles" style={{ width: packProgressPct + "%" }} />
            </div>
          </div>

          {hasPack ? (
            <div className="ot-puzzle-mobile-statuswrap">
              <div className={"ot-puzzle-status ot-puzzle-status-mobile" + (this.state.puzzleSolved ? " solved" : "")}>{puzzleStatus}</div>
            </div>
          ) : (
            <div className="ot-puzzle-mobile-statuswrap">
              <div className="ot-puzzle-empty-title">No local pack available.</div>
              <div className="ot-puzzle-empty-copy">Generate the pack, then reload this page.</div>
              {tags && tags.length ? (
                <div className="ot-puzzle-tags ot-puzzle-tags-compact ot-puzzle-tags-mobile">
                  {tags.slice(0, 3).map((tag) => <span key={tag} className="ot-puzzle-tag">{tag}</span>)}
                </div>
              ) : null}
            </div>
          )}

          <div className="ot-puzzle-mobile-boardcard">
            {puzzleBoard}
          </div>

          {hasPack ? (
            <div className="ot-puzzle-mobile-dock">
              <div className="ot-puzzle-mobile-dock-left">
                <button
                  className={"ot-icon-btn ot-mobile-icon ot-compact-icon-btn" + (this.state.puzzleHintArmed ? " ot-hint-btn-on" : "")}
                  type="button"
                  onClick={this.onPuzzleHintOrSolve}
                  title={this.state.puzzleHintArmed ? "Solve" : "Hint"}
                  aria-label={this.state.puzzleHintArmed ? "Solve" : "Hint"}
                  disabled={!!this.state.puzzleWrongAttempt}
                >
                  <span aria-hidden="true">{this.state.puzzleHintArmed ? "✓" : "💡"}</span>
                </button>
                <button
                  className="ot-icon-btn ot-mobile-icon ot-compact-icon-btn"
                  type="button"
                  onClick={this.retryPuzzle}
                  title="Retry"
                  aria-label="Retry"
                >
                  <span aria-hidden="true">↻</span>
                </button>
              </div>
              <div className="ot-puzzle-mobile-dock-center">
                <button className="ot-button ot-button-small ot-puzzle-mobile-dockbtn" type="button" onClick={() => this.toggleMobileHeaderMenu("mode")}>Mode</button>
              </div>
              <div className="ot-puzzle-mobile-dock-right">
                <button className="ot-icon-btn" type="button" onClick={this.prevPuzzle} disabled={currentPuzzleNumber <= 1}>‹</button>
                <button className="ot-icon-btn" type="button" onClick={this.nextPuzzle}>›</button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className={"ot-container" + modeClass}>
      <TopNav title="Chess Opening Drills" />

      <div className="ot-top-line ot-puzzle-topline">
        <div className="ot-progress-bar ot-progress-bar-top">
          <div className="ot-progress-fill ot-progress-fill-puzzles" style={{ width: packProgressPct + "%" }} />
        </div>
      </div>

      <div className="ot-puzzle-shell ot-puzzle-shell-compact">
        <div className="ot-puzzle-header ot-puzzle-header-compact">
          <div className="ot-puzzle-header-main">
            <div className="ot-puzzle-heading">{openingLabel}</div>
            <div className="ot-puzzle-heading-meta">
              {hasPack ? `Puzzle ${currentPuzzleNumber} of ${this.state.puzzlePackSize}` : "No pack loaded"}
            </div>
          </div>

          <div className="ot-puzzle-header-actions">
            <select className="ot-select ot-puzzle-select" value={this.state.openingKey} onChange={this.setOpeningKey}>
              {Object.keys(OPENING_SETS).map((k) => {
                const s = OPENING_SETS[k];
                const label = (s && (s.name || s.title || s.label)) || k;
                return <option key={k} value={k}>{label}</option>;
              })}
            </select>
          </div>
        </div>

        {desktopModeBar}

        <div className="ot-puzzle-grid ot-puzzle-grid-compact">
          <div className="ot-puzzle-board-card ot-puzzle-board-card-compact">
            {puzzleBoard}
          </div>

          <div className="ot-puzzle-side">
            <div className="ot-puzzle-panel ot-puzzle-panel-compact ot-puzzle-panel-minimal">
              {hasPack ? (
                <>
                  <div className="ot-puzzle-panel-head ot-puzzle-panel-head-minimal">
                    <div className="ot-puzzle-panel-title"><span role="img" aria-label="puzzles">🧩</span> Puzzles <span className="ot-puzzle-panel-inline-opening">{openingLabel}</span></div>
                    <div className="ot-puzzle-panel-sub">#{currentPuzzleNumber}</div>
                  </div>

                  <div className="ot-puzzle-status-wrap ot-puzzle-status-wrap-minimal">
                    <div className={"ot-puzzle-status" + (this.state.puzzleSolved ? " solved" : "")}>{puzzleStatus}</div>
                  </div>

                  <div className="ot-puzzle-stat-duo">
                    <div className="ot-puzzle-stat-card">
                      <span>Rating</span>
                      <strong>{this.state.puzzleRating || "-"}</strong>
                    </div>
                    <div className="ot-puzzle-stat-card">
                      <span>Mistakes</span>
                      <strong>{this.state.puzzleMistakes || 0}</strong>
                    </div>
                  </div>

                  <div className="ot-puzzle-panel-grow" />

                  <div className="ot-puzzle-footer-minimal">
                    <div className="ot-puzzle-footer-minimal-left">
                      <button
                        className={"ot-icon-btn ot-compact-icon-btn" + (this.state.puzzleHintArmed ? " ot-hint-btn-on" : "")}
                        type="button"
                        onClick={this.onPuzzleHintOrSolve}
                        title={this.state.puzzleHintArmed ? "Solve" : "Hint"}
                        aria-label={this.state.puzzleHintArmed ? "Solve" : "Hint"}
                      disabled={!!this.state.puzzleWrongAttempt}
                      >
                        <span aria-hidden="true">{this.state.puzzleHintArmed ? "✓" : "💡"}</span>
                      </button>
                      <button
                        className="ot-icon-btn ot-compact-icon-btn"
                        type="button"
                        onClick={this.retryPuzzle}
                        title="Retry"
                        aria-label="Retry"
                      >
                        <span aria-hidden="true">↻</span>
                      </button>
                    </div>
                    <div className="ot-puzzle-footer-minimal-right">
                      <button className="ot-icon-btn" type="button" onClick={this.prevPuzzle} disabled={currentPuzzleNumber <= 1}>‹</button>
                      <button className="ot-icon-btn" type="button" onClick={this.nextPuzzle}>›</button>
                    </div>
                  </div>

                  <div className="ot-puzzle-subactions ot-puzzle-subactions-minimal">
                    <button className="ot-puzzle-linkbtn" type="button" onClick={this.resetPuzzleProgress} disabled={currentPuzzleNumber <= 1}>Reset progress</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="ot-puzzle-panel-head ot-puzzle-panel-head-minimal">
                    <div className="ot-puzzle-panel-title"><span role="img" aria-label="puzzles">🧩</span> Puzzles <span className="ot-puzzle-panel-inline-opening">{openingLabel}</span></div>
                  </div>
                  <div className="ot-puzzle-empty-title">No local pack available.</div>
                  <div className="ot-puzzle-empty-copy">Generate the pack, then reload this page.</div>
                  {tags && tags.length ? (
                    <div className="ot-puzzle-tags ot-puzzle-tags-compact ot-puzzle-tags-minimal">
                      {tags.slice(0, 4).map((tag) => <span key={tag} className="ot-puzzle-tag">{tag}</span>)}
                    </div>
                  ) : null}
                  <div className="ot-puzzle-footnote ot-puzzle-footnote-compact">Run <code>python3 src/scripts/build_opening_puzzle_packs.py path/to/lichess_db_puzzle.csv.zst</code>.</div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

renderMoveFeedbackCard = () => {
  const feedback = this.state.lastMoveFeedback;
  if (!feedback || !feedback.text) return null;

  const isWrong = feedback.kind === "wrong";
  const expanded = !!this.state.feedbackExpanded;

  return (
    <div className={`ot-move-feedback ${isWrong ? "is-wrong" : "is-correct"}`}>
      <div className="ot-move-feedback-head">
        <div className="ot-move-feedback-head-left">
          <div className="ot-move-feedback-title-row">
            <div className="ot-move-feedback-title">{feedback.title}</div>
            {isWrong && feedback.severity ? (
              <span className="ot-move-feedback-severity">{feedback.severity}</span>
            ) : null}
          </div>
          {!isWrong ? (
            <div className="ot-move-feedback-correct-copy">
              <div className="ot-move-feedback-text">{this.renderExplanationTokens(feedback.text)}</div>
            </div>
          ) : null}
        </div>
        {isWrong && feedback.played && feedback.expected ? (
          <div className="ot-move-feedback-san">
            <span className="ot-move-feedback-san-played">Played {feedback.played}</span>
            <span
              className="ot-move-feedback-best-wrap"
              onMouseEnter={() => this.openFeedbackPreview(feedback.expected)}
              onMouseLeave={this.closeFeedbackPreview}
              onFocus={() => this.openFeedbackPreview(feedback.expected)}
              onBlur={this.closeFeedbackPreview}
            >
              <button
                type="button"
                className="ot-move-feedback-san-best ot-move-feedback-san-best-btn"
              >
                Best {feedback.expected}
              </button>
              {this.renderFeedbackPreviewPopover(feedback.expected)}
            </span>
          </div>
        ) : null}
      </div>

      {isWrong ? (
        <div className="ot-move-feedback-sections">
          <div className="ot-move-feedback-section">
            <div className="ot-move-feedback-label">Your move</div>
            <div className="ot-move-feedback-text">{this.renderExplanationTokens(feedback.yourMove || feedback.text)}</div>
          </div>
          <div className="ot-move-feedback-section">
            <div className="ot-move-feedback-label">What it missed</div>
            <div className="ot-move-feedback-text">{this.renderExplanationTokens(feedback.missed || feedback.text)}</div>
          </div>
        </div>
      ) : null}

      {expanded && feedback.why ? (
        <div className="ot-move-feedback-why">
          <div className="ot-move-feedback-label">Why</div>
          <div className="ot-move-feedback-text">{this.renderExplanationTokens(feedback.why)}</div>
        </div>
      ) : null}

      <div className="ot-move-feedback-footer">
        {Array.isArray(feedback.tags) && feedback.tags.length ? (
          <div className="ot-move-feedback-tags">
            {feedback.tags.map((tag) => (
              <span key={tag} className="ot-move-feedback-tag">{tag}</span>
            ))}
          </div>
        ) : <div />}

        {feedback.why ? (
          <button
            type="button"
            className="ot-move-feedback-why-toggle"
            onClick={this.toggleFeedbackExpanded}
          >
            {expanded ? "Hide why" : "Why?"}
          </button>
        ) : null}
      </div>
    </div>
  );
};

getOpeningDisplayName = () => {
  const s = OPENING_SETS[this.state.openingKey];
  return (s && (s.name || s.title || s.label)) || this.state.openingKey;
};

truncateHeaderLabel = (value, max = 34) => {
  const str = String(value || "").replace(/\s+/g, " ").trim();
  if (!str) return "";
  return str.length > max ? `${str.slice(0, max - 1).trim()}…` : str;
};

renderCoachAvatar = (mode) => {
  const coach = getCoachConfig({ mode, openingKey: this.state.openingKey, coachTheme: this.state.settings && this.state.settings.coachTheme });

  return (
    <div className="ot-buddy ot-buddy-image" title={coach.title}>
      <img className="ot-buddy-img" src={coach.src} alt={coach.alt} draggable="false" />
    </div>
  );
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
    <>
      {this.renderTranspositionNotice()}
      <div className="ot-bubble">
        <div className="ot-bubble-row">
          {this.renderCoachAvatar(mode)}
          <div className="ot-coach-copy">
            <div className="ot-coach-text">{this.renderExplanationTokens(text)}</div>
          </div>
        </div>
      </div>
    </>
  );
};

renderTranspositionNotice = () => {
  const notice = this.state.transpositionNotice;
  if (!notice || !notice.text) return null;

  return (
    <div className="ot-transposition-notice" role="status" aria-live="polite">
      <span className="ot-transposition-notice-label">Transposed</span>
      <span className="ot-transposition-notice-text">{notice.text}</span>
    </div>
  );
};

renderCoachArea = (line, doneYourMoves, totalYourMoves, expectedSan) => {
  if (!line) return null;

  const mode = this.state.gameMode || "learn";

  const unlocked = mode === "learn" ? true : mode === "practice" ? (!!this.state.mistakeUnlocked || !!this.state.helpUsed) : false;

  const coachIndex = this.getViewIndex();
  const raw = unlocked ? (line.explanations[coachIndex] || "") : mode === "drill" ? "No help in Drill Mode" : "What's the best move?";
  const text = unlocked ? this.stripMovePrefix(raw) : raw;
  const openingDisplayName = this.getOpeningDisplayName();
  const currentLineNumber = getLineNumberForLines(this.state.openingKey, this.getLines(), this.state.lineId);
  const lineMenuLabel = ((mode === "learn" || mode === "drill") && currentLineNumber) ? `#${currentLineNumber}` : "Lines";

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
              ) : mode === "practice" ? (
                <>
                  <span role="img" aria-label="practice">🎯</span> Practice
                </>
              ) : mode === "drill" ? (
                <>
                  <span role="img" aria-label="drill">🔥</span> Drill
                </>
              ) : (
                <>
                  <span role="img" aria-label="puzzles">🧩</span> Puzzles
                </>
              )}
            </button>
            {this.state.isMobile ? (
              <button className="ot-open-pill ot-pill-btn" onClick={() => this.toggleMobileHeaderMenu("opening")} title="Opening" aria-label="Opening">{openingDisplayName} ▾</button>
            ) : null}
            <button className="ot-line-pill ot-pill-btn" onClick={() => this.toggleMobileHeaderMenu("line")} title="Select line" aria-label="Line selector"><span className="ot-pill-label-ellipsis">{lineMenuLabel}</span> <span className="ot-pill-caret">▾</span></button>
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

                <button
                  className={"ot-mode-item" + ((this.state.gameMode || "learn") === "puzzles" ? " active" : "")}
                  onClick={() => { this.setGameMode("puzzles"); this.closeMobileHeaderMenu(); }}
                >
                  <span><span role="img" aria-label="puzzles">🧩</span> Puzzles</span>
                  <span />
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

      {this.renderTranspositionNotice()}

      <div className="ot-bubble">
        <div className="ot-bubble-row">
          {this.renderCoachAvatar(mode)}
          <div className="ot-coach-copy">
            <div className="ot-coach-text">{this.renderExplanationTokens(text)}</div>
          </div>
        </div>
      </div>
      {this.renderMoveFeedbackCard()}
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

    if (mode === this.state.gameMode) {
      if (mode === "learn" && this.state.linePicker === "random" && (this.state.completed || !this.state.userHasPlayedThisLine || this.state.modePanelVisible)) {
        this.startLearnLine({ reason: this.state.completed ? "mode_continue" : "mode_reselect" });
      }
      return;
    }

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
        lastMoveFeedback: null,
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
        if (mode === "puzzles") {
          this.loadPuzzleForOpening(this.state.openingKey, { resetIndex: true });
          return;
        }
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

    const lines = this.getLines();
    const totalLearnLines = getOrderedLineIdsForLines(this.state.openingKey, lines).length;
    const discoveredLearnLines = getLearnDiscoveredCountForLines(this.state.openingKey, lines, this.state.learnProgress);
    const learnProgressLabel = `${discoveredLearnLines}/${totalLearnLines || 0} lines discovered`;

    return (
      <div className="ot-mode-panel">
        <button
          className={"ot-mode-card ot-mode-card-big" + (mode === "learn" ? " active" : "") + ((!this.props.user || (!this.props.isMember && !false)) ? " locked" : "")}
          onClick={() => this.setGameMode("learn")}
          type="button"
        >
          <div className="ot-mode-card-title"><span role="img" aria-label="learn">📘</span> Learn</div>
          <div className="ot-mode-card-sub">{learnProgressLabel}</div>
        </button>

        <button
          className={"ot-mode-card" + (mode === "practice" ? " active" : "") + (!this.props.isMember ? " locked" : "")}
          onClick={() => (this.props.isMember ? this.setGameMode("practice") : this.openMemberGate("practice"))}
          type="button"

        >
          <div className="ot-mode-card-title"><span role="img" aria-label="practice">🎯</span> Practice</div>
          <div className="ot-mode-card-sub">Flow</div>
        </button>

        <button
          className={"ot-mode-card" + (mode === "drill" ? " active" : "") + (!this.props.isMember ? " locked" : "")}
          onClick={() => (this.props.isMember ? this.setGameMode("drill") : this.openMemberGate("drill"))}
          type="button"

        >
          <div className="ot-mode-card-title"><span role="img" aria-label="drill">🔥</span> Drill</div>
          <div className="ot-mode-card-sub">Streak</div>
        </button>

        <button
          className={"ot-mode-card" + (mode === "puzzles" ? " active" : "")}
          onClick={() => this.setGameMode("puzzles")}
          type="button"

        >
          <div className="ot-mode-card-title"><span role="img" aria-label="puzzles">🧩</span> Puzzles</div>
          <div className="ot-mode-card-sub">Puzzles</div>
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

      const packBase = (score) => ({
        uid: u.uid,
        username: username,
        score: Number(score) || 0,
        updatedAt: serverTimestamp()
      });

      const now = new Date();
      const dayKey = dayKeyFromDate(now);
      const weekKey = isoWeekKeyFromDate(now);
      const monthKey = monthKeyFromDate(now);

      const writes = [];

      // All Time
      writes.push(setDoc(doc(db, "leaderboards_drill_alltime", u.uid), packBase(stats.bestAllTime), { merge: true }));

      // Daily, Weekly, Monthly (scoped keys so boards actually reset)
      writes.push(
        setDoc(
          doc(db, "leaderboards_drill_daily", u.uid),
          { ...packBase(stats.bestDay), dayKey },
          { merge: true }
        )
      );
      writes.push(
        setDoc(
          doc(db, "leaderboards_drill_weekly", u.uid),
          { ...packBase(stats.bestWeek), weekKey },
          { merge: true }
        )
      );
      writes.push(
        setDoc(
          doc(db, "leaderboards_drill_monthly", u.uid),
          { ...packBase(stats.bestMonth), monthKey },
          { merge: true }
        )
      );

      await Promise.all(writes);
    } catch (_) {
      // swallow
    }
  };

  resetBoardRender = () => {
    this.setState((s) => ({ boardRenderToken: (s.boardRenderToken || 0) + 1 }));
  };

render() {
    const line = this.getLine();
    if (!line) return null;
    if ((this.state.gameMode || "learn") === "puzzles") return this.renderPuzzleMode();
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
    const progressModeClass = `ot-progress-fill-${this.state.gameMode || "learn"}`;
    const currentLineNumber = getLineNumberForLines(this.state.openingKey, this.getLines(), this.state.lineId);
    const mobileLineLabel = (((this.state.gameMode || "learn") === "learn" || (this.state.gameMode || "learn") === "drill") && currentLineNumber)
      ? `#${currentLineNumber}`
      : "Lines";

    const squareStyles = {};
    const expectedPreview = this.state.lastMoveFeedback && this.state.lastMoveFeedback.kind === "wrong"
      ? this.getExpectedMovePreview(this.state.lastMoveFeedback.expected)
      : null;

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

    if (expectedPreview && expectedPreview.from) {
      squareStyles[expectedPreview.from] = {
        ...(squareStyles[expectedPreview.from] || {}),
        boxShadow: "inset 0 0 0 3px rgba(126, 196, 255, 0.9)"
      };
    }

    if (expectedPreview && expectedPreview.to) {
      const existingTarget = squareStyles[expectedPreview.to] || {};
      const bestGlow = "radial-gradient(circle at center, rgba(255, 225, 120, 0.95) 0 18%, rgba(255, 225, 120, 0.28) 19 38%, rgba(0,0,0,0) 39%)";
      squareStyles[expectedPreview.to] = {
        ...existingTarget,
        backgroundImage: existingTarget.backgroundImage
          ? `${existingTarget.backgroundImage}, ${bestGlow}`
          : bestGlow,
        backgroundRepeat: existingTarget.backgroundRepeat
          ? `${existingTarget.backgroundRepeat}, no-repeat`
          : "no-repeat",
        backgroundPosition: existingTarget.backgroundPosition
          ? `${existingTarget.backgroundPosition}, center`
          : "center",
        backgroundSize: existingTarget.backgroundSize
          ? `${existingTarget.backgroundSize}, 100% 100%`
          : "100% 100%",
        boxShadow: "inset 0 0 0 3px rgba(255, 225, 120, 0.95), 0 0 22px rgba(255, 225, 120, 0.16)"
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

    if (this.state.coachHighlight && this.state.coachHighlight.square) {
      const highlightSquare = this.state.coachHighlight.square;
      const existing = squareStyles[highlightSquare] || {};

      if (this.state.coachHighlight.kind === "piece") {
        const pieceGlow = "radial-gradient(circle at center, rgba(178, 132, 255, 0.52) 0 24%, rgba(178, 132, 255, 0.18) 25 54%, rgba(0,0,0,0) 55%)";
        squareStyles[highlightSquare] = {
          ...existing,
          backgroundImage: existing.backgroundImage ? `${existing.backgroundImage}, ${pieceGlow}` : pieceGlow,
          backgroundRepeat: existing.backgroundRepeat ? `${existing.backgroundRepeat}, no-repeat` : "no-repeat",
          backgroundPosition: existing.backgroundPosition ? `${existing.backgroundPosition}, center` : "center",
          backgroundSize: existing.backgroundSize ? `${existing.backgroundSize}, 100% 100%` : "100% 100%",
          boxShadow: "inset 0 0 0 3px rgba(196, 157, 255, 0.95), 0 0 18px rgba(149, 102, 255, 0.18)"
        };
      } else {
        squareStyles[highlightSquare] = {
          ...existing,
          boxShadow: "inset 0 0 0 3px rgba(126, 220, 255, 0.95), 0 0 18px rgba(91, 204, 255, 0.16)",
          backgroundColor: existing.backgroundColor || "rgba(91, 204, 255, 0.18)"
        };
      }
    }

    let seoOpening = null;
    try {
      const search = this.props && this.props.location ? this.props.location.search : "";
      const params = new URLSearchParams(search || "");
      const openingKey = params.get("opening");
      if (openingKey && OPENING_SETS[openingKey]) seoOpening = OPENING_SETS[openingKey];
    } catch (_) {
      seoOpening = null;
    }

    const seoTitle = seoOpening
      ? `${seoOpening.label} Trainer | ChessDrills`
      : "Chess Opening Trainer | ChessDrills";
    const seoDescription = seoOpening
      ? `Practice ${seoOpening.label} with structured chess opening drills, move feedback, and opening recall training in ChessDrills.`
      : "Practice chess openings with structured drills, move feedback, and opening recall training in ChessDrills.";

    const modeClass = ` ot-mode-${this.state.gameMode || "learn"}`;

    return (
      <div className={"ot-container" + modeClass + (this.state.isMobile ? " ot-mobile" : "")}>
        <SEO
          title={seoTitle}
          description={seoDescription}
          image="https://chessdrills.net/logo512.png"
        />
        <OpeningTrainerConfetti active={this.state.confettiActive} />
<OpeningTrainerCustomModal
  open={this.state.customModalOpen}
  error={this.state.customError}
  name={this.state.customName}
  movesText={this.state.customMovesText}
  onChangeName={(v) => this.setState({ customName: v })}
  detectedFormatLabel={{ empty: "Nothing yet", san: "SAN moves", pgn: "PGN", fen: "FEN position" }[this.state.customDetectedFormat] || "Unknown"}
  onChangeMovesText={this.setCustomMovesText}
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

              .ot-container.ot-mobile .ot-bubble {
                background: #ececf1;
                color: #111111;
                border: 1px solid rgba(0,0,0,0.08);
              }

              .ot-container.ot-mobile .ot-bubble-row {
                background: transparent;
                border: none;
              }

              .ot-container.ot-mobile .ot-coach-text {
                color: #111111;
              }

              .ot-container.ot-mobile .ot-buddy {
                display: none;
              }

              .ot-container.ot-mobile .ot-bubble::before {
                display: none;
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
            <div className={`ot-progress-fill ${progressModeClass}`} style={{ width: yourProgressPct + "%" }} />
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
                      ) : mode === "drill" ? (
                        <>
                          <span role="img" aria-label="drill">🔥</span> Drill
                        </>
                      ) : (
                        <>
                          <span role="img" aria-label="puzzles">🧩</span> Puzzles
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
                    {mobileLineLabel} ▾
                  </button>
                </div>

                <div className="ot-mobile-topbar" ref={this._mobileTopbarRef}>
                  <button className="ot-icon-btn ot-mobile-back" onClick={this.goHome} title="Back" aria-label="Back">
                    ←
                  </button>

                  <div className="ot-mobile-progress-inline" aria-label="Progress">
                    <div className="ot-progress-bar ot-progress-bar-top">
                      <div className={`ot-progress-fill ${progressModeClass}`} style={{ width: yourProgressPct + "%" }} />
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

                            <button
                              className={"ot-mode-item" + ((this.state.gameMode || "learn") === "puzzles" ? " active" : "")}
                              onClick={() => { this.setGameMode("puzzles"); this.closeMobileHeaderMenu(); }}
                            >
                              <span><span role="img" aria-label="puzzles">🧩</span> Puzzles</span>
                              <span />
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
                  <BoardErrorBoundary onReset={this.resetBoardRender}>
                  <Chessboard
                    width={this.state.isMobile && this.state.mobileBoardSize ? this.state.mobileBoardSize : this.state.boardSize}
                    position={boardFen || "start"}
                    onDrop={this.onDrop}
                    allowDrag={this.allowDrag}
                    orientation={playerColor === "b" ? "black" : "white"}
                    showNotation={true}
                    squareStyles={(this.state.isMobile && !this.state.mobileBoardSize) ? {} : squareStyles}
                    onSquareClick={this.onSquareClick}
                    onSquareRightClick={this.onSquareRightClick}
                    pieceTheme={this.getPieceThemeUrl()}
                    {...BOARD_THEMES[this.state.settings.boardTheme || DEFAULT_THEME]}
                  />
                  </BoardErrorBoundary>
                </div>
              </div>

              </div>

              <div className="ot-mobile-dock" ref={this._mobileDockRef}>
                <div className="ot-mobile-dock-left">
                  <button
                    className="ot-gear ot-mobile-icon ot-compact-icon-btn"
                    onClick={this.toggleSettingsOpen}
                    title="Settings"
                    aria-label="Settings"
                  >
                    <span role="img" aria-label="settings">⚙</span>
                  </button>

                  {this.state.gameMode === "drill" ? null : (
                    <button
                      className={
                        "ot-icon-btn ot-mobile-icon ot-compact-icon-btn" +
                        (this.state.showHint ? " ot-hint-btn-on" : "")
                      }
                      onClick={this.state.solveArmed ? this.playMoveForMe : this.onHint}
                      disabled={!nextExpected || this.state.completed || this.state.viewing}
                      title={
                        !nextExpected
                          ? "Line complete"
                          : this.state.solveArmed
                          ? "Play the move (breaks clean completion)"
                          : "Hint"
                      }
                      aria-label={this.state.solveArmed ? "Solve" : "Hint"}
                    >
                      {this.state.solveArmed ? "✓" : "💡"}
                    </button>
                  )}

                  <button
                    className="ot-icon-btn ot-mobile-icon ot-compact-icon-btn"
                    onClick={this.retryLine}
                    title="Retry"
                    aria-label="Retry"
                  >
                    ↻
                  </button>
                </div>

                <div className="ot-mobile-dock-center">
                  {canUndo ? (
                    <button className="ot-icon-btn ot-mobile-icon ot-compact-icon-btn" onClick={this.undoMistake} title="Undo" aria-label="Undo">
                      ↶
                    </button>
                  ) : null}

                  {this.state.gameMode === "learn" && this.state.learnNextReady ? (
                    <button
                      className="ot-button ot-button-small ot-button-dock ot-next-reward-btn"
                      onClick={this.nextLine}
                      title="Pick the next line"
                    >
                      Next
                    </button>
                  ) : null}
                </div>

                <div className="ot-mobile-dock-right">
                  <button
                    className="ot-icon-btn ot-mobile-icon ot-compact-icon-btn"
                    onClick={this.viewBack}
                    disabled={!canViewBack}
                    title="Back"
                    aria-label="Back"
                  >
                    ‹
                  </button>

                  <button
                    className="ot-icon-btn ot-mobile-icon ot-compact-icon-btn"
                    onClick={this.viewForward}
                    disabled={!canViewForward}
                    title="Forward"
                    aria-label="Forward"
                  >
                    ›
                  </button>
                </div>
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

                        <label className="ot-settings-row">
                          <input
                            type="checkbox"
                            checked={!!(this.state.settings && this.state.settings.allowTranspositions)}
                            onChange={(e) => this.setSetting("allowTranspositions", !!e.target.checked)}
                          />
                          <span>Transpose lines</span>
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

                  <div className="ot-settings-title" style={{ marginTop: "12px" }}>Share and export</div>
                  <div className="ot-settings-action-grid">
                    <button className="ot-button ot-button-small ot-settings-action-btn" onClick={this.copySanText}>Copy SAN</button>
                    <button className="ot-button ot-button-small ot-settings-action-btn" onClick={this.copyPgnText}>Copy PGN</button>
                    <button className="ot-button ot-button-small ot-settings-action-btn" onClick={this.copyFenText}>Copy FEN</button>
                    <button className="ot-button ot-button-small ot-settings-action-btn" onClick={this.shareCurrentRep}>Share rep</button>
                  </div>
                  {this.state.shareStatus ? <div className={"ot-settings-status" + (this.state.shareStatusError ? " error" : "")}>{this.state.shareStatus}</div> : null}

                  {this.isCurrentLineCustom() ? (
                    <>
                      <div className="ot-settings-title" style={{ marginTop: "12px" }}>Custom rep</div>
                      <button className="ot-button ot-button-small ot-settings-action-btn ot-settings-delete-btn" onClick={this.deleteCurrentCustomRep}>Delete custom rep</button>
                    </>
                  ) : null}
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
<option value="vienna">Vienna Gambit</option>
<option value="viennaCounter">Vienna Gambit Counter</option>
<option value="viennaGame">Vienna Game</option>
<option value="kingsGambit">King's Gambit</option>
<option value="danishGambit">Danish Gambit</option>
<option value="petrovDefense">Petrov Defense</option>
<option value="rousseauGambit">Rousseau Gambit</option>
<option value="bishopsOpening">Bishop's Opening</option>
<option value="scandinavianDefense">Scandinavian Defense</option>
<option value="vantKruijs">Van't Kruijs Opening</option>

</select>
            </div>
<BoardErrorBoundary onReset={this.resetBoardRender}>
<Chessboard
  width={this.state.isMobile && this.state.mobileBoardSize ? this.state.mobileBoardSize : this.state.boardSize}
  position={boardFen || "start"}
  onDrop={this.onDrop}
  allowDrag={this.allowDrag}
  orientation={playerColor === "b" ? "black" : "white"}
  showNotation={true}
  squareStyles={(this.state.isMobile && !this.state.mobileBoardSize) ? {} : squareStyles}
  onSquareClick={this.onSquareClick}
  onSquareRightClick={this.onSquareRightClick}
  pieceTheme={this.getPieceThemeUrl()}
  {...BOARD_THEMES[this.state.settings.boardTheme || DEFAULT_THEME]}
/>
</BoardErrorBoundary>
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
                    <button className="ot-gear ot-compact-icon-btn" onClick={this.toggleSettingsOpen} title="Settings" aria-label="Settings">
                      <span role="img" aria-label="settings">⚙</span>
                    </button>

                    {this.state.gameMode === "drill" ? null : (
                      <button
                        className={
                          "ot-icon-btn ot-compact-icon-btn" +
                          (this.state.showHint ? " ot-hint-btn-on" : "")
                        }
                        onClick={this.state.solveArmed ? this.playMoveForMe : this.onHint}
                        disabled={!nextExpected || this.state.completed || this.state.viewing}
                        title={
                          !nextExpected
                            ? "Line complete"
                            : this.state.solveArmed
                            ? "Play the move (breaks clean completion)"
                            : "Hint"
                        }
                        aria-label={this.state.solveArmed ? "Solve" : "Hint"}
                      >
                        {this.state.solveArmed ? "✓" : "💡"}
                      </button>
                    )}

                    <button
                      className="ot-icon-btn ot-compact-icon-btn"
                      onClick={this.retryLine}
                      title="Retry"
                      aria-label="Retry"
                    >
                      ↻
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

                        <label className="ot-settings-row">
                          <input
                            type="checkbox"
                            checked={!!(this.state.settings && this.state.settings.allowTranspositions)}
                            onChange={(e) => this.setSetting("allowTranspositions", !!e.target.checked)}
                          />
                          <span>Transpose lines</span>
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

                        <div className="ot-settings-title" style={{ marginTop: "12px" }}>Share and export</div>
                        <div className="ot-settings-action-grid">
                          <button className="ot-button ot-button-small ot-settings-action-btn" onClick={this.copySanText}>Copy SAN</button>
                          <button className="ot-button ot-button-small ot-settings-action-btn" onClick={this.copyPgnText}>Copy PGN</button>
                          <button className="ot-button ot-button-small ot-settings-action-btn" onClick={this.copyFenText}>Copy FEN</button>
                          <button className="ot-button ot-button-small ot-settings-action-btn" onClick={this.shareCurrentRep}>Share rep</button>
                        </div>
                        {this.state.shareStatus ? <div className={"ot-settings-status" + (this.state.shareStatusError ? " error" : "")}>{this.state.shareStatus}</div> : null}

                        {this.isCurrentLineCustom() ? (
                          <>
                            <div className="ot-settings-title" style={{ marginTop: "12px" }}>Custom rep</div>
                            <button className="ot-button ot-button-small ot-settings-action-btn ot-settings-delete-btn" onClick={this.deleteCurrentCustomRep}>Delete custom rep</button>
                          </>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="ot-dock-center">
                  {canUndo ? (
                    <button className="ot-icon-btn ot-compact-icon-btn" onClick={this.undoMistake} title="Undo" aria-label="Undo">
                      ↶
                    </button>
                  ) : null}

                  {this.state.gameMode === "learn" ? (
                    this.state.learnNextReady ? (
                      <button
                        className="ot-button ot-button-small ot-button-dock ot-next-reward-btn"
                        onClick={this.nextLine}
                        title="Pick the next line"
                      >
                        Next
                      </button>
                    ) : null
                  ) : (
                    <button
                      className="ot-button ot-button-small ot-button-dock ot-next-reward-btn"
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
                </div>

                <div className="ot-dock-right">
                  <button
                    className="ot-icon-btn ot-compact-icon-btn"
                    onClick={this.viewBack}
                    disabled={!canViewBack}
                    title="Back"
                    aria-label="Back"
                  >
                    ‹
                  </button>

                  <button
                    className="ot-icon-btn ot-compact-icon-btn"
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
