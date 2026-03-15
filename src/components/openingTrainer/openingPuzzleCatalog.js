import { GENERATED_OPENING_PUZZLES } from "../../data/generatedOpeningPuzzles";

export const OPENING_PUZZLE_TAGS = {
  london: ["Queens_Pawn_Game_London_System"],
  sicilian: ["Sicilian_Defense", "Sicilian_Defense_Closed", "Sicilian_Defense_Dragon_Variation"],
  ruy: ["Ruy_Lopez"],
  friedliver: ["Italian_Game_Two_Knights_Defense_Fried_Liver_Attack", "Italian_Game"],
  stafford: ["Petrov_Defense_Stafford_Gambit", "Petrov_Defense"],
  carokann: ["Caro_Kann_Defense"],
  qga: ["Queens_Gambit_Accepted"],
  qgd: ["Queens_Gambit_Declined"],
  italian: ["Italian_Game"],
  kingsindian: ["Indian_Defense_Kings_Indian_Variation", "Kings_Indian_Defense"],
  french: ["French_Defense"],
  englund: ["Englund_Gambit"],
  english: ["English_Opening"],
  scotchgame: ["Scotch_Game"],
  vienna: ["Vienna_Game", "Vienna_Gambit"],
  viennaCounter: ["Vienna_Game", "Vienna_Gambit"],
  rousseauGambit: ["Italian_Game_Rousseau_Gambit", "Italian_Game"],
  bishopsOpening: ["Bishops_Opening"],
  kingsgambit: ["Kings_Gambit"],
  danishGambit: ["Danish_Gambit"],
  petrov: ["Petrov_Defense"],
  scandinavian: ["Scandinavian_Defense"],
  vantKruijs: ["Vant_Kruijs_Opening"]
};

const BUILTIN_OPENING_PUZZLES = {
  sicilian: [
    {
      id: "lichess-docs-sicilian-00sJb",
      fen: "Q1b2r1k/p2np2p/5bp1/q7/5P2/4B3/PPP3PP/2KR1B1R w - - 1 17",
      moves: ["d1d7", "a5e1", "d7d1", "e1e3", "c1b1", "e3b6"],
      rating: 2235,
      themes: ["advantage", "fork", "long"],
      openingTags: ["Sicilian_Defense", "Sicilian_Defense_Dragon_Variation"],
      source: "Lichess open database sample"
    }
  ],
  french: [
    {
      id: "lichess-docs-french-00sJ9",
      fen: "r3r1k1/p4ppp/2p2n2/1p6/3P1qb1/2NQR3/PPB2PP1/R1B3K1 w - - 5 18",
      moves: ["e3g3", "e8e1", "g1h2", "e1c1", "a1c1", "f4h6", "h2g1", "h6c1"],
      rating: 2671,
      themes: ["advantage", "attraction", "fork", "middlegame", "sacrifice", "veryLong"],
      openingTags: ["French_Defense", "French_Defense_Exchange_Variation"],
      source: "Lichess open database sample"
    }
  ],
  italian: [
    {
      id: "lichess-docs-italian-00sHx",
      fen: "q3k1nr/1pp1nQpp/3p4/1P2p3/4P3/B1PP1b2/B5PP/5K2 b k - 0 17",
      moves: ["e8d7", "a2e6", "d7d8", "f7f8"],
      rating: 1760,
      themes: ["mate", "mateIn2", "middlegame", "short"],
      openingTags: ["Italian_Game", "Italian_Game_Classical_Variation"],
      source: "Lichess open database sample"
    }
  ]
};

export function getOpeningPuzzlePack(openingKey) {
  const generated = GENERATED_OPENING_PUZZLES && GENERATED_OPENING_PUZZLES[openingKey];
  if (Array.isArray(generated) && generated.length) return generated;
  const builtin = BUILTIN_OPENING_PUZZLES[openingKey];
  return Array.isArray(builtin) ? builtin : [];
}

export function getOpeningPuzzleTagHints(openingKey) {
  return OPENING_PUZZLE_TAGS[openingKey] || [];
}
