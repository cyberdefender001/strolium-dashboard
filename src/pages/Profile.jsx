import { useEffect, useRef, useState, useCallback } from "react";
import {
  User, Mail, KeyRound, Send, Check, LogOut, ChevronDown, Pencil,
  FileText, ShieldCheck,
} from "lucide-react";
import {
  getProfile,
  setProfileName,
  addEmailLogin,
  changePassword,
  requestEmailCode,
  startTelegramLink,
  logoutEverywhere,
} from "../api/emailauth";
import { getLegalDoc } from "../api/client";
import Oferta from "./Oferta";

// The cabinet. Every user has one, whichever door they came through.
//
// The section that matters most is "Saytga kirish": someone who joined via the
// bot has no email login, so the website is shut to them. Adding an email here
// attaches a second door to the SAME member row -- same company, same role, same
// data. It is the only way the two populations (bot-first, web-first) stop being
// separate.

const T = {
  uz: {
    edit: "Tahrirlash",
    footHelp: "Savol bo'lsa, Yordam bo'limiga yozing.",
    sWeb: "Elektron pochta orqali kirish",
    sPw: "Parolni yangilash",
    sTg: "Bot xabar yuborishi uchun ulang",
    sDoc: "Ommaviy oferta · v1.2",
    sSec: "Barcha qurilmalardan chiqish",
    title: "Profil",
    you: "Siz",
    name: "Ism familiya",
    save: "Saqlash",
    saved: "Saqlandi",
    role: "Rol",
    company: "Kompaniya",
    noCompany: "Kompaniyaga qo'shilmagan",
    webTitle: "Saytga kirish",
    webHave: "Email va parol bilan kira olasiz",
    webNeed:
      "Hozir siz faqat Telegram orqali kirasiz. Email qo'shsangiz, kompyuterdan ham kirasiz — bir xil kompaniya, bir xil ma'lumot.",
    email: "Email",
    sendCode: "Kod olish",
    code: "Emailga kelgan kod",
    password: "Parol",
    addEmail: "Emailni qo'shish",
    pwTitle: "Parolni o'zgartirish",
    oldPw: "Hozirgi parol",
    newPw: "Yangi parol",
    change: "O'zgartirish",
    tgTitle: "Telegram",
    tgYes: "Telegram ulangan — bot xabar yuborishi mumkin",
    tgNo: "Telegram ulanmagan. Bot sizga vazifa va eslatma yubora olmaydi.",
    tgLink: "Telegramni ulash",
    secTitle: "Xavfsizlik",
    secBody: "Telefoningiz yo'qolgan yoki birga ishlatilgan kompyuterda kirgan bo'lsangiz — barcha qurilmalardan chiqing.",
    secBtn: "Barcha qurilmalardan chiqish",
    secDone: "Barcha sessiyalar bekor qilindi. Qaytadan kiring.",
    tgOpen: "Telegram ochildi — botda Start bosing, keyin bu sahifani yangilang.",
    codeSent: "Kod yuborildi",
    done: "Bajarildi",
  },
  ru: {
    edit: "Изменить",
    footHelp: "Есть вопрос — напишите в Помощь.",
    sWeb: "Вход по электронной почте",
    sPw: "Обновить пароль",
    sTg: "Подключите, чтобы бот писал",
    sDoc: "Публичная оферта · v1.2",
    sSec: "Выйти на всех устройствах",
    title: "Профиль",
    you: "Вы",
    name: "Имя и фамилия",
    save: "Сохранить",
    saved: "Сохранено",
    role: "Роль",
    company: "Компания",
    noCompany: "Не в компании",
    webTitle: "Вход на сайт",
    webHave: "Вы можете входить по email и паролю",
    webNeed:
      "Сейчас вы входите только через Telegram. Добавьте email — сможете входить и с компьютера, та же компания и данные.",
    email: "Email",
    sendCode: "Получить код",
    code: "Код из письма",
    password: "Пароль",
    addEmail: "Добавить email",
    pwTitle: "Смена пароля",
    oldPw: "Текущий пароль",
    newPw: "Новый пароль",
    change: "Изменить",
    tgTitle: "Telegram",
    tgYes: "Telegram подключён — бот может присылать сообщения",
    tgNo: "Telegram не подключён. Бот не сможет присылать задачи и напоминания.",
    tgLink: "Подключить Telegram",
    secTitle: "Безопасность",
    secBody: "Если телефон потерян или вы входили на общем компьютере — выйдите на всех устройствах.",
    secBtn: "Выйти на всех устройствах",
    secDone: "Все сессии отменены. Войдите снова.",
    tgOpen: "Telegram открыт — нажмите Start в боте, затем обновите страницу.",
    codeSent: "Код отправлен",
    done: "Готово",
  },
  en: {
    edit: "Edit",
    footHelp: "Any questions, write to Support.",
    sWeb: "Sign in with email",
    sPw: "Update your password",
    sTg: "Connect so the bot can message you",
    sDoc: "Public offer · v1.2",
    sSec: "Sign out on every device",
    title: "Profile",
    you: "You",
    name: "Full name",
    save: "Save",
    saved: "Saved",
    role: "Role",
    company: "Company",
    noCompany: "Not in a company",
    webTitle: "Website access",
    webHave: "You can sign in with email and password",
    webNeed:
      "Right now you only sign in through Telegram. Add an email and you can sign in from a computer too — same company, same data.",
    email: "Email",
    sendCode: "Send code",
    code: "Code from your email",
    password: "Password",
    addEmail: "Add email",
    pwTitle: "Change password",
    oldPw: "Current password",
    newPw: "New password",
    change: "Change",
    tgTitle: "Telegram",
    tgYes: "Telegram connected — the bot can message you",
    tgNo: "Telegram not connected. The bot cannot send you tasks or reminders.",
    tgLink: "Connect Telegram",
    secTitle: "Security",
    secBody: "If your phone is lost, or you signed in on a shared computer — sign out everywhere.",
    secBtn: "Sign out on all devices",
    secDone: "All sessions revoked. Please sign in again.",
    tgOpen: "Telegram opened — press Start in the bot, then refresh this page.",
    codeSent: "Code sent",
    done: "Done",
  },
};

// One collapsible section. The page previously showed six fully-expanded cards,
// so finding anything meant scrolling past everything else, and the contract --
// the only item that gates anything -- sat at the very bottom.
//
// `note` is the point of the collapsed state: the row has to say what is inside
// without being opened, or collapsing just hides information.
function Fold({ title, sub, note, pill, pillKind, icon, iconKind, open, onToggle, children }) {
  return (
    <section className={"prof__fold" + (open ? " is-open" : "")}>
      <button className="prof__foldhead" onClick={onToggle} type="button">
        {icon ? (
          <span className={"prof__foldicon" + (iconKind ? " prof__foldicon--" + iconKind : "")}>
            {icon}
          </span>
        ) : null}
        <span className="prof__foldtt">
          <span className="prof__foldtitle">{title}</span>
          {sub ? <span className="prof__foldsub">{sub}</span> : null}
        </span>
        {/* A state gets a pill; an identifier stays plain text. "Tasdiqlangan" is
            a state and should read at a glance; an email address is not. */}
        {pill ? (
          <span className={"prof__pill" + (pillKind ? " prof__pill--" + pillKind : "")}>
            {pill}
          </span>
        ) : note ? (
          <span className="prof__foldnote">{note}</span>
        ) : null}
        <ChevronDown size={16} className="prof__foldchev" />
      </button>
      {open && <div className="prof__foldbody">{children}</div>}
    </section>
  );
}


export default function Profile({ lang = "uz", onLogout }) {
  const t = T[lang] || T.uz;
  const [p, setP] = useState(null);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);
  // null = still loading, true/false = whether the current oferta needs signing.
  const [ofertaDue, setOfertaDue] = useState(null);
  const [canSign, setCanSign] = useState(true);
  // Accordion: one open at a time. Starts on the contract, since an unsigned
  // contract is the only thing here that blocks anything.
  const [editName, setEditName] = useState(false);
  const okTimer = useRef(null);

  // Every success toast goes through here. It used to live inside run(), which
  // meant anything setting the message directly -- the oferta callback below did
  // -- got a toast with no timer attached and it sat on screen forever.
  const showOk = useCallback((msg) => {
    setOk(msg);
    clearTimeout(okTimer.current);
    okTimer.current = setTimeout(() => setOk(""), 3500);
  }, []);
  // Cancel a pending clear if the component unmounts first.
  useEffect(() => () => clearTimeout(okTimer.current), []);
  // Nothing is expanded on arrival. The contract used to open itself, which
  // made the page land on a wall of legal text before the reader had chosen
  // anything.
  const [openKey, setOpenKey] = useState("");
  // Derived, not stored: three facts the page already loads, expressed as the
  // things still to do. ofertaDue is null while it loads, and an unknown state
  // must not be reported as incomplete, so it counts as done until it answers.
  const fold = (k) => ({
    open: openKey === k,
    onToggle: () => setOpenKey(openKey === k ? "" : k),
  });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [oldPw, setOldPw] = useState("");
  const [chgPw, setChgPw] = useState("");

  const load = async () => {
    try {
      const d = await getProfile();
      setP(d);
      setName(d.name || "");
    } catch (e) {
      setErr(e.message || "Xatolik");
    }
  };
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const d = await getLegalDoc("oferta");
        // During a trial the contract is read-only: the server refuses to record
        // an acceptance, so the UI must not offer one.
        setCanSign(d.can_sign !== false);
        // `accepted.current` is true only when the stored hash matches the text
        // published now, so an edited or bumped document asks again.
        if (alive) setOfertaDue(!(d.accepted && d.accepted.current));
      } catch {
        // Never block the profile page over this.
        if (alive) setOfertaDue(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    load();
  }, []);

  const run = async (fn, okMsg) => {
    setErr("");
    setOk("");
    setBusy(true);
    try {
      await fn();
      if (okMsg) showOk(okMsg);
    } catch (e) {
      setErr(e.message || "Xatolik");
    } finally {
      setBusy(false);
    }
  };

  if (!p) return <div className="prof"><p className="hint">…</p></div>;

  return (
    <div className="prof">
      <h2 className="prof__title">{t.title}</h2>

      <section className="prof__card">
        <div className="prof__head">
          <div className="prof__avatar">
            <User size={18} />
          </div>
          <div className="prof__who">
            {editName ? (
              // The field appears only when asked for. Showing a permanently
              // filled input plus a Saqlash button next to the name it already
              // displays asked the user to re-enter something they had set.
              <div className="prof__row">
                <input
                  className="eauth__input"
                  value={name}
                  autoFocus
                  onChange={(e) => setName(e.target.value)}
                />
                <button
                  className="prof__btn"
                  disabled={busy || name.trim().length < 2}
                  onClick={() =>
                    run(async () => {
                      await setProfileName(name.trim());
                      setEditName(false);
                    }, t.saved)
                  }
                  type="button"
                >
                  {t.save}
                </button>
              </div>
            ) : (
              <div className="prof__namerow">
                <div className="prof__name">{p.name || t.you}</div>
              </div>
            )}
            <div className="prof__meta">
              {p.role || "—"}
              {p.company ? ` · ${p.company}` : ` · ${t.noCompany}`}
            </div>
          </div>

          {/* At the right-hand end rather than tucked against the name: the card
              spans the page now, and an icon floating mid-row left the whole
              right half empty. */}
          {!editName && (
            <button
              className="prof__editbtn"
              onClick={() => { setName(p.name || ""); setEditName(true); }}
              type="button"
            >
              <Pencil size={14} /> {t.edit}
            </button>
          )}
        </div>
      </section>

      {/* Identity spans the full width above; from here the page is two
          columns. The contract is several times taller than any other section,
          so it owns the right column instead of pushing the short rows down. */}
      {/* One grid, not two stacks. Two columns of accordions left one side
          ending far short of the other, and the expanded panel was trapped in
          a half-width column. Tiles flow; an open panel spans the whole row. */}
      <div className="prof__grid">

      <Fold {...fold("web")} title={t.webTitle} icon={<Mail size={16} />} iconKind="acct" sub={t.sWeb} note={p.email || ""}>
        {p.has_email_login ? (
          <p className="prof__good">
            <Check size={15} /> {t.webHave}
            {p.email ? ` — ${p.email}` : ""}
          </p>
        ) : (
          <>
            <p className="prof__sub">{t.webNeed}</p>
            <label className="eauth__label">{t.email}</label>
            <div className="prof__row">
              <input
                className="eauth__input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ism@kompaniya.uz"
              />
              <button
                className="prof__btn"
                disabled={busy || !email.trim()}
                onClick={() =>
                  run(async () => {
                    await requestEmailCode(email.trim(), "signup", lang);
                    setSent(true);
                  }, t.codeSent)
                }
                type="button"
              >
                <Send size={14} /> {t.sendCode}
              </button>
            </div>

            {sent && (
              <>
                <label className="eauth__label">{t.code}</label>
                <input
                  className="eauth__input eauth__input--code"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••••"
                />
                <label className="eauth__label">{t.password}</label>
                <input
                  className="eauth__input"
                  type="password"
                  autoComplete="new-password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                />
                <button
                  className="eauth__primary"
                  disabled={busy || code.length < 6 || !newPw}
                  onClick={() =>
                    run(async () => {
                      await addEmailLogin(email.trim(), code.trim(), newPw);
                      setSent(false);
                      setCode("");
                      setNewPw("");
                      await load();
                    }, t.done)
                  }
                  type="button"
                >
                  <Mail size={15} /> {t.addEmail}
                </button>
              </>
            )}
          </>
        )}
      </Fold>

      {p.has_email_login && (
        <Fold {...fold("pw")} title={t.pwTitle} icon={<KeyRound size={16} />} iconKind="acct" sub={t.sPw}>
          <label className="eauth__label">{t.oldPw}</label>
          <input
            className="eauth__input"
            type="password"
            autoComplete="current-password"
            value={oldPw}
            onChange={(e) => setOldPw(e.target.value)}
          />
          <label className="eauth__label">{t.newPw}</label>
          <input
            className="eauth__input"
            type="password"
            autoComplete="new-password"
            value={chgPw}
            onChange={(e) => setChgPw(e.target.value)}
          />
          <button
            className="eauth__primary"
            disabled={busy || !oldPw || !chgPw}
            onClick={() =>
              run(async () => {
                await changePassword(oldPw, chgPw);
                setOldPw("");
                setChgPw("");
              }, t.done)
            }
            type="button"
          >
            <KeyRound size={15} /> {t.change}
          </button>
        </Fold>
      )}

      <Fold {...fold("tg")} title={t.tgTitle} icon={<Send size={16} />} iconKind="tg" sub={t.sTg}
        pill={p.has_telegram ? "Ulangan" : "Ulanmagan"}
        pillKind={p.has_telegram ? "ok" : "warn"}>
        <p className={p.has_telegram ? "prof__good" : "prof__sub"}>
          {p.has_telegram ? <Check size={15} /> : null} {p.has_telegram ? t.tgYes : t.tgNo}
        </p>
        {!p.has_telegram && (
          <button
            className="eauth__primary"
            disabled={busy}
            onClick={() =>
              run(async () => {
                const d = await startTelegramLink();
                if (d.link) window.open(d.link, "_blank", "noopener");
              }, t.tgOpen)
            }
            type="button"
          >
            <Send size={15} /> {t.tgLink}
          </button>
        )}
      </Fold>

      {/* Rendered UNCONDITIONALLY. The previous version only appeared once a
          separate fetch had resolved, and when that fetch never settled the
          result was nothing on screen at all -- no card, no error, no clue. The
          Oferta component reports its own state (loading, loaded, failed), so
          there is always something visible to act on or to diagnose. */}

      <Fold {...fold("oferta")} title={"Foydalanish shartnomasi"} icon={<FileText size={16} />} iconKind="doc" sub={t.sDoc}
        pill={ofertaDue === false ? "Tasdiqlangan" : (ofertaDue === true ? "Tasdiqlanmagan" : null)}
        pillKind={ofertaDue === false ? "ok" : "warn"}>
        <Oferta
          inline
          readOnly={canSign === false}
          onAccepted={() => { setOfertaDue(false); showOk("Shartnoma tasdiqlandi."); }}
        />
      </Fold>

      {/* Sessions last 30 days. Before this there was no way to end one early
          except disabling the member, which also removes their access to the
          company -- so a lost phone meant choosing between a live session and
          locking someone out of their job. */}
      <Fold {...fold("sec")} title={t.secTitle} icon={<ShieldCheck size={16} />} iconKind="sec" sub={t.sSec}>
        <p className="prof__sub">{t.secBody}</p>
        <button
          className="prof__btn"
          disabled={busy}
          onClick={() =>
            run(async () => {
              await logoutEverywhere();
              // The current session is revoked too, so staying on the page would
              // 401 on the next request. Send them to a clean login.
              onLogout && onLogout();
            }, t.secDone)
          }
          type="button"
        >
          <LogOut size={15} /> {t.secBtn}
        </button>
      </Fold>
      </div>

      {ok && (
        <div className="prof__toast" role="status">
          <Check size={15} /> {ok}
        </div>
      )}
      {err && <p className="login__err">{err}</p>}

      {/* The content simply stopped before, leaving a third of the window grey
          with no indication the page had ended. */}
      <p className="prof__foot">{t.footHelp}</p>
    </div>
  );
}
