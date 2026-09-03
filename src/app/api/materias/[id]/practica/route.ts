import { NextResponse } from "next/server";
import {
  applyPracticeOutcome,
  getMateria,
  getMateriales,
  getTemasForMateria,
} from "@/lib/db";
import { calculatePreparation } from "@/lib/mastery";
import {
  buildPracticeItem,
  pickPracticeTema,
} from "@/lib/practice";
import { MASTERY_LABELS, type PracticeOutcome } from "@/lib/types";

export const dynamic = "force-dynamic";

const OUTCOMES: PracticeOutcome[] = ["lo_tengo", "todavia_no"];

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
    const { temaId, outcome, answer } = body as {
      temaId?: unknown;
      outcome?: unknown;
      answer?: unknown;
    };

    if (typeof temaId !== "string" || !temaId) {
      return NextResponse.json({ error: "Tema inválido" }, { status: 400 });
    }

    if (typeof outcome !== "string" || !OUTCOMES.includes(outcome as PracticeOutcome)) {
      return NextResponse.json(
        { error: "Indicá si lo tenés o todavía no." },
        { status: 400 }
      );
    }

    if (outcome === "lo_tengo") {
      const text = typeof answer === "string" ? answer.trim() : "";
      if (text.length < 8) {
        return NextResponse.json(
          { error: "Escribí una frase corta antes de marcar que lo tenés." },
          { status: 400 }
        );
      }
    }

    const result = await applyPracticeOutcome(
      temaId,
      materiaId,
      outcome as PracticeOutcome
    );
    if (!result) {
      return NextResponse.json(
        { error: "Ese tema no pertenece a esta materia." },
        { status: 404 }
      );
    }

    const temas = await getTemasForMateria(materiaId);
    const materiales = await getMateriales(materiaId);
    const nextTema = pickPracticeTema(temas);
    const nextItem = nextTema ? buildPracticeItem(nextTema, materiales) : null;

    return NextResponse.json({
      temaId: result.tema.id,
      temaName: result.tema.name,
      previousMastery: result.previous,
      masteryState: result.tema.masteryState,
      masteryLabel: MASTERY_LABELS[result.tema.masteryState],
      previousLabel: MASTERY_LABELS[result.previous],
      preparation: calculatePreparation(temas),
      nextItem,
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo guardar la práctica." },
      { status: 500 }
    );
  }
}
