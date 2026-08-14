---
name: Storage routing by file type
description: Which storage backend each material type uses; Cloudinary blocks raw delivery on this account.
---

## Rule — storage routing

| Type | Backend | Stored URL prefix |
|------|---------|------------------|
| PDF, Excel | Replit Object Storage (GCS) | `gcs://` |
| PPTX | Supabase Storage | `supa://` |
| Image, audio | Cloudinary | `https://res.cloudinary.com/…` |

Do NOT upload PDF/Excel/PPTX to Cloudinary with `resource_type: "raw"` — this account blocks raw CDN delivery (401 regardless of signing).

## PPTX extraction
PPTX files are stored as raw binaries in Supabase Storage. Text is extracted with **JSZip** on the in-memory buffer: unzip → parse all `<a:t>` DrawingML text runs across `ppt/slides/slideN.xml` files. No Vision API, no per-slide cost.

**Why:** Cloudinary `resource_type:"image"` + `pg_N,f_jpg` slide rendering was the previous approach but required Claude Vision per slide. JSZip extraction is instant and free.

## Supabase Storage setup (required once per project)
- Bucket name: `meeting-materials` (private)
- RLS policies needed on `storage.objects` for the `anon` role:
  - INSERT: `WITH CHECK (bucket_id = 'meeting-materials')`
  - SELECT / UPDATE / DELETE: `USING (bucket_id = 'meeting-materials')`
- The `SUPABASE_KEY` env var is the **anon** key — it cannot create buckets or policies. Both must be done via Supabase Dashboard → SQL Editor.

## How to apply
- `artifacts/api-server/src/lib/storage.ts` — all three storage helpers (GCS, Supabase, Cloudinary)
- `GCS_TYPES = new Set(["pdf", "excel"])` and `SUPABASE_TYPES = new Set(["pptx"])` in materials.ts
- `extractPptxText(buffer)` in extractor.ts handles PPTX — no Cloudinary dependency
- Proxy route `GET /api/materials/:id/file`: check `isSupabaseStorageUrl` FIRST, then `isStorageUrl` (GCS), then legacy disk, then Cloudinary fetch
- Cleanup (`cleanup.ts`): handles `supa://` before `gcs://` before `http`
