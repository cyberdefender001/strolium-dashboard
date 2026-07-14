import { AlertTriangle } from "lucide-react";

export default function MoneyTrail({ trail }) {
  const { ordered, delivered, used, paid, unit } = trail;
  const max = Math.max(ordered, delivered, used, paid);
  const stops = [
    { lbl: "Buyurtma", num: ordered },
    { lbl: "Yetkazildi", num: delivered },
    { lbl: "Ishlatildi", num: used },
    { lbl: "To'langan", num: paid, paid: true },
  ];
  const gap = paid - used;

  return (
    <div>
      <div className="trail">
        {stops.map((s) => (
          <div className="trail__stop" key={s.lbl}>
            <div
              className={"trail__bar" + (s.paid ? " lost" : "")}
              style={{ width: Math.max(12, (s.num / max) * 100) + "%", margin: "0 auto" }}
            />
            <div className="trail__num">{s.num}</div>
            <div className="trail__lbl">{s.lbl}</div>
          </div>
        ))}
      </div>
      {gap > 0 && (
        <div className="trail__gap">
          <AlertTriangle size={15} />
          <span>
            <b>{gap} {unit}</b> to'langan, lekin ishlatilmagan
          </span>
        </div>
      )}
    </div>
  );
}
