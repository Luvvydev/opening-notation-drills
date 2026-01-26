import React, { Component } from 'react';
import Board from './Board';
import Settings from './Settings';
import TopNav from './TopNav';
import './Board.css';
import './Practice.css';

const calcWidth = ({ screenWidth, screenHeight }) => {
  return (screenWidth || screenHeight) < 1800 ? ((screenWidth || screenHeight) < 550 ? screenWidth : 500) : 600;
}

class Practice extends Component {
  constructor(props) {
    super(props);
    this.state = {
      orientation: 'white',
      showNotation: false,
      disableSettings: false
    }
  }

  callbackSettings = (orientation, showNotation) => {
    this.setState({
      orientation: orientation,
      showNotation: showNotation
    });
  }

  callbackDisableSettings = (disableSettings) => {
    this.setState({
      disableSettings: disableSettings
    });
  }

  render() {
    return (
      <div class="page-dark">
        <TopNav active="about" title="Chess Notation Reps" />
<div class="page-body">
          <Board
            callbackDisableSettings={this.callbackDisableSettings}
            orientation={this.state.orientation}
            showNotation={this.state.showNotation}
            calcWidth={calcWidth}
            timed={false}
          />

          <Settings
            callbackSettings={this.callbackSettings}
            style={{ marginTop: 15 }}
            disabled={this.state.disableSettings}
          />
        </div>
      </div>
    );
  }
}

export default Practice;
