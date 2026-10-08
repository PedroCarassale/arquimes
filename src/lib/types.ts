export type ExamType = "parcial" | "recuperatorio" | "final";

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

export type EvaluacionKind = "examen" | "entrega" | "evento";

export interface ExamenEnPreparacion {
  id: string;
  materiaId: string;
  kind?: EvaluacionKind;
  description?: string;
  type?: ExamType;
  date?: string;
  hora?: string;
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
  hora?: string;
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
  createdAt: string;
}

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

export type Evento = ExamenEnPreparacion;

export type EventoResumen = {
  id: string;
  materiaId: string;
  materiaName: string;
  kind: EvaluacionKind;
  type?: ExamType;
  name: string;
  date?: string;
  hora?: string;
  temasCount: number;
};

export type ApunteItem =
  | {
      origen: "archivo";
      id: string;
      name: string;
      type: string;
      size: number;
      addedAt: string;
      lectura?: LecturaArchivo;
      esExamen: boolean;
      examenId?: string;
      fileId?: string;
    }
  | {
      origen: "generado";
      id: string;
      titulo: string;
      tipo: ArtefactoTipo;
      version: number;
      createdAt: string;
      updatedAt: string;
    };

export type MateriaResumen = {
  materia: Materia;
  proximoEvento?: EventoResumen;
  clasesCount: number;
  apuntesCount: number;
};

export type MateriaIndice = {
  clases: { id: string; titulo: string; updatedAt: string }[];
  apuntes: ApunteItem[];
  eventos: EventoResumen[];
};

export type ArtefactoCreado = {
  id: string;
  titulo: string;
  tipo: ArtefactoTipo;
  version: number;
};
