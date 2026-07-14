import { API_BASE } from "../config";
import { authToken, logout } from "../auth";

// Every panel here is REAL data from the backend.
//
// The old version fell back to seed.js demo data whenever a request failed --
// silently. A boss whose token had expired, or whose server was down, would be
// shown FABRICATED fraud flags and budget figures with no indication they were
// fake. For a product that exists to tell people the truth about their money,
// that is the worst possible failure mode. It now throws, and the UI shows the
// error.

class AuthExpired extends Error {}
export { AuthExpired };

async function call(path, opts = {}) {
  const token = authToken();
  if (!token) throw new AuthExpired("not logged in");

  const r = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
      ...(opts.headers || {}),
    },
  });

  if (r.status === 401) {
    logout();
    throw new AuthExpired("Sessiya tugadi. Qaytadan kiring.");
  }
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.detail || `Xatolik (${r.status})`);
  }
  return r.json();
}

export async function getDashboard() {
  const real = await call("/api/web/dashboard");
  const a = real.audit || {};
  return {
    org: real.org,
    kpis: real.kpis,
    projects: real.projects,
    workers: real.workers,
    audit: {
      flags: a.flags || [],
      overview: a.overview || { leakageFlagged: 0, openFlags: 0 },
      trend: a.trend || [],
      reconciliation: a.reconciliation || [],
      budget: a.budget || [],
    },
    live: true,
  };
}

// ---- delivery documents (OCR + reconciliation) ----

function authHeaders() {
  return { Authorization: `Bearer ${authToken()}`, "Content-Type": "application/json" };
}

export async function extractDoc(imageB64, mime = "image/jpeg") {
  const r = await fetch(`${API_BASE}/api/web/docs/extract`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ image_b64: imageB64, mime }),
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.detail || `O'qishda xatolik (${r.status})`);
  }
  return r.json();
}

export async function saveDoc(payload) {
  const r = await fetch(`${API_BASE}/api/web/docs`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.detail || `Saqlashda xatolik (${r.status})`);
  }
  return r.json();
}

export async function listDocs() {
  const r = await fetch(`${API_BASE}/api/web/docs`, { headers: authHeaders() });
  if (!r.ok) throw new Error(`docs ${r.status}`);
  const d = await r.json();
  return d.docs || [];
}

// ---- AI estimates (Plan layer) ----

export async function extractEstimate(imageB64, mime = "image/jpeg") {
  const r = await fetch(`${API_BASE}/api/web/estimate/extract`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ image_b64: imageB64, mime }),
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.detail || `O'qishda xatolik (${r.status})`);
  }
  return r.json();
}

export async function saveEstimate(payload) {
  const r = await fetch(`${API_BASE}/api/web/estimates`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.detail || `Saqlashda xatolik (${r.status})`);
  }
  return r.json();
}

export async function listEstimates() {
  const r = await fetch(`${API_BASE}/api/web/estimates`, { headers: authHeaders() });
  if (!r.ok) throw new Error(`estimates ${r.status}`);
  const d = await r.json();
  return d.estimates || [];
}

// ---- live sync ----------------------------------------------------------
// The SAME /api/pulse the Mini App polls. A controller logs an expense on site;
// the boss is looking at this dashboard on a laptop. Without this he sees a stale
// budget and can commit money he no longer has.
//
// This is the payoff from the shared auth work: one endpoint, one truth, both
// clients -- the Mini App authenticates with Telegram initData, the web with its
// session token, and the backend resolves both to the same member.

export async function getPulse() {
  const d = await call("/api/pulse");
  return (d && d.parts) || null;
}

// ---- Xarajat (expenses) -------------------------------------------------
// These hit the SAME endpoints the Telegram Mini App uses. No web-specific fork:
// get_current_member accepts a web session or Telegram initData and resolves both
// to the same member, so there is exactly one implementation of the money logic.

export async function getSpend() {
  return call("/api/spend");
}

export async function listProjects() {
  const d = await call("/api/projects");
  return (d && d.projects) || [];
}

export async function addExpense(body) {
  return call("/api/expense", { method: "POST", body: JSON.stringify(body) });
}

// ---- Vazifalar (tasks) ---------------------------------------------------
// Same endpoints the Mini App manager view uses.

export async function getTasks() {
  return call("/api/manager/board");
}

export async function approveTask(task_id) {
  return call("/api/manager/approve", {
    method: "POST",
    body: JSON.stringify({ task_id }),
  });
}

// Rejecting is not just "no". The API requires feedback AND a new deadline --
// which is right: a rejection without a fix and a date is just a dead end for the
// worker. (An earlier version of this sent {reason} and would have 422'd.)
export async function rejectTask(task_id, feedback, deadline) {
  return call("/api/manager/reject", {
    method: "POST",
    body: JSON.stringify({ task_id, feedback, deadline }),
  });
}

export async function getTask(id) {
  return call(`/api/manager/task/${id}`);
}

export async function deleteTask(task_id) {
  return call("/api/manager/task/delete", {
    method: "POST",
    body: JSON.stringify({ task_id }),
  });
}

export async function getAssignees() {
  const d = await call("/api/manager/assignees");
  return (d && d.assignees) || [];
}

export async function createTask(tasks) {
  return call("/api/manager/assign", {
    method: "POST",
    body: JSON.stringify({ tasks }),
  });
}

// <img> and download links cannot send an Authorization header, so the session
// rides along as ?tg= -- the backend accepts it there.
export function fileUrl(id) {
  return `${API_BASE}/api/file/${id}?tg=${encodeURIComponent(authToken() || "")}`;
}

export function reportUrl(taskId, fmt) {
  return `${API_BASE}/api/manager/task/${taskId}/report?fmt=${fmt}&tg=${encodeURIComponent(
    authToken() || ""
  )}`;
}
