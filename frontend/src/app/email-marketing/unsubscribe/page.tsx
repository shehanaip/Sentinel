"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAppLanguage } from "@/components/session-provider";

export default function UnsubscribePage() {
  const { t } = useAppLanguage();
  const [token, setToken] = useState("");
  const [state, setState] = useState<"ready" | "working" | "done" | "error">("ready");
  useEffect(() => { setToken(new URLSearchParams(window.location.search).get("token") || ""); }, []);

  async function unsubscribe() {
    setState("working");
    try {
      const response = await apiFetch("/api/email-marketing/unsubscribe/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      if (!response.ok) throw new Error("Unsubscribe request failed.");
      setState("done");
    } catch { setState("error"); }
  }

  return <main className="email-unsubscribe-page"><section className="app-card email-unsubscribe-card"><div className="app-eyebrow">{t("EMAIL PREFERENCES")}</div><h1>{t(state === "done" ? "You’re unsubscribed." : "Unsubscribe from updates")}</h1><p>{t(state === "done" ? "This address has been suppressed and will not receive future campaigns from this workspace." : state === "error" ? "We could not process this link. It may be invalid or expired." : "Confirm below to stop marketing emails from this workspace.")}</p>{state !== "done" && <button className="app-primary" type="button" disabled={!token || state === "working"} onClick={() => void unsubscribe()}>{t(state === "working" ? "Updating preferences..." : "Unsubscribe")}</button>}</section></main>;
}
