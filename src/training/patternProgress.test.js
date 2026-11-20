import { createPatternQueue, localTrainingDate, updatePatternProgress } from "./patternProgress";

const beginner = { level: 500, passes: 0, days: 0, lastDate: "", scoredDate: "", recent: [] };
const levels = [500, 600, 700];
const good = Object.fromEntries(Array.from({ length: 10 }, (_, index) => ["p" + index, index < 9]));

test("two accurate days unlock the next level without counting extra sessions on the same day", () => {
  const first = updatePatternProgress(beginner, { level: 500, levels, results: good, date: "2026-11-20" });
  const extra = updatePatternProgress(first, { level: 500, levels, results: { extra: true }, date: "2026-11-20" });
  expect(extra).toMatchObject({ level: 500, passes: 1, days: 1 });
  expect(extra.recent).toContain("extra");
  const second = updatePatternProgress(extra, { level: 500, levels, results: good, date: "2026-11-22" });
  expect(second).toMatchObject({ level: 600, passes: 0, days: 2 });
});

test("short sessions count as practice and leave the difficulty in place", () => {
  const progress = updatePatternProgress(beginner, { level: 500, levels, results: { a: true }, date: "2026-11-20" });
  expect(progress).toMatchObject({ level: 500, passes: 0, days: 1 });
  const sameDay = updatePatternProgress(progress, { level: 500, levels, results: good, date: "2026-11-20" });
  expect(sameDay).toMatchObject({ level: 500, passes: 1, days: 1 });
  expect(localTrainingDate(new Date(2026, 10, 5, 1))).toBe("2026-11-05");
});

test("theme selection favors unseen puzzles and retains previously seen puzzles for practice", () => {
  const pack = [["seen", "", "", 500, ["fork"]], ["new", "", "", 500, ["fork"]], ["pin", "", "", 500, ["pin"]]];
  expect(createPatternQueue(pack, "fork", ["seen"]).map(([id]) => id)).toEqual(["new", "seen"]);
});
