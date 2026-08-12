import { useEffect, useState } from "react";
import { FileText, Check, AlertCircle } from "lucide-react";
import { getLegalDoc, acceptLegalDoc } from "../api/client";

// The oferta gate.
//
// A ticked box on its own proves very little. What makes this defensible is that
// the full text is on screen -- not behind a link -- and the hash of that exact
// text is sent back and verified server-side before anything is recorded. So the
// record says "this person agreed to the document with this hash", and the text
// with that hash is in git.
//
// Deliberate choices:
//   * the checkbox starts UNTICKED and the button is disabled until it is set;
//   * the text is scrolled in a real container, so "it was available to read" is
//     "it was on screen";
//   * the hash is shown. It looks technical, and that is the point -- it is the
//     thing that ties the record to the words.
export default function Oferta({ user, onAccepted, inline = false }) {
  const [doc, setDoc] = useState(null);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const d = await getLegalDoc("oferta");
        if (alive) setDoc(d);
      } catch (e) {
        if (alive) setErr(e.message || "Hujjatni yuklab bo'lmadi.");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const submit = async () => {
    if (!doc || !agree) return;
    setBusy(true);
    setErr("");
    try {
      await acceptLegalDoc({
        kind: "oferta",
        version: doc.version,
        doc_hash: doc.hash,
      });
      onAccepted && onAccepted();
    } catch (e) {
      setErr(e.message || "Tasdiqlab bo'lmadi.");
    } finally {
      setBusy(false);
    }
  };

  // In inline mode the scrim is a plain wrapper: no fixed positioning, no
  // z-index, nothing that can be clipped or mis-stacked.
  const Wrap = ({ children }) => (
    <div className={inline ? "ofr__inline" : "ofr__scrim"}>{children}</div>
  );

  if (err && !doc) {
    return (
      <Wrap>
        <div className="card ofr">
          <p className="login__err">{err}</p>
        </div>
      </Wrap>
    );
  }
  if (!doc) {
    return (
      <Wrap>
        <div className="card ofr">
          <p className="hint">Yuklanmoqda…</p>
        </div>
      </Wrap>
    );
  }

  return (
    <Wrap>
      <div className="card ofr">
        <div className="ofr__head">
          <FileText size={17} />
          <div>
            <h2 className="ofr__title">Foydalanish shartnomasi</h2>
            <p className="ofr__sub">
              Davom etish uchun shartnomani o'qing va tasdiqlang. Tasdiqlash
              kompaniya nomidan bildiriladi.
            </p>
          </div>
        </div>

        <div className="ofr__body">
          {/* Plain text in a <pre>: the document is stored as text and shown as
              text, so what is displayed is byte-for-byte what was hashed. */}
          <pre className="ofr__text">{doc.text}</pre>
        </div>

        <div className="ofr__foot">
          <label className="ofr__check">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
            />
            <span>
              Shartnomani to'liq o'qidim va kompaniya nomidan roziman. Men
              kompaniya nomidan shartnoma tuzish vakolatiga egaman.
            </span>
          </label>

          <div className="ofr__meta">
            <span>Versiya {doc.version}</span>
            <span className="ofr__hash" title={doc.hash}>
              SHA-256: {doc.hash.slice(0, 16)}…
            </span>
            {user && user.name && <span>{user.name}</span>}
          </div>

          {err && (
            <p className="login__err ofr__err">
              <AlertCircle size={14} /> {err}
            </p>
          )}

          <button
            className="btn-primary ofr__btn"
            onClick={submit}
            disabled={!agree || busy}
            type="button"
          >
            <Check size={15} /> {busy ? "Saqlanmoqda…" : "Roziman va davom etaman"}
          </button>
        </div>
      </div>
    </Wrap>
  );
}
