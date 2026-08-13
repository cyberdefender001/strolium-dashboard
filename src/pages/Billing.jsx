import { useEffect, useState } from "react";
import { CreditCard, Check, AlertCircle, FileText } from "lucide-react";
import { getBilling, startCheckout } from "../api/client";
import OfertaGate from "../components/OfertaGate";

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
  if (!info) return <div className="card"><p className="hint">Yuklanmoqda…</p></div>;

  const priced = typeof info.tier.price === "number";

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
        <div className="card bill__plan">
          <div className="bill__row">
            <div>
              <div className="bill__label">Joriy tarif</div>
              <div className="bill__tier">{info.tier.name}</div>
              <div className="bill__seats">
                {info.tier.max ? `${info.tier.max} kishigacha` : "Cheklanmagan"}
                {info.seats ? ` · joriy limit: ${info.seats}` : ""}
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
              <span className="prof__pill prof__pill--ok">Faol</span>
            ) : (
              <span className="prof__pill prof__pill--warn">Sinov muddati</span>
            )}
            {info.oferta_signed ? (
              <span className="prof__pill prof__pill--ok">
                <Check size={12} /> Shartnoma tasdiqlangan
              </span>
            ) : (
              <span className="prof__pill prof__pill--warn">
                <FileText size={12} /> Shartnoma tasdiqlanmagan
              </span>
            )}
          </div>

          {!info.is_executive && (
            <p className="hint bill__note">
              To'lovni faqat rahbar amalga oshira oladi.
            </p>
          )}

          {err && (
            <p className="login__err bill__note">
              <AlertCircle size={14} /> {err}
            </p>
          )}

          {priced && info.is_executive && (
            <button className="btn-primary bill__pay" onClick={pay} disabled={busy} type="button">
              <CreditCard size={16} />{" "}
              {busy ? "Kutilmoqda…" : `To'lash — ${fmt(info.tier.price)} ${info.currency}`}
            </button>
          )}

          {!priced && (
            <p className="hint bill__note">
              Bu tarif uchun to'lov kelishilgan holda amalga oshiriladi. Biz bilan
              bog'laning.
            </p>
          )}
        </div>

        <p className="hint bill__foot">
          To'lov Payme orqali amalga oshiriladi. To'lovdan so'ng tarif muddati
          30 kunga uzaytiriladi.
        </p>
      </div>
    </>
  );
}
