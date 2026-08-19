/**
 * Storage helpers for raw file types.
 *
 * PDF / Excel / audio / PPTX → Supabase Storage (supa:// prefix). Cloudinary
 * blocks raw delivery for PDF/Excel and rejects large audio files.
 * Images → Cloudinary (that resource type delivers fine).
 *
 * URL schemes stored in DB:
 *   gcs://bucket/path   → Replit Object Storage (legacy — read/delete only, kept for the one
 *                         file too large for Supabase Storage's free-tier 50MB limit; only
 *                         reachable while running inside Replit, since it needs the sidecar)
 *   supa://bucket/path  → Supabase Storage
 */
import path from "path";
import { Storage } from "@google-cloud/storage";
import { supabase } from "./supabase";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

const gcsClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: { type: "json", subject_token_field_name: "access_token" },
    },
    universe_domain: "googleapis.com",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any,
  projectId: "",
});

/** Internal URL scheme stored in the database for GCS-backed files. */
const GCS_PREFIX = "gcs://";

const MIME: Record<string, string> = {
  pdf:  "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls:  "application/vnd.ms-excel",
  csv:  "text/csv",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // Audio formats
  mp3:  "audio/mpeg",
  mp4:  "audio/mp4",
  m4a:  "audio/mp4",
  wav:  "audio/wav",
  ogg:  "audio/ogg",
  webm: "audio/webm",
  aac:  "audio/aac",
  flac: "audio/flac",
  aiff: "audio/aiff",
  aif:  "audio/aiff",
};

function mimeFor(filename: string): string {
  const ext = path.extname(filename).slice(1).toLowerCase();
  return MIME[ext] ?? "application/octet-stream";
}

/** Return true if the stored filename is a Replit Object Storage reference. */
export function isStorageUrl(url: string): boolean {
  return url.startsWith(GCS_PREFIX);
}

/**
 * Download a file from Replit Object Storage.
 * Used by the proxy route to stream the file to the client.
 */
export async function downloadFromStorage(
  url: string,
): Promise<{ buffer: Buffer; contentType: string }> {
  if (!url.startsWith(GCS_PREFIX)) throw new Error("Not a GCS storage URL");
  const rest = url.slice(GCS_PREFIX.length);           // "bucket/path/to/file"
  const slash = rest.indexOf("/");
  const bucketId = rest.slice(0, slash);
  const objectName = rest.slice(slash + 1);

  const file = gcsClient.bucket(bucketId).file(objectName);
  const [[data], [meta]] = await Promise.all([file.download(), file.getMetadata()]);
  const contentType = (meta.contentType as string) || "application/octet-stream";
  return { buffer: data as Buffer, contentType };
}

/** Delete a file from Replit Object Storage. Silently ignores missing files. */
export async function deleteFromStorage(url: string): Promise<void> {
  if (!url.startsWith(GCS_PREFIX)) return;
  const rest = url.slice(GCS_PREFIX.length);
  const slash = rest.indexOf("/");
  const bucketId = rest.slice(0, slash);
  const objectName = rest.slice(slash + 1);
  await gcsClient.bucket(bucketId).file(objectName).delete({ ignoreNotFound: true });
}

// ── Supabase Storage helpers (PDF / Excel / audio / PPTX) ────────────────────

/** Internal URL scheme stored in the database for Supabase Storage files. */
const SUPA_PREFIX = "supa://";

function supaParseUrl(url: string): { bucket: string; objectPath: string } {
  const rest = url.slice(SUPA_PREFIX.length); // "bucket/path/to/file"
  const slash = rest.indexOf("/");
  return { bucket: rest.slice(0, slash), objectPath: rest.slice(slash + 1) };
}

/** Upload a buffer to Supabase Storage. Returns a `supa://bucket/path` reference. */
export async function uploadToSupabaseStorage(
  buffer: Buffer,
  originalFilename: string,
): Promise<string> {
  const ext = path.extname(originalFilename);
  const objectPath = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const bucket = "meeting-materials";

  const { error } = await supabase.storage.from(bucket).upload(objectPath, buffer, {
    contentType: mimeFor(originalFilename),
    upsert: false,
  });
  if (error) throw new Error(`Supabase Storage upload failed: ${error.message}`);

  return `${SUPA_PREFIX}${bucket}/${objectPath}`;
}

/** Return true if the stored filename is a Supabase Storage reference. */
export function isSupabaseStorageUrl(url: string): boolean {
  return url.startsWith(SUPA_PREFIX);
}

/**
 * Download a file from Supabase Storage. Content-type is inferred from the
 * object path's extension (preserved from the original upload) rather than
 * queried from storage metadata, avoiding an extra API call.
 */
export async function downloadFromSupabaseStorage(
  url: string,
): Promise<{ buffer: Buffer; contentType: string }> {
  const { bucket, objectPath } = supaParseUrl(url);
  const { data, error } = await supabase.storage.from(bucket).download(objectPath);
  if (error) throw new Error(`Supabase Storage download failed: ${error.message}`);
  return { buffer: Buffer.from(await data.arrayBuffer()), contentType: mimeFor(objectPath) };
}

/** Delete a file from Supabase Storage. Silently ignores missing files. */
export async function deleteFromSupabaseStorage(url: string): Promise<void> {
  const { bucket, objectPath } = supaParseUrl(url);
  await supabase.storage.from(bucket).remove([objectPath]);
  // Errors are intentionally swallowed — missing files are not a problem.
}
