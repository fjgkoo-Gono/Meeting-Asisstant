/**
 * Storage helpers for raw file types.
 *
 * PDF / Excel → Replit Object Storage (GCS). Cloudinary blocks raw delivery.
 * PPTX → Supabase Storage (supa:// prefix). Simple raw storage, text extracted via JSZip.
 * Images / audio → Cloudinary (those resource types deliver fine).
 *
 * URL schemes stored in DB:
 *   gcs://bucket/path   → Replit Object Storage
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
};

function mimeFor(filename: string): string {
  const ext = path.extname(filename).slice(1).toLowerCase();
  return MIME[ext] ?? "application/octet-stream";
}

/**
 * Upload a buffer to Replit Object Storage.
 * Returns a `gcs://bucket/path` reference stored in the DB and resolved by the proxy.
 */
export async function uploadToStorage(
  buffer: Buffer,
  originalFilename: string,
): Promise<string> {
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  if (!bucketId) throw new Error("DEFAULT_OBJECT_STORAGE_BUCKET_ID is not set");

  const ext = path.extname(originalFilename);
  const objectName = `meeting-materials/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const contentType = mimeFor(originalFilename);

  const file = gcsClient.bucket(bucketId).file(objectName);
  await file.save(buffer, { metadata: { contentType }, resumable: false });

  return `${GCS_PREFIX}${bucketId}/${objectName}`;
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

// ── Supabase Storage helpers (PPTX files) ─────────────────────────────────────

/** Internal URL scheme stored in the database for Supabase Storage files. */
const SUPA_PREFIX = "supa://";

const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

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
    contentType: PPTX_MIME,
    upsert: false,
  });
  if (error) throw new Error(`Supabase Storage upload failed: ${error.message}`);

  return `${SUPA_PREFIX}${bucket}/${objectPath}`;
}

/** Return true if the stored filename is a Supabase Storage reference. */
export function isSupabaseStorageUrl(url: string): boolean {
  return url.startsWith(SUPA_PREFIX);
}

/** Download a file from Supabase Storage and return its buffer. */
export async function downloadFromSupabaseStorage(url: string): Promise<Buffer> {
  const { bucket, objectPath } = supaParseUrl(url);
  const { data, error } = await supabase.storage.from(bucket).download(objectPath);
  if (error) throw new Error(`Supabase Storage download failed: ${error.message}`);
  return Buffer.from(await data.arrayBuffer());
}

/** Delete a file from Supabase Storage. Silently ignores missing files. */
export async function deleteFromSupabaseStorage(url: string): Promise<void> {
  const { bucket, objectPath } = supaParseUrl(url);
  await supabase.storage.from(bucket).remove([objectPath]);
  // Errors are intentionally swallowed — missing files are not a problem.
}
