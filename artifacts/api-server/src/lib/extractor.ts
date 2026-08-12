import fs from "fs";
import path from "path";

export type MaterialType = "photo" | "image" | "pdf" | "excel" | "text" | "audio";

const AUDIO_MIME_TYPES: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".mp4": "audio/mp4",
  ".m4a": "audio/mp4",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".webm": "audio/webm",
  ".flac": "audio/flac",
};

const IMAGE_MIME_TYPES: Record<string, "image/jpeg" | "image/png" | "image/gif" | "image/webp"> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

/**
 * Extract plain text from an uploaded file based on its material type.
 * Returns the extracted text or throws on error.
 */
export async function extractText(
  filePath: string,
  type: MaterialType,
): Promise<string> {
  switch (type) {
    case "text": {
      // Should not be called for text type — content comes directly from body
      return "";
    }

    case "pdf": {
      // pdf-parse v2 uses a PDFParse class; construct with data buffer and call getText()
      const { PDFParse } = globalThis.require("pdf-parse") as {
        PDFParse: new (opts: { data: Uint8Array; verbosity: number }) => {
          getText(): Promise<{ text: string }>;
        };
      };
      const { VerbosityLevel } = globalThis.require("pdf-parse") as {
        VerbosityLevel: { ERRORS: number };
      };
      const buffer = fs.readFileSync(filePath);
      const parser = new PDFParse({
        data: new Uint8Array(buffer),
        verbosity: VerbosityLevel.ERRORS,
      });
      const result = await parser.getText();
      return result.text.trim();
    }

    case "excel": {
      // xlsx is externalized; use require
      const XLSX = globalThis.require("xlsx") as {
        read: (data: Buffer) => {
          SheetNames: string[];
          Sheets: Record<string, unknown>;
        };
        utils: { sheet_to_csv: (ws: unknown) => string };
      };
      const workbook = XLSX.read(fs.readFileSync(filePath));
      const lines: string[] = [];
      for (const sheetName of workbook.SheetNames) {
        const ws = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(ws);
        lines.push(`[Sheet: ${sheetName}]`, csv);
      }
      return lines.join("\n").trim();
    }

    case "photo":
    case "image": {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error("ANTHROPIC_API_KEY is not configured");
      }

      const ext = path.extname(filePath).toLowerCase();
      const mimeType = IMAGE_MIME_TYPES[ext] ?? "image/jpeg";
      const imageBuffer = fs.readFileSync(filePath);
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

    case "audio": {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error("ANTHROPIC_API_KEY is not configured");
      }

      const ext = path.extname(filePath).toLowerCase();
      const mimeType = AUDIO_MIME_TYPES[ext] ?? "audio/mpeg";
      const audioBuffer = fs.readFileSync(filePath);
      const base64Audio = audioBuffer.toString("base64");

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-opus-4-5",
          max_tokens: 4096,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "document",
                  source: {
                    type: "base64",
                    media_type: mimeType,
                    data: base64Audio,
                  },
                },
                {
                  type: "text",
                  text: "Please transcribe this audio recording verbatim. Output only the transcript text with no additional commentary, headers, or formatting. If there are multiple speakers, prefix each speaker's lines with 'Speaker 1:', 'Speaker 2:', etc.",
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Anthropic transcription API error ${response.status}: ${errBody}`);
      }

      const data = (await response.json()) as {
        content: Array<{ type: string; text?: string }>;
      };
      const textBlock = data.content.find((b) => b.type === "text");
      if (!textBlock || !textBlock.text) {
        throw new Error("No text content in transcription response");
      }
      return textBlock.text.trim();
    }

    default:
      return "";
  }
}
