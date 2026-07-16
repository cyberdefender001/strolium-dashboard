import { useEffect, useMemo, useState, useCallback } from "react";
import { Plus, MapPin, Pencil } from "lucide-react";
import { getSpend, createProject, setProjectBudget } from "../api/client";
import { fmtSom } from "../lib/format";
import BrickLoader from "../components/BrickLoader.jsx";

// Loyihalar -- create projects and set budgets from a desk.
//
// The budget is the whole point: Pul nazorati compares every expense against it.
// A project without a budget is a blind spot, so this screen says so out loud
// rather than leaving the field quietly empty.

const grp = (v) => {
  const d = String(v).replace(/[^0-9]/g, "");
  return d ? d.replace(/\B(?=(\d{3})+(?!\d))/g, " ") : "";
};
const num = (v) => parseFloat(String(v).replace(/[^0-9.]/g, "")) || null;

function ProjectForm({ initial, onClose, onSaved }) {
  const editing = !!initial;
  const [name, setName] = useState(initial ? initial.project : "");
  const [address, setAddress] = useState("");
  const [budget, setBudget] = useState(
    initial && initial.budget ? grp(initial.budget) : ""
  );
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    setErr("");
    if (!editing && name.trim().length < 2) return setErr("Loyiha nomini yozing.");
    setBusy(true);
    try {
      if (editing) {
        await setProjectBudget(initial.project_id, {
          budget: num(budget),
          start_date: start || null,
          end_date: end || null,
        });
      } else {
        await createProject({
          name: name.trim(),
          address: address.trim() || null,
          budget: num(budget),
          start_date: start || null,
          end_date: end || null,
        });
      }
      onSaved();
    } catch (e) {
      setErr(e.message || "Saqlab bo'lmadi.");
      setBusy(false);
    }
  };

  return (
    <div className="modal__wrap" onClick={onClose}>
      <div className="axp" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <div className="axp__body" style={{ paddingTop: 22 }}>
          <h3 className="modal__title">{editing ? initial.project : "Yangi loyiha"}</h3>

          {!editing && (
            <>
              <label className="fld">
                <span>Nomi</span>
                <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="masalan: Olmazor city" />
              </label>
              <label className="fld">
                <span>Manzil (ixtiyoriy)</span>
                <input value={address} onChange={(e) => setAddress(e.target.value)}
                  placeholder="manzil" />
              </label>
            </>
          )}

          <label className="fld">
            <span>Byudjet (so'm)</span>
            <input
              inputMode="numeric"
              value={budget}
              onChange={(e) => setBudget(grp(e.target.value))}
              placeholder="masalan: 5 000 000 000"
            />
          </label>

          <div className="axp__grid">
            <label className="fld">
              <span>Boshlanish</span>
              <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </label>
            <label className="fld">
              <span>Tugash</span>
              <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </label>
          </div>

          {err && <div className="modal__err">{err}</div>}
        </div>
        <div className="axp__foot">
          <button className="btn-ghost" onClick={onClose} disabled={busy}>Bekor</button>
          <button className="btn-primary axp__save" onClick={save} disabled={busy}>
            {busy ? "Saqlanmoqda…" : "Saqlash"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Projects({ tick, onChange }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(() => {
    setErr("");
    getSpend().then(setData).catch((e) => setErr(e.message || "Yuklab bo'lmadi."));
  }, []);

  useEffect(() => { load(); }, [load, tick]);

  const groups = useMemo(() => (data && data.projects) || [], [data]);

  if (err)
    return (
      <div className="section-empty">
        {err} <button className="btn-ghost" onClick={load}>Qayta urinish</button>
      </div>
    );
  if (!data) return <BrickLoader label="Yuklanmoqda" />;

  return (
    <>
      <div className="xhead">
        <div>
          <h2 className="xhead__title">Loyihalar</h2>
          <div className="xhead__sub">{groups.length} ta loyiha</div>
        </div>
        <button className="btn-primary" onClick={() => setCreating(true)}>
          <Plus size={15} /> Yangi loyiha
        </button>
      </div>

      <div className="pj-grid">
        {groups.map((g) => {
          const budget = Number(g.budget) || 0;
          const spent = (g.totals && g.totals.UZS) || 0;
          const pct = budget ? Math.round((spent / budget) * 100) : null;
          const tone = pct === null ? "none" : pct >= 100 ? "bad" : pct >= 60 ? "warn" : "ok";
          return (
            <div key={g.project_id || g.project} className={"pj pj--" + tone}>
              <div className="pj__top">
                <div>
                  <div className="pj__name">{g.project}</div>
                  {g.address && (
                    <div className="pj__addr"><MapPin size={11} /> {g.address}</div>
                  )}
                </div>
                {g.project_id && (
                  <button className="pj__edit" title="Byudjetni tahrirlash"
                    onClick={() => setEditing(g)}>
                    <Pencil size={14} />
                  </button>
                )}
              </div>

              <div className="pj__spent">
                {fmtSom(spent, false)} <span>so'm</span>
              </div>

              {budget ? (
                <>
                  <div className="pj__bar">
                    <i style={{ width: Math.min(pct, 100) + "%" }} />
                  </div>
                  <div className="pj__meta">
                    <span>{fmtSom(budget, false)} so'm byudjetdan</span>
                    <b>{pct}%</b>
                  </div>
                </>
              ) : (
                <div className="pj__nobudget">
                  Byudjet belgilanmagan — Pul nazorati bu loyihani kuzata olmaydi.
                  {g.project_id && (
                    <button onClick={() => setEditing(g)}>Byudjet belgilash</button>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {!groups.length && (
          <div className="section-empty">Hozircha loyiha yo'q. Birinchisini yarating.</div>
        )}
      </div>

      {creating && (
        <ProjectForm onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); load(); if (onChange) onChange(); }} />
      )}
      {editing && (
        <ProjectForm initial={editing} onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); if (onChange) onChange(); }} />
      )}
    </>
  );
}
