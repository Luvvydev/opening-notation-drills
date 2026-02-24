export const BOARD_THEMES = {
  chesscom: {
    lightSquareStyle: { backgroundColor: "#EEEED2" },
    darkSquareStyle: { backgroundColor: "#769656" }
  },
  lichess: {
    lightSquareStyle: { backgroundColor: "#f0d9b5" },
    darkSquareStyle: { backgroundColor: "#b58863" }
  },
  darkblue: {
    lightSquareStyle: { backgroundColor: "#aad3df" },
    darkSquareStyle: { backgroundColor: "#3a6ea5" }
  },
  purpleblack: {
    lightSquareStyle: { backgroundColor: "#7E83F7" },
    darkSquareStyle: { backgroundColor: "#000000" }
  }
};

export const DEFAULT_THEME = "chesscom";

// chessboardjsx uses chessboard.js piece themes. These URLs must contain {piece} placeholder.
export const PIECE_THEMES = {
  default: null,
  alpha: "https://cdnjs.cloudflare.com/ajax/libs/chessboard-js/1.0.0/img/chesspieces/alpha/{piece}.png"
};