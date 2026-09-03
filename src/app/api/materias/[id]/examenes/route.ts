import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { createExamenWithTemas, getExamenes, getMateria } from "@/lib/db";
import { ExamType } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
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

    const body = await request.json();
    const { type, date, modality, temas, name, objective } = body;

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

    const temaNames = Array.isArray(temas)
      ? temas
          .filter((t: unknown) => typeof t === "string" && t.trim())
          .map((t: string) => t.trim())
      : [];

    const examen = await createExamenWithTemas(
      uuid(),
      materiaId,
      type as ExamType,
      date,
      modality?.trim() || undefined,
      temaNames,
      typeof name === "string" && name.trim() ? name.trim() : undefined,
      typeof objective === "string" && objective.trim()
        ? objective.trim()
        : undefined
    );

    return NextResponse.json(examen, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al crear el examen";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
