import { pool } from "@workspace/db";
import { logger } from "./logger";

/**
 * Ensure all required tables exist before the server starts accepting requests.
 * This uses idempotent CREATE TABLE IF NOT EXISTS so it is safe to run on every boot.
 */
export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id          SERIAL PRIMARY KEY,
        context_type TEXT    NOT NULL,
        context_id   INTEGER NOT NULL,
        role         TEXT    NOT NULL,
        content      TEXT    NOT NULL,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    logger.info("DB migrations applied (chat_messages ensured)");
  } catch (err) {
    logger.error({ err }, "Failed to apply DB migrations");
    throw err;
  } finally {
    client.release();
  }
}
