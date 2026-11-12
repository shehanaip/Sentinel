"use client";

import { useEffect, useState } from "react";
import { loadUptimeRecords, UptimeRecord } from "@/lib/uptime-data";

type Check = UptimeRecord;

export function RecentUptime({ limit = 5, rangeHours = 24 }: { limit?: number; rangeHours?: number }) {
  const [checks, setChecks] = useState<Check[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false;
    loadUptimeRecords()
      .then((items) => { if (!cancelled) setChecks(items); })
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, []);
  if (!loaded) return <div className="uptime-empty">Loading check history...</div>;
  if (checks.length === 0) return <div className="uptime-empty"><strong>No uptime checks yet</strong><p>Verify a website, run a check, or start the monitoring worker to see real results here.</p><a href="/websites">Go to websites</a></div>;

  const now = Date.now();
  const rangeMs = rangeHours * 60 * 60 * 1000;
  const chartChecks = checks.filter((check) => new Date(check.checked_at).getTime() >= now - rangeMs).slice().reverse();
  const maxDuration = Math.max(1000, ...chartChecks.map((check) => check.duration_ms)) * 1.15;
  const points = chartChecks.map((check) => {
    const timestamp = new Date(check.checked_at).getTime();
    const x = 42 + ((timestamp - (now - rangeMs)) / rangeMs) * 680;
    const y = 174 - Math.min(check.duration_ms / maxDuration, 1) * 126;
    return { check, x, y };
  });
  const line = points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const area = points.length ? `M ${points[0].x.toFixed(1)} 184 L ${line.replaceAll(" ", " L ")} L ${points[points.length - 1].x.toFixed(1)} 184 Z` : "";
  return <div className="uptime-visual"><div className="graph-meta"><span>HTTPS response time <small>Last 24 hours</small></span><span className="graph-legend"><i/> Up <i className="down-dot"/> Down</span></div>
    {chartChecks.length === 0 ? <div className="uptime-empty graph-empty"><strong>No checks in the last {rangeHours === 1 ? "hour" : `${rangeHours} hours`}</strong><p>Choose a wider range or view the full saved history.</p></div> : <svg className="uptime-chart" viewBox="0 0 760 232" role="img" aria-label={`Response time graph from uptime checks in the last ${rangeHours} hours`}><defs><linearGradient id="uptime-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity=".22"/><stop offset="100%" stopColor="var(--accent)" stopOpacity="0"/></linearGradient></defs>{[48, 90, 132, 174].map((y) => <g key={y}><line x1="42" x2="722" y1={y} y2={y} className="graph-grid-line"/><text x="4" y={y + 3} className="graph-axis-text">{Math.round(((174 - y) / 126) * maxDuration)} ms</text></g>)}<path d={area} fill="url(#uptime-area)"/><polyline points={line} className="graph-line"/>{points.map(({ check, x, y }) => <circle key={check.id} cx={x} cy={y} r={check.status === "up" ? 4 : 5} className={`graph-point ${check.status}`}><title>{`${check.domain}: ${check.status}, ${check.duration_ms} ms, ${new Date(check.checked_at).toLocaleString()}`}</title></circle>)}{[0, 1, 2, 3, 4].map((step) => { const hoursAgo = Math.round(rangeHours * (4 - step) / 4); const text = step === 4 ? "Now" : rangeHours === 1 ? `${hoursAgo * 60}m ago` : `${hoursAgo}h ago`; return <text key={step} x={42 + (step / 4) * 680} y="215" textAnchor={step === 0 ? "start" : step === 4 ? "end" : "middle"} className="graph-axis-text">{text}</text>; })}</svg>}
    <div className="uptime-list">{checks.slice(0, limit).map((check) => <div className="uptime-row" key={check.id}><span className={`uptime-state ${check.status}`}>{check.status === "up" ? "UP" : "DOWN"}</span><span className="uptime-site"><strong>{check.display_name || check.domain}</strong><small>{check.domain}</small></span><span className="uptime-code">{check.http_status ?? check.error_category.replaceAll("_", " ")}</span><span className="uptime-latency">{check.duration_ms} ms</span><time dateTime={check.checked_at}>{new Date(check.checked_at).toLocaleString()}</time></div>)}</div>
  </div>;
}
