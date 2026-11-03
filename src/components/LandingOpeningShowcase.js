import React from 'react';
import { Link } from 'react-router-dom';
import Chessboard from 'chessboardjsx';
import * as ChessModule from 'chess.js';

const Chess = ChessModule.Chess || ChessModule.default || ChessModule;
const examples = [
  { key: 'sicilian', title: 'Sicilian Defense', color: 'Black', moves: ['e4', 'c5', 'Nf3', 'd6'], size: 152, placement: 'left' },
  { key: 'carokann', title: 'Caro Kann Defense', color: 'Black', moves: ['e4', 'c6', 'd4', 'd5'], size: 152, placement: 'right' },
  { key: 'italian', title: 'Italian Game', color: 'White', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'], size: 216, placement: 'front' }
].map((opening) => {
  const game = new Chess();
  opening.moves.forEach((move) => game.move(move));
  return { ...opening, fen: game.fen() };
});

export default function LandingOpeningShowcase() {
  return <div className="landing-opening-showcase" aria-label="Examples from the opening trainer">
    <div className="landing-showcase-caption">OPENINGS FOR WHITE AND BLACK</div>
    {examples.map((opening) => <Link key={opening.key} to={`/openings?opening=${opening.key}`} className={`landing-showcase-card is-${opening.placement}`} aria-label={`Train the ${opening.title}`}>
      <div className="landing-showcase-side">{opening.color}</div>
      <div className="landing-showcase-board" aria-hidden="true"><Chessboard id={`landing-showcase-${opening.key}`} width={opening.size} position={opening.fen} orientation={opening.color === 'Black' ? 'black' : 'white'} draggable={false} showNotation={false} transitionDuration={0} lightSquareStyle={{ backgroundColor: '#eee9d8' }} darkSquareStyle={{ backgroundColor: '#7f9470' }} /></div>
      <h3>{opening.title}</h3><span className="landing-showcase-start">Practice opening <span aria-hidden="true">→</span></span>
    </Link>)}
  </div>;
}
