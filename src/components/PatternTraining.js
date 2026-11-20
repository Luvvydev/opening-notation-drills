import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Chessboard from "chessboardjsx";
import * as ChessModule from "chess.js";
import { Link } from "react-router-dom";
import { BOARD_THEMES, DEFAULT_THEME, PIECE_THEMES } from "../theme/boardThemes";
import { loadSettings } from "./openingTrainer/otStorage";
import { preparePuzzle, moveMatchesUci, uciToMove } from "./openingTrainer/puzzleUtils";
import { createPatternQueue, localTrainingDate, PATTERN_THEMES, patternProgress, savePatternProgress, updatePatternProgress } from "../training/patternProgress";
import PATTERNS from "../data/patternPuzzles";
import { LiveEvaluationBar } from "./EvaluationBar";

const Chess = ChessModule.Chess || ChessModule.default || ChessModule;
const LEVELS = Object.keys(PATTERNS).map(Number);
const SOURCE_URL = "https://database.lichess.org/#puzzles";
const GUIDE = (process.env.PUBLIC_URL || "") + "/media/pattern-recognition-guide";
const GUIDE_VERSION = "?v=3";
const SOUND_FILES = { move: "move-self", reply: "move-opponent", capture: "capture", illegal: "illegal" };

function PatternPosition({ raw, index, timeLeft, flipped, setFlipped, showEval, toggleEval, record, next, finish }) {
  const [id, sourceFen, moves, rating, tags] = raw;
  const puzzle = useMemo(() => preparePuzzle({ fen: sourceFen, moves: moves.split(" ") }), [sourceFen, moves]);
  const [settings] = useState(() => loadSettings(DEFAULT_THEME));
  const [fen, setFen] = useState(puzzle.startFen);
  const [ply, setPly] = useState(0);
  const [selected, setSelected] = useState(null);
  const [hint, setHint] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [status, setStatus] = useState("playing");
  const [celebrating, setCelebrating] = useState(false);
  const [answer, setAnswer] = useState("");
  const [lastMove, setLastMove] = useState(null);
  const assisted = useRef(false);
  const locked = useRef(false);
  const timer = useRef(null);
  const sounds = useRef({});
  const frame = useRef(null);
  const title = useRef(null);
  const [width, setWidth] = useState(0);

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
    const activeSounds = sounds.current;
    return () => {
      window.clearTimeout(timer.current);
      Object.values(activeSounds).forEach((audio) => audio.pause());
    };
  }, []);
  useEffect(() => {
    if (status !== "solved" || !settings.showConfetti ||
        (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) return undefined;
    setCelebrating(true);
    const timeout = window.setTimeout(() => setCelebrating(false), 1350);
    return () => window.clearTimeout(timeout);
  }, [status, settings.showConfetti]);
  useEffect(() => { if (index > 0) title.current.focus(); }, [index]);

  const board = useMemo(() => new Chess(fen), [fen]);
  const expected = puzzle.solution[ply];
  const hintSquare = hint && expected ? expected.slice(0, 2) : "";
  const squares = {};
  if (lastMove) {
    squares[lastMove.from] = { backgroundColor: "rgba(244,197,66,.24)" };
    squares[lastMove.to] = { backgroundColor: "rgba(244,197,66,.42)" };
  }
  if (selected) {
    squares[selected] = { backgroundColor: "rgba(244,197,66,.55)" };
    board.moves({ square: selected, verbose: true }).forEach(({ to }) => {
      squares[to] = { boxShadow: "inset 0 0 0 3px rgba(255,208,96,.65)" };
    });
  }
  if (hintSquare) squares[hintSquare] = { ...squares[hintSquare], boxShadow: "inset 0 0 0 4px #f4c542" };

  function playSound(kind) {
    if (!settings.playSounds) return;
    try {
      if (!sounds.current[kind]) {
        sounds.current[kind] = new Audio("/sounds/" + SOUND_FILES[kind] + ".mp3");
        sounds.current[kind].volume = .35;
      }
      const audio = sounds.current[kind];
      audio.currentTime = 0;
      const pending = audio.play();
      if (pending) pending.catch(() => {});
    } catch (_) {}
  }

  function move(from, to) {
    if (locked.current || !expected || !from || !to || from === to) return;
    const position = new Chess(fen);
    const promotion = expected.startsWith(from + to) ? expected[4] || "q" : "q";
    const played = position.move({ from, to, promotion });
    if (!played) { playSound("illegal"); return; }
    locked.current = true;
    setSelected(null);
    setHint(false);
    setLastMove(played);
    setFen(position.fen());
    if (!moveMatchesUci(played, expected) && !position.in_checkmate()) {
      playSound("illegal");
      assisted.current = true;
      record(id, false);
      setStatus("missed");
      setFeedback("That move misses the tactic.");
      return;
    }
    playSound(played.captured ? "capture" : "move");
    if (ply + 1 >= puzzle.solution.length || position.in_checkmate()) {
      record(id, !assisted.current);
      setStatus("solved");
      setFeedback("Correct");
      return;
    }
    setStatus("reply");
    setFeedback("");
    timer.current = window.setTimeout(() => {
      const reply = position.move(uciToMove(puzzle.solution[ply + 1]));
      setFen(position.fen());
      setLastMove(reply);
      playSound(reply && reply.captured ? "capture" : "reply");
      setPly(ply + 2);
      setStatus("playing");
      locked.current = false;
    }, 230);
  }

  function restart(withHint = false) {
    setFen(puzzle.startFen);
    setPly(0);
    setStatus("playing");
    setSelected(null);
    setFeedback("");
    setAnswer("");
    setLastMove(null);
    setHint(withHint);
    locked.current = false;
  }

  function showAnswer() {
    assisted.current = true;
    record(id, false);
    locked.current = true;
    const position = new Chess(puzzle.startFen);
    const line = puzzle.solution.map((uci) => position.move(uciToMove(uci)).san);
    const initial = new Chess(puzzle.startFen);
    const first = initial.move(uciToMove(puzzle.solution[0]));
    setLastMove(first);
    playSound(first.captured ? "capture" : "move");
    setFen(initial.fen());
    setAnswer(line.join(" "));
    setHint(false);
    setSelected(null);
    setFeedback("");
    setStatus("revealed");
  }

  const orientation = (puzzle.playerColor === "w") !== flipped ? "white" : "black";
  const allowed = status === "playing";
  const complete = status === "solved" || status === "revealed";
  const motif = tags.map((tag) => PATTERN_THEMES[tag]).filter(Boolean).join(", ");
  return <article className="training-position">
    {celebrating && <div className="training-celebration" aria-hidden="true">
      {Array.from({ length: 24 }, (_, index) => <i key={index} style={{
        left: (8 + (index * 17 % 84)) + "%",
        animationDelay: (index % 4 * .035) + "s",
        backgroundColor: ["#f4c542", "#56c482", "#e5e9ef"][index % 3]
      }} />)}
    </div>}
    <div className={`training-board-stage${showEval ? "" : " training-pattern-board"}`}>
      {showEval && <LiveEvaluationBar fen={fen} orientation={orientation} paused={status === "reply"} />}
      <div className="training-board-frame" ref={frame}>
        {width > 0 && <div className="training-board" style={{ width }}>
          <Chessboard width={width} position={fen} orientation={orientation}
            {...(BOARD_THEMES[settings.boardTheme] || BOARD_THEMES[DEFAULT_THEME])} pieceTheme={PIECE_THEMES[settings.pieceTheme] || undefined}
            transitionDuration={0} arePiecesDraggable={allowed} squareStyles={squares}
            onDrop={({ sourceSquare, targetSquare }) => move(sourceSquare, targetSquare)}
            onSquareRightClick={() => setSelected(null)}
            onSquareClick={(square) => {
              if (!allowed) return;
              if (square === selected) { setSelected(null); return; }
              const piece = board.get(square);
              if (piece && piece.color === puzzle.playerColor) setSelected(square);
              else if (selected) move(selected, square);
            }} />
        </div>}
      </div>
    </div>
    <div className="training-panel">
      <header className="training-prompt">
        <h1 ref={title} tabIndex={-1}>Pattern recognition</h1>
        <h2>{puzzle.playerColor === "w" ? "White" : "Black"} to move</h2>
        <div className="pattern-session-meta">
          <span>Puzzle {index + 1}</span>
          <span role="timer" aria-label="Session time remaining">{timeLeft}</span>
        </div>
        {flipped && <p>Board flipped. Find the tactic for the side to move.</p>}
      </header>
      <div className="training-controls">
        {(feedback || hintSquare || complete) && <p role="status" className={status === "solved" ? "training-correct" : undefined}>
          {feedback && <span>{feedback}</span>}
          {hintSquare && <span>Try the piece on {hintSquare}.</span>}
          {answer && <span>Solution {answer}</span>}
          {complete && <small>{motif} · {rating} puzzle rating</small>}
        </p>}
        <div className="training-move-actions">
          {(allowed || status === "missed") && <button aria-pressed={hint} onClick={() => {
            if (!hint) assisted.current = true;
            if (status === "missed") restart(true);
            else setHint(!hint);
          }}>Hint</button>}
          {(allowed || status === "missed") && <button className="training-action-secondary" onClick={showAnswer}>Show answer</button>}
          {(status === "missed" || status === "revealed") && <button className="training-action-secondary" onClick={() => restart()}>Try again</button>}
          {(complete || status === "missed") && <button className="training-next" onClick={next}>Next puzzle</button>}
        </div>
        <div className="pattern-utility">
          <button type="button" className="training-action-secondary" aria-pressed={showEval} onClick={toggleEval}>Stockfish bar</button>
          <button className="training-action-secondary" aria-pressed={flipped} onClick={() => setFlipped(!flipped)}>Flip board</button>
          <button className="training-action-secondary" onClick={finish}>Finish session</button>
        </div>
        {complete && <a className="training-text-link" href={`https://lichess.org/training/${id}`} target="_blank" rel="noopener noreferrer">Source puzzle on Lichess</a>}
      </div>
    </div>
  </article>;
}

export default function PatternTraining({ uid, membershipLink }) {
  const canPractice = Boolean(uid);
  const [progress, setProgress] = useState(() => canPractice ? patternProgress(uid, LEVELS[0]) : { level: LEVELS[0], days: 0 });
  const [level, setLevel] = useState(LEVELS.includes(progress.level) ? progress.level : LEVELS[0]);
  const [minutes, setMinutes] = useState(20);
  const [theme, setTheme] = useState("mixed");
  const [session, setSession] = useState(null);
  const [summary, setSummary] = useState(null);
  const [remaining, setRemaining] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const evalKey = "chessdrills.pattern.eval." + uid;
  const [showEval, setShowEval] = useState(() => {
    if (!canPractice) return false;
    try { return window.localStorage.getItem(evalKey) === "true"; } catch (_) { return false; }
  });
  const actions = useRef({});
  const ending = useRef(false);
  const summaryHeading = useRef(null);
  const guidePlayer = useRef(null);
  const deadline = session && session.deadline;

  useEffect(() => {
    if (!deadline) return undefined;
    const tick = () => setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [deadline]);
  useEffect(() => { if (summary) summaryHeading.current.focus(); }, [summary]);
  useEffect(() => { if (guideOpen && guidePlayer.current) guidePlayer.current.focus(); }, [guideOpen]);

  function start() {
    if (!canPractice) return;
    const latest = patternProgress(uid, LEVELS[0]);
    const queue = createPatternQueue(PATTERNS[level], theme, latest.recent);
    if (!queue.length) return;
    ending.current = false;
    actions.current = {};
    setRemaining(minutes * 60);
    setFlipped(false);
    setGuideOpen(false);
    setSummary(null);
    setSession({ queue, index: 0, level, deadline: Date.now() + minutes * 60000 });
  }

  function record(id, correct) {
    if (!Object.prototype.hasOwnProperty.call(actions.current, id)) {
      actions.current[id] = correct;
    }
  }

  function finish() {
    if (ending.current) return;
    ending.current = true;
    const last = patternProgress(uid, LEVELS[0]);
    const results = Object.values(actions.current);
    const date = localTrainingDate();
    const nextProgress = updatePatternProgress(last, { level: session.level, levels: LEVELS, results: actions.current, date });
    const saved = !results.length || savePatternProgress(uid, nextProgress);
    setProgress(nextProgress);
    if (results.length && LEVELS.includes(nextProgress.level)) setLevel(nextProgress.level);
    setSummary({ correct: results.filter(Boolean).length, total: results.length, level: session.level, saved });
    setSession(null);
  }

  if (session) {
    const puzzle = session.queue[session.index];
    return <PatternPosition key={puzzle[0]} raw={puzzle} index={session.index} flipped={flipped} setFlipped={setFlipped}
      showEval={showEval} toggleEval={() => {
        setShowEval(!showEval);
        try { window.localStorage.setItem(evalKey, String(!showEval)); } catch (_) {}
      }}
      timeLeft={remaining > 0 ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}` : "Time is up"}
      record={record} finish={finish} next={() => {
        if (Date.now() >= session.deadline || session.index + 1 >= session.queue.length) finish();
        else setSession((current) => ({ ...current, index: current.index + 1 }));
      }} />;
  }

  const practicedToday = progress.lastDate === localTrainingDate();
  return <>
    {summary && <section className="training-start pattern-summary">
      <h2 ref={summaryHeading} tabIndex={-1}>Session complete</h2>
      <p>{summary.correct} of {summary.total} solved on the first try without a hint</p>
      {progress.level > summary.level && summary.total > 0 && <p>Next difficulty {progress.level} to {progress.level + 99}</p>}
      {!summary.saved && <p role="alert">This browser could not save your training progress.</p>}
    </section>}
    <section className="pattern-setup">
      <div className="pattern-setup-main">
        <h1>Pattern recognition</h1>
        <p className="pattern-quick-start">Find the target. Check the reply.</p>
        <form className="pattern-form" onSubmit={(event) => { event.preventDefault(); start(); }}>
          <label>Difficulty
            <select value={level} disabled={!canPractice} onChange={(event) => {
              setLevel(Number(event.target.value));
              setTheme("mixed");
            }}>{LEVELS.map((value) => <option key={value} value={value}>{value} to {value + 99}</option>)}</select>
          </label>
          <label>Session length
            <select value={minutes} disabled={!canPractice} onChange={(event) => setMinutes(Number(event.target.value))}>
              <option value={5}>5 minutes</option><option value={10}>10 minutes</option><option value={20}>20 minutes</option>
            </select>
          </label>
          <label>Tactic
            <select value={theme} disabled={!canPractice} onChange={(event) => setTheme(event.target.value)}>
              {Object.entries(PATTERN_THEMES).filter(([key]) => key === "mixed" || PATTERNS[level].some((puzzle) => puzzle[4].includes(key)))
                .map(([key, name]) => <option key={key} value={key}>{name}</option>)}
            </select>
          </label>
          {canPractice ? <button type="submit">Start practice</button> :
            <Link className="training-action" to={membershipLink}>Unlock practice with Premium</Link>}
        </form>
        <div className="pattern-setup-foot">
          {progress.days > 0 && <span>{practicedToday ? "Practiced today" : `${progress.days} ${progress.days === 1 ? "day" : "days"} practiced`}</span>}
          <a className="training-text-link" href={SOURCE_URL} target="_blank" rel="noopener noreferrer">Lichess puzzle data</a>
          <details>
            <summary>How difficulty works</summary>
            <p>Solve at least 10 puzzles with 90% first try accuracy on two days at the same level to move up. Hints count as assisted. Progress is saved in this browser.</p>
          </details>
        </div>
      </div>
      <div className="pattern-guide">
        {guideOpen ? <video ref={guidePlayer} className="pattern-guide-video" tabIndex={0} controls autoPlay playsInline preload="metadata" poster={GUIDE + ".jpg" + GUIDE_VERSION} aria-label="How to train pattern recognition">
          <source src={GUIDE + ".mp4" + GUIDE_VERSION} type="video/mp4" />
          <track src={GUIDE + ".vtt" + GUIDE_VERSION} kind="captions" label="English" srcLang="en" default />
          <a href={GUIDE + ".mp4" + GUIDE_VERSION}>Download the guide</a>
        </video> : <button className="pattern-guide-cover" type="button" onClick={() => setGuideOpen(true)}>
          <img src={GUIDE + ".jpg" + GUIDE_VERSION} alt="" />
          <span className="pattern-guide-label"><span aria-hidden="true">▶︎</span> Why train this? <small>2 min 3 sec</small></span>
        </button>}
      </div>
    </section>
  </>;
}
