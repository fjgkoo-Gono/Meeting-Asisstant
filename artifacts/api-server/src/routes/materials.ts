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
} from "@workspace/api-zod";
import { extractText, type MaterialType } from "../lib/extractor";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

const FILE_MATERIAL_TYPES: MaterialType[] = ["photo", "image", "pdf", "excel"];

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

    const { data, error } = await supabase
      .from("materials")
      .insert({
        meeting_id: params.data.meetingId,
        type: materialType,
        filename: req.file.filename,
        original_name: req.file.originalname,
        extracted_text: null,
        status: "processing",
      })
      .select()
      .single();
    if (error) { res.status(500).json({ error: error.message }); return; }

    res.status(201).json(CreateMaterialResponse.parse(toCamel(data)));

    // Async extraction after response
    const materialId = data.id;
    setImmediate(async () => {
      try {
        const text = await extractText(
          path.join(UPLOADS_DIR, req.file!.filename),
          materialType,
        );
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
    setImmediate(async () => {
      try {
        const text = await extractText(
          path.join(UPLOADS_DIR, material.filename),
          material.type as MaterialType,
        );
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

    if (deleted.filename) {
      const filePath = path.join(UPLOADS_DIR, deleted.filename);
      fs.unlink(filePath, (err) => {
        if (err && (err as NodeJS.ErrnoException).code !== "ENOENT") {
          logger.warn({ err, materialId: deleted.id }, "Failed to delete material file");
        }
      });
    }

    res.status(204).send();
  },
);

export default router;
