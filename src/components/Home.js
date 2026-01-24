import React, { Component } from 'react';
import Board from './Board';
import Settings from './Settings';
import Chessboard from 'chessboardjsx';
import TopNav from './TopNav';
import './Home.css';

const calcWidth = ({ screenWidth, screenHeight }) => {
  return (screenWidth || screenHeight) < 1800 ? ((screenWidth || screenHeight) < 550 ? screenWidth : 500) : 600;
}

class Home extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentState: 'init',
      orientation: 'white',
      showNotation: false
    }
    this.handleStart = this.handleStart.bind(this);
    this.handleHome = this.handleHome.bind(this);
  }

  handleHome() {
    this.setState({ currentState: 'init' });
  }

  renderSwitch(state) {
    switch(state) {

      case 'init':
        return (
          <div class="home-page">
            <TopNav
              active="home"
              title="Luvvy Chess Trainers"
              showSpeedDrill={true}
              onSpeedDrill={this.handleStart}
              onHome={this.handleHome}
            />

            <div class="home-body">
              <div class="home-board-card">
                <Chessboard
                  draggable={false}
                  position="start"
                  orientation={this.state.orientation === 'random' ? 'white' : this.state.orientation}
                  showNotation={this.state.showNotation}
                  calcWidth={calcWidth}
                />
              </div>
            </div>
          </div>
        );

      case 'active':
        return (
          <div class="home-page">
            <TopNav
              active="home"
              title="Chess Notation Trainer"
              showSpeedDrill={false}
              onHome={this.handleHome}
            />

            <div class="home-body">
              <Board
                callbackEnd={this.callbackEnd}
                orientation={this.state.orientation}
                showNotation={this.state.showNotation}
                calcWidth={calcWidth}
                timed={true}
              />
            </div>
          </div>
        );

      case 'ended':
        return (
          <div class="home-page">
            <TopNav
              active="home"
              title="Chess Notation Trainer"
              showSpeedDrill={true}
              onSpeedDrill={this.handleStart}
              onHome={this.handleHome}
            />

            <div class="home-body">
              <div class="home-score">Score: {this.state.correctMoves} Moves</div>

              <div class="home-board-card">
                <Chessboard
                  {...this.state.finalBoardProps}
                  orientation={this.state.orientation === 'random' ? 'white' : this.state.orientation}
                  showNotation={this.state.showNotation}
                  calcWidth={calcWidth}
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;

    }
  }

  handleStart(event) {
    this.setState({ currentState: 'active' });
  }

  callbackEnd = (correctMoves, finalBoardProps) => {
    this.setState({
      correctMoves: correctMoves,
      finalBoardProps: finalBoardProps,
      currentState: 'ended'
    });
  }

  callbackSettings = (orientation, showNotation) => {
    this.setState({
      orientation: orientation,
      showNotation: showNotation
    });
  }

  render() {
    return (
      <div>
        {this.renderSwitch(this.state.currentState)}
        <Settings
          callbackSettings={this.callbackSettings}
          style={{display: this.state.currentState === 'active' ? 'none' : 'block'}}
        />
      </div>
    );
  }
}

export default Home;
