// Keep browser training isolated when people share a device.
export const ACCOUNT_OWNER_KEY = "chessdrills.local_account_owner";
const KEYS = [
  "chessdrills.daily_streak.v1", "notation_trainer_opening_progress_v2",
  "notation_trainer_custom_lines_v1", "notation_trainer_learn_progress_v1",
  "chessdrills.activity_days.v1", "chessdrills_reviewed_mistakes_v1"
];

export function prepareLocalAccount(uid) {
  const previous = localStorage.getItem(ACCOUNT_OWNER_KEY);
  if (previous && previous !== uid) KEYS.forEach((key) => localStorage.removeItem(key));
  // An unowned browser is guest progress. Signup explicitly offers to save it.
  localStorage.setItem(ACCOUNT_OWNER_KEY, uid);
}

export function releaseLocalAccount() {
  if (!localStorage.getItem(ACCOUNT_OWNER_KEY)) return;
  KEYS.forEach((key) => localStorage.removeItem(key));
  localStorage.removeItem(ACCOUNT_OWNER_KEY);
  try { sessionStorage.removeItem("chessdrills.guest_review"); } catch (_) {}
}
