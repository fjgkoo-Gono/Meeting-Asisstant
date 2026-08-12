---
name: Cloudinary raw delivery blocked — use Replit Object Storage
description: Cloudinary blocks raw resource delivery on this account; solution is GCS for PDF/Excel.
---

## Rule
Do NOT store PDF or Excel files in Cloudinary with `resource_type: "raw"`. This account blocks raw delivery:
- Direct CDN URLs return 401 regardless of signing (private_download_url, sign_url, Basic Auth all fail)
- Cloudinary image and video/audio resource types work fine (200)

## Solution
PDF and Excel files → **Replit Object Storage** (GCS-backed).
Images and audio → Cloudinary (as before).

**Why:** Replit Object Storage is GCS-backed with sidecar auth. The GCS client downloads server-side with no public URL needed. The API proxy route streams the file to the client.

## How to apply
- `artifacts/api-server/src/lib/storage.ts` — GCS client, uploadToStorage / downloadFromStorage / deleteFromStorage
- `STORAGE_TYPES = new Set(["pdf", "excel"])` in materials.ts routes the upload decision
- Stored filename format: `gcs://bucket-id/meeting-materials/timestamp-random.ext`
- Proxy route `GET /api/materials/:id/file`: check isStorageUrl FIRST (before !http check), then GCS; then legacy disk; then Cloudinary fetch
- Web/mobile clients use `/api/materials/:id/file` for all file opens
- Bucket ID set by setupObjectStorage() → DEFAULT_OBJECT_STORAGE_BUCKET_ID env var
