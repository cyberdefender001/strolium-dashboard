import { useEffect, useState, useCallback } from "react";
import {
  ShieldCheck, LogOut, ListChecks, Wallet, Calendar, Clock, X,
  ImagePlus, Paperclip, Send, FileText, MessageSquare, Plus, Check,
} from "lucide-react";
import {
  getWorkerBoard, getWorkerTask, workerAddPhoto, workerAddDocument,
  workerAddNote, workerDeleteAttachment, workerSubmit, listProjects, fileUrl,
} from "../api/client";
import { initials } from "../lib/format";
import BrickLoader from "../components/BrickLoader.jsx";
import AddExpense from "../components/AddExpense.jsx";
import "./work.css";

// Ishchi (worker) view -- the SAME design as the boss web, by construction:
// the shell (.shell/.side/.main/.topbar/.content), the stat cards (.tstats),
// the task table (.xtable.ttable), the task drawer (.tdet), the lightbox (.lb)
// and the expense modal are all the boss design's own classes and components.
// Nothing here is styled from scratch; work.css only adds the few affordances
// that have no boss equivalent (delete-evidence x, add-evidence row, submit).
//
// What a worker sees is ONLY what a worker can act on -- their tasks and the
// Xarajat form -- mirroring the Mini App's two tabs. Enforced server-side:
// /api/worker/* checks task.assigned_to; /api/web/* answers managers+ only.

const SPINE = {
  open: "#4C8DFF", submitted: "#F4A52A", rejected: "#F2555A",
  on_hold: "#8B95A1", approved: "#2FB67C", cancelled: "#566273",
};

const _MONTHS_UZ = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
];
const monthUz = () => {
  const d = new Date();
  return `${_MONTHS_UZ[d.getMonth()]} ${d.getFullYear()}`;
};

// Bug #3, replicated deliberately: full-resolution photos blow past Railway's
// body limit and base64 inflates ~33%. Downscale client-side, always.
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

const TL = {
  created: ["Yaratildi", Plus, ""],
  submitted: ["Yuborildi", Send, "submitted"],
  resubmitted: ["Qayta yuborildi", Send, "resubmitted"],
  approved: ["Tasdiqlandi", Check, "approved"],
  rejected: ["Rad etildi", X, "rejected"],
};

/* ---------------- task drawer (same .tdet drawer the boss uses) ------------ */

function WorkerTaskDetail({ taskId, onClose, onChanged }) {
  const [t, setT] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  const load = useCallback(() => {
    setErr("");
    getWorkerTask(taskId).then(setT).catch((e) => setErr(e.message || "Yuklab bo'lmadi."));
  }, [taskId]);

  useEffect(() => { load(); }, [load]);

  const onPhotos = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    setErr("");
    setUploading(files.length);
    try {
      // Sequential: created_at order = pick order = report order.
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
      onClose();
    } catch (ex) {
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

  return (
    <div className="drawer-bg" onClick={onClose}>
      <div className="tdet" onClick={(e) => e.stopPropagation()}>
        {!t && !err && <BrickLoader label="Yuklanmoqda" />}
        {err && !t && <div className="section-empty">{err}</div>}

        {t && (
          <>
            <div className="tdet__head">
              <div>
                <div className="tdet__num">#{t.number}</div>
                <h3 className="tdet__title">{t.title}</h3>
                <div className="tdet__meta">
                  {t.deadline && (
                    <span>
                      <Clock size={11} /> {t.deadline}
                    </span>
                  )}
                  {t.deadline && <i>·</i>}
                  <span
                    className={"tchip tchip--" + (t.status === "rejected" ? "warn" : "dim")}
                    style={{ color: SPINE[t.status] }}
                  >
                    {t.status_label}
                  </span>
                  {t.submitted_at && (
                    <>
                      <i>·</i>
                      <span className={t.on_time === false ? "bad" : "good"}>
                        {t.submitted_at}
                        {t.on_time != null && (t.on_time ? " · muddatida" : " · kechikdi")}
                      </span>
                    </>
                  )}
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

            {t.is_rejected && t.feedback && (
              <div className="tdet__sec">
                <h4>Rad etish sababi</h4>
                <p className="tdet__desc bad">{t.feedback}</p>
              </div>
            )}

            <div className="tdet__sec">
              <h4>
                Dalillar{" "}
                {t.evidence && t.evidence.length > 0 && (
                  <span className="count">{t.evidence.length} ta</span>
                )}
              </h4>
              <div className="tdet__ev">
                {(t.evidence || []).map((e) => {
                  if (e.kind === "photo")
                    return (
                      <button
                        key={e.id}
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
                        {t.editable && (
                          <i
                            className="wkdel"
                            title="O'chirish"
                            onClick={(ev) => { ev.stopPropagation(); if (!busy) del(e.id); }}
                          >
                            <X size={11} />
                          </i>
                        )}
                      </button>
                    );
                  if (e.kind === "doc")
                    return (
                      <a
                        key={e.id}
                        className="tdet__doc"
                        href={fileUrl(e.id)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <FileText size={14} />
                        <span>{e.name || "Hujjat"}</span>
                        {t.editable && (
                          <i
                            className="wkdel"
                            title="O'chirish"
                            onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); if (!busy) del(e.id); }}
                          >
                            <X size={11} />
                          </i>
                        )}
                      </a>
                    );
                  return (
                    <div key={e.id} className="tdet__note">
                      <MessageSquare size={13} />
                      <span>{e.text}</span>
                      {t.editable && (
                        <i
                          className="wkdel"
                          title="O'chirish"
                          onClick={() => { if (!busy) del(e.id); }}
                        >
                          <X size={11} />
                        </i>
                      )}
                    </div>
                  );
                })}
                {!(t.evidence || []).length && (
                  <p className="tdet__desc dim">
                    Hali dalil yo'q — rasm, fayl yoki izoh qo'shing.
                  </p>
                )}
              </div>
            </div>

            {t.editable && (
              <div className="tdet__sec">
                <h4>Dalil qo'shish</h4>
                <div className="wkadders">
                  <label className="btn-ghost" htmlFor="wkphotos">
                    <ImagePlus size={14} /> Rasm
                  </label>
                  <input id="wkphotos" type="file" accept="image/*" multiple hidden onChange={onPhotos} />
                  <label className="btn-ghost" htmlFor="wkdoc">
                    <Paperclip size={14} /> Fayl
                  </label>
                  <input id="wkdoc" type="file" hidden onChange={onDoc} />
                  {uploading > 0 && <span className="hint">Yuklanmoqda… {uploading}</span>}
                </div>
                <div className="wknote">
                  <textarea
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Izoh yozing…"
                  />
                  <button className="btn-primary" disabled={busy || !note.trim()} onClick={addNote}>
                    Saqlash
                  </button>
                </div>

                {err && <div className="modal__err" style={{ marginTop: 10 }}>{err}</div>}

                {!confirming ? (
                  <button
                    className="btn-primary wksubmit"
                    disabled={busy || uploading > 0}
                    onClick={() => setConfirming(true)}
                  >
                    <Send size={14} /> Yuborish
                  </button>
                ) : (
                  <div className="wkconfirm">
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
            )}

            {(t.timeline || []).length > 0 && (
              <div className="tdet__sec">
                <h4>Tarix</h4>
                {t.timeline.map((ev, i) => {
                  const [label, Icon, cls] = TL[ev.type] || [ev.type, Plus, ""];
                  return (
                    <div key={i} className={"ttl__row" + (cls ? " ttl__row--" + cls : "")}>
                      <Icon size={13} />
                      <span className="ttl__what">{label}</span>
                      {ev.type === "rejected" && ev.body && (
                        <span className="ttl__note">{ev.body}</span>
                      )}
                      {(ev.type === "submitted" || ev.type === "resubmitted") &&
                        ev.on_time === false && <span className="ttl__late">kechikdi</span>}
                      <span className="dim" style={{ marginLeft: "auto" }}>{ev.at}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {lightbox && (
        <div className="lb" onClick={(e) => { e.stopPropagation(); setLightbox(null); }}>
          <img src={lightbox} alt="" onClick={(e) => e.stopPropagation()} />
          <button className="lb__x" onClick={() => setLightbox(null)}>
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ shell ------------------------------------- */

const NAV = [
  { key: "tasks", label: "Vazifalarim", icon: ListChecks },
  { key: "spend", label: "Xarajat", icon: Wallet },
];

export default function Work({ user, onLogout }) {
  const [nav, setNav] = useState("tasks");
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(null);
  const [adding, setAdding] = useState(false);
  const [projects, setProjects] = useState([]);
  const [savedNote, setSavedNote] = useState("");

  const load = useCallback(() => {
    setErr("");
    getWorkerBoard().then(setData).catch((e) => setErr(e.message || "Yuklab bo'lmadi."));
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    listProjects().then(setProjects).catch(() => {});
  }, []);

  const s = (data && data.stats) || {};
  const STATS = [
    ["open", s.open, "Ochiq", "act"],
    ["rejected", s.rejected, "Rad etilgan", "over"],
    ["submitted", s.submitted, "Yuborilgan", "review"],
    ["approved", s.approved, "Tasdiqlangan", "ok"],
  ];
  const [filter, setFilter] = useState("all");
  const rows = ((data && data.tasks) || []).filter(
    (t) => filter === "all" || t.status === filter
  );

  return (
    <div className="shell">
      <aside className="side">
        <div className="side__brand">
          <div className="side__mark">
            <ShieldCheck size={18} />
          </div>
          <span className="side__name">Strolium</span>
        </div>

        <div className="side__org">
          <div className="side__org-label">Kompaniya</div>
          <div className="side__org-name">{(data && data.org) || user.company}</div>
        </div>

        <nav className="side__nav">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                className={"navitem" + (nav === item.key ? " active" : "")}
                onClick={() => setNav(item.key)}
              >
                <Icon size={17} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="side__foot">
          <div className="side__user">
            <div className="avatar">{initials(user.name || "")}</div>
            <div>
              <div className="side__user-name">{user.name}</div>
              <div className="side__user-mail">{user.role}</div>
            </div>
          </div>
          <button className="logout" onClick={onLogout}>
            <LogOut size={15} /> Chiqish
          </button>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div>
            <h1>{nav === "tasks" ? "Vazifalarim" : "Xarajat"}</h1>
            <div className="sub">{(data && data.org) || user.company}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="period">
              <Calendar size={15} /> {monthUz()}
            </div>
          </div>
        </div>

        <div className="content">
          {nav === "tasks" && (
            <>
              {err && (
                <div className="section-empty">
                  {err} <button className="btn-ghost" onClick={load}>Qayta urinish</button>
                </div>
              )}
              {!err && !data && <BrickLoader label="Yuklanmoqda" />}
              {!err && data && (
                <>
                  <div className="tstats" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
                    {STATS.map(([key, n, label, cls]) => (
                      <button
                        key={key}
                        className={"tstat tstat--" + cls + (filter === key ? " on" : "")}
                        onClick={() => setFilter(filter === key ? "all" : key)}
                      >
                        <div className="tstat__n" style={{ color: SPINE[key] }}>{n || 0}</div>
                        <div className="tstat__l">{label}</div>
                      </button>
                    ))}
                  </div>

                  <div className="card xtable__wrap">
                    <table className="xtable ttable">
                      <thead>
                        <tr>
                          <th style={{ width: 62 }}>#</th>
                          <th>Vazifa</th>
                          <th style={{ width: 210 }}>Muddat</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((t) => (
                          <tr key={t.id} className="tclick" onClick={() => setOpen(t.id)}>
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
                            <td className={"tdl tdl--" + (t.due_tone || "none")}>
                              {t.due_text || "muddatsiz"}
                            </td>
                          </tr>
                        ))}
                        {!rows.length && (
                          <tr>
                            <td colSpan={3} className="xtable__empty">
                              {filter === "all"
                                ? "Hozircha vazifa yo'q. Nazoratchingiz vazifa berganda shu yerda ko'rinadi."
                                : "Bu holatda vazifa yo'q."}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}

          {nav === "spend" && (
            <>
              <div className="xhead">
                <div>
                  <h2 className="xhead__title">Xarajat</h2>
                  <div className="xhead__sub">
                    Obyektdagi xarajatni yozing — u darhol rahbar hisobotiga tushadi.
                  </div>
                </div>
                <button className="btn-primary" onClick={() => { setSavedNote(""); setAdding(true); }}>
                  <Plus size={15} /> Xarajat qo'shish
                </button>
              </div>
              {savedNote && <div className="proof-note">{savedNote}</div>}
            </>
          )}
        </div>
      </main>

      {open && (
        <WorkerTaskDetail taskId={open} onClose={() => setOpen(null)} onChanged={load} />
      )}

      {adding && (
        <AddExpense
          projects={projects}
          groups={[]}
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            setSavedNote("Xarajat saqlandi.");
          }}
        />
      )}
    </div>
  );
}
