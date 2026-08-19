/**
 * One-time migration: move materials stored in Replit Object Storage (gcs://)
 * to Supabase Storage (supa://), so the app no longer depends on Replit's
 * GCS sidecar. Must be run from inside the Replit Shell — only Replit can
 * authenticate to its own Object Storage.
 *
 * Idempotent: skips rows that are no longer gcs://, safe to re-run after a
 * partial failure.
 *
 * Usage (from the Replit Shell): cd artifacts/api-server && node scripts/migrate-gcs-to-supabase.mjs
 */
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { Storage } from "@google-cloud/storage";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const SIDECAR = "http://127.0.0.1:1106";
const TARGET_BUCKET = "meeting-materials";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing: SUPABASE_URL, SUPABASE_KEY");
  process.exit(1);
}

// SUPABASE_URL may include a path (e.g. /rest/v1); strip to origin only.
const supabase = createClient(new URL(SUPABASE_URL).origin, SUPABASE_KEY);

const gcs = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${SIDECAR}/token`,
    type: "external_account",
    credential_source: {
      url: `${SIDECAR}/credential`,
      format: { type: "json", subject_token_field_name: "access_token" },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

const MIME = {
  ".pdf":  "application/pdf",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls":  "application/vnd.ms-excel",
  ".csv":  "text/csv",
  ".mp3":  "audio/mpeg",
  ".mp4":  "audio/mp4",
  ".m4a":  "audio/mp4",
  ".wav":  "audio/wav",
  ".ogg":  "audio/ogg",
  ".webm": "audio/webm",
  ".aac":  "audio/aac",
  ".flac": "audio/flac",
  ".aiff": "audio/aiff",
  ".aif":  "audio/aiff",
};

function parseGcsUrl(url) {
  const rest = url.slice("gcs://".length); // "bucket/path/to/file"
  const slash = rest.indexOf("/");
  return { bucketId: rest.slice(0, slash), objectName: rest.slice(slash + 1) };
}

async function main() {
  const { data: all, error } = await supabase
    .from("materials")
    .select("id, filename, original_name, type");

  if (error) { console.error("Supabase error:", error); process.exit(1); }

  const materials = (all ?? []).filter((m) => m.filename?.startsWith("gcs://"));
  console.log(`Found ${materials.length} materials still on Replit Object Storage.\n`);

  let ok = 0, failed = 0;

  for (const mat of materials) {
    const { bucketId, objectName } = parseGcsUrl(mat.filename);
    process.stdout.write(`  id=${mat.id}  ${mat.original_name}  ... `);

    let buffer;
    try {
      const file = gcs.bucket(bucketId).file(objectName);
      [buffer] = await file.download();
    } catch (err) {
      console.log(`FAILED (download) — ${err.message}`);
      failed++;
      continue;
    }

    const ext = path.extname(mat.original_name || objectName).toLowerCase();
    const contentType = MIME[ext] ?? "application/octet-stream";
    const newObjectPath = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;

    try {
      const { error: uploadErr } = await supabase.storage
        .from(TARGET_BUCKET)
        .upload(newObjectPath, buffer, { contentType, upsert: false });
      if (uploadErr) throw new Error(uploadErr.message);
    } catch (err) {
      console.log(`FAILED (upload) — ${err.message}`);
      failed++;
      continue;
    }

    const newFilename = `supa://${TARGET_BUCKET}/${newObjectPath}`;
    const { error: updateErr } = await supabase
      .from("materials")
      .update({ filename: newFilename })
      .eq("id", mat.id);

    if (updateErr) {
      console.log(`FAILED (db update) — ${updateErr.message}`);
      failed++;
      continue;
    }

    console.log(`OK → ${newFilename}`);
    ok++;
  }

  console.log(`\nDone. ${ok} migrated, ${failed} failed.`);
  if (failed > 0) {
    console.log("Re-run this script to retry the failed ones — it skips anything already migrated.");
    process.exit(1);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
