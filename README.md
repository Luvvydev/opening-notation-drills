# ChessDrills

ChessDrills is a chess opening training web application built around move recall, repeated practice, account based progress tracking, and public competitive surfaces.

Live URLs:
- https://chessdrills.net
- https://luvvydev.github.io/opening-notation-drills/#/

Repository:
- opening-notation-drills

---

## Overview

ChessDrills trains opening lines through repeated move entry inside an interactive board UI.

The project currently includes:
- curated opening courses
- learn, practice, and drill style training flows
- Firebase authentication
- Firestore synced progress
- Stripe membership handling
- public profiles
- leaderboards
- streak and activity tracking
- board and piece customization

Users work through openings by entering moves from memory. Progress is persisted to accounts and reused across profile, leaderboard, and training surfaces.

---

## Core Trainer

The main trainer is centered around structured opening lines stored as JavaScript data.

Current trainer behavior includes:
- SAN move validation through chess.js
- randomized line selection
- automatic opponent replies when a line continues
- move checking during user input
- prevention of illegal moves
- line explanations attached to training data
- retry handling after mistakes
- progress updates tied to completion
- repeated cycling through lines during training sessions

The trainer is used across multiple opening courses and multiple account states.

---

## Training Modes

### Learn Mode

Learn Mode is the baseline guided training flow.

Current Learn Mode behavior includes:
- progress tracking by opening
- saved line completion state
- explanation support during line study
- account synced persistence
- structured repetition through repeated usage

### Practice Mode

Practice Mode is intended for faster repetition and less guided review.

Current Practice Mode behavior includes:
- continuous training flow
- repeated line exposure
- lower interruption during move entry
- member gating

### Drill Mode

Drill Mode is intended for scored performance sessions.

Current Drill Mode behavior includes:
- score tracking
- personal best tracking
- leaderboard integration
- session oriented repetition
- member gating

---

## Opening Library

Opening data is stored in:

    src/openings/

Each opening file contains move sequences and explanation data in a trainer friendly structure.

Current opening coverage includes:
- London System
- Sicilian Defense
- Ruy Lopez
- Fried Liver Attack
- Stafford Gambit
- Caro-Kann
- Queen's Gambit Accepted
- Queen's Gambit Declined
- Italian Game
- King's Indian Defense
- French Defense
- Englund Gambit
- English Opening
- Scotch Game
- Vienna Gambit
- Vienna Gambit Counter
- Bishop's Opening
- Rousseau Gambit
- Petrov Defense
- Danish Gambit

The opening catalog is used for homepage presentation, access rules, descriptions, and course metadata.

---

## Accounts and Authentication

ChessDrills uses Firebase Authentication.

Current account related behavior includes:
- email and password signup
- email and password login
- persistent sessions
- account based progress syncing
- gating tied to account and membership state

Anonymous visitors can browse the site and view public facing pages.

Signed in users can save:
- opening progress
- streak data
- training totals
- settings
- profile data
- activity history

---

## Membership System

Membership handling is connected to Stripe and backend verified account state.

Current architecture includes:
- Stripe Checkout
- Stripe billing portal support
- Firebase Cloud Functions
- Stripe webhooks
- Firestore membership fields consumed by the frontend

Relevant membership fields include:
- membershipActive
- membershipTier
- membershipUpdatedAt

Monthly, yearly, and lifetime related handling exist in the broader project direction and implementation history. Frontend gating reads backend state from Firestore.

---

## Leaderboards

Leaderboards are tied to training performance and public identity features.

Current leaderboard related behavior includes:
- daily scope
- weekly scope
- all time scope
- rank movement indicators
- rival windows near the user's position
- tier badges
- clickable usernames
- links to public profiles

Leaderboard data is stored in Firestore and surfaced through dedicated UI components.

---

## Public Profiles

Users can have public profiles that expose training related information.

Public profile route pattern:

    /#/profile/u/<username>

Current public profile content includes:
- avatar
- username
- tier badge
- drill related statistics
- leaderboard snapshot
- training totals
- lines learned
- activity heatmap

The public profile layout has been revised toward a more compact presentation and supports mobile and desktop use.

---

## Private Profile and User Settings

The private profile area includes user specific settings and account management surfaces.

Current private profile related behavior includes:
- avatar upload
- board theme selection
- piece theme selection
- settings persistence
- training stat display
- streak display
- membership management links

Avatar files are stored through Firebase Storage.

---

## Activity Tracking

Activity is tracked over time and reused in profile level summaries.

Current activity related behavior includes:
- daily activity recording
- streak tracking
- training totals
- GitHub style heatmap rendering
- synced progress history

Implementation note:
heatmap sizing depends on matching values across component constants and CSS rules. PublicProfile.js and ActivityHeatmap.css need coordinated changes when cell or gap values are adjusted.

---

## Data Sync

User data is synchronized between local state and cloud state.

Important utility files include:

    src/utils/cloudSync.js
    src/utils/accountSync.js

Synced categories include:
- learn progress
- drill scores
- settings
- streak data
- activity history
- opening progress
- some custom training state where applicable

This logic supports reuse of progress across sessions and devices.

---

## UI Structure

Important components include:

    src/components/
        Home.js
        TopNav.js
        OpeningTrainer.js
        Practice.js
        Leaderboards.js
        Profile.js
        PublicProfile.js

Supporting project areas include:

    src/openings/
        opening data and catalog definitions

    src/utils/
        sync, storage, scoring, and progress logic

    src/theme/
        board theme definitions

    src/auth/
        auth and route protection logic

Opening availability and some gating rules are driven through catalog level data.

---

## Current Product Shape

The current project state includes:
- homepage course discovery
- structured opening training
- Firebase auth and Firestore persistence
- member gated training modes
- public profiles
- leaderboard identity surfaces
- streak and heatmap tracking
- theme and piece customization
- GitHub Pages deployment
- custom domain routing

The broader product direction remains tied to repeated recall, visible progress, and user retention through ongoing training use.

---

## Tech Stack

Frontend:
- React using Create React App
- react-router-dom
- chess.js
- chessboardjsx
- Firebase client SDK v9

Backend and platform services:
- Firebase Authentication
- Firestore
- Firebase Storage
- Firebase Cloud Functions

Payments:
- Stripe Checkout
- Stripe webhooks
- Stripe billing portal

Hosting:
- GitHub Pages
- custom domain configuration

---

## Local Development

This project uses Node version switching in local workflows.

Typical frontend workflow:

    nvm use 16
    npm start

Production build:

    npm run build

Deployment and Firebase CLI work may use a newer Node version depending on the local setup.

An example deployment workflow used in this project:

    nvm use 22
    firebase deploy

GitHub Pages publishing is done through the project deploy script:

    npm run deploy

The repository includes:

    .nvmrc

---

## Deployment

Primary live site:
- https://chessdrills.net

GitHub Pages deployment:
- https://luvvydev.github.io/opening-notation-drills/#/

The project is deployed through GitHub Pages and connected to a custom domain.

---

## License

MIT