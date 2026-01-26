import React, { Component } from 'react';
import GithubCorner from 'react-github-corner';
import TopNav from './TopNav';
import './About.css';
import './Board.css';
import '../App.css';

class About extends Component {
  render() {
    return (
      <div className="about-page">
        <GithubCorner href="https://github.com/Luvvydev" />

        <TopNav active="about" title="Chess Opening Reps" />

        <div className="about-wrap">
          <div className="about-card">
            <h2 className="about-title">Thanks for stopping by!</h2>

            <p className="about-lead">
              Chess Opening Reps is a practice tool for memorizing opening move orders and basic notation through repetition.
              It is built for players who already know the rules and want the first phase of the game to feel automatic.
            </p>

            <p className="about-muted">
              
            </p>

            <div className="about-chips" aria-label="What you get">
              <div className="about-chip">Instant feedback</div>
              <div className="about-chip">Randomized reps</div>
              <div className="about-chip">Progress saved</div>
             
            </div>

            <div className="button-container">
              <a
                className="coffee-button"
                href="https://buymeacoffee.com/luvvydev"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span role="img" aria-label="coffee">☕</span> Buy me a coffee
              </a>
            </div>

            <div className="about-links">
              <a href="https://github.com/Luvvydev" aria-label="Luvvydev on GitHub">
                GitHub
              </a>
              <span className="about-dot"></span>
              <span className="about-smile">
                <span role="img" aria-label="smile">ㅤ</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default About;
