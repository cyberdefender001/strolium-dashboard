import { FileText, X } from "lucide-react";
import Oferta from "../pages/Oferta";

// Shown full-screen when someone starts a payment without a signed contract.
//
// Two deliberate choices:
//
//   * Clicking the backdrop does NOT close it. This is not an informational
//     dialog -- payment cannot proceed without the contract, so dismissing it by
//     accident and being blocked with no explanation would be worse than a
//     modal that only closes on an explicit press.
//   * The refusal is enforced by the checkout endpoint, not here. This screen
//     exists so the person can act on it; if it were skipped the payment would
//     still be refused server-side.
export default function OfertaGate({ user, onSigned, onClose }) {
  return (
    <div className="ofrgate">
      <div className="ofrgate__box">
        <div className="ofrgate__head">
          <FileText size={18} />
          <div>
            <h3>Foydalanish shartnomasi</h3>
            <p>To'lovni davom ettirish uchun shartnomani tasdiqlang.</p>
          </div>
          <button className="ofrgate__x" onClick={onClose} type="button" aria-label="Yopish">
            <X size={17} />
          </button>
        </div>
        <div className="ofrgate__body">
          <Oferta inline user={user} onAccepted={onSigned} />
        </div>
      </div>
    </div>
  );
}
