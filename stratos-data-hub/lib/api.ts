/**
 * API origin. In dev, leave empty so requests use same-origin `/api/*`
 * rewrites (see next.config.ts). Set NEXT_PUBLIC_API_URL for production
 * or when the API is hosted on another domain.
 */
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === 'production' ? '' : '')

/** Build a full API URL from a path like `/api/stats`. */
export function apiUrl(path: string): string {
  if (path.startsWith('http')) return path
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE}${normalized}`
}

/**
 * Fetch wrapper that returns null on network failure instead of throwing.
 * Prevents dev overlay noise when the backend is not running yet.
 */
export async function apiFetch(
  path: string,
  init?: RequestInit
): Promise<Response | null> {
  try {
    return await fetch(apiUrl(path), init)
  } catch {
    return null
  }
}
