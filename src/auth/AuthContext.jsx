import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, AUTH_SESSION_EVENT, apiRequest, clearSession, isSessionResponse, isUserProfile, postAuth, refreshAuth, setAccessToken, setSignedOutPreference } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState({ user: null, status: "loading" });
  const mounted = useRef(false);
  const controllers = useRef(new Set());
  const actionVersion = useRef(0);

  const trackRequest = useCallback((externalSignal) => {
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    if (externalSignal?.aborted) controller.abort();
    else externalSignal?.addEventListener("abort", onAbort, { once: true });
    controllers.current.add(controller);
    return {
      signal: controller.signal,
      release: () => {
        controllers.current.delete(controller);
        externalSignal?.removeEventListener("abort", onAbort);
      },
    };
  }, []);

  const refreshSession = useCallback(async ({ signal } = {}) => {
    const request = trackRequest(signal);
    try {
      const data = await refreshAuth({ signal: request.signal });
      if (mounted.current && !request.signal.aborted) {
        setSession({ user: data.user, status: "authenticated" });
      }
      return data.user;
    } catch (error) {
      if (error.name !== "AbortError" && mounted.current) {
        setSession({ user: null, status: "anonymous" });
      }
      throw error;
    } finally {
      request.release();
    }
  }, [trackRequest]);

  useEffect(() => {
    mounted.current = true;
    const pendingControllers = controllers.current;
    // Migrate away from the old browser-persisted access token.
    try { localStorage.removeItem("token"); } catch { /* Storage can be disabled without preventing cookie auth. */ }
    const onSession = (event) => {
      const user = event.detail?.user || null;
      setSession({ user, status: user ? "authenticated" : "anonymous" });
    };
    window.addEventListener(AUTH_SESSION_EVENT, onSession);
    refreshSession().catch(() => { /* An absent or expired refresh cookie is an anonymous session. */ });
    return () => {
      mounted.current = false;
      actionVersion.current += 1;
      window.removeEventListener(AUTH_SESSION_EVENT, onSession);
      pendingControllers.forEach((controller) => controller.abort());
      pendingControllers.clear();
      clearSession();
    };
  }, [refreshSession]);

  const login = useCallback(async (credentials, { signal } = {}) => {
    const version = ++actionVersion.current;
    const request = trackRequest(signal);
    // A pending bootstrap refresh must not overwrite this explicit login.
    setAccessToken(null);
    try {
      const data = await postAuth("login", credentials, { signal: request.signal });
      if (request.signal.aborted || version !== actionVersion.current) {
        throw new DOMException("The request was cancelled.", "AbortError");
      }
      if (!isSessionResponse(data)) {
        throw new ApiError("The server did not return a valid session. Please try again.", 502);
      }
      setSignedOutPreference(false);
      setAccessToken(data.token);
      if (mounted.current) setSession({ user: data.user, status: "authenticated" });
      return data.user;
    } catch (error) {
      if (error.name !== "AbortError" && mounted.current && version === actionVersion.current) {
        clearSession();
      }
      throw error;
    } finally {
      request.release();
    }
  }, [trackRequest]);

  const register = useCallback(async (payload, { signal } = {}) => {
    const request = trackRequest(signal);
    try {
      const data = await postAuth("register", payload, { signal: request.signal });
      if (!isUserProfile(data?.user)) {
        throw new ApiError("The server returned an unexpected registration response. Please try again.", 502);
      }
      return data;
    } finally {
      request.release();
    }
  }, [trackRequest]);

  const logout = useCallback(async () => {
    actionVersion.current += 1;
    const request = trackRequest();
    // Start with the current Bearer token, then clear local auth even if the network fails.
    const pending = apiRequest("/api/auth/logout", { method: "POST", retryAuth: false, signal: request.signal });
    setSignedOutPreference(true);
    clearSession();
    if (mounted.current) setSession({ user: null, status: "anonymous" });
    try {
      await pending;
    } catch {
      // The local session is already cleared; the server revokes the refresh cookie when reachable.
    } finally {
      request.release();
    }
  }, [trackRequest]);

  const value = useMemo(() => ({ ...session, login, register, logout, refreshSession }), [session, login, register, logout, refreshSession]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
