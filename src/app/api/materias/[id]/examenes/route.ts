import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { createExamenWithFile, getExamenesConLectura, getMateria } from "@/lib/db";
import { getStudyFileLectura } from "@/lib/file-store";
import {
  MAX_STUDY_FILE_BYTES,
  studyFileMimeType,
  studyFileTooBigMessage,
} from "@/lib/limits";
import { storeStudyFileFromBuffer } from "@/lib/study-ingest";
import { requireServerSession } from "@/lib/auth-session";
import { apiErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireServerSession();
    const { id } = await params;
    const examenes = await getExamenesConLectura(id);
    return NextResponse.json(examenes);
  } catch (error) {
    return apiErrorResponse(error, "No pude leer los exámenes.");
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireServerSession();
    const { id: materiaId } = await params;

    const materia = await getMateria(materiaId);
    if (!materia) {
      return NextResponse.json(
        { error: "Materia no encontrada" },
        { status: 404 }
      );
    }

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Adjuntá el archivo del examen." },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Adjuntá el archivo del examen." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length === 0) {
      return NextResponse.json(
        { error: "El archivo está vacío." },
        { status: 400 }
      );
    }
    if (buffer.length > MAX_STUDY_FILE_BYTES) {
      return NextResponse.json(
        { error: studyFileTooBigMessage(file.name) },
        { status: 413 }
      );
    }

    const type = studyFileMimeType(file.name, file.type);
    const persisted = await storeStudyFileFromBuffer({
      name: file.name,
      type,
      bytes: buffer,
    });
    const noteRaw = formData.get("note");
    const note =
      typeof noteRaw === "string" && noteRaw.trim()
        ? noteRaw.trim()
        : undefined;

    const examen = await createExamenWithFile(uuid(), materiaId, {
      name: note,
      fileName: file.name,
      fileType: type,
      fileSize: buffer.length,
      contentBase64: undefined,
      storageKey: persisted.storageKey,
    });

    return NextResponse.json(
      {
        ...examen,
        fileId: persisted.fileId,
        lectura: await getStudyFileLectura(persisted.fileId),
      },
      { status: 201 }
    );
  } catch (error) {
    return apiErrorResponse(error, "No pude guardar el examen.");
  }
}
