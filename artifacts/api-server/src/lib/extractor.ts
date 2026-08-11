import fs from "fs";
import path from "path";

export type MaterialType = "photo" | "image" | "pdf" | "excel" | "text" | "audio";

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
      return `[Image: ${path.basename(filePath)} — text extraction not available for images]`;
    }

    case "audio": {
      return `[Audio: ${path.basename(filePath)} — transcription not available]`;
    }

    default:
      return "";
  }
}
