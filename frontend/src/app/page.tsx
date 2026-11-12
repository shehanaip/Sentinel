"use client";

import type { ReactNode } from "react";
import ApiStatus from "@/components/api-status";
import { ActivityPanel } from "@/components/activity-panel";
import { UptimeSummary } from "@/components/uptime-summary";
import { AppFrame } from "@/components/app-frame";
import { WorkspaceAccount } from "@/components/workspace-account";
import { useAppLanguage } from "@/components/session-provider";

function BrandMark() {
  return <span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 40 40" fill="none"><path d="M20 3.5 34 9v9.2c0 8.5-5.6 14.7-14 18.3C11.6 32.9 6 26.7 6 18.2V9l14-5.5Z" fill="currentColor"/><path d="m13.3 20.1 4.2 4.2 9.3-9.4" stroke="#0d2431" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg></span>;
}

function Icon({ name }: { name: "overview" | "globe" | "shield" | "clock" | "arrow" | "spark" | "activity" | "plus" }) {
  const paths: Record<typeof name, ReactNode> = {
    overview: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/></>,
    globe: <><circle cx="12" cy="12" r="9"/><path d="M3.5 12h17M12 3c2.3 2.5 3.4 5.5 3.4 9S14.3 18.5 12 21c-2.3-2.5-3.4-5.5-3.4-9S9.7 5.5 12 3Z"/></>,
    shield: <><path d="M12 3 20 6v5.3c0 4.8-3.2 8.4-8 10.7-4.8-2.3-8-5.9-8-10.7V6l8-3Z"/><path d="m8.5 12 2.3 2.3 4.8-4.8"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    spark: <><path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z"/><path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z"/></>,
    activity: <><path d="M3 12h4l2.2-6 4.1 12 2.2-6H21"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
  };
  return <svg className="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export default function Home() {
  const { t } = useAppLanguage();
  return (
    <AppFrame><div className="main-panel" id="overview">
        <header className="topbar">
          <div className="mobile-brand"><BrandMark/><span>sentinel<span className="brand-period">.</span></span></div>
          <div className="topbar-context"><span className="context-dot"/> {t("Monitoring workspace")} <span className="context-divider">/</span> {t("Overview")}</div>
          <div className="topbar-actions"><div className="topbar-status"><ApiStatus/></div><WorkspaceAccount/></div>
        </header>

        <main className="dashboard-content">
          <section className="page-intro">
            <div><div className="eyebrow"><span className="eyebrow-line"/> {t("YOUR MONITORING OVERVIEW")}</div><h1>{t("Everything looks clearer from here.")}</h1><p>{t("Your website health, security signals, and recent activity will live in one place.")}</p></div>
            <a className="primary-action" href="/register"><Icon name="plus"/> {t("Create your account")}</a>
          </section>

          <section className="welcome-banner" aria-label="Workspace preview">
            <div className="welcome-orb orb-one"/><div className="welcome-orb orb-two"/>
            <div className="welcome-copy"><span className="preview-label"><Icon name="spark"/> {t("WORKSPACE PREVIEW")}</span><h2>{t("A quieter way to watch over your websites.")}</h2><p>{t("Start with one site. Sentinel will make uptime and important security changes easier to understand.")}</p><a href="/register" className="banner-link">{t("Set up your workspace")} <Icon name="arrow"/></a></div>
            <div className="banner-art" aria-hidden="true"><div className="art-ring ring-back"/><div className="art-ring ring-front"/><div className="art-core"><BrandMark/></div><span className="art-spark spark-a">*</span><span className="art-spark spark-b">+</span><span className="art-orbit orbit-a"/><span className="art-orbit orbit-b"/></div>
          </section>

          <UptimeSummary/>

          <div className="dashboard-grid">
            <ActivityPanel/>

            <section className="surface-card setup-panel" id="security">
              <div className="section-heading"><div><h2>{t("Setup guide")}</h2><p>{t("A few steps to your first signal")}</p></div></div>
              <ol className="setup-list">
                <li className="setup-item current"><span className="step-number">01</span><span className="step-copy"><strong>{t("Create your account")}</strong><small>{t("Save your monitoring workspace")}</small></span><a className="step-action" href="/register" aria-label={t("Create your account")}><Icon name="arrow"/></a></li>
                <li className="setup-item"><span className="step-number">02</span><span className="step-copy"><strong>{t("Add a website")}</strong><small>{t("Choose a site you own or manage")}</small></span><a className="step-action" href="/websites" aria-label={t("Open website setup")}><Icon name="arrow"/></a></li>
                <li className="setup-item"><span className="step-number">03</span><span className="step-copy"><strong>{t("Verify ownership")}</strong><small>{t("Confirm you are allowed to monitor it")}</small></span><a className="step-action" href="/websites" aria-label={t("Open website setup")}><Icon name="arrow"/></a></li>
              </ol>
              <a href="/websites" className="setup-footer-link">{t("Continue setup")} <Icon name="arrow"/></a>
            </section>
          </div>

          <div className="bottom-grid">
            <section className="surface-card websites-panel" id="websites"><div className="section-heading"><div><h2>{t("Your websites")}</h2><p>{t("Sites connected to this workspace")}</p></div><a className="text-action" href="/websites">{t("Manage sites")} <Icon name="arrow"/></a></div><div className="website-empty"><span className="website-empty-icon"><Icon name="globe"/></span><div><strong>{t("Set up your first website")}</strong><p>{t("Add a domain, then verify it with a DNS TXT record.")}</p></div><a href="/websites" className="round-arrow" aria-label={t("Add a website")}><Icon name="arrow"/></a></div></section>
            <section className="surface-card connection-panel"><div className="section-heading"><div><h2>{t("System connection")}</h2><p>{t("Live API and database status")}</p></div><span className="live-indicator"><i/> {t("LIVE")}</span></div><div className="connection-row"><span className="connection-symbol"><Icon name="activity"/></span><span className="connection-copy"><strong>{t("Sentinel API")}</strong><small>{t("Application availability")}</small></span><ApiStatus compact/></div><div className="connection-note">{t("Status updates automatically when this page loads.")}</div></section>
          </div>
          <footer className="dashboard-footer"><span>Sentinel <span className="footer-dot">•</span> {t("Website monitoring, made clearer.")}</span><a href="/settings">{t("Appearance settings")} <Icon name="arrow"/></a></footer>
        </main>
      </div>
  </AppFrame>
  );
}
