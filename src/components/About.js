import React, { Component } from 'react';
import GithubCorner from 'react-github-corner';
import { faCircle as blackCircle } from "@fortawesome/free-solid-svg-icons";
import { faCircle as whiteCircle } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
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
          <h2 className="about-title">Opening Trainer</h2>

          <p className="text">
            Each session starts from the initial position and walks you through real opening lines while the opponent’s replies are played automatically.
            After your first mistake in a line, a brief explanation appears for the current step to clarify what the move is trying to achieve.
          </p>

          <h2 className="about-title">Notation Trainer</h2>

          <p className="text">
            Notation mode shows a position and prompts a move.
            You will see the <FontAwesomeIcon icon={whiteCircle} /> icon if it is White to move,
            and the <FontAwesomeIcon icon={blackCircle} /> icon if it is Black to move.
            <br /><br />
            Notation Trainer is designed to build comfort with move recognition and algebraic notation.
            You are shown a position and prompted to play the correct move, with a clear indicator showing which side is to move.
            Incorrect moves are marked, but the exercise continues, allowing you to adjust and reinforce the correct pattern.
          </p>
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
