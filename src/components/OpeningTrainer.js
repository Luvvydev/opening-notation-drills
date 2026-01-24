import React, { Component } from "react";
import Chessboard from "chessboardjsx";
import * as Chess from "chess.js";
import { londonLines } from "../openings/londonLines";
import { sicilianDefenseLines } from "../openings/sicilianDefenseLines";
import TopNav from "./TopNav";
import "./OpeningTrainer.css";

const OPENING_SETS = {
  london: { key: "london", label: "London", playerColor: "w", lines: londonLines },
  sicilian: { key: "sicilian", label: "Sicilian Defense", playerColor: "b", lines: sicilianDefenseLines }
};

const calcWidth = ({ screenWidth, screenHeight }) => {
  return (screenWidth || screenHeight) < 1800
    ? (screenWidth || screenHeight) < 550
      ? screenWidth
      : 500
    : 600;
};

const X_SVG_DATA_URI =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
      <circle cx="32" cy="32" r="28" fill="#d11f1f"/>
      <path d="M20 20 L44 44 M44 20 L20 44" stroke="white" stroke-width="6" stroke-linecap="round"/>
    </svg>`
  );

function _randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function _pickRandomLineId(lines, excludeId) {
  if (!lines || !lines.length) return null;
  if (lines.length === 1) return lines[0].id;
  let tries = 0;
  while (tries < 20) {
    const idx = _randInt(0, lines.length - 1);
    const id = lines[idx].id;
    if (id !== excludeId) return id;
    tries += 1;
  }
  return lines[0].id;
}

const STORAGE_KEY = "notation_trainer_opening_progress_v2";
const SETTINGS_KEY = "notation_trainer_opening_settings_v1";

function _safeJsonParse(text, fallback) {
  try {
    return JSON.parse(text);
  } catch (_) {
    return fallback;
  }
}

function _todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function _loadProgress() {
  const empty = { lines: {}, openings: {} };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const parsed = _safeJsonParse(raw, empty);
    if (!parsed || typeof parsed !== "object") return empty;
    if (!parsed.lines) parsed.lines = {};
    if (!parsed.openings) parsed.openings = {};
    return parsed;
  } catch (_) {
    return empty;
  }
}

function _saveProgress(progress) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (_) {
    // ignore
  }
}

function _loadSettings() {
  const defaults = { showConfetti: true, playSounds: true };
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaults;
    const parsed = _safeJsonParse(raw, defaults);
    if (!parsed || typeof parsed !== "object") return defaults;

    return {
      showConfetti: parsed.showConfetti !== false,
      playSounds: parsed.playSounds !== false
    };
  } catch (_) {
    return defaults;
  }
}

function _saveSettings(settings) {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (_) {
    // ignore
  }
}

function _ensureOpening(progress, openingKey) {
  if (!progress.lines[openingKey]) progress.lines[openingKey] = {};
  if (!progress.openings[openingKey]) {
    progress.openings[openingKey] = {
      streak: 0,
      bestStreak: 0,
      completedToday: 0,
      todayKey: _todayKey(),
      totalCompleted: 0,
      totalClean: 0
    };
  }
  const o = progress.openings[openingKey];
  const t = _todayKey();
  if (o.todayKey !== t) {
    o.todayKey = t;
    o.completedToday = 0;
    o.streak = 0;
  }
}

function _getLineStats(progress, openingKey, lineId) {
  _ensureOpening(progress, openingKey);
  const bucket = progress.lines[openingKey];
  if (!bucket[lineId]) {
    bucket[lineId] = {
      timesSeen: 0,
      timesCompleted: 0,
      timesClean: 0,
      lastResult: null
    };
  }
  return bucket[lineId];
}

function _isCompleted(stats) {
  return (stats && stats.timesClean >= 1) || false;
}

function _deriveOpeningSummary(progress, openingKey, lines) {
  _ensureOpening(progress, openingKey);
  const total = (lines && lines.length) || 0;
  const statsMap = progress.lines[openingKey] || {};

  let completed = 0;
  let seen = 0;

  for (const l of lines) {
    const s = statsMap[l.id];
    if (!s) continue;
    if (s.timesSeen > 0) seen += 1;
    if (_isCompleted(s)) completed += 1;
  }

  const o = progress.openings[openingKey] || {};
  const totalCompleted = o.totalCompleted || 0;
  const totalClean = o.totalClean || 0;
  const accuracy = totalCompleted > 0 ? Math.round((totalClean / totalCompleted) * 100) : 0;

  return {
    total,
    completed,
    seen,
    streak: o.streak || 0,
    bestStreak: o.bestStreak || 0,
    completedToday: o.completedToday || 0,
    accuracyPct: accuracy
  };
}

function _sideForIndex(i) {
  return i % 2 === 0 ? "w" : "b";
}

function _countMovesForSide(moves, side) {
  if (!moves || !moves.length) return 0;
  let n = 0;
  for (let i = 0; i < moves.length; i += 1) {
    if (_sideForIndex(i) === side) n += 1;
  }
  return n;
}

function _countDoneMovesForSide(stepIndex, side) {
  let n = 0;
  for (let i = 0; i < stepIndex; i += 1) {
    if (_sideForIndex(i) === side) n += 1;
  }
  return n;
}


function _categoryForLine(line) {
  if (!line) return "Other";
  if (line.category) return String(line.category);
  const name = line.name ? String(line.name) : "";
  // If you already use "Prefix: Title", treat Prefix as category hint.
  const parts = name.split(":");
  if (parts.length > 1) return parts[0].trim();
  return "Other";
}

function _groupLines(lines) {
  const out = {};
  (lines || []).forEach((l) => {
    const cat = _categoryForLine(l);
    if (!out[cat]) out[cat] = [];
    out[cat].push(l);
  });
  // stable-ish category order: main ones first, then alpha
  const preferred = [
    "Classic London",
    "Early ...c5 Systems",
    "Anti Bishop Ideas",
    "Jobava London",
    "Aggressive Plans",
    "Open Sicilian",
    "Anti-Sicilian",
    "Closed Sicilian",
    "Grand Prix",
    "Moscow/Rossolimo",
    "Other"
  ];
  const cats = Object.keys(out);
  cats.sort((a, b) => {
    const ia = preferred.indexOf(a);
    const ib = preferred.indexOf(b);
    if (ia !== -1 || ib !== -1) {
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    }
    return a.localeCompare(b);
  });

  return { cats, map: out };
}


class OpeningTrainer extends Component {
  constructor(props) {
    super(props);

    this.game = new Chess();

    const firstSetKey = "london";
    const firstLines = OPENING_SETS[firstSetKey].lines;
    const firstId = _pickRandomLineId(firstLines, null) || (firstLines[0] ? firstLines[0].id : "");

    this._autoNextTimer = null;
    this._confettiTimer = null;

    const progress = _loadProgress();
    const settings = _loadSettings();

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
      settings: settings
    ,
      viewing: false,
      viewIndex: 0,
      viewFen: "start",
      hintFromSquare: null,
      solveArmed: false
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

  componentDidMount() {
    window.addEventListener("click", this.onWindowClick);
    window.addEventListener("keydown", this.onKeyDown);
    this.resetLine(false);
  }

  componentWillUnmount() {
    if (this._autoNextTimer) clearTimeout(this._autoNextTimer);
    if (this._confettiTimer) clearTimeout(this._confettiTimer);
    window.removeEventListener("click", this.onWindowClick);
    window.removeEventListener("keydown", this.onKeyDown);
  }

  onWindowClick = () => {
    if (this.state.settingsOpen) this.setState({ settingsOpen: false });
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

  
  getLines = () => {
    const set = this.getOpeningSet();
    return (set && set.lines) || [];
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
        mistakeUnlocked: true
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

  setSetting = (key, value) => {
    const next = { ...(this.state.settings || {}) };
    next[key] = value;
    _saveSettings(next);
    this.setState({ settings: next });
  };

  _sfxLastAt = {};

  playSfx = (key) => {
    if (!this.state.settings || !this.state.settings.playSounds) return;

    const a = this.sfx && this.sfx[key];
    if (!a) return;

    const now = Date.now();
    const last = this._sfxLastAt[key] || 0;

    // debounce to prevent duplicate overlapping playback
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
        showHint: false
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
    const nextId = _pickRandomLineId(lines, this.state.lineId);
    if (!nextId) return;
    this.setState(
      {
        lineId: nextId,
        linePicker: "random",
        mistakeUnlocked: false,
        lastMistake: null,
        completed: false,
        wrongAttempt: null,
        showHint: false
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
    const nextSet = OPENING_SETS[nextKey] || OPENING_SETS.london;
    const nextLines = nextSet.lines || [];
    const nextId = _pickRandomLineId(nextLines, null) || (nextLines[0] ? nextLines[0].id : "");

    this.setState(
      {
        openingKey: nextKey,
        lineId: nextId,
        linePicker: "random",
        mistakeUnlocked: false,
        lastMistake: null,
        completed: false,
        wrongAttempt: null,
        showHint: false
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
        showHint: false
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
    _ensureOpening(progress, openingKey);
    const s = _getLineStats(progress, openingKey, lineId);
    s.timesSeen += 1;

    _saveProgress(progress);
    this._countedSeenForRun = true;
    this.setState({ progress });
  };

  bumpMistake = () => {
    const openingKey = this.state.openingKey;
    const lineId = this.state.lineId;
    if (!openingKey || !lineId) return;

    const progress = { ...this.state.progress };
    const s = _getLineStats(progress, openingKey, lineId);
    s.lastResult = "fail";
    _saveProgress(progress);
    this.setState({ progress });
  };

  bumpCompleted = (wasClean) => {
    const openingKey = this.state.openingKey;
    const lineId = this.state.lineId;
    if (!openingKey || !lineId) return;

    const progress = { ...this.state.progress };
    _ensureOpening(progress, openingKey);
    const o = progress.openings[openingKey];
    const s = _getLineStats(progress, openingKey, lineId);

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

    _saveProgress(progress);
    this.setState({ progress });
  };

  playAutoMovesIfNeeded = () => {
    const line = this.getLine();
    if (!line) return;

    let stepIndex = this.state.stepIndex;
    const playerColor = this.getPlayerColor();

    let didAutoMove = false;

    while (stepIndex < line.moves.length && this.game.turn() !== playerColor) {
      const expected = line.moves[stepIndex];
      const mv = this.game.move(expected);
      if (!mv) {
        this.setState({ fen: this.game.fen() });
        return;
      }
      stepIndex += 1;
      didAutoMove = true;
    }

    const completed = stepIndex >= line.moves.length;

    this.setState(
      {
        fen: this.game.fen(),
        stepIndex: stepIndex,
        completed: completed
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
        }
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
        hintFromSquare: null
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

renderCurrentStepCard = (line, doneYourMoves, totalYourMoves, expectedSan) => {
  if (!line) return null;

  const canUndo = !!(this.state.lastMistake || this.state.wrongAttempt);

  const unlocked = !!this.state.mistakeUnlocked;
  const raw = unlocked ? (line.explanations[this.state.stepIndex] || "") : "What's the best move?";
  const text = unlocked ? this.sanitizeExplanation(raw, expectedSan) : raw;

  return (
    <div class="ot-card ot-card-current">
      <div class="ot-card-head">
        <div class="ot-card-title">Current step</div>
        <div class="ot-card-head-right">
          <span class="ot-mini-count">
            {doneYourMoves}/{totalYourMoves}
          </span>
          {canUndo ? (
            <button class="ot-mini-btn" onClick={this.undoMistake} title="Undo mistake">
              Undo
            </button>
          ) : null}
        </div>
      </div>

      <div class="ot-current-text">{text}</div>
    </div>
  );
};

  renderConfetti = () => {
    if (!this.state.confettiActive) return null;

    const pieces = [];
    for (let i = 0; i < 60; i += 1) {
      const left = _randInt(10, 90);
      const delay = Math.random() * 0.15;
      const dur = 0.85 + Math.random() * 0.55;
      const rot = _randInt(0, 360);
      const size = _randInt(6, 11);

      pieces.push(
        <span
          key={i}
          class="ot-confetti"
          style={{
            left: left + "vw",
            animationDelay: delay + "s",
            animationDuration: dur + "s",
            transform: "rotate(" + rot + "deg)",
            width: size + "px",
            height: Math.max(4, Math.floor(size * 0.55)) + "px"
          }}
        />
      );
    }

    return <div class="ot-confetti-layer">{pieces}</div>;
  };

  render() {
    const line = this.getLine();
    if (!line) return null;
    const lines = this.getLines();
    const summary = _deriveOpeningSummary(this.state.progress, this.state.openingKey, lines);

    const nextExpected = line.moves[this.state.stepIndex] || null;


    const viewIndex = this.getViewIndex();
    const boardFen = this.state.viewing ? this.state.viewFen : this.state.fen;
    const canViewBack = viewIndex > 0;
    const canViewForward = viewIndex < this.state.stepIndex;

    const playerColor = this.getPlayerColor();

    const totalYourMoves = _countMovesForSide(line.moves, playerColor);
    const doneYourMoves = _countDoneMovesForSide(this.state.stepIndex, playerColor);

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

    if (this.state.hintFromSquare) {
      squareStyles[this.state.hintFromSquare] = {
        background: "rgba(80, 170, 255, 0.45)"
      };
    }


    const statsForThisLine = _getLineStats(this.state.progress, this.state.openingKey, this.state.lineId);
    const lineCompleted = _isCompleted(statsForThisLine);

    const completedPct = summary.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0;

    return (
      <div class="ot-container">
        {this.renderConfetti()}

        <TopNav active="openings" title="Openings Trainer" />

        <div class="ot-controls">
          <span class="ot-label ot-label-plain">Mode:</span>

          <select class="ot-select" value={this.state.openingKey} onChange={this.setOpeningKey}>
            <option value="london">London</option>
            <option value="sicilian">Sicilian Defense</option>
          </select>

          <button class="ot-button" onClick={this.startLine}>
            Restart current line
          </button>

          <button class="ot-button" onClick={this.startRandomLine}>
            New random line
          </button>

          <span class="ot-pill">{this.state.mistakeUnlocked ? "Explanations unlocked" : "Explanations locked"}</span>
        </div>

        {/* replaced standalone subtitle rows with a header card (same content, cleaner layout) */}
        <div class={"ot-line-header" + (lineCompleted ? " ot-line-header-complete" : "")}>
          {(() => {
            const raw = (line && line.name) ? String(line.name) : "";
            const parts = raw.split(":");
            const hasPrefix = parts.length > 1;
            const prefix = hasPrefix ? parts[0].trim() : "";
            const title = hasPrefix ? parts.slice(1).join(":").trim() : raw;

            return (
              <>
                {hasPrefix ? <div class="ot-line-kicker">{prefix}</div> : null}
                <div class={"ot-line-title" + (lineCompleted ? " ot-line-title-complete" : "")}>{title}</div>
                <div class={"ot-line-desc" + (lineCompleted ? " ot-line-desc-complete" : "")}>{line.description}</div>
              </>
            );
          })()}
        </div>

        <div class="ot-main">
          <div class="ot-board">
            <Chessboard
              position={boardFen}
              onDrop={this.onDrop}
              allowDrag={this.allowDrag}
              orientation={playerColor === "b" ? "black" : "white"}
              showNotation={true}
              calcWidth={calcWidth}
              squareStyles={squareStyles}
            />
          </div>

          <div class="ot-side">
            <div class="ot-panel">
              <div class="ot-panel-header">
                <div class="ot-panel-header-row">
                  <div class="ot-panel-kicker">
                    <select class="ot-line-select" value={this.state.linePicker} onChange={this.setLinePicker}>
                      <option value="random">Random line</option>
                      <option value="__divider__" disabled>
                        ─────────
                      </option>
                      {(() => {
                        const grouped = _groupLines(lines);
                        return grouped.cats.map((cat) => {
                          const arr = grouped.map[cat] || [];
                          return (
                            <optgroup key={cat} label={cat}>
                              {arr.map((l) => {
                                const s = _getLineStats(this.state.progress, this.state.openingKey, l.id);
                                const symbol = _isCompleted(s) ? "✓" : s.timesSeen > 0 ? "•" : "○";
                                return (
                                  <option key={l.id} value={l.id}>
                                    {symbol} {l.name}
                                  </option>
                                );
                              })}
                            </optgroup>
                          );
                        });
                      })()}</select>

                    {/* make this clickable again (compact opening selector in the sidebar) */}
                    <select class="ot-pill-select" value={this.state.openingKey} onChange={this.setOpeningKey}>
                      <option value="london">London</option>
                      <option value="sicilian">Sicilian</option>
                    </select>

                    <span class="ot-pill">Trainer</span>
                  </div>

                  <div class="ot-panel-header-actions" onClick={(e) => e.stopPropagation()}>
                    <span class="ot-pill">{this.state.linePicker === "random" ? "random" : "selected"}</span>

                    <button class="ot-gear" onClick={this.toggleSettingsOpen} title="Settings">
                      ⚙
                    </button>

                    {this.state.settingsOpen ? (
                      <div class="ot-settings-menu">
                        <div class="ot-settings-title">Settings</div>

                        <label class="ot-settings-row">
                          <input
                            type="checkbox"
                            checked={!!(this.state.settings && this.state.settings.showConfetti)}
                            onChange={(e) => this.setSetting("showConfetti", !!e.target.checked)}
                          />
                          <span>Show Confetti</span>
                        </label>

                        <label class="ot-settings-row">
                          <input
                            type="checkbox"
                            checked={!!(this.state.settings && this.state.settings.playSounds)}
                            onChange={(e) => this.setSetting("playSounds", !!e.target.checked)}
                          />
                          <span>Play Sounds</span>
                        </label>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div class="ot-progress-wrap">
                  <div class="ot-progress-bar">
                    <div class="ot-progress-fill" style={{ width: yourProgressPct + "%" }} />
                  </div>
                </div>
              </div>

  <div class="ot-panel-body">
    {this.renderCurrentStepCard(line, doneYourMoves, totalYourMoves, nextExpected)}

    <div class="ot-card ot-card-actions">
      <div class="ot-action-grid">
        <button class="ot-button ot-button-small" onClick={this.retryLine}>
          Retry
        </button>

        <button
          class="ot-button ot-button-small"
          onClick={this.startRandomLine}
          disabled={this.state.linePicker !== "random"}
          title={this.state.linePicker === "random" ? "Pick a new random line" : "Switch to Random line to use this"}
        >
          New random
        </button>

        <button
          class={"ot-button ot-button-small ot-hint-btn" + (this.state.showHint ? " ot-hint-btn-on" : "")}
          onClick={this.onHint}
          disabled={!nextExpected || this.state.completed || this.state.viewing}
          title={nextExpected ? "Highlight the piece to move" : "Line complete"}
        >
          Hint
        </button>

        {this.state.solveArmed ? (
        <button
          class="ot-button ot-button-small ot-hint-btn"
          onClick={this.playMoveForMe}
          disabled={!nextExpected || this.state.completed || this.state.viewing}
          title={nextExpected ? "Play the move (breaks clean completion)" : "Line complete"}
        >
          Solve
        </button>
      ) : null}

        {this.state.showHint ? (
          <div class="ot-hint-below">
            Piece highlighted
          </div>
        ) : null}
</div>
    </div>

    <div class="ot-card ot-card-progress ot-card-progress-min">
      <div class="ot-progress-top">
        <span class="ot-mini-count">
          {summary.completed}/{summary.total}
        </span>
      </div>

      <div class="ot-progress-bar ot-progress-bar-mini">
        <div class="ot-progress-fill" style={{ width: completedPct + "%" }} />
      </div>
    </div>

    {this.state.lastMistake ? (
      <div class="ot-mistake">
        <div class="ot-steps-title">Mistake</div>
        <div class="ot-step ot-step-mistake">
          <div class="ot-step-header">
            <span class="ot-step-index">Expected</span>
            <span class="ot-step-move ot-move-mono">{this.state.lastMistake.expected}</span>
          </div>
          <div class="ot-step-header">
            <span class="ot-step-index">You played</span>
            <span class="ot-step-move ot-move-mono">{this.state.lastMistake.played}</span>
          </div>
          <div class="ot-step-expl">{this.state.lastMistake.explanation}</div>
        </div>
      </div>
    ) : null}

    <div class="ot-panel-footer">
      <div class="ot-footer-left">
        <span class="ot-label2">Mode</span>
        <select class="ot-select ot-select-compact" value={this.state.openingKey} onChange={this.setOpeningKey}>
          <option value="london">London</option>
          <option value="sicilian">Sicilian</option>
        </select>
      </div>

      <div class="ot-footer-right">
        {this.state.viewing ? (
          <button class="ot-mini-btn" onClick={this.viewLive} title="Jump back to current position">
            Live
          </button>
        ) : null}

        <button
          class="ot-icon-btn"
          onClick={this.viewBack}
          disabled={!canViewBack}
          title="Back"
          aria-label="Back"
        >
          ‹
        </button>

        <button
          class="ot-icon-btn"
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

export default OpeningTrainer;
