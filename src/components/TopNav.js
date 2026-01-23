import React from 'react';
import { Link } from 'react-router-dom';
import './TopNav.css';

function TopNav(props) {
  const title = props.title || 'Chess Notation Trainer';

  const homeButton = (props.active === 'home' && props.onHome)
    ? (
      <button class="topnav-button active" onClick={props.onHome}>
        Home
      </button>
    )
    : (
      <Link to='/'>
        <button class={props.active === 'home' ? 'topnav-button active' : 'topnav-button'}>
          Home
        </button>
      </Link>
    );

  return (
    <div class="topnav">
      <div class="topnav-inner">
        <div class="topnav-brand">{title}</div>

        <div class="topnav-actions">
          {homeButton}

          <Link to='/practice'>
            <button class={props.active === 'practice' ? 'topnav-button active' : 'topnav-button'}>
              Practice Notation
            </button>
          </Link>

          <Link to='/openings'>
            <button class={props.active === 'openings' ? 'topnav-button active' : 'topnav-button'}>
              Openings Trainer
            </button>
          </Link>

          <Link to='/about'>
            <button class={props.active === 'about' ? 'topnav-button active' : 'topnav-button'}>
              About
            </button>
          </Link>

          {props.showSpeedDrill ? (
            <button class="topnav-button primary" onClick={props.onSpeedDrill}>
              Start Notation Drill
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default TopNav;
