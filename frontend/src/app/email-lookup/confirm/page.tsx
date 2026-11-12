"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAppLanguage } from "@/components/session-provider";

export default function ConfirmEmailLookupPage() {
  const { t } = useAppLanguage();
  const [state, setState] = useState<"working" | "done" | "error">("working");
  const [maskedEmail, setMaskedEmail] = useState("");
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token") || "";
    if (!token) { setState("error"); return; }
    void apiFetch("/api/email-lookup/confirm/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(); setMaskedEmail(data.email_masked); setState("done"); })
      .catch(() => setState("error"));
  }, []);
  return <main className="email-unsubscribe-page"><section className="app-card email-unsubscribe-card"><div className="app-eyebrow">{t("EMAIL LOOKUP")}</div><h1>{t(state === "working" ? "Checking confirmation…" : state === "done" ? "Inbox access confirmed." : "Link unavailable.")}</h1><p>{state === "done" ? <>{maskedEmail}{t(" opened the confirmation link. This confirms access at the time it was opened; it does not confirm identity or future deliverability.")}</> : t(state === "working" ? "Verifying this time-limited link." : "This link may have expired or is invalid. Run the lookup again and send a fresh confirmation link.")}</p>{state === "done" && <a className="app-primary" href="/email-lookup">{t("Return to Email Lookup")}</a>}</section></main>;
}
