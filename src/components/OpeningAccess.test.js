import { OpeningTrainer } from "./OpeningTrainer";
import { OPENING_SETS } from "../openings/openingCatalog";
jest.mock("../firebase", () => ({ db: {} }));
jest.mock("../utils/trackEvent", () => ({ trackEvent: jest.fn() }));
function trainer(opening, member = false) {
  const history = { replace: jest.fn() };
  const instance = new OpeningTrainer({ location: { search: "?opening=" + opening }, history,
    membershipActive: member, isMember: member, user: member ? { uid: "member" } : null });
  instance.setState = (change, done) => {
    instance.state = { ...instance.state, ...(typeof change === "function" ? change(instance.state) : change) };
    if (done) done();
  };
  instance.resetLine = jest.fn();
  return instance;
}
beforeEach(() => localStorage.clear());
test("an old completion counter cannot block free Learn or any catalog opening", () => {
  localStorage.setItem("chessdrills_free_drills_v1", JSON.stringify({ london: 99 }));
  const value = trainer("london");
  expect(value.enforceLearnGate()).toBe(false);
  Object.keys(OPENING_SETS).forEach((key) => expect(value.isOpeningLocked(key)).toBe(false));
  expect(value.props.history.replace).not.toHaveBeenCalled();
});
test.each(["london", "sicilian"])("%s samples remain the same five lines on repeated practice", (opening) => {
  const value = trainer(opening);
  value.setGameMode("practice");
  const allowed = value.getLines().map((line) => line.id);
  expect(allowed.length).toBe(5);
  for (let i = 0; i < 20; i += 1) {
    value.startPracticeLine({ reason: "next_button" });
    expect(allowed).toContain(value.state.lineId);
  }
  value.setGameMode("drill");
  expect(value.getLines().map((line) => line.id)).toEqual(allowed);
  expect(allowed).toContain(value.state.lineId);
});
test("other courses keep free Learn and show a dismissible paid-mode gate", () => {
  const value = trainer("english");
  expect(value.getLines().length).toBeGreaterThan(0);
  value.setGameMode("practice");
  expect(value.state.gameMode).toBe("learn");
  expect(value.state.memberGateOpen).toBe(true);
  expect(value.props.history.replace).not.toHaveBeenCalled();
});
test("Premium and trial effective access gets every line", () => {
  const value = trainer("london", true);
  value.setGameMode("practice");
  expect(value.getLines().length).toBe(OPENING_SETS.london.lines.length);
});
