import { useEffect, useState } from "react";
import { Mail, ArrowLeft } from "lucide-react";
import {
  requestEmailCode,
  verifyEmailCode,
  emailSignup,
  emailLogin,
  emailResetPassword,
  saveEmailSession,
} from "../api/emailauth";

// Email account login/signup.
//
// The problem this solves: leads will not tap a Telegram bot link. This is the
// door they already recognise -- email and password.
//
// Flow, deliberately: login is email + password ONLY. A 6-digit code appears in
// exactly two places -- proving the address at signup, and proving it again to
// Matches OTP_TTL_MINUTES in app/security/webauth.py. The server is the real
// authority; this is only what we show, so if that value changes, change this.
const CODE_TTL_SEC = 10 * 60;
// Other services make you wait about a minute before resending. Same here.
const RESEND_AFTER_SEC = 60;

// reset a forgotten password. A code by itself never opens an account, or the
// password would be decorative.
//
// NOTE FOR WIRING: onLogin(session) receives the same object the Telegram login
// path returns ({token, name, role, access_level, company, org_id}), so it hands
// off to whatever your existing auth.js does with a session. No second format.

const T = {
  uz: {
    tabLogin: "Kirish",
    tabSignup: "Ro'yxatdan o'tish",
    email: "Email",
    password: "Parol",
    passwordAgain: "Parolni takrorlang",
    name: "Ism familiya",
    invite: "Taklif kodi",
    code: "Emailga kelgan 6 xonali kod",
    sendCode: "Kod olish",
    resend: "Kodni qayta yuborish",
    login: "Kirish",
    signup: "Hisob yaratish",
    forgot: "Parolni unutdingizmi?",
    reset: "Parolni tiklash",
    newPassword: "Yangi parol",
    back: "Orqaga",
    codeSent: "Kod yuborildi. Pochtangizni tekshiring.",
    mismatch: "Parollar mos kelmadi",
    needInvite: "Taklif kodi rahbaringizdan olinadi",
    checking: "Tekshirilmoqda…",
    sending: "Yuborilmoqda…",
    verify: "Tasdiqlash",
    codeStep: "Emailga kelgan 6 xonali kod",
    codeAt: "Kod yuborildi",
    changeEmail: "Emailni o'zgartirish",
    expiresIn: "Kod amal qiladi",
    expired: "Kod muddati tugadi. Yangi kod so'rang.",
    resendIn: "Qayta yuborish",
    lastStep: "Oxirgi qadam",
  },
  ru: {
    tabLogin: "Вход",
    tabSignup: "Регистрация",
    email: "Email",
    password: "Пароль",
    passwordAgain: "Повторите пароль",
    name: "Имя и фамилия",
    invite: "Код приглашения",
    code: "6-значный код из письма",
    sendCode: "Получить код",
    resend: "Отправить код ещё раз",
    login: "Войти",
    signup: "Создать аккаунт",
    forgot: "Забыли пароль?",
    reset: "Восстановить пароль",
    newPassword: "Новый пароль",
    back: "Назад",
    codeSent: "Код отправлен. Проверьте почту.",
    mismatch: "Пароли не совпадают",
    needInvite: "Код приглашения даёт ваш руководитель",
    checking: "Проверка…",
    sending: "Отправка…",
    verify: "Подтвердить",
    codeStep: "6-значный код из письма",
    codeAt: "Код отправлен",
    changeEmail: "Изменить email",
    expiresIn: "Код действителен",
    expired: "Срок кода истёк. Запросите новый.",
    resendIn: "Отправить снова",
    lastStep: "Последний шаг",
  },
  en: {
    tabLogin: "Sign in",
    tabSignup: "Create account",
    email: "Email",
    password: "Password",
    passwordAgain: "Repeat password",
    name: "Full name",
    invite: "Invite code",
    code: "6-digit code from your email",
    sendCode: "Send code",
    resend: "Send the code again",
    login: "Sign in",
    signup: "Create account",
    forgot: "Forgot your password?",
    reset: "Reset password",
    newPassword: "New password",
    back: "Back",
    codeSent: "Code sent. Check your email.",
    mismatch: "Passwords do not match",
    needInvite: "Your manager gives you the invite code",
    checking: "Checking…",
    sending: "Sending…",
    verify: "Verify",
    codeStep: "6-digit code from your email",
    codeAt: "Code sent",
    changeEmail: "Change email",
    expiresIn: "Code valid for",
    expired: "Code has expired. Request a new one.",
    resendIn: "Resend",
    lastStep: "Last step",
  },
};

export default function EmailAuth({ onLogin, lang = "uz" }) {
  const t = T[lang] || T.uz;

  // mode: 'login' | 'signup' | 'reset'
  const [mode, setMode] = useState("login");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);

  // Signup is three steps now, not one wall of fields. Every other service asks
  // for the email, THEN reveals the code box, THEN the rest -- showing code, name,
  // password and confirm-password together made it look like a form you had to
  // fill blind before you had even opened your inbox.
  //   1 = email   2 = code   3 = name + password
  const [step, setStep] = useState(1);
  const [left, setLeft] = useState(0);          // seconds the code is still valid

  // One ticker for the code's remaining life. It is display-only -- the server is
  // the authority on expiry -- but without it people stare at a dead code and
  // retype it instead of asking for a new one.
  useEffect(() => {
    if (left <= 0) return;
    const id = setInterval(() => setLeft((n) => (n > 0 ? n - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [left]);


  const reset = (next) => {
    setMode(next);
    setErr("");
    setNote("");
    setCode("");
    setCodeSent(false);
    setPassword("");
    setPassword2("");
    // Without these, switching Kirish <-> Ro'yxatdan o'tish mid-flow would drop you
    // back into step 2 or 3 with a stale countdown still running.
    setStep(1);
    setLeft(0);
  };

  const run = async (fn) => {
    setErr("");
    setNote("");
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setErr(e.message || "Xatolik");
    } finally {
      setBusy(false);
    }
  };

  const doSendCode = (purpose) =>
    run(async () => {
      await requestEmailCode(email.trim(), purpose, lang);
      setCodeSent(true);
      setCode("");
      setLeft(CODE_TTL_SEC);
      if (purpose === "signup") setStep(2);
      setNote(t.codeSent);
    });

  // Step 2 -> 3. verifyEmailCode checks the code WITHOUT consuming it, which is
  // what makes a separate step possible: a wrong code is caught here instead of
  // after someone has typed their name and password twice.
  const doVerifyCode = () =>
    run(async () => {
      await verifyEmailCode(email.trim(), code.trim(), "signup");
      setStep(3);
      setNote("");
    });

  const backToEmail = () => {
    setStep(1);
    setCodeSent(false);
    setCode("");
    setLeft(0);
    setErr("");
    setNote("");
  };

  const doLogin = () =>
    run(async () => {
      const session = await emailLogin(email.trim(), password);
      onLogin(saveEmailSession(session));
    });

  const doSignup = () =>
    run(async () => {
      if (password !== password2) throw new Error(t.mismatch);
      const session = await emailSignup({
        identifier: email.trim(),
        code: code.trim(),
        full_name: name.trim(),
        password,
        lang,
      });
      onLogin(saveEmailSession(session));
    });

  const doReset = () =>
    run(async () => {
      if (password !== password2) throw new Error(t.mismatch);
      const session = await emailResetPassword(email.trim(), code.trim(), password);
      onLogin(saveEmailSession(session));
    });

  return (
    <div className="login__form">
      {/* The lockup lives on the navy panel beside this form; repeating it here put
          the wordmark on screen twice, a hand's width apart. In login and signup
          the tab control below already names the action, so a heading would say
          "Kirish" directly above a selected tab reading "Kirish". Reset has no
          tabs, so it gets the heading. */}
      {mode === "reset" && <h2 className="eauth__head">{t.reset}</h2>}

      {mode !== "reset" ? (
        <div className="eauth__tabs">
          <button
            className={`eauth__tab${mode === "login" ? " is-on" : ""}`}
            onClick={() => reset("login")}
            type="button"
          >
            {t.tabLogin}
          </button>
          <button
            className={`eauth__tab${mode === "signup" ? " is-on" : ""}`}
            onClick={() => reset("signup")}
            type="button"
          >
            {t.tabSignup}
          </button>
        </div>
      ) : (
        <button className="eauth__back" onClick={() => reset("login")} type="button">
          <ArrowLeft size={14} /> {t.back}
        </button>
      )}

      {/* Once signup moves past step 1 the address is settled and shown in the
          summary block above, with its own "change email" link. Leaving the field
          here too put the same address on screen twice, one copy editable and one
          not. */}
      {!(mode === "signup" && step > 1) && (
        <>
          <label className="eauth__label">{t.email}</label>
          <input
            className="eauth__input"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ism@kompaniya.uz"
          />
        </>
      )}

      {mode === "login" && (
        <>
          <label className="eauth__label">{t.password}</label>
          <input
            className="eauth__input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !busy && doLogin()}
          />
          <button className="eauth__primary" onClick={doLogin} disabled={busy} type="button">
            {busy ? t.checking : t.login}
          </button>
          <button className="eauth__link" onClick={() => reset("reset")} type="button">
            {t.forgot}
          </button>
        </>
      )}

      {mode === "signup" && (
        <>
          {/* STEP 1 -- email only. */}
          {step === 1 && (
            <button
              className="eauth__primary"
              onClick={() => doSendCode("signup")}
              disabled={busy || !email.trim()}
              type="button"
            >
              <Mail size={15} /> {busy ? t.sending : t.sendCode}
            </button>
          )}

          {/* STEP 2 -- the code, on its own. Nothing else on screen, because
              nothing else can be done until the code is right. */}
          {step === 2 && (
            <>
              <div className="eauth__sent">
                {t.codeAt}: <b>{email.trim()}</b>
                <button className="eauth__inline" onClick={backToEmail} type="button">
                  {t.changeEmail}
                </button>
              </div>

              <label className="eauth__label">{t.codeStep}</label>
              <input
                className="eauth__input eauth__input--code"
                inputMode="numeric"
                maxLength={6}
                value={code}
                autoFocus
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="••••••"
              />

              <div className="eauth__timer">
                {left > 0 ? (
                  <>
                    {t.expiresIn}{" "}
                    <b>
                      {String(Math.floor(left / 60)).padStart(1, "0")}:
                      {String(left % 60).padStart(2, "0")}
                    </b>
                  </>
                ) : (
                  <span className="eauth__timer--dead">{t.expired}</span>
                )}
              </div>

              <button
                className="eauth__primary"
                onClick={doVerifyCode}
                disabled={busy || code.trim().length !== 6}
                type="button"
              >
                {busy ? t.checking : t.verify}
              </button>

              <button
                className="eauth__link"
                onClick={() => doSendCode("signup")}
                /* Resend stays locked for the first minute so a slow inbox does
                   not turn into four codes and a rate-limit block. */
                disabled={busy || left > CODE_TTL_SEC - RESEND_AFTER_SEC}
                type="button"
              >
                {left > CODE_TTL_SEC - RESEND_AFTER_SEC
                  ? `${t.resendIn} (${left - (CODE_TTL_SEC - RESEND_AFTER_SEC)})`
                  : t.resend}
              </button>
            </>
          )}

          {/* STEP 3 -- who you are and a password. The code is verified by now. */}
          {step === 3 && (
            <>
              <div className="eauth__sent">{t.lastStep}</div>

              <label className="eauth__label">{t.name}</label>
              <input
                className="eauth__input"
                value={name}
                autoFocus
                onChange={(e) => setName(e.target.value)}
              />

              <label className="eauth__label">{t.password}</label>
              <input
                className="eauth__input"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <label className="eauth__label">{t.passwordAgain}</label>
              <input
                className="eauth__input"
                type="password"
                autoComplete="new-password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
              />

              <button
                className="eauth__primary"
                onClick={doSignup}
                disabled={busy || !name.trim() || !password || !password2}
                type="button"
              >
                {busy ? t.checking : t.signup}
              </button>
            </>
          )}
        </>
      )}

      {mode === "reset" && (
        <>
          {!codeSent ? (
            <button
              className="eauth__primary"
              onClick={() => doSendCode("login")}
              disabled={busy || !email.trim()}
              type="button"
            >
              <Mail size={15} /> {busy ? t.sending : t.sendCode}
            </button>
          ) : (
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
              <label className="eauth__label">{t.newPassword}</label>
              <input
                className="eauth__input"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <label className="eauth__label">{t.passwordAgain}</label>
              <input
                className="eauth__input"
                type="password"
                autoComplete="new-password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
              />
              <button className="eauth__primary" onClick={doReset} disabled={busy} type="button">
                {busy ? t.checking : t.reset}
              </button>
            </>
          )}
        </>
      )}

      {note && <p className="eauth__note">{note}</p>}
      {err && <p className="login__err">{err}</p>}
    </div>
  );
}
