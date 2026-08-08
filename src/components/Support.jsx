import { useState } from "react";
import { X, LifeBuoy, Image as ImageIcon } from "lucide-react";
import { sendSupport, uploadSupportShot } from "../api/client";

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
const MAX_EDGE = 1400;
const MAX_SHOTS = 5;

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
  // One entry per chosen file: { id, name, preview, path, error }.
  // `path` arrives from the server once that image has uploaded; the ticket is
  // submitted with the paths, never the images, so the final POST stays tiny.
  const [shots, setShots] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  const pick = async (e) => {
    const input = e.target;
    const files = Array.from(input.files || []);
    // A file input only fires onChange when its value CHANGES. Without clearing
    // it, removing a preview then picking the SAME file again is not a change, no
    // event fires, and nothing appears -- which looks exactly like a broken
    // upload. Cleared immediately so it also holds for the early returns below.
    input.value = "";
    if (!files.length) return;
    setErr("");

    const room = MAX_SHOTS - shots.length;
    if (room <= 0) {
      setErr(`Ko'pi bilan ${MAX_SHOTS} ta rasm.`);
      return;
    }
    if (files.length > room) setErr(`Ko'pi bilan ${MAX_SHOTS} ta rasm.`);

    for (const f of files.slice(0, room)) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      let preview;
      try {
        preview = await shrink(f);
      } catch (ex) {
        setShots((v) => [...v, { id, name: f.name, preview: null, path: null,
                                 error: ex.message || "Rasm formati noto'g'ri." }]);
        continue;
      }
      // Shown straight away, uploading in the background: waiting on the network
      // before anything appears feels broken on a slow connection.
      setShots((v) => [...v, { id, name: f.name, preview, path: null, error: null }]);
      try {
        const r = await uploadSupportShot(preview);
        setShots((v) => v.map((x) => (x.id === id ? { ...x, path: r.path } : x)));
      } catch (ex) {
        setShots((v) => v.map((x) => (x.id === id
          ? { ...x, error: ex.message || "Yuklab bo'lmadi." } : x)));
      }
    }
  };

  const dropShot = (id) => {
    setShots((v) => v.filter((x) => x.id !== id));
    setErr("");
  };

  const submit = async () => {
    setErr("");
    if (message.trim().length < 5) {
      setErr("Muammoni qisqacha yozib bering.");
      return;
    }
    // Only uploaded images can be attached. A still-uploading or failed one is
    // skipped rather than blocking the report, which is the point of the ticket.
    const paths = shots.filter((x) => x.path).map((x) => x.path);
    const pending = shots.some((x) => !x.path && !x.error);
    if (pending) {
      setErr("Rasmlar yuklanmoqda, bir soniya.");
      return;
    }
    setBusy(true);
    try {
      await sendSupport({ message: message.trim(), category, screenshots: paths });
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

            <label className="sup__label">
              Rasm (ixtiyoriy) — {shots.length}/{MAX_SHOTS}
            </label>
            {shots.length < MAX_SHOTS && (
              <label className="sup__file">
                <ImageIcon size={14} />
                {shots.length ? "Yana rasm qo'shish" : "Rasm tanlash"}
                {/* multiple: several can be picked in one go, and the loop uploads
                    them one at a time. */}
                <input type="file" accept="image/*" multiple onChange={pick} />
              </label>
            )}

            {shots.length > 0 && (
              <div className="sup__shots">
                {shots.map((x) => (
                  <div
                    key={x.id}
                    className={
                      "sup__shot" +
                      (x.error ? " is-bad" : x.path ? "" : " is-busy")
                    }
                  >
                    {x.preview ? <img src={x.preview} alt="" /> : <span className="sup__shot-none" />}
                    <button
                      type="button"
                      className="sup__shot-x"
                      onClick={() => dropShot(x.id)}
                      aria-label="O'chirish"
                    >
                      <X size={12} />
                    </button>
                    {/* State is on the thumbnail itself: a separate list of
                        statuses beside five images is unreadable. */}
                    {!x.path && !x.error && <span className="sup__shot-tag">…</span>}
                    {x.error && <span className="sup__shot-tag">!</span>}
                  </div>
                ))}
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
