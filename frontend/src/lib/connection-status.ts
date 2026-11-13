import { API_URL } from "@/lib/api";

export type ConnectionState = "checking" | "connected" | "unavailable";
type Health = { status: string; database: string };

let state: ConnectionState = "checking";
let request: Promise<void> | null = null;
let interval: number | null = null;
const listeners = new Set<(value: ConnectionState) => void>();

function setState(value: ConnectionState) {
  state = value;
  listeners.forEach((listener) => listener(state));
}

function check() {
  if (request) return request;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);
  request = fetch(`${API_URL}/api/health/`, { cache: "no-store", signal: controller.signal })
    .then(async (response) => {
      if (!response.ok) throw new Error("Health endpoint unavailable");
      const health = await response.json() as Health;
      setState(health.status === "ok" && health.database === "ok" ? "connected" : "unavailable");
    })
    .catch(() => setState("unavailable"))
    .finally(() => { window.clearTimeout(timeout); request = null; });
  return request;
}

export function subscribeConnectionStatus(listener: (value: ConnectionState) => void) {
  listeners.add(listener);
  listener(state);
  if (listeners.size === 1) {
    void check();
    interval = window.setInterval(() => { void check(); }, 30000);
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size && interval !== null) {
      window.clearInterval(interval);
      interval = null;
    }
  };
}
