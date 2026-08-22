import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Copy, Check } from "lucide-react";
import { getTeam, createInvite, renameMember, deleteMember, getMe } from "../api/client";
import { initials } from "../lib/format";
import BrickLoader from "../components/BrickLoader.jsx";

// Jamoa -- same permission model as the Mini App: anyone managerial can invite
// (the server says which roles), rename is managerial, removal is owner-only.
// Invites are a role + optional seat cap and produce a Telegram link + code.

function InviteModal({ roles, onClose }) {
  const [level, setLevel] = useState(null);
  const [cap, setCap] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  // Which block was copied, not whether one was: "" | "web" | "tg" | "code".
  const [copied, setCopied] = useState("");

  const make = async (uses) => {
    setBusy(true);
    setErr("");
    try {
      const r = await createInvite(level, uses);
      setResult(r);
    } catch (e) {
      setErr(e.message || "Xatolik");
    } finally {
      setBusy(false);
    }
  };

  // Keyed by block, so the tick appears on the button that was pressed rather
  // than on all three at once.
  const copy = (key, text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(""), 1600);
    });
  };

  return (
    <div className="modal__wrap" onClick={onClose}>
      <div className="axp" style={{ maxWidth: 430 }} onClick={(e) => e.stopPropagation()}>
        <div className="axp__body" style={{ paddingTop: 22 }}>
          <h3 className="modal__title">A'zo qo'shish</h3>

          {!result && (
            <>
              <div className="fld"><span>Kim qo'shiladi?</span></div>
              <div className="tm-roles">
                {roles.map((r) => (
                  <button key={r.level}
                    className={"tm-role" + (level === r.level ? " on" : "")}
                    onClick={() => setLevel(r.level)}>
                    {r.label}
                  </button>
                ))}
              </div>

              {level && (
                <>
                  <label className="fld" style={{ marginTop: 14 }}>
                    <span>Necha kishi kira oladi?</span>
                    <input inputMode="numeric" value={cap} placeholder="Masalan: 15"
                      onChange={(e) => setCap(e.target.value.replace(/[^0-9]/g, ""))} />
                  </label>
                  <div className="tm-capacts">
                    <button className="btn-primary" disabled={busy || !cap}
                      onClick={() => make(parseInt(cap, 10))}>OK</button>
                    <button className="btn-ghost" disabled={busy}
                      onClick={() => make(null)}>Cheksiz</button>
                  </div>
                </>
              )}
            </>
          )}

          {result && (
            <>
              {/* Three blocks, matching the Mini App: label, what it does, the
                  value, and its own copy button. This modal used to show the
                  browser link with a button, the code as loose text, and the
                  Telegram link as a bare anchor -- three things doing the same
                  job, presented three different ways. */}
              <div className="fld"><span>Taklif — {result.role}</span></div>

              <div className="tmblk">
                <div className="tmblk__lbl">Sayt uchun havola</div>
                <div className="tmblk__sub">Istalgan brauzerda ochiladi</div>
                <div className="tmblk__val">{result.join_url || result.link}</div>
                <button
                  className="btn-primary tmblk__b"
                  onClick={() => copy("web", result.join_url || result.link)}
                >
                  {copied === "web" ? <Check size={14} /> : <Copy size={14} />}
                  {copied === "web" ? "Nusxalandi" : "Nusxalash"}
                </button>
              </div>

              {result.link && (
                <div className="tmblk">
                  <div className="tmblk__lbl">Telegram uchun havola</div>
                  <div className="tmblk__sub">Botni ochadi</div>
                  <div className="tmblk__val">{result.link}</div>
                  <button
                    className="btn-primary tmblk__b"
                    onClick={() => copy("tg", result.link)}
                  >
                    {copied === "tg" ? <Check size={14} /> : <Copy size={14} />}
                    {copied === "tg" ? "Nusxalandi" : "Nusxalash"}
                  </button>
                </div>
              )}

              <div className="tmblk">
                <div className="tmblk__lbl">Kod</div>
                <div className="tmblk__sub">Saytga qo'lda kiritish uchun</div>
                <div className="tmblk__val tmblk__val--code">{result.code}</div>
                <button
                  className="btn-primary tmblk__b"
                  onClick={() => copy("code", result.code)}
                >
                  {copied === "code" ? <Check size={14} /> : <Copy size={14} />}
                  {copied === "code" ? "Nusxalandi" : "Nusxalash"}
                </button>
              </div>
            </>
          )}

          {err && <div className="modal__err">{err}</div>}
        </div>
        <div className="axp__foot">
          <button className="btn-ghost" onClick={onClose}>Yopish</button>
        </div>
      </div>
    </div>
  );
}

export default function Team({ tick, onChange }) {
  // Belongs to Team, NOT to InviteModal -- InviteModal has its own `copied`
  // for the invite link, and this one is for the reserved boss code below.
  const [bossCopied, setBossCopied] = useState(false);
  const [data, setData] = useState(null);
  const [me, setMe] = useState(null);
  const [err, setErr] = useState("");
  const [inviting, setInviting] = useState(false);
  const [renaming, setRenaming] = useState(null); // member id
  const [nameDraft, setNameDraft] = useState("");
  const [busy, setBusy] = useState(null);

  const load = useCallback(() => {
    setErr("");
    Promise.all([getTeam(), getMe()])
      .then(([t, m]) => { setData(t); setMe(m); })
      .catch((e) => setErr(e.message || "Yuklab bo'lmadi."));
  }, []);

  useEffect(() => { load(); }, [load, tick]);

  const saveRename = async (id) => {
    if (!nameDraft.trim()) return;
    setBusy(id);
    try {
      await renameMember(id, nameDraft.trim());
      setRenaming(null);
      load();
      if (onChange) onChange();
    } finally { setBusy(null); }
  };

  const remove = async (m) => {
    if (!window.confirm(`${m.name} jamoadan o'chirilsinmi?`)) return;
    setBusy(m.id);
    try {
      await deleteMember(m.id);
      load();
      if (onChange) onChange();
    } finally { setBusy(null); }
  };

  if (err)
    return (
      <div className="section-empty">
        {err} <button className="btn-ghost" onClick={load}>Qayta urinish</button>
      </div>
    );
  if (!data) return <BrickLoader label="Yuklanmoqda" />;

  const seats = data.seats || {};
  const isOwner = !!(me && me.owner);

  return (
    <>
      <div className="xhead">
        <div>
          <h2 className="xhead__title">Jamoa</h2>
          <div className="xhead__sub">
            {data.members.length} ta a'zo
            {seats.cap ? ` · ${Math.max(0, seats.cap - seats.used)} ta bo'sh joy qoldi` : ""}
          </div>
        </div>
        {data.can_invite && data.can_invite.length > 0 && (
          <button className="btn-primary" onClick={() => setInviting(true)}>
            <Plus size={15} /> A'zo qo'shish
          </button>
        )}
      </div>

      {/* A controller-first company has no boss yet, and a manager cannot mint an
          executive invite -- so without this the company is stuck: the only person
          who could add the boss is the boss. The code was reserved at approval. */}
      {/* A company of one. The creator is often a nazoratchi setting things up
          for his boss -- and the oferta is signed by the rahbar, so a company
          whose boss never joins cannot be signed and cannot pay.

          Phrased as a question, not an instruction: the creator is just as
          often the boss himself, and telling him to invite himself would be
          nonsense. Not a gate -- a company can run with one person. */}
      {data.alone && !data.needs_boss && (
        <div className="card tm-boss tm-alone">
          <div className="tm-boss__t">Rahbar tizimda bormi?</div>
          <div className="tm-boss__s">
            Shartnomani faqat rahbar imzolay oladi. Agar kompaniyani rahbar
            nomidan siz ochgan bo'lsangiz, uni rahbar sifatida taklif qiling.
          </div>
          <div className="tm-boss__acts">
            <button
              type="button"
              className="btn-primary"
              onClick={() => setInviting(true)}
            >
              Rahbarni taklif qilish
            </button>
          </div>
        </div>
      )}

      {data.needs_boss && data.boss_code && (
        <div className="card tm-boss">
          <div className="tm-boss__t">Rahbar hali qo'shilmagan</div>
          <div className="tm-boss__s">
            Rahbaringizga shu kodni bering. U saytda ro'yxatdan o'tib kodni kiritadi
            — kod bir marta ishlaydi.
          </div>
          <div className="tm-boss__code">{data.boss_code}</div>
          <div className="tm-boss__acts">
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                try {
                  navigator.clipboard.writeText(data.boss_code);
                  setBossCopied(true);
                  setTimeout(() => setBossCopied(false), 1800);
                } catch { /* clipboard blocked -- the code is on screen to read */ }
              }}
            >
              {bossCopied ? <Check size={14} /> : <Copy size={14} />}
              {bossCopied ? "Nusxalandi" : "Kodni nusxalash"}
            </button>
            {data.boss_link && (
              <a className="tm-boss__link" href={data.boss_link} target="_blank" rel="noreferrer">
                Telegram havolasi
              </a>
            )}
          </div>
        </div>
      )}

      <div className="card tm-list">
        {data.members.map((m) => (
          <div key={m.id} className="tm-row">
            <span className="tava tm-ava">{initials(m.name)}</span>
            <div className="tm-info">
              {renaming === m.id ? (
                <div className="tm-rename">
                  <input autoFocus value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveRename(m.id)} />
                  <button className="btn-ok" disabled={busy === m.id}
                    onClick={() => saveRename(m.id)}><Check size={13} /></button>
                  <button className="btn-no" onClick={() => setRenaming(null)}>Bekor</button>
                </div>
              ) : (
                <>
                  <div className="tm-name">{m.name}</div>
                  <div className="tm-role-label">{m.role}</div>
                </>
              )}
            </div>
            {renaming !== m.id && (
              <div className="tm-acts">
                <button className="pj__edit" title="Tahrirlash"
                  onClick={() => { setRenaming(m.id); setNameDraft(m.name); }}>
                  <Pencil size={14} />
                </button>
                {isOwner && me && m.id !== me.member_id && (
                  <button className="pj__edit tm-del" title="O'chirish"
                    disabled={busy === m.id} onClick={() => remove(m)}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
        {!data.members.length && (
          <div className="section-empty">Hali a'zo yo'q. Yuqoridan a'zo qo'shing.</div>
        )}
      </div>

      {inviting && <InviteModal roles={data.can_invite} onClose={() => { setInviting(false); load(); }} />}
    </>
  );
}
