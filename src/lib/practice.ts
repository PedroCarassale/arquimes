import type { MasteryState, Material, PracticeOutcome, Tema } from "./types";

export type { PracticeOutcome };

export interface PracticeItem {
  temaId: string;
  temaName: string;
  prompt: string;
  materialHint: string | null;
  masteryState: MasteryState;
}

const PRACTICE_RANK: Record<MasteryState, number> = {
  no_estudiado: 0,
  empezado: 1,
  necesita_practica: 2,
  estudiado: 3,
  dominado: 4,
};

export function nextMasteryFromPractice(
  current: MasteryState,
  outcome: PracticeOutcome
): MasteryState {
  if (outcome === "lo_tengo") {
    if (current === "estudiado" || current === "dominado") return "dominado";
    return "estudiado";
  }
  if (current === "no_estudiado") return "empezado";
  return "necesita_practica";
}

export function pickPracticeTema(temas: Tema[]): Tema | undefined {
  if (temas.length === 0) return undefined;
  return [...temas].sort((a, b) => {
    const rank = PRACTICE_RANK[a.masteryState] - PRACTICE_RANK[b.masteryState];
    if (rank !== 0) return rank;
    return a.createdAt.localeCompare(b.createdAt);
  })[0];
}

export function buildMaterialHint(materiales: Material[]): string | null {
  if (materiales.length === 0) return null;
  const names = materiales.slice(0, 3).map((m) => m.name);
  const extra = materiales.length > 3 ? "…" : "";
  return `Material de esta materia: ${names.join(", ")}${extra}.`;
}

export function buildPracticeItem(
  tema: Tema,
  materiales: Material[]
): PracticeItem {
  const materialHint = buildMaterialHint(materiales);
  const prompt = materialHint
    ? `Con tus apuntes a mano, en una frase: ¿qué tenés que poder explicar de «${tema.name}» el día del examen?`
    : `En una frase, ¿qué tenés que poder explicar de «${tema.name}» el día del examen?`;
  return {
    temaId: tema.id,
    temaName: tema.name,
    prompt,
    materialHint,
    masteryState: tema.masteryState,
  };
}
