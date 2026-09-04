import { useEffect, useState } from "react";
import { FileSpreadsheet, Upload, Trash2, Play, AlertTriangle, Lock } from "lucide-react";
import {
  listSmetas, uploadSmeta, deleteSmeta, checkSmeta, setSmetaProgress,
  listProjects,
} from "../api/client";
import { fmtSom } from "../lib/format";
import BrickLoader from "./BrickLoader.jsx";

// Smeta nazorati.
//
// The claim this screen makes is strong -- "your approved project allows 124
// tonnes and 168 were bought" -- so its rendering rules are conservative:
//   * a material the smeta does not contain is a QUESTION ("smetada ko'zda
//     tutilmagan"), never a percentage;
//   * unmatched and unconverted expenses are ALWAYS shown -- a report built
//     from half the receipts could clear a real theft;
//   * the check refuses to run until the boss sets the project's build
//     progress, and the refusal explains why.

const MAT_UZ = {
  cement: "Sement", concrete: "Beton", mortar: "Qorishma", rebar: "Armatura",
  brick: "G'isht", gravel: "Shag'al", sand: "Qum", lime: "Ohak", gypsum: "Gips",
  paint: "Bo'yoq", bitumen: "Bitum", timber: "Yog'och", insul: "Izolyatsiya",
  tile: "Plitka", glass: "Oyna", pipe: "Quvur", cable: "Kabel",
};
const UNIT_UZ = { T: "t", M3: "m³", M2: "m²", KG: "kg", M: "m", "1000SHT": "ming dona" };

const matName = (k) => MAT_UZ[k] || k;
const unitName = (u) => UNIT_UZ[u] || u;
const num = (v) =>
  v == null ? "—" : Number(v).toLocaleString("ru-RU", { maximumFractionDigits: 2 });

function readAsB64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1] || "");
    r.onerror = () => rej(new Error("Faylni o'qib bo'lmadi"));
    r.readAsDataURL(file);
  });
}

export default function SmetaControl({ onNav }) {
  const [smetas, setSmetas] = useState(null);
  const [projects, setProjects] = useState([]);
  const [err, setErr] = useState("");
  const [locked, setLocked] = useState(false);

  // upload form
  const [projId, setProjId] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState(null);

  // check
  const [checking, setChecking] = useState("");
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState(null);
  const [checkErr, setCheckErr] = useState("");
  const [progDraft, setProgDraft] = useState("");

  async function load() {
    setErr("");
    try {
      const [s, p] = await Promise.all([listSmetas(), listProjects()]);
      setSmetas(s.smetas || []);
      setProjects(p || []);
      if (!projId && p && p.length) setProjId(p[0].id);
    } catch (e) {
      if (e.status === 403) { setLocked(true); setSmetas([]); return; }
      setErr(e.message || "Xatolik");
      setSmetas([]);
    }
  }
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function onUpload() {
    if (!file || !projId) return;
    const name = (file.name || "").toLowerCase();
    if (name.endsWith(".pdf")) {
      setErr("Skanerlangan PDF qabul qilinmaydi — smetachidan Excel (.xlsx) faylini so'rang.");
      return;
    }
    if (name.endsWith(".xls") && !name.endsWith(".xlsx")) {
      setErr("Bu eski format (.xls). Excel'da oching va \u00abSave As \u2192 Excel Workbook (.xlsx)\u00bb qilib qayta saqlang. Fayl nomini o'zgartirish yordam bermaydi.");
      return;
    }
    const existing = (smetas || []).filter((x) => x.project_id === projId);
    if (existing.length) {
      const ok = window.confirm(
        "Bu loyihada smeta allaqachon bor. Yangi fayl ESKISINING O'RNINI OLADI " +
        "(tekshiruv tarixi bilan birga). Davom etilsinmi?"
      );
      if (!ok) return;
    }
    setBusy(true); setErr(""); setReceipt(null);
    try {
      const b64 = await readAsB64(file);
      const r = await uploadSmeta({ project_id: projId, file_name: file.name, file_b64: b64 });
      setReceipt(r);
      setFile(null);
      await load();
    } catch (e) {
      if (e.status === 403) { setLocked(true); return; }
      setErr(e.message || "Yuklashda xatolik");
    } finally {
      setBusy(false);
    }
  }

  async function onCheck(s) {
    setChecking(s.id); setReport(null); setCheckErr(""); setRunning(true);
    setProgDraft(s.build_progress != null ? String(s.build_progress) : "");
    try {
      const r = await checkSmeta(s.id);
      setReport(r);
      setProgDraft(String(r.project.progress));
      // the check is persisted server-side; refresh so the row's
      // "tekshiruv dd.mm" line reflects it immediately
      await load();
    } catch (e) {
      setCheckErr(e.message || "Tekshirishda xatolik");
    } finally {
      setRunning(false);
    }
  }

  async function onSaveProgress(projectId) {
    const v = Number(progDraft);
    if (!(v >= 0 && v <= 100)) { setCheckErr("Foiz 0 dan 100 gacha bo'lishi kerak."); return; }
    setCheckErr("");
    try {
      await setSmetaProgress(projectId, v);
      await load();
      if (checking) {
        const r = await checkSmeta(checking);
        setReport(r);
      }
    } catch (e) {
      setCheckErr(e.message || "Saqlashda xatolik");
    }
  }

  async function onDelete(s) {
    if (!window.confirm(`\u00ab${s.file_name}\u00bb smetasi o'chirilsinmi? Tekshiruv tarixi ham o'chadi.`)) return;
    try {
      await deleteSmeta(s.id);
      if (checking === s.id) { setChecking(""); setReport(null); }
      await load();
    } catch (e) {
      setErr(e.message || "O'chirishda xatolik");
    }
  }

  if (smetas === null) return <BrickLoader />;

  if (locked) {
    return (
      <div className="card" style={{ padding: "48px 24px", textAlign: "center", maxWidth: 560, margin: "40px auto" }}>
        <Lock size={28} style={{ opacity: 0.6 }} />
        <h3 style={{ margin: "14px 0 8px" }}>Smeta nazorati — pullik tariflarda</h3>
        <div className="faint" style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 18 }}>
          Davlat ekspertizasidan o'tgan smeta bilan haqiqiy xaridlar avtomatik
          solishtiriladi: qaysi material me'yordan ortiq olinganini raqam bilan
          ko'rasiz. Tarifni yangilab, darhol ishlating.
        </div>
        {onNav && (
          <button className="btn-ghost" onClick={() => onNav("billing")}>
            Tarifni yangilash
          </button>
        )}
      </div>
    );
  }

  const flags = report ? report.rows.filter((r) => r.level === "flag") : [];
  const watch = report ? report.rows.filter((r) => r.level === "watch") : [];
  const rest = report ? report.rows.filter((r) => r.level !== "flag" && r.level !== "watch") : [];

  return (
    <div>
      <div className="xhead" style={{ marginBottom: 12 }}>
        <div>
          <h2 className="xhead__title">Smeta nazorati</h2>
          <div className="faint" style={{ fontSize: 13, marginTop: 4 }}>
            Davlat ekspertizasidan o'tgan smeta bilan haqiqiy xaridlar solishtiriladi.
            Kutilgan raqam smetaning o'zidan olinadi — bahslashib bo'lmaydi.
          </div>
        </div>
      </div>

      {err && <Alert onClose={() => setErr("")}>{err}</Alert>}

      {/* upload */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>
          <FileSpreadsheet size={16} style={{ verticalAlign: "-3px", marginRight: 6 }} />
          Smeta yuklash (faqat .xlsx — ABC4 dan eksport)
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <select value={projId} onChange={(e) => setProjId(e.target.value)}
                  style={{ padding: "8px 10px" }}>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <input type="file" accept=".xlsx"
                 onChange={(e) => setFile(e.target.files && e.target.files[0])} />
          <button className="btn-ghost" disabled={!file || !projId || busy} onClick={onUpload}>
            <Upload size={14} style={{ verticalAlign: "-2px", marginRight: 5 }} />
            {busy ? "Yuklanmoqda…" : "Yuklash"}
          </button>
        </div>
        {receipt && (
          <div className="faint" style={{ marginTop: 10, fontSize: 13 }}>
            Qabul qilindi: {receipt.works.toLocaleString("ru-RU")} ta ish,{" "}
            {receipt.resources.toLocaleString("ru-RU")} ta resurs,{" "}
            {receipt.skipped_rows} ta o'qilmagan qator,{" "}
            {Object.keys(receipt.materials || {}).length} xil material.
            {receipt.replaced > 0 && <> Eski smeta almashtirildi.</>}
          </div>
        )}
      </div>

      {/* list */}
      {!smetas.length ? (
        <div className="section-empty">
          Hali smeta yuklanmagan. Smetachidan ABC4 dagi <b>.xlsx</b> faylni so'rang —
          skanerlangan PDF dan qatorlarning yarmi yo'qoladi.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, marginBottom: 16 }}>
          {smetas.map((s) => (
            <div key={s.id}
                 style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap",
                          padding: "12px 16px", borderBottom: "1px solid var(--line, #eee)" }}>
              <div style={{ flex: "1 1 240px", minWidth: 200 }}>
                <div style={{ fontWeight: 600 }}>{s.file_name}</div>
                <div className="faint" style={{ fontSize: 12 }}>
                  {s.project_name || "Loyihasiz"} · {s.works_count} ish · {s.resources_count} resurs
                  {s.build_progress != null && <> · qurilish {num(s.build_progress)}%</>}
                  {s.last_check_at
                    ? <> · tekshiruv {s.last_check_at.slice(8, 10)}.{s.last_check_at.slice(5, 7)}</>
                    : <> · hali tekshirilmagan</>}
                </div>
              </div>
              <button className="btn-ghost" disabled={running}
                      onClick={() => onCheck(s)}>
                <Play size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />
                {running && checking === s.id ? "Tekshirilmoqda\u2026" : "Tekshirish"}
              </button>
              <button className="btn-ghost" onClick={() => onDelete(s)} title="O'chirish">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* check result */}
      {checking && (
        <div className="card" style={{ padding: 16 }}>
          {running && !report && !checkErr && (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <BrickLoader />
              <div className="faint" style={{ fontSize: 13, marginTop: 8 }}>
                1611 ta ish va barcha xarajatlar solishtirilmoqda\u2026
              </div>
            </div>
          )}
          {checkErr && (
            <Alert tone="warn">
              {checkErr}
              {/(foiz|jarayon)/i.test(checkErr) && report === null && (
                <ProgressEditor
                  smetas={smetas} checking={checking}
                  progDraft={progDraft} setProgDraft={setProgDraft}
                  onSave={onSaveProgress}
                />
              )}
            </Alert>
          )}

          {report && (
            <>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
                <div style={{ fontWeight: 600 }}>{report.project.name}</div>
                <span className="pill ok">qurilish {num(report.project.progress)}%</span>
                <span className="faint" style={{ fontSize: 12 }}>
                  {report.expenses_checked} ta xarajat tekshirildi
                </span>
                <span style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
                  <input value={progDraft} onChange={(e) => setProgDraft(e.target.value)}
                         inputMode="numeric" style={{ width: 56, padding: "6px 8px" }} />
                  <span className="faint">%</span>
                  <button className="btn-ghost" onClick={() => onSaveProgress(report.project.id)}>
                    Foizni saqlash
                  </button>
                </span>
              </div>

              {flags.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  {flags.map((r) => (
                    <div key={r.material}
                         style={{ padding: "10px 12px", marginBottom: 8, borderRadius: 8,
                                  background: "rgba(192,57,43,.07)", border: "1px solid rgba(192,57,43,.35)" }}>
                      <div style={{ fontWeight: 600 }}>
                        <AlertTriangle size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />
                        {matName(r.material)}
                        {r.expected > 0
                          ? <> — {num(r.bought)} {unitName(r.unit)} olingan, kutilgani {num(r.expected)} {unitName(r.unit)} (+{num(r.over_pct)}%)</>
                          : <> — smetada ko'zda tutilmagan: {num(r.bought)} {unitName(r.unit)} olingan</>}
                      </div>
                      <div className="faint" style={{ fontSize: 12, marginTop: 4 }}>
                        {r.expected > 0
                          ? "Smeta miqdoridan sezilarli ko'p. Bu ayb emas — savol: qoldiq qayerda?"
                          : "Smeta bu materialni talab qilmaydi (masalan, tayyor qorishma ko'zda tutilgan bo'lsa, sement alohida olinmasligi kerak). Sababini so'rang."}
                      </div>
                      {r.evidence.map((e) => (
                        <div key={e.id} className="faint" style={{ fontSize: 12, marginTop: 2 }}>
                          · {e.text} {e.amount != null && <>— {fmtSom(e.amount)}</>}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {watch.length > 0 && (
                <div className="faint" style={{ fontSize: 13, marginBottom: 10 }}>
                  Kuzatuvda: {watch.map((r) =>
                    `${matName(r.material)} +${num(r.over_pct)}%`).join(", ")} —
                  chiqit va sinish hisobiga sig'ishi mumkin.
                </div>
              )}

              <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                <thead>
                  <tr className="faint" style={{ textAlign: "right" }}>
                    <th style={{ textAlign: "left", padding: "6px 4px" }}>Material</th>
                    <th style={{ padding: "6px 4px" }}>Smeta</th>
                    <th style={{ padding: "6px 4px" }}>Kutilgan ({num(report.project.progress)}%)</th>
                    <th style={{ padding: "6px 4px" }}>Olingan</th>
                    <th style={{ padding: "6px 4px" }}>Holat</th>
                  </tr>
                </thead>
                <tbody>
                  {[...flags, ...watch, ...rest].map((r) => (
                    <tr key={r.material} style={{ borderTop: "1px solid var(--line, #eee)", textAlign: "right" }}>
                      <td style={{ textAlign: "left", padding: "6px 4px" }}>
                        {matName(r.material)} <span className="faint">({unitName(r.unit)})</span>
                      </td>
                      <td style={{ padding: "6px 4px" }}>{num(r.planned)}</td>
                      <td style={{ padding: "6px 4px" }}>{num(r.expected)}</td>
                      <td style={{ padding: "6px 4px" }}>{num(r.bought)}</td>
                      <td style={{ padding: "6px 4px" }}>
                        {r.level === "flag" ? <span className="pill warn">tekshiring</span>
                          : r.level === "watch" ? <span className="pill">kuzatuvda</span>
                          : r.level === "under" ? <span className="faint">hali olinmagan</span>
                          : <span className="pill ok">me'yorda</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {(report.unmatched.length > 0 || report.unconverted.length > 0) && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
                    Hisobga olinmagan xarajatlar
                  </div>
                  <div className="faint" style={{ fontSize: 12, marginBottom: 6 }}>
                    Bular yashirilmaydi: yarim cheklar asosida qurilgan hisobot haqiqiy
                    yo'qotishni ham oqlab yuborishi mumkin.
                  </div>
                  {report.unmatched.map((u) => (
                    <div key={u.id} className="faint" style={{ fontSize: 12 }}>
                      · {u.text} {u.amount != null && <>— {fmtSom(u.amount)}</>} <i>({u.reason})</i>
                    </div>
                  ))}
                  {report.unconverted.map((u) => (
                    <div key={u.id} className="faint" style={{ fontSize: 12 }}>
                      · {u.text} {u.amount != null && <>— {fmtSom(u.amount)}</>}{" "}
                      <i>({matName(u.material)}: {u.reason})</i>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ProgressEditor({ smetas, checking, progDraft, setProgDraft, onSave }) {
  const s = smetas.find((x) => x.id === checking);
  if (!s || !s.project_id) return null;
  return (
    <div style={{ marginTop: 10, display: "flex", gap: 6, alignItems: "center", justifyContent: "center" }}>
      <input value={progDraft} onChange={(e) => setProgDraft(e.target.value)}
             inputMode="numeric" placeholder="0–100" style={{ width: 70, padding: "6px 8px" }} />
      <span className="faint">%</span>
      <button className="btn-ghost" onClick={() => onSave(s.project_id)}>Saqlash va tekshirish</button>
    </div>
  );
}


function Alert({ children, tone = "bad", onClose }) {
  const c = tone === "bad"
    ? { bg: "rgba(192,57,43,.08)", bd: "rgba(192,57,43,.45)", fg: "#7c2418" }
    : { bg: "rgba(180,120,0,.08)", bd: "rgba(180,120,0,.45)", fg: "#6b4b00" };
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start",
                  padding: "12px 14px", marginBottom: 12, borderRadius: 10,
                  background: c.bg, border: `1px solid ${c.bd}`, color: c.fg,
                  fontSize: 14, lineHeight: 1.45 }}>
      <AlertTriangle size={17} style={{ flex: "0 0 auto", marginTop: 2 }} />
      <div style={{ flex: 1 }}>{children}</div>
      {onClose && (
        <button onClick={onClose} aria-label="Yopish"
                style={{ background: "none", border: "none", color: "inherit",
                         cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 2 }}>
          ×
        </button>
      )}
    </div>
  );
}
