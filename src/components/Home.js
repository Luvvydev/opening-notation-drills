import React, { Component } from "react";
import Chessboard from "chessboardjsx";
import TopNav from "./TopNav";
import { londonLines } from "../openings/londonLines";
import { sicilianDefenseLines } from "../openings/sicilianDefenseLines";
import { ruyLopezLines } from "../openings/ruyLopezLines";
import { friedLiverAttackLines } from "../openings/friedLiverAttackLines";
import { caroKannLines } from "../openings/caroKannLines";
import { staffordGambitLines } from "../openings/staffordGambitLines";
import { queensGambitAcceptedLines } from "../openings/queensGambitAcceptedLines";
import { queensGambitDeclinedLines } from "../openings/queensGambitDeclinedLines";
import { englishOpeningLines } from "../openings/englishOpeningLines";
import { scotchGameLines } from "../openings/scotchGameLines";
import { frenchDefenseLines } from "../openings/frenchDefenseLines";
import { englundGambitLines } from "../openings/englundGambitLines";
import { italianGameLines } from "../openings/italianGameLines";
import { kingsIndianDefenseLines } from "../openings/kingsIndianDefenseLines";
import { BOARD_THEMES, DEFAULT_THEME } from "../theme/boardThemes";
import "./Home.css";

const STORAGE_KEY = "notation_trainer_opening_progress_v2";

const OPENINGS = [
  {
    key: "london",
    title: "London",
    description:
      "A popular 1.d4 opening for White with a reputation for solidity, focusing on reliable structures and clear repeatable plans",
    lines: londonLines,
    accent: "gold",
    position: "start",
    orientation: "white"
  },
  {
    key: "sicilian",
    title: "Sicilian Defense",
    description:
      "Arising after 1.e4 c5, it is a dynamic opening that leads to sharp, unbalanced play and was a favorite weapon of champions like Fischer and Kasparov.",
    lines: sicilianDefenseLines,
    accent: "purple",
    badge: null,
    position: "start",
    orientation: "black"
  },
  {
    key: "ruy",
    title: "Ruy Lopez",
    description:
      "A legendary battleground of chess history, rich in strategy and theory, where the world's strongest players have tested ideas for over a century and tiny advantages are fought for with ruthless precision.",
    lines: ruyLopezLines,
    accent: "blue",
    badge: null,
    position: "start",
    orientation: "white"
  },
  {
    key: "friedliver",
    title: "Fried Liver Attack",
    description:
      "A sharp and entertaining way to attack the king, built around a classic knight sacrifice that punishes Black for grabbing the d5 pawn too boldly.",
    lines: friedLiverAttackLines,
    accent: "red",
    badge: null,
    position: "start",
    orientation: "white"
  },
  {
    key: "stafford",
    title: "Stafford Gambit",
    description:
      "An objectively dubious opening, but extremely venomous in practice, relying on initiative, traps, and precise punishment of even small inaccuracies.",
    lines: staffordGambitLines,
    accent: "orange",
    badge: null,
    position: "start",
    orientation: "black"
  },
  {
    key: "carokann",
    title: "Caro-Kann Defense",
    description:
      "Beginning with 1.e4 c6 and usually 2.d4 d5, the Caro-Kann is a battle-tested weapon that combines rock-solid structure with hidden dynamism and has stood up to elite play for generations.",
    lines: caroKannLines,
    accent: "green",
    badge: null,
    position: "start",
    orientation: "black"
  },
  {
    key: "qga",
    title: "Queen's Gambit Accepted",
    description:
      "Black grabs the c4 pawn early, and White responds by building a big center and using tempo to win it back. These drills focus on key tactical and structural themes after ...dxc4.",
    lines: queensGambitAcceptedLines,
    accent: "teal",
    badge: null,
    position: "start",
    orientation: "white"
  },
  {
    key: "qgd",
    title: "Queen's Gambit Declined",
    description:
      "A classic 1.d4 response where Black defends the center instead of taking c4. These drills cover common structures like the Exchange QGD, Semi-Slav setups, and Ragozin style move orders.",
    lines: queensGambitDeclinedLines,
    accent: "pink",
    badge: null,
    position: "start",
    orientation: "white"
  },
  {
    key: "italian",
    title: "Italian Game",
    description:
      "Classic 1.e4 e5 development. These drills cover sharp lines like the Evans Gambit and Two Knights ideas.",
    lines: italianGameLines,
    accent: "indigo",
    badge: null,
    position: "start",
    orientation: "white"
  },
  {
    key: "kingsindian",
    title: "King's Indian Defense",
    description:
      "A hypermodern defense against 1.d4 where Black allows the center and counters with ...e5 or ...c5 and kingside attacks.",
    lines: kingsIndianDefenseLines,
    accent: "slate",
    badge: null,
    position: "start",
    orientation: "black"
  },
  {
    key: "french",
    title: "French Defense",
    description:
      "1.e4 e6 aiming for a strong pawn chain and counterplay with ...c5. These drills focus on Advance and Tarrasch structures.",
    lines: frenchDefenseLines,
    accent: "cyan",
    badge: null,
    position: "start",
    orientation: "black"
  },
  {
    key: "englund",
    title: "Englund Gambit",
    description:
      "A risky 1.d4 e5 gambit that leads to fast development and traps. Good for pattern recognition and punishment drills.",
    lines: englundGambitLines,
    accent: "rose",
    badge: null,
    position: "start",
    orientation: "black"
  },
  {
    key: "english",
    title: "English Opening",
    description: "A flexible 1.c4 opening for White that can transpose into many structures.",
    lines: englishOpeningLines,
    accent: "cyan",
    badge: "New",
    position: "start",
    orientation: "white"
  },
  {
    key: "scotchgame",
    title: "Scotch Game",
    description:
      "The Scotch Game is an 1.e4 opening that feels like a cheat code. It is simple to learn, crushes new players, but it scales extremely well and remains a serious weapon at every level of play",
    lines: scotchGameLines,
    accent: "orange",
    badge: "New",
    position: "start",
    orientation: "white"
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

const calcThumbWidth = ({ screenWidth, screenHeight }) => {
  const w = screenWidth || screenHeight || 0;
  if (w && w < 520) return 96;
  return 120;
};

class Home extends Component {
  constructor(props) {
    super(props);

    const progress = _loadProgress();
    const settings = _loadSettings();

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
      filtersOpen: false,
      filters: {
        color: { white: false, black: false },
        progress: { new: false, inProgress: false, completed: false }
      }
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
            position={o.position || "start"}
            orientation={o.orientation || "white"}
            showNotation={false}
            calcWidth={calcThumbWidth}
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

    return (
      <div className="home-page">
        <TopNav title="Chess Opening Drills" />
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
                      d="M16.5 3.5L20.5 7.5L8 20H4V16L16.5 3.5Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinejoin="round"
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

          <div className="home-course-grid">{sorted.map(this.renderCard)}</div>
        </div>
      </div>
    );
  }
}

export default Home;
