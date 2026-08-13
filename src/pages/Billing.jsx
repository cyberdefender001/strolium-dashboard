import { useEffect, useState } from "react";
import { CreditCard, Check, AlertCircle, FileText, Clock, ArrowUp } from "lucide-react";
import { getBilling, startCheckout } from "../api/client";
import BrickLoader from "../components/BrickLoader.jsx";
import OfertaGate from "../components/OfertaGate";

// Days left on the trial. "6 kun qoldi" is actionable; "sinov muddati" is not.
function daysLeft(iso) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  return Math.max(0, Math.ceil(ms / 86400000));
}

const fmt = (n) =>
  typeof n === "number" ? n.toLocaleString("ru-RU").replace(/\u00a0/g, " ") : n;

const DAYS = { 1: 30, 3: 90, 6: 180 };

export default function Billing({ user }) {
  const [info, setInfo] = useState(null);
  const [months, setMonths] = useState(1);
  const [picked, setPicked] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [gate, setGate] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const load = () => {
    getBilling()
      .then((d) => {
        setInfo(d);
        setPicked((p) => p || d.current_tier_id);
        setErr("");
      })
      .catch((e) => setErr(e.message || "Ma'lumotni yuklab bo'lmadi."));
  };
  useEffect(load, []);

  if (err && !info) return <div className="card"><p className="login__err">{err}</p></div>;
  if (!info) return <BrickLoader label="Yuklanmoqda" />;

  const tiers = info.tiers || [];
  const sel = tiers.find((t) => t.id === picked) || tiers.find((t) => t.id === info.current_tier_id);
  const cur = tiers.find((t) => t.id === info.current_tier_id);
  const price = sel ? sel.prices[String(months)] : null;
  const left = daysLeft(info.trial_ends_at);
  const nextEnd = new Date(Date.now() + (DAYS[months] || 30) * 86400000).toLocaleDateString("ru-RU");

  // Rank by seat cap, unlimited last. Used only to word the confirmation.
  const rank = (t) => (!t ? -1 : t.max === null ? Infinity : t.max);
  const isUpgrade = sel && cur && rank(sel) > rank(cur);

  const choose = (t) => {
    setPicked(t.id);
    // The warning appears HERE, on selection -- not printed on every tile, which
    // made the list look broken before anyone had chosen anything.
    if (!t.fits) {
      setErr(
        `${t.name} tarifi ${t.max} tagacha xodim tizimga kirishiga imkon beradi, ` +
          `sizda xodimlar soni ko'p — hozir ${info.seats_used} ta.`
      );
    } else {
      setErr("");
    }
  };

  const go = async () => {
    if (!sel || !sel.fits || !price) return;
    if (!info.oferta_signed) { setConfirm(false); setGate(true); return; }
    setBusy(true);
    setErr("");
    try {
      const r = await startCheckout({ tier_id: sel.id, months });
      if (r && r.url) window.location.href = r.url;
      else setErr("To'lov havolasi olinmadi.");
    } catch (e) {
      setErr(e.message || "To'lovni boshlab bo'lmadi.");
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  };

  const pay = () => {
    // A tier change is confirmed first: the amount differs from what they pay
    // today, and the current period's remaining days are forfeited.
    if (sel && cur && sel.id !== cur.id) { setConfirm(true); return; }
    go();
  };

  return (
    <>
      {gate && (
        <OfertaGate
          user={user}
          onClose={() => setGate(false)}
          onSigned={() => { setGate(false); load(); }}
        />
      )}

      {confirm && sel && cur && (
        <div className="bill__scrim" onClick={() => setConfirm(false)}>
          <div className="bill__dlg" onClick={(e) => e.stopPropagation()}>
            <div className="bill__dlghead">
              <ArrowUp size={20} />
              <div>
                <h3>Tarifni o'zgartirasizmi?</h3>
                <p>
                  {cur.name} → {sel.name}. To'lov {fmt(price)} {info.currency}.
                  {isUpgrade
                    ? " Yangi muddat to'lovdan keyin boshlanadi; avvalgi muddatning qolgan kunlari bekor qilinadi."
                    : " Yangi tarif to'lov tasdiqlangach kuchga kiradi."}
                </p>
              </div>
            </div>
            <div className="bill__dlgacts">
              <button className="btn-ghost" onClick={() => setConfirm(false)} type="button">
                Bekor
              </button>
              <button className="bill__pay bill__pay--sm" onClick={go} disabled={busy} type="button">
                {busy ? "Kutilmoqda\u2026" : "Ha, o'zgartiraman"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bill">
        <div className="bill__periods">
          <span className="bill__label">Muddat</span>
          <div className="bill__seg">
            {(info.periods || [1]).map((m) => (
              <button
                key={m}
                className={"bill__segbtn" + (months === m ? " on" : "")}
                onClick={() => setMonths(m)}
                type="button"
              >
                {m} oy
              </button>
            ))}
          </div>
        </div>

        <div className="bill__tiers">
          {tiers.map((t) => {
            const p = t.prices[String(months)];
            const on = sel && t.id === sel.id;
            return (
              <button
                key={t.id}
                className={"bill__tile" + (on ? " on" : "")}
                onClick={() => choose(t)}
                type="button"
              >
                <span className="bill__tname">
                  {t.name}
                  {t.id === info.current_tier_id && <em>Joriy</em>}
                </span>
                <span className="bill__tseats">
                  {t.max ? `${t.max} kishigacha` : "Cheklanmagan"}
                </span>
                <span className="bill__tprice">{p ? fmt(p) : "—"}</span>
                <span className="bill__tcur">
                  {info.currency} / {months} oy
                </span>
              </button>
            );
          })}
        </div>

        <div className="bill__card">
          <div className="bill__status">
            {info.plan_status === "active" ? (
              <span className="bill__chip bill__chip--ok"><Check size={13} /> Faol</span>
            ) : (
              <span className="bill__chip bill__chip--warn">
                <Clock size={13} />
                {left != null ? ` Sinov \u00b7 ${left} kun qoldi` : " Sinov muddati"}
              </span>
            )}
            {info.oferta_signed ? (
              <span className="bill__chip bill__chip--ok">
                <Check size={13} /> Shartnoma tasdiqlangan
              </span>
            ) : (
              <span className="bill__chip bill__chip--warn">
                <FileText size={13} /> Shartnoma tasdiqlanmagan
              </span>
            )}
            <span className="bill__used">
              {info.seats_used} / {sel && sel.max ? sel.max : "\u221e"} a'zo band
            </span>
          </div>

          <div className="bill__lines">
            <div className="bill__line">
              <span>Tanlangan</span>
              <span>{sel ? sel.name : "—"} · {months} oy</span>
            </div>
            <div className="bill__line">
              <span>Yangi muddat</span>
              <span>{nextEnd} gacha</span>
            </div>
            <div className="bill__line bill__line--total">
              <span>Jami</span>
              <span>{price ? `${fmt(price)} ${info.currency}` : "—"}</span>
            </div>
          </div>

          <div className="bill__foot">
            {err && (
              <p className="login__err bill__err">
                <AlertCircle size={14} /> {err}
              </p>
            )}
            {!info.is_executive ? (
              <p className="hint">To'lovni faqat rahbar amalga oshira oladi.</p>
            ) : (
              <button
                className="bill__pay"
                onClick={pay}
                disabled={busy || !sel || !sel.fits || !price}
                type="button"
              >
                <CreditCard size={17} /> {busy ? "Kutilmoqda\u2026" : "Payme orqali to'lash"}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
