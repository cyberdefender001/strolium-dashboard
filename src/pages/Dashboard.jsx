import { useEffect, useState, useCallback, useRef } from "react";
import { Calendar, Scale, FileText, Calculator, FolderKanban, Users } from "lucide-react";
import { getDashboard, listDocs, listEstimates, getPulse, AuthExpired } from "../api/client";
import { fmtSom } from "../lib/format";
import Sidebar from "../components/Sidebar.jsx";
import { KpiStrip } from "../components/KpiStrip.jsx";
import FlagFeed from "../components/FlagFeed.jsx";
import FlagDetail from "../components/FlagDetail.jsx";
import DocUpload from "../components/DocUpload.jsx";
import EstimateUpload from "../components/EstimateUpload.jsx";
import BrickLoader from "../components/BrickLoader.jsx";
import Expenses from "./Expenses.jsx";
import Tasks from "./Tasks.jsx";

const TITLES = {
  alerts: "Belgilar",
  money: "Pul nazorati",
  company: "Kompaniya",
};

export default function Dashboard({ user, onLogout }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [nav, setNav] = useState("alerts");
  const [selected, setSelected] = useState(null);

  // The API no longer invents demo data when a call fails, so a failure has to be
  // shown honestly. An expired session logs the user out rather than leaving them
  // staring at a loader.
  const load = useCallback(() => {
    setErr("");
    getDashboard()
      .then(setData)
      .catch((e) => {
        if (e instanceof AuthExpired) {
          onLogout();
          return;
        }
        setErr(e.message || "Ma'lumotni yuklab bo'lmadi.");
      });
  }, [onLogout]);

  useEffect(() => {
    load();
  }, [load]);

  // Live sync. Poll the org fingerprint every 30s and refetch the moment anything
  // changes anywhere -- Mini App or web. Also refetch on focus, which is when
  // staleness actually bites: you look away, come back, and the numbers are old.
  // If a form is open we do NOT reload underneath the user; we show a pill and let
  // them choose. Destroying half-entered work is worse than showing it a bit late.
  const [stale, setStale] = useState(false);
  const [tick, setTick] = useState(0);          // bumped whenever the org changes
  const refresh = useCallback(() => { load(); setTick((n) => n + 1); }, [load]);
  const pulseRef = useRef(null);
  const busyRef = useRef(false);
  const navRef = useRef(nav);
  useEffect(() => {
    navRef.current = nav;
  }, [nav]);

  useEffect(() => {
    let alive = true;

    const formOpen = () => {
      const a = document.activeElement;
      if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return true;
      return busyRef.current;
    };

    // Which data does the screen he is LOOKING AT actually show? A change to
    // anything else is absorbed silently -- when he navigates there it loads fresh
    // anyway. Telling a boss "new data!" while he is approving a task, about an
    // expense he cannot even see, is how people learn to ignore the pill.
    const VIEW_PARTS = {
      alerts: null,                              // Belgilar: shows everything
      money: ["expenses", "projects", "docs", "estimates"],
      tasks: ["tasks"],
      expenses: ["expenses", "projects"],
      company: ["projects", "members"],
    };

    const check = async () => {
      try {
        const parts = await getPulse();
        if (!alive || !parts) return;
        const prev = pulseRef.current;
        pulseRef.current = parts;
        if (!prev) return;                       // first read = baseline

        const changed = Object.keys(parts).filter((k) => prev[k] !== parts[k]);
        if (!changed.length) return;

        const want = VIEW_PARTS[navRef.current];
        const relevant =
          want === null || changed.some((k) => want.includes(k));
        if (!relevant) return;                   // quietly absorbed

        if (formOpen()) setStale(true);
        else { setStale(false); refresh(); }
      } catch { /* offline or expired; the next load() surfaces it */ }
    };

    const id = setInterval(() => {
      if (document.visibilityState === "visible") check();
    }, 30000);
    const onFocus = () => { if (document.visibilityState === "visible") check(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    check();

    return () => {
      alive = false;
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [load]);

  if (err) {
    return (
      <div className="shell">
        <div style={{ margin: "auto", textAlign: "center", padding: 40 }}>
          <h2 style={{ marginBottom: 8 }}>Ma'lumotni yuklab bo'lmadi</h2>
          <p className="hint" style={{ marginBottom: 18 }}>{err}</p>
          <button className="btn-primary" onClick={load}>Qayta urinish</button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="shell">
        <BrickLoader label="Yuklanmoqda" />
      </div>
    );
  }

  return (
    <div className="shell">
      {stale && (
        <button
          onClick={() => { setStale(false); refresh(); }}
          style={{
            position: "fixed", left: "50%", transform: "translateX(-50%)", top: 12,
            zIndex: 2000, background: "#4C8DFF", color: "#fff", border: "none",
            borderRadius: 999, padding: "9px 16px", fontSize: 12.5, fontWeight: 600,
            cursor: "pointer", boxShadow: "0 6px 20px rgba(0,0,0,.5)",
          }}
        >
          Yangi ma'lumot — ko'rish
        </button>
      )}
      <Sidebar
        active={nav}
        onNav={setNav}
        user={user}
        openFlags={data.audit.flags.length}
        onLogout={onLogout}
      />

      <main className="main">
        <div className="topbar">
          <div>
            <h1>{TITLES[nav]}</h1>
            <div className="sub">{data.org.name}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="period">
              <Calendar size={15} /> {data.org.period}
            </div>
          </div>
        </div>

        <div className="content">
          {nav === "alerts" && (
            <>
              <KpiStrip kpis={data.kpis} />
              <div className="row2">
                <FlagFeed
                  flags={data.audit.flags}
                  leakage={data.audit.overview.leakageFlagged}
                  onOpen={setSelected}
                />
              </div>
              <div className="proof-note">
                Belgilar to'lov, yetkazib berish va smeta ma'lumotlaridan avtomatik aniqlangan
              </div>
            </>
          )}

          {nav === "money" && <MoneyControl data={data} onChange={load} />}
          {nav === "tasks" && <Tasks tick={tick} onChange={refresh} />}
          {nav === "expenses" && (
            <Expenses flags={data.audit.flags} tick={tick} onChange={refresh} />
          )}
          {nav === "company" && <Company data={data} />}
        </div>
      </main>

      {selected && <FlagDetail flag={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function Reconciliation({ rows }) {
  const STATUS = { ok: ["ok", "Mos"], warn: ["warn", "E'tibor"], bad: ["bad", "Nomuvofiq"] };
  return (
    <div className="card">
      <div className="card__head">
        <div className="card__title">
          <Scale size={16} /> Yetkazildi vs to'landi
        </div>
      </div>
      {(!rows || rows.length === 0) ? (
        <div className="section-empty" style={{ border: "none", margin: 0 }}>
          Solishtirish uchun ma'lumot yo'q. Hujjatlar bo'limidan yetkazib berish hujjati yuklang.
        </div>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>Ta'minotchi</th>
              <th className="num">Yetkazildi</th>
              <th className="num">To'landi</th>
              <th className="num">Farq</th>
              <th>Holat</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const [cls, label] = STATUS[r.status] || STATUS.ok;
              return (
                <tr key={i}>
                  <td>{r.vendor}</td>
                  <td className="num">{fmtSom(r.delivered, false)}</td>
                  <td className="num">{fmtSom(r.paid, false)}</td>
                  <td className={"num " + (r.gap > 0 ? "gap-bad" : "gap-ok")}>
                    {r.gap > 0 ? "+" + fmtSom(r.gap, false) : "✓"}
                  </td>
                  <td><span className={"pill " + cls}>{label}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function SectionIntro({ title, desc }) {
  return (
    <div className="sec-intro">
      <h2>{title}</h2>
      <p>{desc}</p>
    </div>
  );
}

function MoneyControl({ data, onChange }) {
  return (
    <>
      <SectionIntro title="Reja — smeta" desc="Loyiha qancha turishi kerak. AI chizma/spetsifikatsiyadan smeta tuzadi va haqiqiy xarajat bilan solishtiradi." />
      <Estimates projects={data.projects} budget={data.audit.budget} live={data.live} onChange={onChange} />

      <SectionIntro title="Yetkazib berish" desc="Qaysi material keldi. Yetkazib berish varaqasini yuklang — AI o'qiydi va saqlaydi." />
      <Documents live={data.live} onChange={onChange} />

      <SectionIntro title="Solishtirish — to'langan vs yetkazilgan" desc="Har bir ta'minotchiga to'langan summa yetkazilganga mos keladimi." />
      <Reconciliation rows={data.audit.reconciliation} />
    </>
  );
}

function Company({ data }) {
  return (
    <>
      <Projects rows={data.projects} />
      <div style={{ height: 16 }} />
      <Workers rows={data.workers} />
    </>
  );
}

function Estimates({ projects, budget, live, onChange }) {
  const [estimates, setEstimates] = useState(null);

  const reload = useCallback(() => {
    listEstimates().then(setEstimates).catch(() => setEstimates([]));
  }, []);
  useEffect(() => { reload(); }, [reload]);

  function afterSave() {
    reload();
    onChange && onChange();
  }

  const pname = {};
  (projects || []).forEach((p) => { if (p.id) pname[p.id] = p.name; });
  const STATUS = { ok: ["ok", "Reja ichida"], warn: ["warn", "Chegarada"], bad: ["bad", "Oshib ketdi"] };

  return (
    <>
      <EstimateUpload projects={projects} onSaved={afterSave} />

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card__head">
          <div className="card__title">
            <Scale size={16} /> Smeta vs haqiqiy xarajat
          </div>
        </div>
        {(!budget || budget.length === 0) ? (
          <div className="section-empty" style={{ border: "none", margin: 0 }}>
            Obyektga bog'langan smeta yo'q. Smeta yuklab, obyekt tanlang — byudjet nazorati avtomatik ishlaydi.
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Obyekt</th>
                <th className="num">Smeta</th>
                <th className="num">Sarflandi</th>
                <th className="num">%</th>
                <th>Holat</th>
              </tr>
            </thead>
            <tbody>
              {budget.map((b, i) => {
                const [cls, label] = STATUS[b.status] || STATUS.ok;
                return (
                  <tr key={i}>
                    <td>{b.project}</td>
                    <td className="num">{fmtSom(b.budget, false)}</td>
                    <td className="num">{fmtSom(b.spent, false)}</td>
                    <td className={"num " + (b.pct >= 100 ? "gap-bad" : "")}>{b.pct}%</td>
                    <td><span className={"pill " + cls}>{label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div className="card__head">
          <div className="card__title">
            <Calculator size={16} /> Saqlangan smetalar
            {estimates && <span className="count">{estimates.length} ta</span>}
          </div>
        </div>
        {estimates === null ? (
          <BrickLoader label="Yuklanmoqda" />
        ) : estimates.length === 0 ? (
          <div className="section-empty" style={{ border: "none", margin: 0 }}>
            Hali smeta yo'q. Yuqoridan chizma yoki spetsifikatsiya yuklang.
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr><th>Nomi</th><th>Obyekt</th><th className="num">Jami</th></tr>
            </thead>
            <tbody>
              {estimates.map((e) => (
                <tr key={e.id}>
                  <td>{e.title || "Smeta"}</td>
                  <td style={{ color: "var(--dim)" }}>{pname[e.project_id] || "—"}</td>
                  <td className="num">{fmtSom(e.total || 0, false)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function Documents({ live, onChange }) {
  const [docs, setDocs] = useState(null);

  const reload = useCallback(() => {
    listDocs().then(setDocs).catch(() => setDocs([]));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  function afterSave() {
    reload();
    onChange && onChange(); // refresh reconciliation/flags too
  }

  return (
    <>
      <DocUpload onSaved={afterSave} />

      <div className="card">
        <div className="card__head">
          <div className="card__title">
            <FileText size={16} /> Yuklangan hujjatlar
            {docs && <span className="count">{docs.length} ta</span>}
          </div>
        </div>
        {docs === null ? (
          <BrickLoader label="Yuklanmoqda" />
        ) : docs.length === 0 ? (
          <div className="section-empty" style={{ border: "none", margin: 0 }}>
            Hali hujjat yo'q. Yuqoridan yetkazib berish varaqasi yoki hisob-faktura yuklang.
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Ta'minotchi</th>
                <th>Raqam</th>
                <th>Sana</th>
                <th className="num">Jami</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id}>
                  <td>{d.vendor || "—"}</td>
                  <td style={{ color: "var(--dim)" }}>{d.doc_number || "—"}</td>
                  <td style={{ color: "var(--dim)" }}>{d.doc_date || "—"}</td>
                  <td className="num">{fmtSom(d.doc_total || 0, false)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function Projects({ rows }) {
  if (!rows.length) return <div className="section-empty">Hali obyekt qo'shilmagan.</div>;
  return (
    <div className="card">
      <div className="card__head">
        <div className="card__title">
          <FolderKanban size={16} /> Obyektlar <span className="count">{rows.length} ta</span>
        </div>
      </div>
      <table className="tbl">
        <thead>
          <tr><th>Nomi</th><th>Manzil</th><th>Holat</th><th className="num">Sarflandi</th></tr>
        </thead>
        <tbody>
          {rows.map((p, i) => (
            <tr key={i}>
              <td>{p.name}</td>
              <td style={{ color: "var(--dim)" }}>{p.address}</td>
              <td style={{ color: "var(--dim)" }}>{p.status}</td>
              <td className="num">{fmtSom(p.spent, false)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Workers({ rows }) {
  if (!rows.length) return <div className="section-empty">Hali ishchi qo'shilmagan.</div>;
  return (
    <div className="card">
      <div className="card__head">
        <div className="card__title">
          <Users size={16} /> Ishchilar <span className="count">{rows.length} ta</span>
        </div>
      </div>
      <table className="tbl">
        <thead>
          <tr><th>Ism</th><th>Rol</th><th>Holat</th></tr>
        </thead>
        <tbody>
          {rows.map((w, i) => (
            <tr key={i}>
              <td>{w.name}</td>
              <td style={{ color: "var(--dim)" }}>{w.role}</td>
              <td>
                <span className={"pill " + (w.status === "active" ? "ok" : "warn")}>
                  {w.status === "active" ? "Faol" : w.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
