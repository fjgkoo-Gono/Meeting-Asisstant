/**
 * Replit Object Storage (GCS-backed) helpers for raw file types (PDF, Excel).
 *
 * Cloudinary blocks delivery of `resource_type: "raw"` on this account.
 * PDF/Excel files are stored in Replit Object Storage and served through
 * the API proxy route so no public GCS URL is needed.
 *
 * Images and audio continue to use Cloudinary (those resource types deliver fine).
 */
import path from "path";
import { Storage } from "@google-cloud/storage";

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
  } as ConstructorParameters<typeof Storage>[0]["credentials"],
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
