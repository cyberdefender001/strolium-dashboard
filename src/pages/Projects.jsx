import { useEffect, useMemo, useState, useCallback } from "react";
import { Plus, MapPin, Pencil, Archive, RotateCcw, Trash2 } from "lucide-react";
import {
  getSpend, createProject, setProjectBudget, getMe, listProjects, planUsage,
  archiveProject, activateProject, projectDeleteInfo, deleteProject,
} from "../api/client";
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

// Uzbekistan writes dates dd/mm/yyyy. The native date input follows the BROWSER's
// locale (often mm/dd/yyyy) and forces a picker, so we use a text field: digits in,
// slashes appear, manual typing welcome. Converted to ISO for the API.
const dmy = (v) => {
  const d = String(v).replace(/[^0-9]/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return d.slice(0, 2) + "/" + d.slice(2);
  return d.slice(0, 2) + "/" + d.slice(2, 4) + "/" + d.slice(4);
};
const dmyToIso = (v) => {
  const m = String(v).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  if (+mm < 1 || +mm > 12 || +dd < 1 || +dd > 31) return null;
  return `${yyyy}-${mm}-${dd}`;
};

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
    if ((start && !dmyToIso(start)) || (end && !dmyToIso(end)))
      return setErr("Sanani kk/oo/yyyy ko'rinishida yozing.");
    setBusy(true);
    try {
      if (editing) {
        await setProjectBudget(initial.project_id, {
          budget: num(budget),
          start_date: dmyToIso(start),
          end_date: dmyToIso(end),
        });
      } else {
        await createProject({
          name: name.trim(),
          address: address.trim() || null,
          budget: num(budget),
          start_date: dmyToIso(start),
          end_date: dmyToIso(end),
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
              <input inputMode="numeric" placeholder="kk/oo/yyyy" value={start}
                onChange={(e) => setStart(dmy(e.target.value))} />
            </label>
            <label className="fld">
              <span>Tugash</span>
              <input inputMode="numeric" placeholder="kk/oo/yyyy" value={end}
                onChange={(e) => setEnd(dmy(e.target.value))} />
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
  const [archiving, setArchiving] = useState(null);
  const [deleting, setDeleting] = useState(null);   // {project, expenses, tasks}
  const [busy, setBusy] = useState(false);
  // Hard delete is the boss's alone: it destroys a site's whole expense history.
  // Same source Team.jsx uses for the role.
  const [isBoss, setIsBoss] = useState(false);
  // Archived rows come from a different endpoint: /api/spend groups SPENDING,
  // and a finished site with no active status has no row there at all.
  const [showArchive, setShowArchive] = useState(false);
  const [archived, setArchived] = useState(null);
  const [usage, setUsage] = useState(null);

  const load = useCallback(() => {
    setErr("");
    getSpend().then(setData).catch((e) => setErr(e.message || "Yuklab bo'lmadi."));
  }, []);

  useEffect(() => {
    getMe()
      .then((m) => setIsBoss((m && (m.access_level || m.role)) === "executive"))
      .catch(() => setIsBoss(false));   // no delete button if the role is unknown
  }, []);

  // Read the counts BEFORE the dialog opens, so the confirmation can say what
  // is about to be lost instead of asking blind.
  const askDelete = useCallback((g) => {
    setBusy(true);
    projectDeleteInfo(g.project_id)
      .then((d) => setDeleting({ g, expenses: d.expenses || 0, tasks: d.tasks || 0 }))
      .catch((e) => setErr(e.message || "Ma'lumot olinmadi."))
      .finally(() => setBusy(false));
  }, []);

  const doArchive = useCallback(() => {
    if (!archiving) return;
    setBusy(true);
    archiveProject(archiving.project_id)
      .then(() => { setArchiving(null); load(); onChange && onChange(); })
      .catch((e) => setErr(e.message || "Arxivlab bo'lmadi."))
      .finally(() => setBusy(false));
  }, [archiving, load, onChange]);

  const doDelete = useCallback(() => {
    if (!deleting) return;
    setBusy(true);
    deleteProject(deleting.g.project_id)
      .then(() => { setDeleting(null); load(); onChange && onChange(); })
      .catch((e) => setErr(e.message || "O'chirib bo'lmadi."))
      .finally(() => setBusy(false));
  }, [deleting, load, onChange]);

  useEffect(() => { load(); }, [load, tick]);

  // Drives the "2 / 2 loyiha" line, so the boss sees the limit before he hits it.
  const loadUsage = useCallback(() => {
    planUsage().then(setUsage).catch(() => setUsage(null));
  }, []);
  useEffect(() => { loadUsage(); }, [loadUsage, tick]);

  // Fetched only when the archive is opened: most visits never need it.
  const loadArchived = useCallback(() => {
    listProjects(true)
      .then((rows) => setArchived((rows || []).filter((r) => r.status === "archived")))
      .catch((e) => setErr(e.message || "Arxivni yuklab bo'lmadi."));
  }, []);
  useEffect(() => { if (showArchive) loadArchived(); }, [showArchive, loadArchived]);

  // Reactivating counts against the same cap, so this can legitimately fail with
  // an upgrade message -- which is why the error is surfaced rather than ignored.
  const doActivate = useCallback((pid) => {
    setBusy(true);
    activateProject(pid)
      .then(() => { loadArchived(); load(); loadUsage(); onChange && onChange(); })
      .catch((e) => setErr(e.message || "Qaytarib bo'lmadi."))
      .finally(() => setBusy(false));
  }, [loadArchived, load, loadUsage, onChange]);

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
          {/* The cap, shown before it bites. Until now the first a boss heard of
              a limit was the request that failed. */}
          <div className="xhead__sub">
            {usage && usage.projects && usage.projects.cap != null
              ? `${usage.projects.used} / ${usage.projects.cap} loyiha`
              : `${groups.length} ta loyiha`}
            {usage && usage.projects && usage.projects.cap != null
              && usage.projects.used >= usage.projects.cap && usage.next_tier && (
              <span className="pj-full">
                {" "}· To'ldi — {usage.next_tier.name} tarifida{" "}
                {usage.next_tier.max_projects || "cheklanmagan"} loyiha
              </span>
            )}
          </div>
        </div>
        <div className="pj-headacts">
          <button className="btn-ghost" onClick={() => setShowArchive((v) => !v)}>
            <Archive size={14} /> {showArchive ? "Faol loyihalar" : "Arxiv"}
          </button>
          <button className="btn-primary" onClick={() => setCreating(true)}>
            <Plus size={15} /> Yangi loyiha
          </button>
        </div>
      </div>

      {showArchive && (
        <div className="pj-arch">
          {archived === null ? (
            <div className="section-empty">Yuklanmoqda…</div>
          ) : archived.length === 0 ? (
            <div className="section-empty">
              Arxivda loyiha yo'q. Tugagan loyihani arxivlasangiz, ma'lumotlari
              saqlanadi va tarifdagi joy bo'shaydi.
            </div>
          ) : (
            archived.map((a) => (
              <div className="pj-arch__row" key={a.id}>
                <div className="pj-arch__name">
                  {a.name}
                  {a.address && <span className="pj-arch__addr"> · {a.address}</span>}
                </div>
                <button className="btn-ghost" disabled={busy}
                        onClick={() => doActivate(a.id)}>
                  <RotateCcw size={13} /> Qaytarish
                </button>
              </div>
            ))
          )}
        </div>
      )}

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
                  <div className="pj__acts">
                    <button className="pj__edit" title="Byudjetni tahrirlash"
                      onClick={() => setEditing(g)}>
                      <Pencil size={14} />
                    </button>
                    {/* Archive is the normal end of a project: the data stays and
                        the plan slot is freed. Delete is the correction for one
                        created by mistake, and it is not reversible. */}
                    <button className="pj__edit" title="Arxivlash"
                      onClick={() => setArchiving(g)}>
                      <Archive size={14} />
                    </button>
                    {isBoss && (
                      <button className="pj__edit pj__edit--danger" title="O'chirish"
                        onClick={() => askDelete(g)}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
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

      {/* Archive: reversible, keeps everything, frees a plan slot. Said plainly,
          because "arxivlash" on its own reads like deleting to most people. */}
      {archiving && (
        <div className="pjc" role="dialog" aria-modal="true">
          <div className="pjc__box">
            <div className="pjc__icon"><Archive size={19} /></div>
            <h3 className="pjc__t">{archiving.project} arxivlansinmi?</h3>
            <p className="pjc__b">
              Xarajatlar va hisobotlar saqlanadi. Loyiha ro'yxatdan yashiriladi va
              tarifdagi joy bo'shaydi — keyin uni qaytarish mumkin.
            </p>
            <button className="btn-primary" disabled={busy} onClick={doArchive}>
              {busy ? "…" : "Arxivlash"}
            </button>
            <button className="pjc__x" onClick={() => setArchiving(null)}>Bekor qilish</button>
          </div>
        </div>
      )}

      {/* Delete: the counts come from the server before this opens, so the boss
          sees what he is destroying rather than confirming blind. */}
      {deleting && (
        <div className="pjc" role="dialog" aria-modal="true">
          <div className="pjc__box">
            <div className="pjc__icon pjc__icon--danger"><Trash2 size={19} /></div>
            <h3 className="pjc__t">{deleting.g.project} butunlay o'chirilsinmi?</h3>
            <p className="pjc__b">
              Bu amalni ortga qaytarib bo'lmaydi. Loyiha bilan birga{" "}
              <b>{deleting.expenses} ta xarajat</b> va <b>{deleting.tasks} ta vazifa</b>{" "}
              o'chadi.
            </p>
            <p className="pjc__b pjc__b--hint">
              Ma'lumotni saqlab qolmoqchi bo'lsangiz, o'chirish o'rniga arxivlang.
            </p>
            <button className="btn-primary pjc__danger" disabled={busy} onClick={doDelete}>
              {busy ? "…" : "Butunlay o'chirish"}
            </button>
            <button className="pjc__x" onClick={() => setDeleting(null)}>Bekor qilish</button>
          </div>
        </div>
      )}
    </>
  );
}
