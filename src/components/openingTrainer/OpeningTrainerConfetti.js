import React from "react";
import { randInt } from "./otUtils";

export default function OpeningTrainerConfetti(props) {
  if (!props || !props.active) return null;

  const pieces = [];
  for (let i = 0; i < 60; i += 1) {
    const left = randInt(10, 90);
    const delay = Math.random() * 0.15;
    const dur = 0.85 + Math.random() * 0.55;
    const rot = randInt(0, 360);
    const size = randInt(6, 11);

    pieces.push(
      <span
        key={i}
        className="ot-confetti"
        style={{
          left: left + "vw",
          animationDelay: delay + "s",
          animationDuration: dur + "s",
          transform: "rotate(" + rot + "deg)",
          width: size + "px",
          height: Math.max(4, Math.floor(size * 0.55)) + "px"
        }}
      />
    );
  }

  return <div className="ot-confetti-layer">{pieces}</div>;
}
