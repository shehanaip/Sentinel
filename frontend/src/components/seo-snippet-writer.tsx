"use client";

import { useEffect, useState } from "react";
import { useAppLanguage } from "@/components/session-provider";

type Site = { id: string; domain: string; display_name: string; verification_status: "pending" | "verified" };

export function SEOSnippetWriter({ sites }: { sites: Site[] }) {
  const { t } = useAppLanguage();
  const [siteId, setSiteId] = useState(sites.find((site) => site.verification_status === "verified")?.id || sites[0]?.id || "");
  const [query, setQuery] = useState("");
  const [summary, setSummary] = useState("");
  const [suggestion, setSuggestion] = useState<{ title: string; description: string } | null>(null);
  const [copied, setCopied] = useState("");
  useEffect(() => {
    if (!siteId && sites.length) setSiteId(sites.find((site) => site.verification_status === "verified")?.id || sites[0].id);
  }, [siteId, sites]);

  function generate() {
    const site = sites.find((item) => item.id === siteId);
    const brand = (site?.display_name || site?.domain || t("Your brand")).trim();
    const keyword = query.trim().replace(/\s+/g, " ");
    const context = summary.trim().replace(/\s+/g, " ");
    if (!keyword || !context) return;
    const brandSuffix = ` | ${brand}`;
    const title = `${keyword.slice(0, Math.max(1, 60 - brandSuffix.length))}${brandSuffix}`.slice(0, 60);
    const includesQuery = context.toLocaleLowerCase().includes(keyword.toLocaleLowerCase());
    const description = `${context}${includesQuery ? "" : ` Learn more about ${keyword}.`}`.slice(0, 160);
    setSuggestion({ title, description });
    setCopied("");
  }

  async function copy(kind: "title" | "description", value: string) {
    try { await navigator.clipboard.writeText(value); setCopied(kind); }
    catch { setCopied(""); }
  }

  return <section className="seo-writer app-card">
    <div className="seo-writer-heading"><span className="seo-explainer-icon" aria-hidden="true">✎</span><div><span className="app-step-badge">{t("CONTENT TOOL")}</span><h2>{t("Search snippet suggestions")}</h2><p>{t("Enter a target query and a truthful page summary to draft a title and description.")}</p></div></div>
    <div className="seo-writer-fields">
      {sites.length > 0 && <label>{t("Website brand")}<select value={siteId} onChange={(event) => setSiteId(event.target.value)}>{sites.map((site) => <option key={site.id} value={site.id}>{site.display_name || site.domain}</option>)}</select></label>}
      <label>{t("Target search query")}<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("e.g. Bangladesh student visa")} maxLength={120}/></label>
      <label>{t("What this page actually offers")}<textarea value={summary} onChange={(event) => setSummary(event.target.value)} placeholder={t("Describe the page in one or two accurate sentences.")} rows={3} maxLength={500}/></label>
    </div>
    <button type="button" className="app-primary" onClick={generate} disabled={!query.trim() || !summary.trim()}>{t("Suggest title and description")}</button>
    {suggestion && <div className="seo-snippet-preview" aria-live="polite"><div className="seo-snippet-result"><div><span>{t("Suggested page title")} · {suggestion.title.length}/60</span><strong>{suggestion.title}</strong></div><button type="button" onClick={() => void copy("title", suggestion.title)}>{t(copied === "title" ? "Copied" : "Copy title")}</button></div><div className="seo-snippet-result"><div><span>{t("Suggested meta description")} · {suggestion.description.length}/160</span><p>{suggestion.description}</p></div><button type="button" onClick={() => void copy("description", suggestion.description)}>{t(copied === "description" ? "Copied" : "Copy text")}</button></div></div>}
    <p className="seo-writer-note">{t("Drafts use only your query, website name, and page summary. Review them for accuracy; they do not predict rankings.")}</p>
  </section>;
}
