import type { MasteryState, Tema } from "./types";

export const MASTERY_WEIGHTS: Record<MasteryState, number> = {
  no_estudiado: 0,
  empezado: 0.25,
  estudiado: 0.6,
  necesita_practica: 0.75,
  dominado: 1,
};

export function calculatePreparation(temas: Pick<Tema, "masteryState">[]): number {
  if (temas.length === 0) return 0;
  const sum = temas.reduce((acc, t) => acc + MASTERY_WEIGHTS[t.masteryState], 0);
  return Math.round((sum / temas.length) * 100);
}
