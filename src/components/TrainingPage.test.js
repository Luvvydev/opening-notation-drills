import React from "react";
import { act, fireEvent, render, waitForElement } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { loadDueTraining, loadTrainingHistory, TRAINING_POSITIONS_ADDED, trainingRequest } from "../training/workspace";
import { createReviewWorkerHandle, disposeReviewWorkerHandle, sendCommandsToWorker } from "../review/stockfishWorker";
import TrainingPage from "./TrainingPage";
jest.mock("../auth/AuthProvider", () => ({ useAuth: jest.fn() }));
jest.mock("../utils/trackEvent", () => ({ trackEvent: jest.fn() }));
jest.mock("../training/workspace", () => {
  const actual = jest.requireActual("../training/workspace");
  return { ...actual, loadDueTraining: jest.fn(), loadTrainingHistory: jest.fn(), trainingRequest: jest.fn() };
});
jest.mock("../firebase", () => ({ functions: {} }));
jest.mock("../review/stockfishWorker", () => ({
  ...jest.requireActual("../review/stockfishWorker"),
  createReviewWorkerHandle: jest.fn(),
  disposeReviewWorkerHandle: jest.fn(),
  sendCommandsToWorker: jest.fn()
}));
let mockBoard;
jest.mock("chessboardjsx", () => (props) => { mockBoard = props; return <div>Saved board</div>; });
const item = { id: "a".repeat(64), fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  bestMove: "e2e4", theme: "Missed stronger move", attempts: 0, successes: 0, dueAtMs: 1 };
beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
  jest.spyOn(HTMLMediaElement.prototype, "play").mockClear().mockImplementation(() => Promise.resolve());
  jest.spyOn(HTMLMediaElement.prototype, "pause").mockClear().mockImplementation(() => {});
  trainingRequest.mockReset();
  createReviewWorkerHandle.mockResolvedValue({ worker: { postMessage: jest.fn() } });
  sendCommandsToWorker.mockReset().mockResolvedValue(["info depth 12 score cp 120 pv e2e4", "bestmove e2e4"]);
  loadDueTraining.mockReset();
  loadTrainingHistory.mockReset();
  useAuth.mockReturnValue({ user: { uid: "member" }, userDoc: {}, membershipActive: true });
  loadDueTraining.mockResolvedValue([item]);
  loadTrainingHistory.mockResolvedValue([]);
  trainingRequest.mockResolvedValue({ ok: true });
});
test("guests see the paid offer while review stays available without signup", () => {
  useAuth.mockReturnValue({ user: null, membershipActive: false });
  const screen = render(<MemoryRouter><TrainingPage /></MemoryRouter>);
  expect(screen.getByRole("heading", { name: /Make your mistakes/ })).toBeTruthy();
  expect(loadDueTraining).not.toHaveBeenCalled();
  expect(loadTrainingHistory).not.toHaveBeenCalled();
  expect(trainingRequest).not.toHaveBeenCalled();
});
test("a correct saved move records an attempt and updates progress", async () => {
  const screen = render(<MemoryRouter><TrainingPage /></MemoryRouter>);
  await waitForElement(() => screen.getByRole("heading", { name: "White to move" }));
  await act(async () => { mockBoard.onDrop({ sourceSquare: "e2", targetSquare: "e4" }); });
  expect(screen.getByText("Correct")).toBeTruthy();
  expect(trainingRequest.mock.calls.find(([data]) => data.action === "attempt")[0].correct).toBe(true);
  expect(screen.getByRole("progressbar", { name: "Session progress" }).getAttribute("aria-valuenow")).toBe("1");
});
test("revealing a move records a failed attempt", async () => {
  const screen = render(<MemoryRouter><TrainingPage /></MemoryRouter>);
  await waitForElement(() => screen.getByRole("heading", { name: "White to move" }));
  await act(async () => { fireEvent.click(screen.getByText("Show answer")); });
  expect(trainingRequest.mock.calls.find(([data]) => data.action === "attempt")[0].correct).toBe(false);
});
test("expired accounts retain history without enabling saved puzzle writes", async () => {
  useAuth.mockReturnValue({ user: { uid: "expired" }, userDoc: {}, membershipActive: false });
  const screen = render(<MemoryRouter><TrainingPage /></MemoryRouter>);
  const history = screen.getByText("Review history").parentElement;
  expect(loadTrainingHistory).not.toHaveBeenCalled();
  history.open = true;
  fireEvent(history, new Event("toggle"));
  await waitForElement(() => screen.getByText("No saved reviews yet."));
  expect(loadTrainingHistory).toHaveBeenCalledWith("expired");
  expect(loadDueTraining).not.toHaveBeenCalled();
  expect(screen.queryByText("Saved board")).toBeNull();
  expect(screen.getByText(/Saved sessions, opening progress and history/)).toBeTruthy();
});

test("new members see one useful starter panel instead of empty statistics and history", async () => {
  loadDueTraining.mockResolvedValue([]);
  const screen = render(<MemoryRouter><TrainingPage /></MemoryRouter>);
  await waitForElement(() => screen.getByRole("heading", { name: "No puzzles due" }));
  expect(screen.queryByLabelText("Training progress")).toBeNull();
  expect(screen.queryByRole("heading", { name: "Recurring themes" })).toBeNull();
  expect(screen.queryByRole("heading", { name: "Review history" })).toBeNull();
  expect(screen.queryByText(/Stored limits:/)).toBeNull();
  expect(screen.getAllByRole("link", { name: /Review a game/ }).length).toBeGreaterThan(0);
});


test("revealed solutions keep an arrow and remove every reveal action", async () => {
  const screen = render(<MemoryRouter><TrainingPage /></MemoryRouter>);
  await waitForElement(() => screen.getByText("Show answer"));
  await act(async () => { fireEvent.click(screen.getByText("Show answer")); });
  expect(screen.getByRole("img", { name: "Solution move e2e4" })).toBeTruthy();
  expect(screen.queryByText("Show answer")).toBeNull();
  expect(screen.queryByText("Show solution")).toBeNull();
  expect(screen.container.querySelector(".training-celebration")).toBeNull();
  expect(mockBoard.arePiecesDraggable).toBe(false);
});

test("a wrong move can reveal the solution without recording another attempt", async () => {
  const screen = render(<MemoryRouter><TrainingPage /></MemoryRouter>);
  await waitForElement(() => screen.getByText("Show answer"));
  await act(async () => { mockBoard.onDrop({ sourceSquare: "d2", targetSquare: "d4" }); });
  expect(screen.getByRole("img", { name: "Your move d2d4" })).toBeTruthy();
  await act(async () => { fireEvent.click(screen.getByText("Show solution")); });
  expect(screen.getByRole("img", { name: "Solution move e2e4" })).toBeTruthy();
  expect(screen.getByRole("img", { name: "Your move d2d4" })).toBeTruthy();
  expect(screen.queryByText("Show solution")).toBeNull();
  expect(trainingRequest.mock.calls.filter(([data]) => data.action === "attempt")).toHaveLength(1);
});

test("board, pieces, sounds and confetti respect existing preferences", async () => {
  window.localStorage.setItem("notation_trainer_opening_settings_v1", JSON.stringify({ boardTheme: "darkblue", pieceTheme: "alpha", playSounds: false, showConfetti: false }));
  const screen = render(<MemoryRouter><TrainingPage /></MemoryRouter>);
  await waitForElement(() => screen.getByText("Show answer"));
  expect(mockBoard.darkSquareStyle.backgroundColor).toBe("#3a6ea5");
  expect(mockBoard.pieceTheme).toContain("alpha");
  await act(async () => { mockBoard.onDrop({ sourceSquare: "e2", targetSquare: "e4" }); });
  expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  expect(screen.container.querySelector(".training-celebration")).toBeNull();
  expect(screen.getByRole("progressbar", { name: "Session progress" }).getAttribute("aria-valuenow")).toBe("1");
});

test("a clean saved session celebrates once and plays move feedback", async () => {
  const screen = render(<MemoryRouter><TrainingPage /></MemoryRouter>);
  await waitForElement(() => screen.getByText("Show answer"));
  await act(async () => { mockBoard.onDrop({ sourceSquare: "e2", targetSquare: "e4" }); });
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
  expect(screen.container.querySelector(".training-celebration")).toBeTruthy();
  fireEvent.click(screen.getByText("Finish session"));
  expect(screen.getByRole("heading", { name: "Session complete" })).toBeTruthy();
  expect(screen.getByText("1 of 1 correct on the first try")).toBeTruthy();
});

test("duplicate saves finish the card without inflating success or celebrating", async () => {
  trainingRequest.mockResolvedValue({ duplicate: true });
  const screen = render(<MemoryRouter><TrainingPage /></MemoryRouter>);
  await waitForElement(() => screen.getByText("Show answer"));
  await act(async () => { mockBoard.onDrop({ sourceSquare: "e2", targetSquare: "e4" }); });
  expect(screen.getByText("Already recorded")).toBeTruthy();
  expect(screen.queryByText(/Success ·/)).toBeNull();
  expect(screen.getByRole("progressbar", { name: "Session progress" }).getAttribute("aria-valuenow")).toBe("1");
  expect(screen.container.querySelector(".training-celebration")).toBeNull();
});

test("a failed save retries the same attempt and completes progress only after success", async () => {
  let attempts = 0;
  trainingRequest.mockImplementation(() => ++attempts === 1 ? Promise.reject(new Error("offline")) : Promise.resolve({ ok: true }));
  const screen = render(<MemoryRouter><TrainingPage /></MemoryRouter>);
  await waitForElement(() => screen.getByText("Show answer"));
  await act(async () => { fireEvent.click(screen.getByText("Show answer")); });
  expect(screen.getByRole("progressbar", { name: "Session progress" }).getAttribute("aria-valuenow")).toBe("0");
  await act(async () => { fireEvent.click(screen.getByText("Retry saving attempt")); });
  const requests = trainingRequest.mock.calls.filter(([data]) => data.action === "attempt");
  expect(requests[0][0].attemptId).toBe(requests[1][0].attemptId);
  expect(screen.getByRole("progressbar", { name: "Session progress" }).getAttribute("aria-valuenow")).toBe("1");
});


test("black solution arrows use the flipped board coordinates", async () => {
  const blackItem = { ...item, fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1", bestMove: "e7e5" };
  loadDueTraining.mockResolvedValue([blackItem]);
  const screen = render(<MemoryRouter><TrainingPage /></MemoryRouter>);
  await waitForElement(() => screen.getByText("Show answer"));
  await act(async () => { fireEvent.click(screen.getByText("Show answer")); });
  expect(mockBoard.orientation).toBe("black");
  const arrow = screen.getByRole("img", { name: "Solution move e7e5" });
  expect(arrow.querySelector(":scope > path").getAttribute("d")).toBe("M3.5,6.5 L3.5,4.5");
});

test("rapid repeated input submits only one attempt", async () => {
  const screen = render(<MemoryRouter><TrainingPage /></MemoryRouter>);
  await waitForElement(() => screen.getByText("Show answer"));
  const drop = mockBoard.onDrop;
  await act(async () => {
    drop({ sourceSquare: "e2", targetSquare: "e4" });
    drop({ sourceSquare: "e2", targetSquare: "e4" });
  });
  expect(trainingRequest.mock.calls.filter(([data]) => data.action === "attempt")).toHaveLength(1);
});

test("reduced motion suppresses confetti after a clean session", async () => {
  const previous = window.matchMedia;
  window.matchMedia = jest.fn(() => ({ matches: true }));
  try {
    const screen = render(<MemoryRouter><TrainingPage /></MemoryRouter>);
    await waitForElement(() => screen.getByText("Show answer"));
    await act(async () => { mockBoard.onDrop({ sourceSquare: "e2", targetSquare: "e4" }); });
    expect(screen.container.querySelector(".training-celebration")).toBeNull();
    fireEvent.click(screen.getByText("Finish session"));
    expect(screen.getByRole("heading", { name: "Session complete" })).toBeTruthy();
    expect(screen.getByText("1 of 1 correct on the first try")).toBeTruthy();
  } finally { window.matchMedia = previous; }
});


test("piece selection highlights legal destinations and clears them on deselection or completion", async () => {
  const screen = render(<MemoryRouter><TrainingPage /></MemoryRouter>);
  await waitForElement(() => screen.getByText("Show answer"));
  act(() => { mockBoard.onSquareClick("e2"); });
  expect(Object.keys(mockBoard.squareStyles).sort()).toEqual(["e2", "e3", "e4"]);
  expect(mockBoard.squareStyles.e4.boxShadow).toContain("inset");
  act(() => { mockBoard.onSquareClick("e2"); });
  expect(mockBoard.squareStyles).toEqual({});
  act(() => { mockBoard.onSquareClick("g1"); });
  expect(Object.keys(mockBoard.squareStyles).sort()).toEqual(["f3", "g1", "h3"]);
  act(() => { mockBoard.onSquareRightClick(); });
  expect(mockBoard.squareStyles).toEqual({});
  act(() => { mockBoard.onSquareClick("e2"); });
  await act(async () => { mockBoard.onSquareClick("e4"); });
  expect(mockBoard.squareStyles.e3).toBeUndefined();
  expect(mockBoard.arePiecesDraggable).toBe(false);
});

test("legal highlights exclude pinned moves and include captures", async () => {
  const pinned = { ...item, fen: "k3r3/8/8/8/8/8/4R3/4K3 w - - 0 1", bestMove: "e2e8" };
  loadDueTraining.mockResolvedValue([pinned]);
  const screen = render(<MemoryRouter><TrainingPage /></MemoryRouter>);
  await waitForElement(() => screen.getByText("Show answer"));
  act(() => { mockBoard.onSquareClick("e2"); });
  expect(mockBoard.squareStyles.d2).toBeUndefined();
  expect(mockBoard.squareStyles.f2).toBeUndefined();
  expect(mockBoard.squareStyles.e8.boxShadow).toContain("inset");
});

test("the first board loads during account sync and the next puzzle replaces it", async () => {
  useAuth.mockReturnValue({ user: { uid: "member" }, membershipActive: true, syncing: true });
  loadDueTraining.mockResolvedValue([item, { ...item, id: "b".repeat(64), bestMove: "d2d4" }]);
  const screen = render(<MemoryRouter><TrainingPage /></MemoryRouter>);
  await waitForElement(() => screen.getByText("Puzzle 1 of 2"));
  expect(screen.getAllByText("Saved board")).toHaveLength(1);
  expect(loadTrainingHistory).not.toHaveBeenCalled();
  expect(loadDueTraining).toHaveBeenCalledTimes(1);

  await act(async () => { mockBoard.onDrop({ sourceSquare: "e2", targetSquare: "e4" }); });
  fireEvent.click(screen.getByText("Next puzzle"));
  expect(screen.getByText("Puzzle 2 of 2")).toBeTruthy();
  expect(screen.getAllByText("Saved board")).toHaveLength(1);
  expect(mockBoard.position).toBe(item.fen);
  expect(mockBoard.arePiecesDraggable).toBe(true);
  expect(loadDueTraining).toHaveBeenCalledTimes(1);
});

test.each(["wrong move", "reveal", "wrong move followed by the solution"])("a %s can be replayed without changing the saved result", async (action) => {
  let finishSave;
  trainingRequest.mockImplementation(() => new Promise((resolve) => { finishSave = resolve; }));
  const screen = render(<MemoryRouter><TrainingPage /></MemoryRouter>);
  await waitForElement(() => screen.getByText("Show answer"));
  if (action === "reveal") fireEvent.click(screen.getByText("Show answer"));
  else {
    act(() => { mockBoard.onDrop({ sourceSquare: "d2", targetSquare: "d4" }); });
    if (action !== "wrong move") fireEvent.click(screen.getByText("Show solution"));
  }

  expect(mockBoard.position).not.toBe(item.fen);
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(mockBoard.position).toBe(item.fen);
  expect(mockBoard.squareStyles).toEqual({});
  expect(mockBoard.arePiecesDraggable).toBe(true);
  expect(screen.queryByRole("img", { name: /Your move|Solution move/ })).toBeNull();
  expect(screen.queryByText(/Best move/)).toBeNull();
  act(() => { mockBoard.onSquareClick("e2"); });
  act(() => { mockBoard.onSquareClick("e4"); });

  expect(screen.getByText("Correct")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Finish session" })).toBeNull();
  expect(trainingRequest).toHaveBeenCalledTimes(1);
  expect(trainingRequest.mock.calls[0][0].correct).toBe(false);
  await act(async () => { finishSave({ ok: true }); });
  fireEvent.click(screen.getByRole("button", { name: "Finish session" }));
  expect(screen.getByText("0 of 1 correct on the first try")).toBeTruthy();
  expect(screen.container.querySelector(".training-celebration")).toBeNull();
});


test("an empty session refreshes when this account adds positions and keeps any active board", async () => {
  loadDueTraining.mockResolvedValueOnce([]);
  const screen = render(<MemoryRouter><TrainingPage /></MemoryRouter>);
  await waitForElement(() => screen.getByText("No puzzles due"));
  const notify = (uid) => act(() => {
    window.dispatchEvent(new CustomEvent(TRAINING_POSITIONS_ADDED, { detail: uid }));
  });
  notify("another-account");
  expect(loadDueTraining).toHaveBeenCalledTimes(1);
  notify("member");
  await waitForElement(() => screen.getByText("Puzzle 1 of 1"));
  act(() => { mockBoard.onSquareClick("e2"); });
  notify("member");
  expect(loadDueTraining).toHaveBeenCalledTimes(2);
  expect(mockBoard.squareStyles.e4).toBeTruthy();
});

test("hint highlights only the starting square and does not submit an attempt", async () => {
  const screen = render(<MemoryRouter><TrainingPage /></MemoryRouter>);
  const hint = await waitForElement(() => screen.getByRole("button", { name: "Hint" }));
  fireEvent.click(hint);
  expect(hint.getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByText("Try the piece on e2.")).toBeTruthy();
  expect(Object.keys(mockBoard.squareStyles)).toEqual(["e2"]);
  expect(mockBoard.position).toBe(item.fen);
  expect(mockBoard.arePiecesDraggable).toBe(true);
  expect(trainingRequest).not.toHaveBeenCalled();

  fireEvent.click(hint);
  expect(mockBoard.squareStyles).toEqual({});
  fireEvent.click(hint);
  await act(async () => { mockBoard.onDrop({ sourceSquare: "d2", targetSquare: "d4" }); });
  const retryHint = screen.getByRole("button", { name: "Hint" });
  expect(retryHint.getAttribute("aria-pressed")).toBe("false");
  fireEvent.click(retryHint);
  expect(mockBoard.position).toBe(item.fen);
  expect(Object.keys(mockBoard.squareStyles)).toEqual(["e2"]);
  expect(screen.queryByRole("img", { name: "Your move d2d4" })).toBeNull();
  expect(trainingRequest).toHaveBeenCalledTimes(1);

  await act(async () => { mockBoard.onDrop({ sourceSquare: "d2", targetSquare: "d4" }); });
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(screen.getByRole("button", { name: "Hint" }).getAttribute("aria-pressed")).toBe("false");
  expect(mockBoard.squareStyles).toEqual({});
});

test("the left evaluation bar updates on a move and uses the board orientation", async () => {
  const blackItem = { ...item, fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1", bestMove: "e7e5" };
  loadDueTraining.mockResolvedValue([blackItem]);
  sendCommandsToWorker.mockResolvedValueOnce(["info depth 12 score cp 120 pv e7e5", "bestmove e7e5"]);
  const screen = render(<MemoryRouter><TrainingPage /></MemoryRouter>);
  const bar = await waitForElement(() => screen.getByRole("progressbar", { name: "White position evaluation" }));
  expect(bar.classList.contains("is-flipped")).toBe(true);
  expect(bar.nextElementSibling.className).toBe("training-board-frame");
  expect(mockBoard.arePiecesDraggable).toBe(true);
  await waitForElement(() => screen.getByText("-1.2"));

  await act(async () => { mockBoard.onDrop({ sourceSquare: "e7", targetSquare: "e5" }); });
  await waitForElement(() => screen.getByText("+1.2"));
  expect(sendCommandsToWorker.mock.calls[1][1][0]).toBe("position fen " + mockBoard.position);
  expect(createReviewWorkerHandle).toHaveBeenCalledTimes(1);
  screen.unmount();
  expect(disposeReviewWorkerHandle).toHaveBeenCalledWith(expect.objectContaining({ worker: expect.any(Object) }));
});
