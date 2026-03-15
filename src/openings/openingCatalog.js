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
import { viennaGambitLines } from "./viennaGambitLines";
import { viennaGambitCounterLines } from "./viennaGambitCounterLines";
import { rousseauGambitLines } from "./rousseauGambitLines";
import { bishopsOpeningLines } from "./bishopsOpeningLines";
import { viennaGameLines } from "./viennaGameLines";
import { kingsGambitLines } from "./kingsGambitLines";
import { danishGambitLines } from "./danishGambitLines";
import { petrovDefenseLines } from "./petrovDefenseLines";
import { scandinavianDefenseLines, scandinavianDefenseSEOText } from "./scandinavianDefenseLines";
import { vantKruijsOpeningLines } from "./vantKruijsOpeningLines";

export const OPENING_CATALOG = [
  {
    key: "london",
    title: "London",
    description:
      "Want easy wins? Easy to learn, hard to stop, and absolutely miserable to face if you don't know the antidote!",
    lines: londonLines,
    accent: "gold",
    badge: null,
    access: "free",
    earlyAccessUntil: null,
    position: "start",
    orientation: "white",
    playerColor: "w"
  },
  {
    key: "sicilian",
    title: "Sicilian Defense",
    description:
      "A savage answer to 1.e4 where Black refuses to play safe, creates instant imbalance, and fights for the win from move one.",
    lines: sicilianDefenseLines,
    accent: "purple",
    badge: null,
    access: "free",
    earlyAccessUntil: null,
    position: "start",
    orientation: "black",
    playerColor: "b"
  },
  {
    key: "ruy",
    title: "Ruy Lopez",
    description:
      "A legendary opening packed with pressure, hidden venom, and long term ideas that will squeeze opponents to death.",
    lines: ruyLopezLines,
    accent: "blue",
    badge: null,
    access: "free",
    earlyAccessUntil: null,
    position: "start",
    orientation: "white",
    playerColor: "w"
  },
  {
    key: "friedliver",
    title: "Fried Liver Attack",
    description:
      "A brutal king hunt where White sacrifices fast, attacks immediately, and punishes bad defense with pure tactical violence.",
    lines: friedLiverAttackLines,
    accent: "red",
    badge: null,
    access: "free",
    earlyAccessUntil: null,
    position: "start",
    orientation: "white",
    playerColor: "w"
  },
  {
    key: "stafford",
    title: "Stafford Gambit",
    description:
      "A filthy trap opening where Black gives up a pawn, explodes into development, and turns one careless move into a disaster.",
    lines: staffordGambitLines,
    accent: "green",
    badge: null,
    access: "free",
    earlyAccessUntil: null,
    position: "start",
    orientation: "black",
    playerColor: "b"
  },
  {
    key: "carokann",
    title: "Caro-Kann Defense",
    description:
      "A deceptively calm defense that gives Black a safe structure, clean development, and endless chances to outlast and outplay impatient opponents.",
    lines: caroKannLines,
    seoText: caroKannSEOText,
    accent: "orange",
    badge: null,
    access: "free",
    earlyAccessUntil: null,
    position: "start",
    orientation: "black",
    playerColor: "b"
  },
  {
    key: "qga",
    title: "Queen’s Gambit Accepted",
    description:
      "A greedy opening choice that invites White to take over the center, build pressure fast, and punish Black for grabbing material too early.",
    lines: queensGambitAcceptedLines,
    accent: "pink",
    badge: null,
    access: "free",
    earlyAccessUntil: null,
    position: "start",
    orientation: "white",
    playerColor: "w"
  },
  {
    key: "qgd",
    title: "Queen’s Gambit Declined",
    description:
      "A cold blooded defensive system where Black stays rock solid, absorbs pressure, and slowly strangles White’s ambitions.",
    lines: queensGambitDeclinedLines,
    accent: "rose",
    badge: null,
    access: "free",
    earlyAccessUntil: null,
    position: "start",
    orientation: "black",
    playerColor: "b"
  },
  {
    key: "italian",
    title: "Italian Game",
    description:
      "A classic attacking opening where White develops naturally, targets f7 immediately, and gets dangerous positions without needing insane theory.",
    lines: italianGameLines,
    accent: "teal",
    badge: null,
    access: "free",
    earlyAccessUntil: null,
    position: "start",
    orientation: "white",
    playerColor: "w"
  },
  {
    key: "kingsindian",
    title: "King's Indian Defense",
    description:
      "A ferocious defense where Black gives White space on purpose, then comes storming back with pawn breaks, pressure, and kingside attacks.",
    lines: kingsIndianDefenseLines,
    accent: "indigo",
    badge: null,
    access: "free",
    earlyAccessUntil: null,
    position: "start",
    orientation: "black",
    playerColor: "b"
  },
  {
    key: "french",
    title: "French Defense",
    description:
      "A stubborn, fighting defense where Black builds a hard center, challenges White’s structure, and turns the game into a strategic knife fight.",
    lines: frenchDefenseLines,
    accent: "slate",
    badge: null,
    access: "free",
    earlyAccessUntil: null,
    position: "start",
    orientation: "black",
    playerColor: "b"
  },
  {
    key: "englund",
    title: "Englund Gambit",
    description:
      "A reckless ambush against 1.d4 where Black skips respectability, hunts initiative immediately, and tries to win before White settles in.",
    lines: englundGambitLines,
    accent: "gray",
    badge: null,
    access: "free",
    earlyAccessUntil: null,
    position: "start",
    orientation: "black",
    playerColor: "b"
  },
  {
    key: "english",
    title: "English Opening",
    description: "A slippery, dangerous opening where White stays flexible, controls the game quietly, and can twist the position into whatever kind of battle they want.",
    lines: englishOpeningLines,
    accent: "cyan",
    badge: null,
    access: "signup",
    earlyAccessUntil: null,
    position: "start",
    orientation: "white",
    playerColor: "w"
  },
  {
    key: "scotchgame",
    title: "Scotch Game",
    description:
      "A direct, no-nonsense opening where White blows open the center early, gets active pieces fast, and starts asking hard questions right away.",
    lines: scotchGameLines,
    accent: "amber",
    badge: null,
    access: "signup",
    earlyAccessUntil: null,
    position: "start",
    orientation: "white",
    playerColor: "w"
  }
,
{
  key: "vienna",
  title: "Vienna Gambit",
  description:
    "A vicious attacking opening where White throws the f-pawn forward, grabs the initiative, and forces Black to survive a storm of tactics.",
  lines: viennaGambitLines,
  accent: "gold",
  badge: null,
  access: "signup",
  earlyAccessUntil: null,
  position: "start",
  orientation: "white",
  playerColor: "w"
},
{
  key: "viennaCounter",
  title: "Vienna Gambit Counter",
  description:
    "The critical battlefield of the Vienna, where Black strikes back in the center and every accurate move matters if you want to avoid getting blown off the board.",
  lines: viennaGambitCounterLines,
  accent: "slate",
  badge: null,
  access: "signup",
  earlyAccessUntil: null,
  position: "start",
  orientation: "black",
  playerColor: "b"
}
,
{
  key: "rousseauGambit",
  title: "Rousseau Gambit",
  description:
    "Every move is a trap, and one slow response can lose the game on the spot!",
  lines: rousseauGambitLines,
  accent: "red",
  badge: null,
  access: "signup",
  earlyAccessUntil: null,
  position: "start",
  orientation: "black",
  playerColor: "b"
}
,
{
  key: "bishopsOpening",
  title: "Bishop's Opening",
  description:
    "A sharp and underrated weapon where White develops fast, sidesteps expectations, and sets traps before the opponent even realizes they’re in danger.",
  lines: bishopsOpeningLines,
  accent: "violet",
  badge: null,
  access: "signup",
  earlyAccessUntil: null,
  position: "start",
  orientation: "white",
  playerColor: "w"
}
,
{
  key: "viennaGame",
  title: "Vienna Game",
  description:
    "A dangerous e4 system that looks simple at first, but hides traps, attacking chances, and flexible plans that can catch opponents off guard fast.",
  lines: viennaGameLines,
  accent: "gold",
  badge: null,
  access: "signup",
  earlyAccessUntil: null,
  position: "start",
  orientation: "white",
  playerColor: "w"
}
,
{
  key: "kingsGambit",
  title: "King's Gambit",
  description:
    "One of the most aggressive openings in chess, where White sacrifices a pawn immediately and dares Black to survive the attack.",
  lines: kingsGambitLines,
  accent: "rose",
  badge: null,
  access: "signup",
  earlyAccessUntil: null,
  position: "start",
  orientation: "white",
  playerColor: "w"
},
{
  key: "danishGambit",
  title: "Danish Gambit",
  description:
    "A ruthless gambit where White throws pawns away for speed, open lines, and a full-board attack that can end the game in minutes.",
  lines: danishGambitLines,
  accent: "amber",
  badge: null,
  access: "signup",
  earlyAccessUntil: null,
  position: "start",
  orientation: "white",
  playerColor: "w"
},
{
  key: "scandinavianDefense",
  title: "Scandinavian Defense",
  description:
    "Want to rip White’s center apart from move one, pull the game into messy territory, and challenge them to prove your queen activity is actually punishable?",
  lines: scandinavianDefenseLines,
  seoText: scandinavianDefenseSEOText,
  accent: "red",
  badge: "New",
  access: "signup",
  earlyAccessUntil: null,
  position: "start",
  orientation: "black",
  playerColor: "b"
},
{
  key: "vantKruijs",
  title: "Van't Kruijs Opening",
  description:
    "An anti-system for Black against White's slow e3, c3, d4, and Qb3 setup. Take the center early, finish development, and punish their wasted tempo.",
  lines: vantKruijsOpeningLines,
  accent: "slate",
  badge: "New",
  access: "signup",
  earlyAccessUntil: null,
  position: "start",
  orientation: "black",
  playerColor: "b"
},
{
  key: "petrovDefense",
  title: "Petrov Defense",
  description:
    "A deceptively solid opening where Black neutralizes White early, stays organized, and punishes overextension with cold precision.",
  lines: petrovDefenseLines,
  accent: "slate",
  badge: null,
  access: "signup",
  earlyAccessUntil: null,
  position: "start",
  orientation: "black",
  playerColor: "b"
}

];

export const OPENING_SETS = OPENING_CATALOG.reduce((acc, o) => {
  acc[o.key] = {
    key: o.key,
    label: o.title,
    playerColor: o.playerColor,
    lines: o.lines,
    badge: o.badge,
    access: o.access,
    earlyAccessUntil: o.earlyAccessUntil,
    seoText: o.seoText
  };
  return acc;
}, {});