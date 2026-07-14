import { Truck, UserX, Stamp, ReceiptText, Copy, ChevronRight, Flag } from "lucide-react";
import { fmtSigned } from "../lib/format";

const ICONS = {
  truck: Truck,
  userx: UserX,
  stamp: Stamp,
  receipt: ReceiptText,
  copy: Copy,
};

const SEV_LABEL = { high: "Yuqori", med: "O'rta", low: "Past" };

export default function FlagFeed({ flags, leakage, onOpen }) {
  return (
    <div className="card">
      <div className="card__head">
        <div className="card__title">
          <Flag size={16} /> Aniqlangan belgilar <span className="count">{flags.length} ta</span>
        </div>
        {leakage > 0 && (
          <span className="pill bad">{(leakage / 1e6).toFixed(1)} mln yo'qotish</span>
        )}
      </div>
      {flags.length === 0 && (
        <div className="section-empty" style={{ border: "none", margin: 0 }}>
          Hozircha belgi aniqlanmadi.
        </div>
      )}
      {flags.map((f) => {
        const Icon = ICONS[f.icon] || Flag;
        return (
          <button className="flag" key={f.id} onClick={() => onOpen(f)}>
            <div className={"flag__icon " + f.severity}>
              <Icon size={19} />
            </div>
            <div className="flag__body">
              <div className="flag__title">{f.title}</div>
              <div className="flag__desc">{f.desc}</div>
            </div>
            <div className="flag__right">
              {f.amount !== 0 && (
                <div className={"flag__amt " + (f.severity === "high" ? "v-danger" : "v-warn")}>
                  {fmtSigned(f.amount)}
                </div>
              )}
              <span className={"sev " + f.severity}>{SEV_LABEL[f.severity]}</span>
            </div>
            <ChevronRight size={18} className="flag__chev" />
          </button>
        );
      })}
    </div>
  );
}
