export type MasteryState =
  | "no_estudiado"
  | "empezado"
  | "estudiado"
  | "necesita_practica"
  | "dominado";

export type ExamType = "parcial" | "final";

export interface Materia {
  id: string;
  name: string;
  faculty?: string;
  catedra?: string;
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
}

export interface ExamenEnPreparacion {
  id: string;
  materiaId: string;
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

export type StudySourceKind = "apunte" | "examen";

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
  sources: { name: string; kind: StudySourceKind; readable: boolean }[];
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
