import { supabase } from '@/lib/supabase';

/**
 * Returns the base URL for raw fetch calls to the API server.
 * The API is served on the same origin at the /api path prefix.
 * Works in both dev (Vite dev server) and production (same-origin deployment).
 */
export function getBaseUrl(): string {
  // In the browser the API is always on the same origin
  return '';
}

/**
 * Auth header for raw `fetch()` calls that bypass the generated API client
 * (which attaches this automatically via `setAuthTokenGetter`) — e.g. SSE
 * streaming (ChatPanel) and blob downloads (file viewer). Must be spread
 * into every such call or the api-server's auth middleware 401s it.
 */
export async function getAuthHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
