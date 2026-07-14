import { useState } from "react";
import { Upload, Calculator, Loader2, Check, X } from "lucide-react";
import { extractEstimate, saveEstimate } from "../api/client";

function downscale(file, maxDim = 1600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("rasmni o'qib bo'lmadi")); };
    img.src = url;
  });
}

export default function EstimateUpload({ projects, onSaved }) {
  const [stage, setStage] = useState("idle"); // idle | reading | review | saving
  const [err, setErr] = useState("");
  const [est, setEst] = useState(null);
  const [projectId, setProjectId] = useState("");
  const [saved, setSaved] = useState(false);

  async function onFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setErr(""); setSaved(false); setStage("reading");
    try {
      const b64 = await downscale(file);
      const res = await extractEstimate(b64);
      setEst({
        title: res.title || "Smeta",
        items: (res.items || []).map((it) => ({
          material: it.material || "",
          quantity: it.quantity || 0,
          unit: it.unit || "",
          unit_price: it.unit_price || 0,
          total: it.total || 0,
        })),
      });
      setStage("review");
    } catch (e2) {
      setErr(e2.message || "Xatolik");
      setStage("idle");
    }
  }

  function setItem(i, key, val) {
    setEst((d) => {
      const items = d.items.slice();
      items[i] = { ...items[i], [key]: key === "material" || key === "unit" ? val : Number(val) || 0 };
      if (key === "quantity" || key === "unit_price") {
        items[i].total = (items[i].quantity || 0) * (items[i].unit_price || 0);
      }
      return { ...d, items };
    });
  }

  const total = est ? est.items.reduce((s, it) => s + (it.total || 0), 0) : 0;

  async function save() {
    setStage("saving"); setErr("");
    try {
      await saveEstimate({
        title: est.title,
        project_id: projectId || null,
        items: est.items,
      });
      setEst(null); setProjectId(""); setStage("idle"); setSaved(true);
      onSaved && onSaved();
    } catch (e2) {
      setErr(e2.message || "Saqlashda xatolik");
      setStage("review");
    }
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card__head">
        <div className="card__title">
          <Calculator size={16} /> AI smeta — chizma yoki spetsifikatsiya yuklang
        </div>
      </div>

      <div style={{ padding: 18 }}>
        {stage === "idle" && (
          <>
            {saved && <div className="upload-ok"><Check size={15} /> Smeta saqlandi — quyida ko'rinadi</div>}
            <label className="upload-zone">
              <input type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
              <Upload size={22} />
              <span>Chizma / spetsifikatsiya rasmini tanlang</span>
              <small>AI taxminiy material va xarajat smetasini tuzadi</small>
            </label>
            {err && <p className="upload-err">{err}</p>}
          </>
        )}

        {stage === "reading" && (
          <div className="upload-busy"><Loader2 size={20} className="spin" /> AI smeta tuzmoqda…</div>
        )}

        {(stage === "review" || stage === "saving") && est && (
          <div>
            <div className="doc-meta">
              <label>
                Nomi
                <input value={est.title} onChange={(e) => setEst({ ...est, title: e.target.value })} />
              </label>
              <label style={{ gridColumn: "span 2" }}>
                Obyekt (byudjet taqqoslash uchun)
                <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
                  style={{ height: 38, padding: "0 11px", background: "var(--ink)", color: "var(--text)", border: "1px solid var(--line)", borderRadius: 8, fontFamily: "inherit", fontSize: 14 }}>
                  <option value="">— Obyekt tanlang —</option>
                  {(projects || []).filter((p) => p.id).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </label>
            </div>

            <table className="tbl doc-items">
              <thead>
                <tr>
                  <th>Material</th><th className="num">Miqdor</th><th>Birlik</th>
                  <th className="num">Narx</th><th className="num">Jami</th>
                </tr>
              </thead>
              <tbody>
                {est.items.map((it, i) => (
                  <tr key={i}>
                    <td><input value={it.material} onChange={(e) => setItem(i, "material", e.target.value)} /></td>
                    <td className="num"><input className="num-in" value={it.quantity} onChange={(e) => setItem(i, "quantity", e.target.value)} /></td>
                    <td><input className="unit-in" value={it.unit} onChange={(e) => setItem(i, "unit", e.target.value)} /></td>
                    <td className="num"><input className="num-in" value={it.unit_price} onChange={(e) => setItem(i, "unit_price", e.target.value)} /></td>
                    <td className="num mono">{Math.round(it.total).toLocaleString()}</td>
                  </tr>
                ))}
                {est.items.length === 0 && (
                  <tr><td colSpan={5} style={{ color: "var(--faint)" }}>AI smeta tuza olmadi. Qo'lda kiriting yoki boshqa rasm yuklang.</td></tr>
                )}
              </tbody>
            </table>

            <div className="doc-total">Smeta jami: <b className="mono">{Math.round(total).toLocaleString()} so'm</b></div>
            <p className="upload-err" style={{ color: "var(--faint)" }}>Eslatma: bu AI taxminiy smeta — tekshiring va tahrirlang.</p>
            {err && <p className="upload-err">{err}</p>}

            <div className="doc-actions">
              <button className="btn-ghost" onClick={() => { setEst(null); setStage("idle"); setErr(""); }} disabled={stage === "saving"}>
                <X size={15} /> Bekor qilish
              </button>
              <button className="btn-solid" onClick={save} disabled={stage === "saving"}>
                {stage === "saving" ? <Loader2 size={15} className="spin" /> : <Check size={15} />} Saqlash
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
