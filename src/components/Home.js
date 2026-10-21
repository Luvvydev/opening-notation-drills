import React, { Component } from "react";
import { Link } from "react-router-dom";
import Chessboard from "chessboardjsx";
import * as ChessModule from "chess.js";
import { OPENING_CATALOG } from "../openings/openingCatalog";
import { BOARD_THEMES, DEFAULT_THEME } from "../theme/boardThemes";
import SEO from "./SEO";
import { useAuth } from "../auth/AuthProvider";
import { trackEvent } from "../utils/trackEvent";
import HomeOpeningDemo from "./HomeOpeningDemo";
import WorkspaceIcon from "./WorkspaceIcon";
import "./Home.css";

// chess.js 0.11 exports a constructor in the browser and { Chess } in Node.
const Chess = ChessModule.Chess || ChessModule.default || ChessModule;

const STORAGE_KEY = "notation_trainer_opening_progress_v2";
const LEARN_STORAGE_KEY = "notation_trainer_learn_progress_v1";
const OPENINGS = OPENING_CATALOG;
const _previewFenCache = new Map();
const PREVIEW_PLIES = 6;
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

function _getOpeningPrestigeCount(progress, openingKey) {
  const opening = progress && progress.openings && progress.openings[openingKey];
  return Math.max(0, Number(opening && opening.prestigeCount) || 0);
}

function _toRomanNumeral(value) {
  const n = Math.max(0, Math.floor(Number(value) || 0));
  if (!n) return "0";

  const table = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"]
  ];

  let remaining = n;
  let out = "";

  for (let i = 0; i < table.length; i += 1) {
    const [amount, label] = table[i];
    while (remaining >= amount) {
      out += label;
      remaining -= amount;
    }
  }

  return out || String(n);
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


class Home extends Component {
  constructor(props) {
    super(props);
    const progress = _loadProgress();
    const learnProgress = _loadLearnProgress();
    this.state = {
      search: "", progress, learnProgress,
      ...this.buildProgressSummary(progress, learnProgress),
      boardTheme: _loadSettings().boardTheme || DEFAULT_THEME,
      filtersOpen: false,
      filters: { color: { white: false, black: false }, progress: { new: false, inProgress: false, completed: false } }
    };
  }

  componentDidMount() {
    ["progress:updated", "learnprogress:updated", "storage", "account:synced"].forEach((name) => window.addEventListener(name, this.refreshProgressState));
    this.refreshProgressState();
  }

  componentWillUnmount() {
    ["progress:updated", "learnprogress:updated", "storage", "account:synced"].forEach((name) => window.removeEventListener(name, this.refreshProgressState));
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


  goToOpening = (key) => this.props.history.push(`/openings?opening=${encodeURIComponent(key)}`);
  goToReview = (mode = "review") => {
    trackEvent("my_games_click", { location: "home_workspace", mode }, this.props.user);
    this.props.history.push(mode === "review" ? "/my-games" : `/my-games?mode=${mode}`);
  };
  goToCreateCustomRep = () => this.props.history.push("/openings?opening=london&custom=1");
  toggleFilter = (group, key) => this.setState((state) => ({ filters: { ...state.filters, [group]: { ...state.filters[group], [key]: !state.filters[group][key] } } }));
  clearFilters = () => this.setState({ search: "", filters: { color: { white: false, black: false }, progress: { new: false, inProgress: false, completed: false } } });

  renderCard = (opening) => {
    const stats = this.state.perOpening[opening.key] || { completed: 0, total: opening.lines.length };
    const prestige = _getOpeningPrestigeCount(this.state.progress, opening.key);
    const side = opening.orientation === "black" ? "Black" : "White";
    return <Link className="home-opening-card" key={opening.key} to={`/openings?opening=${encodeURIComponent(opening.key)}`}>
      <div className="home-opening-thumb" aria-hidden="true"><Chessboard width={160} position={opening.position && opening.position !== "start" ? opening.position : _getPreviewFenForOpening(opening)} orientation={opening.orientation || "white"} showNotation={false} draggable={false} {...(BOARD_THEMES[this.state.boardTheme] || BOARD_THEMES[DEFAULT_THEME])} /></div>
      <div className="home-opening-copy"><h3>{opening.title}</h3><p>{opening.description}</p><span className="home-opening-side">{side}</span>
        <div className="home-opening-progress"><span>{stats.completed}/{stats.total} learned</span><div><i style={{ width: `${Math.min(100, stats.completed / stats.total * 100)}%` }} /></div></div>
        {prestige > 0 && <span className="home-opening-prestige">Prestige {_toRomanNumeral(prestige)}</span>}
        {stats.total > 0 && stats.completed >= stats.total && <span className="home-opening-prestige">Prestige ready</span>}
        {opening.badge && <span className="home-opening-new">{opening.badge}</span>}
      <span className="home-opening-start">Start learning <WorkspaceIcon name="arrow" /></span></div>
    </Link>;
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
      const learned = (this.state.learnProgress.openings || {})[o.key] || {};
      const lastPlayedAt = Math.max(Number(p.lastPlayedAt) || 0, Number(learned.lastPlayedAt) || 0);

      const isCompleted = stats.total > 0 && stats.completed >= stats.total;
      const isNew = lastPlayedAt <= 0 && stats.completed === 0;

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
      const progressEntry =
        (this.state.progress &&
          this.state.progress.openings &&
          this.state.progress.openings[o.key]) ||
        {};
      const learnEntry =
        (this.state.learnProgress &&
          this.state.learnProgress.openings &&
          this.state.learnProgress.openings[o.key]) ||
        {};
      const lastPlayedAt = Math.max(
        Number(progressEntry.lastPlayedAt) || 0,
        Number(learnEntry.lastPlayedAt) || 0
      );
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
    const footerOpeningLinks = ["london", "sicilian", "ruy", "italian", "kingsindian", "carokann", "scandinavian"]
      .map((key) => {
        const opening = OPENINGS.find((item) => item.key === key);
        if (!opening) return null;
        return {
          label: opening.title,
          href: `/openings?opening=${encodeURIComponent(key)}`
        };
      })
      .filter(Boolean);

    const footerColumns = [
      {
        title: "Explore",
        links: [
          { label: "Opening Trainer", href: "/openings" },
          { label: "Notation Trainer", href: "/practice" },
          { label: "About", href: "/about" },
          { label: "Leaderboards", href: "/leaderboards" }
        ]
      },
      {
        title: "Tools",
        links: [
          { label: "Game Review", href: "/my-games" },
          { label: "Sign Up", href: "/signup" },
          { label: "Login", href: "/login" }
        ]
      },
      {
        title: "Guides",
        links: [
          { label: "Remember openings", href: "/how-to-remember-chess-openings/", staticPage: true },
          { label: "Opening trainer guide", href: "/best-chess-opening-trainer-for-beginners/", staticPage: true },
          { label: "Chess opening drills", href: "/chess-opening-drills/", staticPage: true },
          { label: "London training", href: "/london-system-training/", staticPage: true },
          { label: "Sicilian training", href: "/sicilian-defense-training/", staticPage: true }
        ]
      },
      {
        title: "Popular openings",
        links: footerOpeningLinks
      }
    ];

    const footerYear = new Date().getFullYear();


    const library = this.props.location.pathname === "/openings/library";
    const hasFilters = !!q || colorActive || progressActive;
    const shown = sorted;
    const latest = OPENINGS.map((opening) => ({ opening, time: Math.max(Number((this.state.progress.openings[opening.key] || {}).lastPlayedAt) || 0, Number((this.state.learnProgress.openings[opening.key] || {}).lastPlayedAt) || 0) })).filter((item) => item.time > 0).sort((a, b) => b.time - a.time)[0];
    const resume = latest && latest.opening;

    return <div className="home-page home-workspace">
      <SEO title={library ? "Opening Library | ChessDrills" : "ChessDrills | Review Games and Train Your Mistakes"} description="Review Chess.com and Lichess games, practice mistakes as puzzles, and train your chess openings." canonical={library ? "https://chessdrills.net/openings/library" : "https://chessdrills.net/"} image="https://chessdrills.net/logo512.png" />
      {!library && <>
        <section className="home-workspace-hero" aria-labelledby="home-heading">
          <div className="home-hero-copy"><p className="home-eyebrow">YOUR GAMES. YOUR TRAINING.</p><h1 id="home-heading">Review your games.<br />Train your mistakes.</h1>
            <p className="home-hero-description">Review games from Chess.com or Lichess. Practice the moves you missed and build your repertoire.</p>
            <div className="home-hero-actions"><button className="home-primary-button" type="button" onClick={() => this.goToReview()}>Review a game <WorkspaceIcon name="arrow" /></button><Link className="home-text-link" to="/openings/library">Browse openings <WorkspaceIcon name="arrow" /></Link></div>
            <p className="home-account-note">{this.props.user ? "Your game review and personal mistake training." : "Free account required for game review."}</p>
          </div>
          <HomeOpeningDemo boardTheme={this.state.boardTheme} />
        </section>
        <div className="home-workspace-content">
          {resume && <Link className="home-resume-row" to={`/openings?opening=${encodeURIComponent(resume.key)}`}><WorkspaceIcon name="openings" /><div><span>CONTINUE TRAINING</span><strong>{resume.title}</strong><small>{this.state.perOpening[resume.key].completed}/{resume.lines.length} lines learned</small></div><span>Continue <WorkspaceIcon name="arrow" /></span></Link>}
          <section className="home-training-section" aria-labelledby="home-training-heading"><div className="home-section-heading"><h2 id="home-training-heading">Choose your training</h2><span>Review a game or practice an opening.</span></div>
            <div className="home-training-grid">
              <button className="home-training-card" type="button" onClick={() => this.goToReview()}><div className="home-training-copy"><WorkspaceIcon name="review" /><div><h3>Game Review</h3><p>Enter your username, select a game, then review it and turn mistakes into puzzles.</p></div><WorkspaceIcon name="arrow" /></div></button>
              <Link className="home-training-card" to="/openings/library"><div className="home-training-copy"><WorkspaceIcon name="openings" /><div><h3>Opening Drills</h3><p>Learn the ideas. Practice your variations.</p></div><WorkspaceIcon name="arrow" /></div></Link>
            </div>
          </section>
        </div>
      </>}
      <section className="home-workspace-content home-library-section" aria-labelledby="home-library-heading">
        <div className="home-section-heading home-library-heading"><div><h1 hidden={!library} id={library ? "home-library-heading" : undefined}>Opening library</h1>{!library && <h2 id="home-library-heading">All openings</h2>}{library && <p>{OPENINGS.length} openings. Learn, practice, and build your own lines.</p>}</div><span className="home-library-summary">{OPENINGS.length} openings</span></div>
        <div className="home-library-toolbar"><label className="home-library-search"><span className="home-sr-only">Search openings</span><input type="search" placeholder="Search openings..." value={this.state.search} onChange={(event) => this.setState({ search: event.target.value })} /></label><button type="button" className={`home-quiet-button ${this.state.filtersOpen ? "is-active" : ""}`} aria-expanded={this.state.filtersOpen} aria-controls="opening-filters" onClick={() => this.setState((state) => ({ filtersOpen: !state.filtersOpen }))}>Filters{colorActive || progressActive ? " •" : ""}</button>{this.state.totalCompleted > 0 && <span className="home-library-summary">{this.state.totalCompleted}/{this.state.totalLines} lines learned</span>}</div>
        {this.state.filtersOpen && <div id="opening-filters" className="home-library-filters"><fieldset><legend>Side</legend>{["white", "black"].map((key) => <label key={key}><input type="checkbox" checked={this.state.filters.color[key]} onChange={() => this.toggleFilter("color", key)} />{key === "white" ? "White" : "Black"}</label>)}</fieldset><fieldset><legend>Progress</legend>{[["new", "Not started"], ["inProgress", "In progress"], ["completed", "Completed"]].map(([key, label]) => <label key={key}><input type="checkbox" checked={this.state.filters.progress[key]} onChange={() => this.toggleFilter("progress", key)} />{label}</label>)}</fieldset><button className="home-text-link" type="button" onClick={this.clearFilters}>Clear filters</button></div>}
        {hasFilters && <p className="home-result-count" role="status">{shown.length} {shown.length === 1 ? "opening" : "openings"} found</p>}
        <div className="home-opening-grid">{shown.map(this.renderCard)}</div>
        {!shown.length && <div className="home-library-empty"><h3>No openings match those filters.</h3><button className="home-quiet-button" type="button" onClick={this.clearFilters}>Clear search and filters</button></div>}
        <button className="home-custom-row" type="button" onClick={this.goToCreateCustomRep}><span className="home-custom-icon"><WorkspaceIcon name="plus" /></span><div><strong>Create a custom line</strong><span>Add your own moves to your opening practice.</span></div><WorkspaceIcon name="arrow" /></button>
      </section>
      <footer className="home-workspace-footer" aria-label="Site links"><div><strong>ChessDrills</strong><p>Review. Practice. Repeat.</p><small>© {footerYear} ChessDrills</small></div><div className="home-footer-link-grid">{footerColumns.map((column) => <div key={column.title}><h3>{column.title}</h3>{column.links.map((link) => link.staticPage ? <a key={link.href} href={link.href}>{link.label}</a> : <Link key={link.href} to={link.href === "/openings" ? "/openings/library" : link.href}>{link.label}</Link>)}</div>)}</div><button className="home-back-to-top" type="button" onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}><span aria-hidden="true">↑</span> Back to top</button></footer>
    </div>;
  }
}

function HomeWithAuth(props) {
  const { user } = useAuth();
  return <Home {...props} user={user} />;
}

export default HomeWithAuth;
