import path from "path";
import { v2 as cloudinary } from "cloudinary";

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
  if (materialType === "pptx") return "image";  // Cloudinary converts PPTX slides to images
  return "raw"; // pdf, excel, etc.
}

/**
 * Upload a Buffer to Cloudinary and return the secure URL, public_id, and
 * optional page count (multi-page documents like PPTX return pages > 1).
 */
export function uploadBuffer(
  buffer: Buffer,
  resourceType: "image" | "video" | "raw",
  format?: string,
): Promise<{ secure_url: string; public_id: string; pages?: number }> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: resourceType, folder: "meeting-materials", use_filename: false, ...(format ? { format } : {}) },
      (error, result) => {
        if (error) return reject(error);
        if (!result) return reject(new Error("No result from Cloudinary upload"));
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
          pages: (result as unknown as { pages?: number }).pages,
        });
      },
    );
    stream.end(buffer);
  });
}

/**
 * Build a Cloudinary URL that delivers a specific page of a multi-page document
 * (PPTX, PDF) as a JPEG image.
 *
 * Inserts `pg_{pageIndex},f_jpg` transformation directly after `/upload/` so
 * the CDN renders the requested slide as an image.
 *
 * Example:
 *   buildSlideImageUrl("https://res.cloudinary.com/demo/image/upload/v1/meeting-materials/deck.pptx", 2)
 *   → "https://res.cloudinary.com/demo/image/upload/pg_2,f_jpg/v1/meeting-materials/deck.pptx"
 */
export function buildSlideImageUrl(baseUrl: string, pageIndex: number): string {
  return baseUrl.replace(/\/upload\//, `/upload/pg_${pageIndex},f_jpg/`);
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
 * Strips URL fragments (e.g. #pages=15 used to encode slide count).
 * Returns null if the URL is not a recognized Cloudinary URL.
 */
export function extractPublicId(url: string): string | null {
  // Strip fragment (e.g. #pages=15) before parsing
  const cleanUrl = url.split("#")[0];
  // Pattern: .../upload/[v{digits}/]{public_id}.{ext}
  const match = cleanUrl.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^./]+)?$/);
  return match ? match[1] : null;
}

/**
 * Generate a signed, time-limited download URL for a Cloudinary asset.
 * Raw resources (pdf, excel) block direct browser access; this URL includes
 * the API signature so Cloudinary serves the file without extra auth.
 * Defaults to a 1-hour expiry.
 */
export function generateDownloadUrl(fileUrl: string, expiresInSec = 3600): string {
  const publicId = extractPublicId(fileUrl);
  if (!publicId) return fileUrl;
  const resourceType = resourceTypeFromUrl(fileUrl);
  const ext = path.extname(new URL(fileUrl).pathname).slice(1); // e.g. "pdf"
  return cloudinary.utils.private_download_url(publicId, ext, {
    resource_type: resourceType,
    expires_at: Math.floor(Date.now() / 1000) + expiresInSec,
  } as Parameters<typeof cloudinary.utils.private_download_url>[2]);
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
