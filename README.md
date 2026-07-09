# ChessDrills

ChessDrills is a browser based chess training app focused on opening recall, mistake driven review, and account synced progress.

Primary live site:
- https://chessdrills.net


## What is in the project


The app includes:
- structured opening training with Learn, Practice, Drill, and Puzzles modes
- immediate move validation and feedback on the board
- opening specific puzzle packs generated from external puzzle data
- game review that imports recent games or pasted PGN and turns mistakes into training positions
- synced accounts, streaks, activity history, profiles, and leaderboard data
- installable web app support

The core idea is still active recall. You make moves from memory, get corrected immediately, and repeat until the position sticks.

## Routes

The React app mounts these main routes:

- `/`
- `/openings`
- `/practice`
- `/about`
- `/leaderboards`
- `/install`
- `/login`
- `/signup`
- `/profile`
- `/profile/u/:username`
- `/u/:username`
- `/review`
- `/my-games`
- `/discord`

The app uses `BrowserRouter` with SPA fallback files in `public/index.html` and `public/404.html` so clean URLs work on the custom domain and on GitHub Pages style hosting.

## Opening trainer

The main trainer lives in:

```text
src/components/OpeningTrainer.js
```

Trainer behavior includes:
- SAN move validation with `chess.js`
- automatic opponent replies when a line continues
- illegal move prevention
- coach text and inline square or piece highlights
- board theme, piece theme, coach theme, sound, and confetti settings
- optional transposition handling with a visible transposition notice
- copy and export helpers for SAN, PGN, and FEN
- shareable reps
- custom reps stored alongside the built in catalog
- prestige reset flow for fully completed opening courses

### Modes

**Learn**
- guided line study with explanations
- saved completion state
- free users can use Learn, but non members are capped before the trial or membership gate appears

**Practice**
- faster repetition
- premium gated

**Drill**
- scored repetition
- premium gated
- feeds leaderboard data

**Puzzles**
- opening specific tactical or recall puzzles
- uses generated puzzle packs in `src/data/generatedOpeningPuzzles.js`

## Opening catalog

Opening data lives in:

```text
src/openings/
```

The catalog contains 25 openings.

Free openings:
- London
- Sicilian Defense
- Ruy Lopez
- Fried Liver Attack
- Stafford Gambit
- Caro-Kann Defense
- Queen’s Gambit Accepted
- Queen’s Gambit Declined
- Italian Game
- King's Indian Defense
- French Defense
- Englund Gambit

Signup required openings:
- English Opening
- Scotch Game
- Vienna Gambit
- Vienna Gambit Counter
- Rousseau Gambit
- Bishop's Opening
- Vienna Game
- King's Gambit
- Danish Gambit
- Scandinavian Defense
- Van't Kruijs
- Punishing Bad Openings
- Petrov Defense

Catalog metadata also controls:
- descriptions shown on the homepage
- board orientation and player color
- access rules
- badges such as `New`
- SEO text for selected openings

## Game review and personal mistake packs

Game review lives in:

```text
src/components/GameReview.js
public/engines/
```

 Review flow supports:
- importing recent games from Chess.com
- importing recent games from Lichess
- pasting raw PGN directly
- local engine analysis through a Stockfish worker
- move by move review with best move comparisons
- single game mistake training
- personal mistake packs built across multiple recent games
- pack filters for side, speed, and batch size
- puzzle style replay with hints, solution reveal, and auto advance

The public engine assets currently include a Stockfish worker plus Stockfish 17 lite wasm files.

## Accounts, sync, and identity

Auth and account state are centered around Firebase.

Account behavior includes:
- email and password signup
- email and password login
- persistent sessions
- sync from local progress into cloud state after sign in
- public username claiming
- public profile documents
- private profile settings
- synced activity history and streak tracking

Important files:

```text
src/auth/AuthProvider.js
src/utils/accountSync.js
src/utils/cloudSync.js
src/firebase.js
firestore.rules
```

The profile system supports:
- avatar upload with client side resize into a stored data URL
- public profile pages at `/profile/u/:username` and `/u/:username`
- board, piece, and coach themes
- activity heatmap
- streak display
- membership status display

## Membership and gating

The frontend recognizes:
- free users
- a 3 day free trial
- paid member state
- lifetime member state

Gating behavior in the app:
- some openings require signup
- Practice and Drill are premium gated
- Learn stays available for non members but is capped
- billing portal access is wired through a callable Firebase Function from the profile page

Relevant membership state is read from the user document in Firestore.

## Leaderboards

Leaderboard UI currently lives in:

```text
src/components/Leaderboards.js
```

Behavior is drill focused and centered on identity and rank display.

The live screen currently exposes:
- all time drill ranking
- rival window around the current user
- tier labels based on score
- links to public profiles


## Installable web app

Install flow lives in:

```text
src/components/InstallAppPage.js
src/utils/pwaInstall.js
public/manifest.json
```

Current install support includes:
- install page at `/install`
- browser prompt handling where supported
- separate iPhone and Android instructions
- standalone manifest configuration

## Tech stack

Frontend:
- React 16 with Create React App
- `react-router-dom` v5
- `chess.js`
- `chessboardjsx`
- Firebase client SDK v9

Build and deploy:
- `gh-pages`
- custom domain at `https://chessdrills.net`
- Firebase config for Firestore rules and Functions

Config files worth knowing about:

```text
package.json
firebase.json
firestore.rules
public/index.html
public/404.html
public/sitemap.xml
public/robots.txt
```

## Environment variables

Firebase client config is read from:

- `REACT_APP_FIREBASE_API_KEY`
- `REACT_APP_FIREBASE_AUTH_DOMAIN`
- `REACT_APP_FIREBASE_PROJECT_ID`
- `REACT_APP_FIREBASE_APP_ID`

## Local development

Typical frontend workflow:

```bash
nvm use 16
npm install
npm start
```

Production build:

```bash
npm run build
```

GitHub Pages deploy script:

```bash
npm run deploy
```

Firebase project deploy work, such as rules or functions, is configured through `firebase.json` and is separate from the static site deploy.

## Project structure

```text
src/
  auth/
  components/
  data/
  openings/
  scripts/
  theme/
  utils/
public/
  coaches/
  engines/
  sounds/
```

High signal files and folders:

- `src/components/OpeningTrainer.js`
- `src/components/GameReview.js`
- `src/components/Profile.js`
- `src/components/PublicProfile.js`
- `src/components/Leaderboards.js`
- `src/openings/openingCatalog.js`
- `src/data/generatedOpeningPuzzles.js`
- `src/scripts/build_opening_puzzle_packs.py`


## License

MIT
