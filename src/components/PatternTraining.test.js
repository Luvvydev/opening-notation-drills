import React from "react";
import { act, fireEvent, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PatternTraining from "./PatternTraining";

let mockBoard;
jest.mock("chessboardjsx", () => (props) => { mockBoard = props; return <div>Pattern board</div>; });
jest.mock("./EvaluationBar", () => ({
  LiveEvaluationBar: ({ orientation }) => <div role="progressbar" aria-label="White position evaluation" data-orientation={orientation} />
}));
jest.mock("../data/patternPuzzles", () => ({
  500: [["fixture", "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", "e2e4 e7e5 g1f3 b8c6", 530, ["fork"]]]
}));

beforeEach(() => {
  window.localStorage.clear();
  jest.spyOn(HTMLMediaElement.prototype, "play").mockClear().mockResolvedValue();
  jest.spyOn(HTMLMediaElement.prototype, "pause").mockClear().mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

test("a live pattern session applies the setup and opponent moves, saves clean accuracy, and flips the view", async () => {
  const view = render(<MemoryRouter><PatternTraining uid="player" /></MemoryRouter>);
  fireEvent.click(view.getByRole("button", { name: "Start practice" }));
  expect(view.getByText("Black to move")).toBeTruthy();
  expect(mockBoard.position.split(" ")[1]).toBe("b");
  expect(mockBoard.orientation).toBe("black");
  fireEvent.click(view.getByRole("button", { name: "Flip board" }));
  expect(mockBoard.orientation).toBe("white");
  act(() => mockBoard.onDrop({ sourceSquare: "e7", targetSquare: "e5" }));
  expect(mockBoard.arePiecesDraggable).toBe(false);
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 250)); });
  expect(mockBoard.position.split(" ")[1]).toBe("b");
  expect(mockBoard.arePiecesDraggable).toBe(true);
  act(() => mockBoard.onDrop({ sourceSquare: "b8", targetSquare: "c6" }));
  expect(view.getByText("Correct")).toBeTruthy();
  expect(view.container.querySelector(".training-celebration")).toBeTruthy();
  expect(HTMLMediaElement.prototype.play.mock.instances.map((audio) => audio.getAttribute("src"))).toEqual([
    "/sounds/move-self.mp3", "/sounds/move-opponent.mp3", "/sounds/move-self.mp3"
  ]);
  fireEvent.click(view.getByRole("button", { name: "Next puzzle" }));
  expect(view.getByText("1 of 1 solved on the first try without a hint")).toBeTruthy();
  expect(JSON.parse(window.localStorage.getItem("chessdrills.pattern.player")).days).toBe(1);
});

test("a reveal stays assisted even when the player finishes on a replay", async () => {
  const view = render(<MemoryRouter><PatternTraining uid="player" /></MemoryRouter>);
  fireEvent.click(view.getByRole("button", { name: "Start practice" }));
  fireEvent.click(view.getByRole("button", { name: "Hint" }));
  expect(Object.keys(mockBoard.squareStyles)).toEqual(["e7"]);
  fireEvent.click(view.getByRole("button", { name: "Show answer" }));
  expect(view.getByText("Solution e5 Nf3 Nc6")).toBeTruthy();
  expect(view.container.querySelector(".training-celebration")).toBeNull();
  fireEvent.click(view.getByRole("button", { name: "Try again" }));
  expect(mockBoard.arePiecesDraggable).toBe(true);
  fireEvent.click(view.getByRole("button", { name: "Finish session" }));
  expect(view.getByText("0 of 1 solved on the first try without a hint")).toBeTruthy();
});

test("Stockfish is optional, left of the board, and remembers the choice", () => {
  const view = render(<MemoryRouter><PatternTraining uid="player" /></MemoryRouter>);
  fireEvent.click(view.getByRole("button", { name: "Start practice" }));
  const toggle = view.getByRole("button", { name: "Stockfish bar" });
  expect(view.queryByRole("progressbar", { name: "White position evaluation" })).toBeNull();
  fireEvent.click(toggle);
  const rail = view.getByRole("progressbar", { name: "White position evaluation" });
  expect(rail.nextElementSibling.className).toBe("training-board-frame");
  expect(rail.getAttribute("data-orientation")).toBe("black");
  fireEvent.click(view.getByRole("button", { name: "Flip board" }));
  expect(rail.getAttribute("data-orientation")).toBe("white");
  fireEvent.click(view.getByRole("button", { name: "Finish session" }));
  fireEvent.click(view.getByRole("button", { name: "Start practice" }));
  expect(view.getByRole("button", { name: "Stockfish bar" }).getAttribute("aria-pressed")).toBe("true");
});

test("the captioned guide stays out of the setup until opened", () => {
  const view = render(<MemoryRouter><PatternTraining uid="player" /></MemoryRouter>);
  expect(view.queryByLabelText("How to train pattern recognition")).toBeNull();
  expect(view.queryByText("All training lessons")).toBeNull();
  fireEvent.click(view.getByRole("button", { name: /Why train this/ }));
  const video = view.getByLabelText("How to train pattern recognition");
  expect(video.querySelector("source").src).toContain("pattern-recognition-guide.mp4");
  expect(video.querySelector("track").kind).toBe("captions");
});
