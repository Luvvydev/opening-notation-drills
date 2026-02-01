import { londonLines } from "./londonLines";
import { sicilianDefenseLines } from "./sicilianDefenseLines";
import { ruyLopezLines } from "./ruyLopezLines";
import { friedLiverAttackLines } from "./friedLiverAttackLines";
import { staffordGambitLines } from "./staffordGambitLines";
import { caroKannLines, caroKannSEOText } from "./caroKannLines";
import { queensGambitAcceptedLines } from "./queensGambitAcceptedLines";
import { queensGambitDeclinedLines } from "./queensGambitDeclinedLines";
import { italianGameLines } from "./italianGameLines";
import { kingsIndianDefenseLines } from "./kingsIndianDefenseLines";
import { frenchDefenseLines } from "./frenchDefenseLines";
import { englundGambitLines } from "./englundGambitLines";
import { englishOpeningLines } from "./englishOpeningLines";
import { scotchGameLines } from "./scotchGameLines";

export const OPENING_CATALOG = [
  {
    key: "london",
    title: "London",
    description:
      "A popular 1.d4 opening for White with a reputation for solidity, focusing on reliable structures and clear repeatable plans",
    lines: londonLines,
    accent: "gold",
    badge: null,
    position: "start",
    orientation: "white",
    playerColor: "w"
  },
  {
    key: "sicilian",
    title: "Sicilian Defense",
    description:
      "Arising after 1.e4 c5, it is a dynamic opening that leads to sharp, unbalanced play and was a favorite weapon of champions like Fischer and Kasparov.",
    lines: sicilianDefenseLines,
    accent: "purple",
    badge: null,
    position: "start",
    orientation: "black",
    playerColor: "b"
  },
  {
    key: "ruy",
    title: "Ruy Lopez",
    description:
      "A legendary battleground of chess history, rich in strategy and theory, where the world's strongest players have tested ideas for over a century and tiny advantages are fought for with ruthless precision.",
    lines: ruyLopezLines,
    accent: "blue",
    badge: null,
    position: "start",
    orientation: "white",
    playerColor: "w"
  },
  {
    key: "friedliver",
    title: "Fried Liver Attack",
    description:
      "A sharp and entertaining way to attack the king, built around sacrificing a knight on f7 and dragging Black into tactical chaos before they know what hit them.",
    lines: friedLiverAttackLines,
    accent: "red",
    badge: null,
    position: "start",
    orientation: "white",
    playerColor: "w"
  },
  {
    key: "stafford",
    title: "Stafford Gambit",
    description:
      "A tricky gambit after 1.e4 e5 2.Nf3 Nf6 3.Nxe5 Nc6, where Black sacrifices a pawn for rapid development and dangerous traps.",
    lines: staffordGambitLines,
    accent: "green",
    badge: null,
    position: "start",
    orientation: "black",
    playerColor: "b"
  },
  {
    key: "carokann",
    title: "Caro-Kann Defense",
    description:
      "A solid defense to 1.e4. Black aims for a resilient pawn structure and safe development while still keeping counterplay.",
    lines: caroKannLines,
    seoText: caroKannSEOText,
    accent: "orange",
    badge: null,
    position: "start",
    orientation: "black",
    playerColor: "b"
  },
  {
    key: "qga",
    title: "Queen’s Gambit Accepted",
    description:
      "Black accepts the c4 pawn early and White aims to build a strong center and regain the pawn with development.",
    lines: queensGambitAcceptedLines,
    accent: "pink",
    badge: null,
    position: "start",
    orientation: "white",
    playerColor: "w"
  },
  {
    key: "qgd",
    title: "Queen’s Gambit Declined",
    description:
      "Black declines the gambit and builds a sturdy structure, leading to strategic games with long-term plans.",
    lines: queensGambitDeclinedLines,
    accent: "rose",
    badge: null,
    position: "start",
    orientation: "black",
    playerColor: "b"
  },
  {
    key: "italian",
    title: "Italian Game",
    description:
      "A classical 1.e4 opening that focuses on quick development and direct pressure on f7, leading to rich, tactical play.",
    lines: italianGameLines,
    accent: "teal",
    badge: null,
    position: "start",
    orientation: "white",
    playerColor: "w"
  },
  {
    key: "kingsindian",
    title: "King's Indian Defense",
    description:
      "A fighting defense against 1.d4 where Black allows White space early, then strikes back with pawn breaks and kingside play.",
    lines: kingsIndianDefenseLines,
    accent: "indigo",
    badge: null,
    position: "start",
    orientation: "black",
    playerColor: "b"
  },
  {
    key: "french",
    title: "French Defense",
    description:
      "A resilient response to 1.e4 where Black builds a strong pawn chain and aims for counterplay against White's center.",
    lines: frenchDefenseLines,
    accent: "slate",
    badge: null,
    position: "start",
    orientation: "black",
    playerColor: "b"
  },
  {
    key: "englund",
    title: "Englund Gambit",
    description:
      "A wild gambit against 1.d4 where Black sacrifices early material for quick development and cheap tactics.",
    lines: englundGambitLines,
    accent: "gray",
    badge: null,
    position: "start",
    orientation: "black",
    playerColor: "b"
  },
  {
    key: "english",
    title: "English Opening",
    description: "A flexible 1.c4 opening for White that can transpose into many structures.",
    lines: englishOpeningLines,
    accent: "cyan",
    badge: "New",
    position: "start",
    orientation: "white",
    playerColor: "w"
  },
  {
    key: "scotchgame",
    title: "Scotch Game",
    description:
      "The Scotch Game is an 1.e4 opening that feels like a cheat code. It is simple to learn, crushes new players, but it scales extremely well and remains a serious weapon at every level.",
    lines: scotchGameLines,
    accent: "amber",
    badge: "New",
    position: "start",
    orientation: "white",
    playerColor: "w"
  }
];

export const OPENING_SETS = OPENING_CATALOG.reduce((acc, o) => {
  acc[o.key] = {
    key: o.key,
    label: o.title,
    playerColor: o.playerColor,
    lines: o.lines,
    badge: o.badge,
    seoText: o.seoText
  };
  return acc;
}, {});
