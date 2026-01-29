import React, { Component } from 'react';
import Chessboard from "chessboardjsx";
import * as Chess from 'chess.js';
import PGNData from '../PGN/outfile.json';
import { faCircle as blackCircle } from "@fortawesome/free-solid-svg-icons";
import { faCircle as whiteCircle } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { BOARD_THEMES, DEFAULT_THEME } from '../theme/boardThemes';
import './Board.css';

const game = new Chess();
const orientations = ['white', 'black'];

class Board extends Component {

  constructor(props) {
    super(props);
    this.state = { 
      fen: 'start', 
      randomGameIndex: 0, 
      randomMoveIndex: 0,
      initMove: '',
      initMoveData: {},
      nextMove: '',
      nextMoveData: {},
      history: [],
      nextMoveColor: '',
      squareStyles: {},
      answer: '',
      correctMoves: 0,
      time: 60,
      timerCount: 0,
      incorrect: false,
      correct: false,
      selectedSquare: null,
      legalTargets: []
    }
  }

  /* ====================================== Lifecylcle Methods ====================================== */

  componentDidMount() {
    this.newPosition();

    if(this.props.timed) {
      this.interval = setInterval(() => this.setState({ timerCount: this.state.timerCount+1 }), 1000); // Start timer
    
      // Call callbackEnd once timer stops
      setTimeout(() => {
        const finalBoardProps = {
          position: this.state.fen,
          squareStyles: this.state.squareStyles,
          allowDrag: () => false , 
          showNotation: this.props.showNotation,
          orientation: this.props.orientation === 'random' ? this.state.orientation : this.props.orientation,
          calcWidth: this.props.calcWidth,
        }
        this.props.callbackEnd(
          this.state.correctMoves,
          finalBoardProps)
      }, this.state.time * 1000);
    }
  }

  componentDidUpdate(prevProps) {
    if(!this.props.timed) {
      if(this.props.orientation !== prevProps.orientation){
        this.newPosition();
      }
    } 
  }

  componentWillUnmount() {
    if(this.props.timed) {
      clearInterval(this.interval);
    } 
  }

  /* ====================================== Component Methods ====================================== */

  // Generate new board position
  newPosition = () => {
    let orientation = null;
    if (this.props.orientation === 'random'){
      orientation = orientations[Math.floor(Math.random() * 2)];
    } else {
      orientation = this.props.orientation;
    }
    let randomGameIndex = Math.floor(Math.random() * PGNData.length);
    game.load_pgn(PGNData[randomGameIndex].data);
    let history = game.history();

    // In case game was not played
    if(history.length <= 2) {
      while(history.length <= 2){
        randomGameIndex = Math.floor(Math.random() * PGNData.length);
        game.load_pgn(PGNData[randomGameIndex].data);
        history = game.history();
      }
    }
    game.reset();

    // Initial half move must be the opposite color of orientation. Initial move cannot be last half move
    let randomMoveIndex = (orientation === 'white') ? 
      Math.floor(Math.random() *  Math.floor((history.length - 3) / 2)) * 2 + 1: 
      Math.floor(Math.random() *  Math.floor((history.length - 2) / 2)) * 2;
    
    // Do not use castles as move
    if (history[randomMoveIndex+1] === 'O-O' || history[randomMoveIndex+1] === 'O-O-O') {
        randomMoveIndex = (randomMoveIndex - 2) % history.length;
    }

    const initMove = history[randomMoveIndex];
    const nextMove = history[randomMoveIndex+1];

    // Save lastFullMove for defining the nextMoveColor state (ensures color and nextMove render at the same time)
    let i;
    let lastFullMove = {};
      for (i = 0; i < (randomMoveIndex); i++) {
        lastFullMove = game.move(history[i]);
    }
    
    this.setState({ 
      fen: game.fen(), 
      randomGameIndex: randomGameIndex,
      randomMoveIndex: randomMoveIndex,
      initMove: initMove,
      initMoveData: {},
      nextMove: nextMove,
      nextMoveData: {},
      history: history,
      nextMoveColor: lastFullMove.color === 'w' ? 'White' : 'Black',
      squareStyles: {},
      answer: '',
      orientation: orientation
    });

    setTimeout(() => this.makeInitMove(), 100);
    setTimeout(() => this.updateSquareStyling(), 800);
  }

  // For initMove animation
  makeInitMove = () => {
    const initMoveData =  game.move(this.state.initMove);
    const nextMoveData = game.move(this.state.nextMove);
    game.undo();
    this.setState({ fen: game.fen(), initMoveData: initMoveData, nextMoveData: nextMoveData });
  }

  // For initMove colors
  updateSquareStyling = () => {
    console.log(this.state);
    let squareStyles = {};
    squareStyles[this.state.initMoveData.from] = {backgroundColor: 'rgba(0, 255, 0, 0.3)'};
    squareStyles[this.state.initMoveData.to] = {backgroundColor: 'rgba(0, 255, 0, 0.3)'};
    this.setState({ squareStyles: squareStyles });
  }

  // Validate user move input
  onDrop = ({ sourceSquare, targetSquare, piece }) => {
    if (this.state.nextMoveData.from === sourceSquare 
       && this.state.nextMoveData.to === targetSquare
       && (this.state.nextMoveData.color + this.state.nextMoveData.piece.toUpperCase()) === piece) {
        if(!this.props.timed) {
          this.props.callbackDisableSettings(true);
        }
        game.move(this.state.nextMove); 
        this.setState({ 
          answer: 'correct', 
          fen: game.fen(), 
          correctMoves: this.state.correctMoves+1,
          correct: true,
          selectedSquare: null,
          legalTargets: []
        });
       } else if (sourceSquare === targetSquare) {
        // Skip if piece is dropped onto original square
       } else {
         this.setState({ answer: 'incorrect', incorrect: true, selectedSquare: null, legalTargets: [] });
       }
  }

  // Only allow correct colored pieces to be dragged
  allowDrag = ({ piece }) => {
    if (piece.charAt(0) === this.state.nextMoveData.color) {
      return true;
    } else {
      return false;
    }
  }

  clearSelection = () => {
    if (this.state.selectedSquare || (this.state.legalTargets && this.state.legalTargets.length)) {
      this.setState({ selectedSquare: null, legalTargets: [] });
    }
  };

  getLegalTargets = (fromSquare) => {
    if (!fromSquare) return [];
    try {
      const moves = game.moves({ square: fromSquare, verbose: true });
      if (!moves || !moves.length) return [];
      return moves.map((m) => m.to);
    } catch (_) {
      return [];
    }
  };

  onSquareClick = (square) => {
    const piece = game.get(square);
    // only let user interact with the correct side to move (the expected move color)
    if (!this.allowDrag({ piece: piece ? (piece.color + piece.type.toUpperCase()) : "" })) return;

    if (!this.state.selectedSquare) {
      if (!piece) return;
      const targets = this.getLegalTargets(square);
      this.setState({ selectedSquare: square, legalTargets: targets });
      return;
    }

    if (square === this.state.selectedSquare) {
      this.clearSelection();
      return;
    }

    // switch selection if clicking another own piece
    if (piece && piece.color === this.state.nextMoveData.color) {
      const targets = this.getLegalTargets(square);
      this.setState({ selectedSquare: square, legalTargets: targets });
      return;
    }

    const from = this.state.selectedSquare;
    const to = square;
    this.setState({ selectedSquare: null, legalTargets: [] }, () => {
      this.onDrop({ sourceSquare: from, targetSquare: to, piece: (this.state.nextMoveData.color + this.state.nextMoveData.piece.toUpperCase()) });
    });
  };

  onSquareRightClick = () => {
    this.clearSelection();
  };



  // Wait for movePrompt animation to end
  onAnimationEnd = () => {
    if (this.state.correct) {
      this.setState({ incorrect: false, correct: false });
      this.newPosition();
    }
    this.setState({ incorrect: false, correct: false });

    if(!this.props.timed) {
      setTimeout(() => {
        this.props.callbackDisableSettings(false)
      }, 800);
    }
  }

  /* ====================================== Render Function ====================================== */

  render() {
    const incorrect = this.state.incorrect;
    const correct = this.state.correct;


    const renderSquareStyles = { ...(this.state.squareStyles || {}) };

    if (this.state.selectedSquare) {
      renderSquareStyles[this.state.selectedSquare] = {
        ...(renderSquareStyles[this.state.selectedSquare] || {}),
        boxShadow: "inset 0 0 0 3px rgba(170, 80, 255, 0.75)"
      };
    }

    if (this.state.legalTargets && this.state.legalTargets.length) {
      for (const toSq of this.state.legalTargets) {
        const existing = renderSquareStyles[toSq] || {};
        const dot = "radial-gradient(circle at center, rgba(170, 80, 255, 0.55) 18%, rgba(0,0,0,0) 20%)";
        const mergedBg = existing.backgroundImage ? (existing.backgroundImage + ", " + dot) : dot;
        renderSquareStyles[toSq] = {
          ...existing,
          backgroundImage: mergedBg,
          backgroundRepeat: existing.backgroundRepeat ? existing.backgroundRepeat + ", no-repeat" : "no-repeat",
          backgroundPosition: existing.backgroundPosition ? existing.backgroundPosition + ", center" : "center",
          backgroundSize: existing.backgroundSize ? existing.backgroundSize + ", 100% 100%" : "100% 100%"
        };
      }
    }

    return (
      <div>
        <Timer 
          time={this.state.time - this.state.timerCount} 
          display={this.props.timed ? 'block' : 'none'} />
        <Chessboard
          position={this.state.fen} 
          squareStyles={renderSquareStyles}
          onDrop={this.onDrop}
          allowDrag={this.allowDrag} 
          showNotation={this.props.showNotation} 
          orientation={this.props.orientation === 'random' ? this.state.orientation : this.props.orientation}
          calcWidth={this.props.calcWidth}
          onSquareClick={this.onSquareClick}
          onSquareRightClick={this.onSquareRightClick}
          {...BOARD_THEMES[this.props.boardTheme || DEFAULT_THEME]}
          />
        <div 
        id='movePrompt' >
          {this.state.nextMoveColor === 'White' ? <FontAwesomeIcon icon={whiteCircle} /> : <FontAwesomeIcon icon={blackCircle} />}   
          <span> </span>
          <span 
          onAnimationEnd={this.onAnimationEnd}
          className={incorrect ? 'incorrect' : (correct ? 'correct' : '')}>
            {this.state.nextMove}
            </span>
        </div>
      </div>
    );
  }
}

function Timer(props) {
  return (
    <div 
      class="timer-container" 
      style={props.time < 10 ? {color: 'red', display: props.display} : {display: props.display}} >
      <div>{props.time}</div>
    </div>
  );
}


export default Board;