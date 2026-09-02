import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { createMaterial, getMateriales, getMateria } from "@/lib/db";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const materiales = getMateriales(id);
  return NextResponse.json(materiales);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: materiaId } = await params;

    const materia = getMateria(materiaId);
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

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileId = uuid();
    const ext = path.extname(file.name) || "";
    const storageKey = `${fileId}${ext}`;

    await mkdir(UPLOADS_DIR, { recursive: true });
    const filePath = path.join(UPLOADS_DIR, storageKey);
    await writeFile(filePath, buffer);

    const material = createMaterial(
      fileId,
      materiaId,
      file.name,
      file.type || "application/octet-stream",
      file.size,
      storageKey
    );

    return NextResponse.json(material, { status: 201 });
  } catch (err) {
    console.error("Error uploading file:", err);
    return NextResponse.json(
      { error: "Error al subir el archivo" },
      { status: 500 }
    );
  }
}
