"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "@/components/session-provider";

const links = [
  { href: "/", label: "Overview", icon: "overview" },
  { href: "/websites", label: "Websites", icon: "websites" },
  { href: "/history", label: "Check history", icon: "history" },
  { href: "/security", label: "Security checks", icon: "security" },
  { href: "/email-marketing", label: "Email marketing", icon: "email" },
  { href: "/email-lookup", label: "Email lookup", icon: "lookup" },
  { href: "/seo", label: "SEO insights", icon: "seo" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

function NavIcon({ kind }: { kind: string }) {
  const paths: Record<string, ReactNode> = {
    overview: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/></>,
    websites: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.3 2.5 3.4 5.5 3.4 9S14.3 18.5 12 21c-2.3-2.5-3.4-5.5-3.4-9S9.7 5.5 12 3Z"/></>,
    history: <><path d="M4 7v5h5"/><path d="M5.2 16A8 8 0 1 0 5 8l-1 4"/><path d="M12 8v4l3 2"/></>,
    seo: <><path d="M4 19V5M4 19h16"/><path d="m7 15 4-5 3 2 5-6"/><path d="M16 6h3v3"/></>,
    security: <><path d="M12 3 20 6v5.3c0 4.8-3.2 8.4-8 10.7-4.8-2.3-8-5.9-8-10.7V6l8-3Z"/><path d="m8.5 12 2.3 2.3 4.8-4.8"/></>,
    email: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></>,
    lookup: <><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5M8.5 10.8h4.6M10.8 8.5v4.6"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.2 1-1.3 2.2-1.5-.6a8 8 0 0 1-1.7 1l-.3 1.6h-2.6l-.3-1.6a8 8 0 0 1-1.7-1l-1.5.6-1.3-2.2 1.2-1a8 8 0 0 1 0-2l-1.2-1 1.3-2.2 1.5.6a8 8 0 0 1 1.7-1l.3-1.6h2.6l.3 1.6a8 8 0 0 1 1.7 1l1.5-.6 1.3 2.2-1.2 1a8 8 0 0 1 0 2Z" transform="translate(-1 -1)"/></>,
  };
  return <svg className="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[kind]}</svg>;
}

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, state } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => setCollapsed(window.localStorage.getItem("sentinel-sidebar-collapsed") === "true"), []);
  function toggle() {
    setCollapsed((current) => {
      window.localStorage.setItem("sentinel-sidebar-collapsed", String(!current));
      return !current;
    });
  }
  return <div className={`app-frame ${collapsed ? "sidebar-collapsed" : ""}`}>
    <aside className="sidebar" aria-label="Sentinel workspace navigation">
      <div className="sidebar-brand-row"><a className="brand-lockup" href="/" aria-label="Sentinel home"><span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 40 40" fill="none"><path d="M20 3.5 34 9v9.2c0 8.5-5.6 14.7-14 18.3C11.6 32.9 6 26.7 6 18.2V9l14-5.5Z" fill="currentColor"/><path d="m13.3 20.1 4.2 4.2 9.3-9.4" stroke="#0d2431" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg></span><span className="brand-name">sentinel<span className="brand-period">.</span></span></a><button type="button" className="sidebar-toggle" onClick={toggle} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed} title={collapsed ? "Expand menu" : "Collapse menu"}><svg viewBox="0 0 24 24" aria-hidden="true"><path d={collapsed ? "m9 5 7 7-7 7" : "m15 5-7 7 7 7"}/></svg></button></div>
      <div className="workspace-chip"><span className="workspace-avatar">{user?.avatar_data ? <img src={user.avatar_data} alt=""/> : user?.name.trim().charAt(0).toUpperCase() || "S"}</span><span className="workspace-copy"><strong>{user?.name || (state === "loading" ? "Loading account" : "Sentinel workspace")}</strong><small>{user?.email || (state === "unavailable" ? "Account unavailable" : "Monitoring workspace")}</small></span></div>
      <nav className="side-nav" aria-label="Main navigation"><span className="nav-caption">WORKSPACE</span>{links.map((item) => { const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href); return <a key={item.href} className={`side-link ${active ? "active" : ""}`} href={item.href} title={item.label} aria-current={active ? "page" : undefined}><NavIcon kind={item.icon}/><span className="nav-label">{item.label}</span></a>; })}</nav>
      <div className="sidebar-footer"><div className="sidebar-help-icon"><NavIcon kind="seo"/></div><strong>Clear signals, in one place</strong><p>Uptime and site health tools for websites you manage.</p><a href={user ? "/settings" : "/login"}><NavIcon kind="settings"/><span className="nav-label">{user ? "Preferences" : "Sign in"}</span></a><div className="sidebar-version">SENTINEL MONITORING <span>LOCAL</span></div></div>
    </aside>
    <div className="app-frame-content">{children}</div>
  </div>;
}
