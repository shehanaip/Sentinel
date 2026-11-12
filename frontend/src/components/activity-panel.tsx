"use client";

import { useState } from "react";
import { RecentUptime } from "@/components/recent-uptime";

const periods = [
  { hours: 1, label: "Last hour" },
  { hours: 6, label: "Last 6 hours" },
  { hours: 24, label: "Last 24 hours" },
];

export function ActivityPanel() {
  const [rangeHours, setRangeHours] = useState(24);
  const label = periods.find((period) => period.hours === rangeHours)?.label || "Last 24 hours";
  return <section className="surface-card activity-panel" id="activity">
    <div className="section-heading"><div><h2>Monitoring activity</h2><p>Uptime response time and recent checks</p></div>
      <label className="period-select-wrap"><span className="visually-hidden">Activity time range</span><select className="period-select" value={rangeHours} aria-label="Activity time range" onChange={(event) => setRangeHours(Number(event.target.value))}>{periods.map((period) => <option key={period.hours} value={period.hours}>{period.label}</option>)}</select><svg className="period-select-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="m5.5 7.5 4.5 4.5 4.5-4.5"/></svg></label>
    </div>
    <RecentUptime limit={5} rangeHours={rangeHours}/><a className="history-more" href="/history">View full check history</a>
  </section>;
}
