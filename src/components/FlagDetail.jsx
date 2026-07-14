import { X, FileText, Camera, ReceiptText, FileBarChart } from "lucide-react";
import { fmtSigned } from "../lib/format";
import MoneyTrail from "./MoneyTrail.jsx";

const EV_ICON = { doc: FileText, photo: Camera, invoice: ReceiptText, report: FileBarChart };
const SEV_LABEL = { high: "Yuqori", med: "O'rta", low: "Past" };

export default function FlagDetail({ flag, onClose }) {
  if (!flag) return null;
  return (
    <div className="drawer-bg" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer__head">
          <div>
            <div className="drawer__title">{flag.title}</div>
            <div className="drawer__site">{flag.site}</div>
          </div>
          <button className="drawer__close" onClick={onClose} aria-label="Yopish">
            <X size={17} />
          </button>
        </div>

        <div className="drawer__sec">
          <h4>Yo'qotish</h4>
          {flag.amount !== 0 ? (
            <>
              <div className="drawer__loss">{fmtSigned(flag.amount)}</div>
              <div className="drawer__loss-note">{flag.lossNote}</div>
            </>
          ) : (
            <>
              <div className="drawer__loss" style={{ color: "var(--warn)" }}>
                {SEV_LABEL[flag.severity]} xavf
              </div>
              <div className="drawer__loss-note">{flag.lossNote}</div>
            </>
          )}
        </div>

        {flag.trail && (
          <div className="drawer__sec">
            <h4>Pul izi</h4>
            <MoneyTrail trail={flag.trail} />
          </div>
        )}

        <div className="drawer__sec">
          <h4>AI tushuntirishi</h4>
          <p className="explain">{flag.explain}</p>
        </div>

        <div className="drawer__sec">
          <h4>Dalillar</h4>
          <div className="evidence">
            {flag.evidence.map((e, i) => {
              const Icon = EV_ICON[e.kind] || FileText;
              return (
                <div className="evidence__item" key={i}>
                  <Icon size={16} className="ico" />
                  {e.text}
                </div>
              );
            })}
          </div>
        </div>

        <div className="drawer__actions">
          <button className="btn-ghost" onClick={onClose}>
            Yopish
          </button>
          <button className="btn-solid">Nazoratchiga yuborish</button>
        </div>
      </div>
    </div>
  );
}
