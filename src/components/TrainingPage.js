import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Chessboard from "chessboardjsx";
import * as ChessModule from "chess.js";
import { useAuth } from "../auth/AuthProvider";
import { OPENING_CATALOG } from "../openings/openingCatalog";
import { dueTrainingItems, summarizeTraining, trainingRequest, weakOpeningLines } from "../training/workspace";
import { trackEvent } from "../utils/trackEvent";
import WorkspaceIcon from "./WorkspaceIcon";
import { BOARD_THEMES, DEFAULT_THEME, PIECE_THEMES } from "../theme/boardThemes";
import { loadSettings } from "./openingTrainer/otStorage";
import "./TrainingPage.css";

const Chess = ChessModule.Chess || ChessModule.default || ChessModule;

function MoveArrow({ move, orientation, id, correct }) {
  const center = (square) => {
    const file = square.charCodeAt(0) - 97;
    const rank = Number(square[1]) - 1;
    return orientation === "black" ? [7.5 - file, rank + .5] : [file + .5, 7.5 - rank];
  };
  const [x1, y1] = center(move.slice(0, 2));
  const [x2, y2] = center(move.slice(2, 4));
  const knight = Math.abs(x2 - x1) * Math.abs(y2 - y1) === 2;
  const path = knight
    ? (Math.abs(x2 - x1) > Math.abs(y2 - y1) ? `M${x1},${y1} H${x2} V${y2}` : `M${x1},${y1} V${y2} H${x2}`)
    : `M${x1},${y1} L${x2},${y2}`;
  return <svg className="training-move-arrow" viewBox="0 0 8 8" aria-label={correct ? "Solution move " + move : "Your move " + move} role="img">
    <defs><marker id={id} markerWidth=".65" markerHeight=".65" refX=".48" refY=".325" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L.65,.325 L0,.65 Z" /></marker></defs>
    <path d={path} fill="none" strokeWidth=".16" strokeLinecap="round" strokeLinejoin="round" markerEnd={`url(#${id})`} />
  </svg>;
}

function SavedPosition({ item, enabled, onSaved, settings, playSound }) {
  const [fen, setFen] = useState(item.fen);
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(null);
  const [recorded, setRecorded] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [answerShown, setAnswerShown] = useState(false);
  const [lastMove, setLastMove] = useState(null);
  const mounted = useRef(false);
  const locked = useRef(false);
  const saving = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const game = useMemo(() => {
    try { const board = new Chess(); return board.load(item.fen) ? board : null; } catch (_) { return null; }
  }, [item.fen]);
  const frame = useRef(null);
  const [width, setWidth] = useState(240);
  useEffect(() => {
    const measure = () => { if (frame.current && frame.current.clientWidth > 0) setWidth(Math.floor(Math.min(360, frame.current.clientWidth) / 8) * 8); };
    measure();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (observer && frame.current) observer.observe(frame.current);
    window.addEventListener("resize", measure);
    return () => { if (observer) observer.disconnect(); window.removeEventListener("resize", measure); };
  }, []);
  async function save(nextAttempt) {
    if (saving.current || !enabled) return;
    saving.current = true;
    setBusy(true);
    try {
      const result = await trainingRequest({ action: "attempt", itemId: item.id, ...nextAttempt });
      if (!mounted.current) return;
      setRecorded(true);
      if (result.duplicate) {
        setMessage("Already recorded");
        onSaved(item.id, nextAttempt.correct, false);
        return;
      }
      setMessage(nextAttempt.correct ? "Correct" : "Practice again soon");
      trackEvent("saved_puzzle_attempt", { correct: nextAttempt.correct }, null, { persist: false });
      onSaved(item.id, nextAttempt.correct, true);
    } catch (_) { if (mounted.current) setMessage("Not saved. Try again."); }
    finally { saving.current = false; if (mounted.current) setBusy(false); }
  }
  function move(from, to) {
    if (!enabled || locked.current || busy || !game) return;
    const board = new Chess(item.fen);
    const promotion = item.bestMove.length === 5 && from === item.bestMove.slice(0, 2) && to === item.bestMove.slice(2, 4) ? item.bestMove[4] : "q";
    const result = board.move({ from, to, promotion });
    if (!result) { setMessage("Illegal move"); playSound("illegal"); return; }
    const uci = result.from + result.to + (result.promotion || "");
    const nextAttempt = { correct: uci === item.bestMove,
      attemptId: "attempt_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10) };
    locked.current = true;
    setLastMove(uci);
    playSound(nextAttempt.correct ? (result.captured ? "capture" : "move") : "illegal");
    setMessage(nextAttempt.correct ? "Correct" : "Try the solution");
    setSelected(null); setResolved(true); setFen(board.fen()); setAttempt(nextAttempt);
    save(nextAttempt);
  }
  function showSolution() {
    const board = new Chess(item.fen);
    const result = board.move({ from: item.bestMove.slice(0, 2), to: item.bestMove.slice(2, 4), promotion: item.bestMove[4] || "q" });
    if (!result) return false;
    setFen(board.fen()); setLastMove(item.bestMove); setAnswerShown(true); setSelected(null);
    setMessage(result.san);
    playSound(result.captured ? "capture" : "move");
    return true;
  }
  function reveal() {
    if (!game || locked.current || busy || !enabled) return;
    if (!showSolution()) return;
    locked.current = true;
    const nextAttempt = { correct: false, attemptId: "reveal_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10) };
    setResolved(true); setAttempt(nextAttempt); save(nextAttempt);
  }
  if (!game) return <p role="alert">This saved position could not be loaded. Review the original game again.</p>;
  const orientation = game.turn() === "b" ? "black" : "white";
  const correct = answerShown || (attempt && attempt.correct);
  const pieceTheme = Object.prototype.hasOwnProperty.call(PIECE_THEMES, settings.pieceTheme) ? PIECE_THEMES[settings.pieceTheme] : undefined;
  const squareStyles = selected ? { [selected]: { backgroundColor: "rgba(244,197,66,.55)" } } : lastMove ? {
    [lastMove.slice(0, 2)]: { backgroundColor: correct ? "rgba(86,196,130,.3)" : "rgba(224,106,106,.3)" },
    [lastMove.slice(2, 4)]: { backgroundColor: correct ? "rgba(86,196,130,.5)" : "rgba(224,106,106,.5)" }
  } : {};
  if (selected && enabled && !resolved && !busy) {
    game.moves({ square: selected, verbose: true }).forEach(({ to }) => {
      squareStyles[to] = {
        boxShadow: "inset 0 0 0 3px rgba(255, 208, 96, 0.70)",
        backgroundColor: "rgba(255, 208, 96, 0.18)"
      };
    });
  }
  return <article className={`training-position${resolved ? (attempt && attempt.correct ? " training-position-correct" : " training-position-review") : ""}`}>
    <h3>{game.turn() === "w" ? "White" : "Black"} to move</h3><p>{item.theme}</p>
    <div ref={frame} className="training-board-frame"><div className="training-board" style={{ width }}><Chessboard width={width} position={fen} orientation={orientation}
      {...(BOARD_THEMES[settings.boardTheme] || BOARD_THEMES[DEFAULT_THEME])} pieceTheme={pieceTheme || undefined}
      transitionDuration={300} arePiecesDraggable={enabled && !resolved && !busy} onDrop={({ sourceSquare, targetSquare }) => move(sourceSquare, targetSquare)}
      onSquareClick={(square) => {
        if (resolved || busy || !enabled) return;
        if (square === selected) { setSelected(null); return; }
        const piece = game.get(square);
        if (piece && piece.color === game.turn()) setSelected(square);
        else if (selected) move(selected, square);
      }} onSquareRightClick={() => setSelected(null)} squareStyles={squareStyles} />
      {lastMove && <MoveArrow move={lastMove} orientation={orientation} correct={!!correct} id={"training-arrow-" + item.id} />}
    </div></div>
    <p role="status">{message}</p>
    {!resolved && <button disabled={!enabled || busy} onClick={reveal}>Show answer</button>}
    {attempt && !recorded && !busy && <button onClick={() => save(attempt)}>Retry saving attempt</button>}
    {attempt && !attempt.correct && !answerShown && <button disabled={busy} onClick={showSolution}>Show solution</button>}
  </article>;
}

export default function TrainingPage() {
  const { user, userDoc, membershipActive, authLoading, syncing, userDocLoading } = useAuth();
  const uid = user && user.uid;
  const [settings, setSettings] = useState(() => loadSettings(DEFAULT_THEME));
  const sounds = useRef({});
  useEffect(() => {
    const sync = () => setSettings(loadSettings(DEFAULT_THEME));
    window.addEventListener("focus", sync);
    window.addEventListener("storage", sync);
    const sources = { move: "/sounds/move-self.mp3", capture: "/sounds/capture.mp3", illegal: "/sounds/illegal.mp3" };
    Object.entries(sources).forEach(([key, src]) => {
      const audio = new Audio(src); audio.volume = .35; audio.preload = "auto"; sounds.current[key] = audio;
    });
    return () => {
      window.removeEventListener("focus", sync); window.removeEventListener("storage", sync);
      Object.values(sounds.current).forEach((audio) => { audio.pause(); });
      sounds.current = {};
    };
  }, []);
  function playSound(key) {
    if (!settings.playSounds) return;
    const audio = sounds.current[key];
    if (!audio) return;
    try { audio.currentTime = 0; const pending = audio.play(); if (pending) pending.catch(() => {}); } catch (_) {}
  }
  const [data, setData] = useState({ reviews: [], items: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    setData({ reviews: [], items: [] }); setError("");
    if (!uid) return undefined;
    let cancelled = false;
    setLoading(true);
    trainingRequest({ action: "load" }).then((result) => { if (!cancelled) setData(result); })
      .catch(() => { if (!cancelled) setError("Could not load saved training. Try again."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [uid, reload]);
  const summary = useMemo(() => summarizeTraining(data.reviews, data.items), [data]);
  // Keep today's visible positions mounted while attempts are recorded.
  const queue = useMemo(() => dueTrainingItems(data.items), [data.items]);
  const openings = weakOpeningLines(OPENING_CATALOG, (userDoc && userDoc.progress) || {});
  const [results, setResults] = useState({});
  useEffect(() => { setResults({}); }, [uid, reload]);
  const countedResults = Object.values(results).filter((result) => result.counted);
  const attempts = summary.attempts + countedResults.length;
  const successes = summary.successes + countedResults.filter((result) => result.correct).length;
  const completed = queue.filter((item) => results[item.id]).length;
  const sessionComplete = queue.length > 0 && completed === queue.length;
  const cleanSession = sessionComplete && queue.every((item) => results[item.id].correct && results[item.id].counted);
  const [celebrating, setCelebrating] = useState(false);
  useEffect(() => {
    if (!cleanSession || !settings.showConfetti || (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) { setCelebrating(false); return undefined; }
    setCelebrating(true);
    const timer = window.setTimeout(() => setCelebrating(false), 1600);
    return () => { window.clearTimeout(timer); };
  }, [cleanSession, settings.showConfetti]);
  if (authLoading || userDocLoading || syncing) return <p role="status">Loading training…</p>;
  const hasHistory = data.reviews.length > 0 || data.items.length > 0;
  return <div className="training-page">
    {celebrating && <div className="training-celebration" aria-hidden="true">{Array.from({ length: 28 }, (_, i) => <i key={i} style={{ left: (10 + (i * 17 % 80)) + "%", animationDelay: (i % 5 * .04) + "s", backgroundColor: ["#f4c542", "#56c482", "#e5e9ef"][i % 3] }} />)}</div>}
    <header className="training-heading">
      <h1>Daily training</h1>
      {hasHistory && <Link className="training-action training-action-secondary" to="/my-games"><WorkspaceIcon name="review" />Review a game</Link>}
    </header>

    {!membershipActive && <section className="training-offer">
      <span className="training-panel-icon"><WorkspaceIcon name="puzzles" /></span>
      <div><h2>Your training, saved.</h2>
        {user && hasHistory && <p>Your saved training is here when you return.</p>}
        <div className="training-actions">
          <Link className="training-action" to={{ pathname: "/about", state: { from: "/training" } }}>Try Premium</Link>
          <Link className="training-text-link" to={!user ? "/signup?from=%2Ftraining&source=training" : "/my-games"}>{!user ? "Create free account" : "Review free"}</Link>
        </div>
      </div>
    </section>}

    {loading && <p className="training-status" role="status">Loading saved reviews…</p>}
    {error && <p className="training-status" role="alert">{error} <button onClick={() => setReload((value) => value + 1)}>Retry</button></p>}

    {user && !loading && !error && <>
      {hasHistory && <section className="training-stats" aria-label="Training progress">
        {data.reviews.length > 0 && <div><strong>{data.reviews.length}</strong><span>Reviews</span></div>}
        {data.items.length > 0 && <div><strong>{data.items.length}</strong><span>Positions</span></div>}
        {attempts > 0 && <div><strong>{Math.round(successes / attempts * 100)}%</strong><span>Success · {attempts} {attempts === 1 ? "attempt" : "attempts"}</span></div>}
      </section>}

      {membershipActive && !hasHistory && <section className="training-start">
        <span className="training-panel-icon"><WorkspaceIcon name="review" /></span>
        <h2>No saved positions yet</h2>
        <Link className="training-action" to="/my-games">Review a game<WorkspaceIcon name="arrow" /></Link>
      </section>}

      {membershipActive && (openings.length > 0 || hasHistory) && <section className="training-section">
        <div className="training-section-heading"><h2>Opening practice</h2><Link className="training-text-link" to="/openings/library">All openings</Link></div>
        {openings.length ? <div className="training-opening-list">{openings.map((line) => {
          const opening = OPENING_CATALOG.find((entry) => entry.key === line.opening);
          const number = opening ? opening.lines.findIndex((entry) => entry.id === line.lineId) + 1 : 0;
          return <Link className="training-opening-row" key={line.opening + line.lineId}
            to={"/openings?opening=" + encodeURIComponent(line.opening) + "&mode=practice&line=" + encodeURIComponent(line.lineId)}>
            <WorkspaceIcon name="openings" /><span><strong>{line.title}</strong><small>{number > 0 ? "Line " + number : "Practice line"}{line.failures > 0 ? " · " + line.failures + " misses" : ""}</small></span><WorkspaceIcon name="arrow" />
          </Link>;
        })}</div> : <Link className="training-text-link" to="/openings/library">Choose an opening</Link>}
      </section>}

      {membershipActive && hasHistory && <section className="training-section">
        <div className="training-section-heading"><h2>Mistake practice</h2><span>{queue.length ? completed + " / " + queue.length : "Up to date"}</span></div>
        {queue.length > 0 && <div className="training-session-progress" role="progressbar" aria-label="Session progress" aria-valuemin={0} aria-valuemax={queue.length} aria-valuenow={completed}><span style={{ width: (completed / queue.length * 100) + "%" }} /></div>}
        {sessionComplete && <p className="training-session-complete" role="status"><WorkspaceIcon name="puzzles" />Session complete · {queue.filter((item) => results[item.id].correct).length} / {queue.length} correct</p>}
        {queue.length > 0 ? <div className="training-positions">{queue.map((item) => <SavedPosition key={uid + reload + item.id} item={item} enabled={membershipActive}
          settings={settings} playSound={playSound}
          onSaved={(id, correct, counted) => setResults((value) => ({ ...value, [id]: { correct, counted } }))} />)}</div>
          : <div className="training-quiet-empty"><WorkspaceIcon name="puzzles" /><p>All caught up. <Link to="/my-games">Review a game</Link></p></div>}
      </section>}

      {hasHistory && <div className="training-history-grid">
        {summary.themes.length > 0 && <section className="training-section training-theme-panel">
          <h2>Recurring themes</h2>
          <ul className="training-theme-list">{summary.themes.map(([theme, count]) => <li key={theme}><span>{theme}</span><span title={count + " of " + data.reviews.length + " saved games"}>{count} {count === 1 ? "game" : "games"}</span></li>)}</ul>
        </section>}
        {data.reviews.length > 0 && <section className="training-section">
          <div className="training-section-heading"><h2>Review history</h2></div>
          <ul className="training-review-list">{data.reviews.slice().sort((a, b) => b.analyzedAtMs - a.analyzedAtMs).slice(0, 30).map((review) => <li key={review.id}>
            <WorkspaceIcon name="review" /><span><strong>{review.label}</strong><small>{new Date(review.analyzedAtMs).toLocaleDateString()} · {review.puzzleCount} positions found</small></span>
          </li>)}</ul>
        </section>}
      </div>}
    </>}
  </div>;
}
