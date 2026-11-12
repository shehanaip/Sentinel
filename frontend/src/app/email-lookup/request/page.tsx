"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export default function ShareEmailRequestPage() {
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"ready" | "sending" | "sent" | "error">("ready");
  const [error, setError] = useState("");
  useEffect(() => { setToken(new URLSearchParams(window.location.search).get("token") || ""); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault(); setState("sending"); setError("");
    try {
      const response = await apiFetch("/api/email-lookup/share-requests/submit/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ request_token: token, email }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Could not submit this email address.");
      setState("sent");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not submit this email address."); setState("error"); }
  }

  return <main className="email-unsubscribe-page"><section className="app-card email-unsubscribe-card email-share-public-card"><div className="app-eyebrow">EMAIL REQUEST</div><h1>{state === "sent" ? "Check your inbox." : "Choose whether to share your email."}</h1>{state === "sent" ? <p>A confirmation message was sent to the address you entered. The person who shared this link will see your address only after you confirm it.</p> : <><p>Someone sent you this Sentinel link to request your email address. Enter it only if you want to share it. You can ignore this request.</p>{error && <div className="app-alert error" role="alert">{error}</div>}<form className="email-marketing-form" onSubmit={(event) => void submit(event)}><label>Your email address<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com"/></label><label className="consent-check"><input type="checkbox" required/><span>I agree to share this address with the person who sent me this link.</span></label><button className="app-primary" disabled={!token || state === "sending"}>{state === "sending" ? "Sending confirmation..." : "Email me a confirmation link"}</button></form><p className="email-lookup-caveat">This does not subscribe you to marketing. Your address is shared with the requester only after you confirm it from your inbox.</p></>}</section></main>;
}
