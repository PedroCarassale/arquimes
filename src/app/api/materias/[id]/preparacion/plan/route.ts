import { NextResponse } from "next/server";
import { ProviderConfigError } from "@/lib/ai-providers";
import {
  getMateria,
  saveMateriaPlanPreparacion,
} from "@/lib/db";
import {
  generatePlanPreparacion,
  getPlanPreparacionSchema,
} from "@/lib/preparacion-plan";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const materia = await getMateria(id);
    if (!materia) {
      return NextResponse.json({ error: "No encuentro esa materia." }, { status: 404 });
    }

    const preparacion = materia.preparacion;
    if (!preparacion?.temas?.length || !preparacion.fechaParcial) {
      return NextResponse.json(
        { error: "Primero guardá temas y fecha del parcial." },
        { status: 400 }
      );
    }

    const plan = await generatePlanPreparacion({
      materiaName: materia.name,
      fechaParcial: preparacion.fechaParcial,
      temas: preparacion.temas,
    });
    const updated = await saveMateriaPlanPreparacion(id, plan);
    if (!updated?.preparacion) {
      return NextResponse.json({ error: "No pude guardar el plan." }, { status: 500 });
    }

    return NextResponse.json({
      preparacion: updated.preparacion,
      schema: getPlanPreparacionSchema(),
    });
  } catch (error) {
    if (error instanceof ProviderConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    const message =
      error instanceof Error
        ? error.message
        : "No pude generar el plan de preparación.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
