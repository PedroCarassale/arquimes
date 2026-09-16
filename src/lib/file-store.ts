import { cookies } from "next/headers";
import { createClient, type Client } from "@libsql/client";
import { v4 as uuid } from "uuid";

const OWNER_COOKIE = "aqs_owner";

type OwnerScope = {
  ownerId: string;
};

export type StoredStudyFileMeta = {
  storageKey: string;
  name: string;
  type: string;
  size: number;
  extractedText: string | null;
  extractionStatus: string;
  extractionDetail: string | null;
};

let clientInstance: Client | null = null;
let schemaReady: Promise<void> | null = null;

function getClient(): Client {
  if (clientInstance) return clientInstance;
  const configuredUrl = process.env.LIBSQL_URL?.trim();
  const authToken = process.env.LIBSQL_AUTH_TOKEN?.trim();

  if (!configuredUrl) {
    clientInstance = createClient({ url: "file:.arquimes-data.db" });
    return clientInstance;
  }

  clientInstance = createClient({
    url: configuredUrl,
    authToken: authToken || undefined,
  });
  return clientInstance;
}

async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const db = getClient();
      await db.batch(
        [
          `CREATE TABLE IF NOT EXISTS study_files (
            id TEXT PRIMARY KEY,
            owner_id TEXT NOT NULL,
            name TEXT NOT NULL,
            mime_type TEXT NOT NULL,
            size_bytes INTEGER NOT NULL,
            content BLOB NOT NULL,
            extracted_text TEXT,
            extraction_status TEXT NOT NULL DEFAULT 'unknown',
            extraction_detail TEXT,
            created_at TEXT NOT NULL
          );`,
          `CREATE INDEX IF NOT EXISTS idx_study_files_owner_created
            ON study_files (owner_id, created_at DESC);`,
        ],
        "write"
      );
    })();
  }
  await schemaReady;
}

async function getOwnerScope(): Promise<OwnerScope> {
  const jar = await cookies();
  const existing = jar.get(OWNER_COOKIE)?.value?.trim();
  if (existing) return { ownerId: existing };

  const ownerId = uuid();
  jar.set(OWNER_COOKIE, ownerId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 400,
  });
  return { ownerId };
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
  const db = getClient();
  const { ownerId } = await getOwnerScope();
  const id = uuid();
  const now = new Date().toISOString();
  await db.execute({
    sql: `INSERT INTO study_files (
      id, owner_id, name, mime_type, size_bytes, content, extracted_text, extraction_status, extraction_detail, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      ownerId,
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

  return { storageKey: `libsql:${id}` };
}

function parseStorageKey(storageKey?: string): string | null {
  if (!storageKey) return null;
  if (!storageKey.startsWith("libsql:")) return null;
  const id = storageKey.slice("libsql:".length).trim();
  return id || null;
}

export async function getStudyFileMetaByStorageKeys(
  storageKeys: string[]
): Promise<Map<string, StoredStudyFileMeta>> {
  await ensureSchema();
  const db = getClient();
  const { ownerId } = await getOwnerScope();
  const pairs = storageKeys
    .map((storageKey) => ({ storageKey, id: parseStorageKey(storageKey) }))
    .filter((pair): pair is { storageKey: string; id: string } => Boolean(pair.id));
  const uniqueIds = [...new Set(pairs.map((pair) => pair.id))];
  const out = new Map<string, StoredStudyFileMeta>();
  if (uniqueIds.length === 0) return out;

  const placeholders = uniqueIds.map(() => "?").join(", ");
  const result = await db.execute({
    sql: `SELECT id, name, mime_type, size_bytes, extracted_text, extraction_status, extraction_detail
          FROM study_files
          WHERE owner_id = ? AND id IN (${placeholders})`,
    args: [ownerId, ...uniqueIds],
  });
  const byId = new Map(result.rows.map((row) => [String(row.id), row]));
  for (const pair of pairs) {
    const row = byId.get(pair.id);
    if (!row) continue;
    out.set(pair.storageKey, {
      storageKey: pair.storageKey,
      name: String(row.name),
      type: String(row.mime_type),
      size: Number(row.size_bytes),
      extractedText: row.extracted_text ? String(row.extracted_text) : null,
      extractionStatus: String(row.extraction_status || "unknown"),
      extractionDetail: row.extraction_detail ? String(row.extraction_detail) : null,
    });
  }
  return out;
}

export async function readStudyFileContent(
  storageKey?: string
): Promise<{ bytes: Buffer; type: string; name: string } | null> {
  const id = parseStorageKey(storageKey);
  if (!id) return null;
  await ensureSchema();
  const db = getClient();
  const { ownerId } = await getOwnerScope();
  const result = await db.execute({
    sql: `SELECT name, mime_type, content FROM study_files WHERE owner_id = ? AND id = ?`,
    args: [ownerId, id],
  });
  const row = result.rows[0];
  if (!row?.content) return null;
  const rawContent = row.content as unknown;
  const bytes =
    rawContent instanceof Uint8Array
      ? rawContent
      : rawContent instanceof ArrayBuffer
        ? new Uint8Array(rawContent)
        : typeof rawContent === "string"
          ? Buffer.from(rawContent, "base64")
          : null;
  if (!bytes) return null;
  return {
    name: String(row.name),
    type: String(row.mime_type),
    bytes: Buffer.from(bytes),
  };
}

export async function deleteStudyFileByStorageKey(storageKey?: string): Promise<void> {
  const id = parseStorageKey(storageKey);
  if (!id) return;
  await ensureSchema();
  const db = getClient();
  const { ownerId } = await getOwnerScope();
  await db.execute({
    sql: `DELETE FROM study_files WHERE owner_id = ? AND id = ?`,
    args: [ownerId, id],
  });
}
