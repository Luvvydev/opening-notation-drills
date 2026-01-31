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

        <TopNav active="about" title="Chess Opening Drills" />

        <div className="about-wrap">
          <div className="about-card">
            <h2 className="about-title">Thanks for stopping by!</h2>

            <p className="about-lead">
              This is a practice tool for memorizing opening move orders.
            </p>

            <p className="about-muted">
              Buy Me a Coffee supporters get early access to new drills, priority input on upcoming openings,
              and the option to leave a Discord handle with their donation for direct feedback.
            </p>

            <div className="button-container">
              <a
                className="coffee-button"
                href="https://buymeacoffee.com/luvvydev"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span role="img" aria-label="coffee">
                  ☕
                </span>{' '}
                Buy Me a Coffee
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default About;
