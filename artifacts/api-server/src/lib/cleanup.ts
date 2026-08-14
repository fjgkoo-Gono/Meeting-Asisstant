/**
 * Shared storage cleanup helpers.
 * Used by DELETE endpoints for meetings and projects to remove files from
 * Replit Object Storage (GCS), Cloudinary, or the legacy local uploads dir
 * after the database rows have been deleted.
 */
import path from "path";
import fs from "fs";
import { isStorageUrl, deleteFromStorage, isSupabaseStorageUrl, deleteFromSupabaseStorage } from "./storage";
import { deleteFromUrl } from "./cloudinary";
import { logger } from "./logger";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

/**
 * Delete a single stored file by its `filename` value as stored in the DB.
 * Handles three cases:
 *   - `gcs://…`  → Replit Object Storage
 *   - `http://…` / `https://…` → Cloudinary (image / audio)
 *   - anything else → legacy local file under uploads/
 *
 * Errors are caught and logged as warnings; they never propagate to the caller.
 */
export async function deleteStorageFile(
  filename: string,
  materialId: string | number,
): Promise<void> {
  try {
    if (isSupabaseStorageUrl(filename)) {
      await deleteFromSupabaseStorage(filename);
    } else if (isStorageUrl(filename)) {
      await deleteFromStorage(filename);
    } else if (filename.startsWith("http")) {
      await deleteFromUrl(filename);
    } else {
      await new Promise<void>((resolve) => {
        const legacyPath = path.join(UPLOADS_DIR, filename);
        fs.unlink(legacyPath, (err) => {
          if (err && (err as NodeJS.ErrnoException).code !== "ENOENT") {
            logger.warn({ err, materialId }, "Failed to delete legacy material file");
          }
          resolve();
        });
      });
    }
  } catch (err) {
    logger.warn({ err, materialId }, "Failed to delete storage file for material");
  }
}

/**
 * Delete storage files for an array of materials asynchronously (non-blocking).
 * Kicks off all deletions in parallel and does not await them so the caller
 * can respond to the HTTP client immediately.
 */
export function deleteStorageFilesAsync(
  materials: Array<{ id: string | number; filename: string | null }>,
): void {
  for (const mat of materials) {
    if (mat.filename) {
      deleteStorageFile(mat.filename, mat.id).catch(() => {
        // Already logged inside deleteStorageFile
      });
    }
  }
}
