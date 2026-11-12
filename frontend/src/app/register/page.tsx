"use client";

import { FormEvent, useState } from "react";
import { AuthLayout } from "@/components/auth-layout";
import { apiFetch } from "@/lib/api";
import { useAppLanguage } from "@/components/session-provider";

export default function RegisterPage() {
  const { t } = useAppLanguage();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await apiFetch("/api/auth/register/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.get("name"), email: form.get("email"), password: form.get("password") }),
      });
      if (response.status === 503) {
        setMessage(t("Email delivery is unavailable right now. Check your SMTP settings and try again."));
        return;
      }
      if (!response.ok) {
        setMessage(t("Check your details and try again. Use a valid email and a password with at least 12 characters."));
        return;
      }
      setSubmitted(true);
    } catch {
      setMessage(t("Could not reach Sentinel. Make sure the API is running and try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout eyebrow="YOUR WORKSPACE STARTS HERE" title={submitted ? "Check your inbox." : "Create your account."} subtitle={submitted ? "We sent verification instructions if this address can be registered. Your account becomes active after you verify your email." : "A few details, then we will send you a secure email verification link."}>
      {submitted ? (
        <div className="auth-success-state"><span className="auth-success-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg></span><div><strong>{t("Verification email requested")}</strong><p>{t("Check your inbox and spam folder. The link expires in one hour.")}</p></div><a className="auth-primary-button" href="/login">{t("Continue to sign in")}</a></div>
      ) : (
        <form className="auth-form" onSubmit={submit}>
          <label className="auth-field"><span>{t("Your name")}</span><input name="name" autoComplete="name" placeholder={t("e.g. Jordan Lee")} maxLength={120} required/></label>
          <label className="auth-field"><span>{t("Email address")}</span><input name="email" type="email" autoComplete="email" placeholder="you@company.com" maxLength={254} required/></label>
          <label className="auth-field"><span>{t("Password")}</span><span className="password-wrap"><input name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder={t("At least 12 characters")} minLength={12} maxLength={128} required/><button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={t(showPassword ? "Hide password" : "Show password")}>{t(showPassword ? "Hide" : "Show")}</button></span><small>{t("Use 12 or more characters. Avoid common passwords.")}</small></label>
          {message && <div className="auth-error" role="alert">{message}</div>}
          <button className="auth-primary-button" type="submit" disabled={busy}>{busy ? t("Creating your account...") : t("Create account")}<span aria-hidden="true">-&gt;</span></button>
          <p className="auth-terms">{t("By creating an account, you agree to use Sentinel only for websites you own or are authorized to manage.")}</p>
          <div className="auth-switch">{t("Already have an account?")} <a href="/login">{t("Sign in")}</a></div>
        </form>
      )}
    </AuthLayout>
  );
}