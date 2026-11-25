import './PieceMotion.css';

const MOVE_MOTION = {
  duration: 185,
  easing: 'cubic-bezier(0.33, 0.04, 0.57, 1)',
  fill: 'forwards',
};

export function startPieceMotion(board, move, { beforeCommit = false, reverse = false } = {}) {
  if (!board || !move?.from || !move?.to ||
      (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
    return null;
  }

  const pieces = [];
  const animate = (from, to) => {
    const source = board.querySelector(`[data-squareid="${from}"]`);
    const target = board.querySelector(`[data-squareid="${to}"]`);
    const square = beforeCommit ? from : to;
    const piece = (beforeCommit ? source : target)?.querySelector(`[data-testid$="-${square}"]`);
    if (!source || !target || typeof piece?.animate !== 'function') return;

    const start = source.getBoundingClientRect();
    const end = target.getBoundingClientRect();
    if (!start.width || !start.height) return;
    const dx = Math.round((end.left - start.left) / start.width) * 100;
    const dy = Math.round((end.top - start.top) / start.height) * 100;
    if (!dx && !dy) return;

    const home = 'translate3d(0, 0, 0)';
    const offset = `translate3d(${beforeCommit ? dx : -dx}%, ${beforeCommit ? dy : -dy}%, 0)`;
    piece.classList.add('piece-motion-moving');
    const animation = piece.animate([
      { transform: beforeCommit ? home : offset },
      { transform: beforeCommit ? offset : home },
    ], MOVE_MOTION);
    pieces.push({ piece, animation });
  };

  const animateMove = (from, to) => reverse ? animate(to, from) : animate(from, to);
  animateMove(move.from, move.to);
  if (/[kq]/.test(move.flags || '')) {
    const rank = move.from[1];
    const kingSide = move.flags.includes('k');
    animateMove(`${kingSide ? 'h' : 'a'}${rank}`, `${kingSide ? 'f' : 'd'}${rank}`);
  }
  if (!pieces.length) return null;

  // An interrupted animation must also release anyone waiting to commit a move.
  const finished = Promise.all(pieces.map(({ animation }) => animation.finished.catch(() => {})));
  let cancelled = false;
  const cancel = () => {
    if (cancelled) return;
    cancelled = true;
    pieces.forEach(({ piece, animation }) => {
      animation.cancel();
      piece.classList.remove('piece-motion-moving');
    });
  };
  return { finished, cancel };
}
