import { useEffect, useRef, useState } from "react";
import { ShieldCheck, Smartphone } from "lucide-react";
import { loginWithTelegram, requestLoginCode, pollLoginCode } from "../auth";
import { TG_BOT } from "../config";

// Telegram Login Widget.
//
// Telegram injects its own <script> which renders the button. It calls a GLOBAL
// callback with the signed payload, so we hang one on window and clean it up on
// unmount. The payload is NOT trusted here -- the backend verifies its HMAC
// signature before issuing any session.
//
// If the button never appears, the cause is almost always that the site's domain
// is not registered with BotFather (/setdomain). Telegram silently refuses.

export default function Login({ onLogin }) {
  const holder = useRef(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // Phone login -- for shared computers, where the widget's telegram.org
  // cookie keeps the FIRST person logged in forever. phase: idle -> waiting.
  const [phone, setPhone] = useState({ phase: "idle", link: "" });
  const pollRef = useRef(null);

  const stopPoll = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  };
  useEffect(() => stopPoll, []);

  const startPhoneLogin = async () => {
    setErr("");
    stopPoll();
    try {
      const code = await requestLoginCode();
      const link = `https://t.me/${TG_BOT}?start=weblogin_${code}`;
      setPhone({ phase: "waiting", link });
      window.open(link, "_blank", "noopener");
      const started = Date.now();
      pollRef.current = setInterval(async () => {
        if (Date.now() - started > 5 * 60 * 1000) {
          stopPoll();
          setPhone({ phase: "idle", link: "" });
          setErr("Vaqt tugadi — qaytadan urinib ko'ring.");
          return;
        }
        try {
          const r = await pollLoginCode(code);
          if (r.status === "ok") {
            stopPoll();
            onLogin(r.user);
          } else if (r.status === "expired") {
            stopPoll();
            setPhone({ phase: "idle", link: "" });
            setErr("Havola eskirdi — qaytadan urinib ko'ring.");
          } else if (r.status === "error") {
            stopPoll();
            setPhone({ phase: "idle", link: "" });
            setErr(r.detail || "Kirishda xatolik.");
          }
        } catch {
          /* transient network hiccup -- keep polling until the deadline */
        }
      }, 2000);
    } catch (e) {
      setErr(e.message || "Kirishda xatolik.");
    }
  };

  useEffect(() => {
    window.onTelegramAuth = async (tgUser) => {
      setErr("");
      setBusy(true);
      try {
        const user = await loginWithTelegram(tgUser);
        onLogin(user);
      } catch (e) {
        setErr(e.message || "Kirishda xatolik.");
      } finally {
        setBusy(false);
      }
    };

    const s = document.createElement("script");
    s.src = "https://telegram.org/js/telegram-widget.js?22";
    s.async = true;
    s.setAttribute("data-telegram-login", TG_BOT);
    s.setAttribute("data-size", "large");
    s.setAttribute("data-radius", "10");
    s.setAttribute("data-onauth", "onTelegramAuth(user)");
    s.setAttribute("data-request-access", "write");
    if (holder.current) holder.current.appendChild(s);

    return () => {
      delete window.onTelegramAuth;
    };
  }, [onLogin]);

  return (
    <div className="login">
      <div className="login__brandside">
        <div className="login__logo">
          <div className="login__logo-mark">
            <ShieldCheck size={20} />
          </div>
          <span className="login__logo-name">Strolium</span>
        </div>

        <div>
          <h1 className="login__thesis">
            Qurilish budjetini <em>o'g'irlik va isrofdan</em> himoya qiluvchi AI.
          </h1>
          <p className="login__sub">
            Har bir somni buyurtmadan to'lovgacha kuzatadi. Yo'qotishni yo'q
            bo'lib ketishidan oldin aniqlaydi.
          </p>
        </div>

        <div className="login__meta">
          <div>
            <b>10–30%</b>
            budjet yo'qotilishi
          </div>
          <div>
            <b>24/7</b>
            avtomatik audit
          </div>
          <div>
            <b>AI</b>
            anomaliya aniqlash
          </div>
        </div>
      </div>

      <div className="login__formside">
        <div className="login__form">
          <h2>Tizimga kirish</h2>
          <p className="hint">Telegram akkauntingiz bilan kiring</p>

          <div ref={holder} style={{ margin: "22px 0 6px" }} />

          <div className="login__or">yoki</div>

          {phone.phase === "idle" ? (
            <button className="login__phone" onClick={startPhoneLogin}>
              <Smartphone size={15} /> Telefondagi Telegram orqali kirish
            </button>
          ) : (
            <div className="login__phonewait">
              <p className="hint">
                Telefoningizda Telegram ochildi — botda <b>Start</b> bosing.
                Tasdiqlangach bu sahifa o'zi ochiladi…
              </p>
              <a href={phone.link} target="_blank" rel="noreferrer">
                Havola ochilmadimi? Shu yerni bosing
              </a>
            </div>
          )}
          <p className="hint login__sharednote">
            Umumiy kompyuterdami? Telefon orqali kiring — har kim o'z
            akkauntidan kiradi.
          </p>

          {busy && <p className="hint">Tekshirilmoqda…</p>}
          <p className="login__err">{err}</p>

          <div className="login__demo">
            Strolium'dan foydalanish uchun kompaniyangiz rahbari sizni tizimga
            qo'shgan bo'lishi kerak.
          </div>
        </div>
      </div>
    </div>
  );
}
