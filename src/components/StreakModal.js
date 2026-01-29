// src/components/StreakModal.js
import React, { useEffect, useMemo, useState } from "react";
import { ymdLocal } from "../utils/streak";
import "./StreakModal.css";

export default function StreakModal() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);

  const today = useMemo(() => ymdLocal(), []);

  useEffect(() => {
    function onUpdated(e) {
      const detail = e && e.detail ? e.detail : null;
      if (!detail) return;

      // Only show when it is for today and it looks like a real increment
      if (detail.today !== today) return;
      if (!(Number(detail.current) > 0)) return;

      setData(detail);
      setOpen(true);
    }

    window.addEventListener("streak:updated", onUpdated);
    return () => window.removeEventListener("streak:updated", onUpdated);
  }, [today]);

  useEffect(() => {
    function onKeyDown(e) {
      if (!open) return;
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!open || !data) return null;

  const headline = data.continued ? "Streak continued" : "New streak started";
  const sub = `${data.weekday} complete`;
  const bestLine = data.newBest ? "New best streak" : `Best: ${data.best}`;

  return (
    <div className="streakmodal-backdrop" onMouseDown={() => setOpen(false)}>
      <div className="streakmodal" onMouseDown={(e) => e.stopPropagation()}>
        <button className="streakmodal-x" onClick={() => setOpen(false)} aria-label="Close">
          ×
        </button>

        <div className="streakmodal-badge" aria-hidden="true">🔥</div>

        <div className="streakmodal-title">{headline}</div>
        <div className="streakmodal-sub">{sub}</div>

        <div className="streakmodal-count">
          <div className="streakmodal-number">{data.current}</div>
          <div className="streakmodal-label">
            {data.current === 1 ? "day streak" : "days streak"}
          </div>
        </div>

        <div className="streakmodal-best">{bestLine}</div>

        <button className="streakmodal-btn" onClick={() => setOpen(false)}>
          Continue
        </button>
      </div>
    </div>
  );
}
