# Opening & Notation Chess Trainer

A focused chess training web app built around opening line drilling and notation recall

Live site: https://chessdrills.net

This tool expects mistakes. You play moves, get them wrong, see why, and repeat

---

## Core Features

### Opening Trainer

The primary mode of the application.

- Trains real opening lines, not theory trees
- Currently supports:
  - London System
  - Sicilian Defense
  - Ruy Lopez
  - Fried Liver Attack
  - Caro-Kann Defense
  - Stafford Gambit
- Dozens of curated lines per opening
- Lines are selected randomly
- You always play the side being trained
- Opponent replies automatically

#### Behavior on mistakes

- Incorrect moves are marked immediately
- The board position does not reset
- Explanations unlock to explain why the move fails
- You replay the position and continue the line

The goal is correction through understanding, not punishment.

#### Completion behavior

- Completing a line triggers a confetti animation
- A new random line loads automatically
- Training continues in an infinite loop

---

## Design Goals

- Dark, consistent UI
- Single shared top navigation across all pages
- Short, idea focused opening lines
- Randomization to prevent rote memorization

---

## Tech Stack

- React (Create React App)
- chess.js for rules, legality, and game state
- chessboardjsx for board rendering
- No backend
- No authentication
- No external APIs
- All data stored locally in plain JavaScript files

---

## Project Structure

    src/
      components/
        Home.js
        OpeningTrainer.js
        Practice.js
        Settings.js
        TopNav.js
        About.js
      openings/
        londonLines.js
        sicilianDefenseLines.js
        ruyLopezLines.js
        friedLiverAttackLines.js
        caroKannLines.js
        staffordGambitLines.js

Notes:

- OpeningTrainer.js contains all opening logic and flow control
- Each file in openings is pure data
- Adding a new opening requires no architectural changes

---

## Adding or Editing Opening Lines

Open any file in:

    src/openings/

Each opening line follows this structure:

    {
      id: "unique-id",
      name: "Line title",
      description: "What the line is trying to teach",
      moves: ["e4", "c5", "Nf3", "..."],
      explanations: [
        "Why this move is played",
        "What it aims to achieve",
        "What problem it solves"
      ]
    }

Rules:

- moves.length must equal explanations.length
- Moves are written in SAN
- Each line should teach one idea, not a full repertoire

---

## Environment

### Node Version

This project runs on Node 16 LTS.

The repository includes a .nvmrc file containing:

    16

Activate with:

    nvm use

No OpenSSL legacy flags required.

---

## Running Locally

    npm install
    npm start

---

## Why This Exists

Most opening tools:

- Encourage passive reading
- Overload users with branching theory
- Reward clicking instead of recall

This app is designed to:

- Force active decision making
- Allow mistakes without blocking progress
- Reinforce ideas through repetition
- Stay small, fast, and maintainable


---

## Status

- Actively developed
- Six openings implemented and live
- Randomized, looping opening trainer complete
- Architecture intentionally simple and extensible

---

## Author

Built and maintained by Luvvydev  
GitHub: https://github.com/Luvvydev

---

## License

MIT
