import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { createExamenWithFile, getExamenes, getMateria } from "@/lib/db";
import { storeStudyFile } from "@/lib/file-store";
import { MAX_STUDY_FILE_BYTES, studyFileTooBigMessage } from "@/lib/limits";
import { extractTextFromBuffer } from "@/lib/study-chat";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const examenes = await getExamenes(id);
  return NextResponse.json(examenes);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    const extraction = await extractTextFromBuffer(
      file.name,
      file.type || "application/octet-stream",
      buffer
    );
    const persisted = await storeStudyFile({
      name: file.name,
      type: file.type || "application/octet-stream",
      size: buffer.length,
      bytes: buffer,
      extractedText: extraction.text,
      extractionStatus: extraction.status,
      extractionDetail: extraction.detail,
    });
    const noteRaw = formData.get("note");
    const note =
      typeof noteRaw === "string" && noteRaw.trim()
        ? noteRaw.trim()
        : undefined;

    const examen = await createExamenWithFile(uuid(), materiaId, {
      name: note,
      fileName: file.name,
      fileType: file.type || "application/octet-stream",
      fileSize: buffer.length,
      contentBase64: undefined,
      storageKey: persisted.storageKey,
    });

    return NextResponse.json(examen, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No pude guardar el examen.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
