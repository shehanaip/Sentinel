export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function csrfToken() {
  const response = await fetch(`${API_URL}/api/auth/csrf/`, { credentials: "include" });
  if (!response.ok) throw new Error("Could not prepare a secure request.");
  const payload = (await response.json()) as { csrfToken?: string };
  if (!payload.csrfToken) throw new Error("Could not prepare a secure request.");
  return payload.csrfToken;
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const method = (init.method || "GET").toUpperCase();
  const headers = new Headers(init.headers);
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    headers.set("X-CSRFToken", await csrfToken());
  }
  return fetch(`${API_URL}${path}`, { ...init, method, headers, credentials: "include" });
}