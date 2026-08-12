import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync, spawnSync } from "child_process";

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
 * How far (in seconds) from a target cut point we are willing to shift
 * the actual cut in order to land on a natural silence.
 */
const SILENCE_SEARCH_WINDOW = 30; // ±30 s around each target boundary

interface SilenceInterval {
  start: number;
  end: number;
}

/**
 * Return the total duration of an audio/video file in seconds using ffprobe.
 * Returns 0 if ffprobe cannot determine the duration.
 */
function getAudioDuration(filePath: string): number {
  try {
    const stdout = execFileSync(
      "ffprobe",
      [
        "-v", "quiet",
        "-show_entries", "format=duration",
        "-of", "csv=p=0",
        filePath,
      ],
      { stdio: ["pipe", "pipe", "pipe"] },
    );
    const val = parseFloat(stdout.toString().trim());
    return isFinite(val) ? val : 0;
  } catch (e: unknown) {
    // execFileSync throws on non-zero exit; try reading stdout from the error
    const stdout = (e as { stdout?: Buffer })?.stdout?.toString() ?? "";
    const val = parseFloat(stdout.trim());
    return isFinite(val) ? val : 0;
  }
}

/**
 * Run ffmpeg's silencedetect filter on a file and return all detected
 * silence intervals (start/end in seconds).
 *
 * Uses -30 dB noise floor and a minimum silence duration of 0.3 s —
 * short enough to catch brief word-gaps while ignoring encoder artefacts.
 */
function detectSilences(filePath: string): SilenceInterval[] {
  // spawnSync always exposes stderr regardless of exit code — required here
  // because ffmpeg writes silencedetect output to stderr and exits 0 (success),
  // so execFileSync's try/catch approach would never capture it.
  const result = spawnSync(
    "ffmpeg",
    [
      "-i", filePath,
      "-af", "silencedetect=noise=-30dB:duration=0.3",
      "-f", "null",
      "-",
    ],
    { encoding: "utf8" },
  );

  const stderr = result.stderr ?? "";
  if (!stderr) return [];

  const starts: number[] = [];
  const ends: number[] = [];

  for (const m of stderr.matchAll(/silence_start:\s*([\d.]+)/g)) {
    starts.push(parseFloat(m[1]));
  }
  for (const m of stderr.matchAll(/silence_end:\s*([\d.]+)/g)) {
    ends.push(parseFloat(m[1]));
  }

  const silences: SilenceInterval[] = [];
  for (let i = 0; i < Math.min(starts.length, ends.length); i++) {
    silences.push({ start: starts[i], end: ends[i] });
  }
  return silences;
}

/**
 * Given a desired cut time and a list of silence intervals, return the
 * midpoint of the silence interval whose midpoint is closest to `targetTime`
 * and within `windowSeconds`.  Falls back to `targetTime` if none qualifies.
 */
function findBestCutPoint(
  targetTime: number,
  silences: SilenceInterval[],
  windowSeconds = SILENCE_SEARCH_WINDOW,
): number {
  let bestTime = targetTime;
  let bestDistance = Infinity;

  for (const { start, end } of silences) {
    const mid = (start + end) / 2;
    const dist = Math.abs(mid - targetTime);
    if (dist < bestDistance && dist <= windowSeconds) {
      bestDistance = dist;
      bestTime = mid;
    }
  }

  return bestTime;
}

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
 * cut at natural silences so words are never bisected, then transcribe
 * each segment and return the joined transcript.
 *
 * Strategy:
 *  1. Determine the total duration with ffprobe.
 *  2. Detect silence intervals (≥ 0.3 s, ≤ -30 dB) with silencedetect.
 *  3. For each ideal cut point (every SEGMENT_SECONDS), shift to the
 *     nearest silence midpoint within ±SILENCE_SEARCH_WINDOW seconds.
 *     If no silence is nearby the cut falls back to the exact target time.
 *  4. Extract each segment with `-ss` / `-to` (avoids the segment muxer's
 *     strict fixed-length cuts that cause mid-word splits).
 */
async function transcribeLargeAudio(
  filePath: string,
  apiKey: string,
): Promise<string> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "audio-chunks-"));

  try {
    // ── 1. Total duration ────────────────────────────────────────────────
    const duration = getAudioDuration(filePath);
    if (duration <= 0) {
      throw new Error("Could not determine audio duration — the file may be corrupt or unsupported");
    }

    // ── 2. Silence detection ─────────────────────────────────────────────
    const silences = detectSilences(filePath);

    // ── 3. Build cut-point list ──────────────────────────────────────────
    // Always start at 0; end at the actual duration.
    // For every ideal boundary (t = SEGMENT_SECONDS, 2×, 3×, …) find the
    // closest silence midpoint so we never cut through a spoken word.
    const cutPoints: number[] = [0];
    for (let target = SEGMENT_SECONDS; target < duration - 5; target += SEGMENT_SECONDS) {
      cutPoints.push(findBestCutPoint(target, silences));
    }
    cutPoints.push(duration);

    // ── 4. Extract segments ──────────────────────────────────────────────
    const chunkPaths: string[] = [];
    for (let i = 0; i < cutPoints.length - 1; i++) {
      const start = cutPoints[i];
      const end = cutPoints[i + 1];
      const chunkPath = path.join(tmpDir, `chunk_${String(i).padStart(3, "0")}.mp3`);

      // -ss / -to : precise seeking — no mid-word boundary from the muxer
      // -vn       : strip any video stream
      // -acodec libmp3lame / -q:a 3 : VBR MP3, ~175 kbps
      execFileSync(
        "ffmpeg",
        [
          "-i", filePath,
          "-ss", String(start),
          "-to", String(end),
          "-vn",
          "-acodec", "libmp3lame",
          "-q:a", "3",
          "-y",
          chunkPath,
        ],
        { stdio: "pipe" },
      );
      chunkPaths.push(chunkPath);
    }

    if (chunkPaths.length === 0) {
      throw new Error("ffmpeg produced no audio segments — the file may be corrupt or unsupported");
    }

    // ── 5. Transcribe sequentially (respect API rate limits) ─────────────
    const transcripts: string[] = [];
    for (const chunkPath of chunkPaths) {
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
 * Extract plain text from a Buffer without needing to re-download from storage.
 * Writes the buffer to a temporary file, runs the same extraction logic as
 * `extractText`, then cleans up the temp file.
 *
 * Use this on the initial upload path where the buffer is already in memory.
 * Use `extractText` for retry flows where only the stored URL is available.
 */
export async function extractTextFromBuffer(
  buffer: Buffer,
  type: MaterialType,
  filename = "file",
): Promise<string> {
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
 * Extract plain text from an uploaded material.
 * `fileRef` may be a local filesystem path (legacy) or a Cloudinary HTTPS URL.
 * When it is a URL the file is downloaded to a temporary location first.
 */
export async function extractText(
  fileRef: string,
  type: MaterialType,
): Promise<string> {
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

      case "audio": {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
          throw new Error("ANTHROPIC_API_KEY is not configured");
        }

        const ext = path.extname(localPath).toLowerCase();
        const mimeType = AUDIO_MIME_TYPES[ext] ?? "audio/mpeg";
        const fileSize = fs.statSync(localPath).size;

        if (fileSize >= AUDIO_CHUNK_THRESHOLD) {
          // Large file: verify ffmpeg is available before attempting
          try {
            execFileSync("ffmpeg", ["-version"], { stdio: "pipe" });
          } catch {
            throw new Error(
              `Audio file is too large to transcribe directly (${Math.round(fileSize / 1024 / 1024)} MB > ${Math.round(AUDIO_CHUNK_THRESHOLD / 1024 / 1024)} MB limit) and ffmpeg is not available for chunking. Please split the file into smaller parts manually.`,
            );
          }
          return await transcribeLargeAudio(localPath, apiKey);
        }

        // Small file: transcribe directly
        return await transcribeAudioChunk(localPath, apiKey, mimeType);
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
