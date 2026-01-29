import React from 'react';
import { HashRouter, Route } from 'react-router-dom';
import './App.css';
import Home from './components/Home';
import About from './components/About';
import Practice from './components/Practice';
import OpeningTrainer from './components/OpeningTrainer';
import StreakModal from './components/StreakModal';

class App extends React.Component {
  render () {
    return (
      <div className="board-container">
        <HashRouter basename='/'>
          <StreakModal />
          <Route exact path='/' component={Home} />
          <Route path='/practice' component={Practice} />
          <Route path='/openings' component={OpeningTrainer} />
          <Route path='/about' component={About} />
        </HashRouter>
      </div>
    );
  }
}

export default App;
