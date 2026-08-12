import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";

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
 * Files larger than this threshold are split into chunks before transcription.
 * Anthropic's API accepts ~20 MB request bodies; base64 inflates by ~33%,
 * so we use 15 MB as a safe ceiling for the raw audio file.
 */
const AUDIO_CHUNK_THRESHOLD = 15 * 1024 * 1024; // 15 MB

/** How long each ffmpeg segment should be (in seconds). */
const SEGMENT_SECONDS = 300; // 5 minutes

/**
 * Transcribe a single audio file (must be under the API size limit).
 * The file is read, base64-encoded, and sent to Claude.
 */
async function transcribeAudioChunk(
  filePath: string,
  apiKey: string,
  mimeType: string,
): Promise<string> {
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
  if (!textBlock?.text) {
    throw new Error("No text content in transcription response");
  }
  return textBlock.text.trim();
}

/**
 * Split a large audio file into ~5-minute MP3 segments using ffmpeg,
 * transcribe each segment, and return the joined transcript.
 */
async function transcribeLargeAudio(
  filePath: string,
  apiKey: string,
): Promise<string> {
  // Create a temp directory for the chunks
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "audio-chunks-"));
  const chunkPattern = path.join(tmpDir, "chunk_%03d.mp3");

  try {
    // Re-encode into fixed-length MP3 segments.
    // -vn          : strip any video stream
    // -acodec libmp3lame : encode as MP3 (universally supported)
    // -q:a 3       : variable bitrate quality 3 (~175 kbps) — good balance
    // -f segment   : enable segmenting muxer
    // -segment_time: segment duration in seconds
    execFileSync(
      "ffmpeg",
      [
        "-i", filePath,
        "-vn",
        "-acodec", "libmp3lame",
        "-q:a", "3",
        "-f", "segment",
        "-segment_time", String(SEGMENT_SECONDS),
        "-y",
        chunkPattern,
      ],
      { stdio: "pipe" },
    );

    // Collect segments in alphabetical (chronological) order
    const chunks = fs
      .readdirSync(tmpDir)
      .filter((f) => f.startsWith("chunk_") && f.endsWith(".mp3"))
      .sort();

    if (chunks.length === 0) {
      throw new Error("ffmpeg produced no audio segments — the file may be corrupt or unsupported");
    }

    // Transcribe each segment sequentially to respect API rate limits
    const transcripts: string[] = [];
    for (const chunk of chunks) {
      const chunkPath = path.join(tmpDir, chunk);
      const text = await transcribeAudioChunk(chunkPath, apiKey, "audio/mpeg");
      transcripts.push(text);
    }

    return transcripts.join("\n");
  } finally {
    // Always clean up temp files
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup failures — OS will reclaim on reboot
    }
  }
}

/**
 * Extract plain text from an uploaded file based on its material type.
 * Returns the extracted text or throws on error.
 */
export async function extractText(
  filePath: string,
  type: MaterialType,
): Promise<string> {
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

      const dataBuffer = fs.readFileSync(filePath);
      const parser = new PDFParse({ data: dataBuffer, verbosity: VerbosityLevel.ERRORS });
      const result = await parser.getText();
      return result.text.trim();
    }

    case "excel": {
      const xlsx = (await import("xlsx")) as typeof import("xlsx");
      const workbook = xlsx.readFile(filePath);
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
      const fileSize = fs.statSync(filePath).size;

      if (fileSize >= AUDIO_CHUNK_THRESHOLD) {
        // Large file: verify ffmpeg is available before attempting
        try {
          execFileSync("ffmpeg", ["-version"], { stdio: "pipe" });
        } catch {
          throw new Error(
            `Audio file is too large to transcribe directly (${Math.round(fileSize / 1024 / 1024)} MB > ${Math.round(AUDIO_CHUNK_THRESHOLD / 1024 / 1024)} MB limit) and ffmpeg is not available for chunking. Please split the file into smaller parts manually.`,
          );
        }
        return await transcribeLargeAudio(filePath, apiKey);
      }

      // Small file: transcribe directly
      return await transcribeAudioChunk(filePath, apiKey, mimeType);
    }

    default:
      return "";
  }
}
