import { NextResponse } from "next/server";
import { getMateria, updateMateriaPreparacion } from "@/lib/db";
import { requireServerSession } from "@/lib/auth-session";
import { apiErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    await requireServerSession();
    const { id } = await params;
    const materia = await getMateria(id);
    if (!materia) {
      return NextResponse.json({ error: "No encuentro esa materia." }, { status: 404 });
    }
    return NextResponse.json({
      preparacion: materia.preparacion || null,
    });
  } catch (error) {
    return apiErrorResponse(error, "No pude leer la preparación.");
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    await requireServerSession();
    const { id } = await params;
    const materia = await getMateria(id);
    if (!materia) {
      return NextResponse.json({ error: "No encuentro esa materia." }, { status: 404 });
    }

    const body = (await request.json()) as {
      temas?: unknown;
      fechaParcial?: unknown;
    };

    const temas = normalizeTemas(body.temas);
    const fechaParcial =
      typeof body.fechaParcial === "string" ? body.fechaParcial.trim() : "";

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaParcial) || Number.isNaN(Date.parse(fechaParcial))) {
      return NextResponse.json(
        { error: "Ingresá una fecha de parcial válida (YYYY-MM-DD)." },
        { status: 400 }
      );
    }

    if (temas.length === 0) {
      return NextResponse.json(
        { error: "Agregá al menos un tema para preparar." },
        { status: 400 }
      );
    }

    const prev = materia.preparacion;
    const sameConfig = Boolean(
      prev &&
        prev.fechaParcial === fechaParcial &&
        prev.temas.length === temas.length &&
        prev.temas.every((tema, index) => tema === temas[index])
    );

    const updated = await updateMateriaPreparacion(id, {
      temas,
      fechaParcial,
      resetPlan: !sameConfig,
    });
    if (!updated) {
      return NextResponse.json({ error: "No pude guardar la preparación." }, { status: 500 });
    }

    return NextResponse.json({ preparacion: updated.preparacion });
  } catch (error) {
    return apiErrorResponse(error, "No pude guardar la preparación.");
  }
}

function normalizeTemas(input: unknown): string[] {
  if (Array.isArray(input)) {
    return uniqueNonEmpty(input.map((value) => String(value)));
  }
  if (typeof input === "string") {
    return uniqueNonEmpty(input.split(/\n|,/g));
  }
  return [];
}

function uniqueNonEmpty(values: string[]): string[] {
  const normalized = values
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 20);
  return [...new Set(normalized)];
}
