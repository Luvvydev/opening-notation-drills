import React, { Component } from "react";
import Chessboard from "chessboardjsx";
import * as Chess from "chess.js";
import TopNav from "./TopNav";
import { OPENING_CATALOG } from "../openings/openingCatalog";
import { BOARD_THEMES, DEFAULT_THEME } from "../theme/boardThemes";
import "./Home.css";

const STORAGE_KEY = "notation_trainer_opening_progress_v2";

const OPENINGS = OPENING_CATALOG;

const _previewFenCache = new Map();

function _tokenizePgnLike(text) {
  if (!text) return [];
  const s = String(text).trim();
  if (!s) return [];
  const raw = s.split(/\s+/).filter(Boolean);
  const out = [];
  for (const t of raw) {
    // drop move numbers like "1." or "12..." and results
    if (/^\d+\.{1,3}$/.test(t)) continue;
    if (t === "*" || t === "1-0" || t === "0-1" || t === "1/2-1/2") continue;
    out.push(t);
  }
  return out;
}

function _extractMovesFromLine(line) {
  if (!line) return [];
  // line can be: string, array of SAN strings, or object containing moves fields
  if (typeof line === "string") return _tokenizePgnLike(line);
  if (Array.isArray(line)) {
    // array might be ["e4", "e5", ...] or include move numbers
    return _tokenizePgnLike(line.join(" "));
  }
  if (typeof line === "object") {
    if (Array.isArray(line.moves)) return line.moves;
    if (Array.isArray(line.san)) return line.san;
    if (typeof line.moves === "string") return _tokenizePgnLike(line.moves);
    if (typeof line.line === "string") return _tokenizePgnLike(line.line);
    if (typeof line.pgn === "string") return _tokenizePgnLike(line.pgn);
    if (typeof line.sequence === "string") return _tokenizePgnLike(line.sequence);
    if (typeof line.text === "string") return _tokenizePgnLike(line.text);
  }
  return [];
}

function _getPreviewFenForOpening(opening) {
  const cacheKey = (opening && (opening.key || opening.id || opening.title)) || "unknown";
  if (_previewFenCache.has(cacheKey)) return _previewFenCache.get(cacheKey);

  try {
    const lines = (opening && opening.lines) || [];
    const first = lines && lines.length ? lines[0] : null;
    const moves = _extractMovesFromLine(first);

    const game = new Chess();
    if (moves && moves.length) {
      // Apply first two plies: white move then black move
      game.move(moves[0], { sloppy: true });
      if (moves.length > 1) game.move(moves[1], { sloppy: true });
    }

    const fen = game.fen() || "start";
    _previewFenCache.set(cacheKey, fen);
    return fen;
  } catch (_) {
    _previewFenCache.set(cacheKey, "start");
    return "start";
  }
}



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

function _loadSettings() {
  const defaults = {
    showConfetti: true,
    playSounds: true,
    boardTheme: DEFAULT_THEME
  };
  try {
    const raw = window.localStorage.getItem("notation_trainer_opening_settings_v1");
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
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

function _isCompleted(stats) {
  return (stats && stats.timesClean >= 1) || false;
}

function _deriveCompletedCount(progress, openingKey, lines) {
  const total = (lines && lines.length) || 0;
  const statsMap = (progress && progress.lines && progress.lines[openingKey]) || {};

  let completed = 0;
  for (const l of lines || []) {
    const s = statsMap[l.id] || {};
    if (_isCompleted(s)) completed += 1;
  }

  return { completed, total };
}

const snapBoardWidth = (n) => {
  const v = Math.max(0, Math.floor(Number(n) || 0));
  // Chessboard squares are 1/8 of width. Snap to a multiple of 8 to avoid subpixel piece drift.
  return Math.max(8, Math.round(v / 8) * 8);
};

// KEY FIX: Ensure card thumbnails use pixel-perfect dimensions
// 160px is divisible by 8 (160 ÷ 8 = 20px per square), which ensures perfect alignment
const CARD_THUMB_W = 160;


class Home extends Component {
  constructor(props) {
    super(props);

    const progress = _loadProgress();
    const settings = _loadSettings();

    this.heroFrameRef = React.createRef();

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
      totalLines,
      boardTheme: settings.boardTheme || DEFAULT_THEME,
      viewportW: typeof window !== "undefined" ? window.innerWidth : 1200,
      heroBoardW: null,
      filtersOpen: false,
      filters: {
        color: { white: false, black: false },
        progress: { new: false, inProgress: false, completed: false }
      }
    };
  }

  componentDidMount() {
    if (typeof window === "undefined") return;
    window.addEventListener("resize", this.handleResize);
    this.updateHeroBoardWidth();
    setTimeout(this.updateHeroBoardWidth, 0);
  }

  componentWillUnmount() {
    if (typeof window === "undefined") return;
    window.removeEventListener("resize", this.handleResize);
  }

  handleResize = () => {
    this.setState({ viewportW: window.innerWidth });
    this.updateHeroBoardWidth();
  };

  updateHeroBoardWidth = () => {
    const el = this.heroFrameRef && this.heroFrameRef.current;
    if (!el) return;

    const available = Math.max(260, el.clientWidth - 28);
    const max = 420;
    const next = snapBoardWidth(Math.min(max, available));

    if (this.state.heroBoardW !== next) {
      this.setState({ heroBoardW: next });
    }
  };

  getHeroBoardWidth = () => {
    const w = (this.state && this.state.viewportW) || 1200;
    const max = 420;

    // Clamp to viewport on mobile to avoid horizontal overflow.
    const clamped = Math.max(260, w - 72);
    return snapBoardWidth(Math.min(max, clamped));
  };


  onSearchChange = (e) => {
    this.setState({ search: (e && e.target && e.target.value) || "" });
  };

  goToOpening = (openingKey) => {
    if (!openingKey) return;
    if (!this.props || !this.props.history || !this.props.history.push) return;
    this.props.history.push(`/openings?opening=${encodeURIComponent(openingKey)}`);
  };

  goToCreateCustomRep = () => {
    if (!this.props || !this.props.history || !this.props.history.push) return;
    this.props.history.push(`/openings?opening=${encodeURIComponent("london")}&custom=1`);
  };

  toggleFilters = () => {
    this.setState((s) => ({ filtersOpen: !s.filtersOpen }));
  };

  toggleFilter = (group, key) => {
    this.setState((s) => ({
      filters: {
        ...s.filters,
        [group]: {
          ...s.filters[group],
          [key]: !s.filters[group][key]
        }
      }
    }));
  };


startFirstAvailable = () => {
  const openings = OPENINGS || [];
  if (!openings.length) return;

  const progressOpenings =
    (this.state.progress && this.state.progress.openings) || {};

  let best = null;
  let bestTs = 0;

  for (const o of openings) {
    const p = progressOpenings[o.key] || {};
    const ts = Number(p.lastPlayedAt) || 0;
    if (ts > bestTs) {
      bestTs = ts;
      best = o;
    }
  }

  this.goToOpening((best || openings[0]).key);
};

renderHeroBoard = () => {
  const theme = BOARD_THEMES[this.state.boardTheme] || BOARD_THEMES[DEFAULT_THEME];

  const boardW =
    this.state.heroBoardW != null ? this.state.heroBoardW : this.getHeroBoardWidth();

  return (
    <div className="home-hero-board-frame" ref={this.heroFrameRef}>
      <div className="home-hero-board-inner">
        <Chessboard
          draggable={false}
          position="start"
          orientation="white"
          showNotation={false}
          width={boardW}
          {...theme}
        />
      </div>

      <div className="home-hero-stats">
        <div className="home-hero-stat">
          <div className="home-hero-stat-value">{this.state.totalLines}</div>
          <div className="home-hero-stat-label">total lines</div>
        </div>

        <div className="home-hero-stat">
          <div className="home-hero-stat-value">{this.state.totalCompleted}</div>
          <div className="home-hero-stat-label">lines learned</div>
        </div>

        <div className="home-hero-stat">
          <div className="home-hero-stat-value">{OPENINGS.length}</div>
          <div className="home-hero-stat-label">openings</div>
        </div>
      </div>
    </div>
  );
};

  renderCard = (o) => {
    const stats =
      this.state.perOpening[o.key] || { completed: 0, total: (o.lines && o.lines.length) || 0 };
    const pct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

    return (
      <div
        key={o.key}
        className={`home-course-card ${o.accent ? `accent-${o.accent}` : ""}`}
        role="button"
        tabIndex={0}
        onClick={() => this.goToOpening(o.key)}
        onKeyDown={(e) => {
          if (!e) return;
          if (e.key === "Enter") {
            this.goToOpening(o.key);
            return;
          }
          if (e.key === " ") {
            e.preventDefault();
            this.goToOpening(o.key);
          }
        }}
      >
        <div className="home-course-thumb">
          <Chessboard
            draggable={false}
            position={(o.position && o.position !== "start") ? o.position : _getPreviewFenForOpening(o)}
            orientation={o.orientation || "white"}
            showNotation={false}
            // KEY FIX: Use exact pixel-perfect dimensions
            width={CARD_THUMB_W}
            {...BOARD_THEMES[this.state.boardTheme]}
          />
        </div>

        <div className="home-course-main">
          <div className="home-course-top">
            <div className="home-course-title">{o.title}</div>
            {o.badge ? <div className="home-course-badge">{o.badge}</div> : null}
          </div>

          <div className="home-course-desc">{o.description}</div>

          <div className="home-course-progress-row">
            <div className="home-course-progress">
              <div className="home-course-progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="home-course-total">{stats.total} lines total</div>
          </div>

          <div className="home-course-cta">Start learning &gt;</div>
        </div>
      </div>
    );
  };

  render() {

    const q = (this.state.search || "").trim().toLowerCase();
    const searchFiltered = !q
      ? OPENINGS
      : OPENINGS.filter((o) => {
          const t = (o.title || "").toLowerCase();
          const d = (o.description || "").toLowerCase();
          return t.includes(q) || d.includes(q);
        });

    const filters = this.state.filters || {};
    const anyChecked = (group) => Object.values(group || {}).some(Boolean);

    const colorActive = anyChecked(filters.color);
    const progressActive = anyChecked(filters.progress);

    const deriveProgress = (o) => {
      const stats =
        this.state.perOpening[o.key] || { completed: 0, total: (o.lines && o.lines.length) || 0 };
      const p =
        (this.state.progress &&
          this.state.progress.openings &&
          this.state.progress.openings[o.key]) ||
        {};
      const lastPlayedAt = Number(p.lastPlayedAt) || 0;

      const isCompleted = stats.total > 0 && stats.completed >= stats.total;
      const isNew = o.badge === "New" || lastPlayedAt <= 0;

      if (isCompleted) return "completed";
      if (isNew) return "new";
      return "inProgress";
    };

    const filtered = searchFiltered.filter((o) => {
      if (colorActive) {
        const ori = (o.orientation || "white").toLowerCase();
        if (!filters.color[ori]) return false;
      }

      if (progressActive) {
        const p = deriveProgress(o);
        if (!filters.progress[p]) return false;
      }

      return true;
    });

    const withMeta = filtered.map((o, idx) => {
      const p =
        (this.state.progress &&
          this.state.progress.openings &&
          this.state.progress.openings[o.key]) ||
        {};
      const lastPlayedAt = Number(p.lastPlayedAt) || 0;
      const isNew = o.badge === "New";
      const group = lastPlayedAt > 0 ? 0 : isNew ? 1 : 2;
      return { o, idx, lastPlayedAt, group };
    });

    withMeta.sort((a, b) => {
      if (a.group !== b.group) return a.group - b.group;
      if (a.group === 0) return b.lastPlayedAt - a.lastPlayedAt;
      return a.idx - b.idx;
    });

    const sorted = withMeta.map((x) => x.o);
    const progressOpenings =
      (this.state.progress && this.state.progress.openings) || {};



        const recommendedCount = 2;

    const getStatsFor = (o) =>
      this.state.perOpening[o.key] || { completed: 0, total: (o.lines && o.lines.length) || 0 };

    const getLastPlayedAtFor = (o) =>
      Number((progressOpenings[o.key] || {}).lastPlayedAt) || 0;

    const isCompletedOpening = (o) => {
      const s = getStatsFor(o);
      return s.total > 0 && s.completed >= s.total;
    };

    const isStartedOpening = (o) => getLastPlayedAtFor(o) > 0;

    const isNewOpening = (o) => o.badge === "New";

    const startedNotCompleted = sorted
      .filter((o) => isStartedOpening(o) && !isCompletedOpening(o))
      .sort((a, b) => getLastPlayedAtFor(b) - getLastPlayedAtFor(a));

    const recentlyPlayed = sorted
      .filter((o) => isStartedOpening(o) && isCompletedOpening(o))
      .sort((a, b) => getLastPlayedAtFor(b) - getLastPlayedAtFor(a));

    const newOpenings = sorted
      .filter((o) => !isStartedOpening(o) && isNewOpening(o));

    const fallbackCatalog = sorted
      .filter((o) => !isStartedOpening(o) && !isNewOpening(o));

    const recommendedPool = [
      ...startedNotCompleted,
      ...recentlyPlayed,
      ...newOpenings,
      ...fallbackCatalog
    ];

    const recommended = recommendedPool.slice(0, recommendedCount);
return (
<div className="home-page">
  <TopNav title="Chess Opening Drills"  hideHero />

  <div className="home-hero-v2">
    <div className="home-hero-v2-inner">
      <div className="home-hero-v2-left">
        
        <div className="home-hero-v2-title">Ready to improve?</div>
        <div className="home-hero-v2-sub">
          Start building accurate move recall today!
        </div>

        <button
          type="button"
          className="home-hero-v2-cta"
          onClick={this.startFirstAvailable}
        >
          Start Drilling →
        </button>

        <div className="home-hero-v2-pillrow">
          <div className="home-hero-v2-pill">Learn</div>
          <div className="home-hero-v2-pill">Practice</div>
          <div className="home-hero-v2-pill">Drill</div>
        </div>
      </div>

      <div className="home-hero-v2-right">{this.renderHeroBoard()}</div>
    </div>
  </div>

  <div className="home-courses">

          <div className="home-courses-header">
            <div className="home-search-wrap">
              <div className="home-search">
                <span className="home-search-icon">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M16.5 16.5 21 21"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <input
                  className="home-search-input"
                  placeholder="Search openings..."
                  value={this.state.search}
                  onChange={this.onSearchChange}
                />
              </div>

              <button
                className="home-filter-button"
                onClick={this.toggleFilters}
                type="button"
              >
                Filters
              </button>

              {this.state.filtersOpen && (
                <div className="home-filters-panel">
                  <div className="filter-section">
                    <div className="filter-title">Color</div>

                    {["white", "black"].map((k) => (
                      <label key={k} className="checkbox-container">
                        {k.charAt(0).toUpperCase() + k.slice(1)}
                        <input
                          type="checkbox"
                          checked={this.state.filters.color[k]}
                          onChange={() => this.toggleFilter("color", k)}
                        />
                        <span className="checkmark" />
                      </label>
                    ))}
                  </div>

                  <div className="filter-section">
                    <div className="filter-title">Progress</div>

                    {[
                      ["new", "New"],
                      ["inProgress", "In Progress"],
                      ["completed", "Completed"]
                    ].map(([k, label]) => (
                      <label key={k} className="checkbox-container">
                        {label}
                        <input
                          type="checkbox"
                          checked={this.state.filters.progress[k]}
                          onChange={() => this.toggleFilter("progress", k)}
                        />
                        <span className="checkmark" />
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="home-header-right">
              <button className="home-create-rep" onClick={this.goToCreateCustomRep}>
                <span className="home-create-rep-icon" role="img" aria-label="create custom line">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M16.5 3.5L20.5 7.5L8 20H4V16L16.5 3.5Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </button>

              <div className="home-lines-learned">
                {this.state.totalCompleted}/{this.state.totalLines} lines learned
              </div>
            </div>
          </div>

          <div className="home-section home-section--recommended">
            <div className="home-section-row">
              <div className="home-section-left">
                <div className="home-section-title">Recommended for you</div>
                <div className="home-section-sub">Picked based on your recent drills</div>
              </div>
            </div>
            <div className="home-course-grid">{recommended.map(this.renderCard)}</div>
          </div>

          <div className="home-section home-section--all">
            <div className="home-section-row home-section-row-tight">
              <div className="home-section-left">
                <div className="home-section-title">All openings</div>
                <div className="home-section-sub">Browse the full library</div>
              </div>
              <div className="home-section-meta">Total: {OPENINGS.length}</div>
            </div>

            <div className="home-course-grid">{sorted.map(this.renderCard)}</div>
          </div>
        
        </div>
      </div>
    );
  }

}

export default Home;