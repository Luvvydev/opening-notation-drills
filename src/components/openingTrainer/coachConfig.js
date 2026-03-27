const MODE_COACHES = {
  learn: {
    src: "/coaches/learn-coach.svg",
    alt: "Learn coach",
    title: "Learn coach"
  },
  practice: {
    src: "/coaches/practice-coach.svg",
    alt: "Practice coach",
    title: "Practice coach"
  },
  drill: {
    src: "/coaches/drill-coach.svg",
    alt: "Drill coach",
    title: "Drill coach"
  },
  puzzles: {
    src: "/coaches/puzzles-coach.svg",
    alt: "Puzzle coach",
    title: "Puzzle coach"
  }
};

const PRINCESS_MODE_COACHES = {
  learn: {
    src: "/coaches/princess-coach.svg",
    alt: "Princess coach",
    title: "Princess coach"
  },
  practice: {
    src: "/coaches/princess-coach.svg",
    alt: "Princess coach",
    title: "Princess coach"
  },
  drill: {
    src: "/coaches/princess-coach.svg",
    alt: "Princess coach",
    title: "Princess coach"
  }
};

const OPENING_OVERRIDES = {};

export function getCoachConfig({ mode, openingKey, coachTheme } = {}) {
  const normalizedMode = String(mode || "learn");
  const normalizedOpening = String(openingKey || "");
  const normalizedCoachTheme = String(coachTheme || "default");

  if (normalizedCoachTheme === "princess" && PRINCESS_MODE_COACHES[normalizedMode]) {
    return PRINCESS_MODE_COACHES[normalizedMode];
  }

  if (normalizedOpening && OPENING_OVERRIDES[normalizedOpening] && OPENING_OVERRIDES[normalizedOpening][normalizedMode]) {
    return OPENING_OVERRIDES[normalizedOpening][normalizedMode];
  }

  return MODE_COACHES[normalizedMode] || MODE_COACHES.learn;
}
