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
import { loadProgress, saveProgress, loadSettings, saveSettings, loadCustomLines, saveCustomLines, makeCustomId, ensureOpening, getLineStats, isCompleted } from "./openingTrainer/otStorage";
import OpeningTrainerCustomModal from "./openingTrainer/OpeningTrainerCustomModal";
import OpeningTrainerConfetti from "./openingTrainer/OpeningTrainerConfetti";


const OPENING_SETS = CATALOG_OPENING_SETS;


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
    const settings = loadSettings(DEFAULT_THEME);

    this.state = {
      openingKey: firstSetKey,
      lineId: firstId,
      linePicker: "random",
      fen: "start",
      stepIndex: 0,
      mistakeUnlocked: false,
      lastMistake: null,
      completed: false,
      confettiActive: false,
      wrongAttempt: null,
      progress: progress,
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
      lastMove: null // { from, to }
    };

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
    return !!set && set.badge === "New" && !this.props.user;
  };

  maybeRedirectForLockedOpening = (openingKey) => {
    if (this.props.authLoading) return false;
    if (!this.isOpeningLocked(openingKey)) return false;

    const pathname = this.props && this.props.location ? this.props.location.pathname : "/openings";
    const search = this.props && this.props.location ? this.props.location.search : "";
    const from = `${pathname}${search}`;

    if (this.props && this.props.history && this.props.history.replace) {
      this.props.history.replace({
        pathname: "/signup",
        state: { from, reason: "new_opening" }
      });
    }

    return true;
  };

  componentDidMount() {
    window.addEventListener("mousedown", this.onWindowClick);
    window.addEventListener("keydown", this.onKeyDown);
    if (this.maybeRedirectForLockedOpening(this.state.openingKey)) return;
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

    if (prevState.openingKey !== this.state.openingKey) {
      this.maybeRedirectForLockedOpening(this.state.openingKey);
    }
  }

componentWillUnmount() {
    if (this._autoNextTimer) clearTimeout(this._autoNextTimer);
    if (this._confettiTimer) clearTimeout(this._confettiTimer);
    if (this._streakToastTimer) clearTimeout(this._streakToastTimer);
    window.removeEventListener("mousedown", this.onWindowClick);
    window.removeEventListener("keydown", this.onKeyDown);
  }

  onWindowClick = (e) => {
    if (!this.state.settingsOpen && !this.state.lineMenuOpen) return;

    const t = e && e.target;

    if (this._settingsAnchorEl && t && this._settingsAnchorEl.contains(t)) return;
    if (this._linePickerAnchorEl && t && this._linePickerAnchorEl.contains(t)) return;

    this.setState({ settingsOpen: false, lineMenuOpen: false });
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

    const line = this.getLine();
    if (!line) return;

    const expected = line.moves[this.state.stepIndex];
    if (!expected) return;

    const playerColor = this.getPlayerColor();
    if (this.game.turn() !== playerColor) return;

    const fromSq = this.getHintFromSquare(expected);

    this.setState({
      showHint: true,
      solveArmed: true,
      hintFromSquare: fromSq
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
        mistakeUnlocked: true,
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
        completed: false,
        mistakeUnlocked: keepUnlocked ? this.state.mistakeUnlocked : false,
        lastMistake: null,
        wrongAttempt: null,
        showHint: false,
        lastMove: null,
        selectedSquare: null,
        legalTargets: []
      },
      () => {
        this._countedSeenForRun = false;
        this.bumpSeen();
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
        linePicker: "random",
        mistakeUnlocked: false,
        lastMistake: null,
        completed: false,
        wrongAttempt: null,
        showHint: false,
        lastMove: null
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
    const nextId = pickRandomLineId(nextLines, null) || (nextLines[0] ? nextLines[0].id : "");

    this.setState(
      {
        openingKey: nextKey,
        lineId: nextId,
        linePicker: "random",
        mistakeUnlocked: false,
        lastMistake: null,
        completed: false,
        wrongAttempt: null,
        showHint: false,
        lastMove: null
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
      this.setState({ linePicker: "random" }, () => {
        this.startRandomLine();
      });
      return;
    }

    this.setState(
      {
        linePicker: val,
        lineId: val,
        mistakeUnlocked: false,
        lastMistake: null,
        completed: false,
        wrongAttempt: null,
        showHint: false,
        lastMove: null
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
    saveProgress(progress);
    this.setState({ progress });
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

    o.totalCompleted = (o.totalCompleted || 0) + 1;
    o.completedToday = (o.completedToday || 0) + 1;

    if (wasClean) {
      s.timesClean += 1;
      o.totalClean = (o.totalClean || 0) + 1;
      o.streak = (o.streak || 0) + 1;
      o.bestStreak = Math.max(o.bestStreak || 0, o.streak);
    } else {
      o.streak = 0;
    }

    saveProgress(progress);
    this.setState({ progress });
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

  const wasClean = !this.state.mistakeUnlocked;
    this.bumpCompleted(wasClean);

    if (this.state.settings && this.state.settings.showConfetti) {
      this.setState({ confettiActive: true });

      this._confettiTimer = setTimeout(() => {
        this.setState({ confettiActive: false });
      }, 1200);
    } else {
      this.setState({ confettiActive: false });
    }

    if (this.state.linePicker === "random") {
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
      const explanation = line.explanations[this.state.stepIndex] || "";

      this.playSfx("illegal");

      this.bumpMistake();
      this.game.undo();

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
        legalTargets: []
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
        lastMove: { from: sourceSquare, to: targetSquare }
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

renderCoachArea = (line, doneYourMoves, totalYourMoves, expectedSan) => {
  if (!line) return null;

  const canUndo = !!(this.state.lastMistake || this.state.wrongAttempt);

  const unlocked = !!this.state.mistakeUnlocked;

  const coachIndex = this.getViewIndex();
  const raw = unlocked ? (line.explanations[coachIndex] || "") : "What's the best move?";
  const text = unlocked ? this.stripMovePrefix(raw) : raw;

  return (
    <div className="ot-coach">
      <div className="ot-coach-head">
        <div className="ot-coach-left">
          <div className="ot-coach-title"></div>
        </div>

        <div className="ot-card-head-right">
          <span className="ot-mini-count">
            {doneYourMoves}/{totalYourMoves}
          </span>
          {canUndo ? (
            <button className="ot-mini-btn" onClick={this.undoMistake} title="Undo mistake">
              Undo
            </button>
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

  render() {
    const line = this.getLine();
    if (!line) return null;
    const lines = this.getLines();
    const nextExpected = line.moves[this.state.stepIndex] || null;

    const viewIndex = this.getViewIndex();
    const coachExpected = line.moves[viewIndex] || null;
    const boardFen = this.state.viewing ? this.state.viewFen : this.state.fen;
    const canViewBack = viewIndex > 0;
    const canViewForward = viewIndex < this.state.stepIndex;

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
      <div className="ot-container">
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

        <TopNav title="Chess Opening Drills" />
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

        <div className="ot-controls">
          <span className="ot-label ot-label-plain">Mode:</span>

          <select className="ot-select" value={this.state.openingKey} onChange={this.setOpeningKey}>
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

          <button className="ot-button" onClick={this.startLine}>
            Restart current line
          </button>

          <button className="ot-button" onClick={this.startRandomLine}>
            Next
          </button>

          <span className="ot-pill">{this.state.mistakeUnlocked ? "Explanations unlocked" : "Explanations locked"}</span>
        </div>

        <div className="ot-main">
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

              <div className="ot-dock">
                <div className="ot-dock-left">
                  <div
                    className="ot-line-picker"
                    ref={(el) => {
                      this._linePickerAnchorEl = el;
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="ot-icon-btn-tight"
                      onClick={this.toggleLineMenuOpen}
                      title="Choose line"
                      aria-label="Choose line"
                    >
                      ☰
                    </button>

                    {this.state.lineMenuOpen ? (
                      <div className="ot-line-popover" onClick={(e) => e.stopPropagation()}>
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
                            const grouped = groupLines(lines);
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
                  </div>

                  <div
                    className="ot-panel-header-actions"
                    ref={(el) => {
                      this._settingsAnchorEl = el;
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button className="ot-gear" onClick={this.toggleSettingsOpen} title="Settings" aria-label="Settings">
                      ⚙
                    </button>

                    {this.state.settingsOpen ? (
                      <div className="ot-settings-menu" onClick={(e) => e.stopPropagation()}>
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
                </div>

                <div className="ot-dock-center">
                  <button className="ot-button ot-button-small ot-button-dock" onClick={this.retryLine}>
                    Retry
                  </button>

                  <button
                    className="ot-button ot-button-small ot-button-dock"
                    onClick={this.startRandomLine}
                    disabled={this.state.linePicker !== "random"}
                    title={
                      this.state.linePicker === "random"
                        ? "Pick a new random line"
                        : "Switch to Random line to use this"
                    }
                  >
                    Next
                  </button>

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
                </div>

                <div className="ot-dock-right">
                  {this.state.viewing ? (
                    <button className="ot-mini-btn" onClick={this.viewLive} title="Jump back to current position">
                      Live
                    </button>
                  ) : null}

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
        </div>
      </div>
    );
  }
}

function OpeningTrainerWithAuth(props) {
  const { user, authLoading } = useAuth();
  return <OpeningTrainer {...props} user={user} authLoading={authLoading} />;
}

export default OpeningTrainerWithAuth;