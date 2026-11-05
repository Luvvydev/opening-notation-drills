import { ACCOUNT_OWNER_KEY, prepareLocalAccount, releaseLocalAccount } from "./accountStorage";
const key = "notation_trainer_opening_progress_v2";
beforeEach(() => localStorage.clear());
test("guest progress is adopted once and another account cannot inherit it", () => {
  localStorage.setItem(key, '{"lines":{"london":{}}}');
  prepareLocalAccount("first");
  expect(localStorage.getItem(key)).not.toBeNull();
  prepareLocalAccount("first");
  expect(localStorage.getItem(key)).not.toBeNull();
  prepareLocalAccount("second");
  expect(localStorage.getItem(key)).toBeNull();
  expect(localStorage.getItem(ACCOUNT_OWNER_KEY)).toBe("second");
});
test("signout removes account data but keeps board preferences", () => {
  prepareLocalAccount("first");
  localStorage.setItem(key, "{}");
  localStorage.setItem("notation_trainer_opening_settings_v1", '{"playSounds":false}');
  releaseLocalAccount();
  expect(localStorage.getItem(key)).toBeNull();
  expect(localStorage.getItem("notation_trainer_opening_settings_v1")).not.toBeNull();
});
