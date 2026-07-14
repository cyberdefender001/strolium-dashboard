import { Wallet, FolderKanban, Users, ClipboardList } from "lucide-react";
import { fmtSom } from "../lib/format";

export function KpiStrip({ kpis }) {
  const cards = [
    { label: "Umumiy xarajat", icon: Wallet, value: fmtSom(kpis.totalSpend, false), unit: "so'm", cls: "v-text" },
    { label: "Faol obyektlar", icon: FolderKanban, value: String(kpis.projects), cls: "v-text" },
    { label: "Ishchilar", icon: Users, value: String(kpis.workers), cls: "v-text" },
    { label: "Ochiq vazifalar", icon: ClipboardList, value: String(kpis.openTasks), cls: "v-text" },
  ];

  return (
    <div className="kpis">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div className="kpi" key={c.label}>
            <div className="kpi__label">
              <Icon size={15} /> {c.label}
            </div>
            <div className={"kpi__value " + c.cls}>
              {c.value}
              {c.unit && <span className="kpi__unit">{c.unit}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function TrendCard({ trend }) {
  const w = 260;
  const h = 90;
  const max = Math.max(...trend);
  const min = Math.min(...trend);
  const span = max - min || 1;
  const pts = trend.map((v, i) => {
    const x = (i / (trend.length - 1)) * w;
    const y = h - ((v - min) / span) * (h - 14) - 7;
    return [x, y];
  });
  const line = pts.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const area = line + ` L ${w} ${h} L 0 ${h} Z`;
  const last = trend[trend.length - 1];

  return (
    <div className="card">
      <div className="trend">
        <div className="trend__label">Haftalik aniqlangan yo'qotish (namuna)</div>
        <div className="trend__val v-warn">{fmtSom(last)}</div>
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
          <path d={area} fill="rgba(232,162,61,0.12)" />
          <path d={line} fill="none" stroke="var(--warn)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {pts.map((p, i) => (
            <circle key={i} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 3.5 : 2} fill="var(--warn)" />
          ))}
        </svg>
        <div className="trend__note">So'nggi 6 hafta · audit miyasi yoqilgach jonli bo'ladi</div>
      </div>
    </div>
  );
}
