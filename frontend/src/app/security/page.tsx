"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppFrame } from "@/components/app-frame";
import { useAppLanguage } from "@/components/session-provider";
import { apiFetch, API_URL } from "@/lib/api";

type Site = { id: string; domain: string; display_name: string; verification_status: "pending" | "verified" };
type AuditType = "headers" | "domain";
type AuditCheck = { code: string; label: string; status: "pass" | "missing" | "warning" | "unknown"; message: string; recommendation: string };
type Audit = { id: string; website_id: string; domain: string; display_name: string; audit_type: AuditType; status: "complete" | "error"; http_status: number | null; score: number; checks: AuditCheck[]; error_category: string; checked_at: string };

function AuditReport({ audit }: { audit: Audit }) {
  const { t } = useAppLanguage();
  if (audit.status === "error") return <div className="app-alert error">{t("Could not complete this review")} ({t(audit.error_category.replaceAll("_", " "))}).</div>;
  const suggestions = audit.checks.filter((check) => check.status === "missing" || check.status === "warning");
  return <div className="seo-audit-result">
    <div className="seo-score-row"><div className="seo-score-ring" style={{ background: `conic-gradient(var(--accent) ${audit.score * 3.6}deg, var(--page-line) 0deg)` }}><span><strong>{audit.score}</strong><small>/ 100</small></span></div><div><strong>{t(audit.audit_type === "headers" ? "Web header coverage" : "Domain and TLS posture")}</strong><p>{audit.checks.filter((check) => check.status === "pass").length} {t("of")} {audit.checks.length} {t("signals passed")}</p><time dateTime={audit.checked_at}>{t("Checked")} {new Date(audit.checked_at).toLocaleString()}</time></div></div>
    <div className="security-checks-grid">{audit.checks.map((check) => <div className={`security-check ${check.status}`} key={check.code}><span className="security-check-mark" aria-hidden="true">{check.status === "pass" ? "✓" : check.status === "unknown" ? "?" : "!"}</span><div><strong>{t(check.label)}</strong><p>{t(check.message)}</p>{check.status !== "pass" && <small className="security-recommendation">{t("Suggested action")}: {t(check.recommendation || check.message)}</small>}</div></div>)}</div>
    {suggestions.length > 0 && <section className="security-suggestions"><h4>{t("Suggested improvements")}</h4><ol>{suggestions.map((check) => <li key={check.code}><strong>{t(check.label)}:</strong> {t(check.recommendation)}</li>)}</ol></section>}
  </div>;
}

export default function SecurityPage() {
  const { t } = useAppLanguage();
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
      if (!siteResponse.ok || !auditResponse.ok) throw new Error(t("Could not load security workspace data."));
      setSites(await siteResponse.json()); setAudits(await auditResponse.json());
    } catch (e) { setError(e instanceof Error ? e.message : t("Could not load security workspace data.")); }
    finally { setLoading(false); }
  }, [router, t]);
  useEffect(() => { void load(); }, [load]);

  async function runAudit(site: Site, type: AuditType) {
    const taskId = `${site.id}:${type}`;
    setBusyId(taskId); setError(""); setNotice("");
    try {
      const path = type === "headers" ? "audit" : "domain-audit";
      const response = await apiFetch(`/api/security/websites/${site.id}/${path}/`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || t("Could not run this security check."));
      setAudits((items) => [data, ...items.filter((item) => item.id !== data.id)]);
      setNotice(`${t(type === "headers" ? "Web header" : "Domain and TLS")} ${t("review saved for")} ${site.domain}.`);
    } catch (e) { setError(e instanceof Error ? e.message : t("Could not run this security check.")); }
    finally { setBusyId(""); }
  }

  const latestFor = (siteId: string, type: AuditType) => audits.find((audit) => audit.website_id === siteId && audit.audit_type === type);
  return <AppFrame><main className="app-page app-page-with-sidebar"><div className="app-page-content security-page-content">
    <div className="app-eyebrow">{t("SITE HEALTH / SECURITY")}</div><h1>{t("Security signals.")}</h1><p className="app-lede">{t("Review website defenses and domain configuration on sites you have verified. Findings include practical next steps and stay within passive, non-intrusive checks.")}</p>
    <section className="seo-explainer"><span className="seo-explainer-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3 20 6v5.3c0 4.8-3.2 8.4-8 10.7-4.8-2.3-8-5.9-8-10.7V6l8-3Z"/><path d="m8.5 12 2.3 2.3 4.8-4.8"/></svg></span><div><strong>{t("Two review layers")}</strong><p>{t("Web headers: HSTS, CSP, content-type, clickjacking, referrer, and permissions policies. Domain and TLS: SPF, DMARC, CAA, and certificate hostname/expiry. Checks only use DNS and the verified HTTPS host; Sentinel does not exploit or alter your site.")}</p></div></section>
    {error && <div className="app-alert error" role="alert">{error}</div>}{notice && <div className="app-alert" role="status">{notice}</div>}
    <div className="app-section-title seo-section-title"><div><span className="app-step-badge">{t("YOUR WEBSITES")}</span><h2>{t("Security checks")}</h2></div><a className="history-inline-link" href="/history">{t("Uptime history")}</a></div>
    {loading ? <div className="app-card app-loading">{t("Loading your websites...")}</div> : sites.length === 0 ? <div className="app-card app-empty"><strong>{t("No websites yet")}</strong><p>{t("Add a website and verify ownership before running security checks.")}</p><a className="app-primary history-action" href="/websites">{t("Add a website")}</a></div> : <div className="seo-site-list">{sites.map((site) => { const headerAudit = latestFor(site.id, "headers"); const domainAudit = latestFor(site.id, "domain"); return <article className="app-card seo-site-card" key={site.id}><div className="seo-site-head"><div><span className={`site-status ${site.verification_status}`}>{t(site.verification_status === "verified" ? "Verified" : "Pending verification")}</span><h3>{site.display_name || site.domain}</h3><span className="site-domain">{site.domain}</span></div></div><div className="security-site-actions"><button className="app-primary" disabled={busyId === `${site.id}:headers` || site.verification_status !== "verified"} onClick={() => void runAudit(site, "headers")}>{busyId === `${site.id}:headers` ? t("Checking...") : headerAudit ? t("Recheck web headers") : t("Review web headers")}</button><button className="security-discover-button" disabled={busyId === `${site.id}:domain` || site.verification_status !== "verified"} onClick={() => void runAudit(site, "domain")}>{busyId === `${site.id}:domain` ? t("Checking...") : domainAudit ? t("Recheck domain & TLS") : t("Review domain & TLS")}</button></div>{headerAudit && <AuditReport audit={headerAudit}/>}{domainAudit && <AuditReport audit={domainAudit}/>}</article>; })}</div>}
  </div></main></AppFrame>;
}

