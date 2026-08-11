import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_KEY;

if (!url || !key) {
  throw new Error("SUPABASE_URL and SUPABASE_KEY environment variables are required");
}

// The Python backend stores SUPABASE_URL as the full REST endpoint
// (e.g. https://xxx.supabase.co/rest/v1). The JS client only wants the
// base project URL (https://xxx.supabase.co), so we strip any path.
const baseUrl = new URL(url).origin;

export const supabase: SupabaseClient = createClient(baseUrl, key);

/** Convert a snake_case DB row to camelCase for the API layer */
export function toCamel<T = Record<string, unknown>>(row: Record<string, unknown>): T {
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [
      k.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase()),
      v,
    ]),
  ) as T;
}

export function rowsToCamel<T = Record<string, unknown>>(
  rows: Record<string, unknown>[],
): T[] {
  return rows.map((r) => toCamel<T>(r));
}

/** Throw a readable error if the Supabase response has an error */
export function assertOk({ error }: { error: { message: string; code?: string } | null }) {
  if (error) throw new Error(`Supabase error (${error.code ?? "?"}): ${error.message}`);
}
