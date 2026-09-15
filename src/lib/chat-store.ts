import { cookies } from "next/headers";
import { createClient, type Client } from "@libsql/client";
import { v4 as uuid } from "uuid";
import type { ChatMessage, ChatSession } from "./types";

const OWNER_COOKIE = "aqs_chat_owner";

export class StorageConfigError extends Error {}

type StoredMessage = ChatMessage & { chatSessionId: string };

type ChatOwnerScope = {
  ownerId: string;
};

let clientInstance: Client | null = null;
let schemaReady: Promise<void> | null = null;

function getClient(): Client {
  if (clientInstance) return clientInstance;
  const configuredUrl = process.env.LIBSQL_URL?.trim();
  const authToken = process.env.LIBSQL_AUTH_TOKEN?.trim();

  if (!configuredUrl) {
    if (process.env.NODE_ENV === "production") {
      throw new StorageConfigError(
        "Falta configurar LIBSQL_URL para guardar los chats de estudio."
      );
    }
    clientInstance = createClient({ url: "file:.arquimes-chat.db" });
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
          `CREATE TABLE IF NOT EXISTS chat_sessions (
            id TEXT PRIMARY KEY,
            owner_id TEXT NOT NULL,
            materia_id TEXT NOT NULL,
            examen_id TEXT,
            title TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );`,
          `CREATE INDEX IF NOT EXISTS idx_chat_sessions_owner_materia
            ON chat_sessions (owner_id, materia_id, updated_at DESC);`,
          `CREATE TABLE IF NOT EXISTS chat_messages (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            citations_json TEXT,
            is_error INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY(session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
          );`,
          `CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created
            ON chat_messages (session_id, created_at ASC);`,
        ],
        "write"
      );
    })();
  }
  await schemaReady;
}

export async function getChatOwnerScope(): Promise<ChatOwnerScope> {
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

export async function listChatSessionsForMateria(
  materiaId: string,
  examenId?: string
): Promise<ChatSession[]> {
  await ensureSchema();
  const db = getClient();
  const { ownerId } = await getChatOwnerScope();
  const result = await db.execute({
    sql: `SELECT id, materia_id, examen_id, title, created_at, updated_at
          FROM chat_sessions
          WHERE owner_id = ? AND materia_id = ?
            AND (? IS NULL OR examen_id = ?)
          ORDER BY datetime(updated_at) DESC`,
    args: [ownerId, materiaId, examenId || null, examenId || null],
  });

  return result.rows.map((row) => ({
    id: String(row.id),
    materiaId: String(row.materia_id),
    examenId: row.examen_id ? String(row.examen_id) : undefined,
    title: String(row.title),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));
}

export async function createChatSession(input: {
  materiaId: string;
  examenId?: string;
  title: string;
}): Promise<ChatSession> {
  await ensureSchema();
  const db = getClient();
  const { ownerId } = await getChatOwnerScope();
  const now = new Date().toISOString();
  const id = uuid();
  await db.execute({
    sql: `INSERT INTO chat_sessions (id, owner_id, materia_id, examen_id, title, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      ownerId,
      input.materiaId,
      input.examenId || null,
      input.title,
      now,
      now,
    ],
  });
  return {
    id,
    materiaId: input.materiaId,
    examenId: input.examenId,
    title: input.title,
    createdAt: now,
    updatedAt: now,
  };
}

export async function renameChatSession(
  sessionId: string,
  title: string
): Promise<boolean> {
  await ensureSchema();
  const db = getClient();
  const { ownerId } = await getChatOwnerScope();
  const updatedAt = new Date().toISOString();
  const result = await db.execute({
    sql: `UPDATE chat_sessions
          SET title = ?, updated_at = ?
          WHERE id = ? AND owner_id = ?`,
    args: [title, updatedAt, sessionId, ownerId],
  });
  return Number(result.rowsAffected) > 0;
}

export async function deleteChatSession(sessionId: string): Promise<boolean> {
  await ensureSchema();
  const db = getClient();
  const { ownerId } = await getChatOwnerScope();
  const result = await db.execute({
    sql: `DELETE FROM chat_sessions WHERE id = ? AND owner_id = ?`,
    args: [sessionId, ownerId],
  });
  return Number(result.rowsAffected) > 0;
}

export async function getChatSession(
  sessionId: string
): Promise<ChatSession | null> {
  await ensureSchema();
  const db = getClient();
  const { ownerId } = await getChatOwnerScope();
  const result = await db.execute({
    sql: `SELECT id, materia_id, examen_id, title, created_at, updated_at
          FROM chat_sessions WHERE id = ? AND owner_id = ?`,
    args: [sessionId, ownerId],
  });
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: String(row.id),
    materiaId: String(row.materia_id),
    examenId: row.examen_id ? String(row.examen_id) : undefined,
    title: String(row.title),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function listMessages(sessionId: string): Promise<StoredMessage[]> {
  await ensureSchema();
  const db = getClient();
  const session = await getChatSession(sessionId);
  if (!session) return [];

  const result = await db.execute({
    sql: `SELECT id, role, content, citations_json, is_error, created_at
          FROM chat_messages
          WHERE session_id = ?
          ORDER BY datetime(created_at) ASC`,
    args: [sessionId],
  });

  return result.rows.map((row) => ({
    id: String(row.id),
    role: row.role === "assistant" ? "assistant" : "user",
    content: String(row.content),
    createdAt: String(row.created_at),
    chatSessionId: sessionId,
    materiaId: session.materiaId,
    citations: row.citations_json
      ? JSON.parse(String(row.citations_json))
      : undefined,
    isError: Number(row.is_error) === 1,
  }));
}

export async function addTurn(input: {
  sessionId: string;
  userContent: string;
  assistantContent: string;
  citations?: string[];
  assistantIsError?: boolean;
}): Promise<StoredMessage[]> {
  await ensureSchema();
  const db = getClient();
  const session = await getChatSession(input.sessionId);
  if (!session) {
    throw new StorageConfigError("No encuentro la sesión de chat elegida.");
  }

  const now = new Date().toISOString();
  const userId = uuid();
  const assistantId = uuid();
  await db.batch(
    [
      {
        sql: `INSERT INTO chat_messages (id, session_id, role, content, created_at)
              VALUES (?, ?, 'user', ?, ?)`,
        args: [userId, input.sessionId, input.userContent, now],
      },
      {
        sql: `INSERT INTO chat_messages (id, session_id, role, content, citations_json, is_error, created_at)
              VALUES (?, ?, 'assistant', ?, ?, ?, ?)`,
        args: [
          assistantId,
          input.sessionId,
          input.assistantContent,
          input.citations ? JSON.stringify(input.citations) : null,
          input.assistantIsError ? 1 : 0,
          now,
        ],
      },
      {
        sql: `UPDATE chat_sessions SET updated_at = ? WHERE id = ?`,
        args: [now, input.sessionId],
      },
    ],
    "write"
  );

  return [
    {
      id: userId,
      role: "user",
      content: input.userContent,
      createdAt: now,
      materiaId: session.materiaId,
      chatSessionId: input.sessionId,
    },
    {
      id: assistantId,
      role: "assistant",
      content: input.assistantContent,
      createdAt: now,
      materiaId: session.materiaId,
      chatSessionId: input.sessionId,
      citations: input.citations,
      isError: Boolean(input.assistantIsError),
    },
  ];
}
