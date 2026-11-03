// Small, fixed examples for the public landing page. No engine or account needed.
export const LANDING_TACTICS = [
  {
    title: 'Can you spot the knight fork?',
    instruction: 'White to move. Find the check that also attacks a rook.',
    moves: ['e4', 'e5', 'Nc3', 'Nc6', 'Nd5', 'Nf6'],
    answer: { from: 'd5', to: 'c7' },
    explanation: 'Nxc7+ checks the king and attacks the rook on a8.'
  },
  {
    title: 'Can you find checkmate?',
    instruction: 'White to move. The queen and bishop can finish the game.',
    moves: ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6'],
    answer: { from: 'h5', to: 'f7' },
    explanation: 'Qxf7# is checkmate. The bishop on c4 protects the queen.'
  },
  {
    title: 'Can you win the queen?',
    instruction: 'White to move. Look along the bishop’s diagonal.',
    fen: '6k1/5ppp/8/3q4/8/8/5PBP/5RK1 w - - 0 1',
    answer: { from: 'g2', to: 'd5' },
    explanation: 'Bxd5 wins the unprotected queen.'
  },
  {
    title: 'Can you find the rook mate?',
    instruction: 'White to move. The black king has no escape squares.',
    fen: '6k1/r4ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',
    answer: { from: 'e1', to: 'e8' },
    explanation: 'Re8# is checkmate. Black’s pawns block the king’s escape.'
  }
];
