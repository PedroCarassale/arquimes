import Database from "better-sqlite3";
import path from "path";
import {
  Materia,
  Material,
  ExamenEnPreparacion,
  Tema,
  MasteryState,
  ExamType,
} from "./types";

const DB_PATH = path.join(process.cwd(), "data", "arquimes.db");

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    initSchema();
  }
  return db;
}

function initSchema() {
  const database = db!;

  database.exec(`
    CREATE TABLE IF NOT EXISTS materias (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      faculty TEXT,
      catedra TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS materiales (
      id TEXT PRIMARY KEY,
      materiaId TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      size INTEGER NOT NULL,
      storageKey TEXT NOT NULL,
      addedAt TEXT NOT NULL,
      FOREIGN KEY (materiaId) REFERENCES materias(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS examenes (
      id TEXT PRIMARY KEY,
      materiaId TEXT NOT NULL,
      type TEXT NOT NULL,
      date TEXT NOT NULL,
      modality TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (materiaId) REFERENCES materias(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS temas (
      id TEXT PRIMARY KEY,
      examenId TEXT NOT NULL,
      name TEXT NOT NULL,
      masteryState TEXT NOT NULL DEFAULT 'no_estudiado',
      createdAt TEXT NOT NULL,
      FOREIGN KEY (examenId) REFERENCES examenes(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_materiales_materia ON materiales(materiaId);
    CREATE INDEX IF NOT EXISTS idx_examenes_materia ON examenes(materiaId);
    CREATE INDEX IF NOT EXISTS idx_temas_examen ON temas(examenId);
  `);
}

export function getMaterias(): Materia[] {
  return getDb()
    .prepare("SELECT * FROM materias ORDER BY createdAt DESC")
    .all() as Materia[];
}

export function getMateria(id: string): Materia | undefined {
  return getDb().prepare("SELECT * FROM materias WHERE id = ?").get(id) as
    | Materia
    | undefined;
}

export function createMateria(
  id: string,
  name: string,
  faculty?: string,
  catedra?: string
): Materia {
  const createdAt = new Date().toISOString();
  getDb()
    .prepare(
      "INSERT INTO materias (id, name, faculty, catedra, createdAt) VALUES (?, ?, ?, ?, ?)"
    )
    .run(id, name, faculty || null, catedra || null, createdAt);
  return { id, name, faculty, catedra, createdAt };
}

export function deleteMateria(id: string): void {
  getDb().prepare("DELETE FROM materias WHERE id = ?").run(id);
}

export function getMateriales(materiaId: string): Material[] {
  return getDb()
    .prepare("SELECT * FROM materiales WHERE materiaId = ? ORDER BY addedAt DESC")
    .all(materiaId) as Material[];
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
  getDb()
    .prepare(
      "INSERT INTO materiales (id, materiaId, name, type, size, storageKey, addedAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .run(id, materiaId, name, type, size, storageKey, addedAt);
  return { id, materiaId, name, type, size, storageKey, addedAt };
}

export function deleteMaterial(id: string): void {
  getDb().prepare("DELETE FROM materiales WHERE id = ?").run(id);
}

export function getExamenes(materiaId: string): ExamenEnPreparacion[] {
  return getDb()
    .prepare("SELECT * FROM examenes WHERE materiaId = ? ORDER BY date ASC")
    .all(materiaId) as ExamenEnPreparacion[];
}

export function getExamen(id: string): ExamenEnPreparacion | undefined {
  return getDb().prepare("SELECT * FROM examenes WHERE id = ?").get(id) as
    | ExamenEnPreparacion
    | undefined;
}

export function createExamen(
  id: string,
  materiaId: string,
  type: ExamType,
  date: string,
  modality?: string
): ExamenEnPreparacion {
  const createdAt = new Date().toISOString();
  getDb()
    .prepare(
      "INSERT INTO examenes (id, materiaId, type, date, modality, createdAt) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(id, materiaId, type, date, modality || null, createdAt);
  return { id, materiaId, type, date, modality, createdAt };
}

export function deleteExamen(id: string): void {
  getDb().prepare("DELETE FROM examenes WHERE id = ?").run(id);
}

export function getTemas(examenId: string): Tema[] {
  return getDb()
    .prepare("SELECT * FROM temas WHERE examenId = ? ORDER BY createdAt ASC")
    .all(examenId) as Tema[];
}

export function createTema(id: string, examenId: string, name: string): Tema {
  const createdAt = new Date().toISOString();
  const masteryState: MasteryState = "no_estudiado";
  getDb()
    .prepare(
      "INSERT INTO temas (id, examenId, name, masteryState, createdAt) VALUES (?, ?, ?, ?, ?)"
    )
    .run(id, examenId, name, masteryState, createdAt);
  return { id, examenId, name, masteryState, createdAt };
}

export function updateTemaMastery(id: string, masteryState: MasteryState): void {
  getDb()
    .prepare("UPDATE temas SET masteryState = ? WHERE id = ?")
    .run(masteryState, id);
}

export function deleteTema(id: string): void {
  getDb().prepare("DELETE FROM temas WHERE id = ?").run(id);
}
