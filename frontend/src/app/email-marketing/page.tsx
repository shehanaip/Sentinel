"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppFrame } from "@/components/app-frame";
import { apiFetch, API_URL } from "@/lib/api";
import { AccentPalette, useTheme } from "@/components/theme-provider";
import { useAppLanguage } from "@/components/session-provider";

type Contact = { id: string; email: string; name: string; status: "pending" | "subscribed" | "unsubscribed"; consent_source: string; consented_at: string; confirmed_at: string | null; unsubscribed_at: string | null; created_at: string };
type Campaign = { id: string; subject: string; brand_name?: string; accent_palette?: AccentPalette; status: "sent" | "partial" | "failed"; attempted_count: number; sent_count: number; failed_count: number; created_at: string; sent_at: string | null };
type Section = "audience" | "campaigns";
const emailAccentColors: Record<AccentPalette, string> = { emerald: "#168a6a", blue: "#4d74d9", violet: "#7959c7", rose: "#ce5275" };

export default function EmailMarketingPage() {
  const router = useRouter();
  const { language, t } = useAppLanguage();
  const { palette } = useTheme();
  const [section, setSection] = useState<Section>("audience");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [consentSource, setConsentSource] = useState("");
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [bulkEmails, setBulkEmails] = useState("");
  const [busy, setBusy] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [brandName, setBrandName] = useState("Sentinel");
  const [emailPalette, setEmailPalette] = useState<AccentPalette>("emerald");

  useEffect(() => { setEmailPalette(palette); }, [palette]);

  const load = useCallback(async () => {
    setError("");
    try {
      const [contactResponse, campaignResponse] = await Promise.all([
        fetch(`${API_URL}/api/email-marketing/contacts/`, { credentials: "include", cache: "no-store" }),
        fetch(`${API_URL}/api/email-marketing/campaigns/`, { credentials: "include", cache: "no-store" }),
      ]);
      if ([contactResponse.status, campaignResponse.status].some((status) => status === 401 || status === 403)) { router.replace("/login"); return; }
      if (!contactResponse.ok || !campaignResponse.ok) throw new Error(t("Could not load your email marketing workspace."));
      setContacts(await contactResponse.json()); setCampaigns(await campaignResponse.json());
    } catch (e) { setError(e instanceof Error ? e.message : t("Could not load your email marketing workspace.")); }
    finally { setLoading(false); }
  }, [router, t]);
  useEffect(() => { void load(); }, [load]);

  const subscribedCount = contacts.filter((contact) => contact.status === "subscribed").length;

  async function addContact(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const response = await apiFetch("/api/email-marketing/contacts/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, name, consent_source: consentSource, consent_confirmed: consentConfirmed }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || t("Could not add this contact."));
      setEmail(""); setName(""); setConsentSource(""); setConsentConfirmed(false);
      setNotice(t(data.result === "duplicate" ? "That address is already in your audience." : data.confirmation_sent ? "Confirmation sent. The contact can join your audience after confirming by email." : "Contact is pending confirmation. Email delivery failed or is not configured; check SMTP and retry confirmation from the contact list."));
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : t("Could not add this contact.")); }
    finally { setBusy(false); }
  }

  async function importContacts() {
    const rows = bulkEmails.split(/[\n,;]+/).map((value) => value.trim()).filter(Boolean).map((value) => ({ email: value }));
    if (!consentConfirmed) { setError(t("Confirm that every imported contact opted in before importing.")); return; }
    if (!rows.length || rows.length > 100) { setError(t("Paste between one and 100 email addresses per import.")); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await apiFetch("/api/email-marketing/contacts/import/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contacts: rows, consent_confirmed: true, consent_source: "Bulk import; opt-in confirmed by workspace owner" }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || t("Could not import these contacts."));
      setBulkEmails(""); setConsentConfirmed(false);
      setNotice(`${t("Import complete")}: ${data.added} ${t("pending")}, ${data.confirmations_sent} ${t("confirmation emails sent")}, ${data.confirmations_failed} ${t("confirmations failed")}, ${data.duplicates} ${t("duplicates")}, ${data.unsubscribed} ${t("suppressed")}, ${data.invalid} ${t("invalid")}.`);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : t("Could not import these contacts.")); }
    finally { setBusy(false); }
  }

  async function resendConfirmation(contact: Contact) {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await apiFetch(`/api/email-marketing/contacts/${contact.id}/resend-confirmation/`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || t("Could not resend confirmation."));
      setNotice(data.confirmation_sent ? `${t("Confirmation email resent to")} ${contact.email}.` : t("Email delivery is not configured or could not send. Check SMTP settings and try again."));
    } catch (e) { setError(e instanceof Error ? e.message : t("Could not resend confirmation.")); }
    finally { setBusy(false); }
  }

  async function sendCampaign(event: FormEvent) {
    event.preventDefault();
    if (!window.confirm(`${t("Send this email to up to")} ${Math.min(subscribedCount, 100)} ${t("opted-in contacts?")}`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await apiFetch("/api/email-marketing/campaigns/send/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject, body, brand_name: brandName, accent_palette: emailPalette }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || t("Could not send this campaign."));
      setSubject(""); setBody("");
      setNotice(`${t("Campaign")} ${t(data.status)}: ${data.sent_count} ${t("sent")}, ${data.failed_count} ${t("failed")}.`);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : t("Could not send this campaign.")); }
    finally { setBusy(false); }
  }

  const locale = language === "bn" ? "bn-BD" : "en-US";
  return <AppFrame><main className="app-page app-page-with-sidebar"><div className="app-page-content email-marketing-page">
    <div className="app-eyebrow">{t("AUDIENCE / EMAIL")}</div><h1>{t("Email marketing.")}</h1><p className="app-lede">{t("Manage people who chose to receive your updates, then send clear campaigns with a one-click unsubscribe option.")}</p>
    <section className="seo-explainer"><span className="seo-explainer-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg></span><div><strong>{t("Opt-in audience only")}</strong><p>{t("Gmail and other addresses are supported when the person opted in. Sentinel does not scrape websites for marketing contacts. Unsubscribed addresses stay suppressed.")}</p></div></section>
    {error && <div className="app-alert error" role="alert">{error}</div>}{notice && <div className="app-alert" role="status">{notice}</div>}
    <nav className="email-marketing-tabs" aria-label={t("Email marketing sections")}><button className={section === "audience" ? "active" : ""} aria-current={section === "audience" ? "page" : undefined} onClick={() => setSection("audience")} type="button">{t("Audience")} <span>{subscribedCount}</span></button><button className={section === "campaigns" ? "active" : ""} aria-current={section === "campaigns" ? "page" : undefined} onClick={() => setSection("campaigns")} type="button">{t("Campaigns")} <span>{campaigns.length}</span></button></nav>
    {section === "audience" ? <div className="email-marketing-columns"><section className="app-card email-marketing-card"><span className="app-step-badge">{t("ADD ONE CONTACT")}</span><h2>{t("Record an opt-in")}</h2><form onSubmit={(event) => void addContact(event)} className="email-marketing-form"><label>{t("Email address")}<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="person@gmail.com"/></label><label>{t("Name (optional)")}<input value={name} onChange={(event) => setName(event.target.value)} maxLength={120}/></label><label>{t("How did they opt in?")}<input required value={consentSource} onChange={(event) => setConsentSource(event.target.value)} placeholder={t("Your website signup form")} maxLength={120}/></label><label className="consent-check"><input type="checkbox" checked={consentConfirmed} onChange={(event) => setConsentConfirmed(event.target.checked)}/><span>{t("I confirm this person asked to receive these emails.")}</span></label><button className="app-primary" disabled={busy || !consentConfirmed}>{busy ? t("Saving...") : t("Add opted-in contact")}</button></form></section>
      <section className="app-card email-marketing-card"><span className="app-step-badge">{t("BULK IMPORT")}</span><h2>{t("Paste addresses")}</h2><p>{t("Paste up to 100 addresses separated by new lines, commas, or semicolons. Gmail is accepted. Import only people who opted in.")}</p><textarea className="email-bulk-input" rows={7} value={bulkEmails} onChange={(event) => setBulkEmails(event.target.value)} placeholder={"person1@gmail.com\nperson2@example.com"}/><label className="consent-check"><input type="checkbox" checked={consentConfirmed} onChange={(event) => setConsentConfirmed(event.target.checked)}/><span>{t("I confirm every address in this import opted in.")}</span></label><button className="app-primary" type="button" disabled={busy || !consentConfirmed} onClick={() => void importContacts()}>{busy ? t("Importing...") : t("Import opted-in contacts")}</button></section>
      <section className="app-card email-marketing-card audience-list-card"><div className="email-card-heading"><div><span className="app-step-badge">{t("YOUR AUDIENCE")}</span><h2>{t("Contacts")}</h2></div><span className="audience-count">{subscribedCount} {t("subscribed")}</span></div>{loading ? <p className="app-loading">{t("Loading contacts...")}</p> : contacts.length === 0 ? <p className="email-empty">{t("No contacts yet. Add one or import an opted-in list.")}</p> : <div className="email-contact-list">{contacts.map((contact) => <div className="email-contact-row" key={contact.id}><div><strong>{contact.name || contact.email}</strong>{contact.name && <small>{contact.email}</small>}<small>{t("Opt-in source")}: {contact.consent_source}</small></div><div className="email-contact-actions"><span className={`email-contact-status ${contact.status}`}>{t(contact.status)}</span>{contact.status === "pending" && <button type="button" className="email-small-action" disabled={busy} onClick={() => void resendConfirmation(contact)}>{t("Resend confirmation")}</button>}</div></div>)}</div>}</section></div> : <div className="email-campaign-layout"><section className="app-card email-marketing-card"><span className="app-step-badge">{t("NEW CAMPAIGN")}</span><h2>{t("Write your message")}</h2><p>{t("A branded HTML email with a plain-text alternative, sent individually to up to 100 subscribed contacts. Each message includes an unsubscribe link.")}</p><form className="email-marketing-form" onSubmit={(event) => void sendCampaign(event)}><label>{t("Brand name")}<input required maxLength={100} value={brandName} onChange={(event) => setBrandName(event.target.value)}/></label><label>{t("Email accent")}<select value={emailPalette} onChange={(event) => setEmailPalette(event.target.value as AccentPalette)}><option value="emerald">{t("Emerald")}</option><option value="blue">{t("Ocean blue")}</option><option value="violet">{t("Violet")}</option><option value="rose">{t("Rose")}</option></select></label><label>{t("Subject")}<input required maxLength={200} value={subject} onChange={(event) => setSubject(event.target.value)}/></label><label>{t("Message")}<textarea required rows={10} maxLength={20000} value={body} onChange={(event) => setBody(event.target.value)}/></label><div className="email-template-preview" style={{ borderTopColor: emailAccentColors[emailPalette] }}><div className="email-preview-toolbar"><span>{t("LIVE EMAIL PREVIEW")}</span><span>{t(emailPalette.charAt(0).toUpperCase() + emailPalette.slice(1))}</span></div><article><div className="email-preview-brand" style={{ color: emailAccentColors[emailPalette] }}>{brandName || t("Your brand")}</div><small>{t("AN UPDATE FOR YOU")}</small><h3>{subject || t("Your subject line")}</h3><p>{body || t("Your message will appear here. Add a clear, useful note for your subscribers.")}</p><footer>{t("You received this because you confirmed your subscription.")} <span style={{ color: emailAccentColors[emailPalette] }}>{t("Unsubscribe")}</span></footer></article></div><button className="app-primary" disabled={busy || subscribedCount === 0}>{busy ? t("Sending...") : `${t("Send to up to")} ${Math.min(subscribedCount, 100)} ${t("subscribed contacts")}`}</button></form></section><section className="app-card email-marketing-card campaign-history-card"><span className="app-step-badge">{t("RECENT ACTIVITY")}</span><h2>{t("Campaign history")}</h2>{campaigns.length === 0 ? <p className="email-empty">{t("No campaigns sent yet.")}</p> : <div className="email-contact-list">{campaigns.map((campaign) => <div className="email-contact-row" key={campaign.id}><div><strong>{campaign.subject}</strong><small>{campaign.sent_count} {t("sent")} · {campaign.failed_count} {t("failed")}</small><small>{new Date(campaign.created_at).toLocaleString()}</small></div><span className={`email-contact-status ${campaign.status}`}>{t(campaign.status)}</span></div>)}</div>}</section></div>}
    <p className="email-marketing-note">{t("Campaign sends are limited to 100 subscribed contacts and two sends per hour. Unsubscribes are applied immediately and remain suppressed.")}</p>
  </div></main></AppFrame>;
}
