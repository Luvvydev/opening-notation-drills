import React from 'react';

const paths = {
  home: 'M3 10l9-7 9 7v11h-6v-7H9v7H3z',
  review: 'M6 3h12v18H6z M9 7h6 M9 11h6 M9 15h4',
  puzzles: 'M9 3h6v5h3a3 3 0 1 1 0 6h-3v7H9v-5H6a3 3 0 1 1 0-6h3z',
  openings: 'M12 5C8 2 4 3 2 4v15c4-2 7-1 10 1 3-2 6-3 10-1V4c-3-1-6-2-10 1z M12 5v15',
  notation: 'M4 4h16v16H4z M4 9h16 M4 14h16 M9 4v16 M14 4v16',
  computer: 'M3 4h18v13H3z M8 21h8 M12 17v4',
  trophy: 'M8 3h8v7a4 4 0 0 1-8 0z M8 5H4v3a4 4 0 0 0 4 4 M16 5h4v3a4 4 0 0 1-4 4 M12 14v7 M8 21h8',
  profile: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z M4 21v-2a8 8 0 0 1 16 0v2z',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  close: 'M6 6l12 12 M18 6L6 18',
  collapse: 'M14 5l-7 7 7 7 M20 5l-7 7 7 7',
  arrow: 'M4 12h16 M14 6l6 6-6 6',
  plus: 'M12 4v16 M4 12h16',
  info: 'M12 11v6 M12 7h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  streak: 'M13 2c2 6-4 7-1 11 2-1 3-3 3-5 4 4 5 7 3 11-3 5-11 4-13-1-2-5 3-8 3-12 0 3 1 4 2 5 2-3 3-5 3-9z',
};

export default function WorkspaceIcon({ name, ...props }) {
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name] || paths.review} /></svg>;
}
