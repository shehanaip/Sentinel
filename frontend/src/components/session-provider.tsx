"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { API_URL, apiFetch } from "@/lib/api";

export type SessionUser = { id: string; name: string; email: string; avatar_data?: string; notify_uptime?: boolean; notify_security?: boolean; preferred_language?: string; country?: string; timezone?: string };
type SessionState = "loading" | "authenticated" | "guest" | "unavailable";
type SessionContextValue = { user: SessionUser | null; state: SessionState; refresh: () => Promise<void>; logout: () => Promise<void> };
const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [state, setState] = useState<SessionState>("loading");

  const refresh = useCallback(async () => {
    const controller = new AbortController();
    let timedOut = false;
    const timeout = window.setTimeout(() => { timedOut = true; controller.abort(); }, 5000);
    try {
      const response = await fetch(`${API_URL}/api/auth/me/`, { credentials: "include", cache: "no-store", signal: controller.signal });
      if (response.status === 401 || response.status === 403) { setUser(null); setState("guest"); return; }
      if (!response.ok) throw new Error("Session lookup failed");
      setUser(await response.json()); setState("authenticated");
    } catch {
      if (timedOut || !controller.signal.aborted) { setUser(null); setState("unavailable"); }
    } finally { window.clearTimeout(timeout); }
  }, []);

  const logout = useCallback(async () => {
    const response = await apiFetch("/api/auth/logout/", { method: "POST" });
    if (!response.ok && response.status !== 401 && response.status !== 403) throw new Error("Could not sign out. Please try again.");
    setUser(null); setState("guest");
  }, []);

  useEffect(() => {
    void refresh();
    const handleSessionChange = () => { void refresh(); };
    window.addEventListener("sentinel-session-changed", handleSessionChange);
    return () => window.removeEventListener("sentinel-session-changed", handleSessionChange);
  }, [refresh]);

  const value = useMemo(() => ({ user, state, refresh, logout }), [user, state, refresh, logout]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used within SessionProvider");
  return context;
}
