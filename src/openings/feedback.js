function stripMovePrefix(text) {
  if (!text) return "";
  const s = String(text).trim();
  const idx = s.indexOf(":");
  if (idx > 0 && idx <= 8) {
    const head = s.slice(0, idx).trim();
    const isSAN =
      head === "O-O" ||
      head === "O-O-O" ||
      /^[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](=[QRBN])?[+#]?$/.test(head) ||
      /^[a-h][1-8](=[QRBN])?[+#]?$/.test(head);

    if (isSAN) return s.slice(idx + 1).trim();
  }
  return s;
}

function sanitizeExplanation(text, moveSan) {
  let s = stripMovePrefix(text);
  if (!s) return "";

  if (moveSan) {
    const esc = String(moveSan).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    s = s.replace(new RegExp("\\b" + esc + "\\b", "g"), "this move");
  }

  return s.replace(/\s+/g, " ").trim();
}

function ensureSentence(text) {
  const s = String(text || "").trim();
  if (!s) return "";
  return /[.!?]$/.test(s) ? s : `${s}.`;
}

function toLower(text) {
  return String(text || "").toLowerCase();
}

function shortenCorrectText(text) {
  let s = String(text || "").trim();
  if (!s) return "";

  s = s.replace(/^this move\s+/i, "");
  s = s.replace(/^move\s+/i, "");
  s = s.replace(/^the idea is to\s+/i, "");
  s = s.replace(/^the point is to\s+/i, "");
  s = s.replace(/^you\s+/i, "");
  s = s.replace(/^black\s+/i, "");
  s = s.replace(/^white\s+/i, "");
  s = s.replace(/^by\s+/i, "");

  const chunks = s.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (chunks.length > 0) s = chunks[0];

  s = s.replace(/\b(and|while|because)\b.*$/i, "").trim();
  s = s.replace(/\s+/g, " ").trim();
  if (!s) return "";

  s = s.charAt(0).toUpperCase() + s.slice(1);
  return ensureSentence(s);
}


function buildCorrectDetail(text, tags) {
  let s = String(text || "").trim();
  if (!s) {
    if (Array.isArray(tags) && tags.length) {
      return ensureSentence(`It ${tags.slice(0, 2).map((t) => t.toLowerCase()).join(" and ")}.`);
    }
    return "";
  }

  const chunks = s.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (chunks.length > 1) {
    const tail = chunks.slice(1).join(" ").trim();
    if (tail) return ensureSentence(tail);
  }

  s = s.replace(/^this move\s+/i, "It ");
  s = s.replace(/^the move\s+/i, "It ");
  s = s.replace(/^the idea is to\s+/i, "It ");
  s = s.replace(/^the point is to\s+/i, "It ");
  s = s.replace(/^you\s+/i, "It ");
  s = s.replace(/\s+/g, " ").trim();

  if (!/^it\b/i.test(s)) {
    s = `It ${s.charAt(0).toLowerCase()}${s.slice(1)}`;
  }

  return ensureSentence(s);
}

function moveCreatesTag(moveSan) {
  const s = String(moveSan || "");
  const tags = [];

  if (/^O-O(-O)?[+#]?$/.test(s)) tags.push("King safety");
  if (/^[NBRQK]/.test(s)) tags.push("Develops piece");
  if (/^[cdex]?d4|^[cdex]?e4|^[cdex]?d5|^[cdex]?e5/.test(s)) tags.push("Fights center");
  if (/x/.test(s)) tags.push("Wins material");
  if (/\+|#/.test(s)) tags.push("Creates threat");
  if (/B/.test(s)) tags.push("Opens diagonal");

  return tags;
}

function inferTags(text, moveSan) {
  const s = toLower(text);
  const tags = [];
  const add = (label) => {
    if (label && !tags.includes(label)) tags.push(label);
  };

  if (/(develop|development|activate|improve.*piece|bring.*piece)/.test(s)) add("Develops piece");
  if (/(center|central|space|d4|e4|d5|e5)/.test(s)) add("Fights center");
  if (/(tempo|initiative|gain time|with tempo)/.test(s)) add("Gains tempo");
  if (/(castle|king safety|safe king|kingside|queenside)/.test(s)) add("King safety");
  if (/(win material|wins material|free piece|hanging|capture|pick up material|pawn)/.test(s)) add("Wins material");
  if (/(diagonal|bishop line|open diagonal|long diagonal|line for the bishop)/.test(s)) add("Opens diagonal");
  if (/(pressure|attack|threat|initiative)/.test(s)) add("Pressure");
  if (/(flexible|flexibility|options|keep options)/.test(s)) add("Keeps options");

  for (const label of moveCreatesTag(moveSan)) add(label);

  return tags.slice(0, 3);
}

function inferSeverity(text, moveSan) {
  const s = `${toLower(text)} ${toLower(moveSan)}`;
  if (/(hanging|hangs|drops material|loses material|blunder|tactic|tactical|mate|checkmate|forced)/.test(s)) return "Serious mistake";
  if (/(tempo|initiative|punish|punishes|misses punishment|too slow|too passive|passive)/.test(s)) return "Passive";
  if (/(king safety|unsafe king|castle|exposed king)/.test(s)) return "King safety";
  return "Inaccuracy";
}

function inferWrongMoveLabel(playedSan) {
  const san = String(playedSan || "");
  if (!san) return "Your move";
  if (/^O-O(-O)?[+#]?$/.test(san)) return "Your move castled";
  if (/x/.test(san)) return "Your move captured";
  if (/^[NBRQK]/.test(san)) return "Your move developed a piece";
  if (/^[a-h]/.test(san)) return "Your pawn move";
  return "Your move";
}

function buildWrongParts(baseText, playedSan, tags) {
  const s = toLower(baseText);
  let yourMove = "reasonable at a glance, but too slow for the position.";
  let missed = "The stronger move keeps the main idea of the position intact.";

  if (/(tempo|initiative|gain time|with tempo)/.test(s)) {
    yourMove = "does not challenge Black quickly enough.";
    missed = "The stronger move gains time and keeps the initiative.";
  } else if (/(center|central|space|d4|e4|d5|e5)/.test(s)) {
    yourMove = "fails to fight for the center soon enough.";
    missed = "The stronger move reinforces central control immediately.";
  } else if (/(develop|development|activate)/.test(s)) {
    yourMove = "develops, but not with the right priority here.";
    missed = "The stronger move improves development more cleanly.";
  } else if (/(castle|king safety|safe king|kingside|queenside)/.test(s)) {
    yourMove = "does not solve king safety fast enough.";
    missed = "The stronger move improves king safety before expanding further.";
  } else if (/(hanging|wins material|free piece|capture|tactic|punish)/.test(s)) {
    yourMove = "misses the tactical point in the position.";
    missed = "The stronger move punishes the position more directly.";
  } else if (/(diagonal|bishop line|open diagonal)/.test(s)) {
    yourMove = "does not improve your piece lines enough.";
    missed = "The stronger move opens a more useful diagonal and improves coordination.";
  }

  if (Array.isArray(tags) && tags.includes("Wins material")) {
    missed = "The stronger move takes material or punishes a loose piece right away.";
  } else if (Array.isArray(tags) && tags.includes("King safety")) {
    missed = "The stronger move keeps your king safer before chasing extra play.";
  } else if (Array.isArray(tags) && tags.includes("Gains tempo")) {
    missed = "The stronger move gains time and puts your opponent under pressure.";
  }

  return {
    yourMove: `${inferWrongMoveLabel(playedSan)} ${yourMove}`,
    missed: missed
  };
}

function buildWhyText(baseText) {
  const s = String(baseText || "").trim();
  if (!s) return "It fits the position better and keeps your pieces working together.";
  return ensureSentence(s);
}

function buildFeedbackEntry(explanation, moveSan) {
  const base = sanitizeExplanation(explanation, moveSan);
  const why = buildWhyText(base);
  const correct = shortenCorrectText(base) || "Follows the main idea of the position.";
  const tags = inferTags(base, moveSan);
  const wrongParts = buildWrongParts(base, "", tags);

  return {
    correct,
    correctDetail: buildCorrectDetail(base, tags),
    correctWhy: why,
    wrong: ensureSentence(wrongParts.missed),
    wrongYourMove: ensureSentence(wrongParts.yourMove),
    wrongMissed: ensureSentence(wrongParts.missed),
    severity: inferSeverity(base, moveSan),
    why,
    tags,
    wrongMoves: {}
  };
}

export function withOpeningFeedback(lines) {
  return (Array.isArray(lines) ? lines : []).map((line) => {
    if (!line || typeof line !== "object") return line;
    if (Array.isArray(line.feedback) && line.feedback.length) return line;

    const moves = Array.isArray(line.moves) ? line.moves : [];
    const explanations = Array.isArray(line.explanations) ? line.explanations : [];
    const feedback = moves.map((moveSan, index) => buildFeedbackEntry(explanations[index] || "", moveSan));

    return {
      ...line,
      feedback,
      correctFeedback: feedback.map((entry) => entry.correct),
      wrongFeedback: feedback.map((entry) => entry.wrong),
      feedbackTags: feedback.map((entry) => entry.tags)
    };
  });
}

export function buildMoveFeedback(entry, context = {}) {
  const isCorrect = !!context.isCorrect;
  const expectedSan = context.expectedSan || "";
  const playedSan = context.playedSan || "";
  const baseEntry = entry && typeof entry === "object" ? entry : {};
  const tags = Array.isArray(baseEntry.tags) ? baseEntry.tags.filter(Boolean).slice(0, 3) : [];
  const why = ensureSentence(baseEntry.why || "It fits the position better and keeps the position under control.");

  if (isCorrect) {
    const detail = ensureSentence(baseEntry.correctDetail || (why && why !== baseEntry.correct ? why : ""));
    return {
      kind: "correct",
      title: "Correct",
      text: ensureSentence(baseEntry.correct || "Follows the main idea of the position."),
      detail,
      why,
      tags,
      expected: expectedSan,
      played: playedSan
    };
  }

  const specificWrong = baseEntry.wrongMoves && playedSan ? baseEntry.wrongMoves[playedSan] : "";
  const specificParts = specificWrong
    ? {
        yourMove: "Your move looks natural, but it is not the critical idea here.",
        missed: specificWrong
      }
    : buildWrongParts(baseEntry.why || baseEntry.correct || "", playedSan, tags);

  return {
    kind: "wrong",
    title: "Not quite",
    text: ensureSentence(baseEntry.wrong || specificParts.missed || "The position had a stronger continuation."),
    yourMove: ensureSentence(baseEntry.wrongYourMove || specificParts.yourMove),
    missed: ensureSentence(baseEntry.wrongMissed || specificParts.missed),
    why,
    severity: baseEntry.severity || inferSeverity(baseEntry.why || "", playedSan),
    tags,
    expected: expectedSan,
    played: playedSan
  };
}
