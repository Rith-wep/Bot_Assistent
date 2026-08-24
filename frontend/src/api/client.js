import { getSupabase } from "../lib/supabase";

const responseCache = new Map();
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
let accessTokenProvider = null;

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function authHeaders() {
  const providedToken = accessTokenProvider?.();
  if (providedToken) return { Authorization: `Bearer ${providedToken}` };

  const {
    data: { session },
    error,
  } = await getSupabase().auth.getSession();
  if (error || !session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

export function setAccessTokenProvider(provider) {
  accessTokenProvider = provider;
}

function notifyUnauthorized() {
  window.dispatchEvent(new Event("auth:unauthorized"));
}

function cacheKey(path, auth) {
  return `${auth ? "auth" : "public"}:${path}`;
}

export function getCachedApiData(path, { auth = true } = {}) {
  return responseCache.get(cacheKey(path, auth));
}

export function invalidateApiCache(prefix = "") {
  for (const key of responseCache.keys()) {
    if (!prefix || key.includes(`:${prefix}`)) responseCache.delete(key);
  }
}

export async function prefetchApi(path, options = {}) {
  if (getCachedApiData(path, options) !== undefined) return;
  try {
    await apiFetch(path, options);
  } catch {
    // Prefetch should never interrupt navigation.
  }
}

export async function apiFetch(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) Object.assign(headers, await authHeaders());

  const response = await fetch(`${API_BASE_URL}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) return null;

  let data = null;
  try {
    data = await response.json();
  } catch {
    // The API may return no JSON body for infrastructure-level failures.
  }

  if (!response.ok) {
    if (auth && response.status === 401) notifyUnauthorized();
    const message = data?.detail || `Request failed (${response.status})`;
    throw new ApiError(message, response.status);
  }

  if (method === "GET") {
    responseCache.set(cacheKey(path, auth), data);
  } else {
    const resource = `/${path.replace(/^\//, "").split("/")[0]}`;
    invalidateApiCache(resource);
  }

  return data;
}

export async function downloadFile(path, filename) {
  const response = await fetch(`${API_BASE_URL}/api${path}`, { headers: await authHeaders() });
  if (!response.ok) {
    if (response.status === 401) notifyUnauthorized();
    throw new ApiError(`Download failed (${response.status})`, response.status);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
