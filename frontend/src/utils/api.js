const API_BASE = (import.meta.env.VITE_API_BASE || "http://localhost:4000").replace(/\/+$/, "");
const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 15000);
const ACCESS_TOKEN_KEY = "vindicate_access_token";
const REFRESH_TOKEN_KEY = "vindicate_refresh_token";
const CSRF_TOKEN_KEY = "vindicate_csrf_token";

let accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
let refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
let csrfToken = localStorage.getItem(CSRF_TOKEN_KEY);
let refreshHandler = null;

function persistSession() {
  if (accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }

  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  if (csrfToken) {
    localStorage.setItem(CSRF_TOKEN_KEY, csrfToken);
  } else {
    localStorage.removeItem(CSRF_TOKEN_KEY);
  }
}

function toError(status, payload) {
  const code = payload?.error?.code || "REQUEST_FAILED";
  const message = payload?.error?.message || `Request failed with status ${status}`;
  const error = new Error(message);
  error.code = code;
  error.status = status;
  error.details = payload?.error?.details;
  return error;
}

export function setRefreshHandler(handler) {
  refreshHandler = handler;
}

export function setSessionTokens({ access, refresh, csrf }) {
  accessToken = access ?? null;
  if (typeof refresh !== "undefined") {
    refreshToken = refresh ?? null;
  }
  if (typeof csrf !== "undefined") {
    csrfToken = csrf ?? null;
  }
  persistSession();
}

export function clearSessionTokens() {
  accessToken = null;
  refreshToken = null;
  csrfToken = null;
  persistSession();
}

export function getSessionTokens() {
  return {
    accessToken,
    refreshToken,
    csrfToken
  };
}

async function parseResponseBody(response) {
  const contentType = response.headers.get("content-type");
  if (!contentType?.includes("application/json")) {
    return null;
  }
  return response.json();
}

export async function apiRequest(path, options = {}) {
  const {
    method = "GET",
    body,
    headers = {},
    auth = true,
    skipRefresh = false
  } = options;

  const mergedHeaders = { ...headers };
  if (body !== undefined) {
    mergedHeaders["Content-Type"] = "application/json";
  }
  if (auth && accessToken) {
    mergedHeaders.Authorization = `Bearer ${accessToken}`;
  }
  if (csrfToken) {
    mergedHeaders["x-csrf-token"] = csrfToken;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  let response;
  let payload;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: mergedHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: "include",
      signal: controller.signal
    });
    payload = await parseResponseBody(response);
  } catch (error) {
    if (error?.name === "AbortError") {
      const timeoutError = new Error(`Request timed out after ${API_TIMEOUT_MS}ms`);
      timeoutError.code = "REQUEST_TIMEOUT";
      throw timeoutError;
    }
    const networkError = new Error(`Network request failed: ${error?.message ?? "unknown error"}`);
    networkError.code = "NETWORK_ERROR";
    throw networkError;
  } finally {
    clearTimeout(timeout);
  }

  if (
    response.status === 401 &&
    auth &&
    !skipRefresh &&
    typeof refreshHandler === "function"
  ) {
    const refreshed = await refreshHandler();
    if (refreshed) {
      return apiRequest(path, {
        ...options,
        skipRefresh: true
      });
    }
  }

  if (!response.ok) {
    throw toError(response.status, payload);
  }

  return payload?.data ?? payload;
}

export async function requestNonce(address) {
  return apiRequest("/auth/nonce", {
    method: "POST",
    body: { address },
    auth: false,
    skipRefresh: true
  });
}

export async function getHealth() {
  return apiRequest("/health", {
    method: "GET",
    auth: false,
    skipRefresh: true
  });
}

export async function verifySiwe(message, signature) {
  return apiRequest("/auth/verify", {
    method: "POST",
    body: { message, signature },
    auth: false,
    skipRefresh: true
  });
}

export async function refreshAuth() {
  return apiRequest("/auth/refresh", {
    method: "POST",
    body: refreshToken ? { refreshToken } : {},
    auth: false,
    skipRefresh: true
  });
}

export async function fetchMe() {
  return apiRequest("/auth/me", { method: "GET", auth: true });
}

export async function logoutSession(allSessions = false) {
  return apiRequest("/auth/logout", {
    method: "POST",
    body: {
      refreshToken,
      allSessions
    },
    auth: true,
    skipRefresh: true
  });
}

export async function issueCredential(payload) {
  return apiRequest("/credentials/issue", {
    method: "POST",
    body: payload
  });
}

export async function uploadCredential(payload) {
  return issueCredential(payload);
}

export async function revokeCredential(payload) {
  return apiRequest("/credentials/revoke", {
    method: "POST",
    body: payload
  });
}

export async function verifyCredential(hash) {
  return apiRequest(`/credentials/${hash}`, {
    method: "GET",
    auth: false
  });
}

export async function getIssuers({ institutionId, status } = {}) {
  const params = new URLSearchParams();
  if (institutionId) {
    params.set("institutionId", institutionId);
  }
  if (status) {
    params.set("status", status);
  }
  const query = params.toString();
  return apiRequest(`/issuers${query ? `?${query}` : ""}`, { method: "GET" });
}

export async function requestIssuerRole(institutionId) {
  return apiRequest("/issuers/request", {
    method: "POST",
    body: { institutionId }
  });
}

export async function assignRole(walletAddress, role, institutionId) {
  return apiRequest("/governance/roles/assign", {
    method: "POST",
    body: { walletAddress, role, institutionId }
  });
}

export async function requestInstitution(name, code) {
  return apiRequest("/institutions/requests", {
    method: "POST",
    body: { name, code }
  });
}

export async function listInstitutions(status) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiRequest(`/institutions${query}`, {
    method: "GET"
  });
}

export async function approveInstitution(id, adminWallet, reviewNotes) {
  return apiRequest(`/institutions/${id}/approve`, {
    method: "POST",
    body: { adminWallet, reviewNotes }
  });
}

export async function rejectInstitution(id, reviewNotes) {
  return apiRequest(`/institutions/${id}/reject`, {
    method: "POST",
    body: { reviewNotes }
  });
}

export async function approveIssuer(id, reviewNotes) {
  return apiRequest(`/issuers/${id}/approve`, {
    method: "POST",
    body: { reviewNotes }
  });
}

export async function rejectIssuer(id, reviewNotes) {
  return apiRequest(`/issuers/${id}/reject`, {
    method: "POST",
    body: { reviewNotes }
  });
}

export async function removeIssuer(id, reviewNotes) {
  return apiRequest(`/issuers/${id}/remove`, {
    method: "POST",
    body: { reviewNotes }
  });
}

export async function requestWalletRotation(newWalletAddress, reason) {
  return apiRequest("/governance/wallet-rotation/request", {
    method: "POST",
    body: { newWalletAddress, reason }
  });
}
