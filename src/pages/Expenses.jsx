import { useEffect, useMemo, useState, useCallback } from "react";
import { Plus, Search, Flag, Receipt } from "lucide-react";
import { getSpend, listProjects } from "../api/client";
import AddExpense from "../components/AddExpense.jsx";
import { fmtSom } from "../lib/format";
import BrickLoader from "../components/BrickLoader.jsx";

// Desktop expenses screen.
//
// Deliberately NOT the Mini App's stacked cards. A boss at a laptop wants density:
// every project's burn on one rail, then a scannable table he can filter. The
// Pul nazorati flags are woven INTO the table rather than hidden on another page --
// the whole point of the product is that suspicious spending is impossible to miss.

const health = (pct) =>
  pct >= 100 ? "bad" : pct >= 60 ? "warn" : "ok";

function BudgetRail({ groups }) {
  const withBudget = groups.filter((g) => g.project_id);
  if (!withBudget.length) return null;

  return (
    <div className="xrail">
      {withBudget.map((g) => {
        const spent = (g.totals && g.totals.UZS) || 0;
        const budget = Number(g.budget) || 0;
        const pct = budget ? Math.round((spent / budget) * 100) : null;
        const h = pct === null ? "none" : health(pct);
        const left = budget - spent;
        return (
          <div key={g.key} className={"xrail__card xrail__card--" + h}>
            <div className="xrail__top">
              <span className="xrail__name">{g.project}</span>
              {pct !== null && <span className={"xrail__pct " + h}>{pct}%</span>}
            </div>
            <div className="xrail__spent">
              {fmtSom(spent, false)} <small>so'm</small>
            </div>
            {budget ? (
              <>
                <div className="xrail__sub">
                  {left >= 0 ? (
                    <>{fmtSom(budget, false)} so'm byudjetdan</>
                  ) : (
                    <span className="bad">
                      {fmtSom(Math.abs(left), false)} so'm oshib ketdi
                    </span>
                  )}
                </div>
                <div className="xrail__bar">
                  <i
                    className={h}
                    style={{ width: Math.min(pct, 100) + "%" }}
                  />
                </div>
              </>
            ) : (
              <div className="xrail__sub faint">Byudjet belgilanmagan</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Expenses({ flags = [], onChange }) {
  const [data, setData] = useState(null);
  const [projects, setProjects] = useState([]);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [proj, setProj] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    setErr("");
    Promise.all([getSpend(), listProjects()])
      .then(([s, p]) => {
        setData(s);
        setProjects(p);
      })
      .catch((e) => setErr(e.message || "Yuklab bo'lmadi."));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Which expense items has Pul nazorati flagged? Match on vendor, which is what
  // the detectors key on -- so the boss sees the suspicious rows inline.
  const flaggedVendors = useMemo(() => {
    const s = new Set();
    flags.forEach((f) => f.vendor && s.add(String(f.vendor).toLowerCase()));
    return s;
  }, [flags]);

  const rows = useMemo(() => {
    if (!data) return [];
    let r = data.recent || [];
    if (proj) r = r.filter((x) => x.project_key === proj);
    if (q.trim()) {
      const t = q.trim().toLowerCase();
      r = r.filter(
        (x) =>
          (x.item || "").toLowerCase().includes(t) ||
          (x.vendor || "").toLowerCase().includes(t) ||
          (x.by || "").toLowerCase().includes(t)
      );
    }
    return r;
  }, [data, q, proj]);

  const shownTotal = useMemo(
    () =>
      rows
        .filter((r) => (r.currency || "UZS") === "UZS")
        .reduce((a, b) => a + (b.amount || 0), 0),
    [rows]
  );

  if (err)
    return (
      <div className="section-empty">
        {err}{" "}
        <button className="btn-ghost" onClick={load}>
          Qayta urinish
        </button>
      </div>
    );
  if (!data) return <BrickLoader label="Yuklanmoqda" />;

  return (
    <>
      <div className="xhead">
        <div>
          <h2 className="xhead__title">Xarajatlar</h2>
          <div className="xhead__sub">
            {data.count} ta xarajat · barcha loyihalar bo'yicha
          </div>
        </div>
        <button className="btn-primary" onClick={() => setAdding(true)}>
          <Plus size={15} /> Xarajat qo'shish
        </button>
      </div>

      <BudgetRail groups={data.projects || []} />

      <div className="xfilters">
        <div className="xsearch">
          <Search size={14} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Qidirish…"
          />
        </div>
        <select value={proj} onChange={(e) => setProj(e.target.value)}>
          <option value="">Barcha loyihalar</option>
          {(data.projects || []).map((g) => (
            <option key={g.key} value={g.key}>
              {g.project}
            </option>
          ))}
        </select>
        <div className="xfilters__tot">
          {rows.length} ta · <b>{fmtSom(shownTotal, false)} so'm</b>
        </div>
      </div>

      <div className="card xtable__wrap">
        <table className="xtable">
          <thead>
            <tr>
              <th>Nima olindi</th>
              <th>Loyiha</th>
              <th>Sotuvchi</th>
              <th>Kim</th>
              <th>Sana</th>
              <th className="num">Summa</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const flagged =
                r.vendor && flaggedVendors.has(String(r.vendor).toLowerCase());
              return (
                <tr key={r.id}>
                  <td className="xtable__item">
                    {r.item}
                    {r.has_receipt && (
                      <Receipt size={12} className="xtable__ico" />
                    )}
                    {flagged && (
                      <span className="xtable__flag" title="Pul nazorati belgilagan">
                        <Flag size={11} />
                      </span>
                    )}
                  </td>
                  <td className="dim">{r.project || "—"}</td>
                  <td className="dim">{r.vendor || "—"}</td>
                  <td className="dim">{r.by || "—"}</td>
                  <td className="faint">{r.when || "—"}</td>
                  <td className="num mono">
                    {fmtSom(r.amount, false)}
                    {r.currency !== "UZS" && (
                      <small className="dim"> {r.currency}</small>
                    )}
                  </td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td colSpan={6} className="xtable__empty">
                  Xarajat topilmadi.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="xnote">
        <Flag size={11} /> Pul nazorati tomonidan belgilangan xarajatlar
      </div>

      {adding && (
        <AddExpense
          projects={projects}
          groups={data.projects || []}
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            load();
            if (onChange) onChange();
          }}
        />
      )}
    </>
  );
}
