const LS_ACTIVITY_DAYS_KEY = "chessdrills.activity_days.v1";

function todayYMD() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getActivityDays() {
  try {
    const raw = localStorage.getItem(LS_ACTIVITY_DAYS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function markActivityToday() {
  const days = getActivityDays();
  const today = todayYMD();

  const prev = Number(days[today]) || 0;
  days[today] = prev + 1;

  try {
    localStorage.setItem(LS_ACTIVITY_DAYS_KEY, JSON.stringify(days));
  } catch (_) {}

  try {
    window.dispatchEvent(new Event("activity:updated"));
  } catch (_) {}
}
