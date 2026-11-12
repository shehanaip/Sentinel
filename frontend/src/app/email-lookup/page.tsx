"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppFrame } from "@/components/app-frame";
import { apiFetch } from "@/lib/api";

type LookupResult = {
  email: string;
  syntax_valid: boolean;
  domain_status: "mail_server_found" | "no_mail_server_found" | "dns_unavailable";
  mail_servers: string[];
  mailbox_status: "unknown";
  message: string;
};
type ShareRequest = { id: string; status: "pending" | "confirmation_sent" | "confirmed" | "expired"; email: string; created_at: string; expires_at: string; confirmed_at: string | null };

export default function EmailLookupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [shareRequests, setShareRequests] = useState<ShareRequest[]>([]);
  const [shareUrl, setShareUrl] = useState("");
  const [shareBusy, setShareBusy] = useState(false);
  const [shareNotice, setShareNotice] = useState("");

  const loadShareRequests = useCallback(async () => {
    try {
      const response = await apiFetch("/api/email-lookup/share-requests/");
      if (response.status === 401 || response.status === 403) { router.replace("/login"); return; }
      if (response.ok) setShareRequests(await response.json());
    } catch { /* Request-link creation and lookup remain available for retry. */ }
  }, [router]);
  useEffect(() => { void loadShareRequests(); }, [loadShareRequests]);

  async function createShareRequest() {
    setShareBusy(true); setError(""); setShareNotice("");
    try {
      const response = await apiFetch("/api/email-lookup/share-requests/", { method: "POST" });
      const data = await response.json();
      if (response.status === 401 || response.status === 403) { router.replace("/login"); return; }
      if (!response.ok) throw new Error(data.detail || "Could not create an email request link.");
      setShareUrl(data.share_url); setShareNotice("Request link created. Send it to the person through a channel you already use.");
      await loadShareRequests();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create an email request link."); }
    finally { setShareBusy(false); }
  }

  async function copyShareUrl() {
    try { await navigator.clipboard.writeText(shareUrl); setShareNotice("Link copied. Send it to the person through your preferred channel."); }
    catch { setShareNotice("Select and copy the request link manually."); }
  }

  async function lookup(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice(""); setResult(null);
    try {
      const response = await apiFetch("/api/email-lookup/check/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await response.json();
      if (response.status === 401 || response.status === 403) { router.replace("/login"); return; }
      if (!response.ok) throw new Error(data.detail || "Could not check this email address.");
      setResult(data);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not check this email address."); }
    finally { setBusy(false); }
  }

  async function sendConfirmation() {
    if (!result) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await apiFetch("/api/email-lookup/send-confirmation/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: result.email }) });
      const data = await response.json();
      if (response.status === 401 || response.status === 403) { router.replace("/login"); return; }
      if (!response.ok) throw new Error(data.detail || "Could not send a confirmation link.");
      setNotice(data.detail);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not send a confirmation link."); }
    finally { setBusy(false); }
  }

  const statusLabel = result?.domain_status === "mail_server_found" ? "Mail routing found" : result?.domain_status === "no_mail_server_found" ? "No mail routing found" : "DNS check unavailable";

  return <AppFrame><main className="app-page app-page-with-sidebar"><div className="app-page-content email-lookup-page">
    <div className="app-eyebrow">EMAIL TOOLS / LOOKUP</div><h1>Email lookup.</h1><p className="app-lede">Check whether an address is valid and its domain is configured to receive mail. Ask the recipient to confirm inbox access when you need a real-world check.</p>
    <section className="seo-explainer email-lookup-explainer"><span className="seo-explainer-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5M8.5 10.8h4.6M10.8 8.5v4.6"/></svg></span><div><strong>Two separate checks</strong><p>DNS can confirm that a domain has mail servers. Only opening the confirmation link shows that someone could access this inbox at that time. Neither check reveals who owns an address.</p></div></section>
    {error && <div className="app-alert error" role="alert">{error}</div>}{notice && <div className="app-alert" role="status">{notice}</div>}
    <div className="email-lookup-layout"><section className="app-card email-marketing-card"><span className="app-step-badge">ADDRESS CHECK</span><h2>Check a complete address</h2><p>Enter the full address. This lookup does not send email or store a contact.</p><form className="email-marketing-form" onSubmit={(event) => void lookup(event)}><label>Email address<input type="email" autoComplete="off" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="person@example.com"/></label><button className="app-primary" disabled={busy}>{busy ? "Checking DNS..." : "Check address"}</button></form></section>
      <section className="app-card email-marketing-card email-lookup-result" aria-live="polite"><span className="app-step-badge">RESULT</span>{!result ? <><h2>Ready to check</h2><p>Your result will show address syntax and public DNS mail-routing signals.</p></> : <><h2>{statusLabel}</h2><div className="email-lookup-result-grid"><div><small>Address format</small><strong>{result.syntax_valid ? "Valid" : "Invalid"}</strong></div><div><small>Mailbox ownership</small><strong>Not checked</strong></div></div>{result.domain_status === "mail_server_found" && <><p className="email-lookup-hosts">Mail server{result.mail_servers.length === 1 ? "" : "s"}: {result.mail_servers.join(", ")}</p><button type="button" className="app-secondary" disabled={busy} onClick={() => void sendConfirmation()}>{busy ? "Sending..." : "Send inbox confirmation link"}</button></>}{result.domain_status === "no_mail_server_found" && <p className="email-lookup-hosts">The domain did not publish a usable mail server in this DNS check.</p>}{result.domain_status === "dns_unavailable" && <p className="email-lookup-hosts">DNS could not return a reliable answer. Try again later.</p>}<p className="email-lookup-caveat">A DNS result cannot confirm whether this exact mailbox exists. Confirmation is complete only after the recipient opens the link.</p></>}</section></div>
    <section className="app-card email-marketing-card email-share-request-card"><span className="app-step-badge">ASK SOMEONE TO SHARE</span><h2>Request their email address</h2><p>Create a private link and send it through a channel you already use. They choose whether to enter their address and confirm it. You see the address only after confirmation. Links expire after seven days.</p><button type="button" className="app-primary" disabled={shareBusy} onClick={() => void createShareRequest()}>{shareBusy ? "Creating link..." : "Create email request link"}</button>{shareNotice && <p className="email-share-notice" role="status">{shareNotice}</p>}{shareUrl && <div className="email-share-link-row"><input aria-label="Email request link" readOnly value={shareUrl}/><button type="button" className="app-secondary" onClick={() => void copyShareUrl()}>Copy link</button></div>}<h3>Your requests</h3>{shareRequests.length === 0 ? <p className="email-empty">No request links yet.</p> : <div className="email-contact-list">{shareRequests.map((item) => <div className="email-contact-row" key={item.id}><div>{item.status === "confirmed" ? <><strong>{item.email}</strong><small>Confirmed {item.confirmed_at ? new Date(item.confirmed_at).toLocaleString() : ""}</small></> : <><strong>{item.status === "pending" ? "Waiting for recipient" : item.status === "confirmation_sent" ? "Confirmation email sent" : "Request expired"}</strong><small>Created {new Date(item.created_at).toLocaleString()} · Expires {new Date(item.expires_at).toLocaleDateString()}</small></>}</div><span className={`email-contact-status ${item.status}`}>{item.status.replaceAll("_", " ")}</span></div>)}</div>}</section>
  </div></main></AppFrame>;
}
