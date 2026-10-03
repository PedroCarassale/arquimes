import { NextResponse } from "next/server";
import { getMateria } from "@/lib/db";
import { createPendingStudyFile, listReadingStudyFiles } from "@/lib/file-store";
import {
  isSupportedStudyFile,
  MAX_STUDY_FILE_BYTES,
  studyFileMimeType,
  studyFileTooBigMessage,
  UPLOAD_CHUNK_BYTES,
} from "@/lib/limits";
import { requireServerSession } from "@/lib/auth-session";
import { apiErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireServerSession();
    return NextResponse.json({ leyendo: await listReadingStudyFiles() });
  } catch (error) {
    return apiErrorResponse(error, "No pude revisar los archivos en lectura.");
  }
}

export async function POST(request: Request) {
  try {
    await requireServerSession();
    const body = (await request.json().catch(() => ({}))) as {
      materiaId?: unknown;
      name?: unknown;
      type?: unknown;
      size?: unknown;
    };
    const materiaId = typeof body.materiaId === "string" ? body.materiaId : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const size = typeof body.size === "number" ? body.size : NaN;
    if (!materiaId || !name || !Number.isFinite(size)) {
      return NextResponse.json({ error: "Faltan datos del archivo." }, { status: 400 });
    }
    if (!(await getMateria(materiaId))) {
      return NextResponse.json({ error: "Materia no encontrada" }, { status: 404 });
    }
    if (size <= 0) {
      return NextResponse.json({ error: "El archivo está vacío." }, { status: 400 });
    }
    if (size > MAX_STUDY_FILE_BYTES) {
      return NextResponse.json({ error: studyFileTooBigMessage(name) }, { status: 413 });
    }
    if (!isSupportedStudyFile(name)) {
      return NextResponse.json(
        { error: `No pude guardar “${name}”: formato no compatible.` },
        { status: 415 }
      );
    }

    const chunkCount = Math.ceil(size / UPLOAD_CHUNK_BYTES);
    const fileId = await createPendingStudyFile({
      name,
      type: studyFileMimeType(name, typeof body.type === "string" ? body.type : ""),
      size,
      chunkCount,
    });
    return NextResponse.json(
      { fileId, chunkSize: UPLOAD_CHUNK_BYTES, chunkCount },
      { status: 201 }
    );
  } catch (error) {
    return apiErrorResponse(error, "No pude iniciar la subida.");
  }
}
