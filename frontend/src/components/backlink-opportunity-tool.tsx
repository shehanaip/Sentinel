"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Site = { id: string; domain: string; display_name: string; verification_status: "pending" | "verified" };
type Candidate = { domain: string; status: "link_found" | "no_homepage_link" | "unavailable" | "invalid_domain" | "same_site"; links_found: number; nofollow_links: number; truncated: boolean };

export function BacklinkOpportunityTool({ sites }: { sites: Site[] }) {
  const verifiedSites = sites.filter((site) => site.verification_status === "verified");
  const [siteId, setSiteId] = useState(verifiedSites[0]?.id || "");
  const [domains, setDomains] = useState("");
  const [results, setResults] = useState<Candidate[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!verifiedSites.some((site) => site.id === siteId) && verifiedSites.length) setSiteId(verifiedSites[0].id);
  }, [siteId, verifiedSites]);

  async function checkCandidates() {
    const candidateDomains = domains.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
    if (candidateDomains.length < 1 || candidateDomains.length > 3) {
      setError("Enter one to three candidate domains, one per line.");
      return;
    }
    setBusy(true); setError(""); setResults([]);
    try {
      const response = await apiFetch(`/api/seo/websites/${siteId}/backlinks/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidate_domains: candidateDomains }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Could not check these candidates.");
      setResults(data.candidates);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not check these candidates."); }
    finally { setBusy(false); }
  }

  return <section className="backlink-tool app-card">
    <div className="seo-writer-heading"><span className="seo-explainer-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.1 0l3-3A5 5 0 0 0 13 2.9l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.1 0l-3 3A5 5 0 0 0 11 21.1l1.7-1.7"/></svg></span><div><span className="app-step-badge">LINK OPPORTUNITIES</span><h2>Check potential backlinks</h2><p>Compare your verified site with candidate partner or directory homepages.</p></div></div>
    {verifiedSites.length ? <div className="seo-writer-fields">
      <label>Your verified website<select value={siteId} onChange={(event) => setSiteId(event.target.value)}>{verifiedSites.map((site) => <option key={site.id} value={site.id}>{site.display_name || site.domain}</option>)}</select></label>
      <label>Candidate domains<textarea rows={3} value={domains} onChange={(event) => setDomains(event.target.value)} placeholder={"partner-example.com\nindustry-directory.org\nlocal-association.net"}/></label>
      <p className="seo-writer-note">Up to three public domains. Sentinel checks only each HTTPS homepage, follows no redirects, and does not crawl beyond it.</p>
      {error && <div className="app-alert error" role="alert">{error}</div>}
      <button className="app-primary" type="button" disabled={busy || !siteId} onClick={() => void checkCandidates()}>{busy ? "Checking candidate sites..." : "Check backlink gaps"}</button>
    </div> : <div className="app-empty"><strong>Verify a website first</strong><p>Backlink checks are available for verified sites you manage.</p><a className="app-primary history-action" href="/websites">Open websites</a></div>}
    {results.length > 0 && <div className="backlink-results" aria-live="polite">{results.map((result, index) => <article className={`backlink-result ${result.status}`} key={`${result.domain}-${index}`}><div className="backlink-result-heading"><strong>{result.domain}</strong><span>{result.status === "link_found" ? "Link found" : result.status === "no_homepage_link" ? "No homepage link found" : result.status === "unavailable" ? "Could not check" : result.status === "same_site" ? "Your own site" : "Invalid domain"}</span></div><p>{result.status === "link_found" ? `Found ${result.links_found} visible homepage link${result.links_found === 1 ? "" : "s"} to your site${result.nofollow_links ? `; ${result.nofollow_links} marked nofollow` : ""}. Review whether the placement is relevant.` : result.status === "no_homepage_link" ? "No link appeared in the inspected homepage. If this is a relevant partner or directory, consider pitching a genuinely useful resource or listing." : result.status === "unavailable" ? "The HTTPS homepage was unavailable or did not return HTML. Check it manually before treating it as an opportunity." : result.status === "same_site" ? "This candidate resolves to the verified site itself." : "Enter a public hostname only, without a path, port, or credentials."}</p>{result.truncated && <small>Only the first 64 KB was inspected.</small>}</article>)}</div>}
    <p className="seo-writer-note">This is a homepage-only candidate check, not a complete backlink index. A missing homepage link does not prove a site-wide backlink gap or guarantee an outreach opportunity.</p>
  </section>;
}
