import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import fs from "fs";
import router from "./routes";
import { logger } from "./lib/logger";
import { supabase } from "./lib/supabase";
import { isStorageUrl, downloadFromStorage, isSupabaseStorageUrl, downloadFromSupabaseStorage } from "./lib/storage";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Compatibility shim: old frontend builds hit /api/files/:filename.
// Route each case to the right source so cached clients keep working.
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
app.use("/api/files", async (req: Request, res: Response) => {
  // req.path starts with "/" followed by the filename (or gcs:/ path).
  const raw = req.path.slice(1); // strip leading slash

  // Case 1a: Supabase Storage URL — browsers collapse supa:// to supa:/ in the path.
  if (raw.startsWith("supa:/")) {
    const supaUrl = raw.startsWith("supa://") ? raw : raw.replace("supa:/", "supa://");
    try {
      const buffer = await downloadFromSupabaseStorage(supaUrl);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
      res.setHeader("Content-Disposition", `inline; filename="${path.basename(supaUrl)}"`);
      return res.end(buffer);
    } catch (err) {
      logger.error({ err, supaUrl }, "Legacy /api/files Supabase download error");
      return res.status(500).json({ error: "Failed to fetch file from storage" });
    }
  }

  // Case 1b: GCS URL — browsers collapse gcs:// to gcs:/ in the path.
  // Reconstruct the real gcs:// URL and stream via storage layer.
  if (raw.startsWith("gcs:/")) {
    const gcsUrl = raw.startsWith("gcs://") ? raw : raw.replace("gcs:/", "gcs://");
    try {
      const { buffer, contentType } = await downloadFromStorage(gcsUrl);
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `inline; filename="${path.basename(raw)}"`);
      return res.end(buffer);
    } catch (err) {
      logger.error({ err, gcsUrl }, "Legacy /api/files GCS download error");
      return res.status(500).json({ error: "Failed to fetch file from storage" });
    }
  }

  // Case 2: plain filename — look up the material by filename, then proxy.
  if (raw && !raw.startsWith("http")) {
    const { data: material } = await supabase
      .from("materials")
      .select("id")
      .eq("filename", raw)
      .maybeSingle();
    if (material?.id) {
      return res.redirect(302, `/api/materials/${material.id}/file`);
    }
    // Fallback: try disk
    const filePath = path.join(UPLOADS_DIR, raw);
    if (fs.existsSync(filePath)) return res.sendFile(filePath);
    return res.status(404).json({ error: "File not found" });
  }

  // Case 3: Cloudinary or other http URL stored as filename — redirect proxy.
  if (raw.startsWith("http")) {
    const { data: material } = await supabase
      .from("materials")
      .select("id")
      .eq("filename", raw)
      .maybeSingle();
    if (material?.id) {
      return res.redirect(302, `/api/materials/${material.id}/file`);
    }
  }

  return res.status(404).json({ error: "File not found" });
});

app.use("/api", router);

export default app;
