import { useEffect, useMemo, useState, useCallback, Fragment } from "react";
import { Search, Check, X, Plus } from "lucide-react";
import { getTasks, approveTask, rejectTask } from "../api/client";
import { initials } from "../lib/format";
import BrickLoader from "../components/BrickLoader.jsx";
import TaskDetail from "../components/TaskDetail.jsx";
import NewTask from "../components/NewTask.jsx";

// Tasks -- same CAPABILITY as the Mini App, laid out for a desktop.
//
// The Mini App has three clickable stat cards (review / overdue / active), status
// pills driven by the org's OWN status list from the API (not a hardcoded three),
// and approve/reject inline on the row with the reject form expanding in place.
// All of that is here. The presentation is a table rather than stacked cards,
// because that is what a big screen is for.

const SPINE = {
  open: "#4C8DFF", submitted: "#F4A52A", rejected: "#F2555A",
  on_hold: "#8B95A1", approved: "#2FB67C", cancelled: "#566273",
};

const defaultDeadline = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(18, 0, 0, 0);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export default function Tasks({ onChange }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(null);

  const [rejectId, setRejectId] = useState(null);
  const [fb, setFb] = useState("");
  const [dl, setDl] = useState("");

  const load = useCallback(() => {
    setErr("");
    getTasks().then(setData).catch((e) => setErr(e.message || "Yuklab bo'lmadi."));
  }, []);

  useEffect(() => { load(); }, [load]);

  const after = () => { load(); if (onChange) onChange(); };

  const approve = async (id) => {
    setBusy(id);
    try { await approveTask(id); after(); } finally { setBusy(null); }
  };

  const openReject = (id) => { setRejectId(id); setFb(""); setDl(defaultDeadline()); };

  const sendReject = async () => {
    setBusy(rejectId);
    try { await rejectTask(rejectId, fb.trim(), dl); setRejectId(null); after(); }
    finally { setBusy(null); }
  };

  const rows = useMemo(() => {
    if (!data) return [];
    let r = data.tasks || [];
    if (filter === "overdue") r = r.filter((t) => t.overdue);
    else if (filter === "active") r = r.filter((t) => t.status !== "approved" && t.status !== "cancelled");
    else if (filter !== "all") r = r.filter((t) => t.status === filter);
    if (q.trim()) {
      const t = q.trim().toLowerCase();
      r = r.filter((x) =>
        (x.title || "").toLowerCase().includes(t) ||
        (x.worker || "").toLowerCase().includes(t) ||
        String(x.number).includes(t));
    }
    return r;
  }, [data, q, filter]);

  if (err)
    return (
      <div className="section-empty">
        {err} <button className="btn-ghost" onClick={load}>Qayta urinish</button>
      </div>
    );
  if (!data) return <BrickLoader label="Yuklanmoqda" />;

  const s = data.summary || {};
  const STATS = [
    ["submitted", s.review, "Ko'rib chiqish", "review"],
    ["overdue", s.overdue, "Muddati o'tgan", "over"],
    ["active", s.active, "Faol", "act"],
  ];

  return (
    <>
      <div className="xhead">
        <div>
          <h2 className="xhead__title">Vazifalar</h2>
          <div className="xhead__sub">{s.total} ta vazifa</div>
        </div>
        <button className="btn-primary" onClick={() => setCreating(true)}>
          <Plus size={15} /> Yangi vazifa
        </button>
      </div>

      <div className="tstats">
        {STATS.map(([key, n, label, cls]) => (
          <button
            key={key}
            className={"tstat tstat--" + cls + (filter === key ? " on" : "")}
            onClick={() => setFilter(filter === key ? "all" : key)}
          >
            <div className="tstat__n">{n || 0}</div>
            <div className="tstat__l">{label}</div>
          </button>
        ))}
      </div>

      <div className="tpills">
        <button className={"tpill" + (filter === "all" ? " on" : "")} onClick={() => setFilter("all")}>
          Hammasi <span className="c">{s.total}</span>
        </button>
        {(data.statuses || [])
          .filter((st) => st.count > 0 || st.key === "submitted")
          .map((st) => (
            <button
              key={st.key}
              className={"tpill" + (filter === st.key ? " on" : "")}
              onClick={() => setFilter(st.key)}
            >
              {st.label} <span className="c">{st.count}</span>
            </button>
          ))}
        <div className="xsearch tpills__search">
          <Search size={14} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Qidirish…" />
        </div>
      </div>

      <div className="card xtable__wrap">
        <table className="xtable ttable">
          <thead>
            <tr>
              <th style={{ width: 62 }}>#</th>
              <th>Vazifa</th>
              <th style={{ width: 175 }}>Ishchi</th>
              <th style={{ width: 165 }}>Muddat</th>
              <th style={{ width: 235 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <Fragment key={t.id}>
                <tr className="tclick" onClick={() => setOpen(t.id)}>
                  <td className="tnum">
                    <i className="tspine" style={{ background: SPINE[t.status] || "#888" }} />
                    {String(t.number).padStart(2, "0")}
                  </td>
                  <td className="xtable__item">
                    {t.title}
                    <span className="tbadge" style={{ color: SPINE[t.status] }}>
                      <i style={{ background: SPINE[t.status] }} />
                      {t.status_label}
                    </span>
                  </td>
                  <td className="dim tworker">
                    <span className="tava">{initials(t.worker || "")}</span>
                    {t.worker || "—"}
                  </td>
                  <td className={"tdl tdl--" + (t.due_tone || "none")}>
                    {t.due_text || "muddatsiz"}
                  </td>
                  <td className="tacts" onClick={(e) => e.stopPropagation()}>
                    {t.can_review && rejectId !== t.id && (
                      <>
                        <button className="btn-ok" disabled={busy === t.id} onClick={() => approve(t.id)}>
                          <Check size={13} /> Tasdiqlash
                        </button>
                        <button className="btn-no" onClick={() => openReject(t.id)}>
                          <X size={13} /> Rad etish
                        </button>
                      </>
                    )}
                  </td>
                </tr>

                {rejectId === t.id && (
                  <tr className="trow-form">
                    <td colSpan={5}>
                      <div className="tform">
                        <textarea
                          autoFocus
                          value={fb}
                          onChange={(e) => setFb(e.target.value)}
                          placeholder="Sabab va talab"
                        />
                        <input type="datetime-local" value={dl} onChange={(e) => setDl(e.target.value)} />
                        <div className="tform__acts">
                          <button
                            className="btn-danger"
                            disabled={busy === t.id || !fb.trim() || !dl}
                            onClick={sendReject}
                          >
                            Rad etib yuborish
                          </button>
                          <button className="btn-ghost" onClick={() => setRejectId(null)}>
                            Bekor
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={5} className="xtable__empty">
                  {filter === "submitted"
                    ? "Ko'rib chiqiladigan yo'q — hammasi ko'rib chiqilgan."
                    : filter === "overdue"
                    ? "Muddati o'tgan yo'q — hammasi muddatida."
                    : "Vazifa yo'q."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {open && <TaskDetail taskId={open} onClose={() => setOpen(null)} onChanged={after} />}
      {creating && (
        <NewTask onClose={() => setCreating(false)} onSaved={() => { setCreating(false); after(); }} />
      )}
    </>
  );
}
