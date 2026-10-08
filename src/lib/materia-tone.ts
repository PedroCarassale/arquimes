export type MateriaTone = { name: string; color: string; hue: number };

function tone(name: string, lightness: number, chroma: number, hue: number): MateriaTone {
  return { name, color: `oklch(${lightness} ${chroma} ${hue})`, hue };
}

export const MATERIA_TONES: MateriaTone[] = [
  tone("terracota", 0.7, 0.09, 25),
  tone("arena", 0.76, 0.07, 95),
  tone("musgo", 0.73, 0.08, 140),
  tone("agua", 0.73, 0.08, 180),
  tone("cielo", 0.72, 0.08, 220),
  tone("índigo", 0.7, 0.09, 262),
  tone("lavanda", 0.72, 0.09, 302),
  tone("rosa viejo", 0.72, 0.08, 342),
];

function hueDistance(a: number, b: number): number {
  const delta = Math.abs(a - b) % 360;
  return Math.min(delta, 360 - delta);
}

function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

export type MateriaTones = ReadonlyMap<string, MateriaTone>;

export function assignMateriaTones(newestFirst: readonly string[]): MateriaTones {
  const tones = new Map<string, MateriaTone>();
  const used: number[] = [];
  const count = MATERIA_TONES.length;
  for (const id of [...newestFirst].reverse()) {
    if (tones.has(id)) continue;
    const preferred = fnv1a(id) % count;
    const round = used.slice(used.length - (used.length % count));
    let best = preferred;
    let bestScore = -1;
    for (let step = 0; step < count; step += 1) {
      const index = (preferred + step) % count;
      if (round.includes(index)) continue;
      const hue = MATERIA_TONES[index].hue;
      const score = Math.min(360, ...round.map((other) => hueDistance(hue, MATERIA_TONES[other].hue)));
      if (score > bestScore) {
        best = index;
        bestScore = score;
      }
    }
    used.push(best);
    tones.set(id, MATERIA_TONES[best]);
  }
  return tones;
}

export function materiaTone(materiaId: string, tones?: MateriaTones): MateriaTone {
  return tones?.get(materiaId) ?? MATERIA_TONES[fnv1a(materiaId) % MATERIA_TONES.length];
}
