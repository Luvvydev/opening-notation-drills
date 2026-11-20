export const PATTERN_THEMES = {
  mixed: "Mixed tactics",
  mateIn1: "Mate in one",
  fork: "Forks",
  pin: "Pins",
  hangingPiece: "Hanging pieces"
};

export function localTrainingDate(date = new Date()) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((value) => String(value).padStart(2, "0")).join("-");
}

export function patternProgress(uid, beginnerLevel) {
  const empty = { level: beginnerLevel, passes: 0, days: 0, lastDate: "", scoredDate: "", recent: [] };
  try {
    const record = JSON.parse(window.localStorage.getItem("chessdrills.pattern." + uid));
    return record && Array.isArray(record.recent) ? { ...empty, ...record } : empty;
  } catch (_) {
    return empty;
  }
}

export function savePatternProgress(uid, progress) {
  try {
    window.localStorage.setItem("chessdrills.pattern." + uid, JSON.stringify(progress));
    return true;
  } catch (_) {
    return false;
  }
}

export function updatePatternProgress(previous, { level, levels, results, date }) {
  const ids = Object.keys(results);
  if (!ids.length) return previous;
  const recent = [...new Set([...ids.reverse(), ...previous.recent])].slice(0, 1200);
  const days = previous.days + (previous.lastDate < date ? 1 : 0);
  const activity = { ...previous, days, lastDate: previous.lastDate < date ? date : previous.lastDate, recent };
  if (ids.length < 10 || previous.scoredDate >= date || previous.lastDate > date) return activity;

  const correct = Object.values(results).filter(Boolean).length;
  const previousPasses = level === previous.level ? previous.passes : 0;
  const passes = correct / ids.length >= .9 ? previousPasses + 1 : 0;
  const nextLevel = levels[levels.indexOf(level) + 1];
  const advance = passes >= 2 && Boolean(nextLevel);
  return { ...activity, level: advance ? nextLevel : level, passes: advance ? 0 : Math.min(2, passes), scoredDate: date };
}

export function createPatternQueue(pack, theme, recent) {
  const seen = new Set(recent);
  const shuffled = pack.filter((puzzle) => theme === "mixed" || puzzle[4].includes(theme));
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
  }
  return [...shuffled.filter(([id]) => !seen.has(id)), ...shuffled.filter(([id]) => seen.has(id))];
}
