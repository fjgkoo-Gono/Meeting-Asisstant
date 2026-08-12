/**
 * One-time migration: upload local /uploads files to Replit Object Storage (GCS)
 * and update the filename column in Supabase.
 *
 * Usage: cd artifacts/api-server && node scripts/migrate-uploads-to-gcs.mjs
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { Storage } from "@google-cloud/storage";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const BUCKET_ID = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const SIDECAR = "http://127.0.0.1:1106";

if (!SUPABASE_URL || !SUPABASE_KEY || !BUCKET_ID) {
  console.error("Missing: SUPABASE_URL, SUPABASE_KEY, DEFAULT_OBJECT_STORAGE_BUCKET_ID");
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
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png":  "image/png",
  ".gif":  "image/gif",
  ".webp": "image/webp",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls":  "application/vnd.ms-excel",
  ".mp3":  "audio/mpeg",
  ".wav":  "audio/wav",
  ".m4a":  "audio/mp4",
};

async function main() {
  // Fetch all materials, filter locally (PostgREST doesn't support .not+like well)
  const { data: all, error } = await supabase
    .from("materials")
    .select("id, filename, original_name, type");

  if (error) { console.error("Supabase error:", error); process.exit(1); }

  const materials = (all ?? []).filter(
    m => m.filename && !m.filename.startsWith("http") && !m.filename.startsWith("gcs://")
  );
  console.log(`Found ${materials.length} materials with local filenames.\n`);

  for (const mat of materials) {
    const localPath = path.join(UPLOADS_DIR, mat.filename);
    if (!fs.existsSync(localPath)) {
      console.warn(`  SKIP  id=${mat.id} — not on disk: ${mat.filename}`);
      continue;
    }

    const buffer = fs.readFileSync(localPath);
    const ext = path.extname(mat.filename).toLowerCase();
    const contentType = MIME[ext] ?? "application/octet-stream";
    const objectKey = `meeting-materials/${mat.filename}`;

    process.stdout.write(`  UPLOAD id=${mat.id}  ${mat.filename}  (${buffer.length}B) ... `);
    try {
      await gcs.bucket(BUCKET_ID).file(objectKey).save(buffer, {
        metadata: { contentType },
        resumable: false,
      });
    } catch (err) {
      console.error(`FAILED — ${err.message}`);
      continue;
    }

    const newFilename = `gcs://${BUCKET_ID}/${objectKey}`;
    const { error: updateErr } = await supabase
      .from("materials")
      .update({ filename: newFilename })
      .eq("id", mat.id);

    if (updateErr) {
      console.error(`DB update failed: ${updateErr.message}`);
    } else {
      console.log(`OK → ${newFilename.slice(0, 80)}`);
    }
  }

  console.log("\nDone.");
}

main().catch(err => { console.error(err); process.exit(1); });
