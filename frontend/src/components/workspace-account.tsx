"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppLanguage, useSession } from "@/components/session-provider";

export function WorkspaceAccount() {
  const router = useRouter();
  const { user, state, refresh, logout } = useSession();
  const { t } = useAppLanguage();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) { if (!root.current?.contains(event.target as Node)) setOpen(false); }
    function onKeyDown(event: KeyboardEvent) { if (event.key === "Escape") setOpen(false); }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("pointerdown", onPointerDown); document.removeEventListener("keydown", onKeyDown); };
  }, []);

  const name = user?.name || (state === "loading" ? t("Loading account") : state === "unavailable" ? t("Account unavailable") : t("Guest"));
  const initials = user?.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || (state === "guest" ? "G" : "S");
  async function signOut() {
    setError("");
    try { await logout(); setOpen(false); router.push("/login"); }
    catch (e) { setError(e instanceof Error ? e.message : t("Could not sign out.")); }
  }

  return <div className="workspace-account" ref={root}>
    <button className="workspace-account-trigger" type="button" aria-haspopup="menu" aria-expanded={open} aria-label={t("Account menu")} onClick={() => setOpen((value) => !value)}>
      <span className="account-avatar">{initials}</span><span className="account-trigger-copy"><strong>{name}</strong>{user && <small>{user.email}</small>}</span>
      <svg className="account-chevron" viewBox="0 0 20 20" aria-hidden="true"><path d="m5.5 7.5 4.5 4.5 4.5-4.5"/></svg>
    </button>
    {open && <div className="account-menu" role="menu" aria-label={t("Account menu")}>
      {user ? <><div className="account-menu-identity"><strong>{user.name}</strong><span>{user.email}</span></div><a role="menuitem" href="/websites" onClick={() => setOpen(false)}>{t("Websites")}</a><a role="menuitem" href="/settings" onClick={() => setOpen(false)}>{t("Preferences")}</a><button role="menuitem" type="button" onClick={() => void signOut()}>{t("Sign out")}</button></> : state === "unavailable" ? <><p className="account-menu-note">{t("Sentinel could not check your account.")}</p><button role="menuitem" type="button" onClick={() => void refresh()}>{t("Try again")}</button><a role="menuitem" href="/login" onClick={() => setOpen(false)}>{t("Sign in")}</a></> : state === "loading" ? <p className="account-menu-note" role="status">{t("Checking your account...")}</p> : <><a role="menuitem" href="/login" onClick={() => setOpen(false)}>{t("Sign in")}</a><a role="menuitem" href="/register" onClick={() => setOpen(false)}>{t("Create an account")}</a></>}
      {error && <p className="account-menu-error" role="alert">{error}</p>}
    </div>}
  </div>;
}
