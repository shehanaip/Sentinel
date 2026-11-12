"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAppLanguage } from "@/components/session-provider";

export default function ConfirmSharedEmailPage() {
  const { t } = useAppLanguage();
  const [state, setState] = useState<"working" | "done" | "error">("working");
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token") || "";
    if (!token) { setState("error"); return; }
    void apiFetch("/api/email-lookup/share-requests/confirm/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) })
      .then(async (response) => { if (!response.ok) throw new Error(); setState("done"); })
      .catch(() => setState("error"));
  }, []);
  return <main className="email-unsubscribe-page"><section className="app-card email-unsubscribe-card"><div className="app-eyebrow">{t("EMAIL REQUEST")}</div><h1>{t(state === "working" ? "Confirming your choice…" : state === "done" ? "Email shared." : "Link unavailable.")}</h1><p>{t(state === "done" ? "Your confirmed email address is now visible to the person who sent you the request link." : state === "working" ? "Verifying your confirmation link." : "This confirmation link may have expired or already been used. Ask the requester for a new link if you still want to share your address.")}</p></section></main>;
}
