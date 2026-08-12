import fs from "fs";
import os from "os";
import path from "path";

/**
 * If `fileRef` is a URL (Cloudinary or otherwise), download it to a temporary
 * local file and return its path. The caller is responsible for deleting the
 * temp file when done.
 */
async function downloadToTemp(fileRef: string, ext: string): Promise<string> {
  const tmpPath = path.join(os.tmpdir(), `meeting-extract-${Date.now()}${ext}`);
  const response = await fetch(fileRef);
  if (!response.ok) {
    throw new Error(`Failed to fetch material from storage (${response.status}): ${fileRef}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(tmpPath, buffer);
  return tmpPath;
}

export type MaterialType = "photo" | "image" | "pdf" | "excel" | "text" | "audio";

const IMAGE_MIME_TYPES: Record<string, "image/jpeg" | "image/png" | "image/gif" | "image/webp"> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

/**
 * Extract plain text from an uploaded material.
 * `fileRef` may be a local filesystem path (legacy) or a Cloudinary HTTPS URL.
 * When it is a URL the file is downloaded to a temporary location first.
 */
export async function extractText(
  fileRef: string,
  type: MaterialType,
): Promise<string> {
  // Audio transcription is not currently supported — skip download entirely
  // and return empty string so the material is marked ready without errors.
  if (type === "audio") return "";

  // Resolve remote URL → local temp file so all cases below can read from disk
  let localPath = fileRef;
  let tmpDownload: string | null = null;

  if (fileRef.startsWith("http")) {
    const urlExt = path.extname(new URL(fileRef).pathname) || "";
    tmpDownload = await downloadToTemp(fileRef, urlExt);
    localPath = tmpDownload;
  }

  try {
    switch (type) {
      case "pdf": {
        // Dynamic import avoids pdf-parse trying to load test fixtures at startup.
        // pdf-parse v2 exposes a class-based API: new PDFParse({ data }) → .getText()
        const { PDFParse, VerbosityLevel } = (await import("pdf-parse")) as unknown as {
          PDFParse: new (opts: { data: Buffer; verbosity?: number }) => {
            getText(): Promise<{ text: string }>;
          };
          VerbosityLevel: { ERRORS: number };
        };

        const dataBuffer = fs.readFileSync(localPath);
        const parser = new PDFParse({ data: dataBuffer, verbosity: VerbosityLevel.ERRORS });
        const result = await parser.getText();
        return result.text.trim();
      }

      case "excel": {
        const xlsx = (await import("xlsx")) as typeof import("xlsx");
        const workbook = xlsx.readFile(localPath);
        const texts: string[] = [];
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          const csv = xlsx.utils.sheet_to_csv(sheet);
          if (csv.trim()) texts.push(`Sheet: ${sheetName}\n${csv}`);
        }
        return texts.join("\n\n").trim();
      }

      case "photo":
      case "image": {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
          throw new Error("ANTHROPIC_API_KEY is not configured");
        }

        const ext = path.extname(localPath).toLowerCase();
        const mimeType = IMAGE_MIME_TYPES[ext] ?? "image/jpeg";
        const imageBuffer = fs.readFileSync(localPath);
        const base64Image = imageBuffer.toString("base64");

        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-opus-4-5",
            max_tokens: 2048,
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "image",
                    source: {
                      type: "base64",
                      media_type: mimeType,
                      data: base64Image,
                    },
                  },
                  {
                    type: "text",
                    text: "Analiza esta imagen en detalle. Si contiene texto, tablas, gráficos o datos, extráelos y transcríbelos fielmente. Si es una foto de una reunión, pizarrón o documento, describe todo el contenido visible. Responde solo con el contenido extraído, sin comentarios adicionales.",
                  },
                ],
              },
            ],
          }),
        });

        if (!response.ok) {
          const errBody = await response.text();
          throw new Error(`Anthropic vision API error ${response.status}: ${errBody}`);
        }

        const data = (await response.json()) as {
          content: Array<{ type: string; text?: string }>;
        };
        const textBlock = data.content.find((b) => b.type === "text");
        if (!textBlock || !textBlock.text) {
          throw new Error("No text content in vision response");
        }
        return textBlock.text.trim();
      }

      default:
        return "";
    }
  } finally {
    // Clean up the temp download (if any) regardless of success or failure
    if (tmpDownload) {
      try { fs.unlinkSync(tmpDownload); } catch { /* ignore */ }
    }
  }
}
