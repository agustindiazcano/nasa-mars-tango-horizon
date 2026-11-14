const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");

/** Resolves an HTTP backend endpoint against VITE_API_URL for cross-origin Vercel deployments. */
export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

/** Resolves a WebSocket backend endpoint against VITE_API_URL for cross-origin Vercel deployments. */
export function wsUrl(path: string): string {
  if (API_BASE) {
    return `${API_BASE.replace(/^http/, "ws")}${path}`;
  }
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}${path}`;
}
