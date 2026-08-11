/**
 * Returns the base URL for raw fetch calls to the API server.
 * The API is served on the same origin at the /api path prefix.
 * Works in both dev (Vite dev server) and production (same-origin deployment).
 */
export function getBaseUrl(): string {
  // In the browser the API is always on the same origin
  return '';
}
