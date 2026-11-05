import React from "react";
import { act, fireEvent, render, waitForElement } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { trainingRequest } from "../training/workspace";
import TrainingPage from "./TrainingPage";
jest.mock("../auth/AuthProvider", () => ({ useAuth: jest.fn() }));
jest.mock("../utils/trackEvent", () => ({ trackEvent: jest.fn() }));
jest.mock("../training/workspace", () => {
  const actual = jest.requireActual("../training/workspace");
  return { ...actual, trainingRequest: jest.fn() };
});
jest.mock("../firebase", () => ({ functions: {} }));
let mockBoard;
jest.mock("chessboardjsx", () => (props) => { mockBoard = props; return <div>Saved board</div>; });
const item = { id: "a".repeat(64), fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  bestMove: "e2e4", theme: "Missed stronger move", attempts: 0, successes: 0, dueAtMs: 1 };
beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
  jest.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(() => Promise.resolve());
  jest.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  trainingRequest.mockReset();
  useAuth.mockReturnValue({ user: { uid: "member" }, userDoc: {}, membershipActive: true });
  trainingRequest.mockImplementation(({ action }) => Promise.resolve(action === "load" ? { reviews: [], items: [item] } : { ok: true }));
});
test("guests see the paid offer while review stays available without signup", () => {
  useAuth.mockReturnValue({ user: null, membershipActive: false });
  const screen = render(<MemoryRouter><TrainingPage /></MemoryRouter>);
  expect(screen.getByRole("heading", { name: "Your training, saved." })).toBeTruthy();
  expect(trainingRequest).not.toHaveBeenCalled();
});
test("a correct saved move records an attempt and updates progress", async () => {
  const screen = render(<MemoryRouter><TrainingPage /></MemoryRouter>);
  await waitForElement(() => screen.getByRole("heading", { name: "White to move" }));
  await act(async () => { mockBoard.onDrop({ sourceSquare: "e2", targetSquare: "e4" }); });
  expect(screen.getByText("Correct")).toBeTruthy();
  expect(trainingRequest.mock.calls.find(([data]) => data.action === "attempt")[0].correct).toBe(true);
  expect(screen.getByText(/Success · 1 attempt/)).toBeTruthy();
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
  await waitForElement(() => screen.getByText("Positions"));
  expect(screen.queryByText("Saved board")).toBeNull();
  expect(screen.getByText(/Your saved training is here/)).toBeTruthy();
});

test("new members see one useful starter panel instead of empty statistics and history", async () => {
  trainingRequest.mockResolvedValue({ reviews: [], items: [] });
  const screen = render(<MemoryRouter><TrainingPage /></MemoryRouter>);
  await waitForElement(() => screen.getByRole("heading", { name: "No saved positions yet" }));
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
  expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("1");
});

test("a clean saved session celebrates once and plays move feedback", async () => {
  const screen = render(<MemoryRouter><TrainingPage /></MemoryRouter>);
  await waitForElement(() => screen.getByText("Show answer"));
  await act(async () => { mockBoard.onDrop({ sourceSquare: "e2", targetSquare: "e4" }); });
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
  expect(screen.container.querySelector(".training-celebration")).toBeTruthy();
  expect(screen.getByText("Session complete · 1 / 1 correct")).toBeTruthy();
});

test("duplicate saves finish the card without inflating success or celebrating", async () => {
  trainingRequest.mockImplementation(({ action }) => Promise.resolve(action === "load" ? { reviews: [], items: [item] } : { duplicate: true }));
  const screen = render(<MemoryRouter><TrainingPage /></MemoryRouter>);
  await waitForElement(() => screen.getByText("Show answer"));
  await act(async () => { mockBoard.onDrop({ sourceSquare: "e2", targetSquare: "e4" }); });
  expect(screen.getByText("Already recorded")).toBeTruthy();
  expect(screen.queryByText(/Success ·/)).toBeNull();
  expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("1");
  expect(screen.container.querySelector(".training-celebration")).toBeNull();
});

test("a failed save retries the same attempt and completes progress only after success", async () => {
  let attempts = 0;
  trainingRequest.mockImplementation(({ action }) => action === "load" ? Promise.resolve({ reviews: [], items: [item] }) : ++attempts === 1 ? Promise.reject(new Error("offline")) : Promise.resolve({ ok: true }));
  const screen = render(<MemoryRouter><TrainingPage /></MemoryRouter>);
  await waitForElement(() => screen.getByText("Show answer"));
  await act(async () => { fireEvent.click(screen.getByText("Show answer")); });
  expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("0");
  await act(async () => { fireEvent.click(screen.getByText("Retry saving attempt")); });
  const requests = trainingRequest.mock.calls.filter(([data]) => data.action === "attempt");
  expect(requests[0][0].attemptId).toBe(requests[1][0].attemptId);
  expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("1");
});


test("black solution arrows use the flipped board coordinates", async () => {
  const blackItem = { ...item, fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1", bestMove: "e7e5" };
  trainingRequest.mockImplementation(({ action }) => Promise.resolve(action === "load" ? { reviews: [], items: [blackItem] } : { ok: true }));
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
    expect(screen.getByText("Session complete · 1 / 1 correct")).toBeTruthy();
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
  trainingRequest.mockImplementation(({ action }) => Promise.resolve(action === "load" ? { reviews: [], items: [pinned] } : { ok: true }));
  const screen = render(<MemoryRouter><TrainingPage /></MemoryRouter>);
  await waitForElement(() => screen.getByText("Show answer"));
  act(() => { mockBoard.onSquareClick("e2"); });
  expect(mockBoard.squareStyles.d2).toBeUndefined();
  expect(mockBoard.squareStyles.f2).toBeUndefined();
  expect(mockBoard.squareStyles.e8.boxShadow).toContain("inset");
});
