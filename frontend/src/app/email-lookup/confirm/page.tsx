"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export default function ConfirmEmailLookupPage() {
  const [state, setState] = useState<"working" | "done" | "error">("working");
  const [maskedEmail, setMaskedEmail] = useState("");
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token") || "";
    if (!token) { setState("error"); return; }
    void apiFetch("/api/email-lookup/confirm/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(); setMaskedEmail(data.email_masked); setState("done"); })
      .catch(() => setState("error"));
  }, []);
  return <main className="email-unsubscribe-page"><section className="app-card email-unsubscribe-card"><div className="app-eyebrow">EMAIL LOOKUP</div><h1>{state === "working" ? "Checking confirmation…" : state === "done" ? "Inbox access confirmed." : "Link unavailable."}</h1><p>{state === "done" ? `${maskedEmail} opened the confirmation link. This confirms access at the time it was opened; it does not confirm identity or future deliverability.` : state === "working" ? "Verifying this time-limited link." : "This link may have expired or is invalid. Run the lookup again and send a fresh confirmation link."}</p>{state === "done" && <a className="app-primary" href="/email-lookup">Return to Email Lookup</a>}</section></main>;
}
