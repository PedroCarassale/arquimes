export type MateriaTone = { name: string; color: string };

export const MATERIA_TONES: MateriaTone[] = [
  { name: "arena", color: "oklch(.74 .05 95)" },
  { name: "salvia", color: "oklch(.72 .07 150)" },
  { name: "pizarra", color: "oklch(.70 .06 245)" },
  { name: "lavanda", color: "oklch(.72 .07 295)" },
  { name: "terracota", color: "oklch(.70 .08 25)" },
  { name: "musgo", color: "oklch(.72 .07 120)" },
  { name: "acero", color: "oklch(.72 .05 215)" },
  { name: "rosa viejo", color: "oklch(.72 .07 350)" },
];

function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

export function materiaTone(materiaId: string): MateriaTone {
  return MATERIA_TONES[fnv1a(materiaId) % MATERIA_TONES.length];
}
