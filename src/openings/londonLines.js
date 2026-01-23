  // src/openings/londonLines.js

export const londonLines = [
  {
    id: "london-classic-solid-setup",
    name: "London Classic: solid setup",
    description: "Baseline London: develop naturally, meet ...Bd6 with Nbd2, and castle.",
    moves: ["d4", "d5", "Nf3", "Nf6", "Bf4", "e6", "e3", "Bd6", "Nbd2", "O-O"],
    explanations: [
      "d4: Claim central space and keep flexible options for a London structure.",
      "d5: Black matches the center and contests d4.",
      "Nf3: Develop and support the center without blocking the c pawn.",
      "Nf6: Black develops and adds pressure to e4 and d5 squares.",
      "Bf4: Develop the London bishop before locking it in with e3.",
      "e6: Black supports d5 and opens lines for the dark-squared bishop.",
      "e3: Stabilize d4 and open the light bishop and queen.",
      "Bd6: Black often tries to trade the London bishop to reduce your pressure.",
      "Nbd2: Support e4 ideas later, reinforce the center, and keep pieces coordinated.",
      "O-O: Black finishes basic king safety and connects rooks."
    ]
  },

  {
    id: "london-c3-nbd2",
    name: "London with early c3 and Nbd2",
    description: "Triangle structure: c3 supports d4 and keeps a slow, solid center.",
    moves: ["d4", "d5", "Nf3", "Nf6", "Bf4", "e6", "e3", "Bd6", "c3", "O-O", "Nbd2"],
    explanations: [
      "d4: Take space and make ...e5 harder.",
      "d5: Black mirrors the central claim.",
      "Nf3: Develop and keep options for c4 or e3 structures.",
      "Nf6: Black develops and contests the middle.",
      "Bf4: Commit to the London bishop placement early.",
      "e6: Black supports d5 and prepares ...Bd6 or ...c5.",
      "e3: Reinforce d4 and open the diagonal for the f1 bishop.",
      "Bd6: Black wants to trade your active bishop on f4.",
      "c3: Build the London triangle, support d4, and reduce early tactics on b2.",
      "O-O: Black secures the king and finishes basic development.",
      "Nbd2: Develop while supporting e4 ideas and keeping pieces flexible."
    ]
  },

  {
    id: "london-vs-bf5",
    name: "London vs early ...Bf5",
    description: "Black mirrors the bishop. You develop calmly and prepare Bd3 ideas.",
    moves: ["d4", "d5", "Nf3", "Nf6", "Bf4", "Bf5", "e3", "e6", "Bd3", "Bd6"],
    explanations: [
      "d4: Take the center first and define the structure.",
      "d5: Black matches the center and keeps symmetry.",
      "Nf3: Develop and keep your pawn structure flexible.",
      "Nf6: Black develops and increases central influence.",
      "Bf4: London bishop out early to avoid being locked in by e3.",
      "Bf5: Black mirrors, contesting your bishop and controlling e4.",
      "e3: Solidify the center and open your light bishop and queen.",
      "e6: Black supports d5 and keeps the option of ...Bd6.",
      "Bd3: Challenge the bishop on f5 and prepare a clear development plan.",
      "Bd6: Black also develops and often aims for bishop trades."
    ]
  },

  {
    id: "london-vs-early-c5",
    name: "London vs early ...c5",
    description: "Meet the early pawn strike with simple development and support for d4.",
    moves: ["d4", "d5", "Nf3", "Nf6", "Bf4", "c5", "e3", "Nc6", "Nbd2"],
    explanations: [
      "d4: Establish central space so Black has to challenge it.",
      "d5: Black mirrors and keeps central tension.",
      "Nf3: Develop and prepare to support d4 against pressure.",
      "Nf6: Black develops and eyes e4 and d5 squares.",
      "Bf4: Develop the bishop before committing to e3.",
      "c5: Black strikes at d4 early, typical counterplay versus London setups.",
      "e3: Reinforce d4 and keep the structure stable.",
      "Nc6: Black adds more pressure on d4 and increases central control.",
      "Nbd2: Support the center and prepare flexible recaptures and e4 later."
    ]
  },

  {
    id: "london-vs-c5-qb6",
    name: "London vs ...c5 and ...Qb6",
    description: "A common plan: Black hits b2 and d4. Nc3 is a direct practical defense.",
    moves: ["d4", "d5", "Nf3", "Nf6", "Bf4", "c5", "e3", "Qb6", "Nc3"],
    explanations: [
      "d4: Claim the center and invite a structured defense.",
      "d5: Black mirrors and supports central play.",
      "Nf3: Develop and keep your structure flexible.",
      "Nf6: Black develops and adds central pressure.",
      "Bf4: London bishop out before e3 locks it in.",
      "c5: Black attacks d4 and tries to open lines early.",
      "e3: Stabilize the center and open pieces.",
      "Qb6: Black attacks b2 and increases pressure on d4.",
      "Nc3: Defend d5 and b2 indirectly, develop, and keep central options."
    ]
  },

  {
    id: "london-vs-nh5",
    name: "London vs early ...Nh5",
    description: "Black tries to chase your bishop. Be5 is a direct, simple response.",
    moves: ["d4", "d5", "Nf3", "Nf6", "Bf4", "Nh5", "Be5", "Nd7"],
    explanations: [
      "d4: Take central space and set up a stable structure.",
      "d5: Black matches the center and keeps symmetry.",
      "Nf3: Develop and keep central flexibility.",
      "Nf6: Black develops and prepares to contest e4.",
      "Bf4: Place the bishop actively before e3.",
      "Nh5: Black immediately targets the bishop on f4.",
      "Be5: Keep the bishop on a useful diagonal and avoid being forced to retreat passively.",
      "Nd7: Black develops and supports potential ...f6 ideas later."
    ]
  },

  {
    id: "london-early-dxc5",
    name: "London with early dxc5",
    description: "A practical capture to change the structure and force Black to react.",
    moves: ["d4", "d5", "Nf3", "Nf6", "Bf4", "c5", "dxc5", "e6"],
    explanations: [
      "d4: Establish central presence.",
      "d5: Black mirrors and keeps central contact.",
      "Nf3: Develop and prepare for flexible central play.",
      "Nf6: Black develops and contests the center.",
      "Bf4: Develop the bishop before e3.",
      "c5: Black strikes at d4 and tries to open lines.",
      "dxc5: Take the c5 pawn to change the structure and reduce pressure on d4 for the moment.",
      "e6: Black supports the center and prepares to recapture or develop smoothly."
    ]
  },

  {
    id: "london-exchange-cxd4",
    name: "London vs ...cxd4 exchange",
    description: "Black exchanges on d4. You recapture and keep development moving.",
    moves: ["d4", "d5", "Nf3", "Nf6", "Bf4", "c5", "e3", "Nc6", "exd4"],
    explanations: [
      "d4: Take the center and define the pawn structure.",
      "d5: Black mirrors and contests the center.",
      "Nf3: Develop and keep options for c4 or e3 structures.",
      "Nf6: Black develops and increases central influence.",
      "Bf4: London bishop to an active square before e3.",
      "c5: Black attacks d4 and looks for early counterplay.",
      "e3: Support d4 and prepare to recapture if exchanges happen.",
      "Nc6: Black develops and adds more pressure on the center.",
      "exd4: Recapture cleanly, keep structure coherent, and open lines for your pieces."
    ]
  },

  {
    id: "london-preserve-bishop-bg3",
    name: "Preserve bishop vs ...Bd6",
    description: "When Black plays ...Bd6, Bg3 avoids the bishop trade and keeps your pressure.",
    moves: ["d4", "d5", "Nf3", "Nf6", "Bf4", "e6", "e3", "Bd6", "Bg3"],
    explanations: [
      "d4: Claim the center first.",
      "d5: Black matches and fights for central squares.",
      "Nf3: Develop and support central play.",
      "Nf6: Black develops and contests e4.",
      "Bf4: Develop the bishop outside the pawn chain.",
      "e6: Black supports d5 and opens their dark bishop.",
      "e3: Stabilize d4 and open your pieces.",
      "Bd6: Black aims to trade off your London bishop.",
      "Bg3: Keep the bishop, avoid the trade, and maintain long-term pressure."
    ]
  },

  {
    id: "london-trade-bishop-bxd6",
    name: "Trade bishop intentionally",
    description: "Sometimes you accept the trade to simplify and play a straightforward structure.",
    moves: ["d4", "d5", "Nf3", "Nf6", "Bf4", "e6", "e3", "Bd6", "Bxd6"],
    explanations: [
      "d4: Take the center and define the structure.",
      "d5: Black mirrors and contests central space.",
      "Nf3: Develop and keep your setup flexible.",
      "Nf6: Black develops and contests e4 and d5 squares.",
      "Bf4: Place the bishop actively before e3.",
      "e6: Black supports the center and prepares development.",
      "e3: Support d4 and open your light bishop and queen.",
      "Bd6: Black offers a bishop trade to reduce your activity.",
      "Bxd6: Trade on d6 if you prefer a simpler position and clear plans."
    ]
  },

  {
    id: "london-early-h3",
    name: "London with early h3",
    description: "A slow move to limit ...Bg4 pins and prepare safe kingside development.",
    moves: ["d4", "d5", "Nf3", "Nf6", "Bf4", "e6", "e3", "Bd6", "h3"],
    explanations: [
      "d4: Take central space and keep flexible development.",
      "d5: Black matches the center and keeps contact.",
      "Nf3: Develop and support the center.",
      "Nf6: Black develops and contests key central squares.",
      "Bf4: Develop the bishop before the structure is fixed.",
      "e6: Black supports d5 and opens the dark bishop.",
      "e3: Reinforce d4 and open lines for pieces.",
      "Bd6: Black often wants to trade the London bishop.",
      "h3: Reduce ...Bg4 pins and give your kingside pieces more freedom."
    ]
  },

  {
    id: "london-early-ne5",
    name: "London with early Ne5",
    description: "An aggressive outpost idea: Ne5 pressures c6 and f7 and can support kingside play.",
    moves: ["d4", "d5", "Nf3", "Nf6", "Bf4", "e6", "e3", "Bd6", "Ne5"],
    explanations: [
      "d4: Take the center and claim space.",
      "d5: Black mirrors and contests d4.",
      "Nf3: Develop and keep your pawn structure flexible.",
      "Nf6: Black develops and increases central influence.",
      "Bf4: Develop actively before e3 locks the bishop.",
      "e6: Black supports d5 and prepares to develop pieces.",
      "e3: Stabilize d4 and open your light bishop and queen.",
      "Bd6: Black aims to trade off your active bishop.",
      "Ne5: Centralize and create a useful outpost that can support an e4 break or kingside plans."
    ]
  },

  {
    id: "jobava-nc3-first",
    name: "Jobava London: Nc3 first",
    description: "Jobava style: Nc3 comes early, making the setup more direct and tactical.",
    moves: ["d4", "d5", "Nc3", "Nf6", "Bf4", "e6", "e3", "Bd6"],
    explanations: [
      "d4: Take central space and keep options open.",
      "d5: Black mirrors and contests the center.",
      "Nc3: Develop aggressively and prepare quick piece coordination.",
      "Nf6: Black develops and contests the center.",
      "Bf4: Develop the bishop actively as in the London family.",
      "e6: Black supports d5 and prepares ...Bd6.",
      "e3: Stabilize d4 and open lines for development.",
      "Bd6: Black aims to trade the bishop and reduce activity."
    ]
  },

  {
    id: "jobava-vs-c5",
    name: "Jobava vs ...c5",
    description: "Black hits the center early. You keep development and structure stable.",
    moves: ["d4", "d5", "Nc3", "Nf6", "Bf4", "c5", "e3", "Nc6"],
    explanations: [
      "d4: Claim the center and define a main structure.",
      "d5: Black matches the center.",
      "Nc3: Develop early and increase central influence.",
      "Nf6: Black develops and contests central squares.",
      "Bf4: Develop the bishop actively, keeping options for e3.",
      "c5: Black immediately pressures d4 and seeks counterplay.",
      "e3: Support d4 and open lines for development.",
      "Nc6: Black adds pressure on d4 and supports central play."
    ]
  },

  {
    id: "london-vs-bg4-pin",
    name: "London vs ...Bg4 pin",
    description: "Black pins early. You continue development and decide later how to respond.",
    moves: ["d4", "d5", "Nf3", "Nf6", "Bf4", "e6", "e3", "Bd6", "Nbd2", "Bg4"],
    explanations: [
      "d4: Take central space and establish a stable base.",
      "d5: Black mirrors and contests the center.",
      "Nf3: Develop and keep your c pawn flexible.",
      "Nf6: Black develops and increases central influence.",
      "Bf4: Develop the bishop outside the pawn chain.",
      "e6: Black supports d5 and prepares bishop development.",
      "e3: Stabilize d4 and open the light bishop and queen.",
      "Bd6: Black often tries to trade your bishop on f4.",
      "Nbd2: Develop and prepare to unpin or support e4.",
      "Bg4: Black pins the knight and increases development pressure."
    ]
  },

  {
    id: "london-vs-qb6-no-c5",
    name: "London vs early ...Qb6 without c5",
    description: "Black aims at b2 and d4. Nc3 is a direct defense and develops a piece.",
    moves: ["d4", "d5", "Nf3", "Nf6", "Bf4", "Qb6", "Nc3"],
    explanations: [
      "d4: Take the center and define the structure early.",
      "d5: Black matches and contests d4.",
      "Nf3: Develop and keep options for c4 or e3.",
      "Nf6: Black develops and fights for the center.",
      "Bf4: Develop actively before e3.",
      "Qb6: Black attacks b2 and pressures d4 immediately.",
      "Nc3: Defend b2 indirectly, develop, and support central play."
    ]
  },

  {
    id: "london-h4-idea",
    name: "London with kingside expansion idea",
    description: "h4 is a commitment. It tries to gain space and can support an attack, but it creates targets.",
    moves: ["d4", "d5", "Nf3", "Nf6", "Bf4", "e6", "e3", "Bd6", "h4"],
    explanations: [
      "d4: Claim space and define a stable structure.",
      "d5: Black mirrors and contests the center.",
      "Nf3: Develop and keep pawn structure options open.",
      "Nf6: Black develops and contests key squares.",
      "Bf4: Place the bishop actively before e3.",
      "e6: Black supports d5 and opens the dark bishop.",
      "e3: Reinforce d4 and open the light bishop and queen.",
      "Bd6: Black aims to trade the bishop and reduce activity.",
      "h4: Gain kingside space and signal aggressive intentions, with the cost of weakening squares."
    ]
  },

  {
    id: "london-long-castle-idea",
    name: "London with long castle idea",
    description: "A plan to castle long later. Qd2 connects pieces and supports queenside coordination.",
    moves: ["d4", "d5", "Nf3", "Nf6", "Bf4", "e6", "e3", "Bd6", "Nc3", "O-O", "Qd2"],
    explanations: [
      "d4: Take the center and establish space.",
      "d5: Black mirrors and contests central squares.",
      "Nf3: Develop and keep your structure flexible.",
      "Nf6: Black develops and increases central influence.",
      "Bf4: Develop the bishop actively before e3.",
      "e6: Black supports d5 and opens the dark bishop.",
      "e3: Stabilize d4 and open your light bishop and queen.",
      "Bd6: Black aims for a bishop trade.",
      "Nc3: Develop and support central play, often preparing queenside coordination.",
      "O-O: Black secures the king and completes basic development.",
      "Qd2: Connect pieces and keep the option of long castling in some structures."
    ]
  },

  {
    id: "london-c4-transition",
    name: "London into Colle-style center",
    description: "c4 changes the structure toward Queen's Gambit style play and increases central tension.",
    moves: ["d4", "d5", "Nf3", "Nf6", "Bf4", "e6", "e3", "Bd6", "c4"],
    explanations: [
      "d4: Establish a central pawn and claim space.",
      "d5: Black mirrors and contests the center.",
      "Nf3: Develop and keep options open for c4 or e3.",
      "Nf6: Black develops and increases central influence.",
      "Bf4: London bishop out before e3 locks it in.",
      "e6: Black supports d5 and prepares development.",
      "e3: Stabilize d4 and open lines for your pieces.",
      "Bd6: Black aims to trade your bishop and reduce activity.",
      "c4: Increase central tension and transition into a more open center structure."
    ]
  },

  {
    id: "london-e4-break-ne5-plan",
    name: "London into e4 break",
    description: "Ne5 often supports an e4 plan later and creates more active piece play.",
    moves: ["d4", "d5", "Nf3", "Nf6", "Bf4", "e6", "e3", "Bd6", "Nbd2", "O-O", "Ne5"],
    explanations: [
      "d4: Take central space and define the structure.",
      "d5: Black mirrors and contests d4.",
      "Nf3: Develop and keep your pawn structure flexible.",
      "Nf6: Black develops and fights for central squares.",
      "Bf4: Develop actively before e3 locks the bishop.",
      "e6: Black supports d5 and opens development options.",
      "e3: Stabilize d4 and open the light bishop and queen.",
      "Bd6: Black aims to trade your active bishop.",
      "Nbd2: Develop and prepare e4 ideas with better support.",
      "O-O: Black completes king safety and development.",
      "Ne5: Create an outpost and support more active central play, often connected to an eventual e4 break."
    ]
  },

  // -----------------------------
  // Added lines requested by you (deduped by exact move sequence)
  // -----------------------------

  {
    id: "london-line-01-nb5-nc7-tactic",
    name: "Tactic: Nb5 and Nc7+ fork",
    description: "Sharp line where Nb5 and Nc7+ appear after early ...c5 and ...e5.",
    moves: ["d4","d5","Bf4","Nf6","e3","c5","Nc3","Nc6","Nb5","e5","Bxe5","Nxe5","dxe5","Ne4","Qxd5","Qxd5","Nc7+","Kd8","Nxd5","Be6","c4"],
    explanations: [
      "d4: Take space and keep a London structure available.",
      "d5: Black mirrors the center and keeps symmetry.",
      "Bf4: Develop the bishop before locking it in with e3.",
      "Nf6: Develop and contest e4 and d5.",
      "e3: Support d4 and open the dark bishop and queen.",
      "c5: Immediate pressure on d4 and a typical counterpunch.",
      "Nc3: Defend d5 pressure points and add central control.",
      "Nc6: Add more pressure on d4 and support ...e5 ideas.",
      "Nb5: Aim at c7 and set up a concrete tactical threat.",
      "e5: Try to kick the bishop and open lines quickly.",
      "Bxe5: Take the pawn while the tactics still hold.",
      "Nxe5: Recover material and centralize a piece.",
      "dxe5: Remove the knight and open lines in the center.",
      "Ne4: Hit c3 and create threats against f2 and d2 squares.",
      "Qxd5: Grab the pawn and steer into simplification.",
      "Qxd5: Black trades queens to reduce tactics.",
      "Nc7+: Fork check to win time and usually win material.",
      "Kd8: Step out of check, often forced.",
      "Nxd5: Consolidate by taking material and stabilizing the position.",
      "Be6: Develop and contest key central squares.",
      "c4: Gain space and limit Black's central breaks."
    ]
  },

  {
    id: "london-line-02-ne5-bb5-simplify",
    name: "Ne5 and Bb5+ simplification",
    description: "Ne5 plus Bb5+ often forces a block and leads to clean trades.",
    moves: ["d4","d5","Bf4","Nf6","e3","e6","Nf3","Bd6","Ne5","c5","Bb5+","Bd7","Nxd7","Nbxd7","Bxd6"],
    explanations: [
      "d4: Claim central space.",
      "d5: Black matches the center.",
      "Bf4: Develop actively before committing to e3.",
      "Nf6: Develop and contest e4.",
      "e3: Support d4 and open your pieces.",
      "e6: Solidify d5 and prepare ...Bd6.",
      "Nf3: Develop and keep king safety simple.",
      "Bd6: Challenge your bishop and develop a piece.",
      "Ne5: Use the outpost and put immediate questions to Black's setup.",
      "c5: Strike at d4 and try to generate counterplay.",
      "Bb5+: Force a reply and reduce Black's flexibility.",
      "Bd7: Block and invite trades.",
      "Nxd7: Trade off a defender and simplify.",
      "Nbxd7: Recapture while keeping development coherent.",
      "Bxd6: Accept a trade to reach a straightforward structure."
    ]
  },

  {
    id: "london-line-03-qa5-nc7-fork",
    name: "Qa5+ and Nc7+ fork motif",
    description: "After ...Qa5+ and ...e5, the Nc7+ fork often decides the line quickly.",
    moves: ["d4","d5","Bf4","e6","e3","c5","Nf3","Nc6","Nc3","Nf6","Nb5","Qa5+","c3","e5","Nxe5","c4","Nxc4","dxc4","Nc7+"],
    explanations: [
      "d4: Take the center and keep London options.",
      "d5: Black mirrors and contests central space.",
      "Bf4: Develop the bishop before e3 locks it in.",
      "e6: Support d5 and open lines for Black's dark bishop.",
      "e3: Stabilize d4 and prepare development.",
      "c5: Attack d4 and start counterplay.",
      "Nf3: Develop and guard central squares.",
      "Nc6: Add pressure on d4 and support ...e5.",
      "Nc3: Increase control of d5 and e4 and support Nb5 ideas.",
      "Nf6: Develop and contest the center.",
      "Nb5: Aim directly at c7 and set up tactics.",
      "Qa5+: Check plus pressure on c3 and a2, also nudging you into c3.",
      "c3: Block the check and hold the d4 structure together.",
      "e5: Strike the center and try to punish the Nb5 setup.",
      "Nxe5: Take the pawn and keep tactics alive.",
      "c4: Gain space and hit the knight on d3 and b3 squares later.",
      "Nxc4: Recover a pawn and keep the knight active.",
      "dxc4: Black takes back and opens the d file and diagonal.",
      "Nc7+: Fork check that usually wins material or forces an awkward king move."
    ]
  },

  {
    id: "london-line-04-qa5-qxd5-hit",
    name: "Qa5+ and Qxd5 grab",
    description: "A sharp Nb5 line where White often wins a pawn with Qxd5.",
    moves: ["d4","d5","Bf4","c5","e3","Nc6","Nc3","Nf6","Nb5","Qa5+","c3","e5","Bxe5","Nxe5","dxe5","Nd7","Qxd5"],
    explanations: [
      "d4: Take central space.",
      "d5: Black mirrors the center.",
      "Bf4: Develop the bishop outside the pawn chain.",
      "c5: Pressure d4 early.",
      "e3: Support d4 and open your pieces.",
      "Nc6: Add pressure on d4 and support ...e5.",
      "Nc3: Develop and keep Nb5 tactics available.",
      "Nf6: Develop and contest e4.",
      "Nb5: Put pressure on c7 and threaten tactics.",
      "Qa5+: Check that also hits c3 ideas.",
      "c3: Block the check and stabilize the center.",
      "e5: Strike at the bishop and center.",
      "Bxe5: Take while the tactic works.",
      "Nxe5: Black recovers and centralizes.",
      "dxe5: Remove the knight and open lines.",
      "Nd7: Re-route to recapture or cover key squares.",
      "Qxd5: Grab the pawn and reduce Black's initiative."
    ]
  },

  {
    id: "london-line-05-f6-e5-gambit",
    name: "...f6 and ...e5 gambit idea",
    description: "Black tries to force open play with ...f6 and ...e5. White takes and simplifies.",
    moves: ["d4","d5","Bf4","Nc6","e3","f6","Nf3","e5","dxe5","fxe5","Nxe5","Nxe5","Bxe5"],
    explanations: [
      "d4: Take the center.",
      "d5: Black mirrors and contests space.",
      "Bf4: Develop before e3 locks the bishop.",
      "Nc6: Support ...e5 and develop a piece.",
      "e3: Solidify d4 and open your pieces.",
      "f6: Support ...e5 but weaken dark squares and king safety.",
      "Nf3: Develop and prepare to meet ...e5.",
      "e5: Challenge the center immediately.",
      "dxe5: Accept the challenge and remove central tension.",
      "fxe5: Black recaptures and opens the f file.",
      "Nxe5: Take the pawn and hit c6 and f7 squares.",
      "Nxe5: Black trades to reduce White activity.",
      "Bxe5: Recapture with the bishop and keep a clean position."
    ]
  },

  {
    id: "london-line-06-ne5-bxf4-nxc5",
    name: "Ne5 line with ...Bxf4 and Nxc5+",
    description: "A forcing variation where Black takes on f4 and White picks up c5 with check.",
    moves: ["d4","d5","Bf4","Nf6","e3","e6","Nf3","Bd6","Ne5","c5","Bb5+","Bd7","Nxd7","Bxf4","Nxc5+"],
    explanations: [
      "d4: Claim central space.",
      "d5: Black mirrors the center.",
      "Bf4: Develop actively.",
      "Nf6: Develop and contest e4.",
      "e3: Support d4 and open your pieces.",
      "e6: Solidify d5 and open Black's bishop.",
      "Nf3: Develop and prepare to castle.",
      "Bd6: Challenge the bishop and develop.",
      "Ne5: Centralize and create direct pressure.",
      "c5: Strike at d4 and create counterplay.",
      "Bb5+: Force a response and improve your piece activity.",
      "Bd7: Block and offer trades.",
      "Nxd7: Trade a piece to simplify.",
      "Bxf4: Black grabs the bishop, removing a key London piece.",
      "Nxc5+: Win the c5 pawn with check and gain tempo."
    ]
  },

  {
    id: "london-line-07-king-attack-sac",
    name: "Kingside attack: Bxh7+ sac line",
    description: "A concrete attacking line with Bxh7+ and a follow-up attack on the king.",
    moves: ["d4","d5","Bf4","Nf6","e3","e6","Nf3","Bd6","Ne5","O-O","Nd2","c5","c3","Nc6","Bd3","Bxe5","dxe5","Nd7","Nf3","Qc7","Bxh7+","Kxh7","Ng5+","Kg6","Qc2+","f5","exf6+","Kxf6","Nh7+","Kf7","Bxc7"],
    explanations: [
      "d4: Take the center.",
      "d5: Black mirrors and contests space.",
      "Bf4: Develop the bishop before e3.",
      "Nf6: Develop and contest e4.",
      "e3: Support d4 and open pieces.",
      "e6: Solidify d5 and prepare development.",
      "Nf3: Develop and keep king safety options.",
      "Bd6: Challenge your bishop and develop.",
      "Ne5: Centralize and point pieces toward the kingside.",
      "O-O: Black secures the king.",
      "Nd2: Support e4 ideas and keep pieces coordinated.",
      "c5: Strike at d4 and open lines.",
      "c3: Support d4 and control central squares.",
      "Nc6: Develop and add pressure on d4 and e5.",
      "Bd3: Aim at h7 and build attacking chances.",
      "Bxe5: Black removes the knight to reduce pressure.",
      "dxe5: Keep a strong pawn center and open the d file.",
      "Nd7: Reposition to challenge e5 and defend key squares.",
      "Nf3: Re-develop and keep the attack alive.",
      "Qc7: Support ...Nxe5 ideas and defend h7 indirectly.",
      "Bxh7+: Sacrifice for king exposure if the follow-up is known.",
      "Kxh7: Accept the sacrifice and step onto an exposed square.",
      "Ng5+: Force the king to move and keep initiative.",
      "Kg6: King runs forward to avoid immediate mates.",
      "Qc2+: Bring the queen in with check and keep threats going.",
      "f5: Block lines and try to kick attackers away.",
      "exf6+: Open lines and keep forcing play.",
      "Kxf6: Black takes and tries to stabilize with extra material.",
      "Nh7+: Keep checking to avoid losing momentum.",
      "Kf7: King heads back toward safety.",
      "Bxc7: Pick up material while the king is still awkward."
    ]
  },

  {
    id: "london-line-08-f5-long-castle",
    name: "Long castle plan into ...f5",
    description: "Both sides commit: White castles long, Black plays ...f5 and clamps the center.",
    moves: ["d4","d5","Bf4","Nf6","e3","Nc6","Nf3","e6","Nbd2","Bd6","Ne5","O-O","c3","Ne4","Nxe4","dxe4","Qc2","f5","O-O-O"],
    explanations: [
      "d4: Take central space.",
      "d5: Black mirrors the center.",
      "Bf4: Develop the bishop before locking it in.",
      "Nf6: Develop and contest e4.",
      "e3: Support d4 and open pieces.",
      "Nc6: Develop and support ...e5 or ...c5.",
      "Nf3: Develop and prepare to castle.",
      "e6: Solidify d5 and open development.",
      "Nbd2: Support e4 ideas and keep options flexible.",
      "Bd6: Challenge your bishop and develop.",
      "Ne5: Centralize and define the plan.",
      "O-O: Black secures the king.",
      "c3: Support d4 and reduce tactical hits on b2.",
      "Ne4: Black grabs the outpost and trades pieces.",
      "Nxe4: Remove the centralized knight.",
      "dxe4: Black recaptures and opens central files.",
      "Qc2: Support e4 pressure and prepare kingside or queenside plans.",
      "f5: Fix the center and claim space on the kingside.",
      "O-O-O: Commit to opposite-side castling and a more concrete game."
    ]
  },

  {
    id: "london-line-09-c6-qb3-queen-trade",
    name: "c6 and Qb3 queen trade",
    description: "A common practical line: Qb3 invites a queen trade and leads to a minority structure.",
    moves: ["d4","d5","Bf4","c6","e3","Nf6","c4","Bf5","Qb3","Qb6","c5","Qxb3","axb3"],
    explanations: [
      "d4: Take the center.",
      "d5: Black mirrors and keeps symmetry.",
      "Bf4: Develop the bishop outside the pawn chain.",
      "c6: Solid support for d5 and prepare ...Bf5.",
      "e3: Support d4 and open your pieces.",
      "Nf6: Develop and contest e4.",
      "c4: Increase central tension and shift toward QG structures.",
      "Bf5: Develop and contest your bishop's diagonal.",
      "Qb3: Pressure b7 and d5 and ask an early question.",
      "Qb6: Meet the pressure and offer simplification.",
      "c5: Gain space and lock the queenside.",
      "Qxb3: Trade queens to reduce complexity.",
      "axb3: Recapture and accept doubled pawns for structure and open a file."
    ]
  },

  {
    id: "london-line-10-mirror-bf5-c4",
    name: "Mirror bishops with early c4",
    description: "Symmetry with ...Bf5. White plays c4 and heads into a Queen's Gambit style center.",
    moves: ["d4","d5","Bf4","Bf5","c4","e6","Nc3","Nf6","e3"],
    explanations: [
      "d4: Take central space.",
      "d5: Black mirrors and contests the center.",
      "Bf4: Develop actively.",
      "Bf5: Black mirrors and fights for e4.",
      "c4: Increase central tension and challenge d5 directly.",
      "e6: Support d5 and open the dark bishop.",
      "Nc3: Develop and add control of d5.",
      "Nf6: Develop and contest e4.",
      "e3: Support d4 and open your pieces."
    ]
  },

  {
    id: "london-line-11-qg4-bishop-trade",
    name: "Early Qg4 and bishop trade",
    description: "A forcing line where Qg4 provokes ...Bxf4 and then queens trade quickly.",
    moves: ["d4","d5","Bf4","e6","e3","Bd6","Qg4","Bxf4","Qxg7","Qf6","Qxf6","Nxf6","exf4"],
    explanations: [
      "d4: Take the center.",
      "d5: Black mirrors and contests space.",
      "Bf4: Develop the bishop before e3.",
      "e6: Support d5 and open lines.",
      "e3: Stabilize the center and open pieces.",
      "Bd6: Challenge your bishop and develop.",
      "Qg4: Directly pressure g7 and force Black to decide.",
      "Bxf4: Black trades off your bishop to remove pressure.",
      "Qxg7: Grab the pawn and force further simplification.",
      "Qf6: Offer a queen trade and defend key squares.",
      "Qxf6: Take the trade to avoid drifting into tactics you do not know.",
      "Nxf6: Black recaptures and develops.",
      "exf4: Restore material balance and open the e file."
    ]
  },

  {
    id: "london-line-12-qh5-qxe5-check",
    name: "Qh5+ and Qxe5+",
    description: "A forcing check line that punishes ...f6 with immediate queen activity.",
    moves: ["d4","d5","Bf4","f6","e3","e5","dxe5","fxe5","Qh5+","g6","Qxe5+"],
    explanations: [
      "d4: Take the center.",
      "d5: Black mirrors the center.",
      "Bf4: Develop actively.",
      "f6: Support ...e5 but weaken the king and dark squares.",
      "e3: Keep the structure solid and open the queen.",
      "e5: Black tries to blow the center open.",
      "dxe5: Remove the pawn and open lines.",
      "fxe5: Recapture and open the f file.",
      "Qh5+: Immediate check to exploit the weakened dark squares.",
      "g6: Block the check but weaken more squares.",
      "Qxe5+: Win the pawn and keep the king under pressure."
    ]
  },

  {
    id: "london-line-13-qf3-b5-queen-take",
    name: "Qf3 and ...b5 structure hit",
    description: "Black grabs space with ...b5. White uses Qf3 to target f5 and b7 patterns.",
    moves: ["d4","d5","Bf4","Bf5","c4","dxc4","e3","b5","Qf3","c6","Bxb8","Rxb8","Qxf5"],
    explanations: [
      "d4: Take central space.",
      "d5: Black mirrors the center.",
      "Bf4: Develop actively.",
      "Bf5: Black mirrors and contests e4.",
      "c4: Challenge d5 and open the game.",
      "dxc4: Black takes and tries to hold the pawn.",
      "e3: Prepare to recapture c4 and open pieces.",
      "b5: Support the extra pawn and gain queenside space.",
      "Qf3: Target f5 and prepare tactical pressure.",
      "c6: Support b5 and prepare ...e6 or ...Nf6.",
      "Bxb8: Remove the defender on b8 and simplify.",
      "Rxb8: Recapture and open the rook file.",
      "Qxf5: Win the bishop if it is pinned to the king or tactically loose."
    ]
  },

  {
    id: "london-line-14-qxa8-grab",
    name: "Qxa8 grab line",
    description: "A greedy tactical line where White can take on a8 if Black's coordination breaks.",
    moves: ["d4","d5","Bf4","Bf5","c4","dxc4","e3","b5","Qf3","c6","Bxb8","Bxb1","Qxc6+","Qd7","Qxa8"],
    explanations: [
      "d4: Take the center.",
      "d5: Black mirrors and contests space.",
      "Bf4: Develop actively.",
      "Bf5: Develop and contest the diagonal.",
      "c4: Challenge d5 and increase central tension.",
      "dxc4: Black takes and tries to hold the pawn.",
      "e3: Prepare to recapture and open the bishop.",
      "b5: Support the pawn on c4.",
      "Qf3: Pressure f5 and watch tactical targets.",
      "c6: Support b5 and prepare development.",
      "Bxb8: Remove the rook's defender and simplify.",
      "Bxb1: Black grabs material and disrupts your queenside.",
      "Qxc6+: Check while picking up material and keeping initiative.",
      "Qd7: Block the check and keep pieces connected.",
      "Qxa8: Take the rook if it is actually available and safe."
    ]
  },

  {
    id: "london-line-15-bf5-b6-nb5-rc1",
    name: "...b6 and Nb5 into Rc1",
    description: "Black defends with ...b6. White uses Nb5 and Rc1 to pressure c7 and the c file.",
    moves: ["d4","d5","Bf4","Nf6","e3","Bf5","c4","e6","Qb3","b6","Nc3","Be7","cxd5","exd5","Nb5","Bd6","Bxd6","cxd6","Rc1"],
    explanations: [
      "d4: Take the center.",
      "d5: Black mirrors and contests space.",
      "Bf4: Develop actively.",
      "Nf6: Develop and contest e4.",
      "e3: Support d4 and open pieces.",
      "Bf5: Develop and contest your bishop.",
      "c4: Increase central tension.",
      "e6: Support d5 and open lines.",
      "Qb3: Pressure b7 and d5 early.",
      "b6: Defend b7 and prepare ...Bb7.",
      "Nc3: Develop and add central control.",
      "Be7: Develop and prepare to castle.",
      "cxd5: Clarify the center and open files.",
      "exd5: Recapture and keep a central pawn presence.",
    ]
  },

  {
    id: "london-line-11-ne5-bb5-pin-tactic",
    name: "Ne5 Bb5+ forcing tactic",
    description: "Ne5 combined with Bb5+ creates pins and tactical opportunities on c7.",
    moves: ["d4","d5","Bf4","Nf6","e3","e6","Nf3","Bd6","Ne5","c5","Bb5+","Bd7","Nxd7","Bxf4","Nxc5+"],
    explanations: [
      "d4: Claim central space and define a London structure.",
      "d5: Black mirrors and contests the center.",
      "Bf4: Develop the bishop actively before e3.",
      "Nf6: Black develops and contests e4.",
      "e3: Support d4 and open your pieces.",
      "e6: Black supports d5 and prepares ...Bd6.",
      "Nf3: Develop and prepare to castle.",
      "Bd6: Black challenges your bishop on f4.",
      "Ne5: Establish an outpost and increase pressure on c6 and f7.",
      "c5: Black strikes at d4 for counterplay.",
      "Bb5+: Pin the knight on c6 and increase tactical pressure.",
      "Bd7: Black blocks the check and tries to resolve the pin.",
      "Nxd7: Trade knights to simplify while maintaining pressure.",
      "Bxf4: Black takes your bishop but leaves tactical vulnerabilities.",
      "Nxc5+: Fork check that wins a pawn and maintains initiative."
    ]
  },

  {
    id: "london-line-12-qg4-sac-line",
    name: "Qg4 forcing line with bishop sac",
    description: "Aggressive Qg4 leads to complications and potential material imbalance.",
    moves: ["d4","d5","Bf4","e6","e3","Bd6","Qg4","Bxf4","Qxg7","Qf6","Qxf6","Nxf6","exf4"],
    explanations: [
      "d4: Take central space.",
      "d5: Black mirrors and contests the center.",
      "Bf4: Develop the bishop before e3.",
      "e6: Black supports d5 and opens lines.",
      "e3: Stabilize d4 and open development.",
      "Bd6: Black challenges your bishop.",
      "Qg4: Attack g7 and force Black to make decisions.",
      "Bxf4: Black trades bishops but weakens g7.",
      "Qxg7: Capture the pawn and threaten rook.",
      "Qf6: Black offers queen trade to reduce pressure.",
      "Qxf6: Simplify to an endgame with material advantage.",
      "Nxf6: Black recaptures and develops.",
      "exf4: Recover the bishop and open the e-file."
    ]
  },

  {
    id: "london-line-13-qh5-check-exploit",
    name: "Qh5+ against ...f6 weakness",
    description: "Exploit the weakened dark squares after ...f6 with immediate queen activity.",
    moves: ["d4","d5","Bf4","f6","e3","e5","dxe5","fxe5","Qh5+","g6","Qxe5+"],
    explanations: [
      "d4: Claim central space.",
      "d5: Black mirrors the center.",
      "Bf4: Develop actively before e3.",
      "f6: Weakening move to prepare ...e5, but creates dark-square weaknesses.",
      "e3: Support d4 and prepare development.",
      "e5: Black tries to open the center.",
      "dxe5: Accept the challenge and remove central tension.",
      "fxe5: Black recaptures and opens the f-file.",
      "Qh5+: Immediate check exploiting the weakened dark squares around Black's king.",
      "g6: Block the check but further weakens dark squares.",
      "Qxe5+: Win the pawn back with check, gaining tempo and material."
    ]
  },

  {
    id: "london-line-14-qf3-bxb8-tactic",
    name: "Qf3 with Bxb8 tactic",
    description: "Qf3 targets f5 and supports tactical ideas like Bxb8.",
    moves: ["d4","d5","Bf4","Bf5","c4","dxc4","e3","b5","Qf3","c6","Bxb8","Rxb8","Qxf5"],
    explanations: [
      "d4: Take central space.",
      "d5: Black mirrors and contests the center.",
      "Bf4: Develop actively.",
      "Bf5: Black develops and contests e4.",
      "c4: Increase central tension.",
      "dxc4: Black takes and tries to hold the pawn.",
      "e3: Prepare to recapture c4 and open the bishop.",
      "b5: Support the pawn on c4 and gain queenside space.",
      "Qf3: Target the bishop on f5 and pressure c6/b7.",
      "c6: Support b5 and prepare ...e6 or development.",
      "Bxb8: Remove the knight that defends key squares and can lead to tactical shots.",
      "Rxb8: Black recaptures, leaving the queen on f5 potentially undefended.",
      "Qxf5: Capture the bishop if it's pinned or tactically vulnerable."
    ]
  },

  {
    id: "london-line-15-qxa8-raid",
    name: "Qxa8 queen raid tactic",
    description: "A tactical sequence where White's queen infiltrates to a8.",
    moves: ["d4","d5","Bf4","Bf5","c4","dxc4","e3","b5","Qf3","c6","Bxb8","Bxb1","Qxc6+","Qd7","Qxa8"],
    explanations: [
      "d4: Claim central space.",
      "d5: Black mirrors the center.",
      "Bf4: Develop actively.",
      "Bf5: Develop and contest the diagonal.",
      "c4: Challenge d5 and increase tension.",
      "dxc4: Black takes and tries to hold the pawn.",
      "e3: Prepare to recapture and open the bishop.",
      "b5: Support the pawn on c4.",
      "Qf3: Pressure f5 and prepare tactics.",
      "c6: Support b5 and prepare development.",
      "Bxb8: Remove defender of a8 and create tactical opportunities.",
      "Bxb1: Black grabs material but loses coordination.",
      "Qxc6+: Check that wins back material and disrupts Black's position.",
      "Qd7: Black blocks but leaves the a8 rook vulnerable.",
      "Qxa8: Capture the rook if the tactics work in your favor."
    ]
  },

  {
    id: "london-line-16-bf5-b6-structure",
    name: "London vs ...Bf5 and ...b6",
    description: "Black plays ...b6 to support ...Bb7. White develops with pressure on c7.",
    moves: ["d4","d5","Bf4","Nf6","e3","Bf5","c4","e6","Qb3","b6","Nc3","Be7","cxd5","exd5","Nb5","Bd6","Bxd6","cxd6","Rc1"],
    explanations: [
      "d4: Take central space.",
      "d5: Black mirrors and contests the center.",
      "Bf4: Develop actively.",
      "Nf6: Black develops and contests e4.",
      "e3: Support d4 and open pieces.",
      "Bf5: Black develops and contests e4.",
      "c4: Increase central tension.",
      "e6: Black supports d5 and opens lines.",
      "Qb3: Pressure b7 and d5.",
      "b6: Defend b7 and prepare ...Bb7.",
      "Nc3: Develop and add central control.",
      "Be7: Develop and prepare to castle.",
      "cxd5: Clarify the center and open files.",
      "exd5: Recapture and maintain central presence.",
      "Nb5: Jump into c7, putting pressure on Black's position.",
      "Bd6: Black challenges your bishop.",
      "Bxd6: Trade bishops to simplify.",
      "cxd6: Black recaptures, creating an isolated pawn.",
      "Rc1: Control the c-file and pressure c7."
    ]
  },

  {
    id: "london-line-17-qxa8-tactic-extended",
    name: "Extended Qxa8 tactic",
    description: "Similar to line 15 but shows the tactical sequence in more detail.",
    moves: ["d4","d5","Bf4","Bf5","c4","dxc4","e3","b5","Qf3","c6","Bxb8","Bxb1","Qxc6+","Qd7","Qxa8"],
    explanations: [
      "d4: Claim central space.",
      "d5: Black mirrors and contests the center.",
      "Bf4: Develop actively.",
      "Bf5: Develop and contest the diagonal.",
      "c4: Challenge d5 and increase tension.",
      "dxc4: Black takes the pawn.",
      "e3: Prepare to recapture c4 and open the bishop.",
      "b5: Support the pawn on c4.",
      "Qf3: Target f5 and prepare tactics.",
      "c6: Support b5 and prepare ...e6.",
      "Bxb8: Remove the knight defending a8.",
      "Bxb1: Black takes the knight but loses coordination.",
      "Qxc6+: Check that wins material and creates threats.",
      "Qd7: Black blocks the check but leaves a8 vulnerable.",
      "Qxa8: Capture the rook if the tactics work."
    ]
  },

  {
    id: "london-line-18-qxa4-after-nb5",
    name: "Qa4 after Nb5 pressure",
    description: "Nb5 creates threats, and Qa4 increases queenside pressure.",
    moves: ["d4","d5","Bf4","Nf6","e3","Bf5","c4","e6","Qb3","b6","Nc3","Be7","cxd5","exd5","Nb5","Na6","Qa4"],
    explanations: [
      "d4: Take central space.",
      "d5: Black mirrors and contests the center.",
      "Bf4: Develop actively.",
      "Nf6: Black develops and contests e4.",
      "e3: Support d4 and open pieces.",
      "Bf5: Black develops and contests e4.",
      "c4: Increase central tension.",
      "e6: Black supports d5 and opens lines.",
      "Qb3: Pressure b7 and d5.",
      "b6: Defend b7 and prepare ...Bb7.",
      "Nc3: Develop and add central control.",
      "Be7: Develop and prepare to castle.",
      "cxd5: Clarify the center and open files.",
      "exd5: Recapture and maintain central presence.",
      "Nb5: Jump into c7, threatening the rook and creating pressure.",
      "Na6: Black defends c7 with the knight.",
      "Qa4: Pin the knight on a6 and increase queenside pressure."
    ]
  },

  {
    id: "london-line-19-bg4-sac-line",
    name: "Bg4 pin and sac line",
    description: "Black pins with ...Bg4, White responds with aggressive play and a bishop sac.",
    moves: ["d4","d5","Bf4","Nf6","e3","Nc6","Nf3","Bg4","Bb5","e6","h3","Bh5","g4","Bg6","Ne5","Bd6","Nxc6","bxc6","Bxc6+","Ke7","Bxa8"],
    explanations: [
      "d4: Claim central space.",
      "d5: Black mirrors and contests the center.",
      "Bf4: Develop actively.",
      "Nf6: Black develops and contests e4.",
      "e3: Support d4 and open pieces.",
      "Nc6: Black develops and supports ...e5.",
      "Nf3: Develop and prepare to castle.",
      "Bg4: Pin the knight and increase pressure.",
      "Bb5: Pin the knight on c6 and create threats.",
      "e6: Support d5 and open the bishop.",
      "h3: Challenge the bishop and gain space.",
      "Bh5: Retreat and maintain the pin.",
      "g4: Attack the bishop and gain kingside space.",
      "Bg6: Retreat to a safer square.",
      "Ne5: Centralize and create threats.",
      "Bd6: Black challenges your bishop.",
      "Nxc6: Remove the defender of a8.",
      "bxc6: Black recaptures.",
      "Bxc6+: Check that wins material.",
      "Ke7: Black moves the king, the only legal move.",
      "Bxa8: Capture the rook and gain material advantage."
    ]
  },

  {
    id: "london-line-20-kingside-attack-detailed",
    name: "Detailed kingside attack with sacs",
    description: "A complex attacking line with multiple sacrifices on the kingside.",
    moves: ["d4","d5","Bf4","Nf6","e3","e6","Nf3","Bd6","Ne5","O-O","Nd2","c5","c3","Nc6","Bd3","Qc7","Ndf3","Nd7","Ng5","g6","Nxh7","Kxh7","Qh5+","Kg8","Nxg6"],
    explanations: [
      "d4: Claim central space.",
      "d5: Black mirrors and contests the center.",
      "Bf4: Develop actively.",
      "Nf6: Black develops and contests e4.",
      "e3: Support d4 and open pieces.",
      "e6: Black supports d5 and opens lines.",
      "Nf3: Develop and prepare to castle.",
      "Bd6: Challenge your bishop.",
      "Ne5: Centralize and create threats.",
      "O-O: Black castles to safety.",
      "Nd2: Support e4 ideas and prepare kingside play.",
      "c5: Black strikes at d4.",
      "c3: Support d4 and control central squares.",
      "Nc6: Black develops and adds pressure.",
      "Bd3: Aim at h7 and build attacking chances.",
      "Qc7: Black defends e5 and connects rooks.",
      "Ndf3: Reposition the knight for kingside attack.",
      "Nd7: Black repositions to challenge e5.",
      "Ng5: Direct attack on h7 and f7.",
      "g6: Black defends h7 but weakens dark squares.",
      "Nxh7: Sacrifice to open the king.",
      "Kxh7: Black takes the knight.",
      "Qh5+: Bring the queen into the attack.",
      "Kg8: Black retreats the king.",
      "Nxg6: Continue the attack with another sacrifice."
    ]
  },

  {
    id: "london-line-21-bxc4-recapture",
    name: "Bxc4 recapture line",
    description: "Simple recapture of the pawn on c4 with the bishop.",
    moves: ["d4","d5","Bf4","Nc6","e3","Bf5","c4","dxc4","Bxc4"],
    explanations: [
      "d4: Claim central space.",
      "d5: Black mirrors and contests the center.",
      "Bf4: Develop actively.",
      "Nc6: Black develops and supports ...e5.",
      "e3: Support d4 and open pieces.",
      "Bf5: Black develops and contests e4.",
      "c4: Increase central tension.",
      "dxc4: Black takes the pawn.",
      "Bxc4: Recapture the pawn and develop the bishop to an active square."
    ]
  },

  {
    id: "london-line-22-nc3-after-c4",
    name: "Nc3 development after c4",
    description: "Standard development with Nc3 after playing c4.",
    moves: ["d4","d5","Bf4","Nc6","e3","Bf5","c4","e6","Nc3"],
    explanations: [
      "d4: Claim central space.",
      "d5: Black mirrors and contests the center.",
      "Bf4: Develop actively.",
      "Nc6: Black develops and supports ...e5.",
      "e3: Support d4 and open pieces.",
      "Bf5: Black develops and contests e4.",
      "c4: Increase central tension.",
      "e6: Black supports d5 and opens lines.",
      "Nc3: Develop and increase control of central squares."
    ]
  },

  {
    id: "london-line-23-qb3-queen-trade-no-nf6",
    name: "Qb3 queen trade without ...Nf6",
    description: "Similar to line 9 but Black develops ...Bf5 before ...Nf6.",
    moves: ["d4","d5","Bf4","c6","e3","Bf5","c4","e6","Qb3","Qb6","c5","Qxb3","axb3"],
    explanations: [
      "d4: Claim central space.",
      "d5: Black mirrors and contests the center.",
      "Bf4: Develop actively.",
      "c6: Support d5 and prepare ...Bf5.",
      "e3: Support d4 and open pieces.",
      "Bf5: Black develops and contests e4.",
      "c4: Increase central tension.",
      "e6: Black supports d5 and opens lines.",
      "Qb3: Pressure b7 and d5.",
      "Qb6: Black meets the pressure and offers trade.",
      "c5: Gain space and lock the queenside.",
      "Qxb3: Trade queens to simplify.",
      "axb3: Recapture and accept doubled pawns for open file."
    ]
  },

  {
    id: "london-line-24-bf5-c6-qb6-trade",
    name: "London vs ...Bf5 and ...c6",
    description: "Black plays ...c6 and ...Bf5, leading to queen trade possibilities.",
    moves: ["d4","d5","Bf4","Bf5","c4","c6","Qb3","Qb6","c5","Qxb3","axb3"],
    explanations: [
      "d4: Claim central space.",
      "d5: Black mirrors and contests the center.",
      "Bf4: Develop actively.",
      "Bf5: Black develops and contests e4.",
      "c4: Increase central tension.",
      "c6: Support d5 and prepare ...e6.",
      "Qb3: Pressure b7 and d5.",
      "Qb6: Black meets the pressure and offers trade.",
      "c5: Gain space and lock the queenside.",
      "Qxb3: Trade queens to simplify.",
      "axb3: Recapture and accept doubled pawns."
    ]
  },

  {
    id: "london-line-25-ne5-nbd7-development",
    name: "Ne5 with ...Nbd7 response",
    description: "Black responds to Ne5 with ...Nbd7, challenging the outpost.",
    moves: ["d4","d5","Bf4","e6","e3","Nf6","Nf3","Bd6","Ne5","Nbd7","Nd2","O-O","Bd3"],
    explanations: [
      "d4: Claim central space.",
      "d5: Black mirrors and contests the center.",
      "Bf4: Develop actively.",
      "e6: Black supports d5 and opens lines.",
      "e3: Support d4 and open pieces.",
      "Nf6: Black develops and contests e4.",
      "Nf3: Develop and prepare to castle.",
      "Bd6: Challenge your bishop.",
      "Ne5: Establish an outpost.",
      "Nbd7: Black challenges the knight on e5.",
      "Nd2: Support the knight on e5 and prepare f4 or other ideas.",
      "O-O: Black castles to safety.",
      "Bd3: Develop the bishop to an active square."
    ]
  },

  {
    id: "london-line-26-qb3-queen-trade-standard",
    name: "Standard Qb3 queen trade",
    description: "Common queen trade line in London vs ...Bf5 setups.",
    moves: ["d4","d5","Bf4","c6","e3","Nf6","c4","Bf5","Qb3","Qb6","c5","Qxb3","axb3"],
    explanations: [
      "d4: Claim central space.",
      "d5: Black mirrors and contests the center.",
      "Bf4: Develop actively.",
      "c6: Support d5 and prepare ...Bf5.",
      "e3: Support d4 and open pieces.",
      "Nf6: Black develops and contests e4.",
      "c4: Increase central tension.",
      "Bf5: Black develops and contests e4.",
      "Qb3: Pressure b7 and d5.",
      "Qb6: Black meets the pressure and offers trade.",
      "c5: Gain space and lock the queenside.",
      "Qxb3: Trade queens to simplify.",
      "axb3: Recapture and accept doubled pawns."
    ]
  },

  {
    id: "london-line-27-bxc4-recursive",
    name: "Bxc4 recapture in mirror bishop line",
    description: "Recapturing on c4 with the bishop in symmetrical structures.",
    moves: ["d4","d5","Bf4","Bf5","c4","dxc4","e3","e6","Bxc4"],
    explanations: [
      "d4: Claim central space.",
      "d5: Black mirrors and contests the center.",
      "Bf4: Develop actively.",
      "Bf5: Black develops and contests e4.",
      "c4: Increase central tension.",
      "dxc4: Black takes the pawn.",
      "e3: Support d4 and open pieces.",
      "e6: Black supports d5 and opens lines.",
      "Bxc4: Recapture the pawn and develop the bishop."
    ]
  },

  {
    id: "london-line-28-long-castle-f5-clamp",
    name: "Long castle vs ...f5 clamp",
    description: "Opposite-side castling with Black clamping the center with ...f5.",
    moves: ["d4","d5","Bf4","Nf6","e3","Nc6","Nf3","e6","Nbd2","Bd6","Ne5","O-O","c3","Ne4","Nxe4","dxe4","Qc2","f5","O-O-O"],
    explanations: [
      "d4: Claim central space.",
      "d5: Black mirrors and contests the center.",
      "Bf4: Develop actively.",
      "Nf6: Black develops and contests e4.",
      "e3: Support d4 and open pieces.",
      "Nc6: Black develops and supports ...e5.",
      "Nf3: Develop and prepare to castle.",
      "e6: Black supports d5 and opens lines.",
      "Nbd2: Support e4 ideas and keep options flexible.",
      "Bd6: Challenge your bishop.",
      "Ne5: Establish an outpost.",
      "O-O: Black castles to safety.",
      "c3: Support d4 and reduce tactics.",
      "Ne4: Black grabs an outpost and offers trades.",
      "Nxe4: Remove the centralized knight.",
      "dxe4: Black recaptures and opens the center.",
      "Qc2: Support e4 and prepare kingside play.",
      "f5: Black clamps the center and gains kingside space.",
      "O-O-O: Castle queenside and prepare for opposite-side attacks."
    ]
  },

  {
    id: "london-line-29-qg4-g6-response",
    name: "Qg4 met with ...g6",
    description: "Black responds to Qg4 with ...g6, forcing the queen to move.",
    moves: ["d4","d5","Bf4","e6","e3","Bd6","Qg4","g6","Qf3","Bxf4","Qxf4"],
    explanations: [
      "d4: Claim central space.",
      "d5: Black mirrors and contests the center.",
      "Bf4: Develop actively.",
      "e6: Black supports d5 and opens lines.",
      "e3: Support d4 and open pieces.",
      "Bd6: Challenge your bishop.",
      "Qg4: Attack g7 and force a response.",
      "g6: Black defends g7 and forces the queen to move.",
      "Qf3: Retreat the queen to a safe square.",
      "Bxf4: Black trades bishops.",
      "Qxf4: Recapture with the queen, maintaining control of key squares."
    ]
  },

  {
    id: "london-line-30-c3-support-system",
    name: "c3 support system with Nbd2",
    description: "Solid setup with c3 and Nbd2 supporting the center.",
    moves: ["d4","d5","Bf4","Nf6","e3","e6","Nf3","c5","Nbd2","Nc6","c3"],
    explanations: [
      "d4: Claim central space.",
      "d5: Black mirrors and contests the center.",
      "Bf4: Develop actively.",
      "Nf6: Black develops and contests e4.",
      "e3: Support d4 and open pieces.",
      "e6: Black supports d5 and opens lines.",
      "Nf3: Develop and prepare to castle.",
      "c5: Black strikes at d4.",
      "Nbd2: Support the center and prepare e4 ideas.",
      "Nc6: Black develops and adds pressure on d4.",
      "c3: Support d4 and create a solid pawn structure."
    ]
  },

  {
    id: "london-line-31-bg4-pin-with-a6",
    name: "...Bg4 pin with ...a6 preparatory",
    description: "Black plays ...a6 before ...Bg4, preventing Bb5 ideas.",
    moves: ["d4","d5","Bf4","Nc6","e3","a6","Nf3","Nf6","Bd3","Bg4","Nbd2"],
    explanations: [
      "d4: Claim central space.",
      "d5: Black mirrors and contests the center.",
      "Bf4: Develop actively.",
      "Nc6: Black develops and supports ...e5.",
      "e3: Support d4 and open pieces.",
      "a6: Prevent Bb5 ideas and prepare ...b5.",
      "Nf3: Develop and prepare to castle.",
      "Nf6: Black develops and contests e4.",
      "Bd3: Develop the bishop to an active square.",
      "Bg4: Pin the knight on f3.",
      "Nbd2: Develop and prepare to break the pin with h3 or other means."
    ]
  },

  {
    id: "london-line-32-bg4-pin-bxf3-trade",
    name: "...Bg4 pin with ...Bxf3 trade",
    description: "Black trades bishop for knight to double White's pawns.",
    moves: ["d4","d5","Bf4","Nf6","e3","Nc6","Nf3","Bg4","Bb5","e6","h3","Bxf3","Qxf3"],
    explanations: [
      "d4: Claim central space.",
      "d5: Black mirrors and contests the center.",
      "Bf4: Develop actively.",
      "Nf6: Black develops and contests e4.",
      "e3: Support d4 and open pieces.",
      "Nc6: Black develops and supports ...e5.",
      "Nf3: Develop and prepare to castle.",
      "Bg4: Pin the knight on f3.",
      "Bb5: Pin the knight on c6 and create threats.",
      "e6: Support d5 and open lines.",
      "h3: Challenge the bishop.",
      "Bxf3: Black trades bishop for knight, doubling White's pawns.",
      "Qxf3: Recapture with the queen, maintaining control of the center."
    ]
  },

  {
    id: "london-line-33-mirror-bf5-full-development",
    name: "Full development vs ...Bf5 mirror",
    description: "Complete development against Black's symmetrical ...Bf5 setup.",
    moves: ["d4","d5","Bf4","Bf5","c4","e6","Nc3","Nf6","e3"],
    explanations: [
      "d4: Claim central space.",
      "d5: Black mirrors and contests the center.",
      "Bf4: Develop actively.",
      "Bf5: Black develops and contests e4.",
      "c4: Increase central tension.",
      "e6: Black supports d5 and opens lines.",
      "Nc3: Develop and increase control of central squares.",
      "Nf6: Black develops and contests e4.",
      "e3: Support d4 and open pieces, completing the basic London setup."
    ]
  }
];