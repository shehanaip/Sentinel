"use client";

import { AppFrame } from "@/components/app-frame";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type Site = { id: string; domain: string; display_name: string; verification_status: "pending" | "verified"; verification_record?: { name: string; type: string; value: string } | null; };

export default function WebsitesPage() {
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/websites/`, { credentials: "include" });
      if (response.status === 401 || response.status === 403) { router.replace("/login"); return; }
      if (!response.ok) throw new Error("Could not load your websites.");
      setSites(await response.json());
    } catch { setError("Could not reach the API. Check that the backend is running."); }
    finally { setLoading(false); }
  }, [router]);
  useEffect(() => { void load(); }, [load]);

  async function addSite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const response = await apiFetch("/api/websites/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ domain, display_name: name || domain }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.domain?.[0] || data.detail || "Could not add this website.");
      setSites((current) => [data, ...current]); setDomain(""); setName(""); setNotice("Website added. Add its DNS TXT record below to prove you control it.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not add this website."); }
    finally { setBusy(false); }
  }

  async function verify(site: Site) {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await apiFetch(`/api/websites/${site.id}/verify/`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Verification could not be checked.");
      setSites((items) => items.map((item) => item.id === site.id ? { ...item, ...data } : item));
      setNotice(data.verification_status === "verified" ? `${site.domain} is verified.` : (data.detail || "TXT record not found yet. DNS updates can take time to propagate."));
    } catch (e) { setError(e instanceof Error ? e.message : "Verification could not be checked."); }
    finally { setBusy(false); }
  }

  async function remove(site: Site) {
    if (!window.confirm(`Remove ${site.domain} from this workspace?`)) return;
    setBusy(true); setError("");
    try { const response = await apiFetch(`/api/websites/${site.id}/`, { method: "DELETE" }); if (!response.ok) throw new Error("Could not remove this website."); setSites((items) => items.filter((item) => item.id !== site.id)); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not remove this website."); }
    finally { setBusy(false); }
  }

  async function copy(value: string) { await navigator.clipboard.writeText(value); setNotice("DNS value copied."); }
  async function checkNow(site: Site) {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await apiFetch(`/api/monitoring/websites/${site.id}/check/`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Could not run the uptime check.");
      setNotice(`${site.domain}: ${data.status.toUpperCase()}${data.http_status ? ` (HTTP ${data.http_status})` : ` (${data.error_category.replaceAll("_", " ")})`} in ${data.duration_ms} ms. View results in check history.`);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not run the uptime check."); }
    finally { setBusy(false); }
  }

  return <AppFrame><main className="app-page app-page-with-sidebar">
    <div className="app-page-content"><div className="app-eyebrow">WORKSPACE SETUP / STEP 2 AND 3</div><h1>Connect your website.</h1><p className="app-lede">Add a domain you own or manage, then verify control with a DNS TXT record before monitoring can begin.</p>
      <section className="app-card add-site-card"><div><span className="app-step-badge">STEP 02</span><h2>Add a website</h2><p>Enter a hostname such as <strong>example.com</strong>. Do not include a URL path.</p></div><form className="site-form" onSubmit={addSite}><label>Website domain<input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="example.com" maxLength={253} required /></label><label>Display name <span>(optional)</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="My company site" maxLength={120} /></label><button className="app-primary" disabled={busy}>{busy ? "Working..." : "Add website"}</button></form></section>
      {error && <div className="app-alert error" role="alert">{error}</div>}{notice && <div className="app-alert" role="status">{notice}</div>}
      <div className="app-section-title"><div><span className="app-step-badge">STEP 03</span><h2>Verify website ownership</h2></div><span className="site-count">{sites.length} {sites.length === 1 ? "website" : "websites"}</span></div>
      {loading ? <div className="app-card app-loading">Loading your websites...</div> : sites.length === 0 ? <div className="app-card app-empty"><strong>Your sites will appear here</strong><p>Add your first domain above to get a DNS verification record.</p></div> : <div className="site-list">{sites.map((site) => <article className="app-card site-card" key={site.id}><div className="site-card-head"><div><div className="site-title">{site.display_name || site.domain}</div><div className="site-domain">{site.domain}</div></div><span className={`site-status ${site.verification_status}`}>{site.verification_status === "verified" ? "Verified" : "Pending verification"}</span></div>{site.verification_status === "pending" && site.verification_record && <div className="dns-instructions"><div><strong>Add this DNS record</strong><p>At your DNS provider, create a TXT record with this name and value:</p></div><dl><div><dt>Type</dt><dd>TXT</dd></div><div><dt>Name / host</dt><dd>{site.verification_record.name}</dd></div><div><dt>Value</dt><dd>{site.verification_record.value}</dd></div></dl><button type="button" className="app-secondary" onClick={() => void copy(site.verification_record!.value)}>Copy value</button><button type="button" className="app-primary" disabled={busy} onClick={() => void verify(site)}>Check DNS record</button></div>}{site.verification_status === "verified" && <><p className="verified-copy">Ownership is confirmed. Automatic uptime checks run every five minutes while the monitoring worker is active; use the button below for an immediate check.</p><button className="app-secondary check-now" disabled={busy} onClick={() => void checkNow(site)}>Run uptime check</button><a className="history-inline-link" href="/history">View check history</a></>}<button className="site-remove" disabled={busy} onClick={() => void remove(site)}>Remove website</button></article>)}</div>}
      <a className="app-back-link" href="/">Back to overview</a>
    </div></main></AppFrame>;
}

