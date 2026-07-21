import { useEffect, useState, useCallback, useRef } from "react";
import {
  ShieldCheck, LogOut, ChevronLeft, ImagePlus, Paperclip,
  Send, X, FileText, Clock,
} from "lucide-react";
import {
  getWorkerBoard, getWorkerTask, workerAddPhoto, workerAddDocument,
  workerAddNote, workerDeleteAttachment, workerSubmit, fileUrl,
} from "../api/client";
import { initials } from "../lib/format";
import BrickLoader from "../components/BrickLoader.jsx";
import "./work.css";

// Ishchi view -- the web twin of the Mini App's mywork page.
//
// Same principle as the Mini App: a worker sees ONLY what they can act on --
// their own tasks, their own evidence, one Yuborish button. No org financials,
// no other people's work, no dead menu items. The backend guarantees it (every
// /api/worker/* endpoint checks task.assigned_to server-side); this page just
// refuses to pretend otherwise.
//
// Capability parity with the Mini App: task list with status/deadline tones,
// task detail with description, voice-task audio, rejection feedback, Tarix
// timeline, chronological evidence (photos/docs/notes), add photo (multi-select,
// client-side canvas downscale ~1600px JPEG 0.82 -- bug #3, Railway body limit),
// add document, add note, delete evidence, submit with confirmation.

const SPINE = {
  open: "#4C8DFF", submitted: "#F4A52A", rejected: "#F2555A",
  on_hold: "#8B95A1", approved: "#2FB67C", cancelled: "#566273",
};

// Bug #3 from the Mini App era, replicated deliberately: full-resolution phone
// photos blow past Railway's request-body limit ("upstream error"), and base64
// inflates by ~33%. Downscale on the client before upload, always.
function downscale(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 1600;
      let { width: w, height: h } = img;
      if (Math.max(w, h) > MAX) {
        const k = MAX / Math.max(w, h);
        w = Math.round(w * k);
        h = Math.round(h * k);
      }
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Rasmni o'qib bo'lmadi"));
    };
    img.src = url;
  });
}

function readAsDataURL(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(new Error("Faylni o'qib bo'lmadi"));
    r.readAsDataURL(file);
  });
}

const TL_LABEL = {
  created: "Yaratildi",
  submitted: "Yuborildi",
  resubmitted: "Qayta yuborildi",
  approved: "Tasdiqlandi",
  rejected: "Rad etildi",
};
const TL_TONE = {
  created: "muted", submitted: "warn", resubmitted: "warn",
  approved: "good", rejected: "bad",
};

function Detail({ taskId, onBack, onChanged }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [uploading, setUploading] = useState(0); // files in flight

  const load = useCallback(() => {
    setErr("");
    getWorkerTask(taskId).then(setD).catch((e) => setErr(e.message || "Yuklab bo'lmadi."));
  }, [taskId]);

  useEffect(() => { load(); }, [load]);

  const onPhotos = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    setErr("");
    setUploading(files.length);
    try {
      // Sequential, not parallel: keeps created_at order = the order the worker
      // picked them, which is the order the evidence list and the Word report use.
      for (const f of files) {
        const dataUrl = await downscale(f);
        await workerAddPhoto(taskId, dataUrl);
        setUploading((n) => n - 1);
      }
      load();
    } catch (ex) {
      setErr(ex.message || "Yuklashda xatolik.");
      setUploading(0);
      load();
    }
  };

  const onDoc = async (e) => {
    const f = (e.target.files || [])[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) return setErr("Fayl juda katta (8 MB gacha).");
    setErr("");
    setUploading(1);
    try {
      const dataUrl = await readAsDataURL(f);
      await workerAddDocument(taskId, dataUrl, f.type, f.name);
      setUploading(0);
      load();
    } catch (ex) {
      setErr(ex.message || "Yuklashda xatolik.");
      setUploading(0);
    }
  };

  const addNote = async () => {
    if (!note.trim()) return;
    setBusy(true);
    setErr("");
    try {
      await workerAddNote(taskId, note.trim());
      setNote("");
      load();
    } catch (ex) {
      setErr(ex.message || "Saqlab bo'lmadi.");
    } finally {
      setBusy(false);
    }
  };

  const del = async (id) => {
    setBusy(true);
    try {
      await workerDeleteAttachment(id);
      load();
    } catch (ex) {
      setErr(ex.message || "O'chirib bo'lmadi.");
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    setBusy(true);
    setErr("");
    try {
      await workerSubmit(taskId);
      setConfirming(false);
      onChanged();
      onBack();
    } catch (ex) {
      // 400 "empty" -> nothing collected; 409 "locked" -> status changed meanwhile
      setErr(
        ex.message === "empty"
          ? "Hali hech narsa qo'shilmagan — avval rasm yoki izoh qo'shing."
          : ex.message || "Yuborib bo'lmadi."
      );
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  };

  if (err && !d)
    return (
      <div className="section-empty">
        {err} <button className="btn-ghost" onClick={load}>Qayta urinish</button>
      </div>
    );
  if (!d) return <BrickLoader label="Yuklanmoqda" />;

  const evidence = d.evidence || [];

  return (
    <>
      <button className="wk__back" onClick={onBack}>
        <ChevronLeft size={15} /> Vazifalarim
      </button>

      <div className="wk__dhead">
        <div className="wk__dnum" style={{ color: SPINE[d.status] }}>
          #{String(d.number).padStart(2, "0")}
        </div>
        <div className="wk__dtitle">{d.title}</div>
        <span className="wk__badge" style={{ color: SPINE[d.status] }}>
          <i style={{ background: SPINE[d.status] }} /> {d.status_label}
        </span>
      </div>

      {d.deadline && (
        <div className="wk__meta">
          <Clock size={12} /> Muddat: <b>{d.deadline}</b>
          {d.submitted_at && (
            <span className={"wk__ontime " + (d.on_time ? "good" : "bad")}>
              · Yuborildi: {d.submitted_at}
            </span>
          )}
        </div>
      )}

      {d.description && <div className="wk__desc">{d.description}</div>}

      {d.audio && (
        <audio className="wk__audio" controls src={fileUrl(d.audio.id)} />
      )}

      {d.is_rejected && d.feedback && (
        <div className="wk__reject">
          <b>Rad etildi — tuzatish talab qilinadi:</b>
          <div>{d.feedback}</div>
        </div>
      )}

      <div className="wk__sec">Dalillar {evidence.length ? `(${evidence.length})` : ""}</div>
      <div className="wk__evlist">
        {evidence.map((ev) => (
          <div key={ev.id} className="wk__ev">
            {ev.kind === "photo" && (
              <a href={fileUrl(ev.id)} target="_blank" rel="noreferrer">
                <img src={fileUrl(ev.id)} alt="" loading="lazy" />
              </a>
            )}
            {ev.kind === "doc" && (
              <a className="wk__doc" href={fileUrl(ev.id)} target="_blank" rel="noreferrer">
                <FileText size={15} /> {ev.name}
              </a>
            )}
            {ev.kind === "note" && <div className="wk__note">{ev.text}</div>}
            {ev.caption && ev.kind !== "note" && (
              <div className="wk__cap">{ev.caption}</div>
            )}
            {d.editable && (
              <button className="wk__del" title="O'chirish" disabled={busy}
                onClick={() => del(ev.id)}>
                <X size={12} />
              </button>
            )}
          </div>
        ))}
        {!evidence.length && (
          <div className="wk__empty">Hali dalil yo'q. Rasm, fayl yoki izoh qo'shing.</div>
        )}
      </div>

      {d.editable && (
        <>
          <div className="wk__adders">
            <label className="btn-ghost wk__add" htmlFor="wkphotos">
              <ImagePlus size={15} /> Rasm qo'shish
            </label>
            <input id="wkphotos" type="file" accept="image/*" multiple hidden onChange={onPhotos} />
            <label className="btn-ghost wk__add" htmlFor="wkdoc">
              <Paperclip size={15} /> Fayl
            </label>
            <input id="wkdoc" type="file" hidden onChange={onDoc} />
            {uploading > 0 && <span className="wk__up">Yuklanmoqda… {uploading}</span>}
          </div>

          <div className="wk__notebar">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Izoh yozing…"
              rows={2}
            />
            <button className="btn-primary" disabled={busy || !note.trim()} onClick={addNote}>
              Saqlash
            </button>
          </div>

          {err && <div className="wk__err">{err}</div>}

          <div className="wk__submitbar">
            {!confirming ? (
              <button
                className="btn-primary wk__submit"
                disabled={busy || uploading > 0}
                onClick={() => setConfirming(true)}
              >
                <Send size={15} /> Yuborish
              </button>
            ) : (
              <div className="wk__confirm">
                <span>Nazoratchiga yuborilsinmi?</span>
                <button className="btn-primary" disabled={busy} onClick={submit}>
                  Ha, yuborish
                </button>
                <button className="btn-ghost" disabled={busy} onClick={() => setConfirming(false)}>
                  Bekor
                </button>
              </div>
            )}
          </div>
        </>
      )}
      {!d.editable && (
        <div className="wk__locked">
          Bu vazifa hozir tahrirlanmaydi — holati: {d.status_label}.
        </div>
      )}

      {(d.timeline || []).length > 0 && (
        <>
          <div className="wk__sec">Tarix</div>
          <div className="wk__tl">
            {d.timeline.map((ev, i) => (
              <div key={i} className={"wk__tlrow " + (TL_TONE[ev.type] || "muted")}>
                <i />
                <span className="wk__tllabel">
                  {TL_LABEL[ev.type] || ev.type}
                  {ev.type === "rejected" && ev.body ? ` — ${ev.body}` : ""}
                  {(ev.type === "submitted" || ev.type === "resubmitted") &&
                    ev.on_time != null && (
                      <b className={ev.on_time ? "good" : "bad"}>
                        {" "}{ev.on_time ? "· muddatida" : "· kechikdi"}
                      </b>
                    )}
                </span>
                <span className="wk__tlat">{ev.at}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

export default function Work({ user, onLogout }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(null);

  const load = useCallback(() => {
    setErr("");
    getWorkerBoard().then(setData).catch((e) => setErr(e.message || "Yuklab bo'lmadi."));
  }, []);

  useEffect(() => { load(); }, [load]);

  const s = (data && data.stats) || {};

  return (
    <div className="wk">
      <header className="wk__top">
        <div className="wk__brand">
          <div className="wk__mark"><ShieldCheck size={16} /></div>
          <span>Strolium</span>
          {data && <span className="wk__org">· {data.org}</span>}
        </div>
        <div className="wk__user">
          <span className="tava">{initials(user.name || "")}</span>
          <span className="wk__uname">{user.name}</span>
          <button className="wk__logout" onClick={onLogout} title="Chiqish">
            <LogOut size={15} />
          </button>
        </div>
      </header>

      <main className="wk__main">
        {open ? (
          <Detail taskId={open} onBack={() => setOpen(null)} onChanged={load} />
        ) : err ? (
          <div className="section-empty">
            {err} <button className="btn-ghost" onClick={load}>Qayta urinish</button>
          </div>
        ) : !data ? (
          <BrickLoader label="Yuklanmoqda" />
        ) : (
          <>
            <h2 className="wk__h">Vazifalarim</h2>
            <div className="wk__stats">
              {[
                ["open", "Ochiq", s.open],
                ["rejected", "Rad etilgan", s.rejected],
                ["submitted", "Yuborilgan", s.submitted],
                ["approved", "Tasdiqlangan", s.approved],
              ].map(([k, label, n]) => (
                <div key={k} className="wk__stat" style={{ borderColor: SPINE[k] }}>
                  <b style={{ color: SPINE[k] }}>{n || 0}</b> {label}
                </div>
              ))}
            </div>

            <div className="wk__list">
              {(data.tasks || []).map((t) => (
                <button key={t.id} className="wk__task" onClick={() => setOpen(t.id)}>
                  <i className="wk__spine" style={{ background: SPINE[t.status] }} />
                  <span className="wk__tnum">#{String(t.number).padStart(2, "0")}</span>
                  <span className="wk__ttitle">
                    {t.title}
                    <span className="wk__badge" style={{ color: SPINE[t.status] }}>
                      <i style={{ background: SPINE[t.status] }} /> {t.status_label}
                    </span>
                  </span>
                  <span className={"wk__due wk__due--" + (t.due_tone || "none")}>
                    {t.due_text || ""}
                  </span>
                </button>
              ))}
              {!(data.tasks || []).length && (
                <div className="section-empty">
                  Hozircha vazifa yo'q. Nazoratchingiz vazifa berganda shu yerda ko'rinadi.
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
