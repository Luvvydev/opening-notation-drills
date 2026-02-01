import * as Chess from "chess.js";

export const calcWidth = ({ screenWidth }) => {
  const vw = screenWidth || window.innerWidth || 360;

  // keep the original padding assumption, but never use screenHeight for width
  const usable = Math.max(260, vw - 100);

  if (vw < 550) return usable;
  if (vw < 1800) return 500;
  return 600;
};

export const X_SVG_DATA_URI =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
      <circle cx="32" cy="32" r="28" fill="#d11f1f"/>
      <path d="M20 20 L44 44 M44 20 L20 44" stroke="white" stroke-width="6" stroke-linecap="round"/>
    </svg>`
  );

export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function pickRandomLineId(lines, excludeId) {
  if (!lines || !lines.length) return null;
  if (lines.length === 1) return lines[0].id;
  let tries = 0;
  while (tries < 20) {
    const idx = randInt(0, lines.length - 1);
    const id = lines[idx].id;
    if (id !== excludeId) return id;
    tries += 1;
  }
  return lines[0].id;
}

export function splitMovesText(text) {
  const t = String(text || "").trim();
  if (!t) return [];
  return t
    .split(/[\n\r\t ,]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function validateSanMoves(moves) {
  try {
    const g = new Chess();
    for (let i = 0; i < moves.length; i += 1) {
      const san = moves[i];
      const mv = g.move(san, { sloppy: true });
      if (!mv) return { ok: false, index: i, san: san };
    }
    return { ok: true };
  } catch (_) {
    return { ok: false, index: 0, san: "" };
  }
}

export function safeJsonParse(text, fallback) {
  try {
    return JSON.parse(text);
  } catch (_) {
    return fallback;
  }
}

export function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function sideForIndex(i) {
  return i % 2 === 0 ? "w" : "b";
}

export function countMovesForSide(moves, side) {
  if (!moves || !moves.length) return 0;
  let n = 0;
  for (let i = 0; i < moves.length; i += 1) {
    if (sideForIndex(i) === side) n += 1;
  }
  return n;
}

export function countDoneMovesForSide(stepIndex, side) {
  let n = 0;
  for (let i = 0; i < stepIndex; i += 1) {
    if (sideForIndex(i) === side) n += 1;
  }
  return n;
}

export function categoryForLine(line) {
  if (!line) return "Other";
  if (line.category) return String(line.category);
  const name = line.name ? String(line.name) : "";
  const parts = name.split(":");
  if (parts.length > 1) return parts[0].trim();
  return "Other";
}

export function groupLines(lines) {
  const out = {};
  (lines || []).forEach((l) => {
    const cat = categoryForLine(l);
    if (!out[cat]) out[cat] = [];
    out[cat].push(l);
  });

  const preferred = [
    "Classic London",
    "Early ...c5 Systems",
    "Anti Bishop Ideas",
    "Jobava London",
    "Aggressive Plans",
    "Open Sicilian",
    "Anti-Sicilian",
    "Closed Sicilian",
    "Grand Prix",
    "Moscow/Rossolimo",
    "Other"
  ];

  const cats = Object.keys(out);
  cats.sort((a, b) => {
    const ia = preferred.indexOf(a);
    const ib = preferred.indexOf(b);
    if (ia !== -1 || ib !== -1) {
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    }
    return a.localeCompare(b);
  });

  return { cats, map: out };
}
