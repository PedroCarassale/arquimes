import { NextResponse } from "next/server";
import { applyPracticeOutcome, getTemasForMateria } from "@/lib/db";
import { getArtefacto } from "@/lib/workspace-store";
import { normalizeTemaName } from "@/lib/artefactos";
import { MASTERY_LABELS } from "@/lib/types";
import { requireServerSession } from "@/lib/auth-session";
import { apiErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireServerSession();
    const artefacto = await getArtefacto((await params).id);
    if (!artefacto) {
      return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
    }
    const body = (await request.json().catch(() => ({}))) as { resultados?: unknown };
    const resultados = Array.isArray(body.resultados) ? body.resultados : [];

    const porTema = new Map<string, boolean>();
    for (const item of resultados) {
      const { tema, correcta } = (item ?? {}) as { tema?: unknown; correcta?: unknown };
      if (typeof tema !== "string" || !tema.trim()) continue;
      const key = normalizeTemaName(tema);
      porTema.set(key, (porTema.get(key) ?? true) && correcta === true);
    }

    const temas = await getTemasForMateria(artefacto.materiaId);
    const cambios: { tema: string; antes: string; ahora: string }[] = [];
    for (const tema of temas) {
      const acierto = porTema.get(normalizeTemaName(tema.name));
      if (acierto === undefined) continue;
      const result = await applyPracticeOutcome(
        tema.id,
        artefacto.materiaId,
        acierto ? "lo_tengo" : "todavia_no"
      );
      if (result) {
        cambios.push({
          tema: tema.name,
          antes: MASTERY_LABELS[result.previous],
          ahora: MASTERY_LABELS[result.tema.masteryState],
        });
      }
    }
    return NextResponse.json({ cambios });
  } catch (error) {
    return apiErrorResponse(error, "No pude guardar el resultado.");
  }
}
