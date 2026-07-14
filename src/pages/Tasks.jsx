import { useEffect, useMemo, useState, useCallback } from "react";
import { Search, Check, X, Clock, AlertTriangle } from "lucide-react";
import { getTasks, approveTask, rejectTask } from "../api/client";
import BrickLoader from "../components/BrickLoader.jsx";

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

function RejectBox({ task, onDone, onCancel }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const go = async () => {
    setBusy(true);
    try {
      await rejectTask(task.id, reason.trim());
      onDone();
    } catch {
      setBusy(false);
    }
  };

  return (
    <div className="modal__wrap" onClick={onCancel}>
      <div className="axp" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="axp__body" style={{ paddingTop: 22 }}>
          <h3 className="modal__title">Qaytarish</h3>
          <div className="trej__task">
            #{task.number} · {task.title}
          </div>
          <label className="fld">
            <span>Sabab (ishchi ko'radi)</span>
            <input
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="masalan: rasm aniq emas, qayta yuboring"
            />
          </label>
        </div>
        <div className="axp__foot">
          <button className="btn-ghost" onClick={onCancel} disabled={busy}>
            Bekor
          </button>
          <button className="btn-danger" onClick={go} disabled={busy}>
            {busy ? "…" : "Qaytarish"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Tasks({ onChange }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [rejecting, setRejecting] = useState(null);
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
                <button className="btn-no" onClick={() => setRejecting(t)}>
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
              <tr key={t.id}>
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

      {rejecting && (
        <RejectBox
          task={rejecting}
          onCancel={() => setRejecting(null)}
          onDone={() => {
            setRejecting(null);
            load();
            if (onChange) onChange();
          }}
        />
      )}
    </>
  );
}
