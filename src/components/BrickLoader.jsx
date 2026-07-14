export default function BrickLoader({ label }) {
  return (
    <div className="brickload">
      <div className="brickload__row">
        <i style={{ animationDelay: "0s" }} />
        <i style={{ animationDelay: "0.16s" }} />
        <i style={{ animationDelay: "0.32s" }} />
      </div>
      {label && <span className="brickload__label">{label}</span>}
    </div>
  );
}
