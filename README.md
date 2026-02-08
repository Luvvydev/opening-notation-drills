# ChessDrills

A focused chess opening training web app built around **recall & repetition**

Live:
- https://chessdrills.net
- https://luvvydev.github.io/opening-notation-drills/#/

Repository:
- opening-notation-drills

---

## What This App Does

ChessDrills trains opening lines through repetition and immediate feedback.


- You play real opening lines
- Moves are checked instantly
- Wrong moves do not reset the board
- Explanations unlock when you fail
- Completed lines loop into a new random line
- Training continues indefinitely


---

## Core Features

### Opening Trainer
- Randomized, curated opening lines
- One idea per line
- SAN move validation via chess.js
- Automatic opponent replies
- Confetti and auto-advance on completion

### Openings
Includes (so far):
- London System
- Sicilian Defense
- Ruy Lopez
- Italian Game
- Caro–Kann
- Fried Liver Attack
- Stafford Gambit
- Queen’s Gambit (Accepted & Declined)
- King’s Indian Defense
- French Defense
- English Opening
- Scotch Game
- Englund Gambit

All opening data lives in plain JavaScript files.

---

## Accounts and Access

### Authentication
- Firebase Email + Password auth
- Anonymous users are restricted

### Access Levels

Anonymous:
- Browse Home
- Blocked from “New” openings
- No gated modes

Free account:
- Access “New” openings
- Learn mode only

Member (Stripe subscription or lifetime):
- Practice mode
- Drill mode
- Leaderboards

Access is enforced in both UI and Firestore rules.

---

## Membership & Payments

- Stripe Checkout for upgrades
- Firebase Cloud Functions handle checkout + webhooks
- Membership state is written server-side into Firestore
- Billing portal is available from the Profile page

Frontend never sets membership state directly.

---

## Tech Stack

Frontend:
- React (Create React App)
- react-router-dom (HashRouter)
- chess.js
- chessboardjsx

Backend:
- Firebase Auth
- Firestore
- Firebase Cloud Functions (Node 20)
- Stripe Checkout + Webhooks

Hosting:
- GitHub Pages
- Custom domain (chessdrills.net)

---

## Local Development

Node versions matter.

Frontend (CRA):

    nvm use 16
    npm start

Firebase / Functions:

    nvm use 22
    firebase deploy

The repo includes a .nvmrc set to Node 16.

---

## Project Philosophy

Most chess tools are built around reading and clicking through lines. They hide mistakes and don’t really force you to think.

ChessDrills is the opposite. You have to choose moves yourself, mistakes are expected, and the same ideas come back again and again until they stick.

---

## License

MIT
