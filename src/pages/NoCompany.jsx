import { useEffect, useState } from "react";
import { Eye, Wallet, ClipboardCheck, Bot } from "lucide-react";
import { StroliumMark } from "../components/StroliumMark";
import { accountStatus, applyStatus, joinCompany, requestAccess, saveEmailSession, startTelegramLink } from "../api/emailauth";

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

// Declared at module scope on purpose: a component defined inside another is a
// new type on every parent render, which remounts it. Harmless for an icon, but
// the rule holds everywhere in this codebase.
function Chev({ o }) {
  return (
    <svg
      className="nocomp__rowar"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: o ? "rotate(90deg)" : "none", transition: "transform .15s ease" }}
      aria-hidden="true"
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

const T = {
  uz: {
    title2: "Kompaniyangizni ulang",
    sub2: "So'rov qoldirasiz, biz bir ish kunida bog'lanamiz.",
    trial: "14 kun bepul · karta kerak emas",
    privacy: "Ma'lumotlaringiz uchinchi tomonga berilmaydi.",
    haveCode: "Taklif kodim bor",
    haveCodeSub: "Mavjud kompaniyaga qo'shilish",
    tgShort: "Botda ishlatgan bo'lsangiz, kompaniyangiz shu yerda ochiladi",
    botShort: "Telegram botida so'rov qoldirish",
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
    tgTitle: "Strolium'ni Telegramda ishlatganmisiz?",
    tgSub: "Unda yangi kompaniya so'rash shart emas. Telegram hisobingizni ulasangiz, mavjud kompaniyangiz shu yerda ochiladi.",
    tgBtn: "Telegram bilan ulash",
    tgOpen: "Telegramni ochish",
    tgStep: "Botda Start bosing — keyin bu sahifa o'zi ochiladi.",
    tgCode: "Kod",
    reqNeedCompany: "Kompaniya nomini kiriting.",
    reqNeedSeats: "Kamida 1 foydalanuvchi kiriting.",
    reqWho: "Siz kimsiz?",
    reqBoss: "Rahbar",
    reqCtrlRole: "Nazoratchi",
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
    title2: "Подключите свою компанию",
    sub2: "Оставьте заявку — мы свяжемся в течение рабочего дня.",
    trial: "14 дней бесплатно · карта не нужна",
    privacy: "Ваши данные не передаются третьим лицам.",
    haveCode: "У меня есть код приглашения",
    haveCodeSub: "Присоединиться к существующей компании",
    tgShort: "Если уже работали в боте — компания откроется здесь",
    botShort: "Оставить заявку в Telegram-боте",
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
    tgTitle: "Уже пользуетесь Strolium в Telegram?",
    tgSub: "Тогда новую компанию запрашивать не нужно. Подключите Telegram — ваша компания откроется здесь.",
    tgBtn: "Подключить Telegram",
    tgOpen: "Открыть Telegram",
    tgStep: "Нажмите Start в боте — страница откроется сама.",
    tgCode: "Код",
    reqNeedCompany: "Введите название компании.",
    reqNeedSeats: "Укажите минимум 1 пользователя.",
    reqWho: "Кто вы?",
    reqBoss: "Руководитель",
    reqCtrlRole: "Контролёр",
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
    title2: "Connect your company",
    sub2: "Send a request and we'll get in touch within one working day.",
    trial: "14 days free · no card needed",
    privacy: "Your details are not shared with third parties.",
    haveCode: "I have an invite code",
    haveCodeSub: "Join an existing company",
    tgShort: "If you already use the bot, your company opens here",
    botShort: "Leave a request in the Telegram bot",
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
    tgTitle: "Already using Strolium in Telegram?",
    tgSub: "Then you do not need a new company. Link your Telegram account and your existing company opens here.",
    tgBtn: "Link Telegram",
    tgOpen: "Open Telegram",
    tgStep: "Press Start in the bot — this page will open by itself.",
    tgCode: "Code",
    reqNeedCompany: "Enter your company name.",
    reqNeedSeats: "Enter at least 1 user.",
    reqWho: "Who are you?",
    reqBoss: "Owner",
    reqCtrlRole: "Controller",
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
  // The Mini App asks this too ("Kim: Rahbar / Nazoratchi") and the backend
  // already takes requester_role -- the web form was hardcoding "boss".
  const [role, setRole] = useState("boss");
  const [reqBusy, setReqBusy] = useState(false);
  const [reqErr, setReqErr] = useState("");
  const [reqSent, setReqSent] = useState(false);

  // Someone who has just gained a company must land on Bosh sahifa. The active
  // page lives in the URL hash now, so a hash left over from earlier browsing in
  // this same tab (#/expenses, say) would otherwise decide where they arrive --
  // which is why joining dropped you on Xarajatlar instead of the welcome page.
  const enter = (u) => {
    try { window.location.hash = "/home"; } catch { /* non-browser env */ }
    onJoined(u);
  };

  // Someone who is ALREADY a member via the bot must not request a second
  // company -- that is what produced duplicates. The backend can attach this
  // orphan account to the member they already are, but only if they prove they
  // own that Telegram account, which is what this link does. Profil is
  // unreachable from here (App renders NoCompany whenever there is no company),
  // so the button has to live on this screen or the fix cannot be triggered.
  const [tgBusy, setTgBusy] = useState(false);
  const [tgLink, setTgLink] = useState(null);
  const [tgCode, setTgCode] = useState(null);
  const [tgErr, setTgErr] = useState("");

  const linkTelegram = async () => {
    setTgErr("");
    setTgBusy(true);
    try {
      const r = await startTelegramLink();
      setTgLink((r && r.link) || null);
      setTgCode((r && r.code) || null);
      // No further action needed here: the status poll above notices the moment
      // the bot attaches the account and lets them straight in.
    } catch (e) {
      setTgErr(e.message || "Xatolik");
    } finally {
      setTgBusy(false);
    }
  };

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
            enter(user);   // unmounts this screen
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
        requester_role: role,
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
      enter(saveEmailSession(session));
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

  // Which exception panel is open, if any. Only one at a time: two open forms
  // under a third was the old layout's problem.
  const [open, setOpen] = useState(null);
  const toggle = (k) => () => setOpen((v) => (v === k ? null : k));

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

      <div className="nocomp__col">
        <p className="nocomp__eyebrow">
          {t.hi}
          {name ? `, ${name}` : ""}
        </p>
        <h1 className="nocomp__lead">{t.title2}</h1>
        <p className="nocomp__sub">{t.sub2}</p>
        <div>
          <span className="nocomp__badge"><i />{t.trial}</span>
        </div>

        {/* The request comes first: it is what most people landing here need. */}
        <div className="nocomp__card">
          {reqSent ? (
            <>
              <p className="eauth__note">{t.reqDone}</p>
              <p className="eauth__note">{t.waiting}</p>
            </>
          ) : (
            <>
              <label className="eauth__label">{t.reqWho}</label>
              <div className="nocomp__seg">
                {[["boss", t.reqBoss], ["controller", t.reqCtrlRole]].map(([val, lbl]) => (
                  <button
                    key={val}
                    type="button"
                    aria-pressed={role === val}
                    onClick={() => setRole(val)}
                  >
                    {lbl}
                  </button>
                ))}
              </div>

              <label className="eauth__label" htmlFor="nc-co">{t.reqCompany}</label>
              <input
                id="nc-co"
                className="eauth__input"
                value={req.company}
                onChange={setField("company")}
              />

              <label className="eauth__label" htmlFor="nc-ph">{t.reqPhone}</label>
              <input
                id="nc-ph"
                className="eauth__input"
                value={req.phone}
                onChange={setField("phone")}
                inputMode="tel"
                placeholder="+998"
              />

              <div className="nocomp__pair">
                <div>
                  <label className="eauth__label" htmlFor="nc-c">{t.reqCtrl}</label>
                  <input
                    id="nc-c"
                    className="eauth__input"
                    value={req.controllers}
                    onChange={setField("controllers")}
                    inputMode="numeric"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="eauth__label" htmlFor="nc-w">{t.reqWork}</label>
                  <input
                    id="nc-w"
                    className="eauth__input"
                    value={req.workers}
                    onChange={setField("workers")}
                    inputMode="numeric"
                    placeholder="0"
                  />
                </div>
              </div>

              <label className="eauth__label" htmlFor="nc-m">{t.reqMsg}</label>
              <input
                id="nc-m"
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
            </>
          )}
        </div>
        {!reqSent && <p className="nocomp__fine">{t.privacy}</p>}

        <div className="nocomp__sep">{t.reqOr}</div>

        {/* Exception 1: they were given a code. */}
        <button
          type="button"
          className={`nocomp__row${open === "code" ? " nocomp__row--open" : ""}`}
          onClick={toggle("code")}
          aria-expanded={open === "code"}
        >
          <span>
            <b>{t.haveCode}</b>
            <span>{t.haveCodeSub}</span>
          </span>
          <Chev o={open === "code"} />
        </button>
        {open === "code" && (
          <div className="nocomp__panel">
            <label className="eauth__label" htmlFor="nc-code">{t.code}</label>
            <input
              id="nc-code"
              className="eauth__input eauth__input--code"
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
        )}

        {/* Exception 2: they are already a member through the bot. Deliberately
            after the code row -- it is the rarer case of the two. */}
        <button
          type="button"
          className={`nocomp__row${open === "tg" ? " nocomp__row--open" : ""}`}
          onClick={toggle("tg")}
          aria-expanded={open === "tg"}
        >
          <span>
            <b>{t.tgBtn}</b>
            <span>{t.tgShort}</span>
          </span>
          <Chev o={open === "tg"} />
        </button>
        {open === "tg" && (
          <div className="nocomp__panel">
            <p className="nocomp__featbody" style={{ marginBottom: 14 }}>{t.tgSub}</p>
            {tgLink ? (
              <>
                <a className="login__cta-btn" href={tgLink} target="_blank" rel="noreferrer">
                  <Bot size={15} /> {t.tgOpen}
                </a>
                <p className="eauth__note">{t.tgStep}</p>
              </>
            ) : (
              <button
                className="eauth__primary"
                onClick={linkTelegram}
                disabled={tgBusy}
                type="button"
                style={{ marginTop: 0 }}
              >
                {tgBusy ? "…" : t.tgBtn}
              </button>
            )}
            {tgErr && <p className="login__err">{tgErr}</p>}
          </div>
        )}

        {/* Kept as a route of last resort: the bot is where trial requests
            originally lived, and someone who cannot finish the form above should
            still have a way through. */}
        <a
          className="nocomp__row"
          href={`https://t.me/${botName}`}
          target="_blank"
          rel="noreferrer"
        >
          <span>
            <b>{t.bossBtn}</b>
            <span>{t.botShort}</span>
          </span>
          <Bot size={16} className="nocomp__rowar" />
        </a>

        <div className="nocomp__what">
          <h2 className="nocomp__whattitle">{t.what}</h2>
          {features.map((f) => (
            <div className="nocomp__feat" key={f.title}>
              <div className="nocomp__featicon">
                <f.icon size={16} />
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
