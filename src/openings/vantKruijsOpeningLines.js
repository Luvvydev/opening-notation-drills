import { withOpeningFeedback } from "./feedback";

export const vantKruijsOpeningLines = withOpeningFeedback([
  {
    category: "Main setup",
    id: "vant-kruijs-01-central-build",
    name: "Main line with ...d5, ...c5, and ...e5",
    description: "Black takes the center early, develops normally, and punishes White for wasting time with Qb3.",
    moves: ["e3", "d5", "c3", "Nf6", "d4", "c5", "Qb3", "Nc6", "Nf3", "e6", "Be2", "Bd6", "O-O", "O-O", "Nbd2", "e5"],
    explanations: [
      "White starts with a slow flexible move, but it does not challenge the center yet.",
      "Black claims central space immediately and makes White react.",
      "White prepares d4, but this is still a passive version of a queen pawn setup.",
      "Black develops naturally and keeps e4 under control.",
      "White finally builds a center, but it can still be challenged before it stabilizes.",
      "Black hits the center right away. This is the clean punishment against slow e3 systems.",
      "White's queen move looks active, but it does not create enough pressure to justify the time spent.",
      "Black develops and ignores the queen drama. Calm development matters more than tricks here.",
      "White develops toward castling and keeps the setup compact.",
      "Black supports the center and prepares a full development shell.",
      "White develops, but Black is still the side dictating the structure.",
      "Black develops the bishop to an active square and keeps pressure on the center.",
      "White castles and says the position is ready.",
      "Black castles too and removes all fake attack chances.",
      "White finishes development, but the setup has given Black too much freedom.",
      "Black strikes with ...e5 and reaches the ideal version of this anti-system plan."
    ]
  },
  {
    category: "Bishop drift",
    id: "vant-kruijs-02-bf3-slow-setup",
    name: "Bf3 setup met by clean development",
    description: "When White wastes time moving the bishop around, Black should keep building and break in the center later.",
    moves: ["e3", "d5", "c3", "Nf6", "d4", "c5", "Qb3", "Nc6", "Be2", "e6", "Bf3", "Bd6", "Nd2", "O-O", "Ne2", "e5"],
    explanations: [
      "White opens with the same slow structure and hopes to reach a comfortable setup.",
      "Black takes central space immediately.",
      "White supports d4, but this is still very modest.",
      "Black develops and keeps all the important central breaks available.",
      "White occupies the center, but the structure is not secure yet.",
      "Black challenges the center before White can drift into a free middlegame.",
      "White places the queen on b3 again, trying to create queenside pressure.",
      "Black keeps developing and refuses to overreact.",
      "White develops, but there is still no direct threat.",
      "Black supports the center and prepares smooth piece play.",
      "White loses another tempo with the bishop. That is useful only if Black cooperates.",
      "Black develops the bishop to a natural square and keeps the structure healthy.",
      "White tries to complete development at last.",
      "Black castles and reaches full safety first.",
      "White keeps shuffling instead of challenging Black directly.",
      "Black breaks with ...e5 once everything is ready and takes over the game."
    ]
  },
  {
    category: "Center break",
    id: "vant-kruijs-03-early-e5-punish-center",
    name: "Punishing the broad center",
    description: "If White tries to overbuild the center, Black should challenge it directly and recapture toward the middle.",
    moves: ["e3", "d5", "c3", "Nf6", "d4", "c5", "Qb3", "Nc6", "Bd3", "e5", "dxe5", "Nxe5", "Be2", "Bd6", "Nf3", "O-O"],
    explanations: [
      "White starts with a noncommittal move and hopes to steer the game into comfort.",
      "Black takes the center at once.",
      "White supports d4, but the setup is still slower than normal queen pawn openings.",
      "Black develops and prepares to challenge the center with pieces and pawns.",
      "White finally builds the center.",
      "Black hits immediately with ...c5, refusing to let White sit there uncontested.",
      "White uses Qb3 again, aiming at b7 and trying to distract Black from the middle.",
      "Black develops and keeps ignoring cosmetic pressure.",
      "White points the bishop toward the kingside and supports e4 ideas.",
      "Black breaks with ...e5 and asks White to prove the center was real.",
      "White captures because leaving the tension alone would concede space.",
      "Black recaptures with a piece and improves central control at the same time.",
      "White retreats and admits the center did not hold.",
      "Black develops smoothly and points more force toward the kingside and center.",
      "White develops, but Black already has the easier game.",
      "Black castles and reaches a very comfortable structure with no weaknesses."
    ]
  },
  {
    category: "Against Qb3 pressure",
    id: "vant-kruijs-04-qc7-calms-queenside",
    name: "Meeting Qb3 with ...Qc7",
    description: "Black answers the early queen pressure in a boring way, finishes development, and keeps the center under control.",
    moves: ["e3", "d5", "c3", "Nf6", "d4", "c5", "Qb3", "e6", "Nf3", "Nc6", "Be2", "Bd6", "O-O", "O-O", "Rd1", "Qc7"],
    explanations: [
      "White starts with the same restrained opening move.",
      "Black claims central space immediately.",
      "White builds toward d4, but there is still no direct challenge.",
      "Black develops and keeps the position simple.",
      "White puts a pawn in the center.",
      "Black strikes at it right away. That is the critical practical idea.",
      "White points at b7 and hopes Black will waste time defending ghosts.",
      "Black supports the center first and keeps the structure intact.",
      "White develops normally.",
      "Black develops and keeps control of the dark squares.",
      "White completes another quiet move.",
      "Black develops actively and stays ahead in central influence.",
      "White castles and hopes the queen on b3 still matters.",
      "Black castles too and removes most tactical nonsense.",
      "White adds support on the d file.",
      "Black calmly plays ...Qc7, covering queenside pressure without weakening anything important."
    ]
  },
  {
    category: "Punishing Nh3",
    id: "vant-kruijs-05-nh3-space-gain",
    name: "Nh3 setup punished with space",
    description: "When White places the knight awkwardly, Black can take even more space and attack the weak coordination.",
    moves: ["e3", "d5", "c3", "Nf6", "d4", "c5", "Qb3", "Nc6", "Nh3", "e5", "dxe5", "Nxe5", "Nf4", "c4", "Qc2", "g5"],
    explanations: [
      "White begins with the same slow first move.",
      "Black takes the center immediately.",
      "White prepares d4, but still has not challenged Black's development.",
      "Black develops and keeps the central breaks ready.",
      "White claims central space.",
      "Black hits the center before White can settle.",
      "White uses Qb3 again, hoping for pressure on b7.",
      "Black develops and ignores the distraction.",
      "White puts the knight on h3, which is simply clumsy in this structure.",
      "Black takes more central space because awkward development should be punished.",
      "White captures to relieve the pressure.",
      "Black recaptures with a knight and keeps the center and piece activity.",
      "White improves the knight, but it still lacks real influence.",
      "Black gains queenside space and shuts down White's easy breaks.",
      "White steps back to hold the position together.",
      "Black expands again with ...g5 and starts hunting the misplaced knight."
    ]
  }
]);
