import { API_BASE } from "./config";

// Web auth = Telegram Login Widget.
//
// The user clicks "Log in with Telegram"; Telegram hands us a signed payload; the
// backend verifies that signature, finds the member row for that telegram_id and
// issues a session token carrying it. Because the backend's get_current_member now
// accepts that token, a web user reaches exactly the data their Telegram account is
// entitled to -- their own org, their own role.
//
// NOTE: the old email/password login (boss@demo.uz) and the offline demo fallback
// have been REMOVED on purpose. They logged anyone in and then showed fabricated
// numbers when the backend was unreachable -- unacceptable in a product whose whole
// claim is "these are the real leaks in your budget". If the backend is down, the
// user must see an error, not invented data.

const KEY = "strolium_user";

export async function loginWithTelegram(tgPayload) {
  const r = await fetch(`${API_BASE}/api/web/auth/telegram`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tgPayload),
  });

  if (r.status === 403) {
    const e = await r.json().catch(() => ({}));
    throw new Error(
      e.detail || "Bu Telegram akkaunt hech qanday kompaniyaga biriktirilmagan."
    );
  }
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.detail || `Kirishda xatolik (${r.status})`);
  }

  const d = await r.json();
  const user = {
    name: d.name,
    company: d.company,
    role: d.role,
    accessLevel: d.access_level,
    orgId: d.org_id,
    token: d.token,
  };
  localStorage.setItem(KEY, JSON.stringify(user));
  return user;
}

export function currentUser() {
  try {
    return JSON.parse(localStorage.getItem(KEY));
  } catch {
    return null;
  }
}

export function authToken() {
  const u = currentUser();
  return u && u.token;
}

export function logout() {
  localStorage.removeItem(KEY);
}

// ---- phone login (shared computers) ----------------------------------------
// The widget's session lives in telegram.org cookies -- on a shared office
// computer whoever logged in first stays logged in for everyone, and there is
// no widget API to log out. This flow moves identity to the user's OWN phone:
// site mints a one-time code, user taps the t.me link, their Telegram app
// confirms, the site polls until the backend hands back the same session
// payload the widget path produces.

export async function requestLoginCode() {
  const r = await fetch(`${API_BASE}/api/web/auth/code`, { method: "POST" });
  if (!r.ok) throw new Error(`Kod olishda xatolik (${r.status})`);
  const d = await r.json();
  return d.code;
}

export async function pollLoginCode(code) {
  const r = await fetch(`${API_BASE}/api/web/auth/code/${code}`);
  if (!r.ok) throw new Error(`Xatolik (${r.status})`);
  const d = await r.json();
  if (d.status === "ok") {
    const user = {
      name: d.name,
      company: d.company,
      role: d.role,
      accessLevel: d.access_level,
      orgId: d.org_id,
      token: d.token,
    };
    localStorage.setItem(KEY, JSON.stringify(user));
    return { status: "ok", user };
  }
  return d; // {status: pending | expired | error, detail?}
}
