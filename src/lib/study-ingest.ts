import { extractText, getDocumentProxy } from "unpdf";
import { PDFDocument } from "pdf-lib";
import { ocrAvailable, transcribeWithAi } from "./ai-ocr";
import {
  claimNextStudyFilePart,
  createPendingStudyFile,
  finishStudyFilePart,
  getStudyFileLectura,
  getStudyFileRecord,
  listStudyFileParts,
  markStudyFileUploaded,
  MAX_PART_ATTEMPTS,
  putStudyFileChunk,
  readStudyFileBytes,
  replaceStudyFileParts,
  storageKeyForFile,
  updateStudyFileExtraction,
  type StudyFilePart,
} from "./file-store-auth";
import { UPLOAD_CHUNK_BYTES } from "./limits";
import { extractTextFromBuffer } from "./study-chat";
import type { LecturaArchivo } from "./types";

export const OCR_PAGES_PER_PART = 4;
const MIN_PAGE_TEXT_CHARS = 40;
const OCR_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

type PlannedPart = Pick<StudyFilePart, "startPage" | "endPage" | "status" | "text">;

function isPdf(name: string, type: string): boolean {
  return type.toLowerCase().includes("pdf") || name.toLowerCase().endsWith(".pdf");
}

function pageText(page: number, text: string): string {
  return `[Página ${page}]\n${text.trim()}`;
}

async function pdfPageTexts(bytes: Uint8Array): Promise<string[]> {
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { text } = await extractText(pdf, { mergePages: false });
  return text.map((page) => page.replace(/[ \t]+/g, " ").trim());
}

function planPdfParts(pages: string[]): PlannedPart[] {
  const parts: PlannedPart[] = [];
  let index = 0;
  while (index < pages.length) {
    const hasText = pages[index].length >= MIN_PAGE_TEXT_CHARS;
    let end = index;
    while (
      end + 1 < pages.length &&
      (pages[end + 1].length >= MIN_PAGE_TEXT_CHARS) === hasText &&
      (hasText || end + 1 - index < OCR_PAGES_PER_PART)
    ) {
      end += 1;
    }
    parts.push({
      startPage: index + 1,
      endPage: end + 1,
      status: hasText ? "done" : "pending",
      text: hasText
        ? pages
            .slice(index, end + 1)
            .map((text, offset) => pageText(index + offset + 1, text))
            .join("\n\n")
        : null,
    });
    index = end + 1;
  }
  return parts;
}

export async function ingestStoredFile(
  fileId: string,
  input: { name: string; type: string; bytes: Buffer }
): Promise<void> {
  const { name, type, bytes } = input;
  const mime = type.toLowerCase();

  if (isPdf(name, mime)) {
    let pages: string[];
    try {
      pages = await pdfPageTexts(bytes);
    } catch (error) {
      await markStudyFileUploaded(fileId, {
        extractedText: null,
        extractionStatus: "pdf-text-error",
        extractionDetail: `No pude leer el PDF: ${error instanceof Error ? error.message : "error desconocido"}`,
        pageCount: 0,
      });
      return;
    }
    const parts = planPdfParts(pages);
    const needsOcr = parts.some((part) => part.status === "pending");
    const textSoFar = joinDoneParts(parts);
    if (needsOcr && !ocrAvailable()) {
      await markStudyFileUploaded(fileId, {
        extractedText: textSoFar,
        extractionStatus: "pdf-ocr-unavailable",
        extractionDetail:
          "El PDF tiene páginas escaneadas y no hay proveedor de IA configurado para leerlas.",
        pageCount: pages.length,
      });
      return;
    }
    await replaceStudyFileParts(fileId, needsOcr ? parts : []);
    await markStudyFileUploaded(fileId, {
      extractedText: textSoFar,
      extractionStatus: needsOcr ? "ocr-pending" : "pdf-text-layer",
      pageCount: pages.length,
    });
    return;
  }

  if (OCR_IMAGE_TYPES.has(mime) && ocrAvailable()) {
    await replaceStudyFileParts(fileId, [
      { startPage: 1, endPage: 1, status: "pending", text: null },
    ]);
    await markStudyFileUploaded(fileId, {
      extractedText: null,
      extractionStatus: "ocr-pending",
      pageCount: 1,
    });
    return;
  }

  const extraction = await extractTextFromBuffer(name, type, bytes);
  await markStudyFileUploaded(fileId, {
    extractedText: extraction.text,
    extractionStatus: extraction.status,
    extractionDetail: extraction.detail,
    pageCount: extraction.text ? 1 : 0,
  });
}

export async function storeStudyFileFromBuffer(input: {
  name: string;
  type: string;
  bytes: Buffer;
}): Promise<{ fileId: string; storageKey: string }> {
  const chunkCount = Math.max(1, Math.ceil(input.bytes.length / UPLOAD_CHUNK_BYTES));
  const fileId = await createPendingStudyFile({
    name: input.name,
    type: input.type,
    size: input.bytes.length,
    chunkCount,
  });
  for (let i = 0; i < chunkCount; i += 1) {
    await putStudyFileChunk(
      fileId,
      i,
      new Uint8Array(input.bytes.subarray(i * UPLOAD_CHUNK_BYTES, (i + 1) * UPLOAD_CHUNK_BYTES))
    );
  }
  await ingestStoredFile(fileId, input);
  return { fileId, storageKey: storageKeyForFile(fileId) };
}

function joinDoneParts(parts: Array<Pick<StudyFilePart, "status" | "text">>): string | null {
  const text = parts
    .filter((part) => part.status === "done" && part.text?.trim())
    .map((part) => part.text!.trim())
    .join("\n\n");
  return text || null;
}

async function partBytes(
  bytes: Buffer,
  type: string,
  part: StudyFilePart
): Promise<Uint8Array> {
  if (!type.toLowerCase().includes("pdf")) return bytes;
  const source = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const out = await PDFDocument.create();
  const indexes = Array.from(
    { length: part.endPage - part.startPage + 1 },
    (_, offset) => part.startPage - 1 + offset
  );
  const pages = await out.copyPages(source, indexes);
  pages.forEach((page) => out.addPage(page));
  return out.save();
}

async function refreshExtractedText(fileId: string): Promise<void> {
  const parts = await listStudyFileParts(fileId);
  if (parts.length === 0) return;
  const open = parts.some(
    (part) =>
      part.status === "pending" ||
      part.status === "processing" ||
      (part.status === "error" && part.attempts < MAX_PART_ATTEMPTS)
  );
  const done = parts.filter((part) => part.status === "done");
  const status = open
    ? "ocr-pending"
    : done.length === parts.length
      ? "ocr-complete"
      : done.length > 0
        ? "ocr-partial"
        : "pdf-ocr-error";
  const failedPages = parts
    .filter((part) => part.status !== "done")
    .map((part) =>
      part.startPage === part.endPage
        ? `${part.startPage}`
        : `${part.startPage}–${part.endPage}`
    );
  await updateStudyFileExtraction(fileId, {
    extractedText: joinDoneParts(parts),
    extractionStatus: status,
    extractionDetail:
      !open && failedPages.length
        ? `No pude leer las páginas ${failedPages.join(", ")}.`
        : null,
  });
}

export async function readNextPart(
  fileId: string
): Promise<{ lectura: LecturaArchivo; processed: boolean; error?: string } | null> {
  const record = await getStudyFileRecord(fileId);
  if (!record) return null;
  if (record.uploadStatus !== "ready") {
    return { lectura: await getStudyFileLectura(fileId), processed: false };
  }

  const part = await claimNextStudyFilePart(fileId);
  if (!part) {
    return { lectura: await getStudyFileLectura(fileId), processed: false };
  }

  let error: string | undefined;
  try {
    const bytes = await readStudyFileBytes(fileId);
    if (!bytes) throw new Error("No encontré el archivo guardado.");
    const text = await transcribeWithAi({
      fileName: record.name,
      mimeType: record.type,
      bytes: await partBytes(bytes, record.type, part),
      startPage: part.startPage,
      endPage: part.endPage,
    });
    await finishStudyFilePart(fileId, part.index, {
      text: /^\[Página \d+\]/.test(text) ? text : pageText(part.startPage, text),
    });
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Error desconocido.";
    await finishStudyFilePart(fileId, part.index, { error });
  }
  await refreshExtractedText(fileId);
  return { lectura: await getStudyFileLectura(fileId), processed: true, error };
}
