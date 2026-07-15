import { useEffect, useState } from "react";
import {
  X,
  Check,
  Clock,
  Trash2,
  FileDown,
  FileText,
  MessageSquare,
  CircleDot,
} from "lucide-react";
import {
  getTask,
  approveTask,
  rejectTask,
  deleteTask,
  fileUrl,
  reportUrl,
} from "../api/client";
import BrickLoader from "./BrickLoader.jsx";
import { fmtSom } from "../lib/format";

// Task detail.
//
// Everything the Mini App shows when you open a task: the brief, the worker's
// evidence (photos and notes, in the order he sent them), what the AI pulled out of
// it, and the actions. A boss reviewing work needs to SEE the work -- approving from
// a row in a table without looking at the photos is just rubber-stamping.

// These are the Mini App's exact words. Same product, same vocabulary -- a boss
// should not have to learn two names for the same action.
const TL = {
  created: "Yaratildi",
  submitted: "Topshirildi",
  resubmitted: "Qayta topshirildi",
  approved: "Tasdiqlandi",
  rejected: "Rad etildi",
};

function RejectForm({ onCancel, onSubmit, busy }) {
  const [feedback, setFeedback] = useState("");
  const [deadline, setDeadline] = useState("");

  // Default the new deadline to tomorrow 18:00 -- a rejection needs a date or it
  // is just a dead end for the worker.
  useEffect(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(18, 0, 0, 0);
    const pad = (n) => String(n).padStart(2, "0");
    setDeadline(
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
        d.getHours()
      )}:${pad(d.getMinutes())}`
    );
  }, []);

  return (
    <div className="trej">
      <label className="fld">
        <span>Sabab va talab</span>
        <input
          autoFocus
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Sabab va talab"
        />
      </label>
      <label className="fld">
        <span>Yangi muddat</span>
        <input
          type="datetime-local"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />
      </label>
      <div className="trej__acts">
        <button className="btn-ghost" onClick={onCancel} disabled={busy}>
          Bekor
        </button>
        <button
          className="btn-danger"
          disabled={busy || !feedback.trim() || !deadline}
          onClick={() => onSubmit(feedback.trim(), deadline)}
        >
          {busy ? "…" : "Rad etib yuborish"}
        </button>
      </div>
    </div>
  );
}

export default function TaskDetail({ taskId, onClose, onChanged }) {
  const [t, setT] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [lightbox, setLightbox] = useState(null);   // photo opened full-size, in-page

  useEffect(() => {
    setT(null);
    getTask(taskId)
      .then(setT)
      .catch((e) => setErr(e.message || "Yuklab bo'lmadi."));
  }, [taskId]);

  const act = async (fn) => {
    setBusy(true);
    try {
      await fn();
      onChanged();
      onClose();
    } catch (e) {
      setErr(e.message || "Xatolik");
      setBusy(false);
    }
  };

  const remove = () => {
    if (!window.confirm("Vazifa o'chirilsinmi? Bu qaytarib bo'lmaydi.")) return;
    act(() => deleteTask(taskId));
  };

  return (
    <div className="drawer-bg" onClick={onClose}>
      <div className="tdet" onClick={(e) => e.stopPropagation()}>
        {!t && !err && <BrickLoader label="Yuklanmoqda" />}
        {err && <div className="section-empty">{err}</div>}

        {t && (
          <>
            <div className="tdet__head">
              <div>
                <div className="tdet__num">#{t.number}</div>
                <h3 className="tdet__title">{t.title}</h3>
                <div className="tdet__meta">
                  <span>{t.worker || "—"}</span>
                  {t.deadline && (
                    <>
                      <i>·</i>
                      <span>
                        <Clock size={11} /> {t.deadline}
                      </span>
                    </>
                  )}
                  <i>·</i>
                  <span className={"tchip tchip--" + (t.can_review ? "warn" : "dim")}>
                    {t.status_label}
                  </span>
                </div>
              </div>
              <button className="drawer__close" onClick={onClose}>
                <X size={17} />
              </button>
            </div>

            {t.description && (
              <div className="tdet__sec">
                <h4>Vazifa</h4>
                <p className="tdet__desc">{t.description}</p>
              </div>
            )}

            {t.audio && (
              <div className="tdet__sec">
                <h4>Ovozli topshiriq</h4>
                <audio controls src={fileUrl(t.audio.id)} className="tdet__audio" />
              </div>
            )}

            {t.summary && (
              <div className="tdet__sec">
                <h4>AI xulosasi</h4>
                <p className="tdet__desc">{t.summary}</p>
              </div>
            )}

            {t.items && t.items.length > 0 && (
              <div className="tdet__sec">
                <h4>Aniqlangan ma'lumotlar</h4>
                <table className="xtable tdet__items">
                  <tbody>
                    {t.items.map((it, i) => (
                      <tr key={i}>
                        <td>{it.material || it.name || "—"}</td>
                        <td className="dim">
                          {it.quantity} {it.unit}
                        </td>
                        <td className="num mono">
                          {it.total ? fmtSom(it.total, false) : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {t.evidence && t.evidence.length > 0 && (
              <div className="tdet__sec">
                <h4>
                  Dalillar <span className="count">{t.evidence.length} ta</span>
                </h4>
                <div className="tdet__ev">
                  {t.evidence.map((e, i) => {
                    if (e.kind === "photo")
                      return (
                        <button
                          key={i}
                          className="tdet__photo"
                          onClick={() => setLightbox(fileUrl(e.id))}
                        >
                          <img
                            src={fileUrl(e.id)}
                            alt=""
                            loading="lazy"
                            onError={(ev) => {
                              ev.currentTarget.style.display = "none";
                              ev.currentTarget.parentElement.classList.add("tdet__photo--gone");
                            }}
                          />
                          {e.caption && <span>{e.caption}</span>}
                        </button>
                      );
                    if (e.kind === "doc")
                      return (
                        <a
                          key={i}
                          className="tdet__doc"
                          href={fileUrl(e.id)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <FileText size={14} />
                          <span>{e.name || "Hujjat"}</span>
                        </a>
                      );
                    return (
                      <div key={i} className="tdet__note">
                        <MessageSquare size={13} />
                        {e.text || e.caption || ""}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {t.timeline && t.timeline.length > 0 && (
              <div className="tdet__sec">
                <h4>Tarix</h4>
                <div className="ttl">
                  {t.timeline.map((ev, i) => (
                    <div key={i} className={"ttl__row ttl__row--" + ev.type}>
                      <CircleDot size={11} />
                      <span className="ttl__what">{TL[ev.type] || ev.type}</span>
                      {ev.type === "rejected" && ev.body && (
                        <span className="ttl__note">{ev.body}</span>
                      )}
                      {(ev.type === "submitted" || ev.type === "resubmitted") &&
                        ev.on_time === false && (
                          <span className="ttl__late">kechikib</span>
                        )}
                      {(ev.type === "submitted" || ev.type === "resubmitted") &&
                        ev.on_time === true && (
                          <span className="ttl__ontime">muddatida</span>
                        )}
                      <span className="ttl__at">{ev.at}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {t.has_report && (
              <div className="tdet__sec">
                <h4>Hisobot</h4>
                <div className="tdet__dl">
                  <a className="btn-ghost" href={reportUrl(t.id, "docx")}>
                    <FileDown size={14} /> Word
                  </a>
                  <a className="btn-ghost" href={reportUrl(t.id, "xlsx")}>
                    <FileDown size={14} /> Excel
                  </a>
                </div>
              </div>
            )}

            {rejecting ? (
              <RejectForm
                busy={busy}
                onCancel={() => setRejecting(false)}
                onSubmit={(fb, dl) => act(() => rejectTask(t.id, fb, dl))}
              />
            ) : (
              <div className="tdet__foot">
                {t.can_delete && (
                  <button className="btn-no tdet__del" onClick={remove} disabled={busy}>
                    <Trash2 size={14} /> O'chirish
                  </button>
                )}
                {t.can_review && (
                  <>
                    <button
                      className="btn-no"
                      onClick={() => setRejecting(true)}
                      disabled={busy}
                    >
                      <X size={14} /> Rad etish
                    </button>
                    <button
                      className="btn-ok"
                      onClick={() => act(() => approveTask(t.id))}
                      disabled={busy}
                    >
                      <Check size={14} /> Tasdiqlash
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {lightbox && (
        <div className="lb" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" onClick={(e) => e.stopPropagation()} />
          <button className="lb__x" onClick={() => setLightbox(null)}>
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
