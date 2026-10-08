import { getLibsqlClient } from "./libsql";
import { requireUserId } from "./auth-session";
import type { LecturaArchivo } from "./types";

export type StoredStudyFileMeta = {
  storageKey: string;
  name: string;
  type: string;
  size: number;
  extractedText: string | null;
  extractionStatus: string;
  extractionDetail: string | null;
  lectura: LecturaArchivo;
};

export type StudyFilePart = {
  index: number;
  startPage: number;
  endPage: number;
  status: "pending" | "processing" | "done" | "error";
  text: string | null;
  attempts: number;
};

export type StudyFileRecord = {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadStatus: "uploading" | "ready";
  chunkCount: number;
  pageCount: number;
};

const PROCESSING_STALE_MS = 5.5 * 60 * 1000;
export const MAX_PART_ATTEMPTS = 3;

let schemaReady: Promise<void> | null = null;

export function parseStorageKey(storageKey?: string): string | null {
  if (!storageKey) return null;
  if (!storageKey.startsWith("libsql:")) return null;
  const id = storageKey.slice("libsql:".length).trim();
  return id || null;
}

export function storageKeyForFile(fileId: string): string {
  return `libsql:${fileId}`;
}

async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const db = getLibsqlClient();
      await db.batch(
        [
          `CREATE TABLE IF NOT EXISTS study_files_auth (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            mime_type TEXT NOT NULL,
            size_bytes INTEGER NOT NULL,
            content BLOB NOT NULL,
            extracted_text TEXT,
            extraction_status TEXT NOT NULL DEFAULT 'unknown',
            extraction_detail TEXT,
            created_at TEXT NOT NULL
          );`,
          `CREATE INDEX IF NOT EXISTS idx_study_files_auth_user_created
            ON study_files_auth (user_id, created_at DESC);`,
          `CREATE TABLE IF NOT EXISTS study_file_chunks (
            file_id TEXT NOT NULL,
            idx INTEGER NOT NULL,
            bytes BLOB NOT NULL,
            PRIMARY KEY (file_id, idx)
          );`,
          `CREATE TABLE IF NOT EXISTS study_file_parts (
            file_id TEXT NOT NULL,
            idx INTEGER NOT NULL,
            start_page INTEGER NOT NULL,
            end_page INTEGER NOT NULL,
            status TEXT NOT NULL,
            text TEXT,
            error TEXT,
            attempts INTEGER NOT NULL DEFAULT 0,
            claimed_at INTEGER,
            PRIMARY KEY (file_id, idx)
          );`,
        ],
        "write"
      );
      const columns = await db.execute(`PRAGMA table_info(study_files_auth)`);
      const existing = new Set(columns.rows.map((row) => String(row.name)));
      const additions = [
        ["upload_status", `TEXT NOT NULL DEFAULT 'ready'`],
        ["chunk_count", `INTEGER NOT NULL DEFAULT 0`],
        ["page_count", `INTEGER NOT NULL DEFAULT 0`],
      ].filter(([name]) => !existing.has(name));
      for (const [name, definition] of additions) {
        await db.execute(
          `ALTER TABLE study_files_auth ADD COLUMN ${name} ${definition}`
        );
      }
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}

function toBytes(raw: unknown): Uint8Array | null {
  if (raw instanceof Uint8Array) return raw;
  if (raw instanceof ArrayBuffer) return new Uint8Array(raw);
  if (typeof raw === "string") return Buffer.from(raw, "base64");
  return null;
}

export async function storeStudyFile(input: {
  name: string;
  type: string;
  size: number;
  bytes: Buffer;
  extractedText: string | null;
  extractionStatus: string;
  extractionDetail?: string | null;
}): Promise<{ storageKey: string }> {
  await ensureSchema();
  const db = getLibsqlClient();
  const userId = await requireUserId();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.execute({
    sql: `INSERT INTO study_files_auth (
      id, user_id, name, mime_type, size_bytes, content, extracted_text, extraction_status, extraction_detail, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      userId,
      input.name,
      input.type || "application/octet-stream",
      input.size,
      new Uint8Array(input.bytes),
      input.extractedText,
      input.extractionStatus,
      input.extractionDetail || null,
      now,
    ],
  });

  return { storageKey: storageKeyForFile(id) };
}

export async function createPendingStudyFile(input: {
  name: string;
  type: string;
  size: number;
  chunkCount: number;
}): Promise<string> {
  await ensureSchema();
  const db = getLibsqlClient();
  const userId = await requireUserId();
  const id = crypto.randomUUID();
  await db.execute({
    sql: `INSERT INTO study_files_auth (
      id, user_id, name, mime_type, size_bytes, content, extracted_text, extraction_status,
      extraction_detail, created_at, upload_status, chunk_count, page_count
    ) VALUES (?, ?, ?, ?, ?, ?, NULL, 'uploading', NULL, ?, 'uploading', ?, 0)`,
    args: [
      id,
      userId,
      input.name,
      input.type || "application/octet-stream",
      input.size,
      new Uint8Array(0),
      new Date().toISOString(),
      input.chunkCount,
    ],
  });
  return id;
}

export async function getStudyFileRecord(
  fileId: string
): Promise<StudyFileRecord | null> {
  await ensureSchema();
  const db = getLibsqlClient();
  const userId = await requireUserId();
  const result = await db.execute({
    sql: `SELECT id, name, mime_type, size_bytes, upload_status, chunk_count, page_count
          FROM study_files_auth WHERE user_id = ? AND id = ?`,
    args: [userId, fileId],
  });
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: String(row.id),
    name: String(row.name),
    type: String(row.mime_type),
    size: Number(row.size_bytes),
    uploadStatus: String(row.upload_status) === "uploading" ? "uploading" : "ready",
    chunkCount: Number(row.chunk_count || 0),
    pageCount: Number(row.page_count || 0),
  };
}

export async function putStudyFileChunk(
  fileId: string,
  index: number,
  bytes: Uint8Array
): Promise<void> {
  const record = await getStudyFileRecord(fileId);
  if (!record || record.uploadStatus !== "uploading") {
    throw new Error("La subida no existe o ya terminó.");
  }
  if (!Number.isInteger(index) || index < 0 || index >= record.chunkCount) {
    throw new Error("Bloque fuera de rango.");
  }
  await getLibsqlClient().execute({
    sql: `INSERT OR REPLACE INTO study_file_chunks (file_id, idx, bytes) VALUES (?, ?, ?)`,
    args: [fileId, index, bytes],
  });
}

export async function missingStudyFileChunks(
  fileId: string,
  chunkCount: number
): Promise<{ missing: number[]; totalBytes: number }> {
  const result = await getLibsqlClient().execute({
    sql: `SELECT idx, length(bytes) AS len FROM study_file_chunks WHERE file_id = ?`,
    args: [fileId],
  });
  const present = new Set(result.rows.map((row) => Number(row.idx)));
  const totalBytes = result.rows.reduce((sum, row) => sum + Number(row.len), 0);
  const missing: number[] = [];
  for (let i = 0; i < chunkCount; i += 1) {
    if (!present.has(i)) missing.push(i);
  }
  return { missing, totalBytes };
}

export async function markStudyFileUploaded(
  fileId: string,
  input: {
    extractedText: string | null;
    extractionStatus: string;
    extractionDetail?: string | null;
    pageCount: number;
  }
): Promise<void> {
  const userId = await requireUserId();
  await getLibsqlClient().execute({
    sql: `UPDATE study_files_auth
          SET upload_status = 'ready', extracted_text = ?, extraction_status = ?,
              extraction_detail = ?, page_count = ?
          WHERE user_id = ? AND id = ?`,
    args: [
      input.extractedText,
      input.extractionStatus,
      input.extractionDetail || null,
      input.pageCount,
      userId,
      fileId,
    ],
  });
}

export async function updateStudyFileExtraction(
  fileId: string,
  input: {
    extractedText: string | null;
    extractionStatus: string;
    extractionDetail?: string | null;
  }
): Promise<void> {
  const userId = await requireUserId();
  await getLibsqlClient().execute({
    sql: `UPDATE study_files_auth
          SET extracted_text = ?, extraction_status = ?, extraction_detail = ?
          WHERE user_id = ? AND id = ?`,
    args: [
      input.extractedText,
      input.extractionStatus,
      input.extractionDetail || null,
      userId,
      fileId,
    ],
  });
}

async function chunkSizes(fileId: string): Promise<number[]> {
  const result = await getLibsqlClient().execute({
    sql: `SELECT idx, length(bytes) AS len FROM study_file_chunks WHERE file_id = ? ORDER BY idx ASC`,
    args: [fileId],
  });
  return result.rows.map((row) => Number(row.len));
}

async function readChunk(fileId: string, index: number): Promise<Uint8Array> {
  const result = await getLibsqlClient().execute({
    sql: `SELECT bytes FROM study_file_chunks WHERE file_id = ? AND idx = ?`,
    args: [fileId, index],
  });
  const bytes = toBytes(result.rows[0]?.bytes);
  if (!bytes) throw new Error("Falta un bloque del archivo.");
  return bytes;
}

export async function readStudyFileBytes(fileId: string): Promise<Buffer | null> {
  const record = await getStudyFileRecord(fileId);
  if (!record) return null;
  if (record.chunkCount > 0) {
    const parts: Uint8Array[] = [];
    for (let i = 0; i < record.chunkCount; i += 1) {
      parts.push(await readChunk(fileId, i));
    }
    return Buffer.concat(parts);
  }
  const result = await getLibsqlClient().execute({
    sql: `SELECT content FROM study_files_auth WHERE id = ?`,
    args: [fileId],
  });
  const bytes = toBytes(result.rows[0]?.content);
  return bytes ? Buffer.from(bytes) : null;
}

export async function readStudyFileContent(
  storageKey?: string
): Promise<{ bytes: Buffer; type: string; name: string } | null> {
  const id = parseStorageKey(storageKey);
  if (!id) return null;
  const record = await getStudyFileRecord(id);
  if (!record) return null;
  const bytes = await readStudyFileBytes(id);
  if (!bytes) return null;
  return { name: record.name, type: record.type, bytes };
}

export async function studyFileResponse(
  storageKey: string | undefined,
  request: Request,
  options: { fileName: string; fallbackType: string; cacheControl?: string }
): Promise<Response | null> {
  const id = parseStorageKey(storageKey);
  if (!id) return null;
  const record = await getStudyFileRecord(id);
  if (!record || record.uploadStatus !== "ready") return null;

  const url = new URL(request.url);
  const disposition =
    url.searchParams.get("download") === "1" ? "attachment" : "inline";
  const headers = new Headers({
    "Content-Type": record.type || options.fallbackType || "application/octet-stream",
    "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(options.fileName)}`,
    "Cache-Control": options.cacheControl || "private, max-age=60",
    "Accept-Ranges": "bytes",
  });

  if (record.chunkCount === 0) {
    const bytes = await readStudyFileBytes(id);
    if (!bytes) return null;
    headers.set("Content-Length", String(bytes.length));
    return new Response(new Uint8Array(bytes), { headers });
  }

  const sizes = await chunkSizes(id);
  const total = sizes.reduce((sum, size) => sum + size, 0);
  let start = 0;
  let end = total - 1;
  let status = 200;
  const range = request.headers.get("range")?.match(/^bytes=(\d*)-(\d*)$/);
  if (range && (range[1] || range[2])) {
    if (range[1]) {
      start = Number(range[1]);
      end = range[2] ? Math.min(Number(range[2]), total - 1) : total - 1;
    } else {
      start = Math.max(0, total - Number(range[2]));
    }
    if (start > end || start >= total) {
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${total}` },
      });
    }
    status = 206;
    headers.set("Content-Range", `bytes ${start}-${end}/${total}`);
  }
  headers.set("Content-Length", String(end - start + 1));

  const offsets: number[] = [];
  sizes.reduce((offset, size) => {
    offsets.push(offset);
    return offset + size;
  }, 0);
  let chunkIndex = offsets.findLastIndex((offset) => offset <= start);

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (chunkIndex >= sizes.length || offsets[chunkIndex] > end) {
        controller.close();
        return;
      }
      const chunk = await readChunk(id, chunkIndex);
      const chunkStart = offsets[chunkIndex];
      const from = Math.max(0, start - chunkStart);
      const to = Math.min(chunk.length, end - chunkStart + 1);
      controller.enqueue(chunk.subarray(from, to));
      chunkIndex += 1;
    },
  });
  return new Response(stream, { status, headers });
}

export async function replaceStudyFileParts(
  fileId: string,
  parts: Array<Pick<StudyFilePart, "startPage" | "endPage" | "status" | "text">>
): Promise<void> {
  const db = getLibsqlClient();
  await db.batch(
    [
      { sql: `DELETE FROM study_file_parts WHERE file_id = ?`, args: [fileId] },
      ...parts.map((part, index) => ({
        sql: `INSERT INTO study_file_parts (file_id, idx, start_page, end_page, status, text, attempts)
              VALUES (?, ?, ?, ?, ?, ?, 0)`,
        args: [fileId, index, part.startPage, part.endPage, part.status, part.text],
      })),
    ],
    "write"
  );
}

function toPart(row: Record<string, unknown>): StudyFilePart {
  return {
    index: Number(row.idx),
    startPage: Number(row.start_page),
    endPage: Number(row.end_page),
    status: String(row.status) as StudyFilePart["status"],
    text: row.text ? String(row.text) : null,
    attempts: Number(row.attempts || 0),
  };
}

export async function listStudyFileParts(fileId: string): Promise<StudyFilePart[]> {
  const result = await getLibsqlClient().execute({
    sql: `SELECT idx, start_page, end_page, status, text, attempts
          FROM study_file_parts WHERE file_id = ? ORDER BY idx ASC`,
    args: [fileId],
  });
  return result.rows.map((row) => toPart(row as Record<string, unknown>));
}

export async function claimNextStudyFilePart(
  fileId: string
): Promise<StudyFilePart | null> {
  const now = Date.now();
  const result = await getLibsqlClient().execute({
    sql: `UPDATE study_file_parts
          SET status = 'processing', claimed_at = ?, attempts = attempts + 1
          WHERE file_id = ? AND idx = (
            SELECT idx FROM study_file_parts
            WHERE file_id = ?
              AND attempts < ?
              AND (status IN ('pending', 'error')
                   OR (status = 'processing' AND claimed_at < ?))
            ORDER BY idx ASC LIMIT 1
          )
          RETURNING idx, start_page, end_page, status, text, attempts`,
    args: [now, fileId, fileId, MAX_PART_ATTEMPTS, now - PROCESSING_STALE_MS],
  });
  const row = result.rows[0];
  return row ? toPart(row as Record<string, unknown>) : null;
}

export async function finishStudyFilePart(
  fileId: string,
  index: number,
  outcome: { text: string } | { error: string }
): Promise<void> {
  await getLibsqlClient().execute({
    sql: `UPDATE study_file_parts SET status = ?, text = ?, error = ?, claimed_at = NULL
          WHERE file_id = ? AND idx = ?`,
    args:
      "text" in outcome
        ? ["done", outcome.text, null, fileId, index]
        : ["error", null, outcome.error, fileId, index],
  });
}

function summarizeLectura(
  status: string,
  pageCount: number,
  parts: Array<{ start: number; end: number; status: string; attempts: number }>
): LecturaArchivo {
  if (status === "uploading") {
    return { estado: "subiendo", paginasLeidas: 0, paginasTotales: pageCount };
  }
  if (parts.length > 0) {
    const pages = (list: typeof parts) =>
      list.reduce((sum, part) => sum + (part.end - part.start + 1), 0);
    const total = pages(parts);
    const done = pages(parts.filter((part) => part.status === "done"));
    const exhausted = parts.filter(
      (part) => part.status === "error" && part.attempts >= MAX_PART_ATTEMPTS
    );
    const open = parts.filter(
      (part) =>
        part.status !== "done" &&
        !(part.status === "error" && part.attempts >= MAX_PART_ATTEMPTS)
    );
    if (open.length > 0) {
      return { estado: "leyendo", paginasLeidas: done, paginasTotales: total };
    }
    if (exhausted.length > 0) {
      return {
        estado: done > 0 ? "parcial" : "sin-texto",
        paginasLeidas: done,
        paginasTotales: total,
      };
    }
    return { estado: "lista", paginasLeidas: done, paginasTotales: total };
  }
  if (
    status === "pdf-text-layer" ||
    status === "plain-text" ||
    status === "ocr-complete"
  ) {
    return { estado: "lista", paginasLeidas: pageCount, paginasTotales: pageCount };
  }
  if (status === "unsupported-media" || status === "binary") {
    return { estado: "no-aplica", paginasLeidas: 0, paginasTotales: 0 };
  }
  return { estado: "sin-texto", paginasLeidas: 0, paginasTotales: pageCount };
}

export async function getStudyFileLectura(fileId: string): Promise<LecturaArchivo> {
  const meta = await getStudyFileMetaByStorageKeys([storageKeyForFile(fileId)]);
  return (
    meta.get(storageKeyForFile(fileId))?.lectura || {
      estado: "sin-texto",
      paginasLeidas: 0,
      paginasTotales: 0,
    }
  );
}

export async function getStudyFileLecturasByStorageKeys(
  storageKeys: string[]
): Promise<Map<string, LecturaArchivo>> {
  const meta = await loadStudyFileMeta(storageKeys, false);
  return new Map([...meta].map(([storageKey, value]) => [storageKey, value.lectura]));
}

export async function getStudyFileMetaByStorageKeys(
  storageKeys: string[]
): Promise<Map<string, StoredStudyFileMeta>> {
  return loadStudyFileMeta(storageKeys, true);
}

async function loadStudyFileMeta(
  storageKeys: string[],
  includeText: boolean
): Promise<Map<string, StoredStudyFileMeta>> {
  await ensureSchema();
  const db = getLibsqlClient();
  const userId = await requireUserId();
  const pairs = storageKeys
    .map((storageKey) => ({ storageKey, id: parseStorageKey(storageKey) }))
    .filter((pair): pair is { storageKey: string; id: string } => Boolean(pair.id));
  const uniqueIds = [...new Set(pairs.map((pair) => pair.id))];
  const out = new Map<string, StoredStudyFileMeta>();
  if (uniqueIds.length === 0) return out;

  const placeholders = uniqueIds.map(() => "?").join(", ");
  const [result, partRows] = await Promise.all([
    db.execute({
      sql: `SELECT id, name, mime_type, size_bytes,
                   ${includeText ? "extracted_text" : "NULL AS extracted_text"}, extraction_status,
                   extraction_detail, upload_status, page_count
            FROM study_files_auth
            WHERE user_id = ? AND id IN (${placeholders})`,
      args: [userId, ...uniqueIds],
    }),
    db.execute({
      sql: `SELECT file_id, start_page, end_page, status, attempts
            FROM study_file_parts WHERE file_id IN (${placeholders})`,
      args: uniqueIds,
    }),
  ]);
  const partsByFile = new Map<
    string,
    Array<{ start: number; end: number; status: string; attempts: number }>
  >();
  for (const row of partRows.rows) {
    const list = partsByFile.get(String(row.file_id)) || [];
    list.push({
      start: Number(row.start_page),
      end: Number(row.end_page),
      status: String(row.status),
      attempts: Number(row.attempts || 0),
    });
    partsByFile.set(String(row.file_id), list);
  }
  const byId = new Map(result.rows.map((row) => [String(row.id), row]));
  for (const pair of pairs) {
    const row = byId.get(pair.id);
    if (!row) continue;
    const status =
      String(row.upload_status) === "uploading"
        ? "uploading"
        : String(row.extraction_status || "unknown");
    out.set(pair.storageKey, {
      storageKey: pair.storageKey,
      name: String(row.name),
      type: String(row.mime_type),
      size: Number(row.size_bytes),
      extractedText: row.extracted_text ? String(row.extracted_text) : null,
      extractionStatus: status,
      extractionDetail: row.extraction_detail ? String(row.extraction_detail) : null,
      lectura: summarizeLectura(
        status,
        Number(row.page_count || 0),
        partsByFile.get(pair.id) || []
      ),
    });
  }
  return out;
}

export async function deleteStudyFileByStorageKey(storageKey?: string): Promise<void> {
  const id = parseStorageKey(storageKey);
  if (!id) return;
  await ensureSchema();
  const db = getLibsqlClient();
  const userId = await requireUserId();
  const owned = await db.execute({
    sql: `SELECT id FROM study_files_auth WHERE user_id = ? AND id = ?`,
    args: [userId, id],
  });
  if (!owned.rows[0]) return;
  await db.batch(
    [
      { sql: `DELETE FROM study_file_chunks WHERE file_id = ?`, args: [id] },
      { sql: `DELETE FROM study_file_parts WHERE file_id = ?`, args: [id] },
      { sql: `DELETE FROM study_files_auth WHERE user_id = ? AND id = ?`, args: [userId, id] },
    ],
    "write"
  );
}

export async function listReadingStudyFiles(): Promise<
  Array<{ fileId: string; name: string; lectura: LecturaArchivo }>
> {
  await ensureSchema();
  const userId = await requireUserId();
  const result = await getLibsqlClient().execute({
    sql: `SELECT id, name FROM study_files_auth
          WHERE user_id = ? AND extraction_status = 'ocr-pending' AND upload_status = 'ready'
          ORDER BY created_at ASC`,
    args: [userId],
  });
  if (result.rows.length === 0) return [];
  const meta = await getStudyFileMetaByStorageKeys(
    result.rows.map((row) => storageKeyForFile(String(row.id)))
  );
  return result.rows.flatMap((row) => {
    const lectura = meta.get(storageKeyForFile(String(row.id)))?.lectura;
    return lectura?.estado === "leyendo"
      ? [{ fileId: String(row.id), name: String(row.name), lectura }]
      : [];
  });
}

export async function resetFailedStudyFileParts(fileId: string): Promise<number> {
  const result = await getLibsqlClient().execute({
    sql: `UPDATE study_file_parts SET status = 'pending', attempts = 0, error = NULL
          WHERE file_id = ? AND status = 'error'`,
    args: [fileId],
  });
  return result.rowsAffected;
}
