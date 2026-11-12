"use client";

import { AppFrame } from "@/components/app-frame";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL, apiFetch } from "@/lib/api";
import { useAppLanguage } from "@/components/session-provider";

type Site = { id: string; domain: string; display_name: string; verification_status: "pending" | "verified"; verification_record?: { name: string; type: string; value: string } | null; };

export default function WebsitesPage() {
  const { t } = useAppLanguage();
  const router = useRouter();
  const [sites, setSites] = useState<Site[]>([]);
  const [domain, setDomain] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/websites/`, { credentials: "include" });
      if (response.status === 401 || response.status === 403) { router.replace("/login"); return; }
      if (response.status === 429) { setError(t("Too many requests. Please wait a moment and try again.")); return; }
      if (!response.ok) { setError(`${t("Could not load your websites.")} (HTTP ${response.status}).`); return; }
      try {
        setSites(await response.json());
      } catch {
        setError(t("The API response could not be read."));
      }
    } catch {
      setError(t("Could not reach the API. Check that the backend is running."));
    }
    finally { setLoading(false); }
  }, [router, t]);
  useEffect(() => { void load(); }, [load]);

  async function addSite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const response = await apiFetch("/api/websites/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ domain, display_name: name || domain }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.domain?.[0] || data.detail || t("Could not add this website."));
      setSites((current) => [data, ...current]); setDomain(""); setName(""); setNotice(t("Website added. Add its DNS TXT record below to prove you control it."));
    } catch (e) { setError(e instanceof Error ? e.message : t("Could not add this website.")); }
    finally { setBusy(false); }
  }

  async function verify(site: Site) {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await apiFetch(`/api/websites/${site.id}/verify/`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || t("Verification could not be checked."));
      setSites((items) => items.map((item) => item.id === site.id ? { ...item, ...data } : item));
      setNotice(data.verification_status === "verified" ? `${t("Website verified.")} ${site.domain}` : (data.detail || t("TXT record not found yet. DNS updates can take time to propagate.")));
    } catch (e) { setError(e instanceof Error ? e.message : t("Verification could not be checked.")); }
    finally { setBusy(false); }
  }

  async function remove(site: Site) {
    if (!window.confirm(`${t("Remove website?")} ${site.domain}`)) return;
    setBusy(true); setError("");
    try { const response = await apiFetch(`/api/websites/${site.id}/`, { method: "DELETE" }); if (!response.ok) throw new Error(t("Could not remove this website.")); setSites((items) => items.filter((item) => item.id !== site.id)); }
    catch (e) { setError(e instanceof Error ? e.message : t("Could not remove this website.")); }
    finally { setBusy(false); }
  }

  async function copy(value: string) { await navigator.clipboard.writeText(value); setNotice(t("DNS value copied.")); }
  async function checkNow(site: Site) {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await apiFetch(`/api/monitoring/websites/${site.id}/check/`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || t("Could not run the uptime check."));
      setNotice(`${site.domain}: ${t(data.status === "up" ? "UP" : "DOWN")}${data.http_status ? ` (HTTP ${data.http_status})` : ` (${data.error_category.replaceAll("_", " ")})`} · ${data.duration_ms} ms`);
    } catch (e) { setError(e instanceof Error ? e.message : t("Could not run the uptime check.")); }
    finally { setBusy(false); }
  }

  return <AppFrame><main className="app-page app-page-with-sidebar">
    <div className="app-page-content"><div className="app-eyebrow">{t("WORKSPACE SETUP / STEP 2 AND 3")}</div><h1>{t("Connect your website.")}</h1><p className="app-lede">{t("Add a domain you own or manage, then verify control with a DNS TXT record before monitoring can begin.")}</p>
      <section className="app-card add-site-card"><div><span className="app-step-badge">{t("STEP 02")}</span><h2>{t("Add a website")}</h2><p>{t("Enter a hostname such as")} <strong>example.com</strong>. {t("Do not include a URL path.")}</p></div><form className="site-form" onSubmit={addSite}><label>{t("Website domain")}<input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="example.com" maxLength={253} required /></label><label>{t("Display name")} <span>({t("optional")})</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("My company site")} maxLength={120} /></label><button className="app-primary" disabled={busy}>{busy ? t("Working...") : t("Add a website")}</button></form></section>
      {error && <div className="app-alert error" role="alert">{error}</div>}{notice && <div className="app-alert" role="status">{notice}</div>}
      <div className="app-section-title"><div><span className="app-step-badge">{t("STEP 03")}</span><h2>{t("Verify website ownership")}</h2></div><span className="site-count">{sites.length} {t(sites.length === 1 ? "website" : "websites")}</span></div>
      {loading ? <div className="app-card app-loading">{t("Loading your websites...")}</div> : sites.length === 0 ? <div className="app-card app-empty"><strong>{t("Your sites will appear here")}</strong><p>{t("Add your first domain above to get a DNS verification record.")}</p></div> : <div className="site-list">{sites.map((site) => <article className="app-card site-card" key={site.id}><div className="site-card-head"><div><div className="site-title">{site.display_name || site.domain}</div><div className="site-domain">{site.domain}</div></div><span className={`site-status ${site.verification_status}`}>{t(site.verification_status === "verified" ? "Verified" : "Pending verification")}</span></div>{site.verification_status === "pending" && site.verification_record && <div className="dns-instructions"><div><strong>{t("Add this DNS record")}</strong><p>{t("At your DNS provider, create a TXT record with this name and value:")}</p></div><dl><div><dt>{t("Type")}</dt><dd>TXT</dd></div><div><dt>{t("Name / host")}</dt><dd>{site.verification_record.name}</dd></div><div><dt>{t("Value")}</dt><dd>{site.verification_record.value}</dd></div></dl><button type="button" className="app-secondary" onClick={() => void copy(site.verification_record!.value)}>{t("Copy value")}</button><button type="button" className="app-primary" disabled={busy} onClick={() => void verify(site)}>{t("Check DNS record")}</button></div>}{site.verification_status === "verified" && <><p className="verified-copy">{t("Ownership is confirmed. Automatic uptime checks run every five minutes while the monitoring worker is active; use the button below for an immediate check.")}</p><button className="app-secondary check-now" disabled={busy} onClick={() => void checkNow(site)}>{t("Run uptime check")}</button><a className="history-inline-link" href="/history">{t("View check history")}</a></>}<button className="site-remove" disabled={busy} onClick={() => void remove(site)}>{t("Remove website")}</button></article>)}</div>}
      <a className="app-back-link" href="/">{t("Back to overview")}</a>
    </div></main></AppFrame>;
}

