import { NextResponse } from "next/server";
import {
  getStudyFileLectura,
  getStudyFileMetaByStorageKeys,
  storageKeyForFile,
  getStudyFileRecord,
  readStudyFileBytes,
  resetFailedStudyFileParts,
  updateStudyFileExtraction,
} from "@/lib/file-store";
import { ingestStoredFile } from "@/lib/study-ingest";
import { requireServerSession } from "@/lib/auth-session";
import { apiErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    await requireServerSession();
    const { fileId } = await params;
    const record = await getStudyFileRecord(fileId);
    const bytes = record?.uploadStatus === "ready" ? await readStudyFileBytes(fileId) : null;
    if (!record || !bytes) {
      return NextResponse.json({ error: "Archivo no encontrado." }, { status: 404 });
    }
    const current = await getStudyFileLectura(fileId);
    if (current.estado === "parcial" && (await resetFailedStudyFileParts(fileId)) > 0) {
      const meta = (await getStudyFileMetaByStorageKeys([storageKeyForFile(fileId)])).get(
        storageKeyForFile(fileId)
      );
      await updateStudyFileExtraction(fileId, {
        extractedText: meta?.extractedText ?? null,
        extractionStatus: "ocr-pending",
      });
    } else {
      await ingestStoredFile(fileId, { name: record.name, type: record.type, bytes });
    }
    return NextResponse.json({ lectura: await getStudyFileLectura(fileId) });
  } catch (error) {
    return apiErrorResponse(error, "No pude volver a leer el archivo.");
  }
}
