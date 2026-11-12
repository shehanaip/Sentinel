"use client";

import { useEffect, useRef, useState } from "react";
import { AuthLayout } from "@/components/auth-layout";
import { apiFetch } from "@/lib/api";

type State = "loading" | "success" | "error";

export default function VerifyEmailPage() {
  const [state, setState] = useState<State>("loading");
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const params = new URLSearchParams(window.location.search);
    const email = params.get("email");
    const token = params.get("token");
    window.history.replaceState({}, "", "/auth/verify");
    if (!email || !token) { setState("error"); return; }
    void apiFetch("/api/auth/verify-email/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, token }) })
      .then((response) => { if (!response.ok) throw new Error("Verification failed"); setState("success"); })
      .catch(() => setState("error"));
  }, []);
  const title = state === "loading" ? "Verifying your email." : state === "success" ? "You're verified." : "This link has expired.";
  const subtitle = state === "loading" ? "Please wait while Sentinel confirms your email address." : state === "success" ? "Your account is active. Sign in to add and verify your first website." : "The link may be invalid, expired, or already used. You can create a new account verification request.";
  return <AuthLayout eyebrow="EMAIL VERIFICATION" title={title} subtitle={subtitle}><div className="auth-success-state"><strong>{state === "loading" ? "Checking your secure link" : state === "success" ? "Email address confirmed" : "Verification was not completed"}</strong><p>{state === "loading" ? "This usually takes a moment." : state === "success" ? "Your next step is to sign in, then connect a website." : "If you just registered, try the latest email in your inbox."}</p>{state !== "loading" && <a className="auth-primary-button" href={state === "success" ? "/login" : "/register"}>{state === "success" ? "Sign in" : "Create account"}<span aria-hidden="true">-&gt;</span></a>}</div></AuthLayout>;
}
