import { useEffect, useState } from "react";
import { CreditCard, Lock } from "lucide-react";

/**
 * Shown when the server refuses a write because the trial is over.
 *
 * Why a global listener rather than per-page handling: every write in the app
 * goes through the same 402, and there are dozens of buttons. Handling it at
 * each call site would mean forty places to forget. api/client.js fires one
 * event; this listens once.
 *
 * What it replaces: the raw message "Sinov muddati tugadi. Davom etish uchun biz
 * bilan bog'laning." rendered as an error toast. It told the customer to
 * telephone, offered no way to pay, and looked like a fault rather than a
 * decision. Seven companies hit that wall and none of them called.
 */
export default function TrialExpiredDialog() {
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    const onExpired = (e) => setMsg((e.detail && e.detail.message) || "");
    window.addEventListener("strolium:trial-expired", onExpired);
    return () => window.removeEventListener("strolium:trial-expired", onExpired);
  }, []);

  // Escape closes it. The dialog blocks nothing the person can still do -- all
  // reading keeps working -- so trapping them in it would be wrong.
  useEffect(() => {
    if (msg === null) return;
    const onKey = (e) => e.key === "Escape" && setMsg(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [msg]);

  if (msg === null) return null;

  const goPay = () => {
    setMsg(null);
    // Nav is hash-driven, so this works from anywhere without reaching into
    // Dashboard's state or re-rendering the tree.
    window.location.hash = "/billing";
  };

  return (
    <div className="trialx" role="dialog" aria-modal="true" aria-labelledby="trialx-t">
      <div className="trialx__box">
        <div className="trialx__icon"><Lock size={19} /></div>
        <h2 className="trialx__title" id="trialx-t">Sinov muddati tugadi</h2>
        <p className="trialx__body">
          Ma'lumotlaringiz joyida va ularni ko'rishda davom etasiz. Yangi vazifa,
          xarajat yoki a'zo qo'shish uchun tarifni tanlang.
        </p>
        <button className="trialx__pay" onClick={goPay} type="button">
          <CreditCard size={16} /> To'lash
        </button>
        <button className="trialx__later" onClick={() => setMsg(null)} type="button">
          Keyinroq
        </button>
      </div>
    </div>
  );
}
