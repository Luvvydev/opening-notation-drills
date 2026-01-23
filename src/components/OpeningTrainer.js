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
      progress: progress
    };

    this._countedSeenForRun = false;
  }

  componentDidMount() {
    this.resetLine(false);
  }

  componentWillUnmount() {
    if (this._autoNextTimer) clearTimeout(this._autoNextTimer);
    if (this._confettiTimer) clearTimeout(this._confettiTimer);
  }

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

  resetLine = (keepUnlocked) => {
    this.game.reset();
    this.setState(
      {
        fen: "start",
        stepIndex: 0,
        completed: false,
        mistakeUnlocked: keepUnlocked ? this.state.mistakeUnlocked : false,
        lastMistake: null,
        wrongAttempt: null
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
        wrongAttempt: null
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
        wrongAttempt: null
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
        wrongAttempt: null
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

    while (stepIndex < line.moves.length && this.game.turn() !== playerColor) {
      const expected = line.moves[stepIndex];
      const mv = this.game.move(expected);
      if (!mv) {
        this.setState({ fen: this.game.fen() });
        return;
      }
      stepIndex += 1;
    }

    const completed = stepIndex >= line.moves.length;

    this.setState(
      {
        fen: this.game.fen(),
        stepIndex: stepIndex,
        completed: completed
      },
      () => {
        if (completed) this.onCompletedLine();
      }
    );
  };

  onCompletedLine = () => {
    if (this._autoNextTimer) clearTimeout(this._autoNextTimer);
    if (this._confettiTimer) clearTimeout(this._confettiTimer);

    const wasClean = !this.state.mistakeUnlocked;
    this.bumpCompleted(wasClean);

    this.setState({ confettiActive: true });

    this._confettiTimer = setTimeout(() => {
      this.setState({ confettiActive: false });
    }, 1200);

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

      this.bumpMistake();
      this.game.undo();

      this.setState({
        fen: this.game.fen(),
        completed: false,
        mistakeUnlocked: true,
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

    const nextStep = this.state.stepIndex + 1;

    this.setState(
      {
        fen: this.game.fen(),
        stepIndex: nextStep,
        lastMistake: null,
        wrongAttempt: null
      },
      () => {
        this.playAutoMovesIfNeeded();
      }
    );
  };

  allowDrag = ({ piece }) => {
    if (this.state.completed) return false;
    if (this.state.wrongAttempt) return false;

    const playerColor = this.getPlayerColor();
    if (this.game.turn() !== playerColor) return false;

    return piece && piece.charAt(0) === playerColor;
  };

  renderRelevantExplanation = () => {
    if (!this.state.mistakeUnlocked) return null;

    const line = this.getLine();
    if (!line) return null;

    if (this.state.completed) return null;

    const i = this.state.stepIndex;
    const san = line.moves[i];
    const expl = line.explanations[i] || "";

    if (!san) return null;

    return (
      <div>
        <div class="ot-steps-title">Current step explanation</div>
        <div class="ot-step ot-step-next">
          <div class="ot-step-header">
            <span class="ot-step-index">
              Step {i + 1} of {line.moves.length}
            </span>
            <span class="ot-step-move ot-move-mono">{san}</span>
          </div>
          <div class="ot-step-expl">{expl}</div>
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

    const openingSet = this.getOpeningSet();
    const openingLabel = openingSet ? openingSet.label : "Opening";
    const lines = this.getLines();
    const summary = _deriveOpeningSummary(this.state.progress, this.state.openingKey, lines);

    const nextExpected = line.moves[this.state.stepIndex] || null;

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

        <div class={"ot-subtitle" + (lineCompleted ? " ot-subtitle-complete" : "")}>{line.name}</div>
        <div class={"ot-subtitle2" + (lineCompleted ? " ot-subtitle2-complete" : "")}>{line.description}</div>

        <div class="ot-main">
          <div class="ot-board">
            <Chessboard
              position={this.state.fen}
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
                      {lines.map((l) => {
                        const s = _getLineStats(this.state.progress, this.state.openingKey, l.id);
                        const symbol = _isCompleted(s) ? "✓" : s.timesSeen > 0 ? "•" : "○";
                        return (
                          <option key={l.id} value={l.id}>
                            {symbol} {l.name}
                          </option>
                        );
                      })}
                    </select>

                    {/* make this clickable again (compact opening selector in the sidebar) */}
                    <select class="ot-pill-select" value={this.state.openingKey} onChange={this.setOpeningKey}>
                      <option value="london">London</option>
                      <option value="sicilian">Sicilian</option>
                    </select>

                    <span class="ot-pill">Trainer</span>
                  </div>

                  <span class="ot-pill">{this.state.linePicker === "random" ? "random" : "selected"}</span>
                </div>

                <div class="ot-progress-wrap">
                  <div class="ot-progress-bar">
                    <div class="ot-progress-fill" style={{ width: yourProgressPct + "%" }} />
                  </div>
                </div>
              </div>

              <div class="ot-panel-body">
                <div class="ot-card ot-card-progress">
                  <div class="ot-card-title">Progress</div>

                  <div class="ot-row">
                    <span class="ot-label2">Completed</span>
                    <span class="ot-value2">
                      {summary.completed}/{summary.total}
                    </span>
                  </div>

                  <div class="ot-progress-bar ot-progress-bar-mini">
                    <div class="ot-progress-fill" style={{ width: completedPct + "%" }} />
                  </div>

                  <div class="ot-stat-grid">
                    <div class="ot-stat">
                      <div class="ot-stat-k">Streak</div>
                      <div class="ot-stat-v">{summary.streak}</div>
                    </div>
                    <div class="ot-stat">
                      <div class="ot-stat-k">Best</div>
                      <div class="ot-stat-v">{summary.bestStreak}</div>
                    </div>
                    <div class="ot-stat">
                      <div class="ot-stat-k">Today</div>
                      <div class="ot-stat-v">{summary.completedToday}</div>
                    </div>
                    <div class="ot-stat">
                      <div class="ot-stat-k">Clean %</div>
                      <div class="ot-stat-v">{summary.accuracyPct}%</div>
                    </div>
                  </div>

                  <div class="ot-muted ot-muted-small">Completed = 1 clean completion.</div>
                </div>

                <div class="ot-card">
                  <div class="ot-row">
                    <span class="ot-label2">Next expected</span>
                    <span class="ot-value2 ot-move-mono">{nextExpected ? nextExpected : "(done)"}</span>
                  </div>
                  <div class="ot-row">
                    <span class="ot-label2">Your moves</span>
                    <span class="ot-value2">
                      {doneYourMoves}/{totalYourMoves}
                    </span>
                  </div>

                  {/* retry button in the right panel */}
                  <div class="ot-actions">
                    <button class="ot-button ot-button-small" onClick={this.retryLine}>
                      Retry
                    </button>
                    {this.state.linePicker === "random" ? (
                      <button class="ot-button ot-button-small" onClick={this.startRandomLine}>
                        New random
                      </button>
                    ) : null}
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

                {this.renderRelevantExplanation()}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default OpeningTrainer;
