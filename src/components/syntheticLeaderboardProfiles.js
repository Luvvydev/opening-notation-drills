const SYNTHETIC_LEADERBOARD_PLAYERS = [
  { username: "remylebeau", displayName: "RemyLeBeau", rank: 1, score: 16707 },
  { username: "carokam", displayName: "Carokam", rank: 2, score: 10537 },
  { username: "ravenglass", displayName: "Ravenglass", rank: 3, score: 6091 },
  { username: "player5539", displayName: "player5539", rank: 4, score: 6000 },
  { username: "blunderstorm", displayName: "blunderstorm", rank: 5, score: 5909 },
  { username: "happyidiot", displayName: "Happyidiot", rank: 6, score: 5653 },
  { username: "rojo", displayName: "ROJO", rank: 7, score: 5509 },
  { username: "blunderthunder", displayName: "BlunderThunder", rank: 8, score: 5421 },
  { username: "player6854", displayName: "player6854", rank: 12357, score: 40 }
];

function normalizeSyntheticUsername(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
}

function clampScore(score) {
  return Math.max(0, Number(score) || 0);
}

function makeActivityDays(score, rank) {
  const safeScore = clampScore(score);
  const safeRank = Math.max(1, Number(rank) || 1);
  const days = {};
  const today = new Date();
  const activeDays = Math.min(80, Math.max(18, Math.round(safeScore / 180)));

  for (let i = 0; i < activeDays; i += 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i * 3);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const key = `${y}-${m}-${day}`;
    days[key] = Math.max(1, Math.min(8, ((safeRank + i) % 5) + Math.ceil(safeScore / 6000)));
  }

  return days;
}

function buildSyntheticProfile(player) {
  const score = clampScore(player.score);
  const learned = Math.max(12, Math.round(score / 95));
  const completions = Math.max(learned, Math.round(score / 22));
  const cleanRuns = Math.max(3, Math.round(completions * 0.42));
  const openingsTrained = Math.max(4, Math.min(18, Math.round(score / 1100)));
  const bestStreak = Math.max(10, Math.round(score / 180));
  const currentStreak = Math.max(4, Math.round(bestStreak * 0.58));

  return {
    uid: `synthetic-leaderboard-${player.username}`,
    username: player.username,
    displayName: player.displayName,
    publicBadge: "Leaderboard player",
    isSyntheticLeaderboardProfile: true,
    syntheticLeaderboard: {
      allRank: player.rank,
      allScore: score
    },
    publicStats: {
      openingsTrained,
      linesLearned: learned,
      totalCompletions: completions,
      cleanRuns,
      streakBest: bestStreak,
      streakCurrent: currentStreak
    },
    activityDays: makeActivityDays(score, player.rank),
    settings: {}
  };
}

export const SYNTHETIC_LEADERBOARD_PROFILES = SYNTHETIC_LEADERBOARD_PLAYERS.map((player) => ({
  ...player,
  profile: buildSyntheticProfile(player)
}));

export function getSyntheticLeaderboardProfile(username) {
  const un = normalizeSyntheticUsername(username);
  const row = SYNTHETIC_LEADERBOARD_PROFILES.find((player) => player.username === un);
  return row ? row.profile : null;
}
