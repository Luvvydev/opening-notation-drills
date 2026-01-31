// src/openings/londonLines.js

// SEO / page intro text for London System drills
export const londonSEOText = `
The London System is a solid, low theory chess opening for White starting with d4 and Bf4.
It focuses on reliable development, strong pawn structure, and repeatable move orders
rather than sharp tactical battles.

This page is designed for players who already know the rules of chess and want to
memorize London System move orders through repetition. The drills emphasize correct
piece placement, common setups, and typical early middlegame transitions.

If your London games fall apart because you forget the move order, these drills are
meant to lock the structure into memory rather than teach abstract strategy.
`;

export const londonLines = [
  // Categories: Classic London, Early ...c5 Systems, Anti-Bishop Ideas, Jobava, Aggressive Plans

  {
    category: "Classic London",
    id: "london-classic-solid-setup",
    name: "London Classic: solid setup",
    description: "Baseline London: develop naturally, meet ...Bd6 with Nbd2, and castle.",
    moves: ["d4", "d5", "Bf4", "Nf6", "e3", "e6", "Nf3", "Bd6", "Nbd2", "O-O"],
    explanations: [
      "Claim central space and keep flexible options for a London structure.",
      "Black matches the center and contests d4.",
      "Develop the bishop before locking it in with e3.",
      "Black develops and adds pressure to e4 and d5 squares.",
      "Stabilize d4 and open lines for the light bishop and queen.",
      "Black supports d5 and opens lines for the dark-squared bishop.",
      "Develop and support the center.",
      "Black often tries to trade the London bishop to reduce your pressure.",
      "Support e4 ideas later, reinforce the center, and keep pieces coordinated.",
      "Black finishes basic king safety and connects rooks."
    ]
  },

  {
    id: "london-c3-nbd2",
    name: "London with early c3 and Nbd2",
    description: "Triangle structure: c3 supports d4 and keeps a slow, solid center.",
    moves: ["d4", "d5", "Bf4", "Nf6", "e3", "e6", "Nf3", "Bd6", "c3", "O-O", "Nbd2"],
    explanations: [
      "Take space and make ...e5 harder.",
      "Black mirrors the central claim.",
      "Commit to the London bishop placement early.",
      "Black develops and contests the middle.",
      "Reinforce d4 and open the diagonal for the f1 bishop.",
      "Black supports d5 and prepares ...Bd6 or ...c5.",
      "Develop and keep options for c4 or e3 structures.",
      "Black wants to trade your active bishop on f4.",
      "Build the London triangle, support d4, and reduce early tactics on b2.",
      "Black secures the king and finishes basic development.",
      "Develop while supporting e4 ideas and keeping pieces flexible."
    ]
  },

  {
    id: "london-vs-bf5",
    name: "London vs early ...Bf5",
    description: "Black mirrors the bishop. You develop calmly and prepare Bd3 ideas.",
    moves: ["d4", "d5", "Bf4", "Bf5", "e3", "e6", "Nf3", "Bd6", "Bd3"],
    explanations: [
      "Take the center first and define the structure.",
      "Black matches the center and keeps symmetry.",
      "Develop the bishop before locking it in with e3.",
      "Black mirrors, contesting your bishop and controlling e4.",
      "Solidify the center and open your light bishop and queen.",
      "Black supports d5 and keeps the option of ...Bd6.",
      "Develop and keep your pawn structure flexible.",
      "Black also develops and often aims for bishop trades.",
      "Challenge the bishop on f5 and prepare a clear development plan."
    ]
  },

  {
    id: "london-vs-early-c5",
    name: "London vs early ...c5",
    description: "Meet the early pawn strike with simple development and support for d4.",
    moves: ["d4", "d5", "Bf4", "Nf6", "e3", "c5", "Nf3", "Nc6", "Nbd2"],
    explanations: [
      "Establish central space so Black has to challenge it.",
      "Black mirrors and keeps central tension.",
      "Develop the bishop before committing to e3.",
      "Black develops and eyes e4 and d5 squares.",
      "Reinforce d4 and keep the structure stable.",
      "Black strikes at d4 early, typical counterplay versus London setups.",
      "Develop and prepare to support d4 against pressure.",
      "Black adds more pressure on d4 and increases central control.",
      "Support the center and prepare flexible recaptures and e4 later."
    ]
  },

  {
    id: "london-vs-c5-qb6",
    name: "London vs ...c5 and ...Qb6",
    description: "A common plan: Black hits b2 and d4. Nc3 is a direct practical defense.",
    moves: ["d4", "d5", "Bf4", "Nf6", "e3", "c5", "Nf3", "Qb6", "Nc3"],
    explanations: [
      "Claim the center and invite a structured defense.",
      "Black mirrors and supports central play.",
      "London bishop out before e3 locks it in.",
      "Black develops and adds central pressure.",
      "Stabilize the center and open pieces.",
      "Black attacks d4 and tries to open lines early.",
      "Develop and keep your structure flexible.",
      "Black attacks b2 and increases pressure on d4.",
      "Defend d5 and b2 indirectly, develop, and keep central options."
    ]
  },

  {
    id: "london-vs-nh5",
    name: "London vs early ...Nh5",
    description: "Black tries to chase your bishop. Be5 is a direct, simple response.",
    moves: ["d4", "d5", "Bf4", "Nf6", "e3", "Nh5", "Be5", "Nd7"],
    explanations: [
      "Take central space and set up a stable structure.",
      "Black matches the center and keeps symmetry.",
      "Place the bishop actively before e3.",
      "Black develops and prepares to contest e4.",
      "Support d4 and open the dark bishop and queen.",
      "Black immediately targets the bishop on f4.",
      "Keep the bishop on a useful diagonal and avoid being forced to retreat passively.",
      "Black develops and supports potential ...f6 ideas later."
    ]
  },

  {
    id: "london-early-dxc5",
    name: "London with early dxc5",
    description: "A practical capture to change the structure and force Black to react.",
    moves: ["d4", "d5", "Bf4", "Nf6", "e3", "c5", "dxc5", "e6"],
    explanations: [
      "Establish central presence.",
      "Black mirrors and keeps central contact.",
      "Develop the bishop before e3.",
      "Black develops and contests the center.",
      "Support d4 and open the light bishop and queen.",
      "Black strikes at d4 and tries to open lines.",
      "Take the c5 pawn to change the structure and reduce pressure on d4 for the moment.",
      "Black supports the center and prepares to recapture or develop smoothly."
    ]
  },

  {
    id: "london-exchange-cxd4",
    name: "London vs ...cxd4 exchange",
    description: "Black exchanges on d4. You recapture and keep development moving.",
    moves: ["d4", "d5", "Bf4", "Nf6", "e3", "c5", "Nf3", "Nc6", "c3", "cxd4", "exd4"],
    explanations: [
      "Take the center and define the pawn structure.",
      "Black mirrors and contests the center.",
      "London bishop to an active square before e3.",
      "Black develops and increases central influence.",
      "Support d4 and prepare to recapture if exchanges happen.",
      "Black attacks d4 and looks for early counterplay.",
      "Develop and keep options for c4 or e3 structures.",
      "Black develops and adds more pressure on the center.",
      "Recapture cleanly, keep structure coherent, and open lines for your pieces.",
      "Keep development consistent and the move order legal.",
      "Keep development consistent and the move order legal."
    ]
  },

  {
    id: "london-preserve-bishop-bg3",
    name: "Preserve bishop vs ...Bd6",
    description: "When Black plays ...Bd6, Bg3 avoids the bishop trade and keeps your pressure.",
    moves: ["d4", "d5", "Bf4", "Nf6", "e3", "e6", "Nf3", "Bd6", "Bg3"],
    explanations: [
      "Claim the center first.",
      "Black matches and fights for central squares.",
      "Develop the bishop outside the pawn chain.",
      "Black develops and contests e4.",
      "Stabilize d4 and open your pieces.",
      "Black supports d5 and opens their dark bishop.",
      "Develop and support central play.",
      "Black aims to trade off your London bishop.",
      "Keep the bishop, avoid the trade, and maintain long-term pressure."
    ]
  },

  {
    id: "london-trade-bishop-bxd6",
    name: "Trade bishop intentionally",
    description: "Sometimes you accept the trade to simplify and play a straightforward structure.",
    moves: ["d4", "d5", "Bf4", "Nf6", "e3", "e6", "Nf3", "Bd6", "Bxd6"],
    explanations: [
      "Take the center and define the structure.",
      "Black mirrors and contests central space.",
      "Place the bishop actively before e3.",
      "Black develops and contests e4 and d5 squares.",
      "Support d4 and open your light bishop and queen.",
      "Black supports the center and prepares development.",
      "Develop and keep your setup flexible.",
      "Black offers a bishop trade to reduce your activity.",
      "Trade on d6 if you prefer a simpler position and clear plans."
    ]
  },

  {
    id: "london-early-h3",
    name: "London with early h3",
    description: "A slow move to limit ...Bg4 pins and prepare safe kingside development.",
    moves: ["d4", "d5", "Bf4", "Nf6", "e3", "e6", "Nf3", "Bd6", "h3"],
    explanations: [
      "Take central space and keep flexible development.",
      "Black matches the center and keeps contact.",
      "Develop the bishop before the structure is fixed.",
      "Black develops and contests key central squares.",
      "Reinforce d4 and open lines for pieces.",
      "Black supports d5 and opens the dark bishop.",
      "Develop and support the center.",
      "Black often wants to trade the London bishop.",
      "Reduce ...Bg4 pins and give your kingside pieces more freedom."
    ]
  },

  {
    id: "london-early-ne5",
    name: "London with early Ne5",
    description: "An aggressive outpost idea: Ne5 pressures c6 and f7 and can support kingside play.",
    moves: ["d4", "d5", "Bf4", "Nf6", "e3", "e6", "Nf3", "Bd6", "Ne5"],
    explanations: [
      "Take the center and claim space.",
      "Black mirrors and contests d4.",
      "Develop actively before e3 locks the bishop.",
      "Black develops and increases central influence.",
      "Stabilize d4 and open your light bishop and queen.",
      "Black supports d5 and prepares to develop pieces.",
      "Develop and keep your pawn structure flexible.",
      "Black aims to trade off your active bishop.",
      "Centralize and create a useful outpost that can support an e4 break or kingside plans."
    ]
  },

  {
    category: "Jobava London",
    id: "jobava-nc3-first",
    name: "Jobava London: Nc3 first",
    description: "Jobava style: Nc3 comes early, making the setup more direct and tactical.",
    moves: ["d4", "d5", "Bf4", "Nf6", "Nc3", "e6", "e3", "Bd6"],
    explanations: [
      "Take central space and keep options open.",
      "Black mirrors and contests the center.",
      "Develop the bishop actively as in the London family.",
      "Black develops and contests the center.",
      "Develop aggressively and prepare quick piece coordination.",
      "Black supports d5 and prepares ...Bd6.",
      "Stabilize d4 and open lines for development.",
      "Black aims to trade the bishop and reduce activity."
    ]
  },

  {
    id: "jobava-vs-c5",
    name: "Jobava vs ...c5",
    description: "Black hits the center early. You keep development and structure stable.",
    moves: ["d4", "d5", "Bf4", "Nf6", "Nc3", "c5", "e3", "Nc6"],
    explanations: [
      "Claim the center and define a main structure.",
      "Black matches the center.",
      "Develop the bishop actively, keeping options for e3.",
      "Black develops and contests central squares.",
      "Develop early and increase central influence.",
      "Black immediately pressures d4 and seeks counterplay.",
      "Support d4 and open lines for development.",
      "Black adds pressure on d4 and supports central play."
    ]
  },

  {
    id: "london-vs-bg4-pin",
    name: "London vs ...Bg4 pin",
    description: "Black pins early. You continue development and decide later how to respond.",
    moves: ["d4", "d5", "Bf4", "Nf6", "e3", "Bg4", "Nf3", "e6", "Nbd2", "Bd6"],
    explanations: [
      "Take central space and establish a stable base.",
      "Black mirrors and contests the center.",
      "Develop the bishop outside the pawn chain.",
      "Black develops and increases central influence.",
      "Stabilize d4 and open the light bishop and queen.",
      "Black supports d5 and prepares bishop development.",
      "Develop and keep your c pawn flexible.",
      "Black often tries to trade your bishop on f4.",
      "Develop and prepare to unpin or support e4.",
      "Black pins the knight and increases development pressure."
    ]
  },

  {
    id: "london-vs-qb6-no-c5",
    name: "London vs early ...Qb6 without c5",
    description: "Black often uses ...c5 then ...Qb6 to pressure b2 and d4. Nc3 is a direct defense and develops a piece.",
    moves: ["d4", "d5", "Bf4", "Nf6", "e3", "c5", "Nc3", "Qb6"],
    explanations: [
      "Take the center and define the structure early.",
      "Black matches and contests d4.",
      "Develop actively before e3.",
      "Black develops and fights for the center.",
      "Support d4 and open lines for development.",
      "Black plays ...c5 to hit d4 and open the diagonal for the queen.",
      "Nc3 defends d5/e4 ideas and supports d5 and b5 squares while developing.",
      "Now ...Qb6 is legal and adds pressure on b2 and d4."
    ]
  },

  {
    id: "london-h4-idea",
    name: "London with kingside expansion idea",
    description: "h4 is a commitment. It tries to gain space and can support an attack, but it creates targets.",
    moves: ["d4", "d5", "Bf4", "Nf6", "e3", "e6", "Nf3", "Bd6", "h4"],
    explanations: [
      "Claim space and define a stable structure.",
      "Black mirrors and contests the center.",
      "Place the bishop actively before e3.",
      "Black develops and contests key squares.",
      "Reinforce d4 and open the light bishop and queen.",
      "Black supports d5 and opens the dark bishop.",
      "Develop and keep pawn structure options open.",
      "Black aims to trade the bishop and reduce activity.",
      "Gain kingside space and signal aggressive intentions, with the cost of weakening squares."
    ]
  },

  {
    id: "london-long-castle-idea",
    name: "London with long castle idea",
    description: "A plan to castle long later. Qd2 connects pieces and supports queenside coordination.",
    moves: ["d4", "d5", "Bf4", "Nf6", "e3", "e6", "Nf3", "Bd6", "Nc3", "O-O", "Qd2"],
    explanations: [
      "Take the center and establish space.",
      "Black mirrors and contests central squares.",
      "Develop the bishop actively before e3.",
      "Black develops and increases central influence.",
      "Stabilize d4 and open your light bishop and queen.",
      "Black supports d5 and opens the dark bishop.",
      "Develop and keep your structure flexible.",
      "Black aims for a bishop trade.",
      "Develop and support central play, often preparing queenside coordination.",
      "Black secures the king and completes basic development.",
      "Connect pieces and keep the option of long castling in some structures."
    ]
  },

  {
    id: "london-c4-transition",
    name: "London into Colle-style center",
    description: "c4 changes the structure toward Queen's Gambit style play and increases central tension.",
    moves: ["d4", "d5", "Bf4", "Nf6", "e3", "e6", "Nf3", "Bd6", "c4"],
    explanations: [
      "Establish a central pawn and claim space.",
      "Black mirrors and contests the center.",
      "London bishop out before e3 locks it in.",
      "Black develops and increases central influence.",
      "Stabilize d4 and open lines for your pieces.",
      "Black supports d5 and prepares development.",
      "Develop and keep options open for c4 or e3.",
      "Black aims to trade your bishop and reduce activity.",
      "Increase central tension and transition into a more open center structure."
    ]
  },

  {
    id: "london-e4-break-ne5-plan",
    name: "London into e4 break",
    description: "Ne5 often supports an e4 plan later and creates more active piece play.",
    moves: ["d4", "d5", "Bf4", "Nf6", "e3", "e6", "Nf3", "Bd6", "Nbd2", "O-O", "Ne5"],
    explanations: [
      "Take central space and define the structure.",
      "Black mirrors and contests d4.",
      "Develop actively before e3 locks the bishop.",
      "Black develops and fights for central squares.",
      "Stabilize d4 and open the light bishop and queen.",
      "Black supports d5 and opens development options.",
      "Develop and keep your pawn structure flexible.",
      "Black aims to trade your active bishop.",
      "Develop and prepare e4 ideas with better support.",
      "Black completes king safety and development.",
      "Create an outpost and support more active central play, often connected to an eventual e4 break."
    ]
  },



  {
    id: "london-line-01-nb5-nc7-tactic",
    name: "Tactic: Nb5 and Nc7+ fork",
    description: "Sharp line where Nb5 and Nc7+ appear after early ...c5 and ...e5.",
    moves: ["d4","d5","Bf4","Nf6","e3","c5","Nc3","Nc6","Nb5","e5","Bxe5","Nxe5","dxe5","Ne4","Qxd5","Qxd5","Nc7+","Kd8","Nxd5","Be6","c4"],
    explanations: [
      "Take space and keep a London structure available.",
      "Black mirrors the center and keeps symmetry.",
      "Develop the bishop before locking it in with e3.",
      "Develop and contest e4 and d5.",
      "Support d4 and open the dark bishop and queen.",
      "Immediate pressure on d4 and a typical counterpunch.",
      "Defend d5 pressure points and add central control.",
      "Add more pressure on d4 and support ...e5 ideas.",
      "Aim at c7 and set up a concrete tactical threat.",
      "Try to kick the bishop and open lines quickly.",
      "Take the pawn while the tactics still hold.",
      "Recover material and centralize a piece.",
      "Remove the knight and open lines in the center.",
      "Hit c3 and create threats against f2 and d2 squares.",
      "Grab the pawn and steer into simplification.",
      "Black trades queens to reduce tactics.",
      "Fork check to win time and usually win material.",
      "Step out of check, often forced.",
      "Consolidate by taking material and stabilizing the position.",
      "Develop and contest key central squares.",
      "Gain space and limit Black's central breaks."
    ]
  },

  {
    id: "london-line-02-ne5-bb5-simplify",
    name: "Ne5 and Bb5+ simplification",
    description: "Ne5 plus Bb5+ often forces a block and leads to clean trades.",
    moves: ["d4","d5","Bf4","Nf6","e3","e6","Nf3","Bd6","Ne5","c5","Bb5+","Bd7","Nxd7","Nbxd7","Bxd6"],
    explanations: [
      "Claim central space.",
      "Black matches the center.",
      "Develop actively before committing to e3.",
      "Develop and contest e4.",
      "Support d4 and open your pieces.",
      "Solidify d5 and prepare ...Bd6.",
      "Develop and keep king safety simple.",
      "Challenge your bishop and develop a piece.",
      "Use the outpost and put immediate questions to Black's setup.",
      "Strike at d4 and try to generate counterplay.",
      "Force a reply and reduce Black's flexibility.",
      "Block and invite trades.",
      "Trade off a defender and simplify.",
      "Recapture while keeping development coherent.",
      "Accept a trade to reach a straightforward structure."
    ]
  },

  {
    id: "london-line-03-qa5-nc7-fork",
    name: "Qa5+ and Nc7+ fork motif",
    description: "After ...Qa5+ and ...e5, the Nc7+ fork often decides the line quickly.",
    moves: ["d4","d5","Bf4","e6","e3","c5","Nf3","Nc6","Nc3","Nf6","Nb5","Qa5+","c3","e5","Nxe5","c4","Nxc4","dxc4","Nc7+"],
    explanations: [
      "Take the center and keep London options.",
      "Black mirrors and contests central space.",
      "Develop the bishop before e3 locks it in.",
      "Support d5 and open lines for Black's dark bishop.",
      "Stabilize d4 and prepare development.",
      "Attack d4 and start counterplay.",
      "Develop and guard central squares.",
      "Add pressure on d4 and support ...e5.",
      "Increase control of d5 and e4 and support Nb5 ideas.",
      "Develop and contest the center.",
      "Aim directly at c7 and set up tactics.",
      "Check plus pressure on c3 and a2, also nudging you into c3.",
      "Block the check and hold the d4 structure together.",
      "Strike the center and try to punish the Nb5 setup.",
      "Take the pawn and keep tactics alive.",
      "Gain space and hit the knight on d3 and b3 squares later.",
      "Recover a pawn and keep the knight active.",
      "Black takes back and opens the d file and diagonal.",
      "Fork check that usually wins material or forces an awkward king move."
    ]
  },

  {
    id: "london-line-04-qa5-qxd5-hit",
    name: "Qa5+ and Qxd5 grab",
    description: "A sharp Nb5 line where White often wins a pawn with Qxd5.",
    moves: ["d4","d5","Bf4","c5","e3","Nc6","Nc3","Nf6","Nb5","Qa5+","c3","e5","Bxe5","Nxe5","dxe5","Nd7","Qxd5"],
    explanations: [
      "Take central space.",
      "Black mirrors the center.",
      "Develop the bishop outside the pawn chain.",
      "Pressure d4 early.",
      "Support d4 and open your pieces.",
      "Add pressure on d4 and support ...e5.",
      "Develop and keep Nb5 tactics available.",
      "Develop and contest e4.",
      "Put pressure on c7 and threaten tactics.",
      "Check that also hits c3 ideas.",
      "Block the check and stabilize the center.",
      "Strike at the bishop and center.",
      "Take while the tactic works.",
      "Black recovers and centralizes.",
      "Remove the knight and open lines.",
      "Re-route to recapture or cover key squares.",
      "Grab the pawn and reduce Black's initiative."
    ]
  },

  {
    id: "london-line-05-f6-e5-gambit",
    name: "...f6 and ...e5 gambit idea",
    description: "Black tries to force open play with ...f6 and ...e5. White takes and simplifies.",
    moves: ["d4","d5","Bf4","Nc6","e3","f6","Nf3","e5","dxe5","fxe5","Nxe5","Nxe5","Bxe5"],
    explanations: [
      "Take the center.",
      "Black mirrors and contests space.",
      "Develop before e3 locks the bishop.",
      "Support ...e5 and develop a piece.",
      "Solidify d4 and open your pieces.",
      "Support ...e5 but weaken dark squares and king safety.",
      "Develop and prepare to meet ...e5.",
      "Challenge the center immediately.",
      "Accept the challenge and remove central tension.",
      "Black recaptures and opens the f file.",
      "Take the pawn and hit c6 and f7 squares.",
      "Black trades to reduce White activity.",
      "Recapture with the bishop and keep a clean position."
    ]
  },

  {
    id: "london-line-06-ne5-bxf4-nxc5",
    name: "Ne5 line with ...Bxf4 and Nxc5+",
    description: "A forcing variation where Black takes on f4 and White picks up c5 with check.",
    moves: ["d4","d5","Bf4","Nf6","e3","e6","Nf3","Bd6","Ne5","c5","Bb5+","Bd7","Nxd7","Bxf4","Nxc5+"],
    explanations: [
      "Claim central space.",
      "Black mirrors the center.",
      "Develop actively.",
      "Develop and contest e4.",
      "Support d4 and open your pieces.",
      "Solidify d5 and open Black's bishop.",
      "Develop and prepare to castle.",
      "Challenge the bishop and develop.",
      "Centralize and create direct pressure.",
      "Strike at d4 and create counterplay.",
      "Force a response and improve your piece activity.",
      "Block and offer trades.",
      "Trade a piece to simplify.",
      "Black grabs the bishop, removing a key London piece.",
      "Win the c5 pawn with check and gain tempo."
    ]
  },

  {
    id: "london-line-07-king-attack-sac",
    name: "Kingside attack: Bxh7+ sac line",
    description: "A concrete attacking line with Bxh7+ and a follow-up attack on the king.",
    moves: ["d4","d5","Bf4","Nf6","e3","e6","Nf3","Bd6","Ne5","O-O","Nd2","c5","c3","Nc6","Bd3","Bxe5","dxe5","Nd7","Nf3","Qc7","Bxh7+","Kxh7","Ng5+","Kg6","Qc2+","f5","exf6+","Kxf6","Nh7+","Kf7","Bxc7"],
    explanations: [
      "Take the center.",
      "Black mirrors and contests space.",
      "Develop the bishop before e3.",
      "Develop and contest e4.",
      "Support d4 and open pieces.",
      "Solidify d5 and prepare development.",
      "Develop and keep king safety options.",
      "Challenge your bishop and develop.",
      "Centralize and point pieces toward the kingside.",
      "Black secures the king.",
      "Support e4 ideas and keep pieces coordinated.",
      "Strike at d4 and open lines.",
      "Support d4 and control central squares.",
      "Develop and add pressure on d4 and e5.",
      "Aim at h7 and build attacking chances.",
      "Black removes the knight to reduce pressure.",
      "Keep a strong pawn center and open the d file.",
      "Reposition to challenge e5 and defend key squares.",
      "Re-develop and keep the attack alive.",
      "Support ...Nxe5 ideas and defend h7 indirectly.",
      "Sacrifice for king exposure if the follow-up is known.",
      "Accept the sacrifice and step onto an exposed square.",
      "Force the king to move and keep initiative.",
      "King runs forward to avoid immediate mates.",
      "Bring the queen in with check and keep threats going.",
      "Block lines and try to kick attackers away.",
      "Open lines and keep forcing play.",
      "Black takes and tries to stabilize with extra material.",
      "Keep checking to avoid losing momentum.",
      "King heads back toward safety.",
      "Pick up material while the king is still awkward."
    ]
  },

  {
    id: "london-line-08-f5-long-castle",
    name: "Long castle plan into ...f5",
    description: "Both sides commit: White castles long, Black plays ...f5 and clamps the center.",
    moves: ["d4","d5","Bf4","Nf6","e3","Nc6","Nf3","e6","Nbd2","Bd6","Ne5","O-O","c3","Ne4","Nxe4","dxe4","Qc2","f5","O-O-O"],
    explanations: [
      "Take central space.",
      "Black mirrors the center.",
      "Develop the bishop before locking it in.",
      "Develop and contest e4.",
      "Support d4 and open pieces.",
      "Develop and support ...e5 or ...c5.",
      "Develop and prepare to castle.",
      "Solidify d5 and open development.",
      "Support e4 ideas and keep options flexible.",
      "Challenge your bishop and develop.",
      "Centralize and define the plan.",
      "Black secures the king.",
      "Support d4 and reduce tactical hits on b2.",
      "Black grabs the outpost and trades pieces.",
      "Remove the centralized knight.",
      "Black recaptures and opens central files.",
      "Support e4 pressure and prepare kingside or queenside plans.",
      "Fix the center and claim space on the kingside.",
      "Commit to opposite-side castling and a more concrete game."
    ]
  },

  {
    id: "london-line-09-c6-qb3-queen-trade",
    name: "c6 and Qb3 queen trade",
    description: "A common practical line: Qb3 invites a queen trade and leads to a minority structure.",
    moves: ["d4","d5","Bf4","c6","e3","Nf6","c4","Bf5","Qb3","Qb6","c5","Qxb3","axb3"],
    explanations: [
      "Take the center.",
      "Black mirrors and keeps symmetry.",
      "Develop the bishop outside the pawn chain.",
      "Solid support for d5 and prepare ...Bf5.",
      "Support d4 and open your pieces.",
      "Develop and contest e4.",
      "Increase central tension and shift toward QG structures.",
      "Develop and contest your bishop's diagonal.",
      "Pressure b7 and d5 and ask an early question.",
      "Meet the pressure and offer simplification.",
      "Gain space and lock the queenside.",
      "Trade queens to reduce complexity.",
      "Recapture and accept doubled pawns for structure and open a file."
    ]
  },

  {
    id: "london-line-10-mirror-bf5-c4",
    name: "Mirror bishops with early c4",
    description: "Symmetry with ...Bf5. White plays c4 and heads into a Queen's Gambit style center.",
    moves: ["d4","d5","Bf4","Bf5","c4","e6","Nc3","Nf6","e3"],
    explanations: [
      "Take central space.",
      "Black mirrors and contests the center.",
      "Develop actively.",
      "Black mirrors and fights for e4.",
      "Increase central tension and challenge d5 directly.",
      "Support d5 and open the dark bishop.",
      "Develop and add control of d5.",
      "Develop and contest e4.",
      "Support d4 and open your pieces."
    ]
  },

  {
    id: "london-line-11-qg4-bishop-trade",
    name: "Early Qg4 and bishop trade",
    description: "A forcing line where Qg4 provokes ...Bxf4 and then queens trade quickly.",
    moves: ["d4","d5","Bf4","e6","e3","Bd6","Qg4","Bxf4","Qxg7","Qf6","Qxf6","Nxf6","exf4"],
    explanations: [
      "Take the center.",
      "Black mirrors and contests space.",
      "Develop the bishop before e3.",
      "Support d5 and open lines.",
      "Stabilize the center and open pieces.",
      "Challenge your bishop and develop.",
      "Directly pressure g7 and force Black to decide.",
      "Black trades off your bishop to remove pressure.",
      "Grab the pawn and force further simplification.",
      "Offer a queen trade and defend key squares.",
      "Take the trade to avoid drifting into tactics you do not know.",
      "Black recaptures and develops.",
      "Restore material balance and open the e file."
    ]
  },

  {
    id: "london-line-12-qh5-qxe5-check",
    name: "Qh5+ and Qxe5+",
    description: "A forcing check line that punishes ...f6 with immediate queen activity.",
    moves: ["d4","d5","Bf4","f6","e3","e5","dxe5","fxe5","Qh5+","g6","Qxe5+"],
    explanations: [
      "Take the center.",
      "Black mirrors the center.",
      "Develop actively.",
      "Support ...e5 but weaken the king and dark squares.",
      "Keep the structure solid and open the queen.",
      "Black tries to blow the center open.",
      "Remove the pawn and open lines.",
      "Recapture and open the f file.",
      "Immediate check to exploit the weakened dark squares.",
      "Block the check but weaken more squares.",
      "Win the pawn and keep the king under pressure."
    ]
  },

  {
    id: "london-line-13-qf3-b5-queen-take",
    name: "Qf3 and ...b5 structure hit",
    description: "Black grabs space with ...b5. White uses Qf3 to target f5 and b7 patterns.",
    moves: ["d4","d5","Bf4","Bf5","c4","dxc4","e3","b5","Qf3","c6","Bxb8","Rxb8","Qxf5"],
    explanations: [
      "Take central space.",
      "Black mirrors the center.",
      "Develop actively.",
      "Black mirrors and contests e4.",
      "Challenge d5 and open the game.",
      "Black takes and tries to hold the pawn.",
      "Prepare to recapture c4 and open pieces.",
      "Support the extra pawn and gain queenside space.",
      "Target f5 and prepare tactical pressure.",
      "Support b5 and prepare ...e6 or ...Nf6.",
      "Remove the defender on b8 and simplify.",
      "Recapture and open the rook file.",
      "Win the bishop if it is pinned to the king or tactically loose."
    ]
  },

  {
    id: "london-line-14-qxa8-grab",
    name: "Qxa8 grab line",
    description: "A greedy tactical line where White can take on a8 if Black's coordination breaks.",
    moves: ["d4","d5","Bf4","Bf5","c4","dxc4","e3","b5","Qf3","c6","Bxb8","Bxb1","Qxc6+","Qd7","Qxa8"],
    explanations: [
      "Take the center.",
      "Black mirrors and contests space.",
      "Develop actively.",
      "Develop and contest the diagonal.",
      "Challenge d5 and increase central tension.",
      "Black takes and tries to hold the pawn.",
      "Prepare to recapture and open the bishop.",
      "Support the pawn on c4.",
      "Pressure f5 and watch tactical targets.",
      "Support b5 and prepare development.",
      "Remove the rook's defender and simplify.",
      "Black grabs material and disrupts your queenside.",
      "Check while picking up material and keeping initiative.",
      "Block the check and keep pieces connected.",
      "Take the rook if it is actually available and safe."
    ]
  },

  {
    id: "london-line-15-bf5-b6-nb5-rc1",
    name: "...b6 and Nb5 into Rc1",
    description: "Black defends with ...b6. White uses Nb5 and Rc1 to pressure c7 and the c file.",
    moves: ["d4","d5","Bf4","Nf6","e3","Bf5","c4","e6","Qb3","b6","Nc3","Be7","cxd5","exd5","Nb5","Bd6","Bxd6","cxd6","Rc1"],
    explanations: [
      "Take the center.",
      "Black mirrors and contests space.",
      "Develop actively.",
      "Develop and contest e4.",
      "Support d4 and open pieces.",
      "Develop and contest your bishop.",
      "Increase central tension.",
      "Support d5 and open lines.",
      "Pressure b7 and d5 early.",
      "Defend b7 and prepare ...Bb7.",
      "Develop and add central control.",
      "Develop and prepare to castle.",
      "Clarify the center and open files.",
      "Recapture and keep a central pawn presence.",
    ]
  },

  {
    id: "london-line-11-ne5-bb5-pin-tactic",
    name: "Ne5 Bb5+ forcing tactic",
    description: "Ne5 combined with Bb5+ creates pins and tactical opportunities on c7.",
    moves: ["d4","d5","Bf4","Nf6","e3","e6","Nf3","Bd6","Ne5","c5","Bb5+","Bd7","Nxd7","Bxf4","Nxc5+"],
    explanations: [
      "Claim central space and define a London structure.",
      "Black mirrors and contests the center.",
      "Develop the bishop actively before e3.",
      "Black develops and contests e4.",
      "Support d4 and open your pieces.",
      "Black supports d5 and prepares ...Bd6.",
      "Develop and prepare to castle.",
      "Black challenges your bishop on f4.",
      "Establish an outpost and increase pressure on c6 and f7.",
      "Black strikes at d4 for counterplay.",
      "Pin the knight on c6 and increase tactical pressure.",
      "Black blocks the check and tries to resolve the pin.",
      "Trade knights to simplify while maintaining pressure.",
      "Black takes your bishop but leaves tactical vulnerabilities.",
      "Fork check that wins a pawn and maintains initiative."
    ]
  },

  {
    id: "london-line-12-qg4-sac-line",
    name: "Qg4 forcing line with bishop sac",
    description: "Aggressive Qg4 leads to complications and potential material imbalance.",
    moves: ["d4","d5","Bf4","e6","e3","Bd6","Qg4","Bxf4","Qxg7","Qf6","Qxf6","Nxf6","exf4"],
    explanations: [
      "Take central space.",
      "Black mirrors and contests the center.",
      "Develop the bishop before e3.",
      "Black supports d5 and opens lines.",
      "Stabilize d4 and open development.",
      "Black challenges your bishop.",
      "Attack g7 and force Black to make decisions.",
      "Black trades bishops but weakens g7.",
      "Capture the pawn and threaten rook.",
      "Black offers queen trade to reduce pressure.",
      "Simplify to an endgame with material advantage.",
      "Black recaptures and develops.",
      "Recover the bishop and open the e-file."
    ]
  },

  {
    id: "london-line-13-qh5-check-exploit",
    name: "Qh5+ against ...f6 weakness",
    description: "Exploit the weakened dark squares after ...f6 with immediate queen activity.",
    moves: ["d4","d5","Bf4","f6","e3","e5","dxe5","fxe5","Qh5+","g6","Qxe5+"],
    explanations: [
      "Claim central space.",
      "Black mirrors the center.",
      "Develop actively before e3.",
      "Weakening move to prepare ...e5, but creates dark-square weaknesses.",
      "Support d4 and prepare development.",
      "Black tries to open the center.",
      "Accept the challenge and remove central tension.",
      "Black recaptures and opens the f-file.",
      "Immediate check exploiting the weakened dark squares around Black's king.",
      "Block the check but further weakens dark squares.",
      "Win the pawn back with check, gaining tempo and material."
    ]
  },

  {
    id: "london-line-14-qf3-bxb8-tactic",
    name: "Qf3 with Bxb8 tactic",
    description: "Qf3 targets f5 and supports tactical ideas like Bxb8.",
    moves: ["d4","d5","Bf4","Bf5","c4","dxc4","e3","b5","Qf3","c6","Bxb8","Rxb8","Qxf5"],
    explanations: [
      "Take central space.",
      "Black mirrors and contests the center.",
      "Develop actively.",
      "Black develops and contests e4.",
      "Increase central tension.",
      "Black takes and tries to hold the pawn.",
      "Prepare to recapture c4 and open the bishop.",
      "Support the pawn on c4 and gain queenside space.",
      "Target the bishop on f5 and pressure c6/b7.",
      "Support b5 and prepare ...e6 or development.",
      "Remove the knight that defends key squares and can lead to tactical shots.",
      "Black recaptures, leaving the queen on f5 potentially undefended.",
      "Capture the bishop if it's pinned or tactically vulnerable."
    ]
  },

  {
    id: "london-line-15-qxa8-raid",
    name: "Qxa8 queen raid tactic",
    description: "A tactical sequence where White's queen infiltrates to a8.",
    moves: ["d4","d5","Bf4","Bf5","c4","dxc4","e3","b5","Qf3","c6","Bxb8","Bxb1","Qxc6+","Qd7","Qxa8"],
    explanations: [
      "Claim central space.",
      "Black mirrors the center.",
      "Develop actively.",
      "Develop and contest the diagonal.",
      "Challenge d5 and increase tension.",
      "Black takes and tries to hold the pawn.",
      "Prepare to recapture and open the bishop.",
      "Support the pawn on c4.",
      "Pressure f5 and prepare tactics.",
      "Support b5 and prepare development.",
      "Remove defender of a8 and create tactical opportunities.",
      "Black grabs material but loses coordination.",
      "Check that wins back material and disrupts Black's position.",
      "Black blocks but leaves the a8 rook vulnerable.",
      "Capture the rook if the tactics work in your favor."
    ]
  },

  {
    id: "london-line-16-bf5-b6-structure",
    name: "London vs ...Bf5 and ...b6",
    description: "Black plays ...b6 to support ...Bb7. White develops with pressure on c7.",
    moves: ["d4","d5","Bf4","Nf6","e3","Bf5","c4","e6","Qb3","b6","Nc3","Be7","cxd5","exd5","Nb5","Bd6","Bxd6","cxd6","Rc1"],
    explanations: [
      "Take central space.",
      "Black mirrors and contests the center.",
      "Develop actively.",
      "Black develops and contests e4.",
      "Support d4 and open pieces.",
      "Black develops and contests e4.",
      "Increase central tension.",
      "Support d5 and open lines.",
      "Pressure b7 and d5.",
      "Defend b7 and prepare ...Bb7.",
      "Develop and add central control.",
      "Develop and prepare to castle.",
      "Clarify the center and open files.",
      "Recapture and maintain central presence.",
      "Jump into c7, putting pressure on Black's position.",
      "Black challenges your bishop.",
      "Trade bishops to simplify.",
      "Black recaptures, creating an isolated pawn.",
      "Control the c-file and pressure c7."
    ]
  },

  {
    id: "london-line-17-qxa8-tactic-extended",
    name: "Extended Qxa8 tactic",
    description: "Similar to line 15 but shows the tactical sequence in more detail.",
    moves: ["d4","d5","Bf4","Bf5","c4","dxc4","e3","b5","Qf3","c6","Bxb8","Bxb1","Qxc6+","Qd7","Qxa8"],
    explanations: [
      "Claim central space.",
      "Black mirrors and contests the center.",
      "Develop actively.",
      "Develop and contest the diagonal.",
      "Challenge d5 and increase tension.",
      "Black takes the pawn.",
      "Prepare to recapture c4 and open the bishop.",
      "Support the pawn on c4.",
      "Target f5 and prepare tactics.",
      "Support b5 and prepare ...e6.",
      "Remove the knight defending a8.",
      "Black takes the knight but loses coordination.",
      "Check that wins material and creates threats.",
      "Black blocks the check but leaves a8 vulnerable.",
      "Capture the rook if the tactics work."
    ]
  },

  {
    id: "london-line-18-qxa4-after-nb5",
    name: "Qa4 after Nb5 pressure",
    description: "Nb5 creates threats, and Qa4 increases queenside pressure.",
    moves: ["d4","d5","Bf4","Nf6","e3","Bf5","c4","e6","Qb3","b6","Nc3","Be7","cxd5","exd5","Nb5","Na6","Qa4"],
    explanations: [
      "Take central space.",
      "Black mirrors and contests the center.",
      "Develop actively.",
      "Black develops and contests e4.",
      "Support d4 and open pieces.",
      "Black develops and contests e4.",
      "Increase central tension.",
      "Support d5 and open lines.",
      "Pressure b7 and d5.",
      "Defend b7 and prepare ...Bb7.",
      "Develop and add central control.",
      "Develop and prepare to castle.",
      "Clarify the center and open files.",
      "Recapture and maintain central presence.",
      "Jump into c7, threatening the rook and creating pressure.",
      "Black defends c7 with the knight.",
      "Pin the knight on a6 and increase queenside pressure."
    ]
  },

  {
    id: "london-line-19-bg4-sac-line",
    name: "Bg4 pin and sac line",
    description: "Black pins with ...Bg4, White responds with aggressive play and a bishop sac.",
    moves: ["d4","d5","Bf4","Nf6","e3","Nc6","Nf3","Bg4","Bb5","e6","h3","Bh5","g4","Bg6","Ne5","Bd6","Nxc6","bxc6","Bxc6+","Ke7","Bxa8"],
    explanations: [
      "Claim central space.",
      "Black mirrors and contests the center.",
      "Develop actively.",
      "Black develops and contests e4.",
      "Support d4 and open pieces.",
      "Black develops and supports ...e5.",
      "Develop and prepare to castle.",
      "Pin the knight on f3.",
      "Pin the knight on c6 and create threats.",
      "Support d5 and open the bishop.",
      "Challenge the bishop and gain space.",
      "Retreat and maintain the pin.",
      "Attack the bishop and gain kingside space.",
      "Retreat to a safer square.",
      "Centralize and create threats.",
      "Black challenges your bishop.",
      "Remove the defender of a8.",
      "Black recaptures.",
      "Check that wins material.",
      "Black moves the king, the only legal move.",
      "Capture the rook and gain material advantage."
    ]
  },

  {
    id: "london-line-20-kingside-attack-detailed",
    name: "Detailed kingside attack with sacs",
    description: "A complex attacking line with multiple sacrifices on the kingside.",
    moves: ["d4","d5","Bf4","Nf6","e3","e6","Nf3","Bd6","Ne5","O-O","Nd2","c5","c3","Nc6","Bd3","Qc7","Ndf3","Nd7","Ng5","g6","Nxh7","Kxh7","Qh5+","Kg8","Nxg6"],
    explanations: [
      "Claim central space.",
      "Black mirrors and contests the center.",
      "Develop actively.",
      "Black develops and contests e4.",
      "Support d4 and open pieces.",
      "Black supports d5 and opens lines.",
      "Develop and prepare to castle.",
      "Challenge your bishop.",
      "Centralize and create threats.",
      "Black castles to safety.",
      "Support e4 ideas and prepare kingside play.",
      "Black strikes at d4.",
      "Support d4 and control central squares.",
      "Black develops and adds pressure.",
      "Aim at h7 and build attacking chances.",
      "Black defends e5 and connects rooks.",
      "Reposition the knight for kingside attack.",
      "Black repositions to challenge e5.",
      "Direct attack on h7 and f7.",
      "Black defends h7 but weakens dark squares.",
      "Sacrifice to open the king.",
      "Black takes the knight.",
      "Bring the queen into the attack.",
      "Black retreats the king.",
      "Continue the attack with another sacrifice."
    ]
  },

  {
    id: "london-line-21-bxc4-recapture",
    name: "Bxc4 recapture line",
    description: "Simple recapture of the pawn on c4 with the bishop.",
    moves: ["d4","d5","Bf4","Nc6","e3","Bf5","c4","dxc4","Bxc4"],
    explanations: [
      "Claim central space.",
      "Black mirrors and contests the center.",
      "Develop actively.",
      "Black develops and supports ...e5.",
      "Support d4 and open pieces.",
      "Black develops and contests e4.",
      "Increase central tension.",
      "Black takes the pawn.",
      "Recapture the pawn and develop the bishop to an active square."
    ]
  },

  {
    id: "london-line-22-nc3-after-c4",
    name: "Nc3 development after c4",
    description: "Standard development with Nc3 after playing c4.",
    moves: ["d4","d5","Bf4","Nc6","e3","Bf5","c4","e6","Nc3"],
    explanations: [
      "Claim central space.",
      "Black mirrors and contests the center.",
      "Develop actively.",
      "Black develops and supports ...e5.",
      "Support d4 and open pieces.",
      "Black develops and contests e4.",
      "Increase central tension.",
      "Support d5 and open lines.",
      "Develop and increase control of central squares."
    ]
  },

  {
    id: "london-line-23-qb3-queen-trade-no-nf6",
    name: "Qb3 queen trade without ...Nf6",
    description: "Similar to line 9 but Black develops ...Bf5 before ...Nf6.",
    moves: ["d4","d5","Bf4","c6","e3","Bf5","c4","e6","Qb3","Qb6","c5","Qxb3","axb3"],
    explanations: [
      "Claim central space.",
      "Black mirrors and contests the center.",
      "Develop actively.",
      "Support d5 and prepare ...Bf5.",
      "Support d4 and open pieces.",
      "Black develops and contests e4.",
      "Increase central tension.",
      "Support d5 and open lines.",
      "Pressure b7 and d5.",
      "Black meets the pressure and offers trade.",
      "Gain space and lock the queenside.",
      "Trade queens to simplify.",
      "Recapture and accept doubled pawns for open file."
    ]
  },

  {
    id: "london-line-24-bf5-c6-qb6-trade",
    name: "London vs ...Bf5 and ...c6",
    description: "Black plays ...c6 and ...Bf5, leading to queen trade possibilities.",
    moves: ["d4","d5","Bf4","Bf5","c4","c6","Qb3","Qb6","c5","Qxb3","axb3"],
    explanations: [
      "Claim central space.",
      "Black mirrors and contests the center.",
      "Develop actively.",
      "Black develops and contests e4.",
      "Increase central tension.",
      "Support d5 and prepare ...e6.",
      "Pressure b7 and d5.",
      "Black meets the pressure and offers trade.",
      "Gain space and lock the queenside.",
      "Trade queens to simplify.",
      "Recapture and accept doubled pawns."
    ]
  },

  {
    id: "london-line-25-ne5-nbd7-development",
    name: "Ne5 with ...Nbd7 response",
    description: "Black responds to Ne5 with ...Nbd7, challenging the outpost.",
    moves: ["d4","d5","Bf4","e6","e3","Nf6","Nf3","Bd6","Ne5","Nbd7","Nd2","O-O","Bd3"],
    explanations: [
      "Claim central space.",
      "Black mirrors and contests the center.",
      "Develop actively.",
      "Black supports d5 and opens lines.",
      "Support d4 and open pieces.",
      "Black develops and contests e4.",
      "Develop and prepare to castle.",
      "Challenge your bishop.",
      "Establish an outpost.",
      "Black challenges the knight on e5.",
      "Support the knight on e5 and prepare f4 or other ideas.",
      "Black castles to safety.",
      "Develop the bishop to an active square."
    ]
  },

  {
    id: "london-line-26-qb3-queen-trade-standard",
    name: "Standard Qb3 queen trade",
    description: "Common queen trade line in London vs ...Bf5 setups.",
    moves: ["d4","d5","Bf4","c6","e3","Nf6","c4","Bf5","Qb3","Qb6","c5","Qxb3","axb3"],
    explanations: [
      "Claim central space.",
      "Black mirrors and contests the center.",
      "Develop actively.",
      "Support d5 and prepare ...Bf5.",
      "Support d4 and open pieces.",
      "Black develops and contests e4.",
      "Increase central tension.",
      "Black develops and contests e4.",
      "Pressure b7 and d5.",
      "Black meets the pressure and offers trade.",
      "Gain space and lock the queenside.",
      "Trade queens to simplify.",
      "Recapture and accept doubled pawns."
    ]
  },

  {
    id: "london-line-27-bxc4-recursive",
    name: "Bxc4 recapture in mirror bishop line",
    description: "Recapturing on c4 with the bishop in symmetrical structures.",
    moves: ["d4","d5","Bf4","Bf5","c4","dxc4","e3","e6","Bxc4"],
    explanations: [
      "Claim central space.",
      "Black mirrors and contests the center.",
      "Develop actively.",
      "Black develops and contests e4.",
      "Increase central tension.",
      "Black takes the pawn.",
      "Support d4 and open pieces.",
      "Support d5 and open lines.",
      "Recapture the pawn and develop the bishop."
    ]
  },

  {
    id: "london-line-28-long-castle-f5-clamp",
    name: "Long castle vs ...f5 clamp",
    description: "Opposite-side castling with Black clamping the center with ...f5.",
    moves: ["d4","d5","Bf4","Nf6","e3","Nc6","Nf3","e6","Nbd2","Bd6","Ne5","O-O","c3","Ne4","Nxe4","dxe4","Qc2","f5","O-O-O"],
    explanations: [
      "Claim central space.",
      "Black mirrors and contests the center.",
      "Develop actively.",
      "Black develops and contests e4.",
      "Support d4 and open pieces.",
      "Black develops and supports ...e5.",
      "Develop and prepare to castle.",
      "Black supports d5 and opens lines.",
      "Support e4 ideas and keep options flexible.",
      "Challenge your bishop.",
      "Establish an outpost.",
      "Black castles to safety.",
      "Support d4 and reduce tactics.",
      "Black grabs an outpost and offers trades.",
      "Remove the centralized knight.",
      "Black recaptures and opens the center.",
      "Support e4 and prepare kingside play.",
      "Black clamps the center and gains kingside space.",
      "Castle queenside and prepare for opposite-side attacks."
    ]
  },

  {
    id: "london-line-29-qg4-g6-response",
    name: "Qg4 met with ...g6",
    description: "Black responds to Qg4 with ...g6, forcing the queen to move.",
    moves: ["d4","d5","Bf4","e6","e3","Bd6","Qg4","g6","Qf3","Bxf4","Qxf4"],
    explanations: [
      "Claim central space.",
      "Black mirrors and contests the center.",
      "Develop actively.",
      "Black supports d5 and opens lines.",
      "Stabilize the center and open pieces.",
      "Challenge your bishop.",
      "Attack g7 and force a response.",
      "Black defends g7 and forces the queen to move.",
      "Retreat the queen to a safe square.",
      "Black trades bishops.",
      "Recapture with the queen, maintaining control of key squares."
    ]
  },

  {
    id: "london-line-30-c3-support-system",
    name: "c3 support system with Nbd2",
    description: "Solid setup with c3 and Nbd2 supporting the center.",
    moves: ["d4","d5","Bf4","Nf6","e3","e6","Nf3","c5","Nbd2","Nc6","c3"],
    explanations: [
      "Claim central space.",
      "Black mirrors and contests the center.",
      "Develop actively.",
      "Black develops and contests e4.",
      "Support d4 and open pieces.",
      "Black supports d5 and opens lines.",
      "Develop and prepare to castle.",
      "Black strikes at d4.",
      "Support the center and prepare e4 ideas.",
      "Black develops and adds pressure on d4.",
      "Support d4 and create a solid pawn structure."
    ]
  },

  {
    id: "london-line-31-bg4-pin-with-a6",
    name: "...Bg4 pin with ...a6 preparatory",
    description: "Black plays ...a6 before ...Bg4, preventing Bb5 ideas.",
    moves: ["d4","d5","Bf4","Nc6","e3","a6","Nf3","Nf6","Bd3","Bg4","Nbd2"],
    explanations: [
      "Claim central space.",
      "Black mirrors and contests the center.",
      "Develop actively.",
      "Black develops and supports ...e5.",
      "Support d4 and open pieces.",
      "Prevent Bb5 ideas and prepare ...b5.",
      "Develop and prepare to castle.",
      "Black develops and contests e4.",
      "Develop the bishop to an active square.",
      "Pin the knight on f3.",
      "Develop and prepare to break the pin with h3 or other means."
    ]
  },

  {
    id: "london-line-32-bg4-pin-bxf3-trade",
    name: "...Bg4 pin with ...Bxf3 trade",
    description: "Black trades bishop for knight to double White's pawns.",
    moves: ["d4","d5","Bf4","Nf6","e3","Nc6","Nf3","Bg4","Bb5","e6","h3","Bxf3","Qxf3"],
    explanations: [
      "Claim central space.",
      "Black mirrors and contests the center.",
      "Develop actively.",
      "Black develops and contests e4.",
      "Support d4 and open pieces.",
      "Black develops and supports ...e5.",
      "Develop and prepare to castle.",
      "Pin the knight on f3.",
      "Pin the knight on c6 and create threats.",
      "Support d5 and open lines.",
      "Challenge the bishop.",
      "Black trades bishop for knight, doubling White's pawns.",
      "Recapture with the queen, maintaining control of the center."
    ]
  },

  {
    id: "london-line-33-mirror-bf5-full-development",
    name: "Full development vs ...Bf5 mirror",
    description: "Complete development against Black's symmetrical ...Bf5 setup.",
    moves: ["d4","d5","Bf4","Bf5","c4","e6","Nc3","Nf6","e3"],
    explanations: [
      "Claim central space.",
      "Black mirrors and contests the center.",
      "Develop actively.",
      "Black develops and contests e4.",
      "Increase central tension.",
      "Support d5 and open lines.",
      "Develop and increase control of central squares.",
      "Black develops and contests e4.",
      "Support d4 and open pieces, completing the basic London setup."
    ]
  }
];