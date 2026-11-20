import { dueTrainingItems, loadDueTraining, summarizeTraining, weakOpeningLines, buildSavedReview } from "./workspace";
import { getDocsFromServer, where } from "firebase/firestore";

jest.mock("../firebase", () => ({ db: {}, functions: {} }));
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  where: jest.fn(),
  orderBy: (...args) => args,
  limit: (count) => count,
  query: (...args) => args,
  getDocsFromServer: jest.fn()
}));
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


test.each([
  ["mixes recent new positions with older due ones without exceeding five", ["old1", "new2", "old2", "new1", "old3"]],
  ["fills with older due positions when recent results overlap", ["old1", "old3", "old2", "old4", "old5"]]
])("%s", async (_, expected) => {
  const makeSnapshot = (docs) => ({ docs: docs.map(([id, attempts]) => ({ id, data: () => ({ attempts }) })) });
  getDocsFromServer.mockClear();
  getDocsFromServer.mockResolvedValueOnce(makeSnapshot([["old1", 2], ["old2", 1], ["old3", 0], ["old4", 0], ["old5", 0]]));
  getDocsFromServer.mockResolvedValueOnce(makeSnapshot(expected.includes("new1")
    ? [["recentlyAttempted", 1], ["new2", 0], ["new1", 0]]
    : [["old2", 1], ["old3", 0], ["old1", 2]]));
  expect((await loadDueTraining("uid", 123)).map((item) => item.id)).toEqual(expected);
  expect(where).toHaveBeenCalledWith("dueAtMs", "<=", 123);
  expect(getDocsFromServer.mock.calls.map(([request]) => request.slice(2))).toEqual([
    [["dueAtMs"], 5], [["dueAtMs", "desc"], 5]
  ]);
});
