import { StroliumMark } from "./StroliumMark";

// The web loader.
//
// It used to be three bare bricks pulsing in place, which said nothing about
// the product and did not match the Mini App's splash. Both now read the same
// way and in the same order: mark, wordmark, then the wall going up. Keeping
// the two surfaces identical matters more than either being clever -- a user
// moving between the bot and the site should not feel they changed product.
//
// The bricks carry their delays inline so the stagger survives any stylesheet.

const DELAYS = [0, 0.1, 0.2, 0.3, 0.4, 0.5];

export default function BrickLoader({ label }) {
  return (
    <div className="brickload">
      <div className="brickload__mark">
        <StroliumMark size={30} />
      </div>
      <div className="brickload__word">STROLIUM</div>
      <div className="brickload__row">
        {DELAYS.map((d) => (
          <i key={d} style={{ animationDelay: `${d}s` }} />
        ))}
      </div>
      {label && <span className="brickload__label">{label}</span>}
    </div>
  );
}
