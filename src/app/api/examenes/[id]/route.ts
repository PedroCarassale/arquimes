import { NextResponse } from "next/server";
import {
  deleteExamen,
  findDuplicateExamen,
  getExamen,
  getTemas,
  updateExamenWithTemas,
} from "@/lib/db";
import { ExamType } from "@/lib/types";

export const dynamic = "force-dynamic";

function parseTemaNames(temas: unknown): string[] {
  if (!Array.isArray(temas)) return [];
  return temas
    .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
    .map((t) => t.trim());
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const examen = await getExamen(id);
  if (!examen) {
    return NextResponse.json({ error: "Examen no encontrado" }, { status: 404 });
  }
  const temas = await getTemas(id);
  return NextResponse.json({ ...examen, temas });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const examen = await getExamen(id);
    if (!examen) {
      return NextResponse.json({ error: "Examen no encontrado" }, { status: 404 });
    }

    const body = await request.json();
    const { type, date, modality, temas, name, objective } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Indicá el nombre del examen." },
        { status: 400 }
      );
    }

    if (!type || !["parcial", "final"].includes(type)) {
      return NextResponse.json(
        { error: "Tipo de examen inválido" },
        { status: 400 }
      );
    }

    if (!date || typeof date !== "string") {
      return NextResponse.json(
        { error: "La fecha es requerida" },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    const duplicate = await findDuplicateExamen(
      examen.materiaId,
      trimmedName,
      date,
      id
    );
    if (duplicate) {
      return NextResponse.json(
        { error: "Ya existe un examen con ese nombre y esa fecha." },
        { status: 409 }
      );
    }

    const updated = await updateExamenWithTemas(id, {
      name: trimmedName,
      type: type as ExamType,
      date,
      modality: typeof modality === "string" ? modality.trim() : undefined,
      objective:
        typeof objective === "string" && objective.trim()
          ? objective.trim()
          : undefined,
      temaNames: parseTemaNames(temas),
    });

    return NextResponse.json(updated);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al actualizar el examen";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const examen = await getExamen(id);
  if (!examen) {
    return NextResponse.json({ error: "Examen no encontrado" }, { status: 404 });
  }
  await deleteExamen(id);
  return NextResponse.json({ ok: true });
}
