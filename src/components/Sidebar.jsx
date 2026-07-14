import {
  ShieldCheck,
  Flag,
  Wallet,
  Building2,
  LogOut,
} from "lucide-react";
import { initials } from "../lib/format";

const NAV = [
  { key: "alerts", label: "Belgilar", icon: Flag, badgeKey: "openFlags" },
  { key: "money", label: "Pul nazorati", icon: Wallet },
  { key: "company", label: "Kompaniya", icon: Building2 },
];

export default function Sidebar({ active, onNav, user, openFlags, onLogout }) {
  return (
    <aside className="side">
      <div className="side__brand">
        <div className="side__mark">
          <ShieldCheck size={18} />
        </div>
        <span className="side__name">Strolium</span>
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
              onClick={() => onNav(item.key)}
            >
              <Icon size={17} />
              {item.label}
              {item.badgeKey === "openFlags" && openFlags > 0 && (
                <span className="badge">{openFlags}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="side__foot">
        <div className="side__user">
          <div className="avatar">{initials(user.name)}</div>
          <div>
            <div className="side__user-name">{user.name}</div>
            <div className="side__user-mail">{user.email}</div>
          </div>
        </div>
        <button className="logout" onClick={onLogout}>
          <LogOut size={15} /> Chiqish
        </button>
      </div>
    </aside>
  );
}
