import { v4 as uuid } from "uuid";
import { getLibsqlClient } from "./libsql";
import { requireUserId } from "./auth-session";
import type { Artefacto, ArtefactoTipo, ArtefactoVersion, Nota } from "./types";

type SqlRow = Record<string, unknown>;

let schemaReady: Promise<void> | null = null;

async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = getLibsqlClient()
      .batch(
        [
          `CREATE TABLE IF NOT EXISTS notas (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            materia_id TEXT NOT NULL,
            titulo TEXT NOT NULL,
            contenido TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );`,
          `CREATE INDEX IF NOT EXISTS idx_notas_user_materia_updated
            ON notas (user_id, materia_id, updated_at DESC);`,
          `CREATE TABLE IF NOT EXISTS artefactos (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            materia_id TEXT NOT NULL,
            session_id TEXT,
            tipo TEXT NOT NULL,
            titulo TEXT NOT NULL,
            contenido TEXT NOT NULL,
            version INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );`,
          `CREATE INDEX IF NOT EXISTS idx_artefactos_user_materia_updated
            ON artefactos (user_id, materia_id, updated_at DESC);`,
          `CREATE TABLE IF NOT EXISTS artefacto_versiones (
            artefacto_id TEXT NOT NULL,
            version INTEGER NOT NULL,
            titulo TEXT NOT NULL,
            contenido TEXT NOT NULL,
            created_at TEXT NOT NULL,
            PRIMARY KEY (artefacto_id, version)
          );`,
        ],
        "write"
      )
      .then(() => undefined);
  }
  await schemaReady;
}

function toNota(row: SqlRow): Nota {
  return {
    id: String(row.id),
    materiaId: String(row.materia_id),
    titulo: String(row.titulo),
    contenido: String(row.contenido ?? ""),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function toArtefacto(row: SqlRow): Artefacto {
  return {
    id: String(row.id),
    materiaId: String(row.materia_id),
    sessionId: row.session_id ? String(row.session_id) : undefined,
    tipo: row.tipo === "examen" ? "examen" : "documento",
    titulo: String(row.titulo),
    contenido: String(row.contenido ?? ""),
    version: Number(row.version) || 1,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

const NOTA_COLUMNS = "id, materia_id, titulo, contenido, created_at, updated_at";
const ARTEFACTO_COLUMNS =
  "id, materia_id, session_id, tipo, titulo, contenido, version, created_at, updated_at";

export async function listNotas(materiaId: string): Promise<Nota[]> {
  await ensureSchema();
  const userId = await requireUserId();
  const result = await getLibsqlClient().execute({
    sql: `SELECT ${NOTA_COLUMNS} FROM notas
          WHERE user_id = ? AND materia_id = ?
          ORDER BY datetime(updated_at) DESC`,
    args: [userId, materiaId],
  });
  return result.rows.map((row) => toNota(row as SqlRow));
}

export async function getNota(id: string): Promise<Nota | undefined> {
  await ensureSchema();
  const userId = await requireUserId();
  const result = await getLibsqlClient().execute({
    sql: `SELECT ${NOTA_COLUMNS} FROM notas WHERE user_id = ? AND id = ?`,
    args: [userId, id],
  });
  const row = result.rows[0] as SqlRow | undefined;
  return row ? toNota(row) : undefined;
}

export async function createNota(
  materiaId: string,
  input: { titulo: string; contenido?: string }
): Promise<Nota> {
  await ensureSchema();
  const userId = await requireUserId();
  const now = new Date().toISOString();
  const nota: Nota = {
    id: uuid(),
    materiaId,
    titulo: input.titulo.trim() || "Nota sin título",
    contenido: input.contenido ?? "",
    createdAt: now,
    updatedAt: now,
  };
  await getLibsqlClient().execute({
    sql: `INSERT INTO notas (id, user_id, materia_id, titulo, contenido, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [nota.id, userId, materiaId, nota.titulo, nota.contenido, now, now],
  });
  return nota;
}

export async function updateNota(
  id: string,
  input: { titulo?: string; contenido?: string }
): Promise<Nota | undefined> {
  await ensureSchema();
  const userId = await requireUserId();
  const current = await getNota(id);
  if (!current) return undefined;
  const titulo =
    input.titulo !== undefined ? input.titulo.trim() || "Nota sin título" : current.titulo;
  const contenido = input.contenido ?? current.contenido;
  const updatedAt = new Date().toISOString();
  await getLibsqlClient().execute({
    sql: `UPDATE notas SET titulo = ?, contenido = ?, updated_at = ?
          WHERE user_id = ? AND id = ?`,
    args: [titulo, contenido, updatedAt, userId, id],
  });
  return { ...current, titulo, contenido, updatedAt };
}

export async function deleteNota(id: string): Promise<void> {
  await ensureSchema();
  const userId = await requireUserId();
  await getLibsqlClient().execute({
    sql: `DELETE FROM notas WHERE user_id = ? AND id = ?`,
    args: [userId, id],
  });
}

export async function deleteWorkspaceForMateria(materiaId: string): Promise<void> {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getLibsqlClient();
  await db.batch(
    [
      {
        sql: `DELETE FROM artefacto_versiones WHERE artefacto_id IN (
                SELECT id FROM artefactos WHERE user_id = ? AND materia_id = ?
              )`,
        args: [userId, materiaId],
      },
      {
        sql: `DELETE FROM artefactos WHERE user_id = ? AND materia_id = ?`,
        args: [userId, materiaId],
      },
      {
        sql: `DELETE FROM notas WHERE user_id = ? AND materia_id = ?`,
        args: [userId, materiaId],
      },
    ],
    "write"
  );
}

export async function listArtefactos(materiaId: string): Promise<Artefacto[]> {
  await ensureSchema();
  const userId = await requireUserId();
  const result = await getLibsqlClient().execute({
    sql: `SELECT ${ARTEFACTO_COLUMNS} FROM artefactos
          WHERE user_id = ? AND materia_id = ?
          ORDER BY datetime(created_at) DESC`,
    args: [userId, materiaId],
  });
  return result.rows.map((row) => toArtefacto(row as SqlRow));
}

export async function getArtefacto(id: string): Promise<Artefacto | undefined> {
  await ensureSchema();
  const userId = await requireUserId();
  const result = await getLibsqlClient().execute({
    sql: `SELECT ${ARTEFACTO_COLUMNS} FROM artefactos WHERE user_id = ? AND id = ?`,
    args: [userId, id],
  });
  const row = result.rows[0] as SqlRow | undefined;
  return row ? toArtefacto(row) : undefined;
}

export async function listArtefactoVersiones(id: string): Promise<ArtefactoVersion[]> {
  await ensureSchema();
  const artefacto = await getArtefacto(id);
  if (!artefacto) return [];
  const result = await getLibsqlClient().execute({
    sql: `SELECT version, titulo, contenido, created_at FROM artefacto_versiones
          WHERE artefacto_id = ? ORDER BY version ASC`,
    args: [id],
  });
  return result.rows.map((row) => ({
    version: Number(row.version),
    titulo: String(row.titulo),
    contenido: String(row.contenido),
    createdAt: String(row.created_at),
  }));
}

export async function saveArtefacto(input: {
  materiaId: string;
  sessionId?: string;
  id?: string;
  tipo: ArtefactoTipo;
  titulo: string;
  contenido: string;
}): Promise<Artefacto> {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getLibsqlClient();
  const now = new Date().toISOString();
  const existing = input.id ? await getArtefacto(input.id) : undefined;

  if (existing && existing.materiaId === input.materiaId) {
    const version = existing.version + 1;
    const titulo = input.titulo.trim() || existing.titulo;
    await db.batch(
      [
        {
          sql: `UPDATE artefactos SET tipo = ?, titulo = ?, contenido = ?, version = ?, updated_at = ?
                WHERE user_id = ? AND id = ?`,
          args: [input.tipo, titulo, input.contenido, version, now, userId, existing.id],
        },
        {
          sql: `INSERT INTO artefacto_versiones (artefacto_id, version, titulo, contenido, created_at)
                VALUES (?, ?, ?, ?, ?)`,
          args: [existing.id, version, titulo, input.contenido, now],
        },
      ],
      "write"
    );
    return { ...existing, tipo: input.tipo, titulo, contenido: input.contenido, version, updatedAt: now };
  }

  const artefacto: Artefacto = {
    id: uuid(),
    materiaId: input.materiaId,
    sessionId: input.sessionId,
    tipo: input.tipo,
    titulo: input.titulo.trim() || "Documento sin título",
    contenido: input.contenido,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
  await db.batch(
    [
      {
        sql: `INSERT INTO artefactos (${ARTEFACTO_COLUMNS.replace("materia_id", "user_id, materia_id")})
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          artefacto.id,
          userId,
          artefacto.materiaId,
          artefacto.sessionId || null,
          artefacto.tipo,
          artefacto.titulo,
          artefacto.contenido,
          1,
          now,
          now,
        ],
      },
      {
        sql: `INSERT INTO artefacto_versiones (artefacto_id, version, titulo, contenido, created_at)
              VALUES (?, 1, ?, ?, ?)`,
        args: [artefacto.id, artefacto.titulo, artefacto.contenido, now],
      },
    ],
    "write"
  );
  return artefacto;
}

export async function deleteArtefacto(id: string): Promise<void> {
  await ensureSchema();
  const userId = await requireUserId();
  const artefacto = await getArtefacto(id);
  if (!artefacto) return;
  await getLibsqlClient().batch(
    [
      { sql: `DELETE FROM artefacto_versiones WHERE artefacto_id = ?`, args: [id] },
      { sql: `DELETE FROM artefactos WHERE user_id = ? AND id = ?`, args: [userId, id] },
    ],
    "write"
  );
}
