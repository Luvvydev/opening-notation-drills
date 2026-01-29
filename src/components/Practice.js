import React, { Component } from 'react';
import Board from './Board';
import Settings from './Settings';
import TopNav from './TopNav';
import { DEFAULT_THEME } from '../theme/boardThemes';
import './Board.css';
import './Practice.css';

const calcWidth = ({ screenWidth, screenHeight }) => {
  return (screenWidth || screenHeight) < 1800 ? ((screenWidth || screenHeight) < 550 ? screenWidth : 500) : 600;
}

class Practice extends Component {
  constructor(props) {
    super(props);
    
    const settings = this.loadSettings();
    
    this.state = {
      orientation: 'white',
      showNotation: false,
      disableSettings: false,
      boardTheme: settings.boardTheme || DEFAULT_THEME
    }
  }
  
  loadSettings = () => {
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
  };

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
        <TopNav active="about" title="Chess Notation Drills" />
        <div class="page-body">
          <Board
            callbackDisableSettings={this.callbackDisableSettings}
            orientation={this.state.orientation}
            showNotation={this.state.showNotation}
            calcWidth={calcWidth}
            timed={false}
            boardTheme={this.state.boardTheme}
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