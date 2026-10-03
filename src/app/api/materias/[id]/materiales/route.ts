import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { createMaterial, getMateriales, getMateria, withLectura } from "@/lib/db";
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
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireServerSession();
    const { id } = await params;
    const materiales = await withLectura(await getMateriales(id));
    return NextResponse.json(
      materiales.map(({ contentBase64, ...rest }) => ({
        ...rest,
        hasContent: Boolean(contentBase64 || rest.storageKey?.startsWith("libsql:")),
      }))
    );
  } catch (error) {
    return apiErrorResponse(error, "No pude leer los materiales.");
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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No se recibió ningún archivo" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length === 0) {
      return NextResponse.json(
        { error: "El archivo está vacío" },
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
    const material = await createMaterial(
      uuid(),
      materiaId,
      file.name,
      type,
      buffer.length,
      persisted.storageKey
    );
    const lectura = await getStudyFileLectura(persisted.fileId);

    return NextResponse.json(
      {
        ...material,
        contentBase64: undefined,
        hasContent: true,
        fileId: persisted.fileId,
        lectura,
      },
      { status: 201 }
    );
  } catch (error) {
    return apiErrorResponse(error, "Error al subir el archivo");
  }
}
