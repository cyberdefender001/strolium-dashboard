import { useState } from "react";
import { X, LifeBuoy, Image as ImageIcon } from "lucide-react";
import { sendSupport } from "../api/client";

// "Yordam" from the sidebar. Message, category, and an optional screenshot.
//
// The screenshot is optional on purpose: making it required would mean someone
// hitting a bug has to go and take one before they can tell you, and most people
// simply would not bother. When it IS attached it usually saves an entire round
// trip of "which screen were you on?".
const CATEGORIES = [
  { id: "xatolik", label: "Xatolik" },
  { id: "savol", label: "Savol" },
  { id: "taklif", label: "Taklif" },
];

// Screenshots off a 4K display can be several megabytes of PNG. Downscaling in
// the browser keeps the request small and the upload quick on a phone; the
// backend refuses anything over 6 MB anyway.
const MAX_EDGE = 1600;

function shrink(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Rasmni o'qib bo'lmadi."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Rasm formati noto'g'ri."));
      img.onload = () => {
        const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        // JPEG, not PNG: a screenshot of a UI compresses to a fraction of the size
        // and the difference is invisible at this scale.
        resolve(c.toDataURL("image/jpeg", 0.82));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function Support({ onClose }) {
  const [category, setCategory] = useState("xatolik");
  const [message, setMessage] = useState("");
  const [shot, setShot] = useState(null);
  const [shotName, setShotName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  const pick = async (e) => {
    const input = e.target;
    const f = input.files && input.files[0];
    if (!f) return;
    setErr("");
    try {
      setShot(await shrink(f));
      setShotName(f.name);
    } catch (ex) {
      setErr(ex.message || "Rasmni qo'shib bo'lmadi.");
    } finally {
      // A file input only fires onChange when its value CHANGES. Without this,
      // removing the preview and then picking the SAME file again is not a
      // change, no event fires, and nothing appears -- which looks exactly like
      // a broken upload.
      input.value = "";
    }
  };

  const dropShot = () => {
    setShot(null);
    setShotName("");
    setErr("");
  };

  const submit = async () => {
    setErr("");
    if (message.trim().length < 5) {
      setErr("Muammoni qisqacha yozib bering.");
      return;
    }
    setBusy(true);
    try {
      await sendSupport({ message: message.trim(), category, screenshot_b64: shot });
      setDone(true);
    } catch (e) {
      setErr(e.message || "Yuborib bo'lmadi.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sup__scrim" onClick={onClose}>
      <div className="card sup" onClick={(e) => e.stopPropagation()}>
        <div className="sup__head">
          <LifeBuoy size={16} />
          <h3>Yordam</h3>
          <button className="sup__x" onClick={onClose} type="button" aria-label="Yopish">
            <X size={16} />
          </button>
        </div>

        {done ? (
          <div className="sup__body">
            <p className="sup__ok">Xabaringiz yuborildi.</p>
            <p className="hint">Tez fursatda javob beramiz!</p>
            <button className="btn-primary" onClick={onClose} type="button">
              Yopish
            </button>
          </div>
        ) : (
          <div className="sup__body">
            <label className="sup__label">Nima haqida?</label>
            <div className="sup__cats">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={"sup__cat" + (category === c.id ? " on" : "")}
                  onClick={() => setCategory(c.id)}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <label className="sup__label">Muammoni yozib bering</label>
            <textarea
              className="sup__ta"
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Qaysi ekranda, nima qilganingizda yuz berdi?"
            />

            <label className="sup__label">Rasm (ixtiyoriy)</label>
            <label className="sup__file">
              <ImageIcon size={14} />
              {shotName || "Rasm tanlash"}
              <input type="file" accept="image/*" onChange={pick} />
            </label>
            {shot && (
              <div className="sup__preview">
                <img src={shot} alt="" />
                <button type="button" className="sup__drop" onClick={dropShot}>
                  <X size={13} /> O'chirish
                </button>
              </div>
            )}

            {err && <p className="login__err">{err}</p>}

            <div className="sup__acts">
              <button className="btn-ghost" onClick={onClose} type="button" disabled={busy}>
                Bekor
              </button>
              <button className="btn-primary" onClick={submit} type="button" disabled={busy}>
                {busy ? "Yuborilmoqda…" : "Yuborish"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
