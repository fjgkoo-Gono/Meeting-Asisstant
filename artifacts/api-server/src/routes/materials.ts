import { Router, type IRouter } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { supabase, toCamel, rowsToCamel } from "../lib/supabase";
import {
  ListMaterialsParams,
  ListMaterialsResponse,
  CreateMaterialParams,
  CreateMaterialBody,
  CreateMaterialResponse,
  RetryMaterialParams,
  RetryMaterialResponse,
  DeleteMaterialParams,
  UpdateMaterialSpeakersParams,
  UpdateMaterialSpeakersBody,
  UpdateMaterialSpeakersResponse,
} from "@workspace/api-zod";
import { extractText, extractTextFromBuffer, transcribeAudioBuffer, type MaterialType } from "../lib/extractor";
import { uploadBuffer, getResourceType, deleteFromUrl } from "../lib/cloudinary";
import { uploadToStorage, isStorageUrl, downloadFromStorage, deleteFromStorage } from "../lib/storage";
import { logger } from "../lib/logger";

/** Material types delivered via Supabase Storage (Cloudinary blocks raw delivery). */
const STORAGE_TYPES = new Set<string>(["pdf", "excel"]);

const router: IRouter = Router();

// Legacy uploads directory — used only for pre-Cloudinary materials still on disk
const UPLOADS_DIR = path.join(process.cwd(), "uploads");

/**
 * Resolve a material's stored filename to a value extractText can consume.
 * - Cloudinary URL (starts with http) → passed through as-is (extractor downloads it)
 * - Legacy short name → resolved to the local uploads directory path
 */
function resolveFileRef(filename: string): string {
  if (filename.startsWith("http")) return filename;
  return path.join(UPLOADS_DIR, filename);
}

// Use memory storage — files go to Cloudinary, not local disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
});

const FILE_MATERIAL_TYPES: MaterialType[] = ["photo", "image", "pdf", "excel", "audio"];

type ResolveError = { ok: false; error: string; status: 404 };
type ResolveSuccess = { ok: true };

async function resolveMeeting(
  projectId: number,
  meetingId: number,
): Promise<ResolveError | ResolveSuccess> {
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .single();
  if (!project) return { ok: false, error: "Project not found", status: 404 };

  const { data: meeting } = await supabase
    .from("meetings")
    .select("id")
    .eq("id", meetingId)
    .eq("project_id", projectId)
    .single();
  if (!meeting) return { ok: false, error: "Meeting not found", status: 404 };

  return { ok: true };
}

// GET /projects/:projectId/meetings/:meetingId/materials
router.get(
  "/projects/:projectId/meetings/:meetingId/materials",
  async (req, res): Promise<void> => {
    const params = ListMaterialsParams.safeParse(req.params);
    if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

    const resolved = await resolveMeeting(params.data.projectId, params.data.meetingId);
    if (!resolved.ok) { res.status(resolved.status).json({ error: resolved.error }); return; }

    const { data, error } = await supabase
      .from("materials")
      .select("*")
      .eq("meeting_id", params.data.meetingId)
      .order("created_at", { ascending: false });
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(ListMaterialsResponse.parse(rowsToCamel(data ?? [])));
  },
);

// POST /projects/:projectId/meetings/:meetingId/materials
router.post(
  "/projects/:projectId/meetings/:meetingId/materials",
  upload.single("file"),
  async (req, res): Promise<void> => {
    const params = CreateMaterialParams.safeParse(req.params);
    if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

    const resolved = await resolveMeeting(params.data.projectId, params.data.meetingId);
    if (!resolved.ok) { res.status(resolved.status).json({ error: resolved.error }); return; }

    const rawType = req.body?.type as string | undefined;

    // ── Text / transcription path ──────────────────────────────────────────
    if (rawType === "text") {
      const body = CreateMaterialBody.safeParse(req.body);
      if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

      const { data, error } = await supabase
        .from("materials")
        .insert({
          meeting_id: params.data.meetingId,
          type: "text",
          filename: "",
          original_name: body.data.name ?? "Transcription",
          extracted_text: body.data.content,
          context_note: body.data.contextNote ?? null,
          status: "ready",
        })
        .select()
        .single();
      if (error) { res.status(500).json({ error: error.message }); return; }
      res.status(201).json(CreateMaterialResponse.parse(toCamel(data)));
      return;
    }

    // ── File upload path ───────────────────────────────────────────────────
    if (!rawType || !FILE_MATERIAL_TYPES.includes(rawType as MaterialType)) {
      res.status(400).json({
        error: `Invalid type. Must be one of: ${[...FILE_MATERIAL_TYPES, "text"].join(", ")}`,
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "File is required for this material type" });
      return;
    }

    const materialType = rawType as MaterialType;
    const rawContextNote = req.body?.contextNote as string | undefined;

    // Route upload: PDF/Excel → Supabase Storage (Cloudinary blocks raw delivery);
    // images/audio → Cloudinary (those resource types deliver fine).
    let storedUrl: string;
    try {
      if (STORAGE_TYPES.has(materialType)) {
        storedUrl = await uploadToStorage(req.file.buffer, req.file.originalname);
      } else {
        const resourceType = getResourceType(materialType);
        const ext = path.extname(req.file.originalname).slice(1).toLowerCase();
        const { secure_url } = await uploadBuffer(req.file.buffer, resourceType, ext || undefined);
        storedUrl = secure_url;
      }
    } catch (uploadErr) {
      logger.error({ uploadErr }, "File upload failed");
      res.status(500).json({ error: "Failed to upload file to storage" });
      return;
    }

    const { data, error } = await supabase
      .from("materials")
      .insert({
        meeting_id: params.data.meetingId,
        type: materialType,
        filename: storedUrl,              // Supabase Storage or Cloudinary URL
        original_name: req.file.originalname,
        extracted_text: null,
        context_note: rawContextNote?.trim() || null,
        status: "processing",
      })
      .select()
      .single();
    if (error) { res.status(500).json({ error: error.message }); return; }

    res.status(201).json(CreateMaterialResponse.parse(toCamel(data)));

    // Async extraction after response.
    // Audio: upload the in-memory buffer directly to Gladia (avoids Cloudinary URL auth issues).
    // Everything else: use the in-memory buffer to avoid re-downloading.
    const materialId = data.id;
    const uploadedBuffer = req.file.buffer;
    const originalName = req.file.originalname;
    setImmediate(async () => {
      try {
        const text = materialType === "audio"
          ? await transcribeAudioBuffer(uploadedBuffer, originalName)
          : await extractTextFromBuffer(uploadedBuffer, materialType, originalName);
        await supabase
          .from("materials")
          .update({ extracted_text: text, status: "ready" })
          .eq("id", materialId);
      } catch (err) {
        logger.error({ err, materialId }, "Failed to extract text from material");
        await supabase
          .from("materials")
          .update({ status: "error" })
          .eq("id", materialId);
      }
    });
  },
);

// POST /projects/:projectId/meetings/:meetingId/materials/:materialId/retry
router.post(
  "/projects/:projectId/meetings/:meetingId/materials/:materialId/retry",
  async (req, res): Promise<void> => {
    const params = RetryMaterialParams.safeParse(req.params);
    if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

    const resolved = await resolveMeeting(params.data.projectId, params.data.meetingId);
    if (!resolved.ok) { res.status(resolved.status).json({ error: resolved.error }); return; }

    const { data: material } = await supabase
      .from("materials")
      .select("*")
      .eq("id", params.data.materialId)
      .eq("meeting_id", params.data.meetingId)
      .single();

    if (!material) { res.status(404).json({ error: "Material not found" }); return; }

    if (material.type === "text" || !material.filename) {
      res.status(400).json({ error: "Cannot retry text materials" });
      return;
    }

    const { data: updated, error } = await supabase
      .from("materials")
      .update({ status: "processing", extracted_text: null })
      .eq("id", params.data.materialId)
      .select()
      .single();
    if (error) { res.status(500).json({ error: error.message }); return; }

    res.json(RetryMaterialResponse.parse(toCamel(updated)));

    const materialId = params.data.materialId;
    const fileRef = resolveFileRef(material.filename); // Cloudinary URL or resolved legacy path
    setImmediate(async () => {
      try {
        const text = await extractText(fileRef, material.type as MaterialType);
        await supabase
          .from("materials")
          .update({ extracted_text: text, status: "ready" })
          .eq("id", materialId);
      } catch (err) {
        logger.error({ err, materialId }, "Retry extraction failed");
        await supabase
          .from("materials")
          .update({ status: "error" })
          .eq("id", materialId);
      }
    });
  },
);

// GET /materials/:materialId/file — proxy download for Cloudinary assets.
// Cloudinary raw resources (pdf, excel, audio) block unauthenticated browser
// access. This route generates a signed, time-limited URL and streams the
// file back with correct Content-Type so the browser can open/display it.
router.get(
  "/materials/:materialId/file",
  async (req, res): Promise<void> => {
    const materialId = parseInt(req.params.materialId, 10);
    if (isNaN(materialId)) { res.status(400).json({ error: "Invalid material id" }); return; }

    const { data: material } = await supabase
      .from("materials")
      .select("id, filename, type, original_name")
      .eq("id", materialId)
      .single();

    if (!material || !material.filename) { res.status(404).json({ error: "Material not found" }); return; }

    if (isStorageUrl(material.filename)) {
      // Replit Object Storage (GCS) — download server-side and stream to client
      try {
        const { buffer, contentType } = await downloadFromStorage(material.filename);
        res.setHeader("Content-Type", contentType);
        res.setHeader(
          "Content-Disposition",
          `inline; filename="${encodeURIComponent(material.original_name ?? "file")}"`,
        );
        res.end(buffer);
      } catch (err) {
        logger.error({ err, materialId }, "GCS storage download error");
        res.status(500).json({ error: "Failed to fetch file from storage" });
      }
      return;
    }

    if (!material.filename.startsWith("http")) {
      // Legacy local file — serve directly from disk
      const filePath = path.join(UPLOADS_DIR, material.filename);
      if (!fs.existsSync(filePath)) { res.status(404).json({ error: "File not found on disk" }); return; }
      res.sendFile(filePath);
      return;
    }

    // Cloudinary asset (image / audio) — fetch server-side and stream to client.
    // Raw types (pdf, excel) now use Replit Object Storage, so only image/audio reach here.
    try {
      const upstream = await fetch(material.filename);
      if (!upstream.ok) {
        logger.warn({ materialId, status: upstream.status }, "Cloudinary proxy fetch failed");
        res.status(502).json({ error: "Failed to fetch file from storage" });
        return;
      }
      const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
      const contentLength = upstream.headers.get("content-length");
      res.setHeader("Content-Type", contentType);
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${encodeURIComponent(material.original_name ?? "file")}"`,
      );
      if (contentLength) res.setHeader("Content-Length", contentLength);
      const buffer = Buffer.from(await upstream.arrayBuffer());
      res.end(buffer);
    } catch (err) {
      logger.error({ err, materialId }, "Cloudinary proxy error");
      res.status(500).json({ error: "Internal error fetching file" });
    }
  },
);

// PATCH /projects/:projectId/meetings/:meetingId/materials/:materialId
// Assigns real names to diarized speakers (e.g. {"1": "Ana", "2": "Pedro"}).
router.patch(
  "/projects/:projectId/meetings/:meetingId/materials/:materialId",
  async (req, res): Promise<void> => {
    const params = UpdateMaterialSpeakersParams.safeParse(req.params);
    if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

    const body = UpdateMaterialSpeakersBody.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

    const resolved = await resolveMeeting(params.data.projectId, params.data.meetingId);
    if (!resolved.ok) { res.status(resolved.status).json({ error: resolved.error }); return; }

    const { data: updated, error } = await supabase
      .from("materials")
      .update({ speaker_map: body.data.speakerMap })
      .eq("id", params.data.materialId)
      .eq("meeting_id", params.data.meetingId)
      .select()
      .single();

    if (error || !updated) { res.status(404).json({ error: "Material not found" }); return; }
    res.json(UpdateMaterialSpeakersResponse.parse(toCamel(updated)));
  },
);

// DELETE /projects/:projectId/meetings/:meetingId/materials/:materialId
router.delete(
  "/projects/:projectId/meetings/:meetingId/materials/:materialId",
  async (req, res): Promise<void> => {
    const params = DeleteMaterialParams.safeParse(req.params);
    if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

    const resolved = await resolveMeeting(params.data.projectId, params.data.meetingId);
    if (!resolved.ok) { res.status(resolved.status).json({ error: resolved.error }); return; }

    const { data: deleted, error } = await supabase
      .from("materials")
      .delete()
      .eq("id", params.data.materialId)
      .eq("meeting_id", params.data.meetingId)
      .select()
      .single();

    if (error || !deleted) { res.status(404).json({ error: "Material not found" }); return; }

    // Clean up the stored file (async, non-blocking)
    if (deleted.filename) {
      if (isStorageUrl(deleted.filename)) {
        // Supabase Storage-backed material
        deleteFromStorage(deleted.filename).catch((err) =>
          logger.warn({ err, materialId: deleted.id }, "Failed to delete Supabase Storage asset"),
        );
      } else if (deleted.filename.startsWith("http")) {
        // Cloudinary-backed material (image / audio)
        deleteFromUrl(deleted.filename).catch((err) =>
          logger.warn({ err, materialId: deleted.id }, "Failed to delete Cloudinary asset"),
        );
      } else {
        // Legacy local file
        const legacyPath = path.join(UPLOADS_DIR, deleted.filename);
        fs.unlink(legacyPath, (err) => {
          if (err && (err as NodeJS.ErrnoException).code !== "ENOENT") {
            logger.warn({ err, materialId: deleted.id }, "Failed to delete legacy material file");
          }
        });
      }
    }

    res.status(204).send();
  },
);

export default router;
