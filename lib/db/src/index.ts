import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// SUPABASE_DATABASE_URL takes priority so both dev and production
// connect to the same shared Supabase PostgreSQL instance.
// Falls back to the Replit-managed DATABASE_URL (environment-local).
let connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "No database connection string found. Set SUPABASE_DATABASE_URL (shared) or DATABASE_URL.",
  );
}

const isSupabase = !!process.env.SUPABASE_DATABASE_URL;

// Supabase Transaction Pooler (port 6543) doesn't support prepared statements
// used by Drizzle ORM. Silently upgrade to Session Pooler (port 5432).
if (isSupabase && connectionString.includes(".pooler.supabase.com:6543")) {
  connectionString = connectionString.replace(
    ".pooler.supabase.com:6543",
    ".pooler.supabase.com:5432",
  );
}

export const pool = new Pool({
  connectionString,
  // Supabase requires SSL
  ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool, { schema });

export * from "./schema";
