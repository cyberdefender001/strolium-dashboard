import { useEffect, useMemo, useState } from "react";
import { FileText, Check, AlertCircle, Download } from "lucide-react";
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
// The document is stored as Markdown because that is what gets hashed and what
// lives in git. Showing it raw put "#" and "|---|" on screen, which reads like an
// unfinished draft. This renders the handful of constructs the contract actually
// uses -- headings, paragraphs, one table, one bullet list -- rather than adding a
// Markdown dependency for four cases.
//
// IMPORTANT: this changes only the DISPLAY. The hash is computed server-side over
// the source text, so rendering cannot affect the proof.
function renderDoc(text) {
  const lines = String(text || "").split("\n");
  const out = [];
  let i = 0;
  let key = 0;

  const isTableRow = (l) => l.trim().startsWith("|") && l.trim().endsWith("|");
  const cells = (l) =>
    l.trim().slice(1, -1).split("|").map((c) => c.trim());

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { i++; continue; }

    // Table: a header row, a separator of dashes, then body rows.
    if (isTableRow(line) && i + 1 < lines.length && /^\|[\s\-|]+\|$/.test(lines[i + 1].trim())) {
      const head = cells(line);
      i += 2;
      const body = [];
      while (i < lines.length && isTableRow(lines[i])) { body.push(cells(lines[i])); i++; }
      out.push(
        <table className="ofr__table" key={key++}>
          <thead>
            <tr>{head.map((c, n) => <th key={n}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {body.map((row, n) => (
              <tr key={n}>{row.map((c, m) => <td key={m}>{c}</td>)}</tr>
            ))}
          </tbody>
        </table>
      );
      continue;
    }

    if (line.startsWith("## ")) {
      out.push(<h4 className="ofr__h2" key={key++}>{line.slice(3)}</h4>);
      i++; continue;
    }
    if (line.startsWith("# ")) {
      out.push(<h3 className="ofr__h1" key={key++}>{line.slice(2)}</h3>);
      i++; continue;
    }
    if (line.startsWith("- ")) {
      const items = [];
      while (i < lines.length && lines[i].startsWith("- ")) { items.push(lines[i].slice(2)); i++; }
      out.push(
        <ul className="ofr__ul" key={key++}>
          {items.map((t, n) => <li key={n}>{t}</li>)}
        </ul>
      );
      continue;
    }
    out.push(<p className="ofr__p" key={key++}>{line}</p>);
    i++;
  }
  return out;
}


// Declared at module scope on purpose. Defined inside the component it was a new
// component type on every render, so React unmounted and remounted the whole
// subtree on each keystroke and the focused input lost focus after one character.
function Wrap({ inline, children }) {
  return <div className={inline ? "ofr__inline" : "ofr__scrim"}>{children}</div>;
}


export default function Oferta({ user, onAccepted, inline = false }) {
  const [doc, setDoc] = useState(null);
  const [agree, setAgree] = useState(false);
  // Typed by the signer. Not verified against a registry -- that data is not
  // reliably public in Uzbekistan -- but details only the company knows make a
  // later "someone else clicked" much harder to sustain.
  const [stir, setStir] = useState("");
  const [legalName, setLegalName] = useState("");
  const [signerName, setSignerName] = useState("");
  const [signerPos, setSignerPos] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  // Set the moment acceptance succeeds. Without it the card kept showing the form
  // and the only feedback was a line at the very bottom of the page -- so it
  // looked like nothing had happened, and people clicked again. Two rows in
  // legal_acceptances is harmless but the confusion is not.
  const [justSigned, setJustSigned] = useState(false);

  // The contract is ~9000 characters and renderDoc rebuilds its entire element
  // tree. Without memoising, every keystroke in a form field re-ran it.
  const rendered = useMemo(() => (doc ? renderDoc(doc.text) : null), [doc]);

  // createObjectURL was called on every render, leaking a blob per keystroke.
  const dlHref = useMemo(
    () => (doc ? URL.createObjectURL(new Blob([doc.text], { type: "text/plain;charset=utf-8" })) : ""),
    [doc]
  );

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
        stir,
        legal_name: legalName,
        signer_name: signerName,
        signer_position: signerPos,
      });
      setJustSigned(true);
      onAccepted && onAccepted();
    } catch (e) {
      setErr(e.message || "Tasdiqlab bo'lmadi.");
    } finally {
      setBusy(false);
    }
  };

  if (err && !doc) {
    return (
      <Wrap inline={inline}>
        <div className="card ofr">
          <p className="login__err">{err}</p>
        </div>
      </Wrap>
    );
  }
  if (!doc) {
    return (
      <Wrap inline={inline}>
        <div className="card ofr">
          <p className="hint">Yuklanmoqda…</p>
        </div>
      </Wrap>
    );
  }

  return (
    <Wrap inline={inline}>
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
          <div className="ofr__text">{rendered}</div>
        </div>

        <div className="ofr__foot">
          {justSigned || (doc.accepted && doc.accepted.current) ? (
            <div className="ofr__signed">
              <Check size={16} />
              <div>
                <b>Shartnoma tasdiqlandi</b>
                <span>
                  Versiya {doc.version}
                  {(doc.accepted && doc.accepted.full_name)
                    ? " \u00b7 " + doc.accepted.full_name
                    : (user && user.name ? " \u00b7 " + user.name : "")}
                </span>
              </div>
            </div>
          ) : (
            <>
              <div className="ofr__fields">
                <label>
                  <span>Kompaniya STIR *</span>
                  <input
                    className="eauth__input"
                    inputMode="numeric"
                    maxLength={9}
                    value={stir}
                    onChange={(e) => setStir(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456789"
                  />
                </label>
                <label>
                  <span>Kompaniyaning to'liq nomi *</span>
                  <input
                    className="eauth__input"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    placeholder='"Optimal Qurilish" MChJ'
                  />
                </label>
                <label>
                  <span>Ism-familiya *</span>
                  <input
                    className="eauth__input"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                  />
                </label>
                <label>
                  <span>Lavozim</span>
                  <input
                    className="eauth__input"
                    value={signerPos}
                    onChange={(e) => setSignerPos(e.target.value)}
                    placeholder="Direktor"
                  />
                </label>
              </div>

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

              {err && (
                <p className="login__err ofr__err">
                  <AlertCircle size={14} /> {err}
                </p>
              )}

              <button
                className="btn-primary ofr__btn"
                onClick={submit}
                disabled={!agree || busy || stir.length !== 9 || !legalName.trim() || !signerName.trim()}
                type="button"
              >
                <Check size={15} /> {busy ? "Saqlanmoqda\u2026" : "Shartnomani tasdiqlash"}
              </button>
            </>
          )}

          {/* Version, source download and hash stay visible in both states: after
              signing, this is the record of WHAT was signed. */}
          <div className="ofr__meta">
            <span>Versiya {doc.version}</span>
            <a
              className="ofr__dl"
              download={`Strolium-shartnoma-v${doc.version}.txt`}
              href={dlHref}
            >
              <Download size={13} /> Yuklab olish
            </a>
            <span className="ofr__hash" title={doc.hash}>
              SHA-256: {doc.hash.slice(0, 16)}\u2026
            </span>
          </div>
        </div>
      </div>
    </Wrap>
  );
}
