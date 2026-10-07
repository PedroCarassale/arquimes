import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { createEvaluacion, createTema, getMateria } from "@/lib/db";
import { parseEvaluacionInput } from "@/lib/evaluacion-input";
import { requireServerSession } from "@/lib/auth-session";
import { apiErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireServerSession();
    const { id } = await params;
    if (!(await getMateria(id))) {
      return NextResponse.json({ error: "Materia no encontrada" }, { status: 404 });
    }
    const body = await request.json().catch(() => ({}));
    const input = parseEvaluacionInput(body);
    if (!input.name) {
      return NextResponse.json({ error: "Poné un nombre." }, { status: 400 });
    }
    const evaluacion = await createEvaluacion(id, {
      kind: input.kind ?? "examen",
      name: input.name,
      type: input.type,
      date: input.date,
      description: input.description,
    });
    for (const tema of input.temas) {
      await createTema(uuid(), evaluacion.id, tema);
    }
    return NextResponse.json(evaluacion, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, "No pude guardar la evaluación.");
  }
}
