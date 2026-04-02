import { withOpeningFeedback } from "./feedback";

// src/openings/viennaGambitLines.js

export const viennaGambitLines = withOpeningFeedback([
  
  {
    category: "Vienna Gambit",
    id: "vienna-gambit-accepted",
    name: "Vienna Gambit: The Accepted Trap",
    description: "When Black accepts the gambit, we punish them immediately by kicking their knight back to g8.",
    moves: ["e4", "e5", "Nc3", "Nf6", "f4", "exf4", "e5", "Ng8", "Nf3", "d6", "d4"],
    explanations: [
      "Let's learn the Vienna Gambit! White starts with {{square e4}}.",
      "Black responds symmetrically.",
      "The Vienna Knight! We delay N{{square f3}} to keep the f-pawn flexible.",
      "Black develops their best defender.",
      "The Gambit! We offer the f-pawn to deflect the knight and open the f-file.",
      "The Mistake! Black accepts the pawn, but they're about to lose precious time.",
      "The Punishment! We push {{square e5}}, and the knight has no forward squares. It's forced all the way back to the start!",
      "Black admits the mistake and retreats. White has won massive time for free.",
      "The Golden Rule! We play N{{square f3}} to stop any ...Q{{square h4}}+ ideas and prepare to build the center.",
      "Black tries to strike back before we get too comfortable.",
      "Solidify! We build our dream pawn center. White is dominating development and space. This is why you don't take the Vienna Gambit!"
    ]
  },

  {
    id: "vienna-gambit-01-bd8b935b",
    name: "Accepted: Nh5 blunder punished",
    description: "If Black tries to keep the knight active with Nh5, we win the piece immediately.",
    moves: ["e4", "e5", "Nc3", "Nf6", "f4", "exf4", "e5", "Nh5", "Qxh5"],
    explanations: [
      "White claims the center.",
      "Let's learn the Vienna Gambit! Black responds.",
      "The Vienna Knight.",
      "Black develops.",
      "The Gambit offer.",
      "Accepted.",
      "The Punishment! Kicking the knight.",
      "Black tries to be tricky and jumps to the edge.",
      "BOOM! We simply win the knight. Black's attempt to avoid the retreat was a fatal blunder!"
    ]
  },

  {
    id: "vienna-gambit-mainline",
    name: "Vienna Gambit: The Main Line (3... d5)",
    description: "The only 'good' way for Black to meet the gambit. A sharp battle for central control.",
    moves: ["e4", "e5", "Nc3", "Nf6", "f4", "d5", "fxe5", "Nxe4", "Nf3", "Be7", "d4", "O-O", "Bd3"],
    explanations: [
      "White takes the center.",
      "Let's learn the Vienna Gambit! Black responds.",
      "The Vienna Knight.",
      "Black develops.",
      "The Gambit offer.",
      "The Correct Answer! Black strikes back in the center immediately.",
      "Trade! We remove the {{square e5}} defender.",
      "Black occupies the central outpost.",
      "The Gotham Rule! We play N{{square f3}} to stop the queen check and support our center.",
      "Black develops calmly.",
      "Solidify! We build our center and challenge the knight.",
      "Black castles to safety.",
      "The Golden Bishop! We put our best attacker on its favorite square, aiming directly at {{square h7}}. White has a great game!"
    ]
  },

  {
    category: "Vienna Gambit",

    id: "vienna-gambit-01-bd8b935b-original",
    name: "Nh5 blunder punished (Legacy)",
    description: "Coach style: explains the point of each move and the main tactical ideas.",
    moves: ["e4", "e5", "Nc3", "Nf6", "f4", "exf4", "e5", "Nh5", "Qxh5"],
    explanations: ["Let's learn the Vienna Gambit! Start with pawn to {{square e4}} and build toward sharp central play with the knight coming to {{square c3}}.", "Black matches your central claim and keeps everything flexible.", "support {{square e4}} and keep the f-pawn free for {{square f4}} without blocking N{{square f3}}.", "Black develops while hitting {{square e4}}, forcing you to show how you will defend the center.", "Vienna Gambit: offer a pawn to gain time, open files, and attack before Black is settled.", "Black grabs the pawn. Your job is to get quick development and targets, not to win the pawn back slowly.", "Space grab with tempo: kick the {{square f6}} knight and try to make Black waste a move while you open the center.", "Black tries to hang onto {{square f4}} and chase your queen later, but this often walks into tactics on {{square h5}}.", "Punish the knight jump: win the piece and instantly remove Black's idea of holding the {{square f4}} pawn."]
  },

  {
    id: "vienna-gambit-02-6c270e9b",
    name: "Tactic: Nxc7+ fork",
    description: "Coach style: explains the point of each move and the main tactical ideas.",
    moves: ["e4", "e5", "Nc3", "Nf6", "f4", "exf4", "e5", "Qe7", "Qe2", "Ng8", "Nf3", "d6", "Nd5", "Qe6", "Nxc7+"],
    explanations: ["Take the center and keep lines open so your pieces can jump out fast.", "Black matches your central claim and keeps everything flexible.", "support {{square e4}} and keep the f-pawn free for {{square f4}} without blocking N{{square f3}}.", "Black develops while hitting {{square e4}}, forcing you to show how you will defend the center.", "Vienna Gambit: offer a pawn to gain time, open files, and attack before Black is settled.", "Black grabs the pawn. Your job is to get quick development and targets, not to win the pawn back slowly.", "Space grab with tempo: kick the {{square f6}} knight and try to make Black waste a move while you open the center.", "Black stabilizes with the queen, defending key points and trying to prevent tactical forks on {{square c7}}.", "Queen supports {{square e4}} and eyes {{square e5}}. In Vienna lines, Q{{square e2}} often helps you regain the pawn while staying active.", "The knight retreats. That loss of time is the compensation you are playing for.", "Develop and prepare to castle. In gambits, king safety matters because open lines cut both ways.", "Black plays solid: supports {{square e5}} and prepares ...dx{{square e5}} or ...B{{square e7}} while keeping the king safe.", "Jump into the outpost: N{{square d5}} hits {{square c7}} and {{square e7}} and can create forks if Black's queen and king are uncoordinated.", "Black develops the queen to {{square e6}} to contest the center and meet your threats.", "Classic fork: hit the king and rook. This is why early queen moves by Black can be risky here."]
  },

  {
    id: "vienna-gambit-03-0b9ddfae",
    name: "...Nc6 chase and Ng5 attack",
    description: "Coach style: explains the point of each move and the main tactical ideas.",
    moves: ["e4", "e5", "Nc3", "Nf6", "f4", "Nc6", "fxe5", "Nxe5", "d4", "Ng6", "e5", "Ng8", "Nf3", "d5", "Bd3", "N8e7", "O-O", "Bf5", "Ng5"],
    explanations: ["Take the center and keep lines open so your pieces can jump out fast.", "Black matches your central claim and keeps everything flexible.", "Support {{square e4}} and keep the f-pawn free for {{square f4}} without blocking N{{square f3}}.", "Black develops while hitting {{square e4}}, forcing you to show how you will defend the center.", "Vienna Gambit: offer a pawn to gain time, open files, and attack before Black is settled.", "Black develops with ...N{{square c6}}, but the transcript's point is that this still fails to solve Black's central problems.", "Take with purpose. You remove the {{square e5}} pawn so your d-pawn can hit the center next.", "Black recaptures and hopes simplification will blunt your initiative.", "Strike with {{square d4}} while Black is still behind. This is the whole gambit idea: use time to open lines.", "The knight steps aside, but White keeps gaining space and tempi.", "Drive the knight again. After {{square e5}}, Black's minor pieces start losing coordination.", "The knight is pushed all the way back. That loss of time is your compensation for the pawn.", "Develop and prepare to castle. Your pieces are ready to use the open diagonals and files.", "Black tries to hit back in the center before the attack lands.", "Develop the bishop to {{square d3}} where it points straight at {{square h7}} and supports kingside pressure.", "Black develops the {{knight g8 full}} to {{square e7}} because {{square f6}} is no longer available.", "Castle so the rook can use the semi-open f-file and the king is no longer a target.", "Black tries to trade pieces and make life easier.", "Jump forward. N{{square g5}} is the transcript's attacking idea: White targets {{square f7}} with the bishop, queen, and f-rook all ready to join."]
  },

  {
    id: "vienna-gambit-04-db06b173",
    name: "Solid ...d6 setup",
    description: "Coach style: explains the point of each move and the main tactical ideas.",
    moves: ["e4", "e5", "Nc3", "Nf6", "f4", "exf4", "e5", "Ng8", "Nf3", "Nc6", "d4", "d6", "Bxf4", "dxe5", "Nxe5", "Nxe5", "Bxe5"],
    explanations: ["Take the center and keep lines open so your pieces can jump out fast.", "Black matches your central claim and keeps everything flexible.", "support {{square e4}} and keep the f-pawn free for {{square f4}} without blocking N{{square f3}}.", "Black develops while hitting {{square e4}}, forcing you to show how you will defend the center.", "Vienna Gambit: offer a pawn to gain time, open files, and attack before Black is settled.", "Black grabs the pawn. Your job is to get quick development and targets, not to win the pawn back slowly.", "Space grab with tempo: kick the {{square f6}} knight and try to make Black waste a move while you open the center.", "The knight retreats. That loss of time is the compensation you are playing for.", "Develop and prepare to castle. In gambits, king safety matters because open lines cut both ways.", "Black develops and adds pressure on {{square e5}} and {{square d4}}, aiming to meet your center with pieces, not just pawns.", "Open the center while you are ahead in development. This is how gambits convert time into attack.", "Black plays solid: supports {{square e5}} and prepares ...dx{{square e5}} or ...B{{square e7}} while keeping the king safe.", "Capture with purpose: either win material back, remove a defender, or open a file for attack.", "Black trades in the center to reduce your space and open lines before your attack is ready.", "Capture with purpose: either win material back, remove a defender, or open a file for attack.", "Black captures to simplify or to remove your attacking pieces.", "Capture with purpose: either win material back, remove a defender, or open a file for attack."]
  },

  {
    id: "vienna-gambit-05-9569edf5",
    name: "Qe2 recapture without queen trade",
    description: "Coach style: explains the point of each move and the main tactical ideas.",
    moves: ["e4", "e5", "Nc3", "Nf6", "f4", "exf4", "e5", "Ng8", "Nf3", "d6", "d4", "dxe5", "Qe2", "Nc6", "Bxf4"],
    explanations: ["Take the center and keep lines open so your pieces can jump out fast.", "Black matches your central claim and keeps everything flexible.", "Support {{square e4}} and keep the f-pawn free for {{square f4}} without blocking N{{square f3}}.", "Black develops while hitting {{square e4}}, forcing you to show how you will defend the center.", "Vienna Gambit: offer a pawn to gain time, open files, and attack before Black is settled.", "Black grabs the pawn. Your job is to get quick development and targets, not to win the pawn back slowly.", "Push {{square e5}} with tempo and drive the {{knight f6 full}} away before Black can coordinate.", "The knight has to retreat. This is the practical point of the gambit against ...ex{{square f4}}.", "Develop first. The transcript is clear that N{{square f3}} also keeps the annoying ...Q{{square h4}}+ idea under control.", "Black chooses the passive ...{{square d6}} structure, which keeps the dark bishop boxed in.", "Hit the center while Black is undeveloped. You want open lines, not a slow pawn chase.", "Black takes on {{square e5}} and invites a queen trade if White recaptures carelessly.", "Q{{square e2}} is the key transcript idea. You keep queens on the board, keep the {{pawn e5 full}} pinned, and still plan to win it back.", "Black develops a piece, but that still does not solve the {{pawn e5 full}} problem.", "Recover the {{pawn f4 full}} with development. White keeps the better activity and Black still has trouble untangling."]
  },

  {
    id: "vienna-gambit-06-87b67a22",
    name: "Tactic: Nxc7+ fork",
    description: "Coach style: explains the point of each move and the main tactical ideas.",
    moves: ["e4", "e5", "Nc3", "Nf6", "f4", "exf4", "e5", "Qe7", "Qe2", "Ng8", "Nf3", "Nc6", "d4", "d6", "Nd5", "Qd8", "Nxc7+", "Qxc7", "exd6+", "Be7", "dxc7"],
    explanations: ["Take the center and keep lines open so your pieces can jump out fast.", "Black matches your central claim and keeps everything flexible.", "support {{square e4}} and keep the f-pawn free for {{square f4}} without blocking N{{square f3}}.", "Black develops while hitting {{square e4}}, forcing you to show how you will defend the center.", "Vienna Gambit: offer a pawn to gain time, open files, and attack before Black is settled.", "Black grabs the pawn. Your job is to get quick development and targets, not to win the pawn back slowly.", "Space grab with tempo: kick the {{square f6}} knight and try to make Black waste a move while you open the center.", "Black stabilizes with the queen, defending key points and trying to prevent tactical forks on {{square c7}}.", "Queen supports {{square e4}} and eyes {{square e5}}. In Vienna lines, Q{{square e2}} often helps you regain the pawn while staying active.", "The knight retreats. That loss of time is the compensation you are playing for.", "Develop and prepare to castle. In gambits, king safety matters because open lines cut both ways.", "Black develops and adds pressure on {{square e5}} and {{square d4}}, aiming to meet your center with pieces, not just pawns.", "Open the center while you are ahead in development. This is how gambits convert time into attack.", "Black plays solid: supports {{square e5}} and prepares ...dx{{square e5}} or ...B{{square e7}} while keeping the king safe.", "Jump into the outpost: N{{square d5}} hits {{square c7}} and {{square e7}} and can create forks if Black's queen and king are uncoordinated.", "Black steps back to remove tactics and keep the position under control.", "Classic fork: hit the king and rook. This is why early queen moves by Black can be risky here.", "Black captures to simplify or to remove your attacking pieces.", "Play with check to gain tempo and force a defensive move, keeping your initiative alive.", "Black develops calmly and aims to castle, trying to survive the opening phase without concessions.", "Capture with purpose: either win material back, remove a defender, or open a file for attack."]
  },

  {
    id: "vienna-gambit-07-1b726472",
    name: "Check with Bb5+",
    description: "Coach style: explains the point of each move and the main tactical ideas.",
    moves: ["e4", "e5", "Nc3", "Nf6", "f4", "exf4", "e5", "Ng8", "Nf3", "g5", "d4", "g4", "Bxf4", "gxf3", "Qxf3", "d6", "Bb5+", "c6", "O-O", "cxb5", "Bg5"],
    explanations: ["Take the center and keep lines open so your pieces can jump out fast.", "Black matches your central claim and keeps everything flexible.", "support {{square e4}} and keep the f-pawn free for {{square f4}} without blocking N{{square f3}}.", "Black develops while hitting {{square e4}}, forcing you to show how you will defend the center.", "Vienna Gambit: offer a pawn to gain time, open files, and attack before Black is settled.", "Black grabs the pawn. Your job is to get quick development and targets, not to win the pawn back slowly.", "Space grab with tempo: kick the {{square f6}} knight and try to make Black waste a move while you open the center.", "The knight retreats. That loss of time is the compensation you are playing for.", "Develop and prepare to castle. In gambits, king safety matters because open lines cut both ways.", "Black supports the extra pawn and gains space, but also weakens the king side squares.", "Open the center while you are ahead in development. This is how gambits convert time into attack.", "Black tries to kick your knight and keep lines closed, but it creates targets and can open the g-file.", "Capture with purpose: either win material back, remove a defender, or open a file for attack.", "Black captures to simplify or to remove your attacking pieces.", "Capture with purpose: either win material back, remove a defender, or open a file for attack.", "Black plays solid: supports {{square e5}} and prepares ...dx{{square e5}} or ...B{{square e7}} while keeping the king safe.", "Play with check to gain tempo and force a defensive move, keeping your initiative alive.", "Black advances a pawn to challenge your center or create counterplay.", "Castle to turn your development lead into real threats without your king getting checked forever.", "Black captures to simplify or to remove your attacking pieces.", "Develop the bishop to {{square g5}} so it can influence the center and join the attack."]
  },

  {
    id: "vienna-gambit-08-d4b5e0e1",
    name: "Solid ...d6 setup",
    description: "Coach style: explains the point of each move and the main tactical ideas.",
    moves: ["e4", "e5", "Nc3", "Nf6", "f4", "exf4", "e5", "Ng8", "Nf3", "d6", "d4", "dxe5", "Qe2", "Bb4", "Qxe5+", "Qe7", "Bxf4"],
    explanations: ["Take the center and keep lines open so your pieces can jump out fast.", "Black matches your central claim and keeps everything flexible.", "support {{square e4}} and keep the f-pawn free for {{square f4}} without blocking N{{square f3}}.", "Black develops while hitting {{square e4}}, forcing you to show how you will defend the center.", "Vienna Gambit: offer a pawn to gain time, open files, and attack before Black is settled.", "Black grabs the pawn. Your job is to get quick development and targets, not to win the pawn back slowly.", "Space grab with tempo: kick the {{square f6}} knight and try to make Black waste a move while you open the center.", "The knight retreats. That loss of time is the compensation you are playing for.", "Develop and prepare to castle. In gambits, king safety matters because open lines cut both ways.", "Black plays solid: supports {{square e5}} and prepares ...dx{{square e5}} or ...B{{square e7}} while keeping the king safe.", "Open the center while you are ahead in development. This is how gambits convert time into attack.", "Black trades in the center to reduce your space and open lines before your attack is ready.", "Queen supports {{square e4}} and eyes {{square e5}}. In Vienna lines, Q{{square e2}} often helps you regain the pawn while staying active.", "Black pins the knight to slow your development and increase pressure on {{square e4}} and {{square d4}}.", "Play with check to gain tempo and force a defensive move, keeping your initiative alive.", "Black stabilizes with the queen, defending key points and trying to prevent tactical forks on {{square c7}}.", "Capture with purpose: either win material back, remove a defender, or open a file for attack."]
  },

  {
    id: "vienna-gambit-09-ad3aae2a",
    name: "Qe2 recovery with Bb5 and d5 clamp",
    description: "Coach style: explains the point of each move and the main tactical ideas.",
    moves: ["e4", "e5", "Nc3", "Nf6", "f4", "exf4", "e5", "Ng8", "Nf3", "d6", "d4", "dxe5", "Qe2", "Be7", "Qxe5", "Nc6", "Bb5", "Bd7", "Bxc6", "Bxc6", "d5", "Bd7", "Bxf4"],
    explanations: ["Take the center and keep lines open so your pieces can jump out fast.", "Black matches your central claim and keeps everything flexible.", "Support {{square e4}} and keep the f-pawn free for {{square f4}} without blocking N{{square f3}}.", "Black develops while hitting {{square e4}}, forcing you to show how you will defend the center.", "Vienna Gambit: offer a pawn to gain time, open files, and attack before Black is settled.", "Black grabs the pawn. Your job is to get quick development and targets, not to win the pawn back slowly.", "Push {{square e5}} with tempo and force the knight off active squares.", "The knight retreats. White has won time and now wants to open the center before Black recovers.", "Develop and cover the dark diagonal so ...Q{{square h4}}+ never becomes the annoying equalizer.", "Black chooses the passive ...{{square d6}} shell to hold the center together.", "Open the center while you are ahead in development. This is how gambits convert time into attack.", "Black reduces the central tension, but that still leaves White with faster development.", "Q{{square e2}} keeps queens on the board and keeps the {{pawn e5 full}} pinned, matching the transcript's practical recommendation.", "Black develops, hoping to finish castling before White's lead matters.", "Take back with activity. White wants the pawn back without giving up the initiative.", "Black develops another piece, but White can keep asking questions.", "B{{square b5}} is a useful pin. It slows Black's coordination and prepares structural damage on {{square c6}}.", "Black unpins and tries to complete development.", "Give up the bishop pair to damage Black's queenside structure and make {{square d5}} more annoying.", "Black recaptures, but the c-pawns and the {{bishop c6 full}} can become targets.", "Clamp the structure. The transcript's theme here is that White keeps gaining space while Black's pieces trip over each other.", "Black retreats because the bishop no longer has a clean active role.", "Recover the {{pawn f4 full}} and finish the opening with the healthier structure and better piece play."]
  },

  {
    id: "vienna-gambit-10-07fba3d5",
    name: "Solid ...d6 setup",
    description: "Coach style: explains the point of each move and the main tactical ideas.",
    moves: ["e4", "e5", "Nc3", "Nf6", "f4", "d6", "Nf3", "exf4", "d4"],
    explanations: ["Take the center and keep lines open so your pieces can jump out fast.", "Black matches your central claim and keeps everything flexible.", "support {{square e4}} and keep the f-pawn free for {{square f4}} without blocking N{{square f3}}.", "Black develops while hitting {{square e4}}, forcing you to show how you will defend the center.", "Vienna Gambit: offer a pawn to gain time, open files, and attack before Black is settled.", "Black plays solid: supports {{square e5}} and prepares ...dx{{square e5}} or ...B{{square e7}} while keeping the king safe.", "Develop and prepare to castle. In gambits, king safety matters because open lines cut both ways.", "Black grabs the pawn. Your job is to get quick development and targets, not to win the pawn back slowly.", "Open the center while you are ahead in development. This is how gambits convert time into attack."]
  },

  {
    id: "vienna-gambit-11-3a106f98",
    name: "...d6 pin and e5 pawn win",
    description: "Coach style: explains the point of each move and the main tactical ideas.",
    moves: ["e4", "e5", "Nc3", "Nf6", "f4", "d6", "Nf3", "Nc6", "Bb5", "Bd7", "d3", "Be7", "O-O", "a6", "Bxc6", "Bxc6", "Nxe5"],
    explanations: ["Take the center and keep lines open so your pieces can jump out fast.", "Black matches your central claim and keeps everything flexible.", "Support {{square e4}} and keep the f-pawn free for {{square f4}} without blocking N{{square f3}}.", "Black develops while hitting {{square e4}}, forcing you to show how you will defend the center.", "Vienna Gambit: offer a pawn to gain time, open files, and attack before Black is settled.", "Black chooses the passive ...{{square d6}} setup. The transcript treats this as solid-looking but too slow.", "Develop first and keep pressure on {{square e5}}. White does not need to rush the pawn grab.", "Black develops the knight and keeps guarding {{square e5}} for the moment.", "Pin the {{knight c6 full}}. This is the transcript's Ruy Lopez style idea, but with the extra f-pawn already advanced.", "Black breaks the pin route and tries to complete development.", "Support {{square e4}} first. This detail matters because White wants to attack {{square e5}} without dropping the center.", "Black develops the bishop, but this is exactly the kind of move the transcript says often loses the {{pawn e5 full}} anyway.", "Castle before cashing in. The rook will also enjoy the semi-open f-file later.", "Black gains space, but also gives White the chance to damage the structure immediately.", "Eliminate the key defender. Once the {{knight c6 full}} is gone, {{square e5}} is much harder to hold.", "Black recaptures, but the {{bishop c6 full}} is now loose and the pawn chain is less stable.", "Take on {{square e5}} anyway. This is the transcript's tactical point: White has prepared the center well enough that the pawn cannot be kept."]
  },

  {
    id: "vienna-gambit-12-c5066d53",
    name: "...d5 main line with queenside castling",
    description: "Coach style: explains the point of each move and the main tactical ideas.",
    moves: ["e4", "e5", "Nc3", "Nf6", "f4", "d5", "fxe5", "Nxe4", "Qf3", "Nxc3", "bxc3", "Be7", "d4", "O-O", "Bd3", "Be6", "Ne2"],
    explanations: ["Take the center and keep lines open so your pieces can jump out fast.", "Black matches your central claim and keeps everything flexible.", "Support {{square e4}} and keep the f-pawn free for {{square f4}} without blocking N{{square f3}}.", "Black develops while hitting {{square e4}}, forcing you to show how you will defend the center.", "This is still the Vienna Gambit idea, but here Black meets it correctly with a central counterstrike.", "The transcript calls ...{{square d5}} the right practical answer because Black hits your center before your attack rolls.", "Capture so Black does not get the whole center for free.", "Black grabs {{square e4}} and immediately asks whether White can prove compensation.", "Q{{square f3}} is the transcript's recommended practical move. It covers the diagonal, hits {{square f7}}, and keeps attacking chances alive.", "Black takes on {{square c3}} because that is the most natural way to reduce White's activity.", "Recapture with the b-pawn. The structure is damaged, but you open the b-file and keep the queenside castling idea alive.", "Black develops normally and hopes to show the extra pawn matters more than White's initiative.", "Build the full center. White's compensation here is space, diagonals, and attacking prospects.", "Black castles, but that also gives White a clear target and a stable queenside castling plan.", "B{{square d3}} points straight at {{square h7}} and supports the kingside attacking setup.", "Black develops the bishop to {{square e6}} and tries to finish coordination.", "N{{square e2}} is a useful regrouping move. The knight can head for {{square f4}} or {{square g3}} while White keeps the practical initiative, even if Black is theoretically fine."]
  },

  {
    id: "vienna-gambit-14-1a7d5e63",
    name: "...d5 line with Bf4, O-O-O, and Bc4",
    description: "Coach style: explains the point of each move and the main tactical ideas.",
    moves: ["e4", "e5", "Nc3", "Nf6", "f4", "d5", "fxe5", "Nxe4", "Qf3", "Nxc3", "bxc3", "Be7", "d4", "O-O", "Bf4", "c5", "O-O-O", "Nc6", "Bc4"],
    explanations: ["Take the center and keep lines open so your pieces can jump out fast.", "Black matches your central claim and keeps everything flexible.", "Support {{square e4}} and keep the f-pawn free for {{square f4}} without blocking N{{square f3}}.", "Black develops while hitting {{square e4}}, forcing you to show how you will defend the center.", "White still goes for the gambit, but now Black chooses the strongest transcript response with a central break.", "The point of ...{{square d5}} is to hit your center before the attack is fully assembled.", "Capture so Black cannot just keep a huge center.", "Black takes on {{square e4}} and claims the initiative has been neutralized.", "Q{{square f3}} is the practical move from the transcript. It keeps the attack alive and avoids drifting into a passive position.", "Black damages the queenside structure, but also gives White open files and a clear plan.", "Recapture and accept the doubled pawns because activity matters more here than cosmetic structure.", "Black develops and tries to show that White's compensation is not enough.", "Take the center fully. White needs space and open diagonals for the gambit to work.", "Black castles, but White now knows exactly where the attack is going.", "Develop with tempo and prepare queenside castling. The bishop also helps pressure {{square d6}} and {{square c7}} ideas later.", "Black hits back on the queenside and tries to make your king placement awkward.", "Castle long anyway. The transcript's point is that this puts the rook on the open d-file and keeps the initiative rolling.", "This natural move is the transcript's claimed mistake because it leaves {{square d5}} tactically pinned to the rook and queen.", "B{{square c4}} is the key resource. White piles pressure onto {{square d5}} and turns the open d-file into a concrete tactical problem."]
  },

  {
    id: "vienna-gambit-13-cb43922c",
    name: "Qe2 recovery versus ...Be7 and ...Nf6",
    description: "Coach style: explains the point of each move and the main tactical ideas.",
    moves: ["e4", "e5", "Nc3", "Nf6", "f4", "exf4", "e5", "Ng8", "Nf3", "d6", "d4", "dxe5", "Qe2", "Be7", "Qxe5", "Nf6", "Bxf4"],
    explanations: ["Take the center and keep lines open so your pieces can jump out fast.", "Black matches your central claim and keeps everything flexible.", "Support {{square e4}} and keep the f-pawn free for {{square f4}} without blocking N{{square f3}}.", "Black develops while hitting {{square e4}}, forcing you to show how you will defend the center.", "Vienna Gambit: offer a pawn to gain time, open files, and attack before Black is settled.", "Black grabs the pawn. Your job is to get quick development and targets, not to win the pawn back slowly.", "Push {{square e5}} with tempo and force the knight away before Black can coordinate.", "The knight has to go back. This is why the transcript treats ...ex{{square f4}} as a practical mistake.", "Develop and stop the cheap ...Q{{square h4}}+ ideas before opening the center fully.", "Black chooses the passive ...{{square d6}} shell to prop up {{square e5}}.", "Challenge the center while Black is still undeveloped.", "Black takes on {{square e5}}, hoping that the queen trade will calm everything down.", "Q{{square e2}} is the clean practical fix. You avoid the queen trade and keep using the pin on {{square e5}}.", "Black develops, but the {{pawn e5 full}} still cannot be held forever.", "Take back in the center with activity. White has regained the pawn and kept the initiative.", "Black finally puts the knight back on a normal square, but White is ahead in practical development.", "Develop while recovering the last loose pawn. White leaves the opening with active pieces and a more comfortable game."]
  }

]);
