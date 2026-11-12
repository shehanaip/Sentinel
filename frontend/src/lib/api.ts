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

export async function readApiJson(response: Response): Promise<Record<string, unknown>> {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error(response.ok
      ? "The API returned an unexpected response. Check that the backend is running."
      : `The API returned HTTP ${response.status} without JSON. Restart the backend and check its API URL.`);
  }
  try {
    const payload: unknown = await response.json();
    if (payload && typeof payload === "object" && !Array.isArray(payload)) return payload as Record<string, unknown>;
    throw new Error("The API response was not an object.");
  } catch (error) {
    if (error instanceof Error && error.message === "The API response was not an object.") throw error;
    throw new Error("The API returned invalid JSON. Restart the backend and try again.");
  }
}
