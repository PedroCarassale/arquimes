import { getLibsqlClient } from "./libsql";
import { requireUserId } from "./auth-session";
import {
  normalizeAssistantContent,
  normalizeChatMessage,
} from "./chat-message";
import type { ChatMessage, ChatSession } from "./types";

export class StorageConfigError extends Error {}

type StoredMessage = ChatMessage & { chatSessionId: string };

let schemaReady: Promise<void> | null = null;

async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const db = getLibsqlClient();
      await db.batch(
        [
          `CREATE TABLE IF NOT EXISTS chat_sessions_auth (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            materia_id TEXT NOT NULL,
            examen_id TEXT,
            title TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );`,
          `CREATE INDEX IF NOT EXISTS idx_chat_sessions_auth_user_materia
            ON chat_sessions_auth (user_id, materia_id, updated_at DESC);`,
          `CREATE TABLE IF NOT EXISTS chat_messages_auth (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            citations_json TEXT,
            is_error INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
          );`,
          `CREATE INDEX IF NOT EXISTS idx_chat_messages_auth_session_created
            ON chat_messages_auth (session_id, created_at ASC);`,
        ],
        "write"
      );
    })();
  }
  await schemaReady;
}

export async function listChatSessionsForMateria(
  materiaId: string,
  examenId?: string
): Promise<ChatSession[]> {
  await ensureSchema();
  const db = getLibsqlClient();
  const userId = await requireUserId();
  const result = await db.execute({
    sql: `SELECT id, materia_id, examen_id, title, created_at, updated_at
          FROM chat_sessions_auth
          WHERE user_id = ? AND materia_id = ?
            AND (? IS NULL OR examen_id = ?)
          ORDER BY datetime(updated_at) DESC`,
    args: [userId, materiaId, examenId || null, examenId || null],
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
  const db = getLibsqlClient();
  const userId = await requireUserId();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  await db.execute({
    sql: `INSERT INTO chat_sessions_auth (id, user_id, materia_id, examen_id, title, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      userId,
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
  const db = getLibsqlClient();
  const userId = await requireUserId();
  const updatedAt = new Date().toISOString();
  const result = await db.execute({
    sql: `UPDATE chat_sessions_auth
          SET title = ?, updated_at = ?
          WHERE id = ? AND user_id = ?`,
    args: [title, updatedAt, sessionId, userId],
  });
  return Number(result.rowsAffected) > 0;
}

export async function deleteChatSession(sessionId: string): Promise<boolean> {
  await ensureSchema();
  const db = getLibsqlClient();
  const userId = await requireUserId();
  const deleteMessages = await db.execute({
    sql: `DELETE FROM chat_messages_auth
          WHERE session_id IN (
            SELECT id FROM chat_sessions_auth WHERE id = ? AND user_id = ?
          )`,
    args: [sessionId, userId],
  });
  const deleteSession = await db.execute({
    sql: `DELETE FROM chat_sessions_auth WHERE id = ? AND user_id = ?`,
    args: [sessionId, userId],
  });
  return Number(deleteSession.rowsAffected) > 0 || Number(deleteMessages.rowsAffected) > 0;
}

export async function deleteChatSessionsForMateria(materiaId: string): Promise<void> {
  await ensureSchema();
  const db = getLibsqlClient();
  const userId = await requireUserId();
  await db.batch(
    [
      {
        sql: `DELETE FROM chat_messages_auth
              WHERE session_id IN (
                SELECT id FROM chat_sessions_auth WHERE user_id = ? AND materia_id = ?
              )`,
        args: [userId, materiaId],
      },
      {
        sql: `DELETE FROM chat_sessions_auth WHERE user_id = ? AND materia_id = ?`,
        args: [userId, materiaId],
      },
    ],
    "write"
  );
}

export async function getChatSession(
  sessionId: string
): Promise<ChatSession | null> {
  await ensureSchema();
  const db = getLibsqlClient();
  const userId = await requireUserId();
  const result = await db.execute({
    sql: `SELECT id, materia_id, examen_id, title, created_at, updated_at
          FROM chat_sessions_auth WHERE id = ? AND user_id = ?`,
    args: [sessionId, userId],
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
  const db = getLibsqlClient();
  const session = await getChatSession(sessionId);
  if (!session) return [];

  const result = await db.execute({
    sql: `SELECT id, role, content, citations_json, is_error, created_at
          FROM chat_messages_auth
          WHERE session_id = ?
          ORDER BY datetime(created_at) ASC`,
    args: [sessionId],
  });

  return result.rows.map((row) =>
    normalizeChatMessage({
      id: String(row.id),
      role: row.role === "assistant" ? "assistant" : "user",
      content: String(row.content),
      createdAt: String(row.created_at),
      chatSessionId: sessionId,
      materiaId: session.materiaId,
      citations: parseStoredCitations(row.citations_json),
      isError: Number(row.is_error) === 1,
    })
  );
}

export async function addTurn(input: {
  sessionId: string;
  userContent: string;
  assistantContent: string;
  citations?: string[];
  assistantIsError?: boolean;
}): Promise<StoredMessage[]> {
  await ensureSchema();
  const db = getLibsqlClient();
  const session = await getChatSession(input.sessionId);
  if (!session) {
    throw new StorageConfigError("No encuentro la sesión de chat elegida.");
  }

  const now = new Date().toISOString();
  const userMessageId = crypto.randomUUID();
  const assistantMessageId = crypto.randomUUID();
  const assistant = normalizeAssistantContent(
    input.assistantContent,
    input.citations
  );

  await db.batch(
    [
      {
        sql: `INSERT INTO chat_messages_auth (id, session_id, role, content, created_at)
              VALUES (?, ?, 'user', ?, ?)`,
        args: [userMessageId, input.sessionId, input.userContent, now],
      },
      {
        sql: `INSERT INTO chat_messages_auth (id, session_id, role, content, citations_json, is_error, created_at)
              VALUES (?, ?, 'assistant', ?, ?, ?, ?)`,
        args: [
          assistantMessageId,
          input.sessionId,
          assistant.answer,
          assistant.citations.length
            ? JSON.stringify(assistant.citations)
            : null,
          input.assistantIsError ? 1 : 0,
          now,
        ],
      },
      {
        sql: `UPDATE chat_sessions_auth SET updated_at = ? WHERE id = ?`,
        args: [now, input.sessionId],
      },
    ],
    "write"
  );

  return [
    {
      id: userMessageId,
      role: "user",
      content: input.userContent,
      createdAt: now,
      materiaId: session.materiaId,
      chatSessionId: input.sessionId,
    },
    {
      id: assistantMessageId,
      role: "assistant",
      content: assistant.answer,
      createdAt: now,
      materiaId: session.materiaId,
      chatSessionId: input.sessionId,
      citations: assistant.citations.length ? assistant.citations : undefined,
      isError: Boolean(input.assistantIsError),
    },
  ];
}

function parseStoredCitations(value: unknown): string[] | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(String(value)) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter(
          (citation): citation is string => typeof citation === "string"
        )
      : undefined;
  } catch {
    return undefined;
  }
}
