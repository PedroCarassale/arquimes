import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { createMaterial, getMateriales, getMateria } from "@/lib/db";

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

    const fileId = uuid();
    const storageKey = `demo-${fileId}`;

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
