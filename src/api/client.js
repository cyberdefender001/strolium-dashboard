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
    const err = new Error(e.detail || `Xatolik (${r.status})`);
    err.status = r.status;
    throw err;
  }
  return r.json();
}

export async function getDashboard() {
  // 403 here means this ACCOUNT cannot use the panel at all (field workers --
  // the backend now enforces manager+ on /api/web/*), not that one request
  // failed. Keeping the session would trap the user on an error screen with no
  // way out, so drop it and surface the server's explanation on the login page.
  let real;
  try {
    real = await call("/api/web/dashboard");
  } catch (e) {
    if (e && e.status === 403) {
      logout();
      throw new AuthExpired(e.message);
    }
    throw e;
  }
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

// ---- Loyihalar (projects + budgets) ---------------------------------------
// Same endpoints the Mini App uses. Budgets are what Pul nazorati compares
// spending against -- a project without one is a blind spot.

export async function createProject({ name, address, budget, start_date, end_date }) {
  return call("/api/projects", {
    method: "POST",
    body: JSON.stringify({ name, address, budget, start_date, end_date }),
  });
}

export async function setProjectBudget(pid, { budget, start_date, end_date }) {
  return call(`/api/projects/${pid}/budget`, {
    method: "POST",
    body: JSON.stringify({ budget, start_date, end_date }),
  });
}

// ---- Jamoa (team) ---------------------------------------------------------
// Same endpoints and permission model as the Mini App: rename via manager,
// remove via owner-only, invites are role + optional uses cap -> link + code.

export async function getTeam() {
  return call("/api/manager/team");
}

export async function createInvite(level, max_uses) {
  return call("/api/manager/invite", {
    method: "POST",
    body: JSON.stringify({ level, max_uses: max_uses || null }),
  });
}

export async function renameMember(member_id, name) {
  return call("/api/manager/member/rename", {
    method: "POST",
    body: JSON.stringify({ member_id, name }),
  });
}

export async function deleteMember(member_id) {
  return call("/api/owner/member/delete", {
    method: "POST",
    body: JSON.stringify({ member_id }),
  });
}

export async function getMe() {
  return call("/api/me");
}

// ---- Ishchi (worker view) -------------------------------------------------
// The SAME /api/worker/* endpoints the Mini App's mywork page uses -- every one
// is scoped server-side to the assigned worker (task.assigned_to must match),
// so a worker can only ever see and touch their own tasks. No web fork.

export async function getWorkerBoard() {
  return call("/api/worker/board");
}

export async function getWorkerTask(id) {
  return call(`/api/worker/task/${id}`);
}

// data = base64 (dataURL accepted -- the backend strips the prefix)
export async function workerAddPhoto(taskId, data, caption) {
  return call(`/api/worker/task/${taskId}/photo`, {
    method: "POST",
    body: JSON.stringify({ data, mime: "image/jpeg", caption: caption || null }),
  });
}

export async function workerAddDocument(taskId, data, mime, name) {
  return call(`/api/worker/task/${taskId}/document`, {
    method: "POST",
    body: JSON.stringify({ data, mime: mime || "application/octet-stream", name }),
  });
}

export async function workerAddNote(taskId, text) {
  return call(`/api/worker/task/${taskId}/note`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export async function workerDeleteAttachment(id) {
  return call(`/api/worker/attachment/${id}`, { method: "DELETE" });
}

export async function workerSubmit(taskId) {
  return call(`/api/worker/task/${taskId}/submit`, { method: "POST" });
}

// Receipt OCR -- same endpoint the Mini App's Xarajat form uses. Soft-fails on
// the server (returns zeros) so the worker can always type the numbers in.
export async function scanReceipt(imageB64, mime = "image/jpeg") {
  return call("/api/expense/scan", {
    method: "POST",
    body: JSON.stringify({ image: imageB64, mime }),
  });
}

// ---- Boshqaruv (owner console) -------------------------------------------
// Cross-company administration. Every one of these endpoints already accepted a
// web Bearer session -- get_current_member resolves initData and session tokens to
// the same member -- so the browser console is the SAME console as the Mini App's,
// not a parallel one that can drift. _require_owner enforces the owner check
// server-side; hiding the nav item is convenience, not security.

export async function ownerOverview() {
  return call("/api/owner/overview");
}

export async function ownerCompany(orgId) {
  return call(`/api/owner/company/${orgId}`);
}

// days = the paid period being granted. Server floors it at 30 if absent.
export async function activateOrg(org_id, days) {
  return call("/api/owner/org/activate", {
    method: "POST",
    body: JSON.stringify({ org_id, days }),
  });
}

export async function ownerRequests() {
  return call("/api/owner/requests");
}

// trial_days is a per-company override. Omitting it makes the server fall back to
// app_settings['trial'] -- which is exactly what default_trial_days reports, so the
// input can be pre-filled with the truth instead of a hardcoded guess.
export async function approveRequest(id, trial_days) {
  return call("/api/owner/request/approve", {
    method: "POST",
    body: JSON.stringify({ id, trial_days: trial_days || null }),
  });
}

export async function rejectRequest(id) {
  return call("/api/owner/request/reject", {
    method: "POST",
    body: JSON.stringify({ id }),
  });
}

export async function getPricing() {
  const d = await call("/api/owner/pricing");
  return (d && d.pricing) || null;
}

export async function savePricing(pricing) {
  return call("/api/owner/pricing", {
    method: "POST",
    body: JSON.stringify(pricing),
  });
}

export async function ownerRenameMember(member_id, name) {
  return call("/api/owner/member/rename", {
    method: "POST",
    body: JSON.stringify({ member_id, name }),
  });
}

export async function setMemberStatus(member_id, status) {
  return call("/api/owner/member/status", {
    method: "POST",
    body: JSON.stringify({ member_id, status }),
  });
}
