# Opening-&-Notation-Chess-Trainer

A focused chess training app built around **opening line practice**, with **notation training as a secondary objective**.

This project is designed to force **active recall**. You are expected to make mistakes, see why they are mistakes, and continue playing. Nothing ends instantly. Learning happens while the position is still on the board.


---

## Core features

### Opening Trainer

The main mode of the application.

- Trains **real opening lines**
- Currently supports:
  - **London System**
  - **Sicilian Defense**
- Dozens of curated lines per opening
- Lines are selected **randomly**
- You always play the side being trained
- Opponent replies automatically

#### Behavior on mistakes


- Playing a wrong move move is marked incorrect (X)
- The board position remains
- Explanations unlock to guide correction
- You re-start position & continue playing the line

The focus is understanding *why* a move is wrong, not punishment.

#### Completion behavior

- When a line is completed:
  - A confetti animation triggers
  - A **new random line** loads automatically
  - Training continues in an infinite loop

This prevents memorizing order and encourages pattern recognition.

---

### Speed Drill

A notation fluency drill available from the Home page.

- Timed move entry
- Wrong moves are marked but not fatal
- Builds comfort with SAN under time pressure
- Clicking Home always cancels the drill cleanly

This mode exists to support opening recall

---

## Design goals

- Dark, consistent UI 
- One shared top navigation
- Short, idea-focused opening lines
- Randomization to prevent rote memorization
- Feedback that favors learning over punishment

---

## Tech stack

- React (Create React App)
- chess.js for rules, legality, and game state
- chessboardjsx for board rendering
- No backend
- No external APIs
- All data stored locally in plain JavaScript files

---

## Project structure

src/
  components/
    Home.js
    Board.js
    OpeningTrainer.js
    Practice.js
    Settings.js
    TopNav.js
    About.js
  openings/
    londonLines.js
    sicilianDefenseLines.js

- OpeningTrainer.js contains all opening logic
- londonLines.js and sicilianDefenseLines.js are pure data
- The opening system supports adding more openings later

---

## Adding or editing opening lines

Open one of the opening data files:

src/openings/londonLines.js  
src/openings/sicilianDefenseLines.js  

Each opening line follows this structure:

{
  id: "unique-id",
  name: "Line title",
  description: "Short description of the idea",
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
- Lines should be focused on a single idea or tactical theme

---

## Environment

### Node version

This project runs on **Node 16 LTS**.

The repository includes a `.nvmrc` file containing:

16

Switch automatically with:

nvm use

No OpenSSL legacy flags are required.

---

## Running locally

npm install  
npm start  

---

## Why this exists

Most opening tools:
- Encourage passive reading
- Overwhelm with long theory trees
- Reward clicking instead of recall

This app is designed to:
- Force active decision-making
- Allow mistakes without stopping learning
- Reinforce ideas through repetition
- Stay small and maintainable

It is closer to drilling tactics than browsing theory.

---

## Status

- Actively developed
- London System and Sicilian Defense both implemented
- Randomized, looping opening trainer in place
- Architecture supports additional openings easily

---

## Author

Built and maintained by **Luvvydev**  
GitHub: https://github.com/Luvvydev

---

## License

MIT
