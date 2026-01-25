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

        <TopNav active="about" title="Luvvy Chess Trainers" />

        <div className="text-container">
          <h2 className="about-title">Thanks for stopping by!</h2>

          <p className="text">
          </p>

          <h2 className="about-title">ㅤᵕ̈</h2>

        </div>

        <div className="text-container">
          <p className="text text-center">
            <a
              href="https://github.com/Luvvydev"
              aria-label="Luvvydev on GitHub"
            >
              check out my github
            </a>
          </p>
        </div>
      </div>
    );
  }
}

export default About;
