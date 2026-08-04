import { StroliumMark } from "./StroliumMark";

// The loader.
//
// It used to be blue rectangles pulsing, which read as an unfinished skeleton
// rather than an intentional state. The mark is an HOURGLASS -- the oldest
// loading metaphor there is -- so the loader is simply the logo doing what an
// hourglass does: it runs, then it gets flipped, then it runs again.
//
// The animation IS the brand asset. Nothing generic bolted on beside it.

export default function BrickLoader({ label }) {
  return (
    <div className="brickload">
      <div className="brickload__glass">
        <StroliumMark size={54} />
      </div>
      <div className="brickload__word">STROLIUM</div>
      <div className="brickload__rail">
        <span />
      </div>
      {label && <span className="brickload__label">{label}</span>}
    </div>
  );
}
