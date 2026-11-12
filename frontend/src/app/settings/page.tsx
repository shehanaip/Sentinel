"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AppFrame } from "@/components/app-frame";
import { useAppLanguage, useSession } from "@/components/session-provider";
import { useTheme, type AccentPalette, type ThemeMode } from "@/components/theme-provider";
import { apiFetch, readApiJson } from "@/lib/api";
import type { AppLanguage } from "@/lib/language";

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

function getResponseMessage(payload: Record<string, unknown>) {
  if (typeof payload.detail === "string") return payload.detail;
  return Object.values(payload).flatMap(value => Array.isArray(value) ? value : [value]).filter((value): value is string => typeof value === "string").join(" ") || "The request could not be completed.";
}

export default function SettingsPage() {
  const { theme, palette, setTheme, setPalette } = useTheme();
  const { user, refresh, setPreferredLanguage } = useSession();
  const { t } = useAppLanguage();
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
      const data = await readApiJson(response);
      if (!response.ok) throw new Error(getResponseMessage(data));
      await refresh(); setNotice("Your preferences are saved.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save settings."); }
    finally { setBusy(""); }
  }

  async function changeLanguage(language: AppLanguage) {
    const previousLanguage = user?.preferred_language === "bn" ? "bn" : "en";
    setPrefs(p => ({ ...p, preferred_language: language }));
    setBusy("language"); setNotice(""); setError("");
    try {
      const response = await apiFetch("/api/auth/profile/", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ preferred_language: language }) });
      const data = await readApiJson(response);
      if (!response.ok) throw new Error(getResponseMessage(data));
      setPreferredLanguage(language); setNotice("Your language preference is saved.");
    } catch (e) {
      setPrefs(p => ({ ...p, preferred_language: previousLanguage }));
      setError(e instanceof Error ? e.message : "Could not change language.");
    }
    finally { setBusy(""); }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault(); setBusy("password"); setNotice(""); setError("");
    try {
      const response = await apiFetch("/api/auth/password/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(passwords) });
      const data = await readApiJson(response);
      if (!response.ok) throw new Error(getResponseMessage(data));
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
    <div className="app-eyebrow">{t("YOUR WORKSPACE")}</div><h1>{t("Settings that feel like yours.")}</h1><p className="app-lede">{t("Pick a section to manage your account, alerts, region, or appearance.")}</p>
    <nav className="settings-tabs" role="tablist" aria-label={t("Settings sections")}>{([{ id: "account", label: "Account", icon: "◉" }, { id: "notifications", label: "Notifications", icon: "♧" }, { id: "region", label: "Language & region", icon: "◎" }, { id: "appearance", label: "Appearance", icon: "◐" }] as { id: SettingsSection; label: string; icon: string }[]).map(tab => <button key={tab.id} id={`settings-tab-${tab.id}`} className={`settings-tab ${activeSection === tab.id ? "active" : ""}`} role="tab" aria-selected={activeSection === tab.id} aria-controls="settings-panel" onClick={() => setActiveSection(tab.id)}><span aria-hidden="true">{tab.icon}</span>{t(tab.label)}</button>)}</nav>
    {(notice || error) && <div className={`app-alert ${error ? "error" : "success"}`} role={error ? "alert" : "status"}>{error || t(notice)}</div>}
    <div id="settings-panel" className="settings-panel" role="tabpanel" aria-labelledby={`settings-tab-${activeSection}`}>
    {activeSection === "account" && <><form className="app-card settings-section settings-profile" onSubmit={savePreferences}><div className="settings-heading"><span className="settings-icon">✦</span><div><h2>{t("Your profile")}</h2><p>{t("Personalize the name and photo shown in your workspace.")}</p></div></div><div className="profile-edit"><button className="profile-photo-button" type="button" onClick={() => photoRef.current?.click()} aria-label={t("Choose profile photo")}>{prefs.avatar_data ? <img src={prefs.avatar_data} alt={t("Profile photo")}/> : <span>{prefs.name.trim().charAt(0).toUpperCase() || "S"}</span>}<i>+</i></button><input ref={photoRef} className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={choosePhoto}/><div className="profile-photo-copy"><strong>{t("Profile photo")}</strong><span>{t("JPG, PNG, or WebP · up to 5 MB")}</span><button type="button" className="text-button" onClick={() => setPrefs(p => ({ ...p, avatar_data: "" }))}>{t("Remove photo")}</button></div></div><div className="settings-form-grid"><label className="settings-field">{t("Display name")}<input value={prefs.name} maxLength={120} onChange={e => setPrefs(p => ({ ...p, name: e.target.value }))} required/></label><label className="settings-field">{t("Email address")}<input value={user?.email || ""} readOnly/><small>{t("Email address is your account sign-in.")}</small></label></div><button className="app-primary settings-save" disabled={busy === "profile"}>{busy === "profile" ? t("Saving…") : t("Save profile")}</button></form><form className="app-card settings-section" onSubmit={changePassword}><div className="settings-heading"><span className="settings-icon">⌑</span><div><h2>{t("Password & security")}</h2><p>{t("Use a strong password with at least 12 characters.")}</p></div></div><div className="settings-form-grid"><label className="settings-field">{t("Current password")}<input type="password" autoComplete="current-password" value={passwords.current_password} onChange={e => setPasswords(p => ({ ...p, current_password: e.target.value }))} required/></label><label className="settings-field">{t("New password")}<input type="password" autoComplete="new-password" minLength={12} value={passwords.new_password} onChange={e => setPasswords(p => ({ ...p, new_password: e.target.value }))} required/></label></div><button className="app-primary settings-save" disabled={busy === "password"}>{busy === "password" ? t("Updating…") : t("Update password")}</button></form></>}
    {activeSection === "notifications" && <section className="app-card settings-section"><div className="settings-heading"><span className="settings-icon">♧</span><div><h2>{t("Notifications")}</h2><p>{t("Choose which monitoring emails Sentinel sends to ")}{user?.email || t("your account")}.</p></div></div><div className="settings-toggle-list"><label className="settings-toggle"><span><strong>{t("Uptime alerts")}</strong><small>{t("Get notified when a monitored site goes down or recovers.")}</small></span><input type="checkbox" checked={prefs.notify_uptime} onChange={e => setPrefs(p => ({ ...p, notify_uptime: e.target.checked }))}/></label><label className="settings-toggle"><span><strong>{t("Security findings")}</strong><small>{t("Receive alerts about new security or domain check findings.")}</small></span><input type="checkbox" checked={prefs.notify_security} onChange={e => setPrefs(p => ({ ...p, notify_security: e.target.checked }))}/></label></div><button className="app-primary settings-save" onClick={() => void savePreferences()} disabled={busy === "profile"}>{busy === "profile" ? t("Saving…") : t("Save notifications")}</button></section>}
    {activeSection === "region" && <section className="app-card settings-section"><div className="settings-heading"><span className="settings-icon">◎</span><div><h2>{t("Language & region")}</h2><p>{t("Set the language and local time Sentinel uses for your account.")}</p></div></div><div className="settings-form-grid"><label className="settings-field">{t("Language")}<span className="settings-select-wrap"><select value={prefs.preferred_language} disabled={busy === "language"} onChange={e => { if (e.target.value === "en" || e.target.value === "bn") void changeLanguage(e.target.value); }}><option value="en">{t("English")}</option><option value="bn">{t("বাংলা (Bangla)")}</option></select><svg className="settings-select-chevron" viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7.5 5 5 5-5"/></svg></span></label><label className="settings-field">{t("Country / region")}<span className="settings-select-wrap"><select value={prefs.country} onChange={e => setPrefs(p => ({ ...p, country: e.target.value }))}><option value="">{t("Choose a country")}</option>{countries.map(country => <option key={country} value={country}>{t(country)}</option>)}</select><svg className="settings-select-chevron" viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7.5 5 5 5-5"/></svg></span></label><label className="settings-field">{t("Time zone")}<span className="settings-select-wrap"><select value={prefs.timezone} onChange={e => setPrefs(p => ({ ...p, timezone: e.target.value }))}>{zones.map(zone => <option key={zone} value={zone}>{zone.replaceAll("_", " ")}</option>)}</select><svg className="settings-select-chevron" viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7.5 5 5 5-5"/></svg></span><small>{t("Used for times shown in your workspace.")}</small></label></div><button className="app-primary settings-save" onClick={() => void savePreferences()} disabled={busy === "profile"}>{busy === "profile" ? t("Saving…") : t("Save region")}</button></section>}
    {activeSection === "appearance" && <section className="app-card settings-section"><div className="settings-heading"><span className="settings-icon">◐</span><div><h2>{t("Appearance")}</h2><p>{t("Choose a workspace theme. Your choice updates cards, navigation, controls, charts, and page surfaces.")}</p></div></div><div className="theme-options" role="group" aria-label={t("Color theme")}>{(["light", "dark"] as ThemeMode[]).map(mode => <button key={mode} className={`theme-option ${theme === mode ? "chosen" : ""}`} onClick={() => setTheme(mode)} aria-pressed={theme === mode}><span className={`theme-preview ${mode}`}><i/><i/><i/></span><strong>{t(mode === "light" ? "Light" : "Dark")}</strong><span>{theme === mode ? t("Selected") : t("Choose")}</span></button>)}</div><h3 className="settings-subheading">{t("Accent palette")}</h3><p className="settings-helper">{t("Accent colors appear across buttons, highlights, chart lines, and active navigation.")}</p><div className="palette-options" role="group" aria-label={t("Accent palette")}>{paletteOptions.map(option => <button key={option.id} className={`palette-option ${palette === option.id ? "chosen" : ""}`} onClick={() => setPalette(option.id)} aria-pressed={palette === option.id}><span className="palette-swatch" style={{ backgroundColor: option.color }}><i style={{ backgroundColor: option.tint }}/></span><strong>{t(option.name)}</strong><span className="palette-check">{palette === option.id ? t("Selected") : ""}</span></button>)}</div></section>}
    </div>
    <a className="app-back-link" href="/">{t("Back to overview")}</a>
  </div></main></AppFrame>;
}
