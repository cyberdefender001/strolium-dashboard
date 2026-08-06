import { Flag, ListChecks, Receipt, FolderKanban, Users, ArrowRight } from "lucide-react";
import { fmtSom } from "../lib/format";

// The website had no landing view: signing in dropped you straight into Belgilar
// with no sense of where you were. The Mini App has "Bosh sahifa" and this is its
// counterpart, built from the same numbers the board already loads.
//
// The hero is the money at risk, not a generic welcome banner. That is the one
// thing Strolium does that a spreadsheet does not, and it is what a boss opens
// the page to find out. Everything else on the page is deliberately quiet so
// that number is the thing you see first.
export default function Home({ user, data, onNav }) {
  const kpis = (data && data.kpis) || {};
  const flags = (data && data.audit && data.audit.flags) || [];

  // Sum only what the findings actually claim. A flag with no amount (a missing
  // document, say) still counts as a finding but must not read as 0 so'm lost.
  const atRisk = flags.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  const critical = flags.filter((f) => f.severity === "high" || f.severity === "critical").length;

  const name = (user && user.name) || "";
  const role = (user && user.role) || "";
  // data.org is an OBJECT -- {name, period} (web.py:206). Rendering it directly
  // threw "Objects are not valid as a React child" and blanked the whole app.
  const company = (data && data.org && data.org.name) || (user && user.company) || "";

  const cards = [
    {
      key: "tasks",
      icon: ListChecks,
      value: String(kpis.openTasks ?? 0),
      label: "Ochiq vazifalar",
    },
    {
      key: "expenses",
      icon: Receipt,
      value: fmtSom(kpis.totalSpend || 0, false),
      unit: "so'm",
      label: "Jami xarajat",
    },
    {
      key: "projects",
      icon: FolderKanban,
      value: String(kpis.projects ?? 0),
      label: "Faol obyektlar",
    },
    {
      key: "team",
      icon: Users,
      value: String(kpis.workers ?? 0),
      label: "Ishchilar",
    },
  ];

  return (
    <div className="home">
      <div className="home__hello">
        {company && <div className="home__org">{company}</div>}
        <h1 className="home__who">
          Xush kelibsiz{name ? ", " : ""}
          {name}
          {role && <span className="home__role"> — {role}</span>}
        </h1>
      </div>

      {/* Signature element: the figure the whole product exists to produce. */}
      <button
        type="button"
        className={"home__risk" + (flags.length ? " is-live" : " is-clear")}
        onClick={() => onNav("alerts")}
      >
        <div className="home__risk-top">
          <Flag size={15} />
          <span>Aniqlangan yo'qotish</span>
        </div>

        {flags.length ? (
          <>
            <div className="home__risk-sum">
              {fmtSom(atRisk, false)}
              <span className="home__risk-unit">so'm</span>
            </div>
            <div className="home__risk-sub">
              {flags.length} belgi
              {critical > 0 && <b> · {critical} jiddiy</b>}
            </div>
          </>
        ) : (
          <>
            <div className="home__risk-sum home__risk-sum--clear">Toza</div>
            {/* An empty screen is an invitation, not a shrug. */}
            <div className="home__risk-sub">
              Hozircha belgi yo'q. Xarajat kiritsangiz, Strolium har birini tekshiradi.
            </div>
          </>
        )}

        <span className="home__risk-go">
          Belgilarni ko'rish <ArrowRight size={14} />
        </span>
      </button>

      <div className="home__cards">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <button
              type="button"
              className="home__card"
              key={c.key}
              onClick={() => onNav(c.key)}
            >
              <div className="home__card-label">
                <Icon size={14} /> {c.label}
              </div>
              <div className="home__card-value">
                {c.value}
                {c.unit && <span className="home__card-unit">{c.unit}</span>}
              </div>
            </button>
          );
        })}
      </div>

      <div className="home__next">
        <div className="home__next-label">Keyingi qadam</div>
        <div className="home__next-row">
          <button type="button" onClick={() => onNav("expenses")}>
            Xarajat qo'shish
          </button>
          <button type="button" onClick={() => onNav("tasks")}>
            Vazifa yaratish
          </button>
          <button type="button" onClick={() => onNav("team")}>
            Jamoaga odam qo'shish
          </button>
        </div>
      </div>
    </div>
  );
}
