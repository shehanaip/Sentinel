"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppFrame } from "@/components/app-frame";
import { apiFetch, API_URL } from "@/lib/api";
import { SEOSnippetWriter } from "@/components/seo-snippet-writer";
import { BacklinkOpportunityTool } from "@/components/backlink-opportunity-tool";

type Site = { id: string; domain: string; display_name: string; verification_status: "pending" | "verified" };
type Issue = { code: string; severity: "high" | "warning" | "info"; message: string };
type Audit = { id: string; website_id: string; domain: string; display_name: string; status: "complete" | "error"; score: number; title: string; description: string; h1: string; canonical_url: string; has_viewport: boolean; is_indexable: boolean; language: string; h1_count: number; h2_count: number; image_count: number; images_missing_alt: number; open_graph_title: string; open_graph_description: string; open_graph_image: string; twitter_card: string; structured_data_count: number; has_favicon: boolean; robots_txt_found: boolean; sitemap_found: boolean; blocks_all_crawlers: boolean; issues: Issue[]; error_category: string; checked_at: string };

export default function SEOPage() {
  const router = useRouter();
  const [sites, setSites] = useState<Site[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [activeSection, setActiveSection] = useState<"checks" | "snippets" | "backlinks">("checks");

  const load = useCallback(async () => {
    setError("");
    try {
      const [siteResponse, auditResponse] = await Promise.all([
        fetch(`${API_URL}/api/websites/`, { credentials: "include" }),
        fetch(`${API_URL}/api/seo/audits/`, { credentials: "include" }),
      ]);
      if ([siteResponse.status, auditResponse.status].some((code) => code === 401 || code === 403)) { router.replace("/login"); return; }
      if (!siteResponse.ok || !auditResponse.ok) throw new Error("Could not load SEO workspace data.");
      setSites(await siteResponse.json()); setAudits(await auditResponse.json());
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load SEO workspace data."); }
    finally { setLoading(false); }
  }, [router]);
  useEffect(() => { void load(); }, [load]);

  async function auditSite(site: Site) {
    setBusyId(site.id); setError(""); setNotice("");
    try {
      const response = await apiFetch(`/api/seo/websites/${site.id}/audit/`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Could not run this SEO audit.");
      setAudits((items) => [data, ...items.filter((item) => item.id !== data.id)]);
      setNotice(`Audit saved for ${site.domain}.`);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not run this SEO audit."); }
    finally { setBusyId(""); }
  }

  const latestFor = (siteId: string) => audits.find((audit) => audit.website_id === siteId);
  return <AppFrame><main className="app-page app-page-with-sidebar"><div className="app-page-content seo-page-content"><div className="app-eyebrow">SITE HEALTH / SEARCH</div><h1>SEO foundations.</h1><p className="app-lede">Check page-level signals that help search engines and visitors understand your site. Audits inspect the homepage only and never change your content.</p>
    {error && <div className="app-alert error" role="alert">{error}</div>}{notice && <div className="app-alert" role="status">{notice}</div>}
    <nav className="seo-section-tabs" aria-label="SEO sections">{[["checks", "Page checks"], ["snippets", "Snippet suggestions"], ["backlinks", "Backlink opportunities"]].map(([id, label]) => <button type="button" key={id} className={`seo-section-tab ${activeSection === id ? "active" : ""}`} aria-current={activeSection === id ? "page" : undefined} onClick={() => setActiveSection(id as typeof activeSection)}>{id === "checks" ? <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h12M10 4l6 6-6 6"/></svg> : id === "snippets" ? <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 5h12M4 10h8M4 15h10"/></svg> : <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8 12a4 4 0 0 0 5.7 0l2-2A4 4 0 0 0 10 4.3L9 5.3M12 8a4 4 0 0 0-5.7 0l-2 2A4 4 0 0 0 10 15.7l1-1"/></svg>}{label}</button>)}</nav>
    {activeSection === "snippets" && <section className="seo-tab-panel" id="seo-snippets" aria-label="Snippet suggestions"><SEOSnippetWriter sites={sites}/></section>}
    {activeSection === "backlinks" && <section className="seo-tab-panel" id="seo-backlinks" aria-label="Backlink opportunities"><BacklinkOpportunityTool sites={sites}/></section>}
    {activeSection === "checks" && <>
    <section className="seo-explainer"><span className="seo-explainer-icon">S</span><div><strong>Technical and on-page signals</strong><p>We inspect homepage metadata, headings, language, image alt attributes, social preview tags, structured data, favicon, robots.txt, and /sitemap.xml. Fetches stay on your verified hostname. This is a practical checklist, not a search ranking or traffic prediction.</p></div></section>
    <div className="app-section-title seo-section-title"><div><span className="app-step-badge">YOUR WEBSITES</span><h2>Page checks</h2></div><a className="history-inline-link" href="/history">Uptime history</a></div>
    {loading ? <div className="app-card app-loading">Loading your websites...</div> : sites.length === 0 ? <div className="app-card app-empty"><strong>No websites yet</strong><p>Add a website and verify ownership before running an audit.</p><a className="app-primary history-action" href="/websites">Add a website</a></div> : <div className="seo-site-list">{sites.map((site) => { const audit = latestFor(site.id); return <article className="app-card seo-site-card" key={site.id}><div className="seo-site-head"><div><span className={`site-status ${site.verification_status}`}>{site.verification_status === "verified" ? "Verified" : "Pending verification"}</span><h3>{site.display_name || site.domain}</h3><span className="site-domain">{site.domain}</span></div><button className="app-primary" disabled={busyId === site.id || site.verification_status !== "verified"} onClick={() => void auditSite(site)}>{busyId === site.id ? "Checking..." : audit ? "Run again" : "Run SEO audit"}</button></div>
      {audit && <div className="seo-audit-result">{audit.status === "error" ? <div className="app-alert error">Audit could not fetch an HTML page ({audit.error_category.replaceAll("_", " ")}).</div> : <><div className="seo-score-row"><div className="seo-score-ring" style={{ background: `conic-gradient(var(--accent) ${audit.score * 3.6}deg, var(--page-line) 0deg)` }}><span><strong>{audit.score}</strong><small>/ 100</small></span></div><div><strong>Page health score</strong><p>Heuristic score based only on the checks listed below.</p><time dateTime={audit.checked_at}>Checked {new Date(audit.checked_at).toLocaleString()}</time></div></div><div className="seo-check-group"><h4>Search appearance</h4><div className="seo-signals">{[["Page title", audit.title || "Missing"], ["Meta description", audit.description || "Missing"], ["Canonical URL", audit.canonical_url || "Missing"], ["Indexing", audit.is_indexable ? "Indexable" : "Blocked by noindex"], ["Language", audit.language || "Missing"]].map(([label, value]) => <div className="seo-signal" key={label}><span>{label}</span><strong title={value}>{value}</strong></div>)}</div></div><div className="seo-check-group"><h4>Content and accessibility</h4><div className="seo-signals">{[["Main heading", audit.h1 || "Missing"], ["Heading structure", `${audit.h1_count} H1 · ${audit.h2_count} H2`], ["Images missing alt", `${audit.images_missing_alt} of ${audit.image_count}`], ["Mobile viewport", audit.has_viewport ? "Present" : "Missing"], ["Favicon", audit.has_favicon ? "Present" : "Missing"]].map(([label, value]) => <div className="seo-signal" key={label}><span>{label}</span><strong title={value}>{value}</strong></div>)}</div></div><div className="seo-check-group"><h4>Social and crawl setup</h4><div className="seo-signals">{[["Open Graph title", audit.open_graph_title || "Missing"], ["Open Graph description", audit.open_graph_description || "Missing"], ["Open Graph image", audit.open_graph_image || "Missing"], ["Twitter/X card", audit.twitter_card || "Missing"], ["Structured data blocks", String(audit.structured_data_count)], ["robots.txt", audit.robots_txt_found ? audit.blocks_all_crawlers ? "Blocks all crawlers" : "Found" : "Missing"], ["XML sitemap", audit.sitemap_found ? "Found" : "Not found"]].map(([label, value]) => <div className="seo-signal" key={label}><span>{label}</span><strong title={value}>{value}</strong></div>)}</div></div>{audit.issues.length > 0 ? <ul className="seo-issues">{audit.issues.map((issue) => <li key={issue.code} className={`seo-issue ${issue.severity}`}><span>{issue.severity === "high" ? "!" : issue.severity === "info" ? "i" : "-"}</span><p>{issue.message}</p></li>)}</ul> : <p className="seo-all-good">No issues found in the checks included in this audit.</p>}</>}</div>}
    </article>; })}</div>}
    </>}
  </div></main></AppFrame>;
}
