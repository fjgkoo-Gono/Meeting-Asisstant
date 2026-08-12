import { v2 as cloudinary } from "cloudinary";
import os from "os";
import path from "path";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };

/** Map from material type to Cloudinary resource_type. */
export function getResourceType(materialType: string): "image" | "video" | "raw" {
  if (materialType === "photo" || materialType === "image") return "image";
  if (materialType === "audio") return "video"; // Cloudinary uses "video" for audio files
  return "raw"; // pdf, excel, etc.
}

/** Files above this size use upload_large (chunked) instead of upload_stream. */
const LARGE_UPLOAD_THRESHOLD = 60 * 1024 * 1024; // 60 MB

/**
 * Upload a Buffer to Cloudinary and return the secure URL and public_id.
 * Files ≤ 60 MB use upload_stream (single request).
 * Files > 60 MB are written to a temp file and sent via upload_large (chunked).
 */
export async function uploadBuffer(
  buffer: Buffer,
  resourceType: "image" | "video" | "raw",
): Promise<{ secure_url: string; public_id: string }> {
  const options = { resource_type: resourceType, folder: "meeting-materials", use_filename: false };

  if (buffer.length <= LARGE_UPLOAD_THRESHOLD) {
    // Small file: stream directly
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
        if (error) return reject(error);
        if (!result) return reject(new Error("No result from Cloudinary upload"));
        resolve({ secure_url: result.secure_url, public_id: result.public_id });
      });
      stream.end(buffer);
    });
  }

  // Large file: write to temp file, upload in chunks, then clean up
  const tmpPath = path.join(os.tmpdir(), `cloudinary-upload-${Date.now()}`);
  try {
    fs.writeFileSync(tmpPath, buffer);
    const result = (await cloudinary.uploader.upload_large(tmpPath, {
      ...options,
      chunk_size: 20 * 1024 * 1024, // 20 MB chunks
    })) as import("cloudinary").UploadApiResponse;
    return { secure_url: result.secure_url, public_id: result.public_id };
  } finally {
    try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
  }
}

/**
 * Extract the resource_type from a Cloudinary URL.
 * e.g. https://res.cloudinary.com/{cloud}/image/upload/... → "image"
 */
export function resourceTypeFromUrl(url: string): "image" | "video" | "raw" {
  if (url.includes("/image/upload/")) return "image";
  if (url.includes("/video/upload/")) return "video";
  return "raw";
}

/**
 * Extract the Cloudinary public_id from a secure URL.
 * Handles both versioned (/v12345/...) and non-versioned paths.
 * Returns null if the URL is not a recognized Cloudinary URL.
 */
export function extractPublicId(url: string): string | null {
  // Pattern: .../upload/[v{digits}/]{public_id}.{ext}
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^./]+)?$/);
  return match ? match[1] : null;
}

/**
 * Delete an asset from Cloudinary given its secure URL.
 * Silently ignores missing assets.
 */
export async function deleteFromUrl(url: string): Promise<void> {
  const publicId = extractPublicId(url);
  if (!publicId) return;
  const resourceType = resourceTypeFromUrl(url);
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch {
    // Non-fatal — asset may already be gone
  }
}
