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


function createChess() {
  return new Chess();
}

function stripPgnHeaders(text) {
  return String(text || '').replace(/^\s*\[[^\]]*\]\s*$/gm, ' ').trim();
}

function normalizeSanTokens(tokens) {
  return (tokens || []).map((token) => String(token || '').trim()).filter(Boolean);
}

function decodeBase64Utf8(value) {
  try {
    return decodeURIComponent(escape(window.atob(value)));
  } catch (_) {
    return null;
  }
}

function encodeBase64Utf8(value) {
  try {
    return window.btoa(unescape(encodeURIComponent(value)));
  } catch (_) {
    return null;
  }
}

export function getLineStartFen(line) {
  return line && line.startFen ? String(line.startFen) : 'start';
}

export function detectCustomInputFormat(text) {
  const raw = String(text || '').trim();
  if (!raw) return 'empty';

  try {
    const fenGame = createChess();
    if (fenGame.load(raw)) return 'fen';
  } catch (_) {}

  if (/\[[A-Za-z0-9_]+\s+".*"\]/.test(raw) || /\d+\.(\.\.)?/.test(raw) || /1-0|0-1|1\/2-1\/2|\*/.test(raw)) {
    return 'pgn';
  }

  return 'san';
}

export function parseMovesFromPgn(text) {
  const raw = String(text || "").trim();
  if (!raw) return { ok: false, error: "Paste PGN first." };

  try {
    const game = createChess();
    const loader = typeof game.loadPgn === "function"
      ? game.loadPgn.bind(game)
      : (typeof game.load_pgn === "function" ? game.load_pgn.bind(game) : null);

    if (loader) {
      const loaded = loader(raw, { sloppy: true, newlineChar: /\r?\n/ });
      if (!loaded) return { ok: false, error: "Could not parse PGN." };
      return { ok: true, moves: normalizeSanTokens(game.history()) };
    }
  } catch (_) {}

  const stripped = stripPgnHeaders(raw)
    .replace(/\{[^}]*\}/g, " ")
    .replace(/;[^\n\r]*/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\$\d+/g, " ")
    .replace(/\d+\.(\.\.)?/g, " ")
    .replace(/1-0|0-1|1\/2-1\/2|\*/g, " ");

  const moves = splitMovesText(stripped);
  if (!moves.length) return { ok: false, error: "Could not find moves in PGN." };
  const v = validateSanMoves(moves);
  if (!v.ok) return { ok: false, error: `Bad PGN move at #${(v.index || 0) + 1}: ${v.san || ""}` };
  return { ok: true, moves };
}

export function parseCustomLineInput(text) {
  const raw = String(text || "").trim();
  const format = detectCustomInputFormat(raw);

  if (format === "empty") {
    return { ok: false, format, error: "Paste SAN, PGN, or FEN first." };
  }

  if (format === "fen") {
    try {
      const game = createChess();
      if (!game.load(raw)) return { ok: false, format, error: "Invalid FEN." };
      return { ok: true, format, moves: [], startFen: raw };
    } catch (_) {
      return { ok: false, format, error: "Invalid FEN." };
    }
  }

  if (format === "pgn") {
    const parsed = parseMovesFromPgn(raw);
    if (!parsed.ok) return { ok: false, format, error: parsed.error };
    return { ok: true, format, moves: parsed.moves, sourcePgn: raw };
  }

  const moves = splitMovesText(raw);
  if (!moves.length) return { ok: false, format, error: "Paste SAN moves first." };
  const v = validateSanMoves(moves);
  if (!v.ok) {
    return { ok: false, format, error: `Bad move at #${(v.index || 0) + 1}: ${v.san || ""}` };
  }

  return { ok: true, format, moves };
}

export function lineToSanText(line) {
  return ((line && Array.isArray(line.moves)) ? line.moves : []).join(" ");
}

export function lineToPgn(line) {
  try {
    const game = createChess();
    const startFen = getLineStartFen(line);
    if (startFen && startFen !== "start") game.load(startFen);
    const moves = (line && Array.isArray(line.moves)) ? line.moves : [];

    for (let i = 0; i < moves.length; i += 1) {
      const mv = game.move(moves[i], { sloppy: true });
      if (!mv) return lineToSanText(line);
    }

    if (typeof game.pgn === "function") {
      const pgn = game.pgn({ maxWidth: 0, newline: "\n" });
      if (startFen && startFen !== "start") {
        const prefix = `[SetUp "1"]\n[FEN "${startFen}"]`;
        return pgn ? `${prefix}\n\n${pgn}` : prefix;

      }
      return pgn || lineToSanText(line);
    }

    return lineToSanText(line);
  } catch (_) {
    return lineToSanText(line);
  }
}

export function sanitizeSharedCustomLine(rawLine, fallbackOpeningKey) {
  if (!rawLine || typeof rawLine !== 'object') return null;
  const openingKey = String(rawLine.openingKey || fallbackOpeningKey || 'london');
  const name = String(rawLine.name || 'Shared rep').trim() || 'Shared rep';
  const description = String(rawLine.description || '').trim();
  const moves = Array.isArray(rawLine.moves) ? normalizeSanTokens(rawLine.moves) : [];
  const startFen = rawLine.startFen ? String(rawLine.startFen).trim() : '';
  const sourceType = rawLine.sourceType ? String(rawLine.sourceType) : (startFen ? 'fen' : (moves.length ? 'san' : 'unknown'));

  if (startFen) {
    try {
      const game = createChess();
      if (!game.load(startFen)) return null;
    } catch (_) {
      return null;
    }
  }

  if (moves.length) {
    try {
      const game = createChess();
      if (startFen) game.load(startFen);
      for (let i = 0; i < moves.length; i += 1) {
        const mv = game.move(moves[i], { sloppy: true });
        if (!mv) return null;
      }
    } catch (_) {
      return null;
    }
  } else if (!startFen) {
    return null;
  }

  const idSeed = String(rawLine.id || name || 'shared');
  const safeSeed = idSeed.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'shared';

  return {
    id: rawLine.id && String(rawLine.id).startsWith('custom-') ? String(rawLine.id) : `shared-${safeSeed}`,
    openingKey,
    category: 'My Reps',
    name,
    description,
    moves,
    explanations: Array.isArray(rawLine.explanations) && rawLine.explanations.length === moves.length ? rawLine.explanations : moves.map(() => ''),
    startFen: startFen || undefined,
    sourceType,
    sourcePgn: rawLine.sourcePgn ? String(rawLine.sourcePgn) : undefined,
    shared: true
  };
}

export function encodeSharedCustomLine(line, openingKey) {
  const safeLine = sanitizeSharedCustomLine(line, openingKey);
  if (!safeLine) return null;
  const payload = {
    openingKey: safeLine.openingKey,
    id: safeLine.id,
    name: safeLine.name,
    description: safeLine.description,
    moves: safeLine.moves,
    explanations: safeLine.explanations,
    startFen: safeLine.startFen,
    sourceType: safeLine.sourceType,
    sourcePgn: safeLine.sourcePgn
  };
  return encodeBase64Utf8(JSON.stringify(payload));
}

export function decodeSharedCustomLine(encoded, fallbackOpeningKey) {
  const raw = String(encoded || '').trim();
  if (!raw) return null;
  try {
    const decoded = decodeBase64Utf8(raw);
    if (!decoded) return null;
    const parsed = JSON.parse(decoded);
    return sanitizeSharedCustomLine(parsed, fallbackOpeningKey);
  } catch (_) {
    return null;
  }
}
