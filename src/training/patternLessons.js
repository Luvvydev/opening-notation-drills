export const PATTERN_INTRO = "A fork is easier to see in a game when you’ve spotted the same setup on different boards. Start with easy puzzles. Find the target, check the reply, then play. As your first tries get more accurate, the difficulty goes up.";

export const PATTERN_LESSONS = [
  {
    title: "Find the target",
    text: "Scan the whole board. Look for an undefended piece, a king short on escape squares, or two pieces one move could attack. Use those targets to find candidate checks or captures. Play the move only after you’ve checked the strongest reply."
  },
  {
    title: "Set up a focused session",
    text: "Choose one difficulty and work for up to 20 minutes. Set distractions aside. If you’re guessing, slow down and trace the line. Tie practice to a time you can repeat. A short session still counts, and if you miss a day, pick up where you left off."
  },
  {
    title: "Look from the other side",
    text: "Use Flip board for the last few puzzles. You’re still finding the move for the side to move. Think of it as the tactic your opponent could have against you, then ask what made that threat possible."
  },
  {
    title: "Keep track of loose pieces",
    text: "After each move, check which pieces lost a defender or became newly exposed along a rank, file, or diagonal. Two undefended pieces can become a double attack. Before you commit to a move, check what your piece was guarding."
  },
  {
    title: "Take away the threat",
    text: "If an enemy knight wants a fork square, see if a pawn or piece can control it before the knight gets there. You can move a target, add a defender, chase the attacker, or trade it off. Check whether a stronger forcing move of your own changes what matters first."
  },
  {
    title: "Review one game",
    text: "Play a game at a pace that lets you think. In Game Review, find the biggest swing and work out what surprised you. Put it in plain language, such as a bishop on a long diagonal or a defender you moved. Replay the saved position in Practice my mistakes.",
    link: "/my-games", action: "Open Game Review"
  },
  {
    title: "Pick one recurring tactic",
    text: "Look at the mistakes you’ve been seeing in your games. If forks keep catching you, choose Forks in today’s setup and study where the targets were before the fork landed. Return to mixed tactics later to see whether you spot it without the label.",
    link: "/training?mode=mistakes", action: "Practice my mistakes"
  },
  {
    title: "Practice where you still have to think",
    text: "Keep the difficulty steady until you’re finding clean solutions on different days. When a new level feels too hard, step back and rebuild accuracy. For opening study, pick one line you actually play and notice what it leaves defended or exposed.",
    link: "/openings/library", action: "Browse openings"
  }
];
