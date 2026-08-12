import fs from "fs";
import os from "os";
import path from "path";
import { execFile, execFileSync, spawnSync } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

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


const IMAGE_MIME_TYPES: Record<string, "image/jpeg" | "image/png" | "image/gif" | "image/webp"> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

/**
 * whisper-cpp inference binary — resolved from PATH.
 * The Nix package `whisper-cpp` v1.7+ exposes the binary as `whisper-cli`.
 * Declared as a Nix package in .replit so it is available in all environments.
 */
const WHISPER_CPP_BIN = "whisper-cli";

/**
 * whisper-cpp model downloader — resolved from PATH.
 * Declared as a Nix package in .replit so it is available in all environments.
 */
const WHISPER_DOWNLOAD_BIN = "whisper-cpp-download-ggml-model";

/** Directory where GGML models are stored (relative to api-server package root). */
const MODELS_DIR = path.resolve(process.cwd(), "models");

/** Path to the GGML model used for transcription. */
const MODEL_PATH = path.join(MODELS_DIR, "ggml-base.bin");

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
 * Ensure the GGML model file exists; download it if not.
 * Downloads to MODELS_DIR using the whisper-cpp download helper.
 */
function ensureModel(): void {
  if (fs.existsSync(MODEL_PATH)) return;

  fs.mkdirSync(MODELS_DIR, { recursive: true });
  console.log(`[whisper] Downloading ggml-base model to ${MODELS_DIR}…`);

  // The download script saves the model into the cwd, so we run it from MODELS_DIR
  execFileSync(WHISPER_DOWNLOAD_BIN, ["base"], {
    cwd: MODELS_DIR,
    stdio: "inherit",
  });

  // The script names the file "ggml-base.bin" — verify it landed
  if (!fs.existsSync(MODEL_PATH)) {
    throw new Error(`Model download failed: expected ${MODEL_PATH} to exist after download`);
  }
  console.log("[whisper] Model download complete.");
}

/**
 * Transcribe a single audio file using whisper-cpp (local, no API cost).
 *
 * Strategy:
 *  1. Convert the input to 16 kHz mono WAV with ffmpeg (whisper-cpp requirement).
 *  2. Run whisper-cpp asynchronously with --output-txt; it writes <outBase>.txt.
 *  3. Read and return that file's contents.
 *  4. Clean up temp files in all cases.
 *
 * Both ffmpeg and whisper-cpp are declared as Nix packages in .replit and
 * resolved from PATH — no hardcoded store paths.
 */
async function transcribeAudioChunk(filePath: string): Promise<string> {
  ensureModel();

  const tmpWav = path.join(os.tmpdir(), `whisper-in-${Date.now()}.wav`);
  const tmpOut = path.join(os.tmpdir(), `whisper-out-${Date.now()}`);
  const tmpTxt = `${tmpOut}.txt`;

  try {
    // Convert to 16 kHz mono PCM WAV — the only format whisper-cpp accepts reliably.
    // ffmpeg conversion is quick (< 1 s for a 5-min chunk) so sync is fine here.
    execFileSync(
      "ffmpeg",
      ["-i", filePath, "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", "-y", tmpWav],
      { stdio: "pipe" },
    );

    // Transcribe asynchronously so the event loop is not blocked during inference
    // (can take 30 s–several minutes for long chunks).
    // -nt = no timestamps, -l auto = auto-detect spoken language
    await execFileAsync(
      WHISPER_CPP_BIN,
      ["-m", MODEL_PATH, "-otxt", "-of", tmpOut, "-nt", "-l", "auto", tmpWav],
    );

    if (!fs.existsSync(tmpTxt)) {
      throw new Error("whisper-cpp produced no output file");
    }
    return fs.readFileSync(tmpTxt, "utf8").trim();
  } finally {
    try { fs.unlinkSync(tmpWav); } catch { /* ignore */ }
    try { fs.unlinkSync(tmpTxt); } catch { /* ignore */ }
  }
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
async function transcribeLargeAudio(filePath: string): Promise<string> {
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

    // ── 5. Transcribe sequentially (async — does not block the event loop) ──
    const transcripts: string[] = [];
    for (const chunkPath of chunkPaths) {
      const text = await transcribeAudioChunk(chunkPath);
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
        // All audio is transcribed locally via whisper-cpp — no API cost.
        // Large files are split into 5-minute segments by transcribeLargeAudio;
        // small files are transcribed directly by transcribeAudioChunk.
        const fileSize = fs.statSync(localPath).size;
        const LARGE_AUDIO_THRESHOLD = 25 * 1024 * 1024; // 25 MB raw audio → always chunk

        if (fileSize >= LARGE_AUDIO_THRESHOLD) {
          return await transcribeLargeAudio(localPath);
        }
        return transcribeAudioChunk(localPath);
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
