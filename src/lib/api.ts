// Backend base URL for the Medik AI API.
// Set VITE_BACKEND_URL in .env (e.g. http://152.67.162.246 for the OCI server).
// Empty = same-origin relative calls (local dev via Vite proxy, or co-hosted).
export function apiUrl(path: string): string {
  const base = (import.meta.env.VITE_BACKEND_URL as string | undefined ?? '').replace(/\/+$/, '')
  return base ? `${base}${path}` : path
}

// Extra headers for backend calls (optional shared-secret gate).
export function apiHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const key = import.meta.env.VITE_BACKEND_API_KEY as string | undefined
  return key ? { ...extra, 'x-api-key': key } : extra
}
