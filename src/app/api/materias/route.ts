import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { createMateria, getMaterias } from "@/lib/db";

export async function GET() {
  const materias = getMaterias();
  return NextResponse.json(materias);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, faculty, catedra } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "El nombre es requerido" },
        { status: 400 }
      );
    }

    const id = uuid();
    const materia = createMateria(
      id,
      name.trim(),
      faculty?.trim() || undefined,
      catedra?.trim() || undefined
    );

    return NextResponse.json(materia, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Error al crear la materia" },
      { status: 500 }
    );
  }
}
