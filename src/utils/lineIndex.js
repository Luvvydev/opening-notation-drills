import { OPENING_SETS } from "../openings/openingCatalog";

export function buildLineIndex(openingSets) {
  const sets = openingSets || {};
  const byOpeningKey = {};
  const orderedIdsByOpeningKey = {};

  Object.keys(sets).forEach((openingKey) => {
    const set = sets[openingKey] || {};
    const lines = Array.isArray(set.lines) ? set.lines : [];

    const map = {};
    const ordered = [];

    lines.forEach((line) => {
      if (!line || typeof line !== "object") return;
      const id = line.id;
      if (!id || typeof id !== "string") return;

      map[id] = line;
      ordered.push(id);
    });

    byOpeningKey[openingKey] = map;
    orderedIdsByOpeningKey[openingKey] = ordered;
  });

  return { byOpeningKey, orderedIdsByOpeningKey };
}

export const LINE_INDEX = buildLineIndex(OPENING_SETS);

export function getLineById(openingKey, lineId, index) {
  const idx = index || LINE_INDEX;
  const bucket = (idx && idx.byOpeningKey && idx.byOpeningKey[openingKey]) || {};
  return bucket[lineId] || null;
}

export function getOrderedLineIds(openingKey, index) {
  const idx = index || LINE_INDEX;
  const ordered = (idx && idx.orderedIdsByOpeningKey && idx.orderedIdsByOpeningKey[openingKey]) || [];
  return Array.isArray(ordered) ? ordered : [];
}
