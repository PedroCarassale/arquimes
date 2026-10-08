import { v4 as uuid } from "uuid";
import {
  Materia,
  Material,
  ExamenEnPreparacion,
  EvaluacionKind,
  EventoResumen,
  ExamType,
  Tema,
  GroundingPayload,
} from "./types";
import {
  groundingFromContext,
  sourcesFromExamen,
  sourcesFromMateriales,
  summarizeExamen,
  type StudyContext,
} from "./study-chat";
import {
  deleteStudyFileByStorageKey,
  getStudyFileLecturasByStorageKeys,
  getStudyFileMetaByStorageKeys,
  parseStorageKey,
} from "./file-store-auth";
import { examTypeLabel } from "./format";
import { getLibsqlClient } from "./libsql";
import { requireUserId } from "./auth-session";
import { deleteChatSessionsForMateria } from "./chat-store-auth";
import {
  deleteWorkspaceForMateria,
  listArtefactos,
  listNotas,
} from "./workspace-store";

let schemaReady: Promise<void> | null = null;

type SqlRow = Record<string, unknown>;

async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const db = getLibsqlClient();
      await db.batch(
        [
          `CREATE TABLE IF NOT EXISTS materias (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            faculty TEXT,
            catedra TEXT,
            preparacion_json TEXT,
            created_at TEXT NOT NULL
          );`,
          `CREATE INDEX IF NOT EXISTS idx_materias_user_created
            ON materias (user_id, created_at DESC);`,
          `CREATE TABLE IF NOT EXISTS materiales (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            materia_id TEXT NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            size INTEGER NOT NULL,
            storage_key TEXT NOT NULL,
            added_at TEXT NOT NULL,
            content_base64 TEXT,
            kind TEXT,
            exam_id TEXT
          );`,
          `CREATE INDEX IF NOT EXISTS idx_materiales_user_materia_added
            ON materiales (user_id, materia_id, added_at DESC);`,
          `CREATE INDEX IF NOT EXISTS idx_materiales_user_exam
            ON materiales (user_id, exam_id);`,
          `CREATE TABLE IF NOT EXISTS examenes (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            materia_id TEXT NOT NULL,
            type TEXT,
            date TEXT,
            name TEXT,
            objective TEXT,
            modality TEXT,
            created_at TEXT NOT NULL,
            material_id TEXT,
            file_name TEXT,
            file_type TEXT,
            file_size INTEGER,
            note TEXT,
            file_content_base64 TEXT
          );`,
          `CREATE INDEX IF NOT EXISTS idx_examenes_user_materia_created
            ON examenes (user_id, materia_id, created_at DESC);`,
          `CREATE TABLE IF NOT EXISTS temas (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            examen_id TEXT NOT NULL,
            name TEXT NOT NULL,
            mastery_state TEXT NOT NULL,
            created_at TEXT NOT NULL
          );`,
          `CREATE INDEX IF NOT EXISTS idx_temas_user_examen_created
            ON temas (user_id, examen_id, created_at ASC);`,
        ],
        "write"
      );
      const columns = await db.execute("PRAGMA table_info(examenes)");
      const names = new Set(columns.rows.map((row) => String(row.name)));
      for (const column of ["kind", "description", "hora"]) {
        if (names.has(column)) continue;
        try {
          await db.execute(`ALTER TABLE examenes ADD COLUMN ${column} TEXT`);
        } catch (error) {
          if (!(error instanceof Error && /duplicate column/i.test(error.message))) {
            throw error;
          }
        }
      }
      await db.execute(
        "CREATE INDEX IF NOT EXISTS idx_examenes_user_date ON examenes (user_id, date)"
      );
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }

  await schemaReady;
}

function toMateria(row: SqlRow): Materia {
  return {
    id: String(row.id),
    name: String(row.name),
    faculty: row.faculty ? String(row.faculty) : undefined,
    catedra: row.catedra ? String(row.catedra) : undefined,
    createdAt: String(row.created_at),
  };
}

function toEvaluacionKind(value: unknown): EvaluacionKind {
  return value === "entrega" ? "entrega" : value === "evento" ? "evento" : "examen";
}

function toExamType(value: unknown): ExamType | undefined {
  return value === "parcial" || value === "recuperatorio" || value === "final"
    ? value
    : undefined;
}

function toMaterial(row: SqlRow): Material {
  return {
    id: String(row.id),
    materiaId: String(row.materia_id),
    name: String(row.name),
    type: String(row.type),
    size: Number(row.size),
    storageKey: String(row.storage_key),
    addedAt: String(row.added_at),
    contentBase64: row.content_base64 ? String(row.content_base64) : undefined,
    kind: row.kind ? (String(row.kind) as Material["kind"]) : undefined,
    examId: row.exam_id ? String(row.exam_id) : undefined,
  };
}

function toExamen(row: SqlRow): ExamenEnPreparacion {
  return {
    id: String(row.id),
    materiaId: String(row.materia_id),
    kind: toEvaluacionKind(row.kind),
    description: row.description ? String(row.description) : undefined,
    type: toExamType(row.type),
    date: row.date ? String(row.date) : undefined,
    hora: row.hora ? String(row.hora) : undefined,
    name: row.name ? String(row.name) : undefined,
    objective: row.objective ? String(row.objective) : undefined,
    modality: row.modality ? String(row.modality) : undefined,
    createdAt: String(row.created_at),
    materialId: row.material_id ? String(row.material_id) : undefined,
    fileName: row.file_name ? String(row.file_name) : undefined,
    fileType: row.file_type ? String(row.file_type) : undefined,
    fileSize:
      typeof row.file_size === "number" || typeof row.file_size === "bigint"
        ? Number(row.file_size)
        : undefined,
    note: row.note ? String(row.note) : undefined,
    fileContentBase64: row.file_content_base64
      ? String(row.file_content_base64)
      : undefined,
  };
}

function toTema(row: SqlRow): Tema {
  return {
    id: String(row.id),
    examenId: String(row.examen_id),
    name: String(row.name),
    createdAt: String(row.created_at),
  };
}

async function queryMateriaById(
  userId: string,
  id: string
): Promise<Materia | undefined> {
  await ensureSchema();
  const db = getLibsqlClient();
  const result = await db.execute({
    sql: `SELECT id, name, faculty, catedra, created_at
          FROM materias
          WHERE user_id = ? AND id = ?`,
    args: [userId, id],
  });
  const row = result.rows[0] as SqlRow | undefined;
  return row ? toMateria(row) : undefined;
}

async function queryAllMaterialesForMateria(
  userId: string,
  materiaId: string
): Promise<Material[]> {
  await ensureSchema();
  const db = getLibsqlClient();
  const result = await db.execute({
    sql: `SELECT id, materia_id, name, type, size, storage_key, added_at, content_base64, kind, exam_id
          FROM materiales
          WHERE user_id = ? AND materia_id = ?
          ORDER BY datetime(added_at) DESC`,
    args: [userId, materiaId],
  });
  return result.rows.map((row) => toMaterial(row as SqlRow));
}

export async function getMaterias(): Promise<Materia[]> {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getLibsqlClient();
  const result = await db.execute({
    sql: `SELECT id, name, faculty, catedra, created_at
          FROM materias
          WHERE user_id = ?
          ORDER BY datetime(created_at) DESC`,
    args: [userId],
  });
  return result.rows.map((row) => toMateria(row as SqlRow));
}

export async function getMateria(id: string): Promise<Materia | undefined> {
  const userId = await requireUserId();
  return queryMateriaById(userId, id);
}

export async function createMateria(
  id: string,
  name: string,
  faculty?: string,
  catedra?: string
): Promise<Materia> {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getLibsqlClient();
  const createdAt = new Date().toISOString();
  await db.execute({
    sql: `INSERT INTO materias (
      id, user_id, name, faculty, catedra, preparacion_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      userId,
      name,
      faculty || null,
      catedra || null,
      null,
      createdAt,
    ],
  });
  return {
    id,
    name,
    faculty,
    catedra,
    createdAt,
  };
}

export async function deleteMateria(id: string): Promise<void> {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getLibsqlClient();
  const materialRows = await db.execute({
    sql: `SELECT storage_key FROM materiales WHERE user_id = ? AND materia_id = ?`,
    args: [userId, id],
  });
  const storageKeys = materialRows.rows
    .map((row) => (row.storage_key ? String(row.storage_key) : ""))
    .filter(Boolean);

  const examenRows = await db.execute({
    sql: `SELECT id FROM examenes WHERE user_id = ? AND materia_id = ?`,
    args: [userId, id],
  });
  const examenIds = examenRows.rows.map((row) => String(row.id));

  if (examenIds.length > 0) {
    const placeholders = examenIds.map(() => "?").join(", ");
    await db.execute({
      sql: `DELETE FROM temas
            WHERE user_id = ? AND examen_id IN (${placeholders})`,
      args: [userId, ...examenIds],
    });
  }

  await db.batch(
    [
      {
        sql: `DELETE FROM examenes WHERE user_id = ? AND materia_id = ?`,
        args: [userId, id],
      },
      {
        sql: `DELETE FROM materiales WHERE user_id = ? AND materia_id = ?`,
        args: [userId, id],
      },
      {
        sql: `DELETE FROM materias WHERE user_id = ? AND id = ?`,
        args: [userId, id],
      },
    ],
    "write"
  );

  await deleteWorkspaceForMateria(id);
  await deleteChatSessionsForMateria(id);

  await Promise.all(
    [...new Set(storageKeys)].map((storageKey) =>
      deleteStudyFileByStorageKey(storageKey)
    )
  );
}

export async function getMateriales(materiaId: string): Promise<Material[]> {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getLibsqlClient();
  const result = await db.execute({
    sql: `SELECT id, materia_id, name, type, size, storage_key, added_at, content_base64, kind, exam_id
          FROM materiales
          WHERE user_id = ? AND materia_id = ?
            AND (kind IS NULL OR kind != 'examen')
          ORDER BY datetime(added_at) DESC`,
    args: [userId, materiaId],
  });
  return result.rows.map((row) => toMaterial(row as SqlRow));
}

export async function listMaterialesConLectura(materiaId: string): Promise<Material[]> {
  await ensureSchema();
  const userId = await requireUserId();
  const result = await getLibsqlClient().execute({
    sql: `SELECT id, materia_id, name, type, size, storage_key, added_at, kind, exam_id
          FROM materiales
          WHERE user_id = ? AND materia_id = ?
          ORDER BY datetime(added_at) DESC`,
    args: [userId, materiaId],
  });
  const materiales = result.rows.map((row) => toMaterial(row as SqlRow));
  const lecturas = await getStudyFileLecturasByStorageKeys(
    materiales.map((m) => m.storageKey).filter(Boolean)
  );
  return materiales.map((material) => ({
    ...material,
    fileId: parseStorageKey(material.storageKey) || undefined,
    lectura: lecturas.get(material.storageKey),
  }));
}

export async function withLectura(materiales: Material[]): Promise<Material[]> {
  const meta = await getStudyFileMetaByStorageKeys(
    materiales.map((m) => m.storageKey).filter(Boolean)
  );
  return materiales.map((material) => ({
    ...material,
    fileId: parseStorageKey(material.storageKey) || undefined,
    lectura: meta.get(material.storageKey)?.lectura,
  }));
}

export async function getExamenesConLectura(
  materiaId: string
): Promise<ExamenEnPreparacion[]> {
  const examenes = await getExamenes(materiaId);
  const userId = await requireUserId();
  const materialIds = examenes
    .map((examen) => examen.materialId)
    .filter((id): id is string => Boolean(id));
  if (materialIds.length === 0) return examenes;
  const placeholders = materialIds.map(() => "?").join(", ");
  const result = await getLibsqlClient().execute({
    sql: `SELECT id, materia_id, name, type, size, storage_key, added_at, content_base64, kind, exam_id
          FROM materiales WHERE user_id = ? AND id IN (${placeholders})`,
    args: [userId, ...materialIds],
  });
  const materiales = await withLectura(
    result.rows.map((row) => toMaterial(row as SqlRow))
  );
  const byId = new Map(materiales.map((material) => [material.id, material]));
  return examenes.map((examen) => {
    const material = examen.materialId ? byId.get(examen.materialId) : undefined;
    return material
      ? { ...examen, fileId: material.fileId, lectura: material.lectura }
      : examen;
  });
}

export async function getMaterial(id: string): Promise<Material | undefined> {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getLibsqlClient();
  const result = await db.execute({
    sql: `SELECT id, materia_id, name, type, size, storage_key, added_at, content_base64, kind, exam_id
          FROM materiales
          WHERE user_id = ? AND id = ?`,
    args: [userId, id],
  });
  const row = result.rows[0] as SqlRow | undefined;
  return row ? toMaterial(row) : undefined;
}

export function materialHasContent(material: Material): boolean {
  return Boolean(
    material.contentBase64 || material.storageKey?.startsWith("libsql:")
  );
}

export async function createMaterial(
  id: string,
  materiaId: string,
  name: string,
  type: string,
  size: number,
  storageKey: string,
  contentBase64?: string,
  kind: Material["kind"] = "apuntes"
): Promise<Material> {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getLibsqlClient();
  const addedAt = new Date().toISOString();
  await db.execute({
    sql: `INSERT INTO materiales (
      id, user_id, materia_id, name, type, size, storage_key, added_at, content_base64, kind, exam_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      userId,
      materiaId,
      name,
      type,
      size,
      storageKey,
      addedAt,
      contentBase64 || null,
      kind || null,
      null,
    ],
  });
  return {
    id,
    materiaId,
    name,
    type,
    size,
    storageKey,
    addedAt,
    contentBase64,
    kind,
  };
}

export async function deleteMaterial(id: string): Promise<void> {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getLibsqlClient();
  const row = await db.execute({
    sql: `SELECT storage_key, kind, exam_id FROM materiales WHERE user_id = ? AND id = ?`,
    args: [userId, id],
  });
  const current = row.rows[0] as SqlRow | undefined;
  if (!current) return;
  const storageKey = current.storage_key ? String(current.storage_key) : undefined;
  const statements = [
    {
      sql: `DELETE FROM materiales WHERE user_id = ? AND id = ?`,
      args: [userId, id],
    },
  ];
  if (current.kind === "examen") {
    statements.push({
      sql: `UPDATE examenes
            SET material_id = NULL, file_name = NULL, file_type = NULL, file_size = NULL, file_content_base64 = NULL
            WHERE user_id = ? AND (material_id = ?${current.exam_id ? " OR id = ?" : ""})`,
      args: current.exam_id ? [userId, id, String(current.exam_id)] : [userId, id],
    });
  }
  await db.batch(statements, "write");
  await deleteStudyFileByStorageKey(storageKey);
}

export async function getExamenes(
  materiaId: string
): Promise<ExamenEnPreparacion[]> {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getLibsqlClient();
  const result = await db.execute({
    sql: `SELECT id, materia_id, kind, description, type, date, hora, name, objective, modality, created_at, material_id, file_name, file_type, file_size, note, file_content_base64
          FROM examenes
          WHERE user_id = ? AND materia_id = ?
          ORDER BY datetime(created_at) DESC`,
    args: [userId, materiaId],
  });
  return result.rows.map((row) => toExamen(row as SqlRow));
}

export async function getExamen(
  id: string
): Promise<ExamenEnPreparacion | undefined> {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getLibsqlClient();
  const result = await db.execute({
    sql: `SELECT id, materia_id, kind, description, type, date, hora, name, objective, modality, created_at, material_id, file_name, file_type, file_size, note, file_content_base64
          FROM examenes
          WHERE user_id = ? AND id = ?`,
    args: [userId, id],
  });
  const row = result.rows[0] as SqlRow | undefined;
  return row ? toExamen(row) : undefined;
}

export async function createExamenWithFile(
  id: string,
  materiaId: string,
  data: {
    name?: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    contentBase64?: string;
    storageKey?: string;
  }
): Promise<ExamenEnPreparacion> {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getLibsqlClient();
  const createdAt = new Date().toISOString();
  const materialId = uuid();
  const storageKey = data.storageKey || `session:${materialId}`;

  await db.batch(
    [
      {
        sql: `INSERT INTO materiales (
          id, user_id, materia_id, name, type, size, storage_key, added_at, content_base64, kind, exam_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          materialId,
          userId,
          materiaId,
          data.fileName,
          data.fileType,
          data.fileSize,
          storageKey,
          createdAt,
          data.contentBase64 || null,
          "examen",
          id,
        ],
      },
      {
        sql: `INSERT INTO examenes (
          id, user_id, materia_id, type, date, name, objective, modality, created_at, material_id, file_name, file_type, file_size, note, file_content_base64
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          userId,
          materiaId,
          null,
          null,
          data.name || null,
          null,
          null,
          createdAt,
          materialId,
          data.fileName,
          data.fileType,
          data.fileSize,
          data.name || null,
          null,
        ],
      },
    ],
    "write"
  );

  return {
    id,
    materiaId,
    name: data.name,
    createdAt,
    materialId,
    fileName: data.fileName,
    fileType: data.fileType,
    fileSize: data.fileSize,
    note: data.name,
  };
}

export type EvaluacionInput = {
  kind: EvaluacionKind;
  name: string;
  type?: ExamenEnPreparacion["type"];
  date?: string;
  hora?: string;
  description?: string;
};

export async function createEvaluacion(
  materiaId: string,
  input: EvaluacionInput
): Promise<ExamenEnPreparacion> {
  await ensureSchema();
  const userId = await requireUserId();
  const id = uuid();
  const createdAt = new Date().toISOString();
  const type = input.kind === "examen" ? input.type || undefined : undefined;
  await getLibsqlClient().execute({
    sql: `INSERT INTO examenes (
      id, user_id, materia_id, kind, description, type, date, hora, name, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      userId,
      materiaId,
      input.kind,
      input.description || null,
      type || null,
      input.date || null,
      input.hora || null,
      input.name,
      createdAt,
    ],
  });
  return {
    id,
    materiaId,
    kind: input.kind,
    description: input.description || undefined,
    type,
    date: input.date || undefined,
    hora: input.hora || undefined,
    name: input.name,
    createdAt,
  };
}

export async function updateEvaluacion(
  id: string,
  input: Partial<Omit<EvaluacionInput, "type">> & { type?: EvaluacionInput["type"] | null }
): Promise<ExamenEnPreparacion | undefined> {
  await ensureSchema();
  const userId = await requireUserId();
  const fields: string[] = [];
  const args: (string | null)[] = [];
  const set = (column: string, value: string | null | undefined) => {
    fields.push(`${column} = ?`);
    args.push(value?.trim() ? value.trim() : null);
  };
  if (input.kind !== undefined) set("kind", input.kind);
  if (input.name !== undefined) set("name", input.name);
  if (input.kind !== undefined && input.kind !== "examen") set("type", null);
  else if (input.type !== undefined) set("type", input.type);
  if (input.date !== undefined) set("date", input.date);
  if (input.hora !== undefined) set("hora", input.hora);
  if (input.description !== undefined) set("description", input.description);
  if (fields.length > 0) {
    await getLibsqlClient().execute({
      sql: `UPDATE examenes SET ${fields.join(", ")} WHERE user_id = ? AND id = ?`,
      args: [...args, userId, id],
    });
  }
  return getExamen(id);
}

export async function updateExamenNote(
  id: string,
  name: string | undefined
): Promise<ExamenEnPreparacion | undefined> {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getLibsqlClient();
  await db.execute({
    sql: `UPDATE examenes
          SET name = ?, note = ?
          WHERE user_id = ? AND id = ?`,
    args: [name || null, name || null, userId, id],
  });
  return getExamen(id);
}

export async function deleteExamen(id: string): Promise<void> {
  await ensureSchema();
  const examen = await getExamen(id);
  if (!examen) return;

  const userId = await requireUserId();
  const db = getLibsqlClient();
  await db.batch(
    [
      {
        sql: `UPDATE materiales SET kind = NULL, exam_id = NULL
              WHERE user_id = ? AND (exam_id = ? OR id = ?)`,
        args: [userId, id, examen.materialId ?? null],
      },
      {
        sql: `DELETE FROM temas WHERE user_id = ? AND examen_id = ?`,
        args: [userId, id],
      },
      {
        sql: `DELETE FROM examenes WHERE user_id = ? AND id = ?`,
        args: [userId, id],
      },
    ],
    "write"
  );
}

export async function getTemas(examenId: string): Promise<Tema[]> {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getLibsqlClient();
  const result = await db.execute({
    sql: `SELECT id, examen_id, name, created_at
          FROM temas
          WHERE user_id = ? AND examen_id = ?
          ORDER BY datetime(created_at) ASC`,
    args: [userId, examenId],
  });
  return result.rows.map((row) => toTema(row as SqlRow));
}

export async function createTema(
  id: string,
  examenId: string,
  name: string
): Promise<Tema> {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getLibsqlClient();
  const createdAt = new Date().toISOString();
  await db.execute({
    sql: `INSERT INTO temas (id, user_id, examen_id, name, mastery_state, created_at)
          VALUES (?, ?, ?, ?, 'no_estudiado', ?)`,
    args: [id, userId, examenId, name, createdAt],
  });
  return { id, examenId, name, createdAt };
}

export async function getTemaNamesForMateria(
  materiaId: string
): Promise<string[]> {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getLibsqlClient();
  const result = await db.execute({
    sql: `SELECT DISTINCT t.name
          FROM temas t
          INNER JOIN examenes e
            ON e.id = t.examen_id
           AND e.user_id = t.user_id
          WHERE e.user_id = ? AND e.materia_id = ?`,
    args: [userId, materiaId],
  });
  return result.rows.map((row) => String(row.name));
}

export async function getTemasForMateria(materiaId: string): Promise<Tema[]> {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getLibsqlClient();
  const result = await db.execute({
    sql: `SELECT t.id, t.examen_id, t.name, t.created_at
          FROM temas t
          INNER JOIN examenes e
            ON e.id = t.examen_id
           AND e.user_id = t.user_id
          WHERE e.user_id = ? AND e.materia_id = ?
          ORDER BY datetime(t.created_at) ASC`,
    args: [userId, materiaId],
  });
  return result.rows.map((row) => toTema(row as SqlRow));
}

export async function getStudyContext(
  materiaId: string
): Promise<StudyContext | null> {
  await ensureSchema();
  const userId = await requireUserId();
  const materia = await queryMateriaById(userId, materiaId);
  if (!materia) return null;

  const [materiales, examenes, temas, notas, artefactos] = await Promise.all([
    queryAllMaterialesForMateria(userId, materiaId),
    getExamenes(materiaId),
    getTemasForMateria(materiaId),
    listNotas(materiaId),
    listArtefactos(materiaId),
  ]);
  const fileMetaByStorageKey = await getStudyFileMetaByStorageKeys(
    materiales.map((m) => m.storageKey).filter(Boolean)
  );
  const examLegacySources = (
    await Promise.all(examenes.map((examen) => sourcesFromExamen(examen)))
  ).flat();
  const materialSources = await sourcesFromMateriales(
    materiales,
    fileMetaByStorageKey
  );
  const notaSources = notas
    .filter((nota) => nota.contenido.trim())
    .map((nota) => ({
      name: `Clase · ${nota.titulo || "Sin título"}`,
      kind: "nota" as const,
      text: nota.contenido,
      notaId: nota.id,
    }));
  const sources = [...notaSources, ...materialSources, ...examLegacySources];

  return {
    materiaId,
    materiaName: materia.name,
    sources,
    artefactos: artefactos.map((artefacto) => ({
      id: artefacto.id,
      tipo: artefacto.tipo,
      titulo: artefacto.titulo,
      version: artefacto.version,
      contenido: artefacto.contenido,
    })),
    exams: examenes.map((examen) =>
      summarizeExamen(
        examen,
        temas.filter((t) => t.examenId === examen.id)
      )
    ),
  };
}

export async function getStudyGrounding(
  materiaId: string
): Promise<GroundingPayload | null> {
  const ctx = await getStudyContext(materiaId);
  return ctx ? groundingFromContext(ctx) : null;
}

export async function listEventos(
  opts: {
    desde?: string;
    hasta?: string;
    materiaId?: string;
    incluirSinFecha?: boolean;
  } = {}
): Promise<EventoResumen[]> {
  await ensureSchema();
  const userId = await requireUserId();
  const where = ["e.user_id = ?"];
  const args: string[] = [userId];
  if (opts.materiaId) {
    where.push("e.materia_id = ?");
    args.push(opts.materiaId);
  }
  const conFecha = ["COALESCE(e.date, '') != ''"];
  if (opts.desde) {
    conFecha.push("e.date >= ?");
    args.push(opts.desde);
  }
  if (opts.hasta) {
    conFecha.push("e.date <= ?");
    args.push(opts.hasta);
  }
  const fecha = `(${conFecha.join(" AND ")})`;
  where.push(opts.incluirSinFecha ? `(${fecha} OR COALESCE(e.date, '') = '')` : fecha);

  const result = await getLibsqlClient().execute({
    sql: `SELECT e.id, e.materia_id, m.name AS materia_name, e.kind, e.type, e.name, e.file_name,
                 e.date, e.hora, e.created_at, COUNT(t.id) AS temas_count
          FROM examenes e
          INNER JOIN materias m
            ON m.id = e.materia_id
           AND m.user_id = e.user_id
          LEFT JOIN temas t
            ON t.examen_id = e.id
           AND t.user_id = e.user_id
          WHERE ${where.join(" AND ")}
          GROUP BY e.id
          ORDER BY COALESCE(e.date, '') = '' ASC,
                   e.date ASC,
                   COALESCE(e.hora, '') = '' ASC,
                   e.hora ASC,
                   e.created_at ASC`,
    args,
  });

  return result.rows.map((raw) => {
    const row = raw as SqlRow;
    const kind = toEvaluacionKind(row.kind);
    const type = kind === "examen" ? toExamType(row.type) : undefined;
    const name =
      (row.name ? String(row.name).trim() : "") ||
      (row.file_name ? String(row.file_name).trim() : "") ||
      (kind === "entrega" ? "Entrega" : kind === "evento" ? "Evento" : examTypeLabel(type));
    return {
      id: String(row.id),
      materiaId: String(row.materia_id),
      materiaName: String(row.materia_name),
      kind,
      type,
      name,
      date: row.date ? String(row.date) : undefined,
      hora: row.hora ? String(row.hora) : undefined,
      temasCount: Number(row.temas_count) || 0,
    };
  });
}

export async function deleteTema(id: string): Promise<void> {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getLibsqlClient();
  await db.execute({
    sql: `DELETE FROM temas WHERE user_id = ? AND id = ?`,
    args: [userId, id],
  });
}
