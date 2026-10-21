import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Chessboard from 'chessboardjsx';
import * as ChessModule from 'chess.js';
import { OPENING_CATALOG } from '../openings/openingCatalog';
import { BOARD_THEMES, DEFAULT_THEME } from '../theme/boardThemes';
import { trackEvent } from '../utils/trackEvent';

// chess.js 0.11 exports a constructor in the browser and { Chess } in Node.
const Chess = ChessModule.Chess || ChessModule.default || ChessModule;

// Use the same first London line as /demo, rather than a separate sample position.
export const HOME_DEMO_LINE = OPENING_CATALOG.find((opening) => opening.key === 'london').lines[0];

export function createHomeDemoGame() {
  const game = new Chess();
  HOME_DEMO_LINE.moves.slice(0, 2).forEach((move) => game.move(move));
  return game;
}

export default function HomeOpeningDemo({ boardTheme }) {
  const game = useRef(null);
  if (!game.current) game.current = createHomeDemoGame();
  const frame = useRef(null);
  const timer = useRef(null);
  const attempted = useRef(false);
  const locked = useRef(false);
  const sounds = useRef({});
  const [width, setWidth] = useState(280);
  const [fen, setFen] = useState(() => game.current.fen());
  const [ply, setPly] = useState(2);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try { return JSON.parse(localStorage.getItem('notation_trainer_opening_settings_v1') || '{}').playSounds !== false; } catch (_) { return true; }
  });
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;
  const complete = ply >= HOME_DEMO_LINE.moves.length;
  const expected = HOME_DEMO_LINE.moves[ply];
  const instruction = String(HOME_DEMO_LINE.explanations[ply] || 'Continue building your London setup.').replace(/\{\{square ([^}]+)\}\}/g, '$1');
  const hintMove = showHint && !complete && !busy ? game.current.moves({ verbose: true }).find((move) => move.san === expected) : null;

  const playSound = (name) => {
    if (!soundEnabledRef.current) return;
    try {
      if (!sounds.current[name]) {
        sounds.current[name] = new Audio(`/sounds/${name}.mp3`);
        sounds.current[name].volume = 0.55;
      }
      const sound = sounds.current[name];
      sound.currentTime = 0;
      const result = sound.play();
      if (result && result.catch) result.catch(() => {});
    } catch (_) {}
  };

  useEffect(() => {
    const audioPlayers = sounds.current;
    const measure = () => {
      if (frame.current && frame.current.clientWidth) setWidth(Math.max(8, Math.floor(Math.min(400, frame.current.clientWidth) / 8) * 8));
    };
    measure();
    const observer = window.ResizeObserver ? new window.ResizeObserver(measure) : null;
    if (observer) observer.observe(frame.current);
    window.addEventListener('resize', measure);
    return () => { if (observer) observer.disconnect(); window.removeEventListener('resize', measure); window.clearTimeout(timer.current); Object.values(audioPlayers).forEach((sound) => sound.pause()); };
  }, []);

  const reset = () => {
    window.clearTimeout(timer.current);
    game.current = createHomeDemoGame();
    locked.current = false; setShowHint(false);
    setFen(game.current.fen()); setPly(2); setBusy(false); setSelected(null);
    setFeedback('');
  };

  const play = (move) => {
    if (locked.current || busy || complete) return;
    let result;
    try { result = game.current.move(move); } catch (_) { result = null; }
    if (!result) { setSelected(null); setFeedback('That move is not legal. Try another square.'); playSound('illegal'); return; }
    if (result.san !== expected) {
      game.current.undo(); setSelected(null);
      setFeedback('That move is legal, but try the idea in the instruction. Use Hint if you need help.');
      playSound('illegal');
      return;
    }
    if (!attempted.current) {
      attempted.current = true;
      trackEvent('demo_start_click', { location: 'home_embedded', opening: 'london' }, null);
    }
    setShowHint(false); playSound(result.captured ? 'capture' : 'move-self');
    setSelected(null); setFen(game.current.fen());
    const next = ply + 1;
    setPly(next);
    if (next >= HOME_DEMO_LINE.moves.length) {
      setFeedback('Line complete. Your London setup is ready.');
      trackEvent('home_demo_completed', { opening: 'london' }, null, { persist: false });
      return;
    }
    locked.current = true;
    setBusy(true); setFeedback(`Correct. Black replies ${HOME_DEMO_LINE.moves[next]}.`);
    timer.current = window.setTimeout(() => {
      const reply = game.current.move(HOME_DEMO_LINE.moves[next]);
      playSound(reply && reply.captured ? 'capture' : 'move-opponent');
      locked.current = false;
      setFen(game.current.fen()); setPly(next + 1); setBusy(false);
      setFeedback('');
    }, 650);
  };

  const selectSquare = (square) => {
    if (locked.current || busy || complete) return;
    const piece = game.current.get(square);
    if (piece && piece.color === 'w') { setSelected(square); return; }
    if (selected) play({ from: selected, to: square, promotion: 'q' });
  };
  const styles = {};
  if (selected) {
    styles[selected] = { backgroundColor: 'rgba(244,197,66,.6)' };
    game.current.moves({ square: selected, verbose: true }).forEach((move) => {
      styles[move.to] = { backgroundImage: 'radial-gradient(circle, rgba(0,0,0,.3) 19%, transparent 21%)' };
    });
  }

  if (showHint && hintMove) {
    styles[hintMove.from] = { backgroundColor: 'rgba(244,197,66,.6)' };
    styles[hintMove.to] = { backgroundColor: 'rgba(80,170,255,.65)', boxShadow: 'inset 0 0 0 3px #72b8ff' };
  }

  return <section className="home-demo" aria-label="Interactive London opening demo">
    <div className="home-demo-board" ref={frame}>
      <Chessboard id="homepage-london-demo" width={width} position={fen} orientation="white" showNotation transitionDuration={0} allowDrag={({ piece }) => !busy && !complete && piece.startsWith('w')} draggable={!busy && !complete} onDrop={({ sourceSquare, targetSquare }) => play({ from: sourceSquare, to: targetSquare, promotion: 'q' })} onSquareClick={selectSquare} squareStyles={styles} {...(BOARD_THEMES[boardTheme] || BOARD_THEMES[DEFAULT_THEME])} />
    </div>
    <div className="home-demo-copy">
      <h2>Try a London line</h2>
      {ply === 2 && !busy && <p className="home-demo-help">Drag a piece, or tap it and its destination.</p>}
      <p className="home-demo-feedback" role="status" aria-live="polite">{complete ? 'Line complete.' : busy ? 'Black is replying…' : feedback ? `${feedback} ${instruction}` : instruction}</p>
      {showHint && hintMove && <p className="home-demo-hint">Play {expected}: {hintMove.from} → {hintMove.to}.</p>}
      {complete && <Link className="home-text-link" to="/openings?opening=london">Train the London System →</Link>}
      <div className="home-demo-bottom"><div className="home-demo-controls"><button type="button" disabled={busy || complete} aria-pressed={showHint} onClick={() => { setShowHint((value) => !value); setFeedback(''); }}>Hint</button><button type="button" onClick={reset}>Reset</button><button type="button" aria-label={soundEnabled ? 'Mute demo sounds' : 'Enable demo sounds'} aria-pressed={soundEnabled} onClick={() => setSoundEnabled((value) => !value)}>{soundEnabled ? 'Sound on' : 'Sound off'}</button></div><span>No account needed</span></div>
    </div>
  </section>;
}
