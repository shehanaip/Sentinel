"use client";

import { AppFrame } from "@/components/app-frame";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";

type Check = { id: string; domain: string; display_name: string; status: "up" | "down"; http_status: number | null; duration_ms: number; error_category: string; checked_at: string };

export default function HistoryPage() {
  const router = useRouter();
  const [checks, setChecks] = useState<Check[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/monitoring/checks/?limit=100`, { credentials: "include" });
      if (response.status === 401 || response.status === 403) { router.replace("/login"); return; }
      if (!response.ok) throw new Error("Could not load check history.");
      setChecks(await response.json());
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load check history."); }
    finally { setLoading(false); }
  }, [router]);
  useEffect(() => { void load(); }, [load]);
  return <AppFrame><main className="app-page app-page-with-sidebar"><div className="app-page-content"><div className="app-eyebrow">MONITORING / UPTIME</div><h1>Uptime history.</h1><p className="app-lede">HTTP availability checks for websites you have verified. Each check records the status, response code, and duration.</p>{error && <div className="app-alert error" role="alert">{error}</div>}{loading ? <div className="app-card app-loading">Loading check history...</div> : checks.length === 0 ? <div className="app-card app-empty"><strong>No checks have been recorded yet</strong><p>Open Websites and run a check for a verified site, or start the background monitor.</p><a className="app-primary history-action" href="/websites">Open websites</a></div> : <div className="app-card history-card"><div className="history-toolbar"><strong>Recent checks</strong><button className="app-secondary" onClick={() => void load()}>Refresh</button></div><div className="history-table-wrap"><table className="history-table"><thead><tr><th>Website</th><th>Status</th><th>HTTP</th><th>Duration</th><th>Checked</th></tr></thead><tbody>{checks.map((check) => <tr key={check.id}><td><strong>{check.display_name || check.domain}</strong><small>{check.domain}</small></td><td><span className={`uptime-state ${check.status}`}>{check.status === "up" ? "UP" : "DOWN"}</span></td><td>{check.http_status ?? check.error_category.replaceAll("_", " ")}</td><td>{check.duration_ms} ms</td><td><time dateTime={check.checked_at}>{new Date(check.checked_at).toLocaleString()}</time></td></tr>)}</tbody></table></div></div>}<a className="app-back-link" href="/">Back to overview</a></div></main></AppFrame>;
}
