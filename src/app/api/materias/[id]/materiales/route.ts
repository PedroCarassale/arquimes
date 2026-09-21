import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { createMaterial, getMateriales, getMateria } from "@/lib/db";
import { storeStudyFile } from "@/lib/file-store";
import { MAX_STUDY_FILE_BYTES, studyFileTooBigMessage } from "@/lib/limits";
import { extractTextFromBuffer } from "@/lib/study-chat";
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
    const materiales = await getMateriales(id);
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

    const extraction = await extractTextFromBuffer(
      file.name,
      file.type || "application/octet-stream",
      buffer
    );
    const persisted = await storeStudyFile({
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size || buffer.length,
      bytes: buffer,
      extractedText: extraction.text,
      extractionStatus: extraction.status,
      extractionDetail: extraction.detail,
    });
    const fileId = uuid();
    const material = await createMaterial(
      fileId,
      materiaId,
      file.name,
      file.type || "application/octet-stream",
      file.size,
      persisted.storageKey
    );

    return NextResponse.json(
      { ...material, contentBase64: undefined, hasContent: true },
      { status: 201 }
    );
  } catch (error) {
    return apiErrorResponse(error, "Error al subir el archivo");
  }
}
