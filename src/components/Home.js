import React, { Component } from "react";
import Chessboard from "chessboardjsx";
import TopNav from "./TopNav";
import { londonLines } from "../openings/londonLines";
import { sicilianDefenseLines } from "../openings/sicilianDefenseLines";
import "./Home.css";

const STORAGE_KEY = "notation_trainer_opening_progress_v2";

const OPENINGS = [
  {
    key: "london",
    title: "London",
    description:
      "Reliable structure and easy development. Drill the move orders until it stops collapsing in real games.",
    lines: londonLines,
    accent: "gold",
    badge: "New",
    position: "start",
    orientation: "white"
  },
  {
    key: "sicilian",
    title: "Sicilian Defense",
    description:
      "Fight for imbalance as Black. Learn the common setups and the move orders that actually show up.",
    lines: sicilianDefenseLines,
    accent: "purple",
    badge: null,
    position: "start",
    orientation: "black"
  }
];

function _safeJsonParse(text, fallback) {
  try {
    return JSON.parse(text);
  } catch (_) {
    return fallback;
  }
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

function _isCompleted(stats) {
  return (stats && stats.timesClean >= 1) || false;
}

function _deriveCompletedCount(progress, openingKey, lines) {
  const total = (lines && lines.length) || 0;
  const statsMap = (progress && progress.lines && progress.lines[openingKey]) || {};

  let completed = 0;
  for (const l of lines || []) {
    const s = statsMap[l.id];
    if (_isCompleted(s)) completed += 1;
  }

  return { completed, total };
}

const calcThumbWidth = ({ screenWidth, screenHeight }) => {
  const w = screenWidth || screenHeight || 0;
  if (w && w < 520) return 96;
  return 120;
};

class Home extends Component {
  constructor(props) {
    super(props);

    const progress = _loadProgress();

    const perOpening = {};
    let totalCompleted = 0;
    let totalLines = 0;

    for (const o of OPENINGS) {
      const r = _deriveCompletedCount(progress, o.key, o.lines);
      perOpening[o.key] = r;
      totalCompleted += r.completed;
      totalLines += r.total;
    }

    this.state = {
      search: "",
      progress,
      perOpening,
      totalCompleted,
      totalLines
    };
  }

  onSearchChange = (e) => {
    this.setState({ search: (e && e.target && e.target.value) || "" });
  };

  goToOpening = (openingKey) => {
    if (!openingKey) return;
    if (!this.props || !this.props.history || !this.props.history.push) return;
    this.props.history.push(`/openings?opening=${encodeURIComponent(openingKey)}`);
  };

  renderCard = (o) => {
    const stats = this.state.perOpening[o.key] || { completed: 0, total: (o.lines && o.lines.length) || 0 };
    const pct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

    return (
      <div
        key={o.key}
        class={`home-course-card ${o.accent ? `accent-${o.accent}` : ""}`}
        role="button"
        tabIndex={0}
        onClick={() => this.goToOpening(o.key)}
        onKeyDown={(e) => {
          if (e && (e.key === "Enter" || e.key === " ")) this.goToOpening(o.key);
        }}
      >
        <div class="home-course-thumb">
          <Chessboard
            draggable={false}
            position={o.position || "start"}
            orientation={o.orientation || "white"}
            showNotation={false}
            calcWidth={calcThumbWidth}
          />
        </div>

        <div class="home-course-main">
          <div class="home-course-top">
            <div class="home-course-title">{o.title}</div>
            {o.badge ? <div class="home-course-badge">{o.badge}</div> : null}
          </div>

          <div class="home-course-desc">{o.description}</div>

          <div class="home-course-progress-row">
            <div class="home-course-progress">
              <div class="home-course-progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <div class="home-course-total">{stats.total} lines total</div>
          </div>

          <div class="home-course-cta">Start learning →</div>
        </div>
      </div>
    );
  };

  render() {
    const q = (this.state.search || "").trim().toLowerCase();
    const filtered = !q
      ? OPENINGS
      : OPENINGS.filter((o) => {
          const t = (o.title || "").toLowerCase();
          const d = (o.description || "").toLowerCase();
          return t.includes(q) || d.includes(q);
        });

    return (
      <div class="home-page">
      <TopNav title="Chess Opening Reps" />
<div class="home-courses">
          <div class="home-courses-header">
            <div class="home-search">
              <span class="home-search-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M10.5 18.5C14.6421 18.5 18 15.1421 18 11C18 6.85786 14.6421 3.5 10.5 3.5C6.35786 3.5 3 6.85786 3 11C3 15.1421 6.35786 18.5 10.5 18.5Z"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </span>
              <input
                class="home-search-input"
                placeholder="Search openings..."
                value={this.state.search}
                onChange={this.onSearchChange}
              />
            </div>

            <div class="home-lines-learned">
              {this.state.totalCompleted}/{this.state.totalLines} lines learned
            </div>
          </div>

          <div class="home-course-grid">{filtered.map(this.renderCard)}</div>
        </div>
      </div>
    );
  }
}

export default Home;
