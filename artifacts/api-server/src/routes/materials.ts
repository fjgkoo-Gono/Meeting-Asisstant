import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db, meetingsTable, projectsTable, materialsTable } from "@workspace/db";
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

// Resolve parent meeting ensuring project scoping
async function resolveMeeting(projectId: number, meetingId: number): Promise<ResolveError | ResolveSuccess> {
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId));
  if (!project) return { ok: false, error: "Project not found", status: 404 };

  const [meeting] = await db
    .select()
    .from(meetingsTable)
    .where(and(eq(meetingsTable.id, meetingId), eq(meetingsTable.projectId, projectId)));
  if (!meeting) return { ok: false, error: "Meeting not found", status: 404 };

  return { ok: true };
}

// GET /projects/:projectId/meetings/:meetingId/materials
router.get(
  "/projects/:projectId/meetings/:meetingId/materials",
  async (req, res): Promise<void> => {
    const params = ListMaterialsParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const resolved = await resolveMeeting(params.data.projectId, params.data.meetingId);
    if (!resolved.ok) {
      res.status(resolved.status).json({ error: resolved.error });
      return;
    }

    const materials = await db
      .select()
      .from(materialsTable)
      .where(eq(materialsTable.meetingId, params.data.meetingId))
      .orderBy(desc(materialsTable.createdAt));

    res.json(ListMaterialsResponse.parse(materials));
  },
);

// POST /projects/:projectId/meetings/:meetingId/materials
// Accepts:
//   - multipart/form-data with file + type (photo|image|pdf|excel)
//   - application/json with type=text + content + optional name
router.post(
  "/projects/:projectId/meetings/:meetingId/materials",
  upload.single("file"),
  async (req, res): Promise<void> => {
    const params = CreateMaterialParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const resolved = await resolveMeeting(params.data.projectId, params.data.meetingId);
    if (!resolved.ok) {
      res.status(resolved.status).json({ error: resolved.error });
      return;
    }

    const rawType = req.body?.type as string | undefined;

    // ── Text / transcription path (JSON body) ──────────────────────────────
    if (rawType === "text") {
      const body = CreateMaterialBody.safeParse(req.body);
      if (!body.success) {
        res.status(400).json({ error: body.error.message });
        return;
      }

      const [material] = await db
        .insert(materialsTable)
        .values({
          meetingId: params.data.meetingId,
          type: "text",
          filename: "",
          originalName: body.data.name ?? "Transcription",
          extractedText: body.data.content,
          status: "ready",
        })
        .returning();

      res.status(201).json(CreateMaterialResponse.parse(material));
      return;
    }

    // ── File upload path (multipart/form-data) ─────────────────────────────
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

    const [material] = await db
      .insert(materialsTable)
      .values({
        meetingId: params.data.meetingId,
        type: materialType,
        filename: req.file.filename,
        originalName: req.file.originalname,
        extractedText: null,
        status: "processing",
      })
      .returning();

    res.status(201).json(CreateMaterialResponse.parse(material));

    // Async extraction after response
    setImmediate(async () => {
      try {
        const text = await extractText(
          path.join(UPLOADS_DIR, req.file!.filename),
          materialType,
        );
        await db
          .update(materialsTable)
          .set({ extractedText: text, status: "ready" })
          .where(eq(materialsTable.id, material.id));
      } catch (err) {
        logger.error({ err, materialId: material.id }, "Failed to extract text from material");
        await db
          .update(materialsTable)
          .set({ status: "error" })
          .where(eq(materialsTable.id, material.id));
      }
    });
  },
);

// POST /projects/:projectId/meetings/:meetingId/materials/:materialId/retry
router.post(
  "/projects/:projectId/meetings/:meetingId/materials/:materialId/retry",
  async (req, res): Promise<void> => {
    const params = RetryMaterialParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const resolved = await resolveMeeting(params.data.projectId, params.data.meetingId);
    if (!resolved.ok) {
      res.status(resolved.status).json({ error: resolved.error });
      return;
    }

    const [material] = await db
      .select()
      .from(materialsTable)
      .where(
        and(
          eq(materialsTable.id, params.data.materialId),
          eq(materialsTable.meetingId, params.data.meetingId),
        ),
      );

    if (!material) {
      res.status(404).json({ error: "Material not found" });
      return;
    }

    if (material.type === "text" || !material.filename) {
      res.status(400).json({ error: "Cannot retry text materials" });
      return;
    }

    const [updated] = await db
      .update(materialsTable)
      .set({ status: "processing", extractedText: null })
      .where(eq(materialsTable.id, params.data.materialId))
      .returning();

    res.json(RetryMaterialResponse.parse(updated));

    setImmediate(async () => {
      try {
        const text = await extractText(
          path.join(UPLOADS_DIR, material.filename),
          material.type as MaterialType,
        );
        await db
          .update(materialsTable)
          .set({ extractedText: text, status: "ready" })
          .where(eq(materialsTable.id, params.data.materialId));
      } catch (err) {
        logger.error({ err, materialId: params.data.materialId }, "Retry extraction failed");
        await db
          .update(materialsTable)
          .set({ status: "error" })
          .where(eq(materialsTable.id, params.data.materialId));
      }
    });
  },
);

// DELETE /projects/:projectId/meetings/:meetingId/materials/:materialId
router.delete(
  "/projects/:projectId/meetings/:meetingId/materials/:materialId",
  async (req, res): Promise<void> => {
    const params = DeleteMaterialParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const resolved = await resolveMeeting(params.data.projectId, params.data.meetingId);
    if (!resolved.ok) {
      res.status(resolved.status).json({ error: resolved.error });
      return;
    }

    const [deleted] = await db
      .delete(materialsTable)
      .where(
        and(
          eq(materialsTable.id, params.data.materialId),
          eq(materialsTable.meetingId, params.data.meetingId),
        ),
      )
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Material not found" });
      return;
    }

    // Clean up the uploaded file if it exists
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
