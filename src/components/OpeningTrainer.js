import React, { Component } from "react";
import Chessboard from "chessboardjsx";
import * as Chess from "chess.js";
import { londonLines } from "../openings/londonLines";
import { sicilianDefenseLines } from "../openings/sicilianDefenseLines";
import { ruyLopezLines } from "../openings/ruyLopezLines";
import { friedLiverAttackLines } from "../openings/friedLiverAttackLines";
import { caroKannLines, caroKannSEOText } from "../openings/caroKannLines";
import { staffordGambitLines } from "../openings/staffordGambitLines";
import { queensGambitAcceptedLines } from "../openings/queensGambitAcceptedLines";
import { queensGambitDeclinedLines } from "../openings/queensGambitDeclinedLines";
import { frenchDefenseLines } from "../openings/frenchDefenseLines";
import { englundGambitLines } from "../openings/englundGambitLines";
import { italianGameLines } from "../openings/italianGameLines";
import { kingsIndianDefenseLines } from "../openings/kingsIndianDefenseLines";
import TopNav from "./TopNav";
import { BOARD_THEMES, DEFAULT_THEME } from "../theme/boardThemes";
import "./OpeningTrainer.css";
import { getStreakState, markLineCompletedTodayDetailed } from "../utils/streak";
import { getActivityDays, markActivityToday, touchActivityToday } from "../utils/activityDays";


const OPENING_SETS = {
  london: { key: "london", label: "London", playerColor: "w", lines: londonLines },
  sicilian: { key: "sicilian", label: "Sicilian Defense", playerColor: "b", lines: sicilianDefenseLines },
  ruy: { key: "ruy", label: "Ruy Lopez", playerColor: "w", lines: ruyLopezLines },
  friedliver: { key: "friedliver", label: "Fried Liver Attack", playerColor: "w", lines: friedLiverAttackLines },
  carokann: { key: "carokann", label: "Caro-Kann Defense", playerColor: "b", lines: caroKannLines, seoText: caroKannSEOText },
  stafford: { key: "stafford", label: "Stafford Gambit", playerColor: "b", lines: staffordGambitLines },
  qga: { key: "qga", label: "Queen’s Gambit Accepted", playerColor: "w", lines: queensGambitAcceptedLines },
  qgd: { key: "qgd", label: "Queen’s Gambit Declined", playerColor: "w", lines: queensGambitDeclinedLines }
  ,italian: { key: "italian", label: "Italian Game", playerColor: "w", lines: italianGameLines }
  ,kingsindian: { key: "kingsindian", label: "King's Indian Defense", playerColor: "b", lines: kingsIndianDefenseLines }
  ,french: { key: "french", label: "French Defense", playerColor: "b", lines: frenchDefenseLines }
  ,englund: { key: "englund", label: "Englund Gambit", playerColor: "b", lines: englundGambitLines }
};

const calcWidth = ({ screenWidth, screenHeight }) => {
  const w = screenWidth || screenHeight || 500;
  const usable = Math.max(260, w - 68);
  if (w < 550) return usable;
  if (w < 1800) return 500;
  return 600;
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
const CUSTOM_REPS_KEY = "notation_trainer_custom_lines_v1";

function _loadCustomLines() {
  try {
    const raw = window.localStorage.getItem(CUSTOM_REPS_KEY);
    if (!raw) return [];
    const parsed = _safeJsonParse(raw, []);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function _saveCustomLines(lines) {
  try {
    window.localStorage.setItem(CUSTOM_REPS_KEY, JSON.stringify(lines || []));
  } catch (_) {
    // ignore
  }
}

function _makeCustomId() {
  return "custom-" + Date.now() + "-" + Math.floor(Math.random() * 1000000);
}

function _splitMovesText(text) {
  const t = String(text || "").trim();
  if (!t) return [];
  return t
    .split(/[\n\r\t ,]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function _validateSanMoves(moves) {
  try {
    const g = new Chess();
    for (let i = 0; i < moves.length; i += 1) {
      const san = moves[i];
      const mv = g.move(san, { sloppy: true });
      if (!mv) return { ok: false, index: i, san: san };
    }
    return { ok: true };
  } catch (_) {
    return { ok: false, index: 0, san: "" };
  }
}


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
  const defaults = { 
    showConfetti: true, 
    playSounds: true,
    boardTheme: DEFAULT_THEME 
  };
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaults;
    const parsed = _safeJsonParse(raw, defaults);
    if (!parsed || typeof parsed !== "object") return defaults;

    return {
      showConfetti: parsed.showConfetti !== false,
      playSounds: parsed.playSounds !== false,
      boardTheme: parsed.boardTheme || DEFAULT_THEME
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
    const customAll = _loadCustomLines();
    const customForFirst = customAll.filter((l) => l && l.openingKey === firstSetKey);
    const firstLines = firstLinesBuiltIn.concat(customForFirst);
    const firstId = _pickRandomLineId(firstLines, null) || (firstLines[0] ? firstLines[0].id : "");

    this._autoNextTimer = null;
    this._confettiTimer = null;
    this._streakToastTimer = null;

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
      streakToastText: ""
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

  componentDidMount() {
    window.addEventListener("mousedown", this.onWindowClick);
    window.addEventListener("keydown", this.onKeyDown);
    this._backfillActivityFromStreak();
    this.resetLine(false);
  
    if (this._openCustomOnMount) {
      this._openCustomOnMount = false;
      this.openCustomModal();
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
  const moves = _splitMovesText(this.state.customMovesText);

  if (!moves.length) {
    this.setState({ customError: "Paste moves in SAN format first." });
    return;
  }

  const v = _validateSanMoves(moves);
  if (!v.ok) {
    this.setState({
      customError: `Bad move at #${(v.index || 0) + 1}: ${v.san || ""}`
    });
    return;
  }

  const name = nameRaw || `My rep (${moves.length} moves)`;

  const nextLine = {
    id: _makeCustomId(),
    openingKey: openingKey,
    category: "My Reps",
    name: name,
    description: "",
    moves: moves,
    explanations: moves.map(() => "")
  };

  const existing = (this.state.customLines || []).slice();
  const next = existing.concat([nextLine]);
  _saveCustomLines(next);

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

renderCustomModal = () => {
  if (!this.state.customModalOpen) return null;

  return (
    <div className="ot-modal-overlay" onMouseDown={this.closeCustomModal}>
      <div className="ot-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ot-modal-title">Add custom rep</div>

        {this.state.customError ? <div className="ot-modal-error">{this.state.customError}</div> : null}

        <label className="ot-modal-label">
          Name (optional)
          <input
            className="ot-modal-input"
            value={this.state.customName}
            onChange={(e) => this.setState({ customName: e.target.value })}
            placeholder="Example: My London vs Qb6"
          />
        </label>

        <label className="ot-modal-label">
          Moves (SAN, separated by spaces, commas, or new lines)
          <textarea
            className="ot-modal-textarea"
            value={this.state.customMovesText}
            onChange={(e) => this.setState({ customMovesText: e.target.value })}
            placeholder="d4 d5 Bf4 Nf6 e3 e6 Nd2 c5 c3 Nc6"
          />
        </label>

        <div className="ot-modal-actions">
          <button className="ot-button ot-button-small" onClick={this.closeCustomModal}>
            Cancel
          </button>
          <button className="ot-button ot-button-small ot-button-primary" onClick={this.saveCustomModal}>
            Save
          </button>
        </div>

        <div className="ot-modal-hint">
          Tip: use standard SAN like Nf3, Bb5, O-O, exd5, Qxd8.
        </div>
      </div>
    </div>
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

  toggleLineMenuOpen = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    this.setState({ lineMenuOpen: !this.state.lineMenuOpen });
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
    progress.openings[openingKey].lastPlayedAt = Date.now();
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
        legalTargets: []
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
  const text = unlocked ? this.sanitizeExplanation(raw, expectedSan) : raw;

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
          className="ot-confetti"
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

    return <div className="ot-confetti-layer">{pieces}</div>;
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
        {this.renderConfetti()}
        {this.renderCustomModal()}

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

export default OpeningTrainer;
