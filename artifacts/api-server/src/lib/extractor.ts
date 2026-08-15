import fs from "fs";
import os from "os";
import path from "path";
import JSZip from "jszip";
import { isStorageUrl, downloadFromStorage, isSupabaseStorageUrl, downloadFromSupabaseStorage } from "./storage";

/**
 * If `fileRef` is a URL (Cloudinary or otherwise), download it to a temporary
 * local file and return its path. Returns null if `fileRef` is already a local
 * path. The caller is responsible for deleting the temp file when done.
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

export type MaterialType = "photo" | "image" | "pdf" | "excel" | "pptx" | "text" | "audio";

const IMAGE_MIME_TYPES: Record<string, "image/jpeg" | "image/png" | "image/gif" | "image/webp"> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

/** How long to wait between Gladia poll attempts. */
const GLADIA_POLL_INTERVAL_MS = 3_000;

/** Maximum time to wait for a Gladia job to complete. */
const GLADIA_MAX_WAIT_MS = 10 * 60 * 1_000; // 10 minutes

/**
 * Submit an audio URL to Gladia for transcription with diarization,
 * poll until complete, and return the formatted transcript text.
 *
 * Format: "Speaker 1: text\nSpeaker 2: text\n..."
 * Falls back to the plain full_transcript if utterances are unavailable.
 */
async function transcribeWithGladia(audioUrl: string, apiKey: string): Promise<string> {
  // 1. Submit job
  const submitRes = await fetch("https://api.gladia.io/v2/pre-recorded", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-gladia-key": apiKey,
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      diarization: true,
    }),
  });

  if (!submitRes.ok) {
    const errBody = await submitRes.text();
    throw new Error(`Gladia submit error ${submitRes.status}: ${errBody}`);
  }

  const { id } = (await submitRes.json()) as { id: string };
  if (!id) throw new Error("Gladia did not return a job ID");

  // 2. Poll until done or timeout
  const deadline = Date.now() + GLADIA_MAX_WAIT_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, GLADIA_POLL_INTERVAL_MS));

    const pollRes = await fetch(`https://api.gladia.io/v2/pre-recorded/${id}`, {
      headers: { "x-gladia-key": apiKey },
    });
    if (!pollRes.ok) {
      const errBody = await pollRes.text();
      throw new Error(`Gladia poll error ${pollRes.status}: ${errBody}`);
    }

    const poll = (await pollRes.json()) as {
      status: string;
      result?: {
        transcription?: {
          utterances?: Array<{ speaker: number; text: string }>;
          full_transcript?: string;
        };
      };
      error_code?: string;
    };

    if (poll.status === "error") {
      throw new Error(`Gladia transcription failed: ${poll.error_code ?? "unknown error"}`);
    }

    if (poll.status === "done") {
      const utterances = poll.result?.transcription?.utterances;
      if (utterances && utterances.length > 0) {
        return utterances
          .map((u) => `Speaker ${u.speaker + 1}: ${u.text.trim()}`)
          .join("\n");
      }
      // Fallback: no utterances but we have the plain transcript
      return poll.result?.transcription?.full_transcript?.trim() ?? "";
    }
  }

  throw new Error("Gladia transcription timed out after 10 minutes");
}

/**
 * Upload an audio buffer to Gladia's /v2/upload endpoint and return
 * the audio_url Gladia assigns. Using Gladia-hosted URLs avoids any
 * authentication issues with third-party storage (e.g. Cloudinary).
 */
async function uploadBufferToGladia(buffer: Buffer, filename: string, apiKey: string): Promise<string> {
  const form = new FormData();
  // Blob requires a BlobPart; convert Buffer to Uint8Array for type compatibility.
  form.append("audio", new Blob([new Uint8Array(buffer)]), filename);

  const uploadRes = await fetch("https://api.gladia.io/v2/upload", {
    method: "POST",
    headers: { "x-gladia-key": apiKey },
    body: form,
  });

  if (!uploadRes.ok) {
    const errBody = await uploadRes.text();
    throw new Error(`Gladia upload error ${uploadRes.status}: ${errBody}`);
  }

  const { audio_url } = (await uploadRes.json()) as { audio_url?: string };
  if (!audio_url) throw new Error("Gladia upload did not return an audio_url");
  return audio_url;
}

/**
 * Upload an audio buffer to Gladia and transcribe it with diarization.
 * This is the preferred entry-point: it avoids relying on the audio file
 * being publicly accessible at a third-party URL.
 */
export async function transcribeAudioBuffer(buffer: Buffer, filename: string): Promise<string> {
  const apiKey = process.env.GLADIA_API_KEY;
  if (!apiKey) throw new Error("GLADIA_API_KEY is not configured");
  const audioUrl = await uploadBufferToGladia(buffer, filename, apiKey);
  return transcribeWithGladia(audioUrl, apiKey);
}

/**
 * Extract plain text from a Buffer without needing to re-download from storage.
 * For PPTX, uses JSZip directly on the buffer. For all other types, writes the
 * buffer to a temp file and delegates to extractText.
 *
 * Use this on the initial upload path where the buffer is already in memory.
 * Use `extractText` for retry flows where only the stored URL is available.
 */
export async function extractTextFromBuffer(
  buffer: Buffer,
  type: MaterialType,
  filename = "file",
): Promise<string> {
  if (type === "pptx") {
    return await extractPptxText(buffer);
  }
  const ext = path.extname(filename) || "";
  const tmpPath = path.join(os.tmpdir(), `meeting-buf-${Date.now()}${ext}`);
  fs.writeFileSync(tmpPath, buffer);
  try {
    return await extractText(tmpPath, type);
  } finally {
    try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
  }
}

/**
 * Extract plain text from a PPTX buffer by unzipping the OpenXML package
 * and pulling all <a:t> text runs from each slide's XML.
 *
 * PPTX files are ZIP archives containing slide XML under ppt/slides/.
 * Text content lives in <a:t> elements (DrawingML namespace).
 * This approach is instant and zero-cost — no Vision API needed.
 */
export async function extractPptxText(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);

  // Collect slide files sorted numerically (slide1.xml, slide2.xml, …)
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => {
      const na = parseInt(a.match(/\d+/)?.[0] ?? "0", 10);
      const nb = parseInt(b.match(/\d+/)?.[0] ?? "0", 10);
      return na - nb;
    });

  const slideTexts: string[] = [];
  for (let i = 0; i < slideFiles.length; i++) {
    const xml = await zip.files[slideFiles[i]].async("string");

    // Extract all <a:t> text nodes — these are the atomic text runs in DrawingML
    const texts: string[] = [];
    const regex = /<a:t[^>]*>([^<]*)<\/a:t>/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(xml)) !== null) {
      const t = m[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").trim();
      if (t) texts.push(t);
    }

    if (texts.length > 0) {
      slideTexts.push(`--- Slide ${i + 1} ---\n${texts.join(" ")}`);
    }
  }

  return slideTexts.join("\n\n").trim();
}

/**
 * Extract plain text from an uploaded material.
 * `fileRef` may be a local filesystem path (legacy) or a remote HTTPS URL.
 * When it is a URL the file is downloaded to a temporary location first,
 * except for audio (sent to Gladia) and PPTX (fetched slide-by-slide from Cloudinary).
 */
export async function extractText(
  fileRef: string,
  type: MaterialType,
): Promise<string> {
  // PPTX: stored in Supabase Storage (supa:// URL).
  // Download the binary and extract text via JSZip — no Vision API needed.
  if (type === "pptx") {
    if (isSupabaseStorageUrl(fileRef)) {
      const buffer = await downloadFromSupabaseStorage(fileRef);
      return await extractPptxText(buffer);
    }
    // Legacy: PPTX was previously stored in Cloudinary with Vision extraction.
    // Re-uploading the file will migrate it to Supabase Storage automatically.
    throw new Error("Legacy Cloudinary PPTX detected. Re-upload the file to use the new Supabase Storage path.");
  }

  // Audio: download to buffer and upload directly to Gladia.
  // This avoids any URL-authentication issues with third-party storage.
  // Audio files are now stored in Replit Object Storage (gcs://) to avoid
  // Cloudinary's size limit for audio/video uploads.
  if (type === "audio") {
    let audioBuffer: Buffer;
    let audioFilename: string;

    if (isSupabaseStorageUrl(fileRef)) {
      audioBuffer = await downloadFromSupabaseStorage(fileRef);
      audioFilename = path.basename(fileRef) || "audio.mp3";
    } else if (isStorageUrl(fileRef)) {
      const { buffer } = await downloadFromStorage(fileRef);
      audioBuffer = buffer;
      audioFilename = path.basename(fileRef) || "audio.mp3";
    } else if (fileRef.startsWith("http")) {
      const dlRes = await fetch(fileRef);
      if (!dlRes.ok) {
        throw new Error(`Failed to fetch audio for transcription (${dlRes.status}): ${fileRef}`);
      }
      audioBuffer = Buffer.from(await dlRes.arrayBuffer());
      audioFilename = path.basename(new URL(fileRef).pathname) || "audio.mp3";
    } else {
      audioBuffer = fs.readFileSync(fileRef);
      audioFilename = path.basename(fileRef) || "audio.mp3";
    }

    return await transcribeAudioBuffer(audioBuffer, audioFilename);
  }

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
        const xlsxModule = await import("xlsx");
        // SheetJS is CommonJS — in an ESM/esbuild context the exports land on .default
        const xlsx = ((xlsxModule as any).default ?? xlsxModule) as typeof import("xlsx");
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
