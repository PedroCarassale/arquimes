export type MasteryState =
  | "no_estudiado"
  | "empezado"
  | "estudiado"
  | "necesita_practica"
  | "dominado";

export type ExamType = "parcial" | "final";

export interface PlanPreparacionSemana {
  semana: number;
  foco: string;
  temas: string[];
  meta: string;
}

export interface PlanPreparacionDia {
  dia: number;
  fecha: string;
  foco: string;
  tareas: string[];
  checkpoint: string;
}

export interface PlanPreparacionHito {
  titulo: string;
  fecha: string;
  criterio: string;
}

export interface PlanPreparacion {
  version: "1";
  generatedAt: string;
  resumen: {
    objetivo: string;
    diasHastaParcial: number;
    minutosPorDia: number;
  };
  semanas: PlanPreparacionSemana[];
  agendaDiaria: PlanPreparacionDia[];
  hitos: PlanPreparacionHito[];
}

export interface Materia {
  id: string;
  name: string;
  faculty?: string;
  catedra?: string;
  preparacion?: {
    temas: string[];
    fechaParcial: string;
    plan?: PlanPreparacion;
    updatedAt: string;
  };
  createdAt: string;
}

export interface Material {
  id: string;
  materiaId: string;
  name: string;
  type: string;
  size: number;
  storageKey: string;
  addedAt: string;
  contentBase64?: string;
  kind?: "apuntes" | "examen";
  examId?: string;
  fileId?: string;
  lectura?: LecturaArchivo;
}

export type LecturaEstado =
  | "subiendo"
  | "leyendo"
  | "lista"
  | "parcial"
  | "sin-texto"
  | "no-aplica";

export interface LecturaArchivo {
  estado: LecturaEstado;
  paginasLeidas: number;
  paginasTotales: number;
}

export type EvaluacionKind = "examen" | "entrega";

export interface ExamenEnPreparacion {
  id: string;
  materiaId: string;
  kind?: EvaluacionKind;
  description?: string;
  type?: ExamType;
  date?: string;
  name?: string;
  objective?: string;
  modality?: string;
  createdAt: string;
  materialId?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  note?: string;
  fileContentBase64?: string;
  fileId?: string;
  lectura?: LecturaArchivo;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  materiaId?: string;
  chatSessionId?: string;
  citations?: string[];
  isError?: boolean;
}

export interface ChatSession {
  id: string;
  materiaId: string;
  examenId?: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export type StudySourceKind = "apunte" | "examen" | "nota" | "generado";

export type StudyExamSummary = {
  name: string;
  typeLabel: string;
  date: string;
  objective?: string;
  temas: string[];
};

export type GroundingPayload = {
  materiaId: string;
  materiaName: string;
  sourceCount: number;
  readableCount: number;
  sources: {
    name: string;
    kind: StudySourceKind;
    readable: boolean;
    materialId?: string;
    notaId?: string;
    lectura?: LecturaArchivo;
  }[];
  exams: StudyExamSummary[];
};

export interface Tema {
  id: string;
  examenId: string;
  name: string;
  masteryState: MasteryState;
  createdAt: string;
}

export type PracticeOutcome = "lo_tengo" | "todavia_no";

export const MASTERY_LABELS: Record<MasteryState, string> = {
  no_estudiado: "No estudiado",
  empezado: "Empezado",
  estudiado: "Estudiado",
  necesita_practica: "Necesita práctica",
  dominado: "Dominado",
};

export const MASTERY_ORDER: MasteryState[] = [
  "no_estudiado",
  "empezado",
  "estudiado",
  "necesita_practica",
  "dominado",
];

export interface Nota {
  id: string;
  materiaId: string;
  titulo: string;
  contenido: string;
  createdAt: string;
  updatedAt: string;
}

export type ArtefactoTipo = "examen" | "documento";

export interface Artefacto {
  id: string;
  materiaId: string;
  sessionId?: string;
  tipo: ArtefactoTipo;
  titulo: string;
  contenido: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ArtefactoVersion {
  version: number;
  titulo: string;
  contenido: string;
  createdAt: string;
}

export type WorkspaceFocus = {
  kind: "nota" | "artefacto" | "material" | "examen";
  id: string;
};
