import { useMemo, useState } from "react";
import { addExpense } from "../api/client";
import { fmtSom } from "../lib/format";

// Add-expense modal.
//
// The amount is the hero -- it is the subject of the whole interaction.
//
// The panel underneath is the point of the product: it shows what THIS expense does
// to THAT project's budget, live, before the boss saves. Strolium exists so nobody
// blows a budget without noticing, and the moment before you commit money is the
// only moment where knowing still changes anything.
//
// It WARNS, it never blocks. A boss sometimes genuinely has to overspend; a tool
// that stops him becomes his enemy and he stops using it.

// Group digits as they are typed: 12000000 -> 12 000 000. A boss entering a big
// number needs to SEE its size; an undifferentiated wall of digits is exactly how
// someone enters ten times what they meant.
const groupDigits = (v) => {
  const d = String(v).replace(/[^0-9]/g, "");
  if (!d) return "";
  return d.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

export default function AddExpense({ projects, groups, onClose, onSaved }) {
  const [amount, setAmount] = useState("");
  const [item, setItem] = useState("");
  const [vendor, setVendor] = useState("");
  const [projectId, setProjectId] = useState("");
  const [currency, setCurrency] = useState("UZS");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const amt = parseFloat(String(amount).replace(/[^0-9.]/g, "")) || 0;

  // What this expense does to the chosen project's budget.
  const impact = useMemo(() => {
    if (!projectId || currency !== "UZS") return null;
    const g = (groups || []).find((x) => x.project_id === projectId);
    if (!g) return null;
    const budget = Number(g.budget) || 0;
    if (!budget) return { name: g.project, noBudget: true };

    const spent = (g.totals && g.totals.UZS) || 0;
    const after = spent + amt;
    const pctNow = Math.round((spent / budget) * 100);
    const pctAfter = Math.round((after / budget) * 100);
    const over = after - budget;
    const level = pctAfter >= 100 ? "bad" : pctAfter >= 60 ? "warn" : "ok";

    return {
      name: g.project,
      budget,
      spent,
      after,
      pctNow,
      pctAfter,
      over,
      level,
      // widths for the two-tone bar: what was already spent, and what this adds
      wNow: Math.min(pctNow, 100),
      wAdd: Math.max(0, Math.min(pctAfter, 100) - Math.min(pctNow, 100)),
    };
  }, [projectId, groups, amt, currency]);

  const save = async () => {
    setErr("");
    if (!amt || amt <= 0) return setErr("Summani kiriting.");
    if (!item.trim()) return setErr("Nima olinganini yozing.");
    setBusy(true);
    try {
      await addExpense({
        amount: amt,
        currency,
        item: item.trim(),
        vendor: vendor.trim(),
        project_id: projectId || "",
      });
      onSaved();
    } catch (e) {
      setErr(e.message || "Saqlab bo'lmadi.");
      setBusy(false);
    }
  };

  return (
    <div className="modal__wrap" onClick={onClose}>
      <div className="axp" onClick={(e) => e.stopPropagation()}>
        {/* amount hero */}
        <div className="axp__hero">
          <span className="axp__lab">Summa</span>
          <div className="axp__amtrow">
            <input
              autoFocus
              inputMode="numeric"
              className="axp__amt"
              value={amount}
              onChange={(e) => setAmount(groupDigits(e.target.value))}
              placeholder="0"
            />
            <div className="seg">
              {[
                ["UZS", "so'm"],
                ["USD", "$"],
                ["RUB", "rub"],
              ].map(([c, l]) => (
                <button
                  key={c}
                  type="button"
                  className={currency === c ? "on" : ""}
                  onClick={() => setCurrency(c)}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="axp__body">
          <label className="fld">
            <span>Nima olindi</span>
            <input
              value={item}
              onChange={(e) => setItem(e.target.value)}
              placeholder="masalan: tsement 20 qop"
            />
          </label>

          <div className="axp__grid">
            <label className="fld">
              <span>Sotuvchi</span>
              <input
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="ixtiyoriy"
              />
            </label>
            <label className="fld">
              <span>Loyiha</span>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                <option value="">Loyihasiz</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* live budget impact */}
          {impact && !impact.noBudget && (
            <div className={"axp__imp axp__imp--" + impact.level}>
              <div className="axp__imp-top">
                <span className="axp__imp-name">{impact.name} byudjeti</span>
                <span className="axp__imp-pct">
                  {impact.pctNow}%
                  {amt > 0 && <> &rarr; {impact.pctAfter}%</>}
                </span>
              </div>
              <div className="axp__imp-bar">
                <i className="now" style={{ width: impact.wNow + "%" }} />
                <i className="add" style={{ width: impact.wAdd + "%" }} />
              </div>
              <div className="axp__imp-note">
                {impact.over > 0 ? (
                  <>
                    Bu xarajat byudjetdan{" "}
                    <b className="bad">{fmtSom(impact.over, false)} so'm</b>{" "}
                    oshirib yuboradi.
                  </>
                ) : (
                  <>
                    Qoladi:{" "}
                    <b>{fmtSom(impact.budget - impact.after, false)} so'm</b>
                  </>
                )}
              </div>
            </div>
          )}

          {impact && impact.noBudget && (
            <div className="axp__imp axp__imp--none">
              <div className="axp__imp-note">
                <b>{impact.name}</b> uchun byudjet belgilanmagan — Pul nazorati bu
                loyihani kuzata olmaydi.
              </div>
            </div>
          )}

          {err && <div className="modal__err">{err}</div>}
        </div>

        <div className="axp__foot">
          <button className="btn-ghost" onClick={onClose} disabled={busy}>
            Bekor
          </button>
          <button className="btn-primary axp__save" onClick={save} disabled={busy}>
            {busy ? "Saqlanmoqda…" : "Saqlash"}
          </button>
        </div>
      </div>
    </div>
  );
}
