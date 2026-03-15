import { withOpeningFeedback } from "./feedback";

export const scandinavianDefenseSEOText = `
The Scandinavian Defense is a direct answer to 1.e4 where Black challenges the center immediately with ...d5.
It leads to practical positions where Black removes White's e-pawn early, develops quickly, and pressures the center instead of sitting back.

This page is built for players who want to memorize real Scandinavian move orders through repetition.
The drills focus on the classical 2...Qxd5 lines, the main ...Qa5 setups, and the tactical patterns that appear when White treats the early queen move too casually.

If you keep getting playable Scandinavian positions and then forgetting the right move order, these drills are meant to make the structure automatic and teach what each move is actually doing.
`;

const QA5_INTRO = [
  "White claims central space and opens lines right away.",
  "Black challenges the center immediately instead of letting White build freely.",
  "White accepts the challenge and forces Black into an open Scandinavian structure.",
  "Black recaptures at once because removing White's e-pawn is the whole point of this defense.",
  "White develops with tempo and asks the queen to justify itself.",
  "Qa5 is the classical retreat, keeping the queen active while staying out of easy tactics."
];

const D4_NF6 = [
  "White rebuilds the broad center and tries to turn space into initiative.",
  "Black develops cleanly and keeps e4 and d5 break ideas under control."
];

const NF3_BF5 = [
  "White develops toward castling and supports the center.",
  "Black gets the light bishop outside the pawn chain before ...e6, which is one of the biggest positional wins in the Scandinavian."
];

const BD2_BG4 = [
  "White develops, but the bishop on d2 often ends up doing defensive work instead of improving the center.",
  "Black pins and develops at the same time, asking White to spend tempi dealing with active pieces."
];

export const scandinavianDefenseLines = withOpeningFeedback([
  {
    category: "Classical Qa5",
    id: "scandinavian-defense-01-bc4-qh5-nd4",
    name: "Main line with ...Qh5 and ...Nd4",
    description: "Black meets the Bc4 setup with active queen play and a tactical jump into d4.",
    moves: ["e4", "d5", "exd5", "Qxd5", "Nc3", "Qa5", "Nf3", "Nf6", "Bc4", "Nc6", "d3", "Bg4", "Bd2", "Qh5", "h3", "Nd4"],
    explanations: [
      ...QA5_INTRO,
      "White develops the king knight first and keeps options open.",
      "Black matches development and makes sure White does not get a free e5 push.",
      "White points at f7 and tries to make the queen move look loose.",
      "Black develops naturally and adds more pressure to the central dark squares.",
      "White supports e4 and opens the dark bishop, but the move order is a little slow.",
      "Black pins the knight and starts building pressure against White's center and kingside dark squares.",
      "White breaks the pin from the queen side, but the bishop can become awkward here.",
      "Black puts the queen on h5, eyeing h2 and coordinating with the bishop on g4.",
      "White kicks the setup, but the pawn move also loosens dark squares and gives Black a concrete target.",
      "Black jumps into d4 at the right moment, creating immediate threats and showing why White's setup cannot just develop on autopilot."
    ]
  },
  {
    category: "Bf5 and ...Qb6",
    id: "scandinavian-defense-02-qb6-full-rook-trap",
    name: "Qb6 trap winning the rook",
    description: "A famous Scandinavian punishment where Black's queen pressure on b2 turns into a full rook win.",
    moves: ["e4", "d5", "exd5", "Qxd5", "Nc3", "Qa5", "d4", "Nf6", "Nf3", "Bf5", "Bd2", "e6", "Ne4", "Qb6", "Nxf6+", "gxf6", "c3", "Qxb2", "Rb1", "Qxb1", "Qxb1", "Bxb1"],
    explanations: [
      ...QA5_INTRO,
      ...D4_NF6,
      ...NF3_BF5,
      "White develops, but the bishop on d2 can become a tactical liability on the b file.",
      "Black supports the center and clears the dark bishop while preparing the queen swing to b6.",
      "White centralizes the knight, but this often gives Black concrete targets instead of real discomfort.",
      "Black hits b2 immediately; this queen move is not cosmetic, it is the point of the setup.",
      "White removes the knight on f6 and tries to damage Black's structure before the queenside pressure becomes serious.",
      "Black accepts doubled pawns because the g file opens, the bishop pair survives, and the queen still has access to b2.",
      "White tries to cover the queenside, but c3 is too slow to solve the tactical problems completely.",
      "Black grabs b2 and drags White into the trap.",
      "White attacks the queen, but this rook move walks directly into the main tactical idea.",
      "Black takes on b1 because the back-rank geometry is in Black's favor.",
      "White must recapture or simply lose the exchange for nothing.",
      "Black finishes the sequence by taking on b1 and wins a full rook."
    ]
  },
  {
    category: "Bf5 and ...Qb6",
    id: "scandinavian-defense-03-qb6-pawn-grab",
    name: "Qb6 line winning b2",
    description: "Even when the full tactic does not happen, Black often just wins the b2 pawn and keeps the initiative.",
    moves: ["e4", "d5", "exd5", "Qxd5", "Nc3", "Qa5", "d4", "Nf6", "Nf3", "Bf5", "Bd2", "e6", "Ne4", "Qb6", "Nxf6+", "gxf6", "c3", "Qxb2"],
    explanations: [
      ...QA5_INTRO,
      ...D4_NF6,
      ...NF3_BF5,
      "White develops, but the bishop placement still leaves b2 as a chronic target.",
      "Black consolidates the center and prepares the queen invasion on b6.",
      "White centralizes, but the knight jump does not actually solve the queenside pressure.",
      "Black hits b2 and forces White to react immediately.",
      "White damages Black's kingside structure and hopes the endgame will favor White later.",
      "Black accepts the structure because open files and concrete play matter more than appearance here.",
      "White tries to cover the queenside, but c3 still leaves the b2 pawn loose.",
      "Black wins b2 and reaches an extra-pawn game where White still has development, but Black has the clearer targets."
    ]
  },
  {
    category: "Bg4 systems",
    id: "scandinavian-defense-04-rb1-qxd4",
    name: "Punishing Rb1 with ...Qxd4",
    description: "When White overprotects the b pawn, Black often just takes the center pawn instead.",
    moves: ["e4", "d5", "exd5", "Qxd5", "Nc3", "Qa5", "d4", "Nf6", "Bd2", "Bg4", "f3", "Bd7", "Bc4", "Qb6", "Rb1", "Qxd4"],
    explanations: [
      ...QA5_INTRO,
      ...D4_NF6,
      ...BD2_BG4,
      "White chases the bishop, but f3 weakens dark squares and delays castling.",
      "Black calmly retreats because provoking f3 was already useful.",
      "White develops actively, but the center is no longer as stable as it looks.",
      "Black shifts the queen to b6, where both b2 and d4 come under pressure.",
      "White protects b2 directly, but that move leaves the center underdefended.",
      "Black takes on d4 because the central pawn was the real target all along."
    ]
  },
  {
    category: "Bf5 center pressure",
    id: "scandinavian-defense-05-bb4-castle-long",
    name: "Bb4 line with queenside castling",
    description: "Black gives White the center for a moment, then attacks the base of it with rapid development.",
    moves: ["e4", "d5", "exd5", "Qxd5", "Nc3", "Qa5", "d4", "Nf6", "Nf3", "Bf5", "Bd2", "e6", "Bc4", "Bb4", "a3", "Bxc3", "Bxc3", "Qb6", "O-O", "Nc6", "d5", "O-O-O"],
    explanations: [
      ...QA5_INTRO,
      ...D4_NF6,
      ...NF3_BF5,
      "White develops, but the bishop on d2 still blocks queenside coordination.",
      "Black supports the center and opens the dark bishop while keeping queenside castling in reserve.",
      "White develops actively and keeps pressure on f7.",
      "Black hits the bishop structure and asks White to clarify the queenside immediately.",
      "White gains space, but the pawn can also become a hook later.",
      "Black gives up the bishop pair to damage White's coordination and speed development.",
      "White recaptures, but the bishop on c3 can become a target and the d4 pawn still needs support.",
      "Black keeps pressure on both the center and the queenside.",
      "White castles and says the initiative should still favor White.",
      "Black develops the last minor piece and increases pressure on d4.",
      "White gains space, but the center is now fixed and easier to attack.",
      "Black castles long and brings the rook straight to the d file, where the real fight will happen."
    ]
  },
  {
    category: "Simple development",
    id: "scandinavian-defense-06-bd3-nc6-bg4",
    name: "Bd3 setup met by ...Nc6 and ...Bg4",
    description: "A compact Scandinavian development scheme that makes d4 the long-term target.",
    moves: ["e4", "d5", "exd5", "Qxd5", "Nc3", "Qa5", "d4", "Nf6", "Bd3", "Nc6", "Nf3", "Bg4"],
    explanations: [
      ...QA5_INTRO,
      ...D4_NF6,
      "White puts the bishop on an active square, but this can leave c2 and d4 a bit more sensitive.",
      "Black develops naturally and increases pressure on d4.",
      "White develops toward castling and supports the center.",
      "Black pins the knight and makes it harder for White to defend the center comfortably."
    ]
  },
  {
    category: "Bg4 systems",
    id: "scandinavian-defense-07-be2-bxe2",
    name: "Bd2 and Be2 allowing the bishop trade",
    description: "If White spends time untangling the pin, Black is often happy to simplify.",
    moves: ["e4", "d5", "exd5", "Qxd5", "Nc3", "Qa5", "d4", "Nf6", "Bd2", "Bg4", "Be2", "Bxe2"],
    explanations: [
      ...QA5_INTRO,
      ...D4_NF6,
      ...BD2_BG4,
      "White breaks the pin in the most natural way, but this also invites simplification.",
      "Black trades bishops because reducing White's active pieces usually makes the Scandinavian easier to handle."
    ]
  },
  {
    category: "Simple development",
    id: "scandinavian-defense-08-ne2-bf5",
    name: "Ne2 setup with ...Bg4 and ...Bf5",
    description: "Black meets a slower White setup by finishing development into a very playable structure.",
    moves: ["e4", "d5", "exd5", "Qxd5", "Nc3", "Qa5", "d4", "Nf6", "Bd3", "Nc6", "Ne2", "Bg4", "f3", "Bf5"],
    explanations: [
      ...QA5_INTRO,
      ...D4_NF6,
      "White places the bishop actively, but it can cost time if Black starts poking at the setup.",
      "Black develops the knight to its best square and piles pressure onto d4.",
      "White keeps the f pawn flexible, but Ne2 is slower than normal development.",
      "Black pins and develops at the same time, which is ideal in these Scandinavian structures.",
      "White chases the bishop, but the move weakens dark squares and delays castling.",
      "Black retreats to an active square and keeps the bishop outside the pawn chain, which is exactly what Black wants."
    ]
  },
  {
    category: "Bg4 and ...Qf5",
    id: "scandinavian-defense-09-qf5-be2-nc6",
    name: "Qf5 line with Be2 and ...Nc6",
    description: "Black centralizes the queen safely and reaches a position where every piece has a clear job.",
    moves: ["e4", "d5", "exd5", "Qxd5", "Nc3", "Qa5", "d4", "Nf6", "Bd2", "Bg4", "Nf3", "Qf5", "Be2", "Nc6"],
    explanations: [
      ...QA5_INTRO,
      ...D4_NF6,
      ...BD2_BG4,
      "White develops toward castling and starts to untangle the pin.",
      "Black centralizes the queen on f5, where it pressures c2 and supports further development.",
      "White breaks the pin, but that costs another tempo.",
      "Black develops the knight and reaches an easy Scandinavian middlegame with pressure against the center."
    ]
  },
  {
    category: "Bc4 systems",
    id: "scandinavian-defense-10-bc4-qh5",
    name: "Bc4 line with queen on h5",
    description: "Black meets the bishop sortie with solid development and a direct queen shift to h5.",
    moves: ["e4", "d5", "exd5", "Qxd5", "Nc3", "Qa5", "Bc4", "Nf6", "d3", "Bg4", "Nf3", "e6", "Bd2", "Qh5"],
    explanations: [
      ...QA5_INTRO,
      "White develops the bishop aggressively and points straight at f7.",
      "Black develops calmly and covers the key central and kingside squares.",
      "White supports the center and opens the dark bishop, but the move order is a touch slow.",
      "Black pins and develops, asking White to spend time on coordination.",
      "White develops naturally and prepares kingside castling.",
      "Black supports the center and opens the dark bishop without losing momentum.",
      "White develops, but the bishop on d2 still has to babysit the queenside.",
      "Black puts the queen on h5, where it pressures h2 and makes White's kingside harder to handle casually."
    ]
  },
  {
    category: "Bc4 center break",
    id: "scandinavian-defense-11-ooo-e5-bb4",
    name: "Aggressive Bc4 line with ...O-O-O and ...e5",
    description: "A sharper Scandinavian where Black castles long and hits the center before White finishes coordinating.",
    moves: ["e4", "d5", "exd5", "Qxd5", "Nc3", "Qa5", "d4", "Nf6", "Bc4", "Bg4", "Nf3", "Nc6", "h3", "Qh5", "Be2", "O-O-O", "Be3", "e5", "d5", "Bb4"],
    explanations: [
      ...QA5_INTRO,
      ...D4_NF6,
      "White develops aggressively and hopes to make the queenside queen position look silly.",
      "Black develops with a pin instead of retreating into passivity.",
      "White develops and aims to castle quickly.",
      "Black adds another piece to the fight for d4 and prepares queenside castling.",
      "White questions the bishop, but h3 also creates a hook and weakens dark squares.",
      "Black keeps the queen active and preserves the pressure on h2.",
      "White resolves the pin, but this costs another tempo.",
      "Black castles long because the rook belongs on d8 in exactly these structures.",
      "White develops and tries to finish coordination before the center opens.",
      "Black strikes with ...e5 at the moment White's center is advanced but not fully stable.",
      "White pushes on, but the center is now fixed and can become a target instead of a strength.",
      "Black pins and pressures immediately, turning White's space advantage into something Black can attack."
    ]
  },
  {
    category: "Bf5 and ...Qb6",
    id: "scandinavian-defense-12-qb6-bc3-ooo",
    name: "Qb6 line with ...Nc6 and ...O-O-O",
    description: "Black keeps the bishop pair, accepts an ugly structure, and castles into active play.",
    moves: ["e4", "d5", "exd5", "Qxd5", "Nc3", "Qa5", "d4", "Nf6", "Nf3", "Bf5", "Bd2", "e6", "Ne4", "Qb6", "Nxf6+", "gxf6", "Bc3", "Nc6", "Bd3", "Bxd3", "Qxd3", "O-O-O"],
    explanations: [
      ...QA5_INTRO,
      ...D4_NF6,
      ...NF3_BF5,
      "White develops, but the bishop still does not solve Black's queenside pressure.",
      "Black consolidates and prepares the queen swing to b6.",
      "White centralizes the knight, hoping activity matters more than Black's concrete targets.",
      "Black attacks b2 and asks a direct question.",
      "White damages the kingside structure and hopes that long-term weaknesses will matter.",
      "Black accepts the structure because open files and active bishops are more important here.",
      "White improves the bishop, but the move is also slow.",
      "Black develops the last knight and increases pressure on d4.",
      "White challenges the active bishop and tries to simplify.",
      "Black accepts the trade because the queenside castling plan is already ready.",
      "White recaptures, but the queen on d3 can become a target once files open.",
      "Black castles long and brings the rook straight to the d file."
    ]
  },
  {
    category: "Endgame simplification",
    id: "scandinavian-defense-13-qf5-queen-trade",
    name: "Qf5 line with queen trade",
    description: "Black trades queens on favorable terms and reaches an easy structure to handle.",
    moves: ["e4", "d5", "exd5", "Qxd5", "Nc3", "Qa5", "d4", "Nf6", "Bd2", "Bg4", "Nf3", "Qf5", "Bd3", "Bxf3", "Qxf3", "Qxf3", "gxf3", "Nc6"],
    explanations: [
      ...QA5_INTRO,
      ...D4_NF6,
      ...BD2_BG4,
      "White develops toward castling and challenges the pin indirectly.",
      "Black centralizes the queen to f5, where both pressure and trade ideas appear.",
      "White offers a trade and hopes simplification will highlight Black's structural issues.",
      "Black removes a defender first to improve the queen-trade sequence.",
      "White must recapture to keep material balanced.",
      "Black trades queens because the resulting structure is easy for Black to play and White's kingside pawns become less healthy.",
      "White recaptures, but the doubled f-pawns make the king and endgame structure less comfortable.",
      "Black develops and reaches a very straightforward middlegame where White's center is no longer intimidating."
    ]
  },
  {
    category: "Bc4 systems",
    id: "scandinavian-defense-14-bc4-f3-bd7",
    name: "Bc4 and f3 met by ...Bd7",
    description: "If White chases too early, Black is happy to keep the bishop pair and play against the loosened dark squares.",
    moves: ["e4", "d5", "exd5", "Qxd5", "Nc3", "Qa5", "Bc4", "Nf6", "d3", "Bg4", "f3", "Bd7"],
    explanations: [
      ...QA5_INTRO,
      "White develops actively and aims at f7.",
      "Black develops calmly and keeps the structure under control.",
      "White supports the center, but the move order is a little slow.",
      "Black pins and develops at the same time.",
      "White kicks the bishop, but this weakens dark squares and delays castling.",
      "Black simply retreats; provoking f3 was already useful, so Black keeps the bishop pair and the better long-term target structure."
    ]
  },
  {
    category: "Bf5 structure",
    id: "scandinavian-defense-15-bd3-bxd3-qa6",
    name: "Bd3 exchange with ...Qa6",
    description: "A positional Scandinavian plan where Black simplifies one bishop and shifts the queen to a more useful angle.",
    moves: ["e4", "d5", "exd5", "Qxd5", "Nc3", "Qa5", "d4", "Nf6", "Nf3", "Bf5", "Bd3", "Bxd3", "Qxd3", "e6", "O-O", "Be7", "Bd2", "O-O", "Ne4", "Qa6"],
    explanations: [
      ...QA5_INTRO,
      ...D4_NF6,
      ...NF3_BF5,
      "White offers the bishop trade to reduce Black's active light-squared bishop.",
      "Black accepts because trading this bishop often makes the Scandinavian easier to handle strategically.",
      "White recaptures with the queen and keeps pieces centralized.",
      "Black stabilizes the center and opens the dark bishop.",
      "White castles and says the middlegame should now favor the side with more space.",
      "Black develops calmly and keeps the structure durable.",
      "White develops and supports the center, but the pieces are still tied to protecting d4.",
      "Black castles and completes king safety without any concessions.",
      "White centralizes a knight, but fixed central squares also give Black clearer targets.",
      "Black moves the queen to a6, where it pressures the queenside and sidesteps direct attacks."
    ]
  },
  {
    category: "Bc4 systems",
    id: "scandinavian-defense-16-bc4-f3-quick-bd7",
    name: "Bc4 line with immediate ...Bd7",
    description: "A short practical branch where Black accepts the bishop retreat and keeps White's kingside slightly loose.",
    moves: ["e4", "d5", "exd5", "Qxd5", "Nc3", "Qa5", "d4", "Nf6", "Bc4", "Bg4", "f3", "Bd7"],
    explanations: [
      ...QA5_INTRO,
      ...D4_NF6,
      "White develops aggressively and targets f7.",
      "Black develops with a pin instead of wasting time on passive defense.",
      "White chases the bishop, but the pawn move weakens dark squares and delays castling.",
      "Black calmly retreats because the bishop already provoked the concession Black wanted."
    ]
  },
  {
    category: "Simple development",
    id: "scandinavian-defense-17-bc4-oo-bg4",
    name: "Nf3 Bc4 setup with early castling",
    description: "White castles quickly, but Black still gets active development and pressure against the center.",
    moves: ["e4", "d5", "exd5", "Qxd5", "Nc3", "Qa5", "Nf3", "Nf6", "Bc4", "Nc6", "O-O", "Bg4"],
    explanations: [
      ...QA5_INTRO,
      "White develops the king knight first and keeps flexible options.",
      "Black matches development and keeps e4 under control.",
      "White develops the bishop actively and points at f7.",
      "Black develops naturally and increases central control.",
      "White castles and says the initiative should matter now.",
      "Black pins the knight and reminds White that fast castling alone does not solve the central problems."
    ]
  },
  {
    category: "Simple development",
    id: "scandinavian-defense-18-bf4-bf5",
    name: "Bf4 setup met by ...Bf5",
    description: "A straightforward Scandinavian answer where Black mirrors activity and keeps the structure clean.",
    moves: ["e4", "d5", "exd5", "Qxd5", "Nc3", "Qa5", "d4", "Nf6", "Bf4", "Bf5"],
    explanations: [
      ...QA5_INTRO,
      ...D4_NF6,
      "White develops the bishop actively, often aiming for long-term pressure on c7 and e5.",
      "Black mirrors with the most important Scandinavian positional idea: get the bishop out before ...e6 and make the structure easy to play."
    ]
  },
  {
    category: "Bg4 tactics",
    id: "scandinavian-defense-19-qf5-bishop-trick",
    name: "Qf5 tactic winning White's queen",
    description: "Black's active pieces exploit an overloaded bishop and a back-rank tactical flaw.",
    moves: ["e4", "d5", "exd5", "Qxd5", "Nc3", "Qa5", "d4", "Nf6", "Bd2", "Bg4", "Nf3", "Qf5", "Bd3", "Bxf3", "Bxf5", "Bxd1", "Rxd1", "e6"],
    explanations: [
      ...QA5_INTRO,
      ...D4_NF6,
      ...BD2_BG4,
      "White develops toward castling and hopes the pin can be managed later.",
      "Black centralizes the queen to f5, where tactical ideas against d3 and c2 start to appear.",
      "White blocks with the bishop, but this piece is now overloaded.",
      "Black removes the knight defender first to clear the tactical sequence.",
      "White recaptures, but that bishop has now abandoned a critical defensive task.",
      "Black takes on d1 and wins the queen because the tactical geometry on the back rank now works perfectly.",
      "White must recapture to avoid losing even more material.",
      "Black consolidates and opens the dark bishop, reaching a winning material advantage."
    ]
  },
  {
    category: "Simple development",
    id: "scandinavian-defense-20-bc4-e6-c6",
    name: "Bc4 setup with ...e6 and ...c6",
    description: "Black chooses a no-nonsense structure, blunts White's activity, and keeps d5 completely under control.",
    moves: ["e4", "d5", "exd5", "Qxd5", "Nc3", "Qa5", "d4", "Nf6", "Nf3", "Bf5", "Bc4", "e6", "O-O", "c6"],
    explanations: [
      ...QA5_INTRO,
      ...D4_NF6,
      ...NF3_BF5,
      "White develops aggressively and targets f7.",
      "Black supports the center and opens the dark bishop without losing coordination.",
      "White castles and says the initiative should now favor White.",
      "Black plays ...c6 to clamp d5, prepare ...Nbd7, and make the queen on a5 fully justified."
    ]
  },
  {
    category: "Bg4 systems",
    id: "scandinavian-defense-21-nge2-e6",
    name: "Bg4 line with Nge2 and ...e6",
    description: "White keeps options open, but Black still gets the cleaner structure and a clear target on the center.",
    moves: ["e4", "d5", "exd5", "Qxd5", "Nc3", "Qa5", "d4", "Nf6", "Bd2", "Bg4", "f3", "Bd7", "Bc4", "Qb6", "Nge2", "e6"],
    explanations: [
      ...QA5_INTRO,
      ...D4_NF6,
      ...BD2_BG4,
      "White chases the bishop, but the move weakens dark squares and slows kingside development.",
      "Black retreats because the bishop already provoked a concession.",
      "White develops actively and hopes to use space before Black is fully coordinated.",
      "Black improves the queen and attacks b2 and d4 from a stronger angle.",
      "White keeps the knight flexible, but that also leaves the king in the center for longer.",
      "Black consolidates with ...e6 and reaches the kind of stable Scandinavian position that is very easy to play."
    ]
  },
  {
    category: "Simple development",
    id: "scandinavian-defense-22-be2-e6-c6",
    name: "Be2 setup with ...e6 and ...c6",
    description: "A calm Scandinavian branch where Black finishes development into a durable, low-risk structure.",
    moves: ["e4", "d5", "exd5", "Qxd5", "Nc3", "Qa5", "d4", "Nf6", "Nf3", "Bf5", "Be2", "e6", "O-O", "c6"],
    explanations: [
      ...QA5_INTRO,
      ...D4_NF6,
      ...NF3_BF5,
      "White chooses a quieter bishop square, which also means the initiative claim is quieter.",
      "Black supports the center and opens the dark bishop while keeping the structure intact.",
      "White castles and reaches a normal shell.",
      "Black locks down d5 with ...c6 and reaches one of the cleanest Scandinavian structures to handle."
    ]
  },
  {
    category: "Endgame simplification",
    id: "scandinavian-defense-23-gxf3-qd7",
    name: "Qf5 line with gxf3 and ...Qd7",
    description: "Black forces structural damage and keeps the queen on the board to continue pressing.",
    moves: ["e4", "d5", "exd5", "Qxd5", "Nc3", "Qa5", "d4", "Nf6", "Bd2", "Bg4", "Nf3", "Qf5", "Bd3", "Bxf3", "gxf3", "Qd7"],
    explanations: [
      ...QA5_INTRO,
      ...D4_NF6,
      ...BD2_BG4,
      "White develops toward castling and starts asking how Black will handle the pin.",
      "Black centralizes the queen to f5 and keeps both pressure and trade ideas alive.",
      "White blocks with the bishop, but the piece is now tied to defensive work.",
      "Black exchanges on f3 first because White's kingside structure is the most practical target.",
      "White recaptures, but the doubled f-pawns leave the king less comfortable and create long-term endgame issues.",
      "Black keeps the queens on and returns the queen to a safe square, ready to continue pressing against White's damaged structure."
    ]
  },
  {
    category: "Bf5 center pressure",
    id: "scandinavian-defense-24-bb4-re1-oo",
    name: "Bb4 line with ...O-O after Re1",
    description: "A clean branch where Black develops logically and keeps the central tension under control.",
    moves: ["e4", "d5", "exd5", "Qxd5", "Nc3", "Qa5", "d4", "Nf6", "Nf3", "Bf5", "Bd2", "e6", "Bc4", "Bb4", "a3", "Bxc3", "Bxc3", "Qb6", "O-O", "Nc6", "Re1", "O-O"],
    explanations: [
      ...QA5_INTRO,
      ...D4_NF6,
      ...NF3_BF5,
      "White develops, but the bishop on d2 still has not solved Black's activity.",
      "Black supports the center and prepares to complete development.",
      "White develops actively and points at f7.",
      "Black hits the bishop structure and asks White to clarify the queenside.",
      "White gains space, but the pawn can also become a target.",
      "Black gives up the bishop pair to damage White's coordination and simplify the position.",
      "White recaptures, but the bishop on c3 is not always ideally placed.",
      "Black keeps pressure on the queenside and center.",
      "White castles and finishes king safety.",
      "Black develops and keeps a close eye on d4 and e5.",
      "White places the rook on the central file and prepares to support a future break.",
      "Black castles and reaches a healthy, fully coordinated Scandinavian middlegame."
    ]
  },
  {
    category: "Bf5 and ...Qb6",
    id: "scandinavian-defense-25-ne5-qb6",
    name: "Ne5 line with queen on b6",
    description: "A useful tactical motif where White attacks the queen and Black answers with a fork setup.",
    moves: ["e4", "d5", "exd5", "Qxd5", "Nc3", "Qa5", "d4", "Nf6", "Nf3", "Bf5", "Bd2", "e6", "Ne5", "Qb6"],
    explanations: [
      ...QA5_INTRO,
      ...D4_NF6,
      ...NF3_BF5,
      "White develops, but the bishop on d2 still leaves Black's queen route to b6 available.",
      "Black supports the center and clears the dark bishop, keeping the structure easy to handle.",
      "White jumps into e5, attacking the queen and trying to turn development into initiative.",
      "Black calmly shifts to b6, where the queen sidesteps the attack and often creates tactical pressure against d4 and b2 at the same time."
    ]
  }
]);
