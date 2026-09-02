import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { createTema, getTemas, getExamen } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const temas = getTemas(id);
  return NextResponse.json(temas);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: examenId } = await params;

    const examen = getExamen(examenId);
    if (!examen) {
      return NextResponse.json(
        { error: "Examen no encontrado" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "El nombre del tema es requerido" },
        { status: 400 }
      );
    }

    const tema = createTema(uuid(), examenId, name.trim());

    return NextResponse.json(tema, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Error al crear el tema" },
      { status: 500 }
    );
  }
}
