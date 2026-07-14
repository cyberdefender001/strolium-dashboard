import { useEffect, useMemo, useState, useCallback } from "react";
import { Search, Check, X, Clock, AlertTriangle, Plus } from "lucide-react";
import { getTasks, approveTask } from "../api/client";
import BrickLoader from "../components/BrickLoader.jsx";
import TaskDetail from "../components/TaskDetail.jsx";
import NewTask from "../components/NewTask.jsx";

// Desktop tasks screen.
//
// The organising idea: a boss opens this to answer ONE question -- "what needs me?"
// So work awaiting his review is pulled to the top as a queue he can clear without
// leaving the page, and everything else sits below in a scannable table.
//
// Approve/reject happen inline. Making a boss click into a detail page to approve a
// task is how approvals end up sitting untouched for a week.

const TONE = {
  submitted: "warn",
  in_progress: "ok",
  assigned: "dim",
  done: "good",
  approved: "good",
  rejected: "bad",
};

function StatusChip({ status, label }) {
  return <span className={"tchip tchip--" + (TONE[status] || "dim")}>{label}</span>;
}

export default function Tasks({ onChange }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(null);   // task id whose detail is showing
  const [creating, setCreating] = useState(false);
  const [acting, setActing] = useState(null);

  const load = useCallback(() => {
    setErr("");
    getTasks()
      .then(setData)
      .catch((e) => setErr(e.message || "Yuklab bo'lmadi."));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async (id) => {
    setActing(id);
    try {
      await approveTask(id);
      load();
      if (onChange) onChange();
    } finally {
      setActing(null);
    }
  };

  const review = useMemo(
    () => (data ? (data.tasks || []).filter((t) => t.can_review) : []),
    [data]
  );

  const rows = useMemo(() => {
    if (!data) return [];
    let r = data.tasks || [];
    if (filter === "overdue") r = r.filter((t) => t.overdue);
    if (filter === "active")
      r = r.filter((t) => !t.can_review && t.status !== "approved");
    if (q.trim()) {
      const t = q.trim().toLowerCase();
      r = r.filter(
        (x) =>
          (x.title || "").toLowerCase().includes(t) ||
          (x.worker || "").toLowerCase().includes(t) ||
          String(x.number).includes(t)
      );
    }
    return r;
  }, [data, q, filter]);

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

  const s = data.summary || {};

  return (
    <>
      <div className="xhead">
        <div>
          <h2 className="xhead__title">Vazifalar</h2>
          <div className="xhead__sub">
            {s.total} ta vazifa · {s.active} faol · {s.overdue} muddati o'tgan
          </div>
        </div>
        <button className="btn-primary" onClick={() => setCreating(true)}>
          <Plus size={15} /> Yangi vazifa
        </button>
      </div>

      {/* the queue: work waiting on the boss, clearable without leaving the page */}
      {review.length > 0 && (
        <div className="treview">
          <div className="treview__head">
            <Clock size={14} />
            Tekshiruv kutmoqda
            <span className="treview__n">{review.length}</span>
          </div>
          {review.map((t) => (
            <div key={t.id} className="treview__row">
              <div className="treview__main">
                <span className="treview__num">#{t.number}</span>
                <span className="treview__title">{t.title}</span>
                {t.overdue && (
                  <span className="treview__late">
                    <AlertTriangle size={11} /> {t.due_text}
                  </span>
                )}
              </div>
              <div className="treview__who">{t.worker || "—"}</div>
              <div className="treview__acts">
                <button
                  className="btn-ok"
                  disabled={acting === t.id}
                  onClick={() => approve(t.id)}
                >
                  <Check size={14} /> Qabul
                </button>
                <button className="btn-no" onClick={() => setOpen(t.id)}>
                  <X size={14} /> Qaytarish
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="xfilters">
        <div className="xsearch">
          <Search size={14} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Qidirish…"
          />
        </div>
        <div className="tseg">
          {[
            ["all", "Barchasi"],
            ["active", "Faol"],
            ["overdue", "Muddati o'tgan"],
          ].map(([k, l]) => (
            <button
              key={k}
              className={filter === k ? "on" : ""}
              onClick={() => setFilter(k)}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="xfilters__tot">{rows.length} ta</div>
      </div>

      <div className="card xtable__wrap">
        <table className="xtable">
          <thead>
            <tr>
              <th style={{ width: 62 }}>#</th>
              <th>Vazifa</th>
              <th>Ishchi</th>
              <th>Muddat</th>
              <th>Holat</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="tclick" onClick={() => setOpen(t.id)}>
                <td className="faint mono">{t.number}</td>
                <td className="xtable__item">{t.title}</td>
                <td className="dim">{t.worker || "—"}</td>
                <td className={t.overdue ? "tlate" : "faint"}>
                  {t.due_text || "—"}
                </td>
                <td>
                  <StatusChip status={t.status} label={t.status_label} />
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={5} className="xtable__empty">
                  Vazifa topilmadi.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <TaskDetail
          taskId={open}
          onClose={() => setOpen(null)}
          onChanged={() => {
            load();
            if (onChange) onChange();
          }}
        />
      )}

      {creating && (
        <NewTask
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            load();
            if (onChange) onChange();
          }}
        />
      )}
    </>
  );
}
