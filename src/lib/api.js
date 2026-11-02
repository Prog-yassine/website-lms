/** JSON client: access tokens live in memory; refresh tokens stay in HttpOnly cookies. */
export const API_BASE_URL = (process.env.REACT_APP_API_URL || "").replace(/\/+$/, "");
export const AUTH_SESSION_EVENT = "grupedia:auth-session";

let accessToken = null;
let sessionVersion = 0;
let activeRefresh = null;
const SIGNED_OUT_KEY = "grupedia:signed-out";

// This tab-scoped preference contains no credentials. It also keeps an offline logout
// from silently restoring an unrevoked HttpOnly cookie on the next page load.
export function setSignedOutPreference(signedOut) {
  try {
    if (signedOut) sessionStorage.setItem(SIGNED_OUT_KEY, "true");
    else sessionStorage.removeItem(SIGNED_OUT_KEY);
  } catch { /* Cookie auth can still work when browser storage is disabled. */ }
}

function explicitlySignedOut() {
  try { return sessionStorage.getItem(SIGNED_OUT_KEY) === "true"; } catch { return false; }
}

export class ApiError extends Error {
  constructor(message, status = 0, data = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

function aborted() {
  return new DOMException("The request was cancelled.", "AbortError");
}

function publishSession(user) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(AUTH_SESSION_EVENT, { detail: { user } }));
  }
}

export function setAccessToken(token) {
  if (token !== null && (typeof token !== "string" || !token.trim())) {
    throw new ApiError("The server did not return a valid session.", 502);
  }
  sessionVersion += 1;
  accessToken = token;
  if (activeRefresh) {
    const entry = activeRefresh;
    activeRefresh = null;
    entry.controller.abort();
  }
}

export function clearSession() {
  setAccessToken(null);
  publishSession(null);
}

export function isUserProfile(user) {
  return Boolean(user && typeof user === "object" && !Array.isArray(user) &&
    ((typeof user.id === "string" && user.id.trim()) ||
      (Number.isSafeInteger(user.id) && user.id >= 0) ||
      (typeof user.uuid === "string" && user.uuid.trim())) &&
    typeof user.email === "string" && user.email.trim());
}

export function isSessionResponse(data) {
  return Boolean(data && typeof data.token === "string" && data.token.trim() && isUserProfile(data.user));
}

async function requestJson(path, { method = "GET", body, signal, headers = {}, ...options } = {}, token = null) {
  if (typeof path !== "string" || !/^\/(?!\/)/.test(path)) {
    throw new ApiError("An API path beginning with / is required.");
  }
  if (signal?.aborted) throw aborted();
  const customHeaders = typeof headers.entries === "function" ? Object.fromEntries(headers.entries()) : headers;
  const requestHeaders = { Accept: "application/json", ...customHeaders };
  if (body !== undefined) requestHeaders["Content-Type"] = "application/json";
  if (token) requestHeaders.Authorization = `Bearer ${token}`;
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
      credentials: "include",
      signal,
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError("We couldn't reach the server. Check your connection and try again.");
  }
  if (signal?.aborted) throw aborted();
  let data = null;
  if (response.status !== 204) {
    try {
      data = await response.json();
    } catch {
      if (response.ok) throw new ApiError("The server returned an unexpected response. Please try again.", 502);
    }
  }
  if (!response.ok) {
    const message = typeof data?.error === "string" ? data.error :
      typeof data?.message === "string" ? data.message :
        response.status === 401 ? "Your session has expired. Please sign in again." : "Something went wrong. Please try again.";
    throw new ApiError(message.slice(0, 300), response.status, data);
  }
  if (signal?.aborted) throw aborted();
  if (data !== null && typeof data !== "object") {
    throw new ApiError("The server returned an unexpected response. Please try again.", 502);
  }
  return data;
}

function waitForRefresh(entry, signal) {
  if (signal?.aborted) return Promise.reject(aborted());
  entry.consumers += 1;
  return new Promise((resolve, reject) => {
    let finished = false;
    const finish = (callback, value) => {
      if (finished) return;
      finished = true;
      signal?.removeEventListener("abort", onAbort);
      entry.consumers -= 1;
      callback(value);
    };
    const onAbort = () => {
      finish(reject, aborted());
      if (!entry.consumers && activeRefresh === entry) {
        activeRefresh = null;
        entry.controller.abort();
      }
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    entry.promise.then((data) => finish(resolve, data), (error) => finish(reject, error));
    if (signal?.aborted) onAbort();
  });
}

/** A single cookie-based refresh serves concurrent expired requests. */
export function refreshAuth({ signal } = {}) {
  if (signal?.aborted) return Promise.reject(aborted());
  if (explicitlySignedOut()) {
    clearSession();
    return Promise.reject(new ApiError("You have signed out. Please sign in again.", 401));
  }
  if (!activeRefresh) {
    const version = sessionVersion;
    const entry = { controller: new AbortController(), consumers: 0, promise: null };
    activeRefresh = entry;
    entry.promise = requestJson("/api/auth/refresh", { method: "POST", signal: entry.controller.signal })
      .then((data) => {
        if (version !== sessionVersion || entry.controller.signal.aborted) throw aborted();
        if (!isSessionResponse(data)) {
          throw new ApiError("The server did not return a valid session. Please sign in again.", 401);
        }
        accessToken = data.token;
        publishSession(data.user);
        return data;
      })
      .catch((error) => {
        if (error.name === "AbortError") throw error;
        if (version !== sessionVersion) throw aborted();
        clearSession();
        if (error.status === 401) throw error;
        throw new ApiError("Your session could not be restored. Please sign in again.", 401);
      })
      .finally(() => {
        if (activeRefresh === entry) activeRefresh = null;
      });
  }
  return waitForRefresh(activeRefresh, signal);
}

/** Protected requests refresh once on 401, then retry once with the new access token. */
export async function apiRequest(path, { auth = true, retryAuth = true, ...options } = {}) {
  const requestVersion = sessionVersion;
  const publicAuthEndpoint = /^\/api\/auth\/(login|root|register|refresh)(?:\?|$)/.test(path);
  const initialToken = auth && !publicAuthEndpoint ? accessToken : null;
  try {
    return await requestJson(path, options, initialToken);
  } catch (error) {
    if (error.status !== 401 || !auth || !retryAuth || publicAuthEndpoint) throw error;
    if (requestVersion !== sessionVersion && !accessToken) throw error;
    if (options.signal?.aborted) throw aborted();
    // Another request may already have refreshed while this response was in flight.
    if (!accessToken || accessToken === initialToken) await refreshAuth({ signal: options.signal });
    const retryToken = accessToken;
    try {
      return await requestJson(path, options, retryToken);
    } catch (retryError) {
      if (retryError.status === 401 && accessToken === retryToken) clearSession();
      throw retryError;
    }
  }
}

/** Retained for public auth callers; these endpoints never trigger a refresh loop. */
export function postAuth(endpoint, body, options = {}) {
  return apiRequest(`/api/auth/${endpoint}`, { ...options, method: "POST", body, auth: false, retryAuth: false });
}
