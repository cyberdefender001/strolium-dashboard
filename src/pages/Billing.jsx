import { useEffect, useState } from "react";
import { CreditCard, Check, AlertCircle, FileText, Clock } from "lucide-react";
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

// To'lov. Until now payment existed only in the Mini App, so a boss who works on
// the website could not pay at all.
//
// The contract gate is shown HERE, before Payme, rather than letting someone
// reach the checkout page and be refused by the server. The server still refuses
// -- that is the actual control -- but being stopped after leaving the site is a
// bad way to find out.
export default function Billing({ user }) {
  const [info, setInfo] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [gate, setGate] = useState(false);

  const load = () => {
    getBilling()
      .then((d) => { setInfo(d); setErr(""); })
      .catch((e) => setErr(e.message || "Ma'lumotni yuklab bo'lmadi."));
  };
  useEffect(load, []);

  const pay = async () => {
    if (!info) return;
    // Contract first. The server enforces this too; this is so the person can act
    // on it instead of being bounced at Payme.
    if (!info.oferta_signed) { setGate(true); return; }
    setBusy(true);
    setErr("");
    try {
      const r = await startCheckout();
      if (r && r.url) {
        // Same tab: returning from Payme should land back in the app, and a popup
        // here is often blocked.
        window.location.href = r.url;
      } else {
        setErr("To'lov havolasi olinmadi.");
      }
    } catch (e) {
      setErr(e.message || "To'lovni boshlab bo'lmadi.");
    } finally {
      setBusy(false);
    }
  };

  if (err && !info) {
    return (
      <div className="card">
        <p className="login__err">{err}</p>
      </div>
    );
  }
  // The app has one loading animation; a bespoke "Yuklanmoqda…" here made this
  // page look like it belonged to a different product.
  if (!info) return <BrickLoader label="Yuklanmoqda" />;

  const priced = typeof info.tier.price === "number";
  const left = daysLeft(info.trial_ends_at);
  // The date a payment would extend the plan to. Computed here rather than shown
  // as "+30 kun", because a date is what a boss checks against his own calendar.
  const nextEnd = new Date(Date.now() + 30 * 86400000).toLocaleDateString("ru-RU");

  return (
    <>
      {gate && (
        <OfertaGate
          user={user}
          onClose={() => setGate(false)}
          onSigned={() => { setGate(false); load(); }}
        />
      )}

      <div className="bill">
        <div className="bill__card">
          <div className="bill__top">
            <div className="bill__tierblk">
              <div className="bill__label">Joriy tarif</div>
              <div className="bill__tier">{info.tier.name}</div>
              <div className="bill__seats">
                {info.tier.max ? `${info.tier.max} kishigacha` : "Cheklanmagan"}
                {typeof info.seats_used === "number"
                  ? ` \u00b7 ${info.seats_used} ta a'zo band`
                  : ""}
              </div>
            </div>
            <div className="bill__priceblk">
              {priced ? (
                <>
                  <div className="bill__price">{fmt(info.tier.price)}</div>
                  <div className="bill__cur">{info.currency} / oy</div>
                </>
              ) : (
                <div className="bill__price bill__price--sm">Kelishilgan</div>
              )}
            </div>
          </div>

          <div className="bill__status">
            {info.plan_status === "active" ? (
              <span className="bill__chip bill__chip--ok">
                <Check size={13} /> Faol
              </span>
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
          </div>

          {priced && (
            <div className="bill__lines">
              <div className="bill__line">
                <span>Tarif</span>
                <span>{info.tier.name} \u00b7 1 oy</span>
              </div>
              <div className="bill__line">
                <span>Yangi muddat</span>
                <span>{nextEnd}</span>
              </div>
              <div className="bill__line bill__line--total">
                <span>Jami</span>
                <span>{fmt(info.tier.price)} {info.currency}</span>
              </div>
            </div>
          )}

          <div className="bill__foot">
            {!info.is_executive ? (
              <p className="hint">To'lovni faqat rahbar amalga oshira oladi.</p>
            ) : !priced ? (
              <p className="hint">
                Bu tarif uchun to'lov kelishilgan holda amalga oshiriladi. Biz bilan
                bog'laning.
              </p>
            ) : (
              <>
                {err && (
                  <p className="login__err bill__err">
                    <AlertCircle size={14} /> {err}
                  </p>
                )}
                <button className="bill__pay" onClick={pay} disabled={busy} type="button">
                  <CreditCard size={17} />{" "}
                  {busy ? "Kutilmoqda\u2026" : "Payme orqali to'lash"}
                </button>
                <p className="bill__hint">
                  To'lov Payme sahifasida amalga oshiriladi
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
