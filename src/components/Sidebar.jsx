import {
  LifeBuoy,
  House,
  Flag,
  Wallet,
  Receipt,
  ListChecks,
  FolderKanban,
  Users,
  Building2,
  SlidersHorizontal,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { StroliumMark } from "./StroliumMark";
import { initials } from "../lib/format";

const NAV = [
  { key: "home", label: "Bosh sahifa", icon: House },
  { key: "alerts", label: "Belgilar", icon: Flag, badgeKey: "openFlags" },
  { key: "money", label: "Pul nazorati", icon: Wallet },
  { key: "tasks", label: "Vazifalar", icon: ListChecks, badgeKey: "review" },
  { key: "expenses", label: "Xarajatlar", icon: Receipt },
  { key: "projects", label: "Loyihalar", icon: FolderKanban },
  { key: "team", label: "Jamoa", icon: Users },
  { key: "company", label: "Kompaniya", icon: Building2 },
];

// Boshqaruv is owner-only and sits below a divider: it is not part of running a
// company, it is running the PRODUCT. The check here is convenience -- every
// /api/owner/* endpoint enforces _require_owner server-side, so hiding the item
// is not what keeps a manager out.
export default function Sidebar({ active, onNav, user, openFlags, isOwner, onLogout, open, onClose, mini, onToggleMini, onSupport }) {
  // On phones .side is a slide-out drawer (it used to be display:none, which
  // left the whole app with no navigation at all below 920px). The scrim sits
  // behind it and closes on tap.
  const pick = (key) => {
    onNav(key);
    if (onClose) onClose();
  };
  return (
    <>
    {open && <div className="side__scrim" onClick={onClose} />}
    <aside className={"side" + (open ? " is-open" : "")}>
      <div className="side__brand">
        {/* The designer's lockup, not mark + text: it has its own letterforms
            and spacing that a system font cannot reproduce. Collapsed, we fall
            back to the SVG mark, which the lockup cannot shrink to. */}
        <img className="side__lockup" src="/logo-lockup.png" alt="Strolium" />
        <span className="side__markonly"><StroliumMark size={26} /></span>
      </div>

      <div className="side__org">
        <div className="side__org-label">Kompaniya</div>
        <div className="side__org-name">{user.company}</div>
      </div>

      <nav className="side__nav">
        {NAV.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              className={"navitem" + (active === item.key ? " active" : "")}
              onClick={() => pick(item.key)}
            >
              <Icon size={17} />
              <span>{item.label}</span>
              {item.badgeKey === "openFlags" && openFlags > 0 && (
                <span className="badge">{openFlags}</span>
              )}
            </button>
          );
        })}
        {isOwner && (
          <button
            className={"navitem" + (active === "admin" ? " active" : "")}
            onClick={() => pick("admin")}
            style={{ marginTop: 10 }}
          >
            <SlidersHorizontal size={17} />
            <span>Boshqaruv</span>
          </button>
        )}
        {/* Collapse lives below the navigation: it is a setting touched rarely,
            so it should not sit above the items touched constantly. */}
        <button
          className="side__collapse"
          onClick={onToggleMini}
          type="button"
          aria-label={mini ? "Menyuni ochish" : "Menyuni yig'ish"}
          title={mini ? "Menyuni ochish" : "Menyuni yig'ish"}
        >
          {mini ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
          <span>Yig&#8217;ish</span>
        </button>
      </nav>

      <div className="side__foot">
        {/* The user block was static; it is the obvious place a person clicks
            looking for account settings, so it opens the profile. */}
        <button
          className={"side__user side__user--btn" + (active === "profile" ? " active" : "")}
          onClick={() => pick("profile")}
          type="button"
        >
          <div className="avatar">{initials(user.name)}</div>
          <div className="side__user-txt">
            <div className="side__user-name">{user.name}</div>
            <div className="side__user-mail">{user.email || "Profil"}</div>
          </div>
        </button>
        {/* Above Chiqish, because someone hunting for help should not have to pass
            the logout button to find it. */}
        {onSupport && (
          <button className="logout side__support" onClick={onSupport} title="Yordam" type="button">
            <LifeBuoy size={15} /> <span>Yordam</span>
          </button>
        )}
        <button className="logout" onClick={onLogout} title="Chiqish">
          <LogOut size={15} /> <span>Chiqish</span>
        </button>
      </div>
    </aside>
    </>
  );
}
