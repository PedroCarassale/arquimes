import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { createExamenWithFile, createMaterial, getMateria } from "@/lib/db";
import {
  getStudyFileLectura,
  getStudyFileRecord,
  missingStudyFileChunks,
  readStudyFileBytes,
  storageKeyForFile,
} from "@/lib/file-store";
import { ingestStoredFile } from "@/lib/study-ingest";
import { requireServerSession } from "@/lib/auth-session";
import { apiErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    await requireServerSession();
    const { fileId } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      materiaId?: unknown;
      kind?: unknown;
      note?: unknown;
    };
    const materiaId = typeof body.materiaId === "string" ? body.materiaId : "";
    const kind = body.kind === "examen" ? "examen" : "apuntes";
    const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : undefined;

    if (!(await getMateria(materiaId))) {
      return NextResponse.json({ error: "Materia no encontrada" }, { status: 404 });
    }
    const record = await getStudyFileRecord(fileId);
    if (!record) {
      return NextResponse.json({ error: "La subida no existe." }, { status: 404 });
    }
    if (record.uploadStatus !== "uploading") {
      return NextResponse.json({ error: "Esta subida ya se completó." }, { status: 409 });
    }
    const { missing, totalBytes } = await missingStudyFileChunks(fileId, record.chunkCount);
    if (missing.length > 0 || totalBytes !== record.size) {
      return NextResponse.json(
        { error: "La subida quedó incompleta. Probá de nuevo.", missing },
        { status: 409 }
      );
    }

    const bytes = await readStudyFileBytes(fileId);
    if (!bytes) {
      return NextResponse.json({ error: "No encontré los bytes subidos." }, { status: 500 });
    }
    await ingestStoredFile(fileId, { name: record.name, type: record.type, bytes });

    const storageKey = storageKeyForFile(fileId);
    const lectura = await getStudyFileLectura(fileId);
    if (kind === "examen") {
      const examen = await createExamenWithFile(uuid(), materiaId, {
        name: note,
        fileName: record.name,
        fileType: record.type,
        fileSize: record.size,
        storageKey,
      });
      return NextResponse.json({ fileId, examen, lectura }, { status: 201 });
    }

    const material = await createMaterial(
      uuid(),
      materiaId,
      record.name,
      record.type,
      record.size,
      storageKey
    );
    return NextResponse.json(
      { fileId, material: { ...material, lectura }, lectura },
      { status: 201 }
    );
  } catch (error) {
    return apiErrorResponse(error, "No pude completar la subida.");
  }
}
