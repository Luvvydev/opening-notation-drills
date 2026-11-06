import React from "react";
import { render, cleanup } from "@testing-library/react";
import App from "./App";
jest.mock("./firebase", () => ({ db: {}, functions: {}, auth: {} }));
jest.mock("./auth/AuthProvider", () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({ user: null, authLoading: false, userDocLoading: false })
}));
jest.mock("./utils/cloudSync", () => ({ installCloudSync: () => () => {} }));
jest.mock("./utils/trackEvent", () => ({
  trackFirstVisit: jest.fn(), trackDay2Return: jest.fn(), trackMembershipMilestones: jest.fn()
}));
jest.mock("./components/Practice", () => () => null);
jest.mock("./components/StreakModal", () => () => null);
jest.mock("./components/TopNav", () => () => null);
jest.mock("./components/LandingPage", () => () => <h1>Opening landing</h1>);
jest.mock("./components/TrainingPage", () => () => <h1>Daily training page</h1>);
jest.mock("./components/GameReview", () => () => <h1>Free review workspace</h1>);
beforeEach(() => { window.matchMedia = () => ({ matches: false, addListener: jest.fn(), removeListener: jest.fn() }); });
afterEach(cleanup);
test.each([["/my-games", "Free review workspace"], ["/review", "Free review workspace"], ["/training", "Daily training page"]])("anonymous route %s stays available", async (path, heading) => {
  window.history.replaceState({}, "", path);
  const screen = render(<App />);
  expect(await screen.findByRole("heading", { name: heading })).toBeTruthy();
  expect(window.location.pathname).toBe(path);
});
