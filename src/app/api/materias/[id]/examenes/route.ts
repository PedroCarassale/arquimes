import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { createExamen, getExamenes, getMateria, createTema } from "@/lib/db";
import { ExamType } from "@/lib/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const examenes = getExamenes(id);
  return NextResponse.json(examenes);
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

    const body = await request.json();
    const { type, date, modality, temas } = body;

    if (!type || !["parcial", "final"].includes(type)) {
      return NextResponse.json(
        { error: "Tipo de examen inválido" },
        { status: 400 }
      );
    }

    if (!date) {
      return NextResponse.json(
        { error: "La fecha es requerida" },
        { status: 400 }
      );
    }

    const examenId = uuid();
    const examen = createExamen(
      examenId,
      materiaId,
      type as ExamType,
      date,
      modality?.trim() || undefined
    );

    if (Array.isArray(temas)) {
      for (const temaName of temas) {
        if (typeof temaName === "string" && temaName.trim()) {
          createTema(uuid(), examenId, temaName.trim());
        }
      }
    }

    return NextResponse.json(examen, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Error al crear el examen" },
      { status: 500 }
    );
  }
}
