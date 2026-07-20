import { useEffect, useState, useCallback, useRef } from "react";
import {
  Inbox, Tag, Building2, ChevronLeft, Check, X, Pencil,
  Trash2, Ban, Play, Copy,
} from "lucide-react";
import {
  ownerOverview, ownerCompany, activateOrg,
  ownerRequests, approveRequest, rejectRequest,
  getPricing, savePricing,
  ownerRenameMember, setMemberStatus, deleteMember,
} from "../api/client";
import { fmtSom } from "../lib/format";
import BrickLoader from "../components/BrickLoader.jsx";
import "./admin.css";

// Boshqaruv -- the owner console, in a browser.
//
// Same three jobs as the Mini App's Boshqaruv (access requests, pricing,
// companies) against the SAME endpoints, so there is one console, not two that
// drift. What changes is the shape: the phone drills down through stacked bars
// because it has one column; a desk has room for tabs, a totals strip and a
// table, and approving ten requests should not mean ten round trips through a
// back button.
//
// Cross-company DELETE is deliberately absent. It is dev-only god-mode in the
// Mini App and has no business being one mis-click away in a browser tab.

// The server sends a rendered {days,hours,mins} snapshot AND ends_ms. Rendering
// from the snapshot would freeze the countdown at page-load time, so everything
// below recomputes from ends_ms against a 1s clock -- same behaviour as the Mini
// App banner, including the final flip to seconds.
function left(trial, now) {
  if (!trial) return null;
  const ms = (trial.ends_ms || 0) - now;
  if (ms <= 0) return { expired: true, paid: !!trial.paid, ms: 0 };
  return {
    expired: false,
    paid: !!trial.paid,
    ms,
    days: Math.floor(ms / 86400000),
    hours: Math.floor((ms % 86400000) / 3600000),
    mins: Math.floor((ms % 3600000) / 60000),
    secs: Math.floor((ms % 60000) / 1000),
  };
}

function trialText(t) {
  if (!t) return "";
  const L = t.paid ? "Faol" : "Sinov";
  if (t.expired) return L + " · tugagan";
  if (t.days > 0) return `${L} · ${t.days} kun ${t.hours} soat`;
  if (t.hours > 0) return `${L} · ${t.hours} soat ${t.mins} daqiqa`;
  if (t.mins > 0) return `${L} · ${t.mins} daqiqa`;
  return `${L} · ${t.secs} soniya`;
}

function TrialPill({ trial, now }) {
  const t = left(trial, now);
  if (!t) return <span className="adm__pill adm__pill--paid">Faol tarif</span>;
  const tone = t.expired ? "dead" : t.paid ? "paid" : "trial";
  return <span className={"adm__pill adm__pill--" + tone}>{trialText(t)}</span>;
}

// One clock for the whole page rather than a timer per pill.
function useClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/* ------------------------------------------------------------------ */
/* Kirish so'rovlari                                                    */
/* ------------------------------------------------------------------ */

function Requests({ onCount }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [arming, setArming] = useState(null);   // request id whose days input is open
  const [days, setDays] = useState("");
  const [busy, setBusy] = useState(null);
  const [links, setLinks] = useState({});       // id -> {link, code}
  const [copied, setCopied] = useState(null);

  const load = useCallback(() => {
    setErr("");
    ownerRequests()
      .then((d) => { setData(d); if (onCount) onCount(d.new_count || 0); })
      .catch((e) => setErr(e.message || "Yuklab bo'lmadi."));
  }, [onCount]);

  useEffect(() => { load(); }, [load]);

  const defaultDays = (data && data.default_trial_days) || 14;

  // First click arms the row with the real default from app_settings; second
  // click sends it. No window.prompt -- it is blocked in the Telegram Desktop
  // webview and this component is shared in spirit with that surface.
  const approve = async (id) => {
    if (arming !== id) {
      setArming(id);
      setDays(String(defaultDays));
      return;
    }
    const d = parseInt(days, 10);
    setBusy(id);
    try {
      const r = await approveRequest(id, d > 0 ? d : defaultDays);
      setLinks((p) => ({ ...p, [id]: { link: r.link, code: r.code } }));
      setArming(null);
      load();
    } catch (e) {
      setErr(e.message || "Tasdiqlab bo'lmadi.");
    } finally {
      setBusy(null);
    }
  };

  const reject = async (id) => {
    if (!window.confirm("Rad etilsinmi? Foydalanuvchiga xabar yuboriladi.")) return;
    setBusy(id);
    try { await rejectRequest(id); load(); }
    catch (e) { setErr(e.message || "Xatolik."); }
    finally { setBusy(null); }
  };

  const copy = (id, text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 1600);
    });
  };

  if (err && !data)
    return (
      <div className="section-empty">
        {err} <button className="btn-ghost" onClick={load}>Qayta urinish</button>
      </div>
    );
  if (!data) return <BrickLoader label="Yuklanmoqda" />;

  const rows = data.requests || [];
  if (!rows.length)
    return <div className="section-empty">So'rov yo'q. Hali kirish so'rovi kelmagan.</div>;

  return (
    <>
      {err && <div className="adm__err" style={{ marginBottom: 12 }}>{err}</div>}
      {rows.map((r) => {
        const st = r.status || "new";
        const got = links[r.id];
        return (
          <div key={r.id} className="adm__req">
            <div className="adm__reqtop">
              <div className="adm__who">
                {r.full_name}
                {r.username ? ` · @${r.username}` : ""}
              </div>
              <div className={"adm__st adm__st--" + st}>
                {st === "new" ? "Yangi"
                  : st === "approved" ? "Tasdiqlangan"
                  : st === "rejected" ? "Rad etilgan"
                  : st}
              </div>
            </div>

            {r.company && (
              <div className="adm__kv"><span>Kompaniya</span><b>{r.company}</b></div>
            )}
            <div className="adm__kv">
              <span>Kim</span>
              <b>{r.requester_role === "controller" ? "Nazoratchi" : "Rahbar"}</b>
            </div>
            <div className="adm__kv">
              <span>Foydalanuvchi</span>
              <b>{r.controllers} nazoratchi + {r.workers} ishchi = {r.seats}</b>
            </div>
            <div className="adm__kv">
              <span>Tarif</span>
              <b>{r.price != null ? `$${r.price}/oy` : "kelishilgan"}</b>
            </div>
            {r.phone && <div className="adm__kv"><span>Telefon</span><b>{r.phone}</b></div>}
            {r.message && <div className="adm__msg">{r.message}</div>}

            {got && (
              <div className="adm__link">
                {got.link ? "Havola yuborildi:" : `Kod: ${got.code}`}
                {got.link && (
                  <>
                    <input readOnly value={got.link} onFocus={(e) => e.target.select()} />
                    <button
                      className="btn-ghost"
                      style={{ marginTop: 8 }}
                      onClick={() => copy(r.id, got.link)}
                    >
                      {copied === r.id ? <Check size={13} /> : <Copy size={13} />}{" "}
                      {copied === r.id ? "Nusxalandi" : "Nusxalash"}
                    </button>
                  </>
                )}
              </div>
            )}

            {st === "new" && (
              <div className="adm__acts">
                {arming === r.id && (
                  <>
                    <span style={{ fontSize: 12, opacity: 0.65 }}>Sinov muddati</span>
                    <input
                      className="adm__days"
                      inputMode="numeric"
                      autoFocus
                      value={days}
                      onChange={(e) => setDays(e.target.value.replace(/[^0-9]/g, ""))}
                    />
                    <span style={{ fontSize: 12, opacity: 0.65 }}>kun</span>
                  </>
                )}
                <button className="btn-ghost" disabled={busy === r.id} onClick={() => reject(r.id)}>
                  <X size={13} /> Rad etish
                </button>
                <button className="btn-primary" disabled={busy === r.id} onClick={() => approve(r.id)}>
                  <Check size={13} /> Tasdiqlash
                </button>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Kompaniyalar                                                         */
/* ------------------------------------------------------------------ */

function CompanyDetail({ orgId, onBack, now }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [arming, setArming] = useState(false);
  const [days, setDays] = useState("30");
  const [busy, setBusy] = useState(false);
  const [renaming, setRenaming] = useState(null);
  const [draft, setDraft] = useState("");
  const [mbusy, setMbusy] = useState(null);

  const load = useCallback(() => {
    setErr("");
    ownerCompany(orgId).then(setD).catch((e) => setErr(e.message || "Yuklab bo'lmadi."));
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const activate = async () => {
    if (!arming) { setArming(true); return; }
    const n = parseInt(days, 10);
    setBusy(true);
    try { await activateOrg(orgId, n > 0 ? n : 30); setArming(false); load(); }
    catch (e) { setErr(e.message || "Faollashtirib bo'lmadi."); }
    finally { setBusy(false); }
  };

  const rename = async (id) => {
    if (!draft.trim()) return;
    setMbusy(id);
    try { await ownerRenameMember(id, draft.trim()); setRenaming(null); load(); }
    catch (e) { setErr(e.message || "Xatolik."); }
    finally { setMbusy(null); }
  };

  const toggle = async (m) => {
    const next = m.status === "disabled" ? "active" : "disabled";
    if (next === "disabled" &&
        !window.confirm(`${m.name} bloklansinmi? U botdan foydalana olmaydi.`)) return;
    setMbusy(m.id);
    try { await setMemberStatus(m.id, next); load(); }
    catch (e) { setErr(e.message || "Xatolik."); }
    finally { setMbusy(null); }
  };

  const remove = async (m) => {
    if (!window.confirm(
      `${m.name} butunlay o'chiriladi. Uning vazifa va ma'lumotlari ham o'chadi, lekin u keyin qaytadan qo'shilishi mumkin. Davom etamizmi?`
    )) return;
    setMbusy(m.id);
    try { await deleteMember(m.id); load(); }
    catch (e) { setErr(e.message || "Xatolik."); }
    finally { setMbusy(null); }
  };

  if (err && !d)
    return (
      <div className="section-empty">
        {err} <button className="btn-ghost" onClick={load}>Qayta urinish</button>
      </div>
    );
  if (!d) return <BrickLoader label="Yuklanmoqda" />;

  const cn = d.counts || {};
  const tk = d.tasks || {};
  const cell = (label, val, color) => (
    <div className="adm__tot" key={label}>
      <b style={color ? { color } : undefined}>{val || 0}</b>
      <span>{label}</span>
    </div>
  );

  return (
    <>
      <button className="adm__back" onClick={onBack}>
        <ChevronLeft size={15} /> Kompaniyalar
      </button>

      <div className="xhead">
        <div>
          <h2 className="xhead__title">{d.name}</h2>
          <div className="xhead__sub">
            {d.own ? "Sizning kompaniyangiz" : "Mijoz kompaniya"}
          </div>
        </div>
      </div>

      <div className="adm__plan">
        <div>
          <div className="adm__planstate"><TrialPill trial={d.trial} now={now} /></div>
          <div className="adm__planhint">
            {d.own
              ? "O'z kompaniyangiz — tarif cheklovi qo'llanmaydi."
              : "Faollashtirish to'langan davrni boshlaydi va yozuv cheklovini ochadi."}
          </div>
        </div>
        {!d.own && (
          <div className="adm__acts" style={{ marginTop: 0 }}>
            {arming && (
              <>
                <input
                  className="adm__days"
                  inputMode="numeric"
                  autoFocus
                  value={days}
                  onChange={(e) => setDays(e.target.value.replace(/[^0-9]/g, ""))}
                />
                <span style={{ fontSize: 12, opacity: 0.65 }}>kun</span>
              </>
            )}
            <button className="btn-primary" disabled={busy} onClick={activate}>
              {busy ? "..." : "Faollashtirish"}
            </button>
          </div>
        )}
      </div>

      {err && <div className="adm__err" style={{ marginBottom: 12 }}>{err}</div>}

      <div className="adm__sec">Jamoa</div>
      <div className="adm__grid">
        {cell("Rahbar", cn.executive)}
        {cell("Nazoratchi", cn.manager)}
        {cell("Ishchi", cn.field)}
        {cell("Jami", cn.total)}
        {(cn.pending || 0) > 0 && cell("Kutilmoqda", cn.pending, "#f4a52a")}
        {(cn.disabled || 0) > 0 && cell("Bloklangan", cn.disabled, "#8b95a1")}
      </div>

      <div className="adm__sec">Vazifalar</div>
      <div className="adm__grid">
        {cell("Faol", tk.active, "#4c8dff")}
        {cell("Muddati o'tgan", tk.overdue, "#e05252")}
        {cell("Bajarilgan", tk.done, "#2fb67c")}
      </div>

      <div className="adm__sec">Xarajat</div>
      <div className="adm__tot">
        <b>{fmtSom(d.spend_uzs || 0, false)}</b>
        <span>Jami xarajat (so'm)</span>
      </div>

      <div className="adm__sec">A'zolar</div>
      {!d.own ? (
        <div className="adm__priv">
          A'zolar ma'lumoti maxfiy. Boshqa kompaniyalar uchun faqat sonlar
          ko'rinadi — ismlar va shaxsiy ma'lumotlar yashirin.
        </div>
      ) : (
        <div className="card">
          {(d.members || []).map((m) => (
            <div
              key={m.id}
              className={"adm__m" + (m.status !== "active" ? " off" : "")}
              style={{ paddingLeft: 14 + (m.depth || 0) * 18 }}
            >
              {renaming === m.id ? (
                <div className="adm__rename">
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && rename(m.id)}
                  />
                  <button className="btn-ok" disabled={mbusy === m.id} onClick={() => rename(m.id)}>
                    <Check size={13} />
                  </button>
                  <button className="btn-ghost" onClick={() => setRenaming(null)}>Bekor</button>
                </div>
              ) : (
                <>
                  <div>
                    <div className="adm__mname">{m.name}</div>
                    <div className="adm__mrole">
                      {m.role}
                      {m.username ? ` · @${m.username}` : ""}
                      {m.status === "invited" ? " · kutilmoqda" : ""}
                      {m.status === "disabled" ? " · bloklangan" : ""}
                    </div>
                  </div>
                  <div className="adm__macts">
                    <button
                      className="pj__edit"
                      title="Tahrirlash"
                      onClick={() => { setRenaming(m.id); setDraft(m.name); }}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="pj__edit"
                      title={m.status === "disabled" ? "Blokdan chiqarish" : "Bloklash"}
                      disabled={mbusy === m.id}
                      onClick={() => toggle(m)}
                    >
                      {m.status === "disabled" ? <Play size={14} /> : <Ban size={14} />}
                    </button>
                    <button
                      className="pj__edit tm-del"
                      title="O'chirish"
                      disabled={mbusy === m.id}
                      onClick={() => remove(m)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          {!(d.members || []).length && (
            <div className="section-empty">A'zo yo'q.</div>
          )}
        </div>
      )}
    </>
  );
}

function Companies({ now, onCount }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(null);

  const load = useCallback(() => {
    setErr("");
    ownerOverview()
      .then((x) => { setD(x); if (onCount) onCount((x.companies || []).length); })
      .catch((e) => setErr(e.message || "Yuklab bo'lmadi."));
  }, [onCount]);

  useEffect(() => { load(); }, [load]);

  if (open)
    return <CompanyDetail orgId={open} now={now} onBack={() => { setOpen(null); load(); }} />;

  if (err)
    return (
      <div className="section-empty">
        {err} <button className="btn-ghost" onClick={load}>Qayta urinish</button>
      </div>
    );
  if (!d) return <BrickLoader label="Yuklanmoqda" />;

  const t = d.totals || {};
  const rows = d.companies || [];

  return (
    <>
      <div className="adm__totals">
        <div className="adm__tot"><b>{t.companies || 0}</b><span>Kompaniya</span></div>
        <div className="adm__tot"><b>{t.people || 0}</b><span>Odam</span></div>
        <div className="adm__tot"><b>{t.executives || 0}</b><span>Rahbar</span></div>
        <div className="adm__tot"><b>{t.managers || 0}</b><span>Nazoratchi</span></div>
        <div className="adm__tot"><b>{t.field || 0}</b><span>Ishchi</span></div>
        <div className="adm__tot"><b>{t.tasks_active || 0}</b><span>Faol vazifa</span></div>
      </div>

      <div className="card">
        <div className="adm__row adm__row--head">
          <div>Kompaniya</div>
          <div>Tarif</div>
          <div className="adm__num">Odam</div>
          <div className="adm__num">Faol vazifa</div>
        </div>
        {rows.map((o) => (
          <div key={o.org_id} className="adm__row" onClick={() => setOpen(o.org_id)}>
            <div>
              <div className="adm__cname">{o.name}</div>
              <div className="adm__cmeta">
                {o.executive} rahbar · {o.manager} nazoratchi · {o.field} ishchi
                {o.pending ? ` · ${o.pending} kutmoqda` : ""}
                {o.disabled ? ` · ${o.disabled} bloklangan` : ""}
              </div>
            </div>
            <div><TrialPill trial={o.trial} now={now} /></div>
            <div className="adm__num">{o.total}</div>
            <div className="adm__num">{o.tasks_active}</div>
          </div>
        ))}
        {!rows.length && (
          <div className="section-empty">Kompaniya yo'q. Hali kompaniya yaratilmagan.</div>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Narxlarni sozlash                                                    */
/* ------------------------------------------------------------------ */

function Pricing() {
  const [p, setP] = useState(null);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPricing().then(setP).catch((e) => setErr(e.message || "Yuklab bo'lmadi."));
  }, []);

  const edit = (i, key, val) => {
    setOk(false);
    setP((prev) => {
      const tiers = prev.tiers.map((t, k) => (k === i ? { ...t, [key]: val } : t));
      return { ...prev, tiers };
    });
  };

  const save = async () => {
    setErr(""); setOk(false); setBusy(true);
    try { await savePricing(p); setOk(true); }
    catch (e) { setErr(e.message || "Saqlab bo'lmadi."); }
    finally { setBusy(false); }
  };

  if (err && !p) return <div className="section-empty">{err}</div>;
  if (!p) return <BrickLoader label="Yuklanmoqda" />;

  return (
    <>
      <div className="adm__tiers">
        {(p.tiers || []).map((t, i) => (
          <div className="adm__tier" key={t.id || i}>
            <h4>{t.id}</h4>
            <label className="adm__f">
              <span>Nomi (UZ)</span>
              <input value={t.name_uz || ""} onChange={(e) => edit(i, "name_uz", e.target.value)} />
            </label>
            <label className="adm__f">
              <span>Nomi (RU)</span>
              <input value={t.name_ru || ""} onChange={(e) => edit(i, "name_ru", e.target.value)} />
            </label>
            <label className="adm__f">
              <span>Nomi (EN)</span>
              <input value={t.name_en || ""} onChange={(e) => edit(i, "name_en", e.target.value)} />
            </label>
            <label className="adm__f">
              <span>Necha kishi (bo'sh = cheksiz)</span>
              <input
                inputMode="numeric"
                value={t.max == null ? "" : t.max}
                onChange={(e) => edit(i, "max", e.target.value.replace(/[^0-9]/g, ""))}
              />
            </label>
            <label className="adm__f">
              <span>Narx (bo'sh = kelishilgan)</span>
              <input
                inputMode="numeric"
                value={t.price == null ? "" : t.price}
                onChange={(e) => edit(i, "price", e.target.value.replace(/[^0-9.]/g, ""))}
              />
            </label>
          </div>
        ))}
      </div>

      <div className="adm__tiers" style={{ marginTop: 14 }}>
        <div className="adm__tier">
          <h4>Umumiy</h4>
          <label className="adm__f">
            <span>Valyuta</span>
            <input
              value={p.currency || ""}
              onChange={(e) => { setOk(false); setP({ ...p, currency: e.target.value }); }}
            />
          </label>
          <label className="adm__f">
            <span>Davr</span>
            <input
              value={p.period || ""}
              onChange={(e) => { setOk(false); setP({ ...p, period: e.target.value }); }}
            />
          </label>
        </div>
      </div>

      <div className="adm__save">
        <button className="btn-primary" disabled={busy} onClick={save}>
          {busy ? "Saqlanmoqda…" : "Saqlash"}
        </button>
        {ok && <span className="adm__ok">Saqlandi — narxlar darhol kuchga kirdi.</span>}
        {err && <span className="adm__err">{err}</span>}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */

export default function Admin() {
  const [tab, setTab] = useState("requests");
  const [newCount, setNewCount] = useState(null);
  const [orgCount, setOrgCount] = useState(null);
  const now = useClock();

  // Counts are reported upward by whichever tab is mounted, so they appear once
  // that tab has been visited rather than costing two extra requests on load.
  const onNew = useCallback((n) => setNewCount(n), []);
  const onOrgs = useCallback((n) => setOrgCount(n), []);

  const TABS = [
    ["requests", "Kirish so'rovlari", Inbox, newCount, true],
    ["pricing", "Narxlarni sozlash", Tag, null, false],
    ["companies", "Kompaniyalar", Building2, orgCount, false],
  ];

  return (
    <>
      <div className="adm__tabs">
        {TABS.map(([key, label, Icon, count, hot]) => (
          <button
            key={key}
            className={"adm__tab" + (tab === key ? " on" : "")}
            onClick={() => setTab(key)}
          >
            <Icon size={15} /> {label}
            {count > 0 && <span className={"n" + (hot ? " hot" : "")}>{count}</span>}
          </button>
        ))}
      </div>

      {tab === "requests" && <Requests onCount={onNew} />}
      {tab === "pricing" && <Pricing />}
      {tab === "companies" && <Companies now={now} onCount={onOrgs} />}
    </>
  );
}
