import { httpsCallable } from "firebase/functions";
import { collection, getDocsFromServer, limit, orderBy, query, where } from "firebase/firestore";
import { db, functions } from "../firebase";

export const TRAINING_POSITIONS_ADDED = "chessdrills:training-positions-added";

export async function trainingRequest(data) {
  const result = await httpsCallable(functions, "trainingWorkspace")(data);
  return result.data;
}

export async function loadDueTraining(uid, now = Date.now()) {
  const items = collection(db, "users", uid, "trainingItems");
  const due = where("dueAtMs", "<=", now);
  const [oldestSnapshot, newestSnapshot] = await Promise.all([
    getDocsFromServer(query(items, due, orderBy("dueAtMs"), limit(5))),
    getDocsFromServer(query(items, due, orderBy("dueAtMs", "desc"), limit(5)))
  ]);
  const oldest = oldestSnapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
  const newest = newestSnapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }))
    .filter((item) => !Number(item.attempts)).slice(0, 2);
  const mixed = [oldest[0], newest[0], oldest[1], newest[1], ...oldest.slice(2)].filter(Boolean);
  return Array.from(new Map(mixed.map((item) => [item.id, item])).values()).slice(0, 5);
}

export async function loadTrainingHistory(uid) {
  const reviews = collection(db, "users", uid, "reviewSummaries");
  const snapshot = await getDocsFromServer(query(reviews, orderBy("analyzedAtMs", "desc"), limit(200)));
  return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
}

export function buildSavedReview(game, puzzles, depth, multiPv, itemLimit = 12) {
  const headers = game.headers || {};
  return {
    gameKey: game.moves.map((move) => move.uci).join(" "),
    startFen: game.positions && game.positions[0] ? game.positions[0].fen : "",
    orientation: game.orientation || "white", depth, multiPv,
    label: (headers.White || "White") + " vs " + (headers.Black || "Black"),
    opening: game.match ? game.match.title || game.match.name || "" : "",
    puzzleCount: puzzles.length,
    items: puzzles.slice(0, itemLimit).map((puzzle) => ({
      fen: puzzle.beforeFen, bestMove: puzzle.bestMove,
      severity: puzzle.classification, opening: puzzle.openingTitle || "",
      theme: puzzle.isCapture ? "Missed capture" : puzzle.isForcingBest ? "Forcing move" : "Missed stronger move"
    }))
  };
}

export function dueTrainingItems(items, now = Date.now()) {
  return items.filter((item) => (Number(item.dueAtMs) || 0) <= now)
    .sort((a, b) => (a.lastCorrect === false ? 0 : 1) - (b.lastCorrect === false ? 0 : 1)
      || (Number(a.dueAtMs) || 0) - (Number(b.dueAtMs) || 0) || a.id.localeCompare(b.id))
    .slice(0, 5);
}

export function summarizeTraining(reviews, items) {
  const counts = {};
  reviews.forEach((review) => new Set(review.themes || []).forEach((theme) => { counts[theme] = (counts[theme] || 0) + 1; }));
  return { themes: Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4),
    attempts: items.reduce((sum, item) => sum + (Number(item.attempts) || 0), 0),
    successes: items.reduce((sum, item) => sum + (Number(item.successes) || 0), 0) };
}

export function weakOpeningLines(catalog, progress) {
  const choices = [];
  catalog.forEach((opening) => {
    const stats = (progress.lines && progress.lines[opening.key]) || {};
    opening.lines.forEach((line) => {
      const value = stats[line.id];
      if (!value || !value.timesSeen) return;
      choices.push({ opening: opening.key, title: opening.title, lineId: line.id,
        failures: Number(value.timesFailed) || 0, clean: Number(value.timesClean) || 0 });
    });
  });
  return choices.sort((a, b) => b.failures - a.failures || a.clean - b.clean || a.lineId.localeCompare(b.lineId)).slice(0, 2);
}
