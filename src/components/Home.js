import React, { Component } from "react";
import Chessboard from "chessboardjsx";
import * as Chess from "chess.js";
import TopNav from "./TopNav";
import { OPENING_CATALOG } from "../openings/openingCatalog";
import { BOARD_THEMES, DEFAULT_THEME } from "../theme/boardThemes";
import "./Home.css";
import SEO from "./SEO";

const STORAGE_KEY = "notation_trainer_opening_progress_v2";
const LEARN_STORAGE_KEY = "notation_trainer_learn_progress_v1";

const OPENINGS = OPENING_CATALOG;

const _previewFenCache = new Map();
const PREVIEW_PLIES = 6;
const HERO_AUTOPLAY_MS = 9000;

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
  // Fast path: stable key based caching
  const stableBase =
    (opening && (opening.key || opening.id || opening.title)) || null;

  if (stableBase) {
    const stableKey = `${stableBase}|plies=${PREVIEW_PLIES}|pos=${opening.position || "start"}|ori=${opening.orientation || "white"}`;
    if (_previewFenCache.has(stableKey)) return _previewFenCache.get(stableKey);

    try {
      const lines = (opening && opening.lines) || [];
      const first = lines && lines.length ? lines[0] : null;
      const moves = _extractMovesFromLine(first);

      const game = new Chess();
      if (moves && moves.length) {
        // Apply first N plies: W1 B1 W2 B2 W3 B3 (or fewer if the line is shorter)
        const plies = Math.min(PREVIEW_PLIES, moves.length);
        for (let i = 0; i < plies; i += 1) {
          const mv = moves[i];
          if (!mv) break;
          const ok = game.move(mv, { sloppy: true });
          if (!ok) break;
        }
      }

      const fen = game.fen() || "start";
      _previewFenCache.set(stableKey, fen);
      return fen;
    } catch (_) {
      _previewFenCache.set(stableKey, "start");
      return "start";
    }
  }

  // Fallback: build a signature to avoid collisions when key/id/title is missing
  try {
    const lines = (opening && opening.lines) || [];
    const first = lines && lines.length ? lines[0] : null;
    const moves = _extractMovesFromLine(first);

    const signature = `sig|plies=${PREVIEW_PLIES}|pos=${(opening && opening.position) || "start"}|ori=${(opening && opening.orientation) || "white"}|moves=${(moves || []).slice(0, PREVIEW_PLIES).join(" ")}`;
    if (_previewFenCache.has(signature)) return _previewFenCache.get(signature);

    const game = new Chess();
    if (moves && moves.length) {
      const plies = Math.min(PREVIEW_PLIES, moves.length);
      for (let i = 0; i < plies; i += 1) {
        const mv = moves[i];
        if (!mv) break;
        const ok = game.move(mv, { sloppy: true });
        if (!ok) break;
      }
    }

    const fen = game.fen() || "start";
    _previewFenCache.set(signature, fen);
    return fen;
  } catch (_) {
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


function _loadLearnProgress() {
  const empty = { openings: {} };
  try {
    const raw = window.localStorage.getItem(LEARN_STORAGE_KEY);
    if (!raw) return empty;
    const parsed = _safeJsonParse(raw, empty);
    if (!parsed || typeof parsed !== "object") return empty;
    if (!parsed.openings || typeof parsed.openings !== "object") parsed.openings = {};
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

function _deriveCompletedCount(progress, learnProgress, openingKey, lines) {
  const total = (lines && lines.length) || 0;
  const statsMap = (progress && progress.lines && progress.lines[openingKey]) || {};
  const learnStatsMap =
    (learnProgress &&
      learnProgress.openings &&
      learnProgress.openings[openingKey] &&
      learnProgress.openings[openingKey].lines) ||
    {};

  let completed = 0;
  for (const l of lines || []) {
    const s = statsMap[l.id] || {};
    const ls = learnStatsMap[l.id] || {};
    if (_isCompleted(s) || _isCompleted(ls)) completed += 1;
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
    const learnProgress = _loadLearnProgress();
    const settings = _loadSettings();

    this.heroFrameRef = React.createRef();

    const summary = this.buildProgressSummary(progress, learnProgress);
    const perOpening = summary.perOpening;
    const totalCompleted = summary.totalCompleted;
    const totalLines = summary.totalLines;

    this.state = {
      search: "",
      progress,
      
      learnProgress,
perOpening,
      totalCompleted,
      totalLines,
      boardTheme: settings.boardTheme || DEFAULT_THEME,
      viewportW: typeof window !== "undefined" ? window.innerWidth : 1200,
      heroBoardW: null,
      heroSlideIndex: 0,
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
    window.addEventListener("progress:updated", this.refreshProgressState);
    window.addEventListener("learnprogress:updated", this.refreshProgressState);
    window.addEventListener("storage", this.refreshProgressState);
    this.updateHeroBoardWidth();
    this.startHeroAutoplay();
    setTimeout(this.updateHeroBoardWidth, 0);
    this.refreshProgressState();
  }

  buildProgressSummary = (progress, learnProgress) => {
    const perOpening = {};
    let totalCompleted = 0;
    let totalLines = 0;

    for (const o of OPENINGS) {
      const r = _deriveCompletedCount(progress, learnProgress, o.key, o.lines);
      perOpening[o.key] = r;
      totalCompleted += r.completed;
      totalLines += r.total;
    }

    return { perOpening, totalCompleted, totalLines };
  };

  refreshProgressState = () => {
    const progress = _loadProgress();
    const learnProgress = _loadLearnProgress();
    const summary = this.buildProgressSummary(progress, learnProgress);

    this.setState({
      progress,
      learnProgress,
      perOpening: summary.perOpening,
      totalCompleted: summary.totalCompleted,
      totalLines: summary.totalLines
    });
  };

  componentWillUnmount() {
    if (typeof window === "undefined") return;
    window.removeEventListener("resize", this.handleResize);
    window.removeEventListener("progress:updated", this.refreshProgressState);
    window.removeEventListener("learnprogress:updated", this.refreshProgressState);
    window.removeEventListener("storage", this.refreshProgressState);
    this.stopHeroAutoplay();
  }

  handleResize = () => {
    this.setState({ viewportW: window.innerWidth });
    this.updateHeroBoardWidth();
  };

  startHeroAutoplay = () => {
    this.stopHeroAutoplay();
    this.heroAutoplay = window.setInterval(() => {
      this.setState((s) => ({
        heroSlideIndex: (s.heroSlideIndex + 1) % 4
      }));
    }, HERO_AUTOPLAY_MS);
  };

  stopHeroAutoplay = () => {
    if (this.heroAutoplay) {
      window.clearInterval(this.heroAutoplay);
      this.heroAutoplay = null;
    }
  };

  nextHeroSlide = () => {
    this.setState((s) => ({
      heroSlideIndex: (s.heroSlideIndex + 1) % 4
    }));
    this.startHeroAutoplay();
  };

  prevHeroSlide = () => {
    this.setState((s) => ({
      heroSlideIndex: (s.heroSlideIndex + 3) % 4
    }));
    this.startHeroAutoplay();
  };

  setHeroSlide = (index) => {
    this.setState({ heroSlideIndex: index });
    this.startHeroAutoplay();
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
    const learnOpenings = (this.state.learnProgress && this.state.learnProgress.openings) || {};
    const lp = learnOpenings[o.key] || {};
    const ts = Math.max(Number(p.lastPlayedAt) || 0, Number(lp.lastPlayedAt) || 0);
    if (ts > bestTs) {
      bestTs = ts;
      best = o;
    }
  }

  this.goToOpening((best || openings[0]).key);
};

renderHeroBoard = (slide) => {
  const theme = BOARD_THEMES[this.state.boardTheme] || BOARD_THEMES[DEFAULT_THEME];

  const boardW =
    this.state.heroBoardW != null ? this.state.heroBoardW : this.getHeroBoardWidth();

  const stats = (slide && slide.stats) || [
    { value: this.state.totalLines, label: "total lines" },
    { value: this.state.totalCompleted, label: "lines learned" },
    { value: OPENINGS.length, label: "openings" }
  ];

  const position = (slide && slide.position) || "start";
  const orientation = (slide && slide.orientation) || "white";

  return (
    <div className="home-hero-board-frame" ref={this.heroFrameRef}>
      <div className="home-hero-board-inner">
        <Chessboard
          draggable={false}
          position={position}
          orientation={orientation}
          showNotation={false}
          width={boardW}
          {...theme}
        />
      </div>

      <div className="home-hero-stats">
        {stats.map((stat) => (
          <div className="home-hero-stat" key={stat.label}>
            <div className="home-hero-stat-value">{stat.value}</div>
            <div className="home-hero-stat-label">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

renderHeroCarousel = (slides) => {
  const safeSlides = slides && slides.length ? slides : [];
  const activeIndex = safeSlides.length
    ? Math.min(this.state.heroSlideIndex, safeSlides.length - 1)
    : 0;
  const activeSlide = safeSlides[activeIndex] || null;

  if (!activeSlide) {
    return null;
  }

  return (
    <div className="home-hero-v2-inner">
      <div className="home-hero-v2-left">
        {activeSlide.kicker ? (
          <div className="home-hero-v2-kicker">{activeSlide.kicker}</div>
        ) : null}

        <div className="home-hero-v2-title">{activeSlide.title}</div>
        <div className="home-hero-v2-sub">{activeSlide.subtitle}</div>

        <button
          type="button"
          className="home-hero-v2-cta"
          onClick={activeSlide.onClick}
        >
          {activeSlide.cta}
        </button>

        {activeSlide.pills && activeSlide.pills.length ? (
          <div className="home-hero-v2-pillrow">
            {activeSlide.pills.map((pill) => (
              <div className="home-hero-v2-pill" key={pill}>
                {pill}
              </div>
            ))}
          </div>
        ) : null}

        <div className="home-hero-carousel-controls">
          <button
            type="button"
            className="home-hero-carousel-arrow"
            onClick={this.prevHeroSlide}
            aria-label="Previous hero slide"
          >
            ‹
          </button>

          <div className="home-hero-carousel-dots" aria-label="Hero slides">
            {safeSlides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                className={`home-hero-carousel-dot ${index === activeIndex ? "is-active" : ""}`}
                onClick={() => this.setHeroSlide(index)}
                aria-label={`Go to slide ${index + 1}`}
                aria-pressed={index === activeIndex}
              />
            ))}
          </div>

          <button
            type="button"
            className="home-hero-carousel-arrow"
            onClick={this.nextHeroSlide}
            aria-label="Next hero slide"
          >
            ›
          </button>
        </div>
      </div>

      <div className="home-hero-v2-right">{this.renderHeroBoard(activeSlide)}</div>
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

    const getLastPlayedAtFor = (o) => {
      const pTs = Number((progressOpenings[o.key] || {}).lastPlayedAt) || 0;
      const lTs = Number(((this.state.learnProgress && this.state.learnProgress.openings && this.state.learnProgress.openings[o.key]) || {}).lastPlayedAt) || 0;
      return Math.max(pTs, lTs);
    };

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

    const resumeOpening = startedNotCompleted[0] || recentlyPlayed[0] || sorted[0];
    const focusOpening = sorted.find((o) => !isCompletedOpening(o)) || sorted[0];
    const exploreOpening = newOpenings[0] || fallbackCatalog[0] || sorted[0];

    const getOpeningPct = (o) => {
      const s = getStatsFor(o);
      if (!s || !s.total) return 0;
      return Math.round((s.completed / s.total) * 100);
    };

    const heroSlides = [
      {
        id: "overview",
        kicker: "Build stronger recall",
        title: "Ready to improve?",
        subtitle: "Start building accurate move recall today.",
        cta: "Start Drilling →",
        onClick: this.startFirstAvailable,
        pills: ["Learn", "Practice", "Drill"],
        position: "start",
        orientation: "white",
        stats: [
          { value: this.state.totalLines, label: "total lines" },
          { value: this.state.totalCompleted, label: "lines learned" },
          { value: OPENINGS.length, label: "openings" }
        ]
      },
      {
        id: "resume",
        kicker: "Continue where you left off",
        title: resumeOpening ? `Resume ${resumeOpening.title}` : "Resume your training",
        subtitle: resumeOpening
          ? "Pick up your most relevant opening and keep your recall clean."
          : "Jump back into your latest work.",
        cta: resumeOpening ? "Continue training →" : "Open trainer →",
        onClick: () => this.goToOpening((resumeOpening && resumeOpening.key) || "london"),
        pills: resumeOpening
          ? [
              `${getOpeningPct(resumeOpening)}% complete`,
              `${getStatsFor(resumeOpening).completed}/${getStatsFor(resumeOpening).total} lines learned`
            ]
          : ["Recent work", "Resume"],
        position: resumeOpening ? _getPreviewFenForOpening(resumeOpening) : "start",
        orientation: (resumeOpening && resumeOpening.orientation) || "white",
        stats: resumeOpening
          ? [
              { value: getOpeningPct(resumeOpening) + "%", label: "course progress" },
              { value: getStatsFor(resumeOpening).completed, label: "lines learned" },
              { value: getStatsFor(resumeOpening).total, label: "lines total" }
            ]
          : undefined
      },
      {
        id: "focus",
        kicker: "Focus next",
        title: focusOpening ? `Sharpen ${focusOpening.title}` : "Sharpen your next opening",
        subtitle: focusOpening
          ? "Work the course with the most room to improve."
          : "Push your next rep further.",
        cta: focusOpening ? "Train this opening →" : "Train now →",
        onClick: () => this.goToOpening((focusOpening && focusOpening.key) || "london"),
        pills: focusOpening
          ? [
              `${getOpeningPct(focusOpening)}% complete`,
              (focusOpening.orientation || "white") === "black" ? "Black repertoire" : "White repertoire"
            ]
          : ["Focus", "Training"],
        position: focusOpening ? _getPreviewFenForOpening(focusOpening) : "start",
        orientation: (focusOpening && focusOpening.orientation) || "white",
        stats: focusOpening
          ? [
              { value: getOpeningPct(focusOpening) + "%", label: "course progress" },
              { value: getStatsFor(focusOpening).total - getStatsFor(focusOpening).completed, label: "lines left" },
              { value: focusOpening.title, label: "focus opening" }
            ]
          : undefined
      },
      {
        id: "explore",
        kicker: "Explore something new",
        title: exploreOpening ? `Try ${exploreOpening.title}` : "Explore another opening",
        subtitle: exploreOpening
          ? "Rotate in a fresh course and build a wider repertoire."
          : "Add something new to your rotation.",
        cta: exploreOpening ? "Explore this opening →" : "Browse openings →",
        onClick: () => this.goToOpening((exploreOpening && exploreOpening.key) || "london"),
        pills: exploreOpening
          ? [
              exploreOpening.badge || "Available now",
              `${getStatsFor(exploreOpening).total} lines`
            ]
          : ["Explore", "Openings"],
        position: exploreOpening ? _getPreviewFenForOpening(exploreOpening) : "start",
        orientation: (exploreOpening && exploreOpening.orientation) || "white",
        stats: exploreOpening
          ? [
              { value: exploreOpening.badge || "Ready", label: "status" },
              { value: getStatsFor(exploreOpening).total, label: "lines total" },
              { value: (exploreOpening.orientation || "white") === "black" ? "Black" : "White", label: "repertoire side" }
            ]
          : undefined
      }
    ];

return (
<div className="home-page">

      <SEO
        title="ChessDrills | Chess Opening Training"
        description="Train chess openings with structured drills, move feedback, and repeatable opening recall practice."
        canonical="https://chessdrills.net/"
        image="https://chessdrills.net/logo512.png"
      />

  <TopNav title="Chess Opening Drills"  hideHero />

  <div className="home-hero-v2">{this.renderHeroCarousel(heroSlides)}</div>

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