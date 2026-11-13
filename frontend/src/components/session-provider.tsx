"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { API_URL, apiFetch } from "@/lib/api";
import { translate, type AppLanguage } from "@/lib/language";

export type SessionUser = { id: string; name: string; email: string; avatar_data?: string; notify_uptime?: boolean; notify_security?: boolean; preferred_language?: string; country?: string; timezone?: string };
type SessionState = "loading" | "authenticated" | "guest" | "unavailable";
type SessionContextValue = { user: SessionUser | null; state: SessionState; refresh: () => Promise<void>; setPreferredLanguage: (language: AppLanguage) => void; logout: () => Promise<void> };
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

  const setPreferredLanguage = useCallback((language: AppLanguage) => {
    setUser(current => current ? { ...current, preferred_language: language } : current);
  }, []);

  useEffect(() => {
    void refresh();
    const handleSessionChange = () => { void refresh(); };
    window.addEventListener("sentinel-session-changed", handleSessionChange);
    return () => window.removeEventListener("sentinel-session-changed", handleSessionChange);
  }, [refresh]);

  useEffect(() => {
    if (state !== "unavailable") return;
    const interval = window.setInterval(() => { void refresh(); }, 15000);
    return () => window.clearInterval(interval);
  }, [state, refresh]);

  const value = useMemo(() => ({ user, state, refresh, setPreferredLanguage, logout }), [user, state, refresh, setPreferredLanguage, logout]);
  return <SessionContext.Provider value={value}>{children}<StartupLoader/></SessionContext.Provider>;
}

function StartupLoader() {
  const { state } = useSession();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (state === "loading") {
      setVisible(true);
      return;
    }
    const timeout = window.setTimeout(() => setVisible(false), 520);
    return () => window.clearTimeout(timeout);
  }, [state]);

  if (!visible) return null;
  return <div className={`startup-screen ${state === "loading" ? "" : "is-leaving"}`} role="status" aria-label="Loading">
    <div className="startup-dots" aria-hidden="true">
      <span/>
      <span/>
      <span/>
    </div>
  </div>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used within SessionProvider");
  return context;
}

export function useAppLanguage() {
  const { user } = useSession();
  const language: AppLanguage = user?.preferred_language === "bn" ? "bn" : "en";
  const t = useCallback((text: string) => translate(language, text), [language]);
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  return { language, t };
}
