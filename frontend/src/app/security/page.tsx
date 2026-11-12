"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppFrame } from "@/components/app-frame";
import { apiFetch, API_URL } from "@/lib/api";

type Site = { id: string; domain: string; display_name: string; verification_status: "pending" | "verified" };
type AuditType = "headers" | "domain";
type AuditCheck = { code: string; label: string; status: "pass" | "missing" | "warning" | "unknown"; message: string; recommendation: string };
type Audit = { id: string; website_id: string; domain: string; display_name: string; audit_type: AuditType; status: "complete" | "error"; http_status: number | null; score: number; checks: AuditCheck[]; error_category: string; checked_at: string };

function AuditReport({ audit }: { audit: Audit }) {
  if (audit.status === "error") return <div className="app-alert error">Could not complete this review ({audit.error_category.replaceAll("_", " ")}).</div>;
  const suggestions = audit.checks.filter((check) => check.status === "missing" || check.status === "warning");
  return <div className="seo-audit-result">
    <div className="seo-score-row"><div className="seo-score-ring" style={{ background: `conic-gradient(var(--accent) ${audit.score * 3.6}deg, var(--page-line) 0deg)` }}><span><strong>{audit.score}</strong><small>/ 100</small></span></div><div><strong>{audit.audit_type === "headers" ? "Web header coverage" : "Domain and TLS posture"}</strong><p>{audit.checks.filter((check) => check.status === "pass").length} of {audit.checks.length} signals passed</p><time dateTime={audit.checked_at}>Checked {new Date(audit.checked_at).toLocaleString()}</time></div></div>
    <div className="security-checks-grid">{audit.checks.map((check) => <div className={`security-check ${check.status}`} key={check.code}><span className="security-check-mark" aria-hidden="true">{check.status === "pass" ? "✓" : check.status === "unknown" ? "?" : "!"}</span><div><strong>{check.label}</strong><p>{check.message}</p>{check.status !== "pass" && <small className="security-recommendation">Suggested action: {check.recommendation || check.message}</small>}</div></div>)}</div>
    {suggestions.length > 0 && <section className="security-suggestions"><h4>Suggested improvements</h4><ol>{suggestions.map((check) => <li key={check.code}><strong>{check.label}:</strong> {check.recommendation}</li>)}</ol></section>}
  </div>;
}

export default function SecurityPage() {
  const router = useRouter();
  const [sites, setSites] = useState<Site[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const [siteResponse, auditResponse] = await Promise.all([
        fetch(`${API_URL}/api/websites/`, { credentials: "include", cache: "no-store" }),
        fetch(`${API_URL}/api/security/audits/`, { credentials: "include", cache: "no-store" }),
      ]);
      if ([siteResponse.status, auditResponse.status].some((code) => code === 401 || code === 403)) { router.replace("/login"); return; }
      if (!siteResponse.ok || !auditResponse.ok) throw new Error("Could not load security workspace data.");
      setSites(await siteResponse.json()); setAudits(await auditResponse.json());
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load security workspace data."); }
    finally { setLoading(false); }
  }, [router]);
  useEffect(() => { void load(); }, [load]);

  async function runAudit(site: Site, type: AuditType) {
    const taskId = `${site.id}:${type}`;
    setBusyId(taskId); setError(""); setNotice("");
    try {
      const path = type === "headers" ? "audit" : "domain-audit";
      const response = await apiFetch(`/api/security/websites/${site.id}/${path}/`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Could not run this security check.");
      setAudits((items) => [data, ...items.filter((item) => item.id !== data.id)]);
      setNotice(`${type === "headers" ? "Web header" : "Domain and TLS"} review saved for ${site.domain}.`);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not run this security check."); }
    finally { setBusyId(""); }
  }

  const latestFor = (siteId: string, type: AuditType) => audits.find((audit) => audit.website_id === siteId && audit.audit_type === type);
  return <AppFrame><main className="app-page app-page-with-sidebar"><div className="app-page-content security-page-content">
    <div className="app-eyebrow">SITE HEALTH / SECURITY</div><h1>Security signals.</h1><p className="app-lede">Review website defenses and domain configuration on sites you have verified. Findings include practical next steps and stay within passive, non-intrusive checks.</p>
    <section className="seo-explainer"><span className="seo-explainer-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3 20 6v5.3c0 4.8-3.2 8.4-8 10.7-4.8-2.3-8-5.9-8-10.7V6l8-3Z"/><path d="m8.5 12 2.3 2.3 4.8-4.8"/></svg></span><div><strong>Two review layers</strong><p>Web headers: HSTS, CSP, content-type, clickjacking, referrer, and permissions policies. Domain and TLS: SPF, DMARC, CAA, and certificate hostname/expiry. Checks only use DNS and the verified HTTPS host; Sentinel does not exploit or alter your site.</p></div></section>
    {error && <div className="app-alert error" role="alert">{error}</div>}{notice && <div className="app-alert" role="status">{notice}</div>}
    <div className="app-section-title seo-section-title"><div><span className="app-step-badge">YOUR WEBSITES</span><h2>Security checks</h2></div><a className="history-inline-link" href="/history">Uptime history</a></div>
    {loading ? <div className="app-card app-loading">Loading your websites...</div> : sites.length === 0 ? <div className="app-card app-empty"><strong>No websites yet</strong><p>Add a website and verify ownership before running security checks.</p><a className="app-primary history-action" href="/websites">Add a website</a></div> : <div className="seo-site-list">{sites.map((site) => { const headerAudit = latestFor(site.id, "headers"); const domainAudit = latestFor(site.id, "domain"); return <article className="app-card seo-site-card" key={site.id}><div className="seo-site-head"><div><span className={`site-status ${site.verification_status}`}>{site.verification_status === "verified" ? "Verified" : "Pending verification"}</span><h3>{site.display_name || site.domain}</h3><span className="site-domain">{site.domain}</span></div></div><div className="security-site-actions"><button className="app-primary" disabled={busyId === `${site.id}:headers` || site.verification_status !== "verified"} onClick={() => void runAudit(site, "headers")}>{busyId === `${site.id}:headers` ? "Checking..." : headerAudit ? "Recheck web headers" : "Review web headers"}</button><button className="security-discover-button" disabled={busyId === `${site.id}:domain` || site.verification_status !== "verified"} onClick={() => void runAudit(site, "domain")}>{busyId === `${site.id}:domain` ? "Checking..." : domainAudit ? "Recheck domain & TLS" : "Review domain & TLS"}</button></div>{headerAudit && <AuditReport audit={headerAudit}/>}{domainAudit && <AuditReport audit={domainAudit}/>}</article>; })}</div>}
  </div></main></AppFrame>;
}

