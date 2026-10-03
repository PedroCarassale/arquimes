import { v4 as uuid } from "uuid";
import {
  Materia,
  Material,
  ExamenEnPreparacion,
  Tema,
  MasteryState,
  GroundingPayload,
  PracticeOutcome,
  PlanPreparacion,
} from "./types";
import {
  groundingFromContext,
  sourcesFromExamen,
  sourcesFromMateriales,
  summarizeExamen,
  type StudyContext,
} from "./study-chat";
import { nextMasteryFromPractice } from "./practice";
import {
  deleteStudyFileByStorageKey,
  getStudyFileMetaByStorageKeys,
  parseStorageKey,
} from "./file-store-auth";
import { getLibsqlClient } from "./libsql";
import { requireUserId } from "./auth-session";

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
    })();
  }

  await schemaReady;
}

function toMateria(row: SqlRow): Materia {
  const preparacionRaw =
    typeof row.preparacion_json === "string" ? row.preparacion_json : "";
  let preparacion: Materia["preparacion"] | undefined;
  if (preparacionRaw) {
    try {
      preparacion = JSON.parse(preparacionRaw) as Materia["preparacion"];
    } catch {
      preparacion = undefined;
    }
  }
  return {
    id: String(row.id),
    name: String(row.name),
    faculty: row.faculty ? String(row.faculty) : undefined,
    catedra: row.catedra ? String(row.catedra) : undefined,
    preparacion,
    createdAt: String(row.created_at),
  };
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
    type: row.type ? (String(row.type) as ExamenEnPreparacion["type"]) : undefined,
    date: row.date ? String(row.date) : undefined,
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
    masteryState: String(row.mastery_state) as MasteryState,
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
    sql: `SELECT id, name, faculty, catedra, preparacion_json, created_at
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
    sql: `SELECT id, name, faculty, catedra, preparacion_json, created_at
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

export async function updateMateriaPreparacion(
  id: string,
  input: {
    temas: string[];
    fechaParcial: string;
    resetPlan?: boolean;
  }
): Promise<Materia | undefined> {
  await ensureSchema();
  const userId = await requireUserId();
  const materia = await queryMateriaById(userId, id);
  if (!materia) return undefined;

  const updatedAt = new Date().toISOString();
  const preparacion: Materia["preparacion"] = {
    temas: input.temas,
    fechaParcial: input.fechaParcial,
    plan: input.resetPlan === false ? materia.preparacion?.plan : undefined,
    updatedAt,
  };
  const db = getLibsqlClient();
  await db.execute({
    sql: `UPDATE materias
          SET preparacion_json = ?
          WHERE user_id = ? AND id = ?`,
    args: [JSON.stringify(preparacion), userId, id],
  });

  return {
    ...materia,
    preparacion,
  };
}

export async function saveMateriaPlanPreparacion(
  id: string,
  plan: PlanPreparacion
): Promise<Materia | undefined> {
  await ensureSchema();
  const userId = await requireUserId();
  const materia = await queryMateriaById(userId, id);
  if (!materia) return undefined;

  const updatedAt = new Date().toISOString();
  const preparacion: Materia["preparacion"] = {
    temas: materia.preparacion?.temas || [],
    fechaParcial: materia.preparacion?.fechaParcial || "",
    plan,
    updatedAt,
  };
  const db = getLibsqlClient();
  await db.execute({
    sql: `UPDATE materias
          SET preparacion_json = ?
          WHERE user_id = ? AND id = ?`,
    args: [JSON.stringify(preparacion), userId, id],
  });
  return {
    ...materia,
    preparacion,
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
    sql: `SELECT storage_key FROM materiales WHERE user_id = ? AND id = ?`,
    args: [userId, id],
  });
  const storageKey = row.rows[0]?.storage_key
    ? String(row.rows[0].storage_key)
    : undefined;
  await db.execute({
    sql: `DELETE FROM materiales WHERE user_id = ? AND id = ?`,
    args: [userId, id],
  });
  await deleteStudyFileByStorageKey(storageKey);
}

export async function getExamenes(
  materiaId: string
): Promise<ExamenEnPreparacion[]> {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getLibsqlClient();
  const result = await db.execute({
    sql: `SELECT id, materia_id, type, date, name, objective, modality, created_at, material_id, file_name, file_type, file_size, note, file_content_base64
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
    sql: `SELECT id, materia_id, type, date, name, objective, modality, created_at, material_id, file_name, file_type, file_size, note, file_content_base64
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
  if (examen.materialId) {
    await deleteMaterial(examen.materialId);
  }
  await db.batch(
    [
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
    sql: `SELECT id, examen_id, name, mastery_state, created_at
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
  const masteryState: MasteryState = "no_estudiado";
  await db.execute({
    sql: `INSERT INTO temas (id, user_id, examen_id, name, mastery_state, created_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, userId, examenId, name, masteryState, createdAt],
  });
  return { id, examenId, name, masteryState, createdAt };
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
    sql: `SELECT t.id, t.examen_id, t.name, t.mastery_state, t.created_at
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

  const [materiales, examenes, temas] = await Promise.all([
    queryAllMaterialesForMateria(userId, materiaId),
    getExamenes(materiaId),
    getTemasForMateria(materiaId),
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
  const sources = [...materialSources, ...examLegacySources];

  return {
    materiaId,
    materiaName: materia.name,
    sources,
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

export async function updateTemaMastery(
  id: string,
  masteryState: MasteryState
): Promise<void> {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getLibsqlClient();
  await db.execute({
    sql: `UPDATE temas
          SET mastery_state = ?
          WHERE user_id = ? AND id = ?`,
    args: [masteryState, userId, id],
  });
}

export async function applyPracticeOutcome(
  temaId: string,
  materiaId: string,
  outcome: PracticeOutcome
): Promise<{ tema: Tema; previous: MasteryState } | undefined> {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getLibsqlClient();

  const temaResult = await db.execute({
    sql: `SELECT id, examen_id, name, mastery_state, created_at
          FROM temas
          WHERE user_id = ? AND id = ?`,
    args: [userId, temaId],
  });
  const temaRow = temaResult.rows[0] as SqlRow | undefined;
  if (!temaRow) return undefined;
  const tema = toTema(temaRow);

  const examen = await db.execute({
    sql: `SELECT id FROM examenes
          WHERE user_id = ? AND id = ? AND materia_id = ?`,
    args: [userId, tema.examenId, materiaId],
  });
  if (!examen.rows[0]) return undefined;

  const previous = tema.masteryState;
  const next = nextMasteryFromPractice(previous, outcome);
  await db.execute({
    sql: `UPDATE temas
          SET mastery_state = ?
          WHERE user_id = ? AND id = ?`,
    args: [next, userId, temaId],
  });

  return {
    tema: {
      ...tema,
      masteryState: next,
    },
    previous,
  };
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
