import { useEffect, useState } from "react";
import { Eye, Wallet, ClipboardCheck, Bot } from "lucide-react";
import { StroliumMark } from "../components/StroliumMark";
import { accountStatus, applyStatus, joinCompany, requestAccess, saveEmailSession } from "../api/emailauth";

// Shown to someone who has an account but belongs to no company yet.
//
// This screen is the whole reason open signup is safe: it holds NO company
// data, because the session behind it resolves to no member and every data
// endpoint refuses it server-side. What it shows is what Strolium does, plus
// the one action that can change their state -- redeeming an invite code.
//
// Two audiences land here and they need different next steps:
//   a worker/manager whose boss has a code for them  -> the code box
//   a boss evaluating the product                    -> the bot, where the
//     trial request and owner approval already live

const T = {
  uz: {
    hi: "Xush kelibsiz",
    lead: "Hisobingiz tayyor. Endi kompaniyangizga qo'shiling.",
    joinTitle: "Kompaniyaga qo'shilish",
    joinSub: "Rahbaringiz yoki nazoratchingiz bergan taklif kodini kiriting.",
    code: "Taklif kodi",
    join: "Qo'shilish",
    bossTitle: "Kompaniya rahbarimisiz?",
    bossSub: "Strolium'ni 14 kun bepul sinab ko'ring — karta kerak emas.",
    bossBtn: "Botda so'rov qoldirish",
    reqCompany: "Kompaniya nomi",
    reqPhone: "Telefon raqamingiz",
    reqCtrl: "Nazoratchi",
    reqWork: "Ishchi",
    reqMsg: "Qo'shimcha izoh",
    reqSend: "So'rov yuborish",
    reqOr: "yoki",
    reqDone: "So'rovingiz yuborildi. Tez orada bog'lanamiz.",
    waiting: "So'rovingiz ko'rib chiqilmoqda. Tasdiqlangach shu sahifa o'zi ochiladi.",
    reqNeedCompany: "Kompaniya nomini kiriting.",
    reqNeedSeats: "Kamida 1 foydalanuvchi kiriting.",
    what: "Strolium nima qiladi",
    f1t: "Vazifa va muddat",
    f1d: "Ishchiga vazifa berasiz, muddatini belgilaysiz, bajarilganini rasm bilan ko'rasiz.",
    f2t: "Pul nazorati",
    f2d: "Har bir xarajatni tekshiradi: takroriy to'lov, bo'lingan to'lov, shubhali yetkazib beruvchi.",
    f3t: "Hisobot",
    f3d: "Loyiha bo'yicha xarajat, smetadan oshib ketish, kunlik AI xulosa.",
    logout: "Chiqish",
  },
  ru: {
    hi: "Добро пожаловать",
    lead: "Аккаунт готов. Теперь присоединитесь к своей компании.",
    joinTitle: "Присоединиться к компании",
    joinSub: "Введите код приглашения от руководителя или контролёра.",
    code: "Код приглашения",
    join: "Присоединиться",
    bossTitle: "Вы руководитель компании?",
    bossSub: "Попробуйте Strolium 14 дней бесплатно — карта не нужна.",
    bossBtn: "Оставить заявку в боте",
    reqCompany: "Название компании",
    reqPhone: "Ваш телефон",
    reqCtrl: "Контролёры",
    reqWork: "Работники",
    reqMsg: "Комментарий",
    reqSend: "Отправить заявку",
    reqOr: "или",
    reqDone: "Заявка отправлена. Мы скоро свяжемся с вами.",
    waiting: "Заявка на рассмотрении. Эта страница откроется сама после одобрения.",
    reqNeedCompany: "Введите название компании.",
    reqNeedSeats: "Укажите минимум 1 пользователя.",
    what: "Что делает Strolium",
    f1t: "Задачи и сроки",
    f1d: "Ставите задачу работнику, задаёте срок, видите результат с фото.",
    f2t: "Контроль денег",
    f2d: "Проверяет каждый расход: дубли, дробление платежей, подозрительные поставщики.",
    f3t: "Отчёты",
    f3d: "Расходы по проектам, превышение сметы, ежедневная AI-сводка.",
    logout: "Выйти",
  },
  en: {
    hi: "Welcome",
    lead: "Your account is ready. Now join your company.",
    joinTitle: "Join a company",
    joinSub: "Enter the invite code your manager gave you.",
    code: "Invite code",
    join: "Join",
    bossTitle: "Are you the company owner?",
    bossSub: "Try Strolium free for 14 days — no card needed.",
    bossBtn: "Request access in the bot",
    reqCompany: "Company name",
    reqPhone: "Your phone number",
    reqCtrl: "Controllers",
    reqWork: "Workers",
    reqMsg: "Anything else",
    reqSend: "Send request",
    reqOr: "or",
    reqDone: "Request sent. We will get back to you shortly.",
    waiting: "Your request is being reviewed. This page will open by itself once approved.",
    reqNeedCompany: "Enter your company name.",
    reqNeedSeats: "Enter at least 1 user.",
    what: "What Strolium does",
    f1t: "Tasks and deadlines",
    f1d: "Assign work, set a deadline, see it done with photo proof.",
    f2t: "Money control",
    f2d: "Checks every expense: duplicates, split payments, suspicious vendors.",
    f3t: "Reports",
    f3d: "Spend by project, budget overruns, a daily AI brief.",
    logout: "Sign out",
  },
};

export default function NoCompany({ name, lang = "uz", botName, onJoined, onLogout }) {
  const t = T[lang] || T.uz;
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Access-request form. Kept separate from the invite-code state above so an
  // error in one never clears the other -- a boss who mistypes his phone should
  // not lose the code he already pasted.
  const [req, setReq] = useState({ company: "", phone: "", controllers: "", workers: "", message: "" });
  const [reqBusy, setReqBusy] = useState(false);
  const [reqErr, setReqErr] = useState("");
  const [reqSent, setReqSent] = useState(false);

  const setField = (k) => (e) => setReq((r) => ({ ...r, [k]: e.target.value }));

  // The owner approves out of band -- from the Mini App, minutes or hours later.
  // Nothing pushes that to this browser, and App.jsx decides which screen to show
  // from the STORED orgId, so before this poll existed a reload read the same
  // stale localStorage forever and the only way in was signing out and back in.
  //
  // Poll while this screen is open. 10s is frequent enough to feel immediate to
  // someone sitting and waiting, and it is one tiny authenticated GET.
  useEffect(() => {
    let alive = true;
    let timer = null;

    const check = async () => {
      try {
        const st = await accountStatus();
        if (!alive) return;
        if (st && st.has_company && st.org_id) {
          const user = applyStatus(st);
          if (user) {
            onJoined(user);   // unmounts this screen
            return;           // stop polling
          }
        }
      } catch (e) {
        // A dead session must NOT be waited on forever. 401/403 means the token
        // is invalid or its account was deleted -- polling that until the end of
        // time is exactly how a user ends up stuck on this screen through
        // reload after reload. Anything else (offline, 502) is transient, so
        // keep waiting: they may have left this tab open overnight.
        if (alive && (e.status === 401 || e.status === 403)) {
          onLogout();
          return;
        }
      }
      if (alive) timer = setTimeout(check, 10000);
    };

    check();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [onJoined, onLogout]);

  const sendRequest = async () => {
    setReqErr("");
    const company = req.company.trim();
    if (!company) { setReqErr(t.reqNeedCompany); return; }
    const controllers = parseInt(req.controllers, 10) || 0;
    const workers = parseInt(req.workers, 10) || 0;
    // The backend refuses seats < 1, so catch it here rather than showing the
    // user a server error for something the form can see.
    if (controllers + workers < 1) { setReqErr(t.reqNeedSeats); return; }
    setReqBusy(true);
    try {
      await requestAccess({
        company,
        phone: req.phone.trim(),
        controllers,
        workers,
        message: req.message.trim(),
        requester_role: "boss",
      });
      setReqSent(true);
    } catch (e) {
      setReqErr(e.message || "Xatolik");
    } finally {
      setReqBusy(false);
    }
  };

  const submit = async () => {
    setErr("");
    setBusy(true);
    try {
      const session = await joinCompany(code.trim(), lang);
      onJoined(saveEmailSession(session));
    } catch (e) {
      setErr(e.message || "Xatolik");
    } finally {
      setBusy(false);
    }
  };

  const features = [
    { icon: ClipboardCheck, title: t.f1t, body: t.f1d },
    { icon: Wallet, title: t.f2t, body: t.f2d },
    { icon: Eye, title: t.f3t, body: t.f3d },
  ];

  return (
    <div className="nocomp">
      <div className="nocomp__bar">
        <div className="login__logo">
          <div className="login__logo-mark">
            <StroliumMark size={20} />
          </div>
          <span className="login__logo-name">Strolium</span>
        </div>
        <button className="eauth__link nocomp__out" onClick={onLogout} type="button">
          {t.logout}
        </button>
      </div>

      <div className="nocomp__grid">
        <div className="nocomp__join">
          <p className="nocomp__hi">
            {t.hi}
            {name ? `, ${name}` : ""}
          </p>
          <h2 className="nocomp__lead">{t.lead}</h2>

          <div className="nocomp__card">
            <h3 className="nocomp__cardtitle">{t.joinTitle}</h3>
            <p className="nocomp__cardsub">{t.joinSub}</p>
            <label className="eauth__label">{t.code}</label>
            <input
              className="eauth__input"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && !busy && code.trim() && submit()}
              placeholder="XXXXXXXX"
            />
            <button
              className="eauth__primary"
              onClick={submit}
              disabled={busy || !code.trim()}
              type="button"
            >
              {busy ? "…" : t.join}
            </button>
            {err && <p className="login__err">{err}</p>}
          </div>

          <div className="nocomp__card nocomp__card--quiet">
            <h3 className="nocomp__cardtitle">{t.bossTitle}</h3>
            <p className="nocomp__cardsub">{t.bossSub}</p>

            {reqSent ? (
              <>
                <p className="eauth__note">{t.reqDone}</p>
                <p className="eauth__note">{t.waiting}</p>
              </>
            ) : (
              <>
                <label className="eauth__label">{t.reqCompany}</label>
                <input
                  className="eauth__input"
                  value={req.company}
                  onChange={setField("company")}
                />

                <label className="eauth__label">{t.reqPhone}</label>
                <input
                  className="eauth__input"
                  value={req.phone}
                  onChange={setField("phone")}
                  inputMode="tel"
                  placeholder="+998"
                />

                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label className="eauth__label">{t.reqCtrl}</label>
                    <input
                      className="eauth__input"
                      value={req.controllers}
                      onChange={setField("controllers")}
                      inputMode="numeric"
                      placeholder="0"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="eauth__label">{t.reqWork}</label>
                    <input
                      className="eauth__input"
                      value={req.workers}
                      onChange={setField("workers")}
                      inputMode="numeric"
                      placeholder="0"
                    />
                  </div>
                </div>

                <label className="eauth__label">{t.reqMsg}</label>
                <input
                  className="eauth__input"
                  value={req.message}
                  onChange={setField("message")}
                />

                <button
                  className="eauth__primary"
                  onClick={sendRequest}
                  disabled={reqBusy}
                  type="button"
                >
                  {reqBusy ? "…" : t.reqSend}
                </button>
                {reqErr && <p className="login__err">{reqErr}</p>}

                <p className="eauth__note" style={{ textAlign: "center" }}>{t.reqOr}</p>
              </>
            )}

            <a
              className="login__cta-btn"
              href={`https://t.me/${botName}`}
              target="_blank"
              rel="noreferrer"
            >
              <Bot size={15} /> {t.bossBtn}
            </a>
          </div>
        </div>

        <div className="nocomp__what">
          <h3 className="nocomp__whattitle">{t.what}</h3>
          {features.map((f) => (
            <div className="nocomp__feat" key={f.title}>
              <div className="nocomp__featicon">
                <f.icon size={17} />
              </div>
              <div>
                <div className="nocomp__feattitle">{f.title}</div>
                <p className="nocomp__featbody">{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
