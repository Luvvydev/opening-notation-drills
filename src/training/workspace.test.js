import { dueTrainingItems, summarizeTraining, weakOpeningLines, buildSavedReview } from "./workspace";
jest.mock("../firebase", () => ({ functions: {} }));
test("due queue prioritizes failed positions and excludes future positions", () => {
  expect(dueTrainingItems([{ id: "a", dueAtMs: 2 }, { id: "b", dueAtMs: 1, lastCorrect: false }, { id: "c", dueAtMs: 20 }], 10).map((item) => item.id)).toEqual(["b", "a"]);
});
test("theme counts use games containing a theme, not repeated positions", () => {
  const result = summarizeTraining([{ themes: ["Capture", "Capture"] }, { themes: ["Capture"] }], [{ attempts: 3, successes: 2 }]);
  expect(result.themes).toEqual([["Capture", 2]]);
  expect(result.attempts).toBe(3);
});
test("opening plan selects practiced lines with recorded mistakes", () => {
  const catalog = [{ key: "london", title: "London", lines: [{ id: "a" }, { id: "b" }] }];
  expect(weakOpeningLines(catalog, { lines: { london: { a: { timesSeen: 1, timesFailed: 2 } } } })[0].lineId).toBe("a");
});
test("saved review has bounded positions and retains side and analysis settings", () => {
  const result = buildSavedReview({ moves: [{ uci: "e2e4" }], orientation: "black" }, [], 12, 3);
  expect(result.orientation).toBe("black");
  expect(result.gameKey).toBe("e2e4");
  expect(result.items).toEqual([]);
});
