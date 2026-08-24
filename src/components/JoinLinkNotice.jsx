import { UserPlus, LogOut, X } from "lucide-react";

/**
 * Shown when someone who is ALREADY in a company opens an invite link.
 *
 * The link is `<site>/#/join?code=XXXXXXXX`. Only NoCompany reads that code,
 * and App only renders NoCompany when `!user.orgId` -- so a signed-in user with
 * a company went straight to their dashboard and the code was silently
 * discarded. No message, no hint that the link had meant anything.
 *
 * Two people hit this:
 *
 *   the inviter    tests his own link and lands in his own account, concluding
 *                  the link is broken -- which is exactly what happened
 *   the invitee    already has a Strolium account in another company, clicks
 *                  the link, lands in that other company and reports that
 *                  nothing happened
 *
 * Neither can be resolved by joining automatically: you cannot join a company
 * you are already in, and one account holds one membership. So this states what
 * the link is and offers the only two things that make sense -- sign out and
 * use it as the invited person, or dismiss it and carry on.
 *
 * Dismissing strips ?code= from the URL so a refresh does not bring it back.
 */
export default function JoinLinkNotice({ code, companyName, onDismiss, onLogout }) {
  return (
    <div className="jln" role="dialog" aria-modal="true" aria-labelledby="jln-t">
      <div className="jln__box">
        <div className="jln__icon"><UserPlus size={19} /></div>
        <h2 className="jln__t" id="jln-t">Bu taklif havolasi</h2>
        <p className="jln__b">
          Havola kodi: <b className="jln__code">{code}</b>
        </p>
        <p className="jln__b">
          Siz allaqachon{companyName ? ` “${companyName}”` : ""} kompaniyasidasiz.
          Bitta hisob bitta kompaniyaga tegishli, shuning uchun bu havola siz uchun
          ishlamaydi.
        </p>
        <p className="jln__b jln__b--hint">
          Havolani taklif qilayotgan odamingizga yuboring — u ro'yxatdan o'tib,
          shu havola orqali kompaniyangizga qo'shiladi.
        </p>

        <button className="jln__pay" onClick={onLogout} type="button">
          <LogOut size={16} /> Chiqish va boshqa hisob bilan qo'shilish
        </button>
        <button className="jln__later" onClick={onDismiss} type="button">
          <X size={14} /> Yopish
        </button>
      </div>
    </div>
  );
}
