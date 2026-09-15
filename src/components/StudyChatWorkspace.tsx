"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { ChatMessage, ChatSession, GroundingPayload } from "@/lib/types";

type ProviderSummary = {
  configured: boolean;
  selected: "openai" | "anthropic" | null;
  message: string;
};

type ChatState = {
  sessions: ChatSession[];
  activeSessionId: string | null;
  messages: ChatMessage[];
  grounding: GroundingPayload | null;
  provider: ProviderSummary;
  suggestedChips: string[];
};

const emptyState: ChatState = {
  sessions: [],
  activeSessionId: null,
  messages: [],
  grounding: null,
  provider: {
    configured: false,
    selected: null,
    message: "Cargando proveedor…",
  },
  suggestedChips: [],
};

export function StudyChatWorkspace({
  materiaId,
}: {
  materiaId: string;
}) {
  const [state, setState] = useState<ChatState>(emptyState);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);

  async function load(sessionId?: string) {
    const params = new URLSearchParams({ materiaId });
    if (sessionId) params.set("sessionId", sessionId);
    const response = await apiFetch(`/api/chat?${params.toString()}`);
    const payload = (await response.json().catch(() => ({}))) as
      | ChatState
      | { error?: string };

    if (!response.ok) {
      throw new Error((payload as { error?: string }).error || "No pude cargar el chat.");
    }

    const data = payload as ChatState;
    setState({
      sessions: Array.isArray(data.sessions) ? data.sessions : [],
      activeSessionId: data.activeSessionId ?? null,
      messages: Array.isArray(data.messages) ? data.messages : [],
      grounding: data.grounding ?? null,
      provider: data.provider ?? emptyState.provider,
      suggestedChips: Array.isArray(data.suggestedChips) ? data.suggestedChips : [],
    });
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    load()
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "No pude cargar el chat.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [materiaId]);

  useEffect(() => {
    if (!threadRef.current) return;
    threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [state.messages, sending]);

  const hasReadable = useMemo(
    () => (state.grounding?.readableCount ?? 0) > 0,
    [state.grounding]
  );

  async function createSession() {
    setError(null);
    const response = await apiFetch("/api/chat/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        materiaId,
        title: "Nuevo chat",
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      session?: ChatSession;
      error?: string;
    };
    if (!response.ok || !payload.session) {
      throw new Error(payload.error || "No pude crear la sesión.");
    }
    await load(payload.session.id);
  }

  async function sendMessage(content: string) {
    if (!content.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const response = await apiFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materiaId,
          sessionId: state.activeSessionId || undefined,
          content: content.trim(),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        turn?: ChatMessage[];
        session?: ChatSession;
      };
      if (!response.ok || !payload.turn || !payload.session) {
        throw new Error(payload.error || "No pude enviar el mensaje.");
      }
      setDraft("");
      await load(payload.session.id);
    } finally {
      setSending(false);
    }
  }

  async function renameSession(sessionId: string, title: string) {
    const clean = title.trim();
    if (!clean) return;
    const response = await apiFetch(`/api/chat/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: clean }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      throw new Error(payload.error || "No pude renombrar la sesión.");
    }
    setRenamingId(null);
    setRenameValue("");
    await load(sessionId);
  }

  async function removeSession(sessionId: string) {
    const response = await apiFetch(`/api/chat/sessions/${sessionId}`, {
      method: "DELETE",
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      throw new Error(payload.error || "No pude borrar la sesión.");
    }
    await load();
  }

  return (
    <div className="px-8 pb-8">
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2">
            Chat de estudio
          </div>
          <h2 className="font-serif text-3xl">Compañero de preparación</h2>
          <p className="text-sm text-foreground-muted mt-2 max-w-3xl">
            Cargá información del examen y preguntá libremente. El chat usa tus apuntes,
            archivo de examen, nota y temas.
          </p>
        </div>
        <div className="flex gap-3 text-xs font-mono uppercase tracking-wider">
          <Link href={`/materias/${materiaId}/cargar`} className="border border-border px-3 py-2 hover:border-accent">
            1) Cargar apuntes
          </Link>
          <Link href={`/materias/${materiaId}/examen`} className="border border-border px-3 py-2 hover:border-accent">
            2) Cargar examen
          </Link>
          <Link href={`/materias/${materiaId}/examenes`} className="border border-border px-3 py-2 hover:border-accent">
            3) Definir temas
          </Link>
        </div>
      </div>

      {error && (
        <p role="alert" className="mb-4 border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
        <section className="border border-border-subtle bg-surface">
          <div className="border-b border-border-subtle p-3">
            <button
              type="button"
              className="w-full bg-accent px-3 py-2 text-sm text-background hover:bg-accent/90"
              onClick={() => createSession().catch((err) => setError(err.message))}
              aria-label="Nuevo chat"
            >
              + Nuevo chat
            </button>
          </div>
          <div className="max-h-[560px] overflow-y-auto p-2">
            {state.sessions.length === 0 ? (
              <p className="p-3 text-sm text-foreground-muted">
                No hay sesiones todavía. Abrí un chat nuevo para arrancar.
              </p>
            ) : (
              state.sessions.map((session) => {
                const active = state.activeSessionId === session.id;
                return (
                  <div
                    key={session.id}
                    className={`mb-2 border p-2 ${active ? "border-accent bg-accent-muted/15" : "border-border-subtle"}`}
                  >
                    {renamingId === session.id ? (
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          renameSession(session.id, renameValue).catch((err) =>
                            setError(err.message)
                          );
                        }}
                        className="space-y-2"
                      >
                        <input
                          value={renameValue}
                          onChange={(event) => setRenameValue(event.target.value)}
                          className="h-9 w-full border border-border bg-background px-2 text-sm"
                          aria-label="Renombrar chat"
                        />
                        <div className="flex gap-2 text-xs">
                          <button type="submit" className="border border-border px-2 py-1 hover:border-accent">
                            Guardar
                          </button>
                          <button
                            type="button"
                            className="border border-border px-2 py-1"
                            onClick={() => {
                              setRenamingId(null);
                              setRenameValue("");
                            }}
                          >
                            Cancelar
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="w-full text-left"
                          onClick={() => load(session.id).catch((err) => setError(err.message))}
                        >
                          <div className="text-sm">{session.title}</div>
                          <div className="text-xs font-mono text-foreground-muted mt-1">
                            {new Date(session.updatedAt).toLocaleString("es-AR")}
                          </div>
                        </button>
                        <div className="mt-2 flex gap-2 text-xs">
                          <button
                            type="button"
                            className="text-foreground-muted hover:text-foreground"
                            onClick={() => {
                              setRenamingId(session.id);
                              setRenameValue(session.title);
                            }}
                          >
                            Renombrar
                          </button>
                          <button
                            type="button"
                            className="text-foreground-muted hover:text-red-300"
                            onClick={() => removeSession(session.id).catch((err) => setError(err.message))}
                          >
                            Borrar
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="border border-border-subtle bg-background">
          <div className="border-b border-border-subtle p-4">
            <div className="text-xs font-mono uppercase tracking-wider text-foreground-muted">
              {loading ? "Cargando…" : state.activeSessionId ? "Sesión activa" : "Listo para estudiar"}
            </div>
            <h3 className="font-serif text-2xl mt-1">
              {state.sessions.find((session) => session.id === state.activeSessionId)?.title ||
                "Nuevo chat de examen"}
            </h3>
            <p className="text-xs text-foreground-muted mt-2">
              {state.provider.message}
            </p>
          </div>

          <div ref={threadRef} className="h-[420px] overflow-y-auto p-4 space-y-4">
            {loading && <p className="text-sm text-foreground-muted">Cargando conversación…</p>}
            {!loading && state.messages.length === 0 && (
              <p className="text-sm text-foreground-muted">
                {hasReadable
                  ? "Preguntá sobre la materia, pedí un resumen completo o simulá un parcial."
                  : "Todavía no hay material legible para fundamentar respuestas. Cargá apuntes o examen y te acompaño desde ahí."}
              </p>
            )}
            {state.messages.map((message) => (
              <article key={message.id} className="space-y-1">
                <div className="text-xs font-mono uppercase text-foreground-muted">
                  {message.role === "user" ? "Vos" : "Arquimes"}
                </div>
                <p
                  className={`whitespace-pre-wrap text-sm ${
                    message.isError ? "text-amber-200" : "text-foreground"
                  }`}
                  data-chat-role={message.role}
                >
                  {message.content}
                </p>
                {message.citations && message.citations.length > 0 && (
                  <p className="text-xs font-mono text-foreground-muted">
                    Fuente: {message.citations.join(", ")}
                  </p>
                )}
              </article>
            ))}
          </div>

          <div className="border-t border-border-subtle p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {state.suggestedChips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className="border border-border px-2 py-1 text-xs text-foreground-muted hover:border-accent hover:text-foreground"
                  onClick={() => sendMessage(chip).catch((err) => setError(err.message))}
                >
                  {chip}
                </button>
              ))}
            </div>
            <label htmlFor="chat-composer" className="sr-only">
              Escribí un mensaje
            </label>
            <textarea
              id="chat-composer"
              aria-label="Escribí un mensaje"
              rows={4}
              className="w-full resize-none border border-border bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none"
              placeholder="Preguntá libremente sobre esta materia o pedí un parcial simulado…"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage(draft).catch((err) => setError(err.message));
                }
              }}
            />
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-foreground-muted">
                {state.grounding?.readableCount || 0} fuente(s) legible(s) para fundamentar respuestas.
              </p>
              <button
                type="button"
                className="bg-accent px-4 py-2 text-sm text-background hover:bg-accent/90 disabled:opacity-50"
                onClick={() => sendMessage(draft).catch((err) => setError(err.message))}
                disabled={sending || !draft.trim()}
                aria-label="Enviar mensaje"
              >
                {sending ? "Enviando…" : "Enviar mensaje"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
