"use client";

import { useEffect, useState } from "react";
import { loadUptimeRecords, UptimeRecord } from "@/lib/uptime-data";

type Check = Pick<UptimeRecord, "domain" | "status" | "checked_at">;

export function UptimeSummary() {
  const [checks, setChecks] = useState<Check[]>([]);
  useEffect(() => {
    let cancelled = false;
    void loadUptimeRecords().then((items) => { if (!cancelled) setChecks(items); });
    return () => { cancelled = true; };
  }, []);
  const latest = new Map<string, Check>();
  for (const check of checks) if (!latest.has(check.domain)) latest.set(check.domain, check);
  const up = [...latest.values()].filter((check) => check.status === "up").length;
  const newest = checks[0];
  const metrics: { label: string; value: string; detail: string; color: string; href?: string }[] = [
    { label: "Sites checked", value: String(latest.size), detail: "Unique sites with a recorded uptime result", color: "mint" },
    { label: "Latest results", value: latest.size ? `${up} / ${latest.size} up` : "No checks yet", detail: "Most recent saved result for each site", color: "blue" },
    { label: "Security checks", value: "Open checks", detail: "Review website security headers", color: "violet", href: "/security" },
    { label: "Last check", value: newest ? new Date(newest.checked_at).toLocaleString() : "--", detail: "Most recent recorded uptime check", color: "amber" },
  ];
  return <section className="metrics-grid" aria-label="Monitoring summary">{metrics.map((metric) => { const content = <><div className="metric-topline"><span className={`metric-icon ${metric.color}`} aria-hidden="true">{metric.color === "mint" ? "W" : metric.color === "blue" ? "↑" : metric.color === "violet" ? "S" : "◷"}</span><span className="metric-menu" aria-hidden="true">{metric.href ? "↗" : "···"}</span></div><p className="metric-label">{metric.label}</p><p className="metric-value">{metric.value}</p><p className="metric-detail">{metric.detail}</p></>; return metric.href ? <a className="metric-card metric-card-link" href={metric.href} key={metric.label}>{content}</a> : <article className="metric-card" key={metric.label}>{content}</article>; })}</section>;
}
