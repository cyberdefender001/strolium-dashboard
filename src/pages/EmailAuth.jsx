import { useState } from "react";
import { Mail, ArrowLeft } from "lucide-react";
import {
  requestEmailCode,
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

  const reset = (next) => {
    setMode(next);
    setErr("");
    setNote("");
    setCode("");
    setCodeSent(false);
    setPassword("");
    setPassword2("");
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
      setNote(t.codeSent);
    });

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
          {!codeSent ? (
            <button
              className="eauth__primary"
              onClick={() => doSendCode("signup")}
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

              <label className="eauth__label">{t.name}</label>
              <input
                className="eauth__input"
                value={name}
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

              <button className="eauth__primary" onClick={doSignup} disabled={busy} type="button">
                {busy ? t.checking : t.signup}
              </button>
              <button
                className="eauth__link"
                onClick={() => doSendCode("signup")}
                disabled={busy}
                type="button"
              >
                {t.resend}
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
