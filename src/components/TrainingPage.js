import React, { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Chessboard from "chessboardjsx";
import * as ChessModule from "chess.js";
import { useAuth } from "../auth/AuthProvider";
import { loadDueTraining, loadTrainingHistory, summarizeTraining, TRAINING_POSITIONS_ADDED, trainingRequest } from "../training/workspace";
import { trackEvent } from "../utils/trackEvent";
import { LiveEvaluationBar } from "./EvaluationBar";
import WorkspaceIcon from "./WorkspaceIcon";
import { BOARD_THEMES, DEFAULT_THEME, PIECE_THEMES } from "../theme/boardThemes";
import { loadSettings } from "./openingTrainer/otStorage";
import "./TrainingPage.css";

const Chess = ChessModule.Chess || ChessModule.default || ChessModule;
const PatternTraining = lazy(() => import("./PatternTraining"));
// The position after the setup move in Lichess puzzle 030iQ.
const SAMPLE_FORK_FEN = "4r3/ppp4k/8/8/4p1NP/8/P1P3PK/8 w - - 0 46";
const SAMPLE_FORK_MOVE = { from: "g4", to: "f6" };
const PATTERN_INTRO = "One game might give you one shot at spotting a fork. Ten minutes of easy puzzles can give you a dozen.";
const TRAINING_MEMBERSHIP_LINK = { pathname: "/about", state: { from: "/training" } };

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

function SavedPosition({ item, onSaved, settings, playSound, index, total, completed, onNext }) {
  const [fen, setFen] = useState(item.fen);
  const [selected, setSelected] = useState(null);
  const [hintShown, setHintShown] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(null);
  const [recorded, setRecorded] = useState(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [answerShown, setAnswerShown] = useState(false);
  const [lastMove, setLastMove] = useState(null);
  const [wrongMove, setWrongMove] = useState(null);
  const [solutionSan, setSolutionSan] = useState("");
  const mounted = useRef(false);
  const locked = useRef(false);
  const saving = useRef(false);
  const prompt = useRef(null);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const game = useMemo(() => {
    try { const board = new Chess(); return board.load(item.fen) ? board : null; } catch (_) { return null; }
  }, [item.fen]);
  const frame = useRef(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const measure = () => {
      if (frame.current) setWidth(Math.floor(frame.current.clientWidth / 8) * 8 || 240);
    };
    measure();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (observer && frame.current) observer.observe(frame.current);
    window.addEventListener("resize", measure);
    return () => { if (observer) observer.disconnect(); window.removeEventListener("resize", measure); };
  }, []);
  async function save(nextAttempt) {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setSaveFailed(false);
    try {
      const result = await trainingRequest({ action: "attempt", itemId: item.id, ...nextAttempt });
      if (!mounted.current) return;
      setRecorded(result.duplicate ? "duplicate" : "saved");
      if (result.duplicate) {
        onSaved(item.id, nextAttempt.correct, false);
        return;
      }
      trackEvent("saved_puzzle_attempt", { correct: nextAttempt.correct }, null, { persist: false });
      onSaved(item.id, nextAttempt.correct, true);
    } catch (_) { if (mounted.current) setSaveFailed(true); }
    finally { saving.current = false; if (mounted.current) setBusy(false); }
  }
  function move(from, to) {
    if (locked.current || !game || !from || !to || from === to) return;
    const board = new Chess(item.fen);
    const promotion = item.bestMove.length === 5 && from === item.bestMove.slice(0, 2) && to === item.bestMove.slice(2, 4) ? item.bestMove[4] : "q";
    const result = board.move({ from, to, promotion });
    if (!result) { setMessage("Illegal move"); playSound("illegal"); return; }
    const uci = result.from + result.to + (result.promotion || "");
    const isCorrect = uci === item.bestMove;
    locked.current = true;
    setLastMove(uci);
    setWrongMove(isCorrect ? null : uci);
    setHintShown(false);
    playSound(isCorrect ? (result.captured ? "capture" : "move") : "illegal");
    setMessage(isCorrect ? "Correct" : "Incorrect");
    setSelected(null); setResolved(true); setFen(board.fen());
    if (!attempt) {
      const nextAttempt = { correct: isCorrect,
        attemptId: "attempt_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10) };
      setAttempt(nextAttempt); save(nextAttempt);
    }
  }
  function showSolution() {
    const board = new Chess(item.fen);
    const result = board.move({ from: item.bestMove.slice(0, 2), to: item.bestMove.slice(2, 4), promotion: item.bestMove[4] || "q" });
    if (!result) return false;
    setFen(board.fen()); setLastMove(item.bestMove); setAnswerShown(true); setSelected(null);
    setSolutionSan(result.san);
    setHintShown(false);
    playSound(result.captured ? "capture" : "move");
    return true;
  }
  function reveal() {
    if (!game || locked.current) return;
    if (!showSolution()) return;
    setMessage("");
    locked.current = true;
    setResolved(true);
    if (!attempt) {
      const nextAttempt = { correct: false, attemptId: "reveal_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10) };
      setAttempt(nextAttempt); save(nextAttempt);
    }
  }
  function retryPosition(withHint = false) {
    // Keep the first attempt for scoring, scheduling and save retries.
    locked.current = false;
    setFen(item.fen);
    setSelected(null);
    setResolved(false);
    setMessage("");
    setAnswerShown(false);
    setLastMove(null);
    setWrongMove(null);
    setSolutionSan("");
    setHintShown(withHint);
    if (prompt.current) prompt.current.focus();
  }
  if (!game) return <section className="training-start">
    <h1>Daily training</h1>
    <p role="alert">This position could not be loaded.</p>
    <button onClick={onNext}>{index + 1 === total ? "Finish session" : "Next puzzle"}</button>
  </section>;
  const orientation = game.turn() === "b" ? "black" : "white";
  const correct = answerShown || (lastMove && !wrongMove);
  const hintSquare = hintShown ? item.bestMove.slice(0, 2) : null;
  const pieceTheme = Object.prototype.hasOwnProperty.call(PIECE_THEMES, settings.pieceTheme) ? PIECE_THEMES[settings.pieceTheme] : undefined;
  const squareStyles = selected ? { [selected]: { backgroundColor: "rgba(244,197,66,.55)" } } : lastMove ? {
    [lastMove.slice(0, 2)]: { backgroundColor: correct ? "rgba(86,196,130,.3)" : "rgba(224,106,106,.3)" },
    [lastMove.slice(2, 4)]: { backgroundColor: correct ? "rgba(86,196,130,.5)" : "rgba(224,106,106,.5)" }
  } : {};
  if (hintSquare) {
    squareStyles[hintSquare] = { ...squareStyles[hintSquare], boxShadow: "inset 0 0 0 4px #f4c542" };
  }
  if (selected && !resolved) {
    game.moves({ square: selected, verbose: true }).forEach(({ to }) => {
      squareStyles[to] = {
        boxShadow: "inset 0 0 0 3px rgba(255, 208, 96, 0.70)",
        backgroundColor: "rgba(255, 208, 96, 0.18)"
      };
    });
  }
  const label = index + 1 === total ? "Finish session" : "Next puzzle";
  return <article className="training-position">
    <div className="training-board-stage">
      <LiveEvaluationBar fen={fen} orientation={orientation} />
      <div ref={frame} className="training-board-frame">{width > 0 && <div className="training-board" style={{ width }}><Chessboard width={width} position={fen} orientation={orientation}
        {...(BOARD_THEMES[settings.boardTheme] || BOARD_THEMES[DEFAULT_THEME])} pieceTheme={pieceTheme || undefined}
        transitionDuration={0} arePiecesDraggable={!resolved} onDrop={({ sourceSquare, targetSquare }) => move(sourceSquare, targetSquare)}
        onSquareClick={(square) => {
          if (resolved) return;
          if (square === selected) { setSelected(null); return; }
          const piece = game.get(square);
          if (piece && piece.color === game.turn()) setSelected(square);
          else if (selected) move(selected, square);
        }} onSquareRightClick={() => setSelected(null)} squareStyles={squareStyles} />
        {wrongMove && <MoveArrow move={wrongMove} orientation={orientation} id={"training-wrong-" + item.id} />}
        {lastMove && correct && <MoveArrow move={lastMove} orientation={orientation} correct id={"training-answer-" + item.id} />}
      </div>}</div>
    </div>
    <div className="training-panel">
      <div className="training-prompt">
        <h1>Daily training</h1>
        <h2 ref={prompt} tabIndex={-1}>{game.turn() === "w" ? "White" : "Black"} to move</h2>
        <div className="training-puzzle-count">Puzzle {index + 1} of {total}</div>
        <div className="training-session-progress" role="progressbar" aria-label="Session progress" aria-valuemin={0} aria-valuemax={total} aria-valuenow={completed}>
          <span style={{ width: (completed / total * 100) + "%" }} />
        </div>
      </div>
      <div className="training-controls">
        {(message || hintSquare || solutionSan || busy || recorded === "duplicate") && <p role="status" className={correct ? "training-correct" : undefined}>
          {solutionSan && <strong>Best move {solutionSan}</strong>}
          {message && !answerShown && <span>{message}</span>}
          {hintSquare && <span>Try the piece on {hintSquare}.</span>}
          {recorded === "duplicate" && <small>Already recorded</small>}
          {busy && <small>Saving…</small>}
        </p>}
        {saveFailed && <p role="alert">Attempt could not be saved.</p>}
        <div className="training-move-actions">
          {(!resolved || (wrongMove && !answerShown)) && <button aria-pressed={hintShown}
            onClick={() => resolved ? retryPosition(true) : setHintShown((shown) => !shown)}>Hint</button>}
          {!resolved && <button className="training-action-secondary" onClick={reveal}>Show answer</button>}
          {attempt && !recorded && !busy && <button onClick={() => save(attempt)}>Retry saving attempt</button>}
          {resolved && wrongMove && !answerShown && <button className="training-action-secondary" onClick={showSolution}>Show solution</button>}
          {resolved && (wrongMove || answerShown) && <button className="training-action-secondary" onClick={() => retryPosition()}>Try again</button>}
          {recorded && <button className="training-next" onClick={onNext}>{label}<WorkspaceIcon name="arrow" /></button>}
        </div>
      </div>
    </div>
  </article>;
}

function TrainingHistory({ uid }) {
  const [open, setOpen] = useState(false);
  const [requested, setRequested] = useState(false);
  const [reviews, setReviews] = useState(null);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!requested) return undefined;
    let cancelled = false;
    setError(false);
    loadTrainingHistory(uid).then((result) => { if (!cancelled) setReviews(result); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [uid, requested, reload]);
  const themes = useMemo(() => reviews ? summarizeTraining(reviews, []).themes : [], [reviews]);
  return <details className="training-history" onToggle={(event) => {
    setOpen(event.currentTarget.open);
    if (event.currentTarget.open) setRequested(true);
  }}>
    <summary>Review history</summary>
    {open && (error ? <p role="alert">Could not load history. <button onClick={() => setReload((value) => value + 1)}>Retry</button></p>
      : !reviews ? <p role="status">Loading history…</p>
      : !reviews.length ? <p>No saved reviews yet.</p>
      : <div className="training-history-grid">
        <ul className="training-review-list" aria-label="Saved reviews">{reviews.slice(0, 30).map((review) => <li key={review.id}>
          <WorkspaceIcon name="review" /><span><strong>{review.label}</strong><small>{new Date(review.analyzedAtMs).toLocaleDateString()} · {review.puzzleCount} positions found</small></span>
        </li>)}</ul>
        {themes.length > 0 && <section className="training-section">
          <h2>Recurring themes</h2>
          <ul className="training-theme-list">{themes.map(([theme, count]) => <li key={theme}><span>{theme}</span><span>{count} {count === 1 ? "game" : "games"}</span></li>)}</ul>
        </section>}
      </div>)}
  </details>;
}

function DailyPractice({ uid }) {
  const [queue, setQueue] = useState(null);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState({});
  const [settings, setSettings] = useState(() => loadSettings(DEFAULT_THEME));
  const sounds = useRef({});

  useEffect(() => {
    let cancelled = false;
    setError(false);
    loadDueTraining(uid).then((items) => { if (!cancelled) setQueue(items); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [uid, reload]);

  const waitingForPositions = !queue || !queue.length;
  useEffect(() => {
    if (!waitingForPositions) return undefined;
    const refresh = (event) => {
      if (event.detail === uid) setReload((value) => value + 1);
    };
    window.addEventListener(TRAINING_POSITIONS_ADDED, refresh);
    return () => window.removeEventListener(TRAINING_POSITIONS_ADDED, refresh);
  }, [uid, waitingForPositions]);

  useEffect(() => {
    const sync = () => setSettings(loadSettings(DEFAULT_THEME));
    window.addEventListener("focus", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("focus", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const hasPuzzle = !!(queue && queue[index]);
  useEffect(() => {
    if (!hasPuzzle || !settings.playSounds) return undefined;
    const sources = { move: "/sounds/move-self.mp3", capture: "/sounds/capture.mp3", illegal: "/sounds/illegal.mp3" };
    Object.entries(sources).forEach(([key, src]) => {
      const audio = new Audio(src); audio.volume = .35; audio.preload = "auto"; sounds.current[key] = audio;
    });
    return () => {
      Object.values(sounds.current).forEach((audio) => { audio.pause(); });
      sounds.current = {};
    };
  }, [hasPuzzle, settings.playSounds]);

  function playSound(key) {
    const audio = sounds.current[key];
    if (!settings.playSounds || !audio) return;
    try { audio.currentTime = 0; const pending = audio.play(); if (pending) pending.catch(() => {}); } catch (_) {}
  }

  const completed = Object.keys(results).length;
  const sessionComplete = !!(queue && queue.length && index >= queue.length);
  const cleanSession = !!(queue && queue.length && queue.every((item) => results[item.id] && results[item.id].correct && results[item.id].counted));
  const [celebrating, setCelebrating] = useState(false);
  useEffect(() => {
    if (!cleanSession || !settings.showConfetti || (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) { setCelebrating(false); return undefined; }
    setCelebrating(true);
    const timer = window.setTimeout(() => setCelebrating(false), 1600);
    return () => { window.clearTimeout(timer); };
  }, [cleanSession, settings.showConfetti]);

  const nextFocus = useRef(null);
  useEffect(() => {
    if (index > 0 && nextFocus.current) nextFocus.current.focus();
  }, [index]);

  if (error) return <div className="training-start">
    <h1>Daily training</h1>
    <p role="alert">Could not load puzzles.</p>
    <button onClick={() => setReload((value) => value + 1)}>Retry</button>
  </div>;
  if (!queue) return <TrainingPlaceholder />;
  return <>
    {celebrating && <div className="training-celebration" aria-hidden="true">{Array.from({ length: 28 }, (_, i) => <i key={i} style={{ left: (10 + (i * 17 % 80)) + "%", animationDelay: (i % 5 * .04) + "s", backgroundColor: ["#f4c542", "#56c482", "#e5e9ef"][i % 3] }} />)}</div>}
    {hasPuzzle ? <div ref={nextFocus} className="training-puzzle" tabIndex={-1} aria-label={"Puzzle " + (index + 1)}>
      <SavedPosition key={queue[index].id} item={queue[index]} index={index} total={queue.length}
        settings={settings} playSound={playSound} completed={completed}
        onNext={() => setIndex(index + 1)}
        onSaved={(id, correct, counted) => setResults((value) => ({ ...value, [id]: { correct, counted } }))} />
    </div> : <section className="training-start">
      <h1>Daily training</h1>
      <h2 ref={nextFocus} tabIndex={-1}>{sessionComplete ? "Session complete" : "No puzzles due"}</h2>
      <p>{sessionComplete ? Object.values(results).filter((result) => result.correct).length + " of " + queue.length + " correct on the first try"
        : "Review a game to add mistakes automatically."}</p>
      <Link className="training-action" to="/my-games">Review a game <WorkspaceIcon name="arrow" /></Link>
    </section>}
  </>;
}

function TrainingPlaceholder() {
  return <div className="training-position training-loading">
    <div className="training-board-stage" aria-hidden="true"><span className="training-board-frame" /></div>
    <div className="training-panel">
      <div className="training-prompt">
        <h1>Daily training</h1>
        <p role="status">Loading puzzles…</p>
      </div>
    </div>
  </div>;
}

function TrainingSample({ signedIn }) {
  const frame = useRef(null);
  const prompt = useRef(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState(false);
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [fen, setFen] = useState(SAMPLE_FORK_FEN);
  const game = useMemo(() => new Chess(fen), [fen]);
  const canPlay = active && !result;

  useLayoutEffect(() => {
    const measure = () => setWidth(Math.floor(frame.current.clientWidth / 8) * 8 || 240);
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    if (observer) observer.observe(frame.current);
    window.addEventListener("resize", measure);
    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  useEffect(() => {
    if (active) prompt.current.focus({ preventScroll: true });
  }, [active]);

  function solve(outcome) {
    const position = new Chess(SAMPLE_FORK_FEN);
    position.move(SAMPLE_FORK_MOVE);
    setFen(position.fen());
    setSelected(null);
    setFeedback("");
    setResult(outcome);
  }

  function play(from, to) {
    if (!canPlay || !to || from === to) return;
    if (from === SAMPLE_FORK_MOVE.from && to === SAMPLE_FORK_MOVE.to) {
      solve("correct");
      return;
    }
    setSelected(null);
    setFeedback("Try again. Look for a knight check.");
  }

  const squares = {};
  if (selected) {
    squares[selected] = { backgroundColor: "rgba(244,197,66,.55)" };
    game.moves({ square: selected, verbose: true }).forEach(({ to }) => {
      squares[to] = { boxShadow: "inset 0 0 0 3px rgba(244,197,66,.65)" };
    });
  }
  if (result) {
    squares[SAMPLE_FORK_MOVE.from] = { backgroundColor: "rgba(244,197,66,.35)" };
    squares[SAMPLE_FORK_MOVE.to] = { backgroundColor: "rgba(244,197,66,.55)" };
  }

  return <section className="training-track training-track-patterns">
    <div className="training-track-copy">
      <h2>Pattern recognition</h2>
      <p>{PATTERN_INTRO}</p>
      {active && <div className="training-sample-instructions" role="status" ref={prompt} tabIndex={-1}>
        {result ? <p><strong>{result === "correct" ? "Correct." : "Nf6+."}</strong> The knight checks the king and attacks the rook on e8.</p> :
          <p><strong>White to move.</strong> {feedback || "Fork the king and rook."}</p>}
      </div>}
      <div className="training-preview-actions">
        {(signedIn || result) && <Link className="training-action" to={TRAINING_MEMBERSHIP_LINK}>
          {signedIn ? "Unlock Daily Training" : "See Premium plans"} <WorkspaceIcon name="arrow" />
        </Link>}
        {!active && <button className={"training-action" + (signedIn ? " training-action-secondary" : "")} type="button" aria-controls="training-sample-board" onClick={() => setActive(true)}>
          Try a puzzle <WorkspaceIcon name="arrow" />
        </button>}
        <Link className="training-action training-action-secondary" to="/training?mode=patterns">Watch the guide</Link>
        {canPlay && <button className="training-action training-action-secondary" type="button" onClick={() => solve("revealed")}>Show answer</button>}
      </div>
    </div>
    <div className="training-track-preview training-sample-preview" role="group" aria-label="Sample chess position" id="training-sample-board">
      <div className="training-sample-frame" ref={frame}>
        {width > 0 && <Chessboard width={width} position={fen} orientation="white" {...BOARD_THEMES[DEFAULT_THEME]}
          transitionDuration={130} squareStyles={squares} draggable={canPlay}
          allowDrag={({ piece }) => canPlay && piece.startsWith("w")}
          onDrop={({ sourceSquare, targetSquare }) => play(sourceSquare, targetSquare)}
          onSquareClick={(square) => {
            if (!canPlay) return;
            const piece = game.get(square);
            if (square === selected) setSelected(null);
            else if (piece && piece.color === "w") setSelected(square);
            else if (selected) play(selected, square);
          }}
          onSquareRightClick={() => setSelected(null)} />}
      </div>
    </div>
  </section>;
}

function TrainingHub({ preview = false, signedIn = false }) {
  const media = (process.env.PUBLIC_URL || "") + "/media/";
  return <>
    <header className="training-hub-heading">
      <h1>Daily training</h1>
    </header>
    <div className="training-track-grid">
      {preview ? <TrainingSample signedIn={signedIn} /> : <section className="training-track training-track-patterns">
        <div className="training-track-copy">
          <span className="training-panel-icon"><WorkspaceIcon name="puzzles" /></span>
          <h2>Pattern recognition</h2>
          <p>{PATTERN_INTRO}</p>
          <details className="training-track-explainer">
            <summary>Why easy puzzles work</summary>
            <div>
              <p><strong>The secret to getting better faster? Go below your usual puzzle rating.</strong></p>
              <p>This is the actual secret. That's why I gated it behind Premium.</p>
              <p>A hard puzzle takes five minutes to solve and you'll never see that position against a real opponent. The easy ones show you the same idea on different boards. Those forks, checks, and mates are the patterns you'll actually face in your games. Higher-rated puzzles don't train your pattern recognition for real chess. The easy ones do.</p>
              <p>Do that every day and you'll start seeing the fork before your opponent plays it. Then you start noticing pins and hanging pieces you used to play right past. <strong>That's what getting better at chess actually looks like.</strong></p>
            </div>
          </details>
          <Link className="training-action" to="/training?mode=patterns">Start pattern recognition <WorkspaceIcon name="arrow" /></Link>
        </div>
        <div className="training-track-preview" aria-hidden="true">
          <img src={media + "training-pattern-preview.webp"} alt="" width="384" height="384" />
        </div>
      </section>}
      <section className="training-track training-track-mistakes">
        <div className="training-track-copy">
          {!preview && <span className="training-panel-icon"><WorkspaceIcon name="review" /></span>}
          <h2>Practice my mistakes</h2>
          <p>{preview ? "Replay the moves you missed. Premium saves key positions from Game Review and brings them back when they're due." : "Get another shot at the moves you missed in your own games."}</p>
          {preview ? <Link className="training-action training-action-secondary" to="/my-games">Review a game free <WorkspaceIcon name="arrow" /></Link> :
            <Link className="training-action training-action-secondary" to="/training?mode=mistakes">Practice my mistakes <WorkspaceIcon name="arrow" /></Link>}
        </div>
        <div className="training-track-preview" aria-hidden={preview ? undefined : true}>
          <img src={media + "training-mistakes-preview.webp"} alt={preview ? "Example Game Review position with the missed move marked." : ""} width="384" height="384" />
        </div>
      </section>
    </div>
  </>;
}

export default function TrainingPage() {
  const { user, membershipActive, authLoading, userDocLoading } = useAuth();
  const location = useLocation();
  const mode = new URLSearchParams(location.search).get("mode");
  const waiting = authLoading || (user && userDocLoading);
  const canPractice = Boolean(user && membershipActive);
  if (waiting) return <div className="training-page training-page-practice"><TrainingPlaceholder /></div>;
  if (canPractice || mode === "patterns") {
    const training = mode === "patterns" || mode === "mistakes";
    return <div className={`training-page ${training ? "training-page-practice" : "training-page-hub"}`}>
      {training && <nav className="training-mode-nav" aria-label="Daily training modes">
        <Link to="/training"><span aria-hidden="true">←</span> Daily training</Link>
        <Link to="/training?mode=patterns" aria-current={mode === "patterns" ? "page" : undefined}>Pattern recognition</Link>
        {canPractice ? <Link to="/training?mode=mistakes" aria-current={mode === "mistakes" ? "page" : undefined}>My mistakes</Link> :
          <Link to="/my-games">Game Review</Link>}
      </nav>}
      {mode === "patterns" ? <Suspense fallback={<p role="status">Loading pattern puzzles…</p>}>
        <PatternTraining key={canPractice ? user.uid : "preview"} uid={canPractice ? user.uid : undefined}
          membershipLink={{ ...TRAINING_MEMBERSHIP_LINK, state: { from: "/training?mode=patterns" } }} />
      </Suspense> : mode === "mistakes" ? <DailyPractice key={user.uid} uid={user.uid} /> : <TrainingHub />}
      {mode !== "patterns" && <TrainingHistory key={"history-" + user.uid} uid={user.uid} />}
    </div>;
  }
  return <div className="training-page training-page-hub training-page-preview">
    <TrainingHub preview signedIn={Boolean(user)} />
    {user && <TrainingHistory key={"history-" + user.uid} uid={user.uid} />}
  </div>;
}
