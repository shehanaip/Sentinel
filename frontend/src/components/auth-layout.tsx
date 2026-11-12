import { ReactNode } from "react";
import { useAppLanguage } from "@/components/session-provider";

export function AuthLayout({ eyebrow, title, subtitle, children }: { eyebrow: string; title: string; subtitle: string; children: ReactNode }) {
  const { t } = useAppLanguage();
  return (
    <main className="auth-screen">
      <section className="auth-art-panel">
        <a className="auth-brand" href="/" aria-label={t("Sentinel home")}><span className="auth-brand-icon"><svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M20 3.5 34 9v9.2c0 8.5-5.6 14.7-14 18.3C11.6 32.9 6 26.7 6 18.2V9l14-5.5Z" fill="currentColor"/><path d="m13.3 20.1 4.2 4.2 9.3-9.4" stroke="#0d2431" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg></span><span>sentinel<span>.</span></span></a>
        <div className="auth-art-content">
          <span className="auth-art-kicker"><i/> {t("A CLEARER VIEW OF YOUR WEBSITES")}</span>
          <h2>{t("Be the first to know.")}<br/><em>{t("Stay a step ahead.")}</em></h2>
          <p>{t("Sentinel keeps uptime and essential security signals in one thoughtful workspace, so you can focus on what matters.")}</p>
          <div className="auth-signal-card"><span className="auth-signal-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12h4l2.2-6 4.1 12 2.2-6H21"/></svg></span><span><strong>{t("Clarity without the noise")}</strong><small>{t("Uptime, TLS, and security signals")}</small></span><span className="auth-signal-pulse"/></div>
        </div>
        <div className="auth-art-orbit orbit-outer"/><div className="auth-art-orbit orbit-inner"/><div className="auth-art-glow"/>
        <div className="auth-art-footer"><span>{t("BUILT FOR THE PEOPLE WHO BUILD THE WEB")}</span><span>01 <i/> 03</span></div>
      </section>
      <section className="auth-panel">
        <header className="auth-header"><a href="/" className="auth-back-link">{t("Back to overview")}</a><a href="/settings" className="auth-appearance-link"><span className="appearance-dot"/> {t("Appearance")}</a></header>
        <div className="auth-content">
          <div className="auth-content-kicker">{t(eyebrow)}</div>
          <h1>{t(title)}</h1>
          <p className="auth-subtitle">{t(subtitle)}</p>
          {children}
        </div>
        <footer className="auth-footer"><span>Sentinel</span><span>{t("Thoughtful monitoring for the modern web")}</span></footer>
      </section>
    </main>
  );
}