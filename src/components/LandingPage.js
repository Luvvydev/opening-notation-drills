import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Chessboard from 'chessboardjsx';
import * as ChessModule from 'chess.js';
import { useAuth } from '../auth/AuthProvider';
import { trackEvent } from '../utils/trackEvent';
import SEO from './SEO';
import HomeOpeningDemo from './HomeOpeningDemo';
import LandingOpeningShowcase from './LandingOpeningShowcase';
import logo from '../assets/chessdrillslogo.png';
import './LandingPage.css';
import { LANDING_TACTICS } from './landingTactics';

const Chess = ChessModule.Chess || ChessModule.default || ChessModule;
function Arrow() {
  return <svg className="landing-arrow" aria-hidden="true" viewBox="0 0 20 20" fill="none"><path d="M4 16 16 4M4 4h12v12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

const signup = '/signup?source=landing&from=%2Fabout';

function ReviewPreview() {
  const frame = useRef(null);
  const game = useRef(null);
  const advanceTimer = useRef(null);
  const checkTimer = useRef(null);
  const sounds = useRef({});
  const locked = useRef(false);
  const [width, setWidth] = useState(320);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [outcome, setOutcome] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [lastMove, setLastMove] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try { return JSON.parse(localStorage.getItem('notation_trainer_opening_settings_v1') || '{}').playSounds !== false; } catch (_) { return true; }
  });
  const tactic = LANDING_TACTICS[index];
  const createGame = (position) => {
    const next = position.fen ? new Chess(position.fen) : new Chess();
    (position.moves || []).forEach((move) => next.move(move));
    return next;
  };
  if (!game.current) game.current = createGame(tactic);
  const [fen, setFen] = useState(() => game.current.fen());

  useEffect(() => {
    const players = sounds.current;
    const measure = () => {
      if (frame.current && frame.current.clientWidth) setWidth(Math.floor(frame.current.clientWidth / 8) * 8);
    };
    measure();
    const observer = window.ResizeObserver ? new window.ResizeObserver(measure) : null;
    if (observer) observer.observe(frame.current);
    window.addEventListener('resize', measure);
    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener('resize', measure);
      window.clearTimeout(advanceTimer.current);
      window.clearTimeout(checkTimer.current);
      Object.values(players).forEach((player) => player.pause());
    };
  }, []);

  const stopSounds = () => {
    window.clearTimeout(checkTimer.current);
    Object.values(sounds.current).forEach((player) => { player.pause(); player.currentTime = 0; });
  };
  const playSound = (name) => {
    if (!soundEnabled) return;
    try {
      if (!sounds.current[name]) {
        sounds.current[name] = new Audio(`/sounds/${name === 'landing-check' ? 'landing-check.wav' : `${name}.mp3`}`);
        sounds.current[name].volume = name === 'landing-check' ? 0.18 : 0.28;
      }
      const player = sounds.current[name];
      player.currentTime = 0;
      const result = player.play();
      if (result && result.catch) result.catch(() => {});
    } catch (_) {}
  };
  const loadPosition = (nextIndex) => {
    window.clearTimeout(advanceTimer.current);
    stopSounds();
    game.current = createGame(LANDING_TACTICS[nextIndex]);
    locked.current = false;
    setIndex(nextIndex); setFen(game.current.fen()); setSelected(null);
    setOutcome(null); setFeedback(''); setLastMove(null);
  };
  const finishMove = (move, result) => {
    locked.current = true;
    setSelected(null); setOutcome(result);
    if (move) {
      setFen(game.current.fen()); setLastMove(move);
      playSound(move.captured ? 'capture' : 'move-self');
      if (game.current.in_check()) checkTimer.current = window.setTimeout(() => playSound('landing-check'), 130);
    } else {
      playSound('illegal');
    }
    if (result === 'correct') setFeedback(`Correct. ${tactic.explanation} Next position in a moment.`);
    if (result === 'answer') setFeedback(`${tactic.explanation} Next position in a moment.`);
    if (result === 'wrong') setFeedback(move ? 'Not quite. The position will reset so you can try again.' : 'That move is not legal. Try again in a moment.');
    advanceTimer.current = window.setTimeout(() => loadPosition(result === 'wrong' ? index : (index + 1) % LANDING_TACTICS.length), result === 'wrong' ? 1400 : 2600);
  };
  const play = (from, to) => {
    if (locked.current) return;
    let move;
    try { move = game.current.move({ from, to, promotion: 'q' }); } catch (_) { move = null; }
    finishMove(move, move && from === tactic.answer.from && to === tactic.answer.to ? 'correct' : 'wrong');
  };
  const selectSquare = (square) => {
    if (locked.current) return;
    const piece = game.current.get(square);
    if (piece && piece.color === 'w') { setSelected(square); return; }
    if (selected) play(selected, square);
  };
  const showAnswer = () => {
    if (outcome) { loadPosition(index); return; }
    const move = game.current.move(tactic.answer);
    finishMove(move, 'answer');
  };

  const squareStyles = {};
  if (lastMove) {
    const color = outcome === 'wrong' ? '#bb6b61' : '#f4c542';
    squareStyles[lastMove.from] = { backgroundColor: color };
    squareStyles[lastMove.to] = { backgroundColor: color };
  }
  if (selected && !outcome) {
    squareStyles[selected] = { backgroundColor: '#f4c542' };
    game.current.moves({ square: selected, verbose: true }).forEach((move) => {
      squareStyles[move.to] = { backgroundImage: 'radial-gradient(circle, rgba(0,0,0,.3) 19%, transparent 21%)' };
    });
  }

  return <div className="landing-preview">
    <div className="landing-preview-bar"><span><i /> TRY A TACTIC</span><span>Position {index + 1} of {LANDING_TACTICS.length}</span></div>
    <div className="landing-board" ref={frame}>
      <Chessboard id="landing-review-preview" width={width} position={fen} draggable={!outcome} allowDrag={({ piece }) => !locked.current && piece.startsWith('w')} onDrop={({ sourceSquare, targetSquare }) => play(sourceSquare, targetSquare)} onSquareClick={selectSquare} transitionDuration={180} lightSquareStyle={{ backgroundColor: '#e6e8d5' }} darkSquareStyle={{ backgroundColor: '#71836a' }} squareStyles={squareStyles} />
      {outcome === 'correct' && <div className="landing-confetti" aria-hidden="true">{Array.from({ length: 36 }, (_, i) => <span key={i} style={{ left: `${10 + (i * 17) % 80}%`, backgroundColor: ['#ff2da3', '#f4c542', '#b9dbab', '#ffffff'][i % 4], '--drift': `${(i % 2 ? 1 : -1) * (25 + i % 7 * 12)}px`, animationDelay: `${i % 6 * 35}ms` }} />)}</div>}
    </div>
    <p className="landing-preview-help">Drag a piece, or tap it and its destination.</p>
    <div className="landing-preview-note" role="status" aria-live="polite"><span className="landing-move-icon">{outcome === 'correct' ? '!' : '?'}</span><div><strong>{outcome === 'correct' ? 'Correct!' : tactic.title}</strong><p>{feedback || tactic.instruction}</p></div></div>
    <button className="landing-preview-action" type="button" onClick={showAnswer}>{outcome ? 'Reset the example' : 'Show the better move'} <Arrow /></button>
    <div className="landing-tactic-controls"><button type="button" onClick={() => loadPosition((index + 1) % LANDING_TACTICS.length)}>Next position</button><button type="button" aria-pressed={soundEnabled} aria-label={soundEnabled ? 'Mute tactic sounds' : 'Enable tactic sounds'} onClick={() => { stopSounds(); setSoundEnabled((value) => !value); }}>{soundEnabled ? 'Sound on' : 'Sound off'}</button></div>
  </div>;
}

export default function LandingPage() {
  const { user } = useAuth();
  const start = user ? '/about' : signup;
  useEffect(() => { trackEvent('landing_page_view', {}, user, { persist: false }); }, [user]);
  const cta = (location) => trackEvent('landing_start_click', { location }, user, { persist: false });

  return <div className="landing-page">
    <SEO title="ChessDrills | Learn and Practice Chess Openings" description="Learn openings for White and Black. Practice the moves on an interactive board with explanations and hints. Try an opening without an account." canonical="https://chessdrills.net/" />
    <a className="landing-skip" href="#landing-content">Skip to content</a>
    <header className="landing-header"><div className="landing-wrap landing-nav">
      <Link to="/" aria-label="ChessDrills landing page" className="landing-brand"><img src={logo} alt="ChessDrills" /></Link>
      <nav aria-label="Landing page navigation"><a className="landing-nav-detail" href="#how-it-works">How it works</a><Link className="landing-nav-detail" to="/openings/library">Openings</Link><Link to={user ? '/home' : '/login'}>{user ? 'My training' : 'Log in'}</Link><Link className="landing-button landing-button-small" to={start} onClick={() => cta('navigation')}>{user ? 'Membership' : 'Try for free'}</Link></nav>
    </div></header>

    <main id="landing-content">
      <section className="landing-wrap landing-hero">
        <div className="landing-hero-copy"><p className="landing-eyebrow">CHESS OPENING TRAINER</p><h1>Learn your openings.<br /><span>Know what to play.</span></h1><p className="landing-lead">Choose an opening for White or Black, learn why each move is played, and practice the moves on the board.</p><div className="landing-actions"><Link className="landing-button" to={start} onClick={() => cta('hero')}>{user ? 'See membership' : 'Try for free'} <Arrow /></Link><a className="landing-text-link" href="#opening-demo">Try an opening <Arrow /></a></div><p className="landing-fine">3 days of opening training. One game review preview.<br />No card required.</p></div>
        <div className="landing-hero-visual" id="opening-demo"><div className="landing-visual-caption"><span className="landing-caption-line" /> Try a London opening. No account needed.</div><div className="landing-demo-wrap"><div className="landing-demo-heading"><span className="landing-eyebrow">TRY IT RIGHT HERE</span></div><HomeOpeningDemo /></div></div>
      </section>

      <section className="landing-intro"><div className="landing-wrap landing-intro-inner"><LandingOpeningShowcase /><div className="landing-intro-card"><h2>Want to learn openings, but not sure where to start?</h2><p>Choose an opening and start practicing. ChessDrills explains the moves as you play, with hints when you need them.</p><ul className="landing-checks"><li>Openings for White and Black</li><li>Simple explanations for each move</li><li>Learn and practice on the board</li></ul><Link className="landing-button landing-button-small" to={start} onClick={() => cta('introduction')}>Try for free</Link></div></div></section>

      <section className="landing-process" id="how-it-works"><div className="landing-wrap"><div className="landing-section-heading"><p className="landing-eyebrow">GETTING STARTED</p><h2>Here’s how ChessDrills works.</h2><p>Choose an opening. Learn the moves. Practice them.</p></div><div className="landing-steps">
        <article><span className="landing-step-number">01</span><h3>Choose an opening</h3><p>Browse the opening library and pick an opening for White or Black that you want to learn.</p><span className="landing-step-tag">White and Black</span></article>
        <article><span className="landing-step-number">02</span><h3>Learn the moves</h3><p>Play through the opening on the board and read the explanation behind each move.</p><span className="landing-step-tag">Moves with explanations</span></article>
        <article><span className="landing-step-number">03</span><h3>Practice your opening</h3><p>Make the moves yourself. Use a hint if you get stuck, then practice the line again.</p><span className="landing-step-tag">Practice at your own pace</span></article>
      </div><div className="landing-centered"><Link className="landing-text-link" to="/openings/library">Explore the openings <Arrow /></Link><p className="landing-fine">Try the sample opening above without an account.</p></div></div></section>

      <section className="landing-wrap landing-openings landing-review" id="review-demo"><div className="landing-opening-copy"><p className="landing-eyebrow">GAME REVIEW AND MISTAKE TRAINING</p><h2>Learn from<br /><span>your own games.</span></h2><p className="landing-lead">Bring in a game from Chess.com or Lichess, or paste a PGN. Review the moves and practice the mistakes you made.</p><ul className="landing-checks"><li>See where your game went wrong</li><li>Compare your moves with the engine’s suggestion</li><li>Practice positions from your own games</li></ul><Link className="landing-text-link" to="/my-games">Review my first game <Arrow /></Link><p className="landing-fine">An account is required. Your first review includes its practice puzzles.</p><div className="landing-compatible"><span>Bring your games from</span><strong>Chess.com</strong><span className="landing-divider" /><strong>Lichess</strong><span className="landing-divider" /><strong>PGN</strong></div></div><div className="landing-review-visual"><div className="landing-visual-caption"><span className="landing-caption-line" /> Try a few example positions.</div><ReviewPreview /></div></section>

      <section className="landing-wrap landing-faq"><div><p className="landing-eyebrow">BEFORE YOU START</p><h2>Common questions.</h2></div><div className="landing-questions">
        <details><summary>What should I do first?</summary><p>Try the London opening at the top of this page without an account. Then browse the opening library and choose an opening for White or Black. Create an account to start your opening training trial. You can also import a game through Game Review to practice your mistakes.</p></details>
        <details><summary>What is included for free?</summary><p>You can try the opening demo without an account. Eligible accounts can activate 3 days of opening training with no card required. You also get one Game Review preview with puzzles from that game. Additional reviews and Mistake Packs require paid membership, including during the trial.</p></details>
        <details><summary>Do I play my games on ChessDrills?</summary><p>You can keep playing on Chess.com or Lichess and bring those games here to review and practice. ChessDrills also has a Play vs Computer mode in the training workspace.</p></details>
        <details><summary>Does the trial turn into a subscription?</summary><p>No. The free trial ends automatically. A paid membership is a separate choice. See the membership page for current plans and billing details.</p></details>
      </div></section>

      <section className="landing-finish"><div className="landing-wrap"><h2>Ready to get started?</h2><p>Try opening training free for 3 days. No card required.</p><div className="landing-membership"><div><h3>Get access to:</h3><ul className="landing-checks"><li>Opening training for White and Black</li><li>Game Review</li><li>Mistake Training and Mistake Packs</li><li>Saved training progress</li></ul><Link className="landing-button" to={start} onClick={() => cta('membership')}>{user ? 'See membership' : 'Try for free'}</Link><p className="landing-fine">Trial includes one review with puzzles.<br />Additional reviews and Mistake Packs require paid membership.</p></div><div className="landing-plan-options"><div className="landing-plan"><strong>Monthly membership</strong><p className="landing-price">$5.99 <span>/ month</span></p><p>Billed monthly. Cancel anytime.</p><Link className="landing-text-link" to="/about">View membership <Arrow /></Link></div><div className="landing-plan"><strong>Yearly membership</strong><p className="landing-price">$39 <span>/ year</span></p><p>$3.25 per month, billed annually.</p><Link className="landing-text-link" to="/about">View membership <Arrow /></Link></div></div></div></div></section>
    </main>
    <footer className="landing-wrap landing-footer"><Link className="landing-brand" to="/"><img src={logo} alt="ChessDrills" /></Link><p>Opening training. Game review. Mistake practice.</p><nav aria-label="Footer"><Link to="/home">Training home</Link><Link to="/about">Membership</Link><Link to="/login">Log in</Link></nav><small>© {new Date().getFullYear()} ChessDrills</small></footer>
  </div>;
}
