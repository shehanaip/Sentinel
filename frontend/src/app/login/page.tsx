"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/auth-layout";
import { apiFetch } from "@/lib/api";
import { useSession } from "@/components/session-provider";

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useSession();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await apiFetch("/api/auth/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
      });
      if (!response.ok) {
        setMessage(response.status === 429 ? "Too many attempts. Wait a while and try again." : "Email or password is incorrect, or your email has not been verified.");
        return;
      }
      await refresh();
      router.push("/websites");
      router.refresh();
    } catch {
      setMessage("Could not reach Sentinel. Make sure the API is running and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout eyebrow="WELCOME BACK" title="Good to see you again." subtitle="Sign in to your workspace and pick up where you left off.">
      <form className="auth-form" onSubmit={submit}>
        <label className="auth-field"><span>Email address</span><input name="email" type="email" autoComplete="email" placeholder="you@company.com" required/></label>
        <label className="auth-field"><span>Password</span><span className="password-wrap"><input name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" required/><button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "Hide" : "Show"}</button></span></label>
        {message && <div className="auth-error" role="alert">{message}</div>}
        <button className="auth-primary-button" type="submit" disabled={busy}>{busy ? "Signing in..." : "Sign in"}<span aria-hidden="true">-&gt;</span></button>
        <div className="auth-switch">New to Sentinel? <a href="/register">Create an account</a></div>
      </form>
    </AuthLayout>
  );
}
