type ApuntesOpts = { tipo?: "archivos" | "generados"; orden?: "nombre" };
type CalendarioOpts = { mes?: string; vista?: "agenda"; nuevo?: boolean; fecha?: string };

function withQuery(base: string, entries: [string, string | undefined][]): string {
  const params = new URLSearchParams();
  for (const [key, value] of entries) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

export const rutas = {
  inicio: "/",
  calendarioGlobal: "/calendario",
  nuevaMateria: "/materias/nueva",
  materia: (m: string) => `/materias/${m}`,
  nueva: (m: string) => `/materias/${m}/nueva`,
  clases: (m: string) => `/materias/${m}/clases`,
  clase: (m: string, notaId: string) => `/materias/${m}/clases/${notaId}`,
  apuntes: (m: string, opts?: ApuntesOpts) =>
    withQuery(`/materias/${m}/apuntes`, [
      ["tipo", opts?.tipo],
      ["orden", opts?.orden],
    ]),
  archivo: (m: string, materialId: string) => `/materias/${m}/apuntes/archivo/${materialId}`,
  generado: (m: string, artefactoId: string) => `/materias/${m}/apuntes/generado/${artefactoId}`,
  calendario: (m: string, opts?: CalendarioOpts) =>
    withQuery(`/materias/${m}/calendario`, [
      ["mes", opts?.mes],
      ["vista", opts?.vista],
      ["nuevo", opts?.nuevo ? "1" : undefined],
      ["fecha", opts?.fecha],
    ]),
  evento: (m: string, eventoId: string) => `/materias/${m}/calendario/${eventoId}`,
} as const;
