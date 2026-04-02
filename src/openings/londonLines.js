import { withOpeningFeedback } from "./feedback";

// src/openings/londonLines.js

// SEO / page intro text for London System drills
export const londonSEOText = `
The London System (1. d4 followed by Bf4) is "The Tank" of chess openings. It's incredibly solid, works against almost anything, and relies on a powerful pawn pyramid rather than memorizing thousands of variations.

Your goal is to build the "London Pyramid" (c3-d4-e3), plant a dominant "Anchor Knight" on e5, and use your "Golden Bishop" on d3 to laser-beam the opponent's kingside.

These drills cover the core London logic:
- The "C5? C3!" Mantra: How to respond to the most common challenge to your center.
- The Anchor Knight: Using e5 as a springboard for a crushing kingside attack.
- Handling Bishop Trades: What to do when Black tries to trade off your Golden Bishop.
- Aggressive Alternatives: When to skip the pyramid and launch a direct pawn storm with Nc3 and h4 against King's Indian setups.

Build the tank, control the center, and crush the kingside—that's the London way!
`;

export const londonLines = withOpeningFeedback([
  // Categories: Classic London, Early ...c5 Systems, Anti-Bishop Ideas, Jobava, Aggressive Plans

  {
    category: "Classic London",
    id: "london-classic-solid-setup",
    name: "The London Pyramid: Ideal setup",
    description: "Build the c3-d4-e3 pyramid and prepare the Golden Bishop for the attack.",
    moves: ["d4", "d5", "Bf4", "Nf6", "e3", "e6", "Nf3", "Bd6", "Bg3", "O-O", "Bd3", "c5", "c3"],
    explanations: [
      "Let's learn the London System! White starts with the queen's pawn. {{square d4}}",
      "Black mirrors and asks what kind of Queen's Pawn structure you want.",
      "The London Bishop! We develop our star piece early and flexibly.",
      "Black develops their best defender.",
      "Solidify! We build the first half of our pyramid and open the path for the other bishop.",
      "Black supports their center and prepares development.",
      "Developing the knight toward its future home on e5.",
      "Black challenges our star bishop! They want to trade it off.",
      "The Retreat: We drop the bishop back. If they take, we open the h-file for our rook! A great tradeoff.",
      "Black castles to safety.",
      "The Golden Bishop! We put our best attacker on its most aggressive square, eyeing h7.",
      "Black strikes back! The classic challenge to our center.",
      "The 'C5? C3!' Rule: Every time they play c5, we answer with c3 to maintain our rock-solid pyramid. The tank is complete!"
    ]
  },

  {
    category: "Aggressive Plans",
    id: "london-vs-g6-aggressive",
    name: "Jobava London: Crushing the kingside fianchetto",
    description: "Against ...g6 setups, skip the slow pyramid! Play Nc3, Qd2, and launch a pawn storm with h4.",
    moves: ["d4", "Nf6", "Nc3", "g6", "Bf4", "Bg7", "Qd2", "d6", "O-O-O", "O-O", "h4"],
    explanations: [
      "White takes the center.",
      "Black responds with the hypermodern approach.",
      "The Shift! Against ...g6, we play Nc3. We aren't building a pyramid today; we're launching a tank attack.",
      "Black prepares the bishop house.",
      "The London Bishop still joins the party, but with a more aggressive mission.",
      "Black completes the fianchetto. That bishop is their pride and joy—we're going to trade it.",
      "Battery! We prepare Bh6 to remove that powerful defender.",
      "Black solidifies their center.",
      "Castle Long! We put our king on the other side so we can launch our pawns without fear.",
      "Black castles to safety—or so they think.",
      "CHARGE! We launch the h-pawn. Our goal is h5, ripping open the kingside and delivering mate. This is how you WIN with the London!"
    ]
  },

  {
    id: "london-c3-nbd2",
    name: "London shell with c3 and Nbd2",
    description: "This is the standard pyramid version of the London. c3 locks down d4, Nbd2 backs up e4 and Ne5, and Bd3 is often the next natural square.",
    moves: ["d4", "d5", "Bf4", "Nf6", "e3", "e6", "Nf3", "Bd6", "c3", "O-O", "Nbd2"],
    explanations: [
      "White claims the center and prepares the London shell.",
      "Let's learn the London System! Black mirrors and asks what kind of Queen's Pawn structure you want.",
      "Develop the bishop before locking the chain with {{square e3}}.",
      "Black develops and contests the key central squares.",
      "Support {{square d4}} and keep the London shell intact.",
      "Black backs up {{square d5}} and keeps ...{{square c5}} and ...B{{square d6}} available.",
      "Finish kingside development without showing your full plan yet.",
      "Black challenges the bishop and asks whether you want to keep tension or trade.",
      "{{square c3}} completes the pyramid! It overprotects {{square d4}}, slows down Black's counterplay, and prepares B{{square c2}} if ...{{square c4}} comes.",
      "Black castles and reaches a normal Queen's Pawn structure.",
      "Nb{{square d2}} completes the core shell. We are now controlling the e4 and e5 squares quite well with our pawns and pieces."
    ]
  },

  {
    id: "london-vs-bf5",
    name: "London vs early ...Bf5: c4 transition",
    description: "When Black brings the bishop out early, you do not have to stay mechanical. c4 and Qb3 punish the loose queenside squares.",
    moves: ["d4", "d5", "Bf4", "Bf5", "c4", "e6", "Nc3", "Nf6", "Qb3"],
    explanations: [
      "Take the center first and define the structure.",
      "Black mirrors and keeps central symmetry.",
      "Develop the bishop before {{square e3}} would lock it in.",
      "If Black leaves the light-squared bishop early, we can actually abandon the pyramid plan and turn this into a Queen's Gambit style attack.",
      "Switch gears! {{square c4}} challenges {{square d5}} directly and exploits the fact that the bishop is no longer guarding the queenside.",
      "Black supports {{square d5}} and opens the dark bishop.",
      "Develop and increase pressure on {{square d5}} while keeping Q{{square b3}} in mind.",
      "Black develops normally, but {{square b7}} is still a practical target.",
      "Q{{square b3}} hits {{square b7}} and {{square d5}} at once. If they play {{square b6}}, we might even win the whole queenside later!"
    ]
  },

  {
    id: "london-vs-early-c5",
    name: "London vs early ...c5",
    description: "Meet the early pawn strike with simple development and support for d4.",
    moves: ["d4", "d5", "Bf4", "Nf6", "e3", "c5", "c3", "Nc6", "Nd2"],
    explanations: [
      "Establish central space so Black has to challenge it.",
      "Black mirrors and keeps central tension.",
      "Develop the bishop before committing to {{square e3}}.",
      "Black develops and eyes {{square e4}} and {{square d5}} squares.",
      "Reinforce {{square d4}} and keep the structure stable.",
      "When you see {{square c5}}, think 'c3'! c5? c3! Say that a million times to yourself.",
      "When you see {{square c5}}, think 'c3'! c5? c3! Say that a million times to yourself. {{square c3}} completes the pyramid and kills Black's counterplay in the center.",
      "Black adds more pressure on {{square d4}} and increases central control.",
      "Nb{{square d2}} is flexible here. It keeps our options open and protects our central structure."
    ]
  },

  {
    id: "london-vs-c5-qb6",
    name: "London vs ...c5 and ...Qb6",
    description: "Black hits b2 and d4 early. Offering a queen trade is often the best theoretical response.",
    moves: ["d4", "d5", "Bf4", "Nf6", "e3", "c5", "c3", "Qb6", "Qb3"],
    explanations: [
      "Claim the center and invite Black to challenge it.",
      "Black mirrors and keeps the structure classical.",
      "Get the bishop out before {{square e3}} fixes the chain.",
      "Black develops and starts looking at {{square e4}} and {{square d5}}.",
      "Stabilize {{square d4}} and open lines for the bishop and queen.",
      "Black strikes at {{square d4}} early, typical counterplay versus London setups.",
      "c5? c3! Support {{square d4}} immediately.",
      "Black attacks {{square b2}} and leans on {{square d4}}, hoping for a simple target game.",
      "Q{{square b3}} is the most common way to meet this. You don't want to take their queen; you actually want them to take you so you get an open a-file for your rook!"
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
      "Place the bishop actively before {{square e3}}.",
      "Black develops and prepares to contest {{square e4}}.",
      "Support {{square d4}} and open the dark bishop and queen.",
      "Black immediately targets the {{bishop f4 full}}.",
      "Keep the bishop on a useful diagonal and avoid being forced to retreat passively.",
      "Black develops and supports potential ...{{square f6}} ideas later."
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
      "Develop the bishop before {{square e3}}.",
      "Black develops and contests the center.",
      "Support {{square d4}} and open the light bishop and queen.",
      "Black strikes at {{square d4}} and tries to open lines.",
      "Take the {{square c5}} pawn to change the structure and reduce pressure on {{square d4}} for the moment.",
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
      "London bishop to an active square before {{square e3}}.",
      "Black develops and increases central influence.",
      "Support {{square d4}} and prepare to recapture if exchanges happen.",
      "Black attacks {{square d4}} and looks for early counterplay.",
      "Develop and keep options for {{square c4}} or {{square e3}} structures.",
      "Black develops and adds more pressure on the center.",
      "{{square c3}} completes the pawn pyramid and makes it harder for Black to shake your center loose in one move.",
      "Black exchanges to relieve the pressure and stop White from keeping a broad center for free.",
      "ex{{square d4}} keeps the structure healthy, opens the e-file for later rook play, and preserves the usual London piece setup."
    ]
  },

  {
    id: "london-preserve-bishop-bg3",
    name: "Retreat vs ...Bd6 and keep the bishop",
    description: "Bg3 is the standard retreat when you want to keep the London bishop. If Black later takes on g3, hxg3 is often acceptable because the h-file can help your attack.",
    moves: ["d4", "d5", "Bf4", "Nf6", "e3", "e6", "Nf3", "Bd6", "Bg3"],
    explanations: [
      "Claim the center first.",
      "Black matches and fights for central squares.",
      "Develop the bishop outside the pawn chain.",
      "Black develops and contests {{square e4}}.",
      "Stabilize {{square d4}} and open your pieces.",
      "Black supports {{square d5}} and opens the dark bishop.",
      "Develop and keep the position compact before choosing a plan.",
      "Black aims to trade off your most active minor piece.",
      "B{{square g3}} keeps the bishop on the kingside diagonal. If Black later takes on {{square g3}}, hx{{square g3}} is not a disaster. You often get an open h-file and more direct attacking chances."
    ]
  },

  {
    id: "london-trade-bishop-bxd6",
    name: "Trade bishop intentionally",
    description: "Bxd6 is the low-theory answer to ...Bd6. It is fine, but it also gives up the bishop that makes the London special.",
    moves: ["d4", "d5", "Bf4", "Nf6", "e3", "e6", "Nf3", "Bd6", "Bxd6"],
    explanations: [
      "Take the center and define the structure.",
      "Black mirrors and contests central space.",
      "Place the bishop actively before {{square e3}}.",
      "Black develops and contests {{square e4}} and {{square d5}} squares.",
      "Support {{square d4}} and open your light bishop and queen.",
      "Black supports the center and prepares development.",
      "Develop and keep your setup flexible.",
      "Black offers the trade to reduce your pressure.",
      "Taking is completely playable, but it is the most simplifying reaction and gives up some of the attacking potential tied to the London bishop."
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
      "Reinforce {{square d4}} and open lines for pieces.",
      "Black supports {{square d5}} and opens the dark bishop.",
      "Develop and support the center.",
      "Black often wants to trade the London bishop.",
      "Reduce ...B{{square g4}} pins and give your kingside pieces more freedom."
    ]
  },

  {
    id: "london-early-ne5",
    name: "Ne5 plan vs ...Bd6",
    description: "Ne5 is the teaching move. If Black grabs the knight with the bishop, dxe5 hits the f6 knight and often sets up Qh5.",
    moves: ["d4", "d5", "Bf4", "Nf6", "e3", "e6", "Nf3", "Bd6", "Ne5"],
    explanations: [
      "Take the center and claim space.",
      "Black mirrors and contests {{square d4}}.",
      "Develop actively before {{square e3}} locks the bishop.",
      "Black develops and increases central influence.",
      "Stabilize {{square d4}} and open your light bishop and queen.",
      "Black supports {{square d5}} and prepares to develop pieces.",
      "Develop and keep your structure flexible.",
      "Black aims to trade off your active bishop.",
      "N{{square e5}} is the main London jump. If Black answers with ...Bx{{square e5}}, dx{{square e5}} attacks the {{square f6}} knight, and once that defender moves, Q{{square h5}} becomes a very real kingside threat."
    ]
  },

  {
    id: "london-ideal-setup-complete",
    name: "Ideal London setup completed",
    description: "One clean model setup: d4, Bf4, e3, Nf3, Nbd2, c3, and Bd3. This is the shell the rest of the middlegame plans grow out of.",
    moves: ["d4", "d5", "Bf4", "Nf6", "e3", "e6", "Nf3", "c5", "Nbd2", "Nc6", "c3", "Bd6", "Bd3", "O-O"],
    explanations: [
      "Start with {{square d4}} and take central space.",
      "Black meets the center and keeps the structure classical.",
      "Get the bishop outside the pawn chain before anything else.",
      "Black develops and keeps an eye on {{square e4}}.",
      "{{square e3}} supports {{square d4}} and opens your dark bishop and queen.",
      "Black prepares normal development and keeps ...{{square c5}} in reserve.",
      "N{{square f3}} develops naturally and keeps the London shell compact.",
      "Black now challenges the center the standard way.",
      "Nb{{square d2}} supports {{square e4}} and N{{square e5}} and prepares to finish the setup instead of reacting move by move.",
      "Black develops and adds more pressure to {{square d4}}.",
      "{{square c3}} is the final pawn in the usual London pyramid. It overprotects {{square d4}} and prepares B{{square c2}} if Black later pushes ...{{square c4}}.",
      "Black aims for the standard bishop trade.",
      "B{{square d3}} is the ideal attacking square. The bishop now looks straight at {{square h7}}.",
      "Black castles, and White has reached the full setup the London is built around."
    ]
  },

  {
    id: "london-bd6-bg3-hxg3",
    name: "Keep the bishop and accept an open h-file",
    description: "After ...Bd6, Bg3 keeps the bishop. If Black insists on taking, hxg3 is normal and the h-file can become an attacking asset.",
    moves: ["d4", "d5", "Bf4", "Nf6", "e3", "e6", "Nf3", "Bd6", "Bg3", "Bxg3", "hxg3"],
    explanations: [
      "Start with {{square d4}} and claim space.",
      "Black matches the center and keeps the structure symmetrical.",
      "B{{square f4}} gets your bishop outside the chain before {{square e3}}.",
      "Black develops and watches {{square e4}}.",
      "{{square e3}} supports {{square d4}} and opens the dark bishop and queen.",
      "Black supports {{square d5}} and clears the path for the dark bishop.",
      "N{{square f3}} develops normally and keeps the setup compact.",
      "Now Black asks whether you want to give up the London bishop.",
      "B{{square g3}} keeps the bishop on the kingside diagonal instead of trading on Black's terms.",
      "If Black takes anyway, they help you more than they help themselves.",
      "hx{{square g3}} opens the h-file, keeps a sound center, and gives your rook a clearer path toward the kingside."
    ]
  },

  {
    id: "london-bf5-bd3-qxd3",
    name: "Challenge ...Bf5 with Bd3 and Qxd3",
    description: "If Black takes over the key diagonal with ...Bf5, meet it with Bd3. Let Black trade first, then recapture with the queen.",
    moves: ["d4", "d5", "Bf4", "Nf6", "e3", "Bf5", "Nf3", "e6", "Bd3", "Bxd3", "Qxd3"],
    explanations: [
      "Start with {{square d4}} and claim the center.",
      "Black mirrors the center and keeps the structure balanced.",
      "Get the bishop out before {{square e3}} would lock it in.",
      "Black develops and keeps an eye on {{square e4}}.",
      "{{square e3}} supports {{square d4}} and opens your dark bishop and queen.",
      "Black's bishop grabs the diagonal White often wants to use for kingside play.",
      "Develop normally and keep the setup coherent.",
      "Black supports {{square d5}} and finishes the basic shell.",
      "B{{square d3}} is the challenge. Put your bishop on the diagonal too and ask Black whether they really want to help your queen develop.",
      "If Black trades, they reduce their own control over the kingside dark squares.",
      "Qx{{square d3}} is exactly why White waits. The queen lands on an active square and the diagonal battle is already solved."
    ]
  },

  {
    id: "london-bb4-pin-c3",
    name: "Ignore the ...Bb4 pin and finish the setup",
    description: "If Black pins the d2 knight with ...Bb4, do not overreact. c3 kicks the bishop and lets you finish the normal London setup.",
    moves: ["d4", "d5", "Bf4", "Nf6", "e3", "e6", "Nf3", "c6", "Nbd2", "Bb4", "c3", "Bd6", "Bd3"],
    explanations: [
      "Start with {{square d4}} and take central space.",
      "Black mirrors the center and keeps things classical.",
      "B{{square f4}} comes first so the bishop is outside the chain.",
      "Black develops and watches {{square e4}}.",
      "{{square e3}} supports {{square d4}} and opens the dark bishop and queen.",
      "Black chooses a quiet supporting move instead of immediate central tension.",
      "N{{square f3}} develops and keeps the London shell intact.",
      "Black builds a solid Slav-style center.",
      "Nb{{square d2}} supports {{square e4}} and N{{square e5}} and continues the normal London plan.",
      "Black pins the {{square d2}} knight, hoping to distract White from finishing the setup.",
      "{{square c3}} is the clean answer. It protects {{square d4}}, questions the bishop, and keeps your own plan moving.",
      "Black retreats, and the pin never became a real problem.",
      "B{{square d3}} completes the ideal attacking setup and puts the bishop where it belongs, aiming at {{square h7}}."
    ]
  },

  {
    id: "london-ne5-qh5-attack",
    name: "Ne5, dxe5, and Qh5 kingside attack",
    description: "The basic London attack. After ...Bxe5 dxe5, the f6 knight gets chased and Qh5 starts asking direct questions around h7.",
    moves: ["d4", "d5", "Bf4", "Nf6", "e3", "e6", "Nf3", "Bd6", "Nbd2", "O-O", "Bd3", "c5", "c3", "Nc6", "Ne5", "Bxe5", "dxe5", "Nd7", "Qh5", "g6", "Qh6"],
    explanations: [
      "Take space and keep a London structure available.",
      "Black mirrors the center.",
      "Get the bishop out before the e-pawn closes the diagonal.",
      "Black develops and contests {{square e4}}.",
      "{{square e3}} supports {{square d4}} and completes the first layer of the setup.",
      "Black opens the dark bishop and keeps the usual ...B{{square d6}} trade available.",
      "N{{square f3}} develops normally and helps support {{square e5}} later.",
      "Black chooses the standard bishop trade setup.",
      "Nb{{square d2}} supports N{{square e5}} and keeps the London shell compact.",
      "Black castles and waits to see whether you stay quiet or turn active.",
      "B{{square d3}} is the ideal square for the bishop. It keeps pressure pointed at {{square h7}}.",
      "Black starts the standard counterplay with ...{{square c5}}.",
      "{{square c3}} completes the pawn pyramid and keeps {{square d4}} solid.",
      "Black develops and adds more pressure to the center.",
      "N{{square e5}} is the trigger. White uses the outpost to ask whether Black really wants to give up the bishop pair and loosen the kingside.",
      "Most players take right away, but that is exactly what White is hoping for.",
      "dx{{square e5}} keeps a strong center and attacks the {{knight f6 full}}, which is one of Black's main kingside defenders.",
      "The knight has to move, and the kingside becomes easier to target.",
      "Q{{square h5}} is the point. White is already threatening direct kingside ideas, especially around {{square h7}}.",
      "{{square g6}} is the most common practical defense, but it creates dark-square holes.",
      "Q{{square h6}} keeps the queen on the kingside and makes Black defend accurately for a long time."
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
      "Develop the bishop actively.",
      "Black develops and contests the center.",
      "N{{square c3}} is the Joe baba style London! It's much more aggressive than the pyramid.",
      "Black supports {{square d5}} and prepares ...B{{square d6}}.",
      "Stabilize {{square d4}} and prepare to jump in with N{{square b5}} later.",
      "Black aims to trade the bishop, but in the Jobava, we often go for the throat with piece play."
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
      "Develop the bishop actively.",
      "Black develops and contests central squares.",
      "Develop aggressively! This style focuses on the {{square c7}} pawn and rapid piece development.",
      "Black immediately pressures {{square d4}}.",
      "Support {{square d4}} and prepare N{{square b5}} threats.",
      "Black adds pressure on {{square d4}}. The game is now much more tactical than a standard London."
    ]
  },

  {
    id: "london-vs-bg4-pin",
    name: "London vs ...Bg4 pin",
    description: "If Black pins anyway, the London still holds together. e3 first keeps the pin from being more annoying than it should be.",
    moves: ["d4", "d5", "Bf4", "Nf6", "e3", "Bg4", "Nf3", "e6", "Nbd2", "Bd6"],
    explanations: [
      "Take central space and establish a stable base.",
      "Black mirrors and contests the center.",
      "Develop the bishop outside the pawn chain before closing the structure.",
      "Black develops and keeps pressure on the center.",
      "{{square e3}} first is useful here because your setup is less vulnerable to early pin ideas than if the knight had already gone to {{square f3}}.",
      "Black pins anyway, trying to slow your kingside development.",
      "Develop calmly. The pin is manageable and you still keep the London shell intact.",
      "Black supports {{square d5}} and prepares normal development.",
      "Nb{{square d2}} backs up {{square e4}} and gives you a clean way to unpin on your own terms.",
      "Black keeps aiming for the bishop trade, which is still one of the main strategic themes in these lines."
    ]
  },

  {
    id: "london-vs-qb6-no-c5",
    name: "London vs ...c5 and early ...Qb6",
    description: "Black uses ...c5 and ...Qb6 to pressure b2 and d4 before your setup is fully settled. Nc3 is a direct answer because it develops and helps hold the center.",
    moves: ["d4", "d5", "Bf4", "Nf6", "e3", "c5", "Nc3", "Qb6"],
    explanations: [
      "Take the center and define the structure early.",
      "Black matches and contests {{square d4}}.",
      "Develop actively before {{square e3}}.",
      "Black develops and fights for the center.",
      "Support {{square d4}} and open lines for development.",
      "Black plays ...{{square c5}} to hit {{square d4}}.",
      "N{{square c3}} is the Joe baba style response. It develops, reinforces the center, and sets up N{{square b5}} if Black gets careless.",
      "Black attacks {{square b2}} and {{square d4}}, but we have tactical counter-pressure on {{square c7}}."
    ]
  },

  {
    id: "london-h4-idea",
    name: "Kingside rollout with h4 after Ne5",
    description: "Once ...Bxe5 dxe5 has shifted Black's f6 defender and your bishop still points at the kingside, h4 is a real attacking move, not just a random pawn push.",
    moves: ["d4", "d5", "Bf4", "Nf6", "e3", "e6", "Nf3", "Bd6", "Ne5", "O-O", "Nd2", "c5", "c3", "Nc6", "Bd3", "Bxe5", "dxe5", "Nd7", "h4"],
    explanations: [
      "Claim space and define a stable structure.",
      "Black mirrors and contests the center.",
      "Place the bishop actively before {{square e3}}.",
      "Black develops and contests key squares.",
      "Reinforce {{square d4}} and open the light bishop and queen.",
      "Black supports {{square d5}} and opens the dark bishop.",
      "Develop and keep pawn structure options open.",
      "Black aims to trade the bishop and reduce activity.",
      "N{{square e5}} takes space and starts asking for concrete answers from Black's setup.",
      "Black castles before the position is fully clarified.",
      "N{{square d2}} backs up {{square e4}} ideas and keeps your kingside pieces coordinated.",
      "Black strikes at the center, which is their standard counterplay.",
      "{{square c3}} keeps {{square d4}} under control and gives your bishop a safe retreat to {{square c2}} if Black advances.",
      "Black develops and increases pressure on the center.",
      "B{{square d3}} keeps the bishop aimed at {{square h7}}, which is why the London attack can become dangerous so quickly.",
      "Black simplifies and hopes the tension disappears.",
      "Recapture with the pawn so the center stays strong and the {{square f6}} knight no longer helps defend the king.",
      "Black reroutes the knight, but the kingside has already lost one important defender.",
      "Now {{square h4}} is exactly the point. Even if Black pushes on the queenside, White keeps rolling on the kingside where the real attack lives."
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
      "Develop the bishop actively before {{square e3}}.",
      "Black develops and increases central influence.",
      "Stabilize {{square d4}} and open your light bishop and queen.",
      "Black supports {{square d5}} and opens the dark bishop.",
      "Develop and keep your structure flexible.",
      "Black aims for a bishop trade.",
      "Develop and support central play, often preparing queenside coordination.",
      "Black secures the king and completes basic development.",
      "Connect pieces and keep the option of long castling in some structures."
    ]
  },

  {
    id: "london-bishop-c2-vs-c4",
    name: "Bc2 retreat after ...c4",
    description: "If Black gains space with ...c4, do not panic. Bc2 is the standard one-square retreat and the bishop still points where you want it, toward the kingside.",
    moves: ["d4", "d5", "Bf4", "Nf6", "e3", "e6", "Nf3", "Be7", "Bd3", "O-O", "O-O", "c5", "c3", "Nc6", "Nbd2", "c4", "Bc2"],
    explanations: [
      "Take central space and keep London development available.",
      "Black mirrors and builds a normal Queen's Pawn center.",
      "Develop the bishop before the e-pawn closes the diagonal.",
      "Black develops and keeps an eye on {{square e4}}.",
      "Support {{square d4}} and prepare smooth piece development.",
      "Black supports {{square d5}} and keeps ...{{square c5}} in reserve.",
      "Develop and keep your structure compact.",
      "Black uses a quieter bishop setup and keeps options flexible.",
      "B{{square d3}} points toward the kingside and keeps the bishop active.",
      "Black castles and reaches a standard structure.",
      "Castle before starting flank play so your king is settled.",
      "Black now starts the usual counterplay against {{square d4}}.",
      "{{square c3}} overprotects the center and prepares for exactly this kind of queenside expansion.",
      "Black develops and keeps pressing around {{square d4}}.",
      "Nb{{square d2}} backs up {{square e4}} and keeps pieces coordinated.",
      "Black gains space with ...{{square c4}} and tries to shove your bishop off the useful diagonal.",
      "B{{square c2}} is the standard retreat. You only move the bishop back one square, and it still stares toward the kingside where many London attacks begin."
    ]
  },

  {
    id: "london-qh3-attack",
    name: "London Qf3 lift toward h7",
    description: "Against a quieter ...Be7 setup, you can delay castling, plant Ne5, and lift the queen to f3 to ask direct questions around h7.",
    moves: ["d4", "d5", "Bf4", "Nf6", "e3", "e6", "Nf3", "Be7", "Bd3", "c5", "c3", "O-O", "Nbd2", "b6", "Ne5", "Bb7", "Qf3"],
    explanations: [
      "Take central space and keep your setup flexible.",
      "Black mirrors the center and waits for your plan.",
      "Get the bishop outside the pawn chain first.",
      "Black develops and contests the key central squares.",
      "Support {{square d4}} and prepare a stable London structure.",
      "Black supports {{square d5}} and opens the dark bishop.",
      "Develop without showing whether the game will stay quiet or turn sharp.",
      "Black avoids ...B{{square d6}} for the moment and keeps the bishop at home.",
      "B{{square d3}} improves your kingside pressure and lines up with later queen lifts.",
      "Black starts the standard break against {{square d4}}.",
      "{{square c3}} keeps the center together and prevents Black from undermining it too easily.",
      "Black castles and assumes White will do the same soon.",
      "Nb{{square d2}} brings the last minor piece toward {{square e4}} and N{{square e5}} support.",
      "Black prepares to fianchetto or at least cover the queenside more carefully.",
      "N{{square e5}} is the moment the London stops being a setup and starts becoming an attack.",
      "Black develops, but {{square h7}} and the dark squares are still the long-term concern.",
      "Q{{square f3}} is the lift. It reinforces {{square e4}} pressure, lines up against {{square h7}}, and prepares the same kind of kingside pressure the simpler Q{{square h5}} lines aim for."
    ]
  },

  {
    id: "london-vs-kid-center-grab",
    name: "London vs King's Indian setup",
    description: "Against ...g6 and ...d6, the usual London plan is too tame. Grab the center with Nc3 and e4 before Black finishes the setup.",
    moves: ["d4", "Nf6", "Bf4", "g6", "Nc3", "Bg7", "e4", "d6", "Qd2", "O-O", "O-O-O"],
    explanations: [
      "Take central space and keep several structures available.",
      "Black avoids ...{{square d5}} and heads for a King's Indian setup.",
      "Against the King's Indian, I think you should abandon the traditional pyramid and play with N{{square c3}} and Q{{square d2}}.",
      "Black commits to the fianchetto.",
      "N{{square c3}} is important here. We're going to try to trade that dark-squared bishop and castle long!",
      "Black finishes the bishop setup and prepares ...{{square d6}}.",
      "Now {{square e4}} is the point. Plop a second pawn in the center if they let you!",
      "Black finally supports the dark squares, but White already has the bigger center.",
      "Q{{square d2}} connects rooks, supports queenside castling, and prepares to trade the fianchettoed bishop with B{{square h6}}.",
      "Black castles into the side we are about to attack.",
      "Castle long! The plan is simple: if they castle, h4 and h5 are coming to blow them off the board."
    ]
  },

  {
    id: "london-dxc5-nasty-trap",
    name: "London: the dxc5 nasty trap",
    description: "If Black tries to undermine your c5 pawn with ...b6, you have a venomous trap involving Bxb8 and Bb5+.",
    moves: ["d4", "d5", "Bf4", "Nf6", "e3", "c5", "dxc5", "e6", "b4", "b6", "Bxb8", "Rxb8", "Bb5+", "Bd7", "c6"],
    explanations: [
      "Start with the usual {{square d4}}.",
      "Black mirrors.",
      "B{{square f4}} gets the bishop out.",
      "Black develops.",
      "{{square e3}} supports the center.",
      "Black strikes with ...{{square c5}}.",
      "Taking on {{square c5}} is actually very venomous if you know the follow-up.",
      "Black prepares to win the pawn back.",
      "We hang on to the pawn with {{square b4}}.",
      "Black tries to undermine your pawns with ...{{square b6}}. Now comes the trap!",
      "B{{square b8}}! We trade our active bishop to set up a devastating check.",
      "Black recaptures, unaware of the danger.",
      "B{{square b5}} check! This is the point.",
      "Black must block.",
      "The pawn pushes through to {{square c6}} and the game is effectively over. We discovered check next and win material!"
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
      "London bishop out before {{square e3}} locks it in.",
      "Black develops and increases central influence.",
      "Stabilize {{square d4}} and open lines for your pieces.",
      "Black supports {{square d5}} and prepares development.",
      "Develop and keep options open for {{square c4}} or {{square e3}}.",
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
      "Black mirrors and contests {{square d4}}.",
      "Develop actively before {{square e3}} locks the bishop.",
      "Black develops and fights for central squares.",
      "Stabilize {{square d4}} and open the light bishop and queen.",
      "Black supports {{square d5}} and opens development options.",
      "Develop and keep your pawn structure flexible.",
      "Black aims to trade your active bishop.",
      "Develop and prepare {{square e4}} ideas with better support.",
      "Black completes king safety and development.",
      "Create an outpost and support more active central play, often connected to an eventual {{square e4}} break."
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
      "Develop the bishop before locking it in with {{square e3}}.",
      "Develop and contest {{square e4}} and {{square d5}}.",
      "Support {{square d4}} and open the dark bishop and queen.",
      "Immediate pressure on {{square d4}} and a typical counterpunch.",
      "Defend {{square d5}} pressure points and add central control.",
      "Add more pressure on {{square d4}} and support ...{{square e5}} ideas.",
      "Aim at {{square c7}} and set up a concrete tactical threat.",
      "Try to kick the bishop and open lines quickly.",
      "Take the pawn while the tactics still hold.",
      "Recover material and centralize a piece.",
      "Remove the knight and open lines in the center.",
      "Hit {{square c3}} and create threats against {{square f2}} and {{square d2}} squares.",
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
      "Develop actively before committing to {{square e3}}.",
      "Develop and contest {{square e4}}.",
      "Support {{square d4}} and open your pieces.",
      "Solidify {{square d5}} and prepare ...B{{square d6}}.",
      "Develop and keep king safety simple.",
      "Challenge your bishop and develop a piece.",
      "Use the outpost and put immediate questions to Black's setup.",
      "Strike at {{square d4}} and try to generate counterplay.",
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
      "Develop the bishop before {{square e3}} locks it in.",
      "Support {{square d5}} and open lines for Black's dark bishop.",
      "Stabilize {{square d4}} and prepare development.",
      "Attack {{square d4}} and start counterplay.",
      "Develop and guard central squares.",
      "Add pressure on {{square d4}} and support ...{{square e5}}.",
      "Increase control of {{square d5}} and {{square e4}} and support N{{square b5}} ideas.",
      "Develop and contest the center.",
      "Aim directly at {{square c7}} and set up tactics.",
      "Check plus pressure on {{square c3}} and {{square a2}}, also nudging you into {{square c3}}.",
      "Block the check and hold the {{square d4}} structure together.",
      "Strike the center and try to punish the N{{square b5}} setup.",
      "Take the pawn and keep tactics alive.",
      "Gain space and hit the {{knight d3 full}} and {{square b3}} squares later.",
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
      "Pressure {{square d4}} early.",
      "Support {{square d4}} and open your pieces.",
      "Add pressure on {{square d4}} and support ...{{square e5}}.",
      "Develop and keep N{{square b5}} tactics available.",
      "Develop and contest {{square e4}}.",
      "Put pressure on {{square c7}} and threaten tactics.",
      "Check that also hits {{square c3}} ideas.",
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
      "Develop before {{square e3}} locks the bishop.",
      "Support ...{{square e5}} and develop a piece.",
      "Solidify {{square d4}} and open your pieces.",
      "Support ...{{square e5}} but weaken dark squares and king safety.",
      "Develop and prepare to meet ...{{square e5}}.",
      "Challenge the center immediately.",
      "Accept the challenge and remove central tension.",
      "Black recaptures and opens the f file.",
      "Take the pawn and hit {{square c6}} and {{square f7}} squares.",
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
      "Develop and contest {{square e4}}.",
      "Support {{square d4}} and open your pieces.",
      "Solidify {{square d5}} and open Black's bishop.",
      "Develop and prepare to castle.",
      "Challenge the bishop and develop.",
      "Centralize and create direct pressure.",
      "Strike at {{square d4}} and create counterplay.",
      "Force a response and improve your piece activity.",
      "Block and offer trades.",
      "Trade a piece to simplify.",
      "Black grabs the bishop, removing a key London piece.",
      "Win the {{square c5}} pawn with check and gain tempo."
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
      "Develop the bishop before {{square e3}}.",
      "Develop and contest {{square e4}}.",
      "Support {{square d4}} and open pieces.",
      "Solidify {{square d5}} and prepare development.",
      "Develop and keep king safety options.",
      "Challenge your bishop and develop.",
      "Centralize and point pieces toward the kingside.",
      "Black secures the king.",
      "Support {{square e4}} ideas and keep pieces coordinated.",
      "Strike at {{square d4}} and open lines.",
      "Support {{square d4}} and control central squares.",
      "Develop and add pressure on {{square d4}} and {{square e5}}.",
      "Aim at {{square h7}} and build attacking chances.",
      "Black removes the knight to reduce pressure.",
      "Keep a strong pawn center and open the d file.",
      "Reposition to challenge {{square e5}} and defend key squares.",
      "Re-develop and keep the attack alive.",
      "Support ...Nx{{square e5}} ideas and defend {{square h7}} indirectly.",
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
      "Develop and contest {{square e4}}.",
      "Support {{square d4}} and open pieces.",
      "Develop and support ...{{square e5}} or ...{{square c5}}.",
      "Develop and prepare to castle.",
      "Solidify {{square d5}} and open development.",
      "Support {{square e4}} ideas and keep options flexible.",
      "Challenge your bishop and develop.",
      "Centralize and define the plan.",
      "Black secures the king.",
      "Support {{square d4}} and reduce tactical hits on {{square b2}}.",
      "Black grabs the outpost and trades pieces.",
      "Remove the centralized knight.",
      "Black recaptures and opens central files.",
      "Support {{square e4}} pressure and prepare kingside or queenside plans.",
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
      "Solid support for {{square d5}} and prepare ...B{{square f5}}.",
      "Support {{square d4}} and open your pieces.",
      "Develop and contest {{square e4}}.",
      "Increase central tension and shift toward QG structures.",
      "Develop and contest your bishop's diagonal.",
      "Pressure {{square b7}} and {{square d5}} and ask an early question.",
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
      "Black mirrors and fights for {{square e4}}.",
      "Increase central tension and challenge {{square d5}} directly.",
      "Support {{square d5}} and open the dark bishop.",
      "Develop and add control of {{square d5}}.",
      "Develop and contest {{square e4}}.",
      "Support {{square d4}} and open your pieces."
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
      "Develop the bishop before {{square e3}}.",
      "Support {{square d5}} and open lines.",
      "Stabilize the center and open pieces.",
      "Challenge your bishop and develop.",
      "Directly pressure {{square g7}} and force Black to decide.",
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
      "Support ...{{square e5}} but weaken the king and dark squares.",
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
      "Black mirrors and contests {{square e4}}.",
      "Challenge {{square d5}} and open the game.",
      "Black takes and tries to hold the pawn.",
      "Prepare to recapture {{square c4}} and open pieces.",
      "Support the extra pawn and gain queenside space.",
      "Target {{square f5}} and prepare tactical pressure.",
      "Support {{square b5}} and prepare ...{{square e6}} or ...N{{square f6}}.",
      "Remove the defender on {{square b8}} and simplify.",
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
      "Challenge {{square d5}} and increase central tension.",
      "Black takes and tries to hold the pawn.",
      "Prepare to recapture and open the bishop.",
      "Support the {{pawn c4 full}}.",
      "Pressure {{square f5}} and watch tactical targets.",
      "Support {{square b5}} and prepare development.",
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
      "Black develops and contests {{square e4}}.",
      "Support {{square d4}} and open pieces.",
      "Black develops and contests your bishop.",
      "Increase central tension.",
      "Support {{square d5}} and open lines.",
      "Pressure {{square b7}} and {{square d5}} early.",
      "Defend {{square b7}} and prepare ...B{{square b7}}.",
      "Develop and add central control.",
      "Develop and prepare to castle.",
      "Clarify the center and open files.",
      "Recapture and keep a central pawn presence.",
      "N{{square b5}} is the key jump. It increases pressure on {{square c7}} and makes Black solve a concrete problem.",
      "Black blocks the diagonal and tries to untangle without giving up {{square c7}}.",
      "Trade the bishop when it helps remove defenders and simplify into a favorable structure.",
      "Black recaptures, but the {{square d6}} pawn can become a long-term target and the c-file stays sensitive.",
      "R{{square c1}} is the follow-up. Put a rook on the open file and keep {{square c7}} and {{square c8}} under pressure."
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
      "Develop the bishop actively before {{square e3}}.",
      "Black develops and contests {{square e4}}.",
      "Support {{square d4}} and open your pieces.",
      "Black supports {{square d5}} and prepares ...B{{square d6}}.",
      "Develop and prepare to castle.",
      "Black challenges your {{bishop f4 full}}.",
      "Establish an outpost and increase pressure on {{square c6}} and {{square f7}}.",
      "Black strikes at {{square d4}} for counterplay.",
      "Pin the {{knight c6 full}} and increase tactical pressure.",
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
      "Develop the bishop before {{square e3}}.",
      "Black supports {{square d5}} and opens lines.",
      "Stabilize {{square d4}} and open development.",
      "Black challenges your bishop.",
      "Attack {{square g7}} and force Black to make decisions.",
      "Black trades bishops but weakens {{square g7}}.",
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
      "Develop actively before {{square e3}}.",
      "Weakening move to prepare ...{{square e5}}, but creates dark-square weaknesses.",
      "Support {{square d4}} and prepare development.",
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
      "Black develops and contests {{square e4}}.",
      "Increase central tension.",
      "Black takes and tries to hold the pawn.",
      "Prepare to recapture {{square c4}} and open the bishop.",
      "Support the {{pawn c4 full}} and gain queenside space.",
      "Target the {{bishop f5 full}} and pressure {{square c6}}/{{square b7}}.",
      "Support {{square b5}} and prepare ...{{square e6}} or development.",
      "Remove the knight that defends key squares and can lead to tactical shots.",
      "Black recaptures, leaving the {{queen f5 full}} potentially undefended.",
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
      "Challenge {{square d5}} and increase tension.",
      "Black takes and tries to hold the pawn.",
      "Prepare to recapture and open the bishop.",
      "Support the {{pawn c4 full}}.",
      "Pressure {{square f5}} and prepare tactics.",
      "Support {{square b5}} and prepare development.",
      "Remove defender of {{square a8}} and create tactical opportunities.",
      "Black grabs material but loses coordination.",
      "Check that wins back material and disrupts Black's position.",
      "Black blocks but leaves the {{square a8}} rook vulnerable.",
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
      "Black develops and contests {{square e4}}.",
      "Support {{square d4}} and open pieces.",
      "Black develops and contests {{square e4}}.",
      "Increase central tension.",
      "Support {{square d5}} and open lines.",
      "Pressure {{square b7}} and {{square d5}}.",
      "Defend {{square b7}} and prepare ...B{{square b7}}.",
      "Develop and add central control.",
      "Develop and prepare to castle.",
      "Clarify the center and open files.",
      "Recapture and maintain central presence.",
      "Jump into {{square c7}}, putting pressure on Black's position.",
      "Black challenges your bishop.",
      "Trade bishops to simplify.",
      "Black recaptures, creating an isolated pawn.",
      "Control the c-file and pressure {{square c7}}."
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
      "Challenge {{square d5}} and increase tension.",
      "Black takes the pawn.",
      "Prepare to recapture {{square c4}} and open the bishop.",
      "Support the {{pawn c4 full}}.",
      "Target {{square f5}} and prepare tactics.",
      "Support {{square b5}} and prepare ...{{square e6}}.",
      "Remove the knight defending {{square a8}}.",
      "Black takes the knight but loses coordination.",
      "Check that wins material and creates threats.",
      "Black blocks the check but leaves {{square a8}} vulnerable.",
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
      "Black develops and contests {{square e4}}.",
      "Support {{square d4}} and open pieces.",
      "Black develops and contests {{square e4}}.",
      "Increase central tension.",
      "Support {{square d5}} and open lines.",
      "Pressure {{square b7}} and {{square d5}}.",
      "Defend {{square b7}} and prepare ...B{{square b7}}.",
      "Develop and add central control.",
      "Develop and prepare to castle.",
      "Clarify the center and open files.",
      "Recapture and maintain central presence.",
      "Jump into {{square c7}}, threatening the rook and creating pressure.",
      "Black defends {{square c7}} with the knight.",
      "Pin the {{knight a6 full}} and increase queenside pressure."
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
      "Black develops and contests {{square e4}}.",
      "Support {{square d4}} and open pieces.",
      "Black develops and supports ...{{square e5}}.",
      "Develop and prepare to castle.",
      "Pin the {{knight f3 full}}.",
      "Pin the {{knight c6 full}} and create threats.",
      "Support {{square d5}} and open the bishop.",
      "Challenge the bishop and gain space.",
      "Retreat and maintain the pin.",
      "Attack the bishop and gain kingside space.",
      "Retreat to a safer square.",
      "Centralize and create threats.",
      "Black challenges your bishop.",
      "Remove the defender of {{square a8}}.",
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
      "Black develops and contests {{square e4}}.",
      "Support {{square d4}} and open pieces.",
      "Black supports {{square d5}} and opens lines.",
      "Develop and prepare to castle.",
      "Challenge your bishop.",
      "Centralize and create threats.",
      "Black castles to safety.",
      "Support {{square e4}} ideas and prepare kingside play.",
      "Black strikes at {{square d4}}.",
      "Support {{square d4}} and control central squares.",
      "Black develops and adds pressure.",
      "Aim at {{square h7}} and build attacking chances.",
      "Black defends {{square e5}} and connects rooks.",
      "Reposition the knight for kingside attack.",
      "Black repositions to challenge {{square e5}}.",
      "Direct attack on {{square h7}} and {{square f7}}.",
      "Black defends {{square h7}} but weakens dark squares.",
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
      "Black develops and supports ...{{square e5}}.",
      "Support {{square d4}} and open pieces.",
      "Black develops and contests {{square e4}}.",
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
      "Black develops and supports ...{{square e5}}.",
      "Support {{square d4}} and open pieces.",
      "Black develops and contests {{square e4}}.",
      "Increase central tension.",
      "Support {{square d5}} and open lines.",
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
      "Support {{square d5}} and prepare ...B{{square f5}}.",
      "Support {{square d4}} and open pieces.",
      "Black develops and contests {{square e4}}.",
      "Increase central tension.",
      "Support {{square d5}} and open lines.",
      "Pressure {{square b7}} and {{square d5}}.",
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
      "Black develops and contests {{square e4}}.",
      "Increase central tension.",
      "Support {{square d5}} and prepare ...{{square e6}}.",
      "Pressure {{square b7}} and {{square d5}}.",
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
      "Black supports {{square d5}} and opens lines.",
      "Support {{square d4}} and open pieces.",
      "Black develops and contests {{square e4}}.",
      "Develop and prepare to castle.",
      "Challenge your bishop.",
      "Establish an outpost.",
      "Black challenges the {{knight e5 full}}.",
      "Support the {{knight e5 full}} and prepare {{square f4}} or other ideas.",
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
      "Support {{square d5}} and prepare ...B{{square f5}}.",
      "Support {{square d4}} and open pieces.",
      "Black develops and contests {{square e4}}.",
      "Increase central tension.",
      "Black develops and contests {{square e4}}.",
      "Pressure {{square b7}} and {{square d5}}.",
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
      "Black develops and contests {{square e4}}.",
      "Increase central tension.",
      "Black takes the pawn.",
      "Support {{square d4}} and open pieces.",
      "Support {{square d5}} and open lines.",
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
      "Black develops and contests {{square e4}}.",
      "Support {{square d4}} and open pieces.",
      "Black develops and supports ...{{square e5}}.",
      "Develop and prepare to castle.",
      "Black supports {{square d5}} and opens lines.",
      "Support {{square e4}} ideas and keep options flexible.",
      "Challenge your bishop.",
      "Establish an outpost.",
      "Black castles to safety.",
      "Support {{square d4}} and reduce tactics.",
      "Black grabs an outpost and offers trades.",
      "Remove the centralized knight.",
      "Black recaptures and opens the center.",
      "Support {{square e4}} and prepare kingside play.",
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
      "Black supports {{square d5}} and opens lines.",
      "Stabilize the center and open pieces.",
      "Challenge your bishop.",
      "Attack {{square g7}} and force a response.",
      "Black defends {{square g7}} and forces the queen to move.",
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
      "Black develops and contests {{square e4}}.",
      "Support {{square d4}} and open pieces.",
      "Black supports {{square d5}} and opens lines.",
      "Develop and prepare to castle.",
      "Black strikes at {{square d4}}.",
      "Support the center and prepare {{square e4}} ideas.",
      "Black develops and adds pressure on {{square d4}}.",
      "Support {{square d4}} and create a solid pawn structure."
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
      "Black develops and supports ...{{square e5}}.",
      "Support {{square d4}} and open pieces.",
      "Prevent B{{square b5}} ideas and prepare ...{{square b5}}.",
      "Develop and prepare to castle.",
      "Black develops and contests {{square e4}}.",
      "Develop the bishop to an active square.",
      "Pin the {{knight f3 full}}.",
      "Develop and prepare to break the pin with {{square h3}} or other means."
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
      "Black develops and contests {{square e4}}.",
      "Support {{square d4}} and open pieces.",
      "Black develops and supports ...{{square e5}}.",
      "Develop and prepare to castle.",
      "Pin the {{knight f3 full}}.",
      "Pin the {{knight c6 full}} and create threats.",
      "Support {{square d5}} and open lines.",
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
      "Black develops and contests {{square e4}}.",
      "Increase central tension.",
      "Support {{square d5}} and open lines.",
      "Develop and increase control of central squares.",
      "Black develops and contests {{square e4}}.",
      "Support {{square d4}} and open pieces, completing the basic London setup."
    ]
  }
]);