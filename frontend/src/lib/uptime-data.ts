import { API_URL } from "@/lib/api";

export type UptimeRecord = { id: string; domain: string; display_name?: string; status: "up" | "down"; http_status: number | null; duration_ms: number; error_category: string; checked_at: string };

let recordsRequest: Promise<UptimeRecord[]> | null = null;
let recordsRequestExpires = 0;

export function loadUptimeRecords(): Promise<UptimeRecord[]> {
  if (recordsRequest && Date.now() < recordsRequestExpires) return recordsRequest;
  recordsRequestExpires = Date.now() + 5000;
  recordsRequest = fetch(`${API_URL}/api/monitoring/checks/?limit=100`, { credentials: "include", cache: "no-store" })
    .then((response) => response.ok ? response.json() as Promise<UptimeRecord[]> : [])
    .catch(() => []);
  return recordsRequest;
}
