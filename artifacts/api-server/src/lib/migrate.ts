import { supabase } from "./supabase";
import { logger } from "./logger";

/**
 * Verify the Supabase connection is alive and tables exist before accepting requests.
 * Tables must be created in Supabase SQL Editor — see scripts/supabase-schema.sql.
 */
export async function runMigrations(): Promise<void> {
  const { error } = await supabase.from("projects").select("id").limit(1);

  if (!error || error.code === "PGRST116") {
    // PGRST116 = no rows — connection OK, table exists but is empty
    logger.info("Supabase connection verified ✓");
    return;
  }

  if (error.code === "PGRST125" || error.code === "42P01") {
    // Table doesn't exist — user needs to run the schema SQL
    const msg =
      "Database tables not found in Supabase. " +
      "Please run scripts/supabase-schema.sql in the Supabase SQL Editor " +
      "(supabase.com → your project → SQL Editor), then restart the server.";
    logger.error({ error }, msg);
    throw new Error(msg);
  }

  // Any other error (auth, network, etc.)
  logger.error({ error }, "Supabase connection check failed");
  throw new Error(`Supabase connection check failed: ${error.message} (code: ${error.code})`);
}
