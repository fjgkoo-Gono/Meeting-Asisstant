/**
 * Custom upload helpers for multipart file uploads.
 * These complement the Orval-generated `createMaterial` (JSON) with a
 * FormData-based variant for binary file uploads.
 */
import { customFetch } from "./custom-fetch";
import type { Material } from "./generated/api.schemas";

/**
 * Upload a binary file as a meeting material.
 * Sends multipart/form-data so the browser correctly sets the Content-Type
 * boundary — do NOT set Content-Type manually.
 */
export async function uploadFileMaterial(
  projectId: number,
  meetingId: number,
  type: "photo" | "image" | "pdf" | "excel" | "audio",
  file: File,
  contextNote?: string,
): Promise<Material> {
  const fd = new FormData();
  fd.append("type", type);
  fd.append("file", file);
  if (contextNote?.trim()) fd.append("contextNote", contextNote.trim());

  return customFetch<Material>(
    `/api/projects/${projectId}/meetings/${meetingId}/materials`,
    {
      method: "POST",
      body: fd,
      // No Content-Type header — browser sets it with the multipart boundary
    },
  );
}
