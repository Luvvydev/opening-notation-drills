# ChessDrills

A competitive chess opening training platform built around **recall, repetition, and measurable progress.**

Live:
- https://chessdrills.net
- https://luvvydev.github.io/opening-notation-drills/#/

Repository:
- opening-notation-drills

---

## Overview

ChessDrills is a structured opening training system focused on **active recall instead of passive memorization.**

Users train real opening lines, track improvement over time, and compare results against other players through leaderboards and public profiles.

The system is designed around:

- Immediate feedback
- Repetition-based learning
- Progress tracking
- Competitive motivation
- Clean mobile + desktop UI


---

## Core Training System

### Opening Trainer

The Opening Trainer is the core of ChessDrills.

Features:

- Randomized curated lines
- SAN move validation using chess.js
- Automatic opponent replies
- Illegal move prevention
- Instant feedback
- Explanation unlock on mistakes
- Confetti reward on completion
- Automatic random line continuation
- Infinite training loop

Training never "ends". Lines rotate continuously to reinforce recall.


---

## Training Modes

### Learn Mode

Available to free accounts.

Designed for structured improvement.

Features:

- Tracks learned lines
- Progress stored in Firestore
- Explanation support
- Guided progression
- Confetti completion feedback

Learn mode measures actual line mastery.


### Practice Mode

Member-only feature.

Designed for repetition and consistency.

Features:

- Continuous random lines
- No progression gating
- Fast recall training
- High volume repetition


### Drill Mode

Member-only feature.

Designed for competitive scoring.

Features:

- Score tracking
- High score records
- Session performance measurement
- Leaderboard integration


---

## Openings

Openings are stored as structured JavaScript data.

Each line focuses on a single idea.

Current openings include:

- London System
- Sicilian Defense
- Ruy Lopez
- Italian Game
- Caro-Kann
- Fried Liver Attack
- Stafford Gambit
- Queen’s Gambit Accepted
- Queen’s Gambit Declined
- King's Indian Defense
- French Defense
- English Opening
- Scotch Game
- Englund Gambit

Opening data lives in:

    src/openings/

Lines are plain JavaScript objects with moves and explanations.


---

## Leaderboards

Competitive leaderboards track Drill Mode performance.

Leaderboards support:

- Daily rankings
- Weekly rankings
- All-time rankings

Features:

- Rival windows near player rank
- Rank movement indicators
- Tier badges
- Clickable usernames
- Public profile linking

Leaderboard data is stored in Firestore.


---

## Public Profiles

Each user has a public profile.

Accessible via:

    /#/profile/u/<username>

Profiles display:

- Avatar
- Tier badge
- Drill strength statistics
- Leaderboard snapshot
- Training totals
- Lines learned
- Activity heatmap

Profiles are optimized for both desktop and mobile.


---

## Activity Tracking

User training activity is tracked automatically.

Features:

- Daily activity tracking
- GitHub-style heatmap
- Auto-scroll to current date
- Streak tracking
- Training totals

Activity is synced through Firestore.


---

## Accounts

### Authentication

Firebase Authentication:

- Email + Password login
- Persistent sessions
- User profile storage


### Account Types

Anonymous:

- Browse Home
- Limited access
- No progress saved

Free Account:

- Learn Mode
- New openings
- Progress tracking
- Public profile

Member:

- Practice Mode
- Drill Mode
- Leaderboards
- Competitive tracking


Access is enforced in:

- UI components
- Protected routes
- Firestore rules


---

## Membership System

Membership upgrades are handled through Stripe.

Architecture:

- Stripe Checkout sessions
- Firebase Cloud Functions
- Stripe webhooks update Firestore
- Frontend reads Firestore state

Membership fields:

- membershipActive
- membershipTier
- membershipUpdatedAt

Frontend never sets membership status directly.


---

## Profiles

Private Profile page includes:

- Settings
- Avatar upload
- Board theme selection
- Piece theme selection
- Training stats
- Streak tracking
- Membership management
- Billing portal access


Avatar storage:

    Firebase Storage

Public read, owner write.


---

## Data Sync

User data is synchronized between local storage and Firestore.

Key systems:

    src/utils/cloudSync.js
    src/utils/accountSync.js

Synced data includes:

- Learn progress
- Drill scores
- Settings
- Streaks
- Activity history


---

## Tech Stack

Frontend:

- React (Create React App)
- react-router-dom
- chess.js
- chessboardjsx

Backend:

- Firebase Authentication
- Firestore
- Firebase Storage
- Firebase Cloud Functions

Payments:

- Stripe Checkout
- Stripe Webhooks

Hosting:

- GitHub Pages
- Custom domain

---

## Project Structure

Key folders:

    src/components/
        OpeningTrainer.js
        Practice.js
        Leaderboards.js
        Profile.js
        PublicProfile.js

    src/openings/
        Opening line data

    src/utils/
        Sync and stats logic

    src/theme/
        Board theme definitions

    src/auth/
        AuthProvider
        ProtectedRoute

---

## Local Development

Node versions matter.

Frontend:

    nvm use 16
    npm start

Production Build:

    npm run build


Firebase:

    nvm use 22
    firebase deploy


The repository includes:

    .nvmrc -> Node 16

---

## Design Goals

ChessDrills is designed around:

- Active recall over passive reading
- Repetition over browsing
- Measurable progress
- Competitive motivation
- Mobile-first usability

Most chess training tools focus on content.

ChessDrills focuses on **performance.**

---

## License

MIT