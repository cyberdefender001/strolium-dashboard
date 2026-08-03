// Email account auth — add these to src/api/client.js (or import separately).
//
// These four calls are the whole email login/signup surface:
//   requestEmailCode  -> sends a 6-digit code to the address
//   verifyEmailCode   -> checks the code is right (does NOT log in)
//   emailSignup       -> code + invite + name + password  -> session
//   emailLogin        -> email + password                 -> session
//   emailResetPassword-> code + new password              -> session
//
// Login is email + password ONLY. A code alone never grants a session; it just
// proves the address belongs to the person during signup or a reset.

import { API_BASE } from "../config";

async function post(path, body) {
  const r = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    /* non-JSON error page (proxy, 502) -- fall through to the status message */
  }
  if (!r.ok) {
    const err = new Error(data.detail || `Xatolik (${r.status})`);
    err.status = r.status;
    throw err;
  }
  return data;
}

// purpose: "signup" for a new account, "login" for a password reset
export function requestEmailCode(identifier, purpose = "signup", lang = "uz") {
  return post("/api/web/account/request-code", { identifier, purpose, lang });
}

export function verifyEmailCode(identifier, code, purpose = "signup") {
  return post("/api/web/account/verify-code", { identifier, code, purpose });
}

export function emailSignup({ identifier, code, invite_code, full_name, password, lang = "uz" }) {
  return post("/api/web/account/signup", {
    identifier, code, invite_code, full_name, password, lang,
  });
}

export function emailLogin(identifier, password) {
  return post("/api/web/account/login", { identifier, password });
}

export function emailResetPassword(identifier, code, password) {
  return post("/api/web/account/set-password", { identifier, code, password });
}

// ---- session persistence -------------------------------------------------
// auth.js owns the "strolium_user" localStorage key and the field reshape
// (access_level -> accessLevel, org_id -> orgId). The email path MUST produce an
// identical stored user, or the app would treat an email login as a different
// kind of session. This mirrors that shape exactly rather than inventing a
// second one.

const KEY = "strolium_user";

export function saveEmailSession(d) {
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

// ---- company membership ---------------------------------------------------
// Signup grants an identity, not access. These two calls are what move an
// account from "no company" to "member of a company".

function authHeader() {
  try {
    const u = JSON.parse(localStorage.getItem(KEY));
    return u && u.token ? { Authorization: `Bearer ${u.token}` } : {};
  } catch {
    return {};
  }
}

export async function joinCompany(invite_code, lang = "uz") {
  const r = await fetch(`${API_BASE}/api/web/account/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ invite_code, lang }),
  });
  const text = await r.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    /* non-JSON error page */
  }
  if (!r.ok) {
    const err = new Error(data.detail || `Xatolik (${r.status})`);
    err.status = r.status;
    throw err;
  }
  return data;
}

export async function accountStatus() {
  const r = await fetch(`${API_BASE}/api/web/account/status`, { headers: authHeader() });
  if (!r.ok) throw new Error(`status ${r.status}`);
  return r.json();
}

// ---- profile / cabinet ----------------------------------------------------

export async function getProfile() {
  const r = await fetch(`${API_BASE}/api/web/account/profile`, { headers: authHeader() });
  if (!r.ok) throw new Error(`profile ${r.status}`);
  return r.json();
}

async function postAuthed(path, body) {
  const r = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    /* non-JSON error page */
  }
  if (!r.ok) {
    const err = new Error(data.detail || `Xatolik (${r.status})`);
    err.status = r.status;
    throw err;
  }
  return data;
}

export function setProfileName(full_name) {
  return postAuthed("/api/web/account/profile/name", { full_name });
}

// Gives a bot-first member an email + password so the website opens for them.
export function addEmailLogin(identifier, code, password) {
  return postAuthed("/api/web/account/profile/add-email", { identifier, code, password });
}

export function changePassword(old_password, new_password) {
  return postAuthed("/api/web/account/profile/password", { old_password, new_password });
}
