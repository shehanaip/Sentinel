"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AppFrame } from "@/components/app-frame";
import { useSession } from "@/components/session-provider";
import { useTheme, type AccentPalette, type ThemeMode } from "@/components/theme-provider";
import { apiFetch } from "@/lib/api";

const paletteOptions: { id: AccentPalette; name: string; color: string; tint: string }[] = [
  { id: "emerald", name: "Emerald", color: "#0b9574", tint: "#d9f7ed" },
  { id: "blue", name: "Ocean blue", color: "#3978e8", tint: "#e1edff" },
  { id: "violet", name: "Violet", color: "#8257d7", tint: "#eee6ff" },
  { id: "rose", name: "Rose", color: "#db5379", tint: "#ffe5ed" },
];
const countries = ["Bangladesh", "United States", "United Kingdom", "Canada", "Australia", "India", "Pakistan", "Singapore", "United Arab Emirates", "Other"];
const timeZones = ["UTC", "Asia/Dhaka", "Asia/Kolkata", "Asia/Karachi", "Asia/Dubai", "Asia/Singapore", "Europe/London", "Europe/Paris", "America/New_York", "America/Chicago", "America/Los_Angeles", "Australia/Sydney"];

type Preferences = { name: string; avatar_data: string; notify_uptime: boolean; notify_security: boolean; preferred_language: string; country: string; timezone: string };
type SettingsSection = "account" | "notifications" | "region" | "appearance";

export default function SettingsPage() {
  const { theme, palette, setTheme, setPalette } = useTheme();
  const { user, refresh } = useSession();
  const [activeSection, setActiveSection] = useState<SettingsSection>("account");
  const [prefs, setPrefs] = useState<Preferences>({ name: user?.name || "", avatar_data: user?.avatar_data || "", notify_uptime: user?.notify_uptime ?? true, notify_security: user?.notify_security ?? true, preferred_language: user?.preferred_language || "en", country: user?.country || "", timezone: user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" });
  const [passwords, setPasswords] = useState({ current_password: "", new_password: "" });
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const photoRef = useRef<HTMLInputElement>(null);
  const zones = useMemo(() => [...new Set([...timeZones, prefs.timezone])].sort(), [prefs.timezone]);
  useEffect(() => { if (user) setPrefs({ name: user.name, avatar_data: user.avatar_data || "", notify_uptime: user.notify_uptime ?? true, notify_security: user.notify_security ?? true, preferred_language: user.preferred_language || "en", country: user.country || "", timezone: user.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" }); }, [user]);

  async function savePreferences(event?: FormEvent) {
    event?.preventDefault(); setBusy("profile"); setNotice(""); setError("");
    try {
      const response = await apiFetch("/api/auth/profile/", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(prefs) });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : Object.values(data).flat().join(" "));
      await refresh(); setNotice("Your preferences are saved.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save settings."); }
    finally { setBusy(""); }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault(); setBusy("password"); setNotice(""); setError("");
    try {
      const response = await apiFetch("/api/auth/password/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(passwords) });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : Object.values(data).flat().join(" "));
      setPasswords({ current_password: "", new_password: "" }); setNotice("Password changed successfully.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update password."); }
    finally { setBusy(""); }
  }

  async function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    setError("");
    if (!/image\/(jpeg|png|webp)/.test(file.type)) { setError("Choose a JPG, PNG, or WebP image."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Choose an image smaller than 5 MB."); return; }
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const img = new Image(); const url = URL.createObjectURL(file);
        img.onload = () => { const canvas = document.createElement("canvas"); const scale = Math.min(1, 512 / Math.max(img.width, img.height)); canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale); canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height); URL.revokeObjectURL(url); resolve(canvas.toDataURL("image/webp", .82)); };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("This image could not be opened.")); }; img.src = url;
      });
      setPrefs(p => ({ ...p, avatar_data: data }));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not read image."); }
  }

  return <AppFrame><main className="app-page app-page-with-sidebar"><div className="app-page-content settings-content">
    <div className="app-eyebrow">YOUR WORKSPACE</div><h1>Settings that feel like yours.</h1><p className="app-lede">Pick a section to manage your account, alerts, region, or appearance.</p>
    <nav className="settings-tabs" role="tablist" aria-label="Settings sections">{([{ id: "account", label: "Account", icon: "◉" }, { id: "notifications", label: "Notifications", icon: "♧" }, { id: "region", label: "Language & region", icon: "◎" }, { id: "appearance", label: "Appearance", icon: "◐" }] as { id: SettingsSection; label: string; icon: string }[]).map(tab => <button key={tab.id} id={`settings-tab-${tab.id}`} className={`settings-tab ${activeSection === tab.id ? "active" : ""}`} role="tab" aria-selected={activeSection === tab.id} aria-controls="settings-panel" onClick={() => setActiveSection(tab.id)}><span aria-hidden="true">{tab.icon}</span>{tab.label}</button>)}</nav>
    {(notice || error) && <div className={`app-alert ${error ? "error" : "success"}`} role={error ? "alert" : "status"}>{error || notice}</div>}
    <div id="settings-panel" className="settings-panel" role="tabpanel" aria-labelledby={`settings-tab-${activeSection}`}>
    {activeSection === "account" && <><form className="app-card settings-section settings-profile" onSubmit={savePreferences}><div className="settings-heading"><span className="settings-icon">✦</span><div><h2>Your profile</h2><p>Personalize the name and photo shown in your workspace.</p></div></div><div className="profile-edit"><button className="profile-photo-button" type="button" onClick={() => photoRef.current?.click()} aria-label="Choose profile photo">{prefs.avatar_data ? <img src={prefs.avatar_data} alt="Profile"/> : <span>{prefs.name.trim().charAt(0).toUpperCase() || "S"}</span>}<i>+</i></button><input ref={photoRef} className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={choosePhoto}/><div className="profile-photo-copy"><strong>Profile photo</strong><span>JPG, PNG, or WebP · up to 5 MB</span><button type="button" className="text-button" onClick={() => setPrefs(p => ({ ...p, avatar_data: "" }))}>Remove photo</button></div></div><div className="settings-form-grid"><label className="settings-field">Display name<input value={prefs.name} maxLength={120} onChange={e => setPrefs(p => ({ ...p, name: e.target.value }))} required/></label><label className="settings-field">Email address<input value={user?.email || ""} readOnly/><small>Email address is your account sign-in.</small></label></div><button className="app-primary settings-save" disabled={busy === "profile"}>{busy === "profile" ? "Saving…" : "Save profile"}</button></form><form className="app-card settings-section" onSubmit={changePassword}><div className="settings-heading"><span className="settings-icon">⌑</span><div><h2>Password & security</h2><p>Use a strong password with at least 12 characters.</p></div></div><div className="settings-form-grid"><label className="settings-field">Current password<input type="password" autoComplete="current-password" value={passwords.current_password} onChange={e => setPasswords(p => ({ ...p, current_password: e.target.value }))} required/></label><label className="settings-field">New password<input type="password" autoComplete="new-password" minLength={12} value={passwords.new_password} onChange={e => setPasswords(p => ({ ...p, new_password: e.target.value }))} required/></label></div><button className="app-primary settings-save" disabled={busy === "password"}>{busy === "password" ? "Updating…" : "Update password"}</button></form></>}
    {activeSection === "notifications" && <section className="app-card settings-section"><div className="settings-heading"><span className="settings-icon">♧</span><div><h2>Notifications</h2><p>Choose which monitoring emails Sentinel sends to {user?.email || "your account"}.</p></div></div><div className="settings-toggle-list"><label className="settings-toggle"><span><strong>Uptime alerts</strong><small>Get notified when a monitored site goes down or recovers.</small></span><input type="checkbox" checked={prefs.notify_uptime} onChange={e => setPrefs(p => ({ ...p, notify_uptime: e.target.checked }))}/></label><label className="settings-toggle"><span><strong>Security findings</strong><small>Receive alerts about new security or domain check findings.</small></span><input type="checkbox" checked={prefs.notify_security} onChange={e => setPrefs(p => ({ ...p, notify_security: e.target.checked }))}/></label></div><button className="app-primary settings-save" onClick={() => void savePreferences()} disabled={busy === "profile"}>{busy === "profile" ? "Saving…" : "Save notifications"}</button></section>}
    {activeSection === "region" && <section className="app-card settings-section"><div className="settings-heading"><span className="settings-icon">◎</span><div><h2>Language & region</h2><p>Set the language and local time Sentinel uses for your account.</p></div></div><div className="settings-form-grid"><label className="settings-field">Language<select value={prefs.preferred_language} onChange={e => setPrefs(p => ({ ...p, preferred_language: e.target.value }))}><option value="en">English</option><option value="bn">বাংলা (Bangla)</option></select></label><label className="settings-field">Country / region<select value={prefs.country} onChange={e => setPrefs(p => ({ ...p, country: e.target.value }))}><option value="">Choose a country</option>{countries.map(country => <option key={country}>{country}</option>)}</select></label><label className="settings-field">Time zone<select value={prefs.timezone} onChange={e => setPrefs(p => ({ ...p, timezone: e.target.value }))}>{zones.map(zone => <option key={zone} value={zone}>{zone.replaceAll("_", " ")}</option>)}</select><small>Used for times shown in your workspace.</small></label></div><button className="app-primary settings-save" onClick={() => void savePreferences()} disabled={busy === "profile"}>{busy === "profile" ? "Saving…" : "Save region"}</button></section>}
    {activeSection === "appearance" && <section className="app-card settings-section"><div className="settings-heading"><span className="settings-icon">◐</span><div><h2>Appearance</h2><p>Choose a workspace theme. Your choice updates cards, navigation, controls, charts, and page surfaces.</p></div></div><div className="theme-options" role="group" aria-label="Color theme">{(["light", "dark"] as ThemeMode[]).map(mode => <button key={mode} className={`theme-option ${theme === mode ? "chosen" : ""}`} onClick={() => setTheme(mode)} aria-pressed={theme === mode}><span className={`theme-preview ${mode}`}><i/><i/><i/></span><strong>{mode === "light" ? "Light" : "Dark"}</strong><span>{theme === mode ? "Selected" : "Choose"}</span></button>)}</div><h3 className="settings-subheading">Accent palette</h3><p className="settings-helper">Accent colors appear across buttons, highlights, chart lines, and active navigation.</p><div className="palette-options" role="group" aria-label="Accent color palette">{paletteOptions.map(option => <button key={option.id} className={`palette-option ${palette === option.id ? "chosen" : ""}`} onClick={() => setPalette(option.id)} aria-pressed={palette === option.id}><span className="palette-swatch" style={{ backgroundColor: option.color }}><i style={{ backgroundColor: option.tint }}/></span><strong>{option.name}</strong><span className="palette-check">{palette === option.id ? "Selected" : ""}</span></button>)}</div></section>}
    </div>
    <a className="app-back-link" href="/">Back to overview</a>
  </div></main></AppFrame>;
}
