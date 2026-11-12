"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAppLanguage } from "@/components/session-provider";

export default function ConfirmSubscriptionPage() {
  const { t } = useAppLanguage();
  const [token, setToken] = useState("");
  const [state, setState] = useState<"ready" | "working" | "done" | "error">("ready");
  useEffect(() => { setToken(new URLSearchParams(window.location.search).get("token") || ""); }, []);

  async function confirm() {
    setState("working");
    try {
      const response = await apiFetch("/api/email-marketing/confirm/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      if (!response.ok) throw new Error("Confirmation failed.");
      setState("done");
    } catch { setState("error"); }
  }

  return <main className="email-unsubscribe-page"><section className="app-card email-unsubscribe-card"><div className="app-eyebrow">{t("EMAIL PREFERENCES")}</div><h1>{t(state === "done" ? "Subscription confirmed." : "Confirm your subscription")}</h1><p>{t(state === "done" ? "This address can now receive email updates. You can unsubscribe from any campaign." : state === "error" ? "This link may be invalid, expired, or already used. Ask the workspace owner to send a new confirmation." : "Confirm that you want to receive email updates from this workspace.")}</p>{state !== "done" && <button className="app-primary" type="button" disabled={!token || state === "working"} onClick={() => void confirm()}>{t(state === "working" ? "Confirming..." : "Confirm subscription")}</button>}</section></main>;
}
