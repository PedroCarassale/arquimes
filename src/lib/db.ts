import {
  Materia,
  Material,
  ExamenEnPreparacion,
  Tema,
  MasteryState,
  ExamType,
} from "./types";

const materias = new Map<string, Materia>();
const materiales = new Map<string, Material>();
const examenes = new Map<string, ExamenEnPreparacion>();
const temas = new Map<string, Tema>();

export function getMaterias(): Materia[] {
  return Array.from(materias.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getMateria(id: string): Materia | undefined {
  return materias.get(id);
}

export function createMateria(
  id: string,
  name: string,
  faculty?: string,
  catedra?: string
): Materia {
  const createdAt = new Date().toISOString();
  const materia: Materia = { id, name, faculty, catedra, createdAt };
  materias.set(id, materia);
  return materia;
}

export function deleteMateria(id: string): void {
  materias.delete(id);
  for (const [key, material] of materiales) {
    if (material.materiaId === id) {
      materiales.delete(key);
    }
  }
  for (const [key, examen] of examenes) {
    if (examen.materiaId === id) {
      for (const [temaKey, tema] of temas) {
        if (tema.examenId === key) {
          temas.delete(temaKey);
        }
      }
      examenes.delete(key);
    }
  }
}

export function getMateriales(materiaId: string): Material[] {
  return Array.from(materiales.values())
    .filter((m) => m.materiaId === materiaId)
    .sort(
      (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
    );
}

export function getMaterial(id: string): Material | undefined {
  return materiales.get(id);
}

export function createMaterial(
  id: string,
  materiaId: string,
  name: string,
  type: string,
  size: number,
  storageKey: string
): Material {
  const addedAt = new Date().toISOString();
  const material: Material = { id, materiaId, name, type, size, storageKey, addedAt };
  materiales.set(id, material);
  return material;
}

export function deleteMaterial(id: string): void {
  materiales.delete(id);
}

export function getExamenes(materiaId: string): ExamenEnPreparacion[] {
  return Array.from(examenes.values())
    .filter((e) => e.materiaId === materiaId)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function getExamen(id: string): ExamenEnPreparacion | undefined {
  return examenes.get(id);
}

export function createExamen(
  id: string,
  materiaId: string,
  type: ExamType,
  date: string,
  modality?: string
): ExamenEnPreparacion {
  const createdAt = new Date().toISOString();
  const examen: ExamenEnPreparacion = { id, materiaId, type, date, modality, createdAt };
  examenes.set(id, examen);
  return examen;
}

export function deleteExamen(id: string): void {
  examenes.delete(id);
  for (const [key, tema] of temas) {
    if (tema.examenId === id) {
      temas.delete(key);
    }
  }
}

export function getTemas(examenId: string): Tema[] {
  return Array.from(temas.values())
    .filter((t) => t.examenId === examenId)
    .sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
}

export function createTema(id: string, examenId: string, name: string): Tema {
  const createdAt = new Date().toISOString();
  const masteryState: MasteryState = "no_estudiado";
  const tema: Tema = { id, examenId, name, masteryState, createdAt };
  temas.set(id, tema);
  return tema;
}

export function updateTemaMastery(id: string, masteryState: MasteryState): void {
  const tema = temas.get(id);
  if (tema) {
    tema.masteryState = masteryState;
    temas.set(id, tema);
  }
}

export function deleteTema(id: string): void {
  temas.delete(id);
}
