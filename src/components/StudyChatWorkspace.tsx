"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { ChatMarkdown } from "@/components/ChatMarkdown";
import { CompactChatComposer } from "@/components/CompactChatComposer";
import { normalizeChatMessage } from "@/lib/chat-message";
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
  const loadSequence = useRef(0);

  const load = useCallback(async (sessionId?: string) => {
    const seq = ++loadSequence.current;
    const params = new URLSearchParams({ materiaId });
    if (sessionId) params.set("sessionId", sessionId);
    const response = await apiFetch(`/api/chat?${params.toString()}`);
    const payload = (await response.json().catch(() => ({}))) as
      | ChatState
      | { error?: string };

    if (!response.ok) {
      throw new Error((payload as { error?: string }).error || "No pude cargar el chat.");
    }
    if (seq !== loadSequence.current) return;

    const data = payload as ChatState;
    setState({
      sessions: Array.isArray(data.sessions) ? data.sessions : [],
      activeSessionId: data.activeSessionId ?? null,
      messages: Array.isArray(data.messages) ? data.messages : [],
      grounding: data.grounding ?? null,
      provider: data.provider ?? emptyState.provider,
    });
  }, [materiaId]);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) {
        setLoading(true);
        setError(null);
      }
    });
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
  }, [load]);

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
    const cleanContent = content.trim();
    if (!cleanContent || sending) return;
    const optimisticId = `optimistic-${crypto.randomUUID()}`;
    const activeSessionId = state.activeSessionId;
    const optimisticMessage: ChatMessage = {
      id: optimisticId,
      role: "user",
      content: cleanContent,
      createdAt: new Date().toISOString(),
    };

    setSending(true);
    setError(null);
    setDraft("");
    setState((current) => ({
      ...current,
      messages: [...current.messages, optimisticMessage],
    }));

    try {
      const response = await apiFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materiaId,
          sessionId: activeSessionId || undefined,
          content: cleanContent,
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
      setState((current) => {
        const sessions = [
          payload.session!,
          ...current.sessions.filter((session) => session.id !== payload.session!.id),
        ];
        return {
          ...current,
          sessions,
          activeSessionId: payload.session!.id,
          messages: [
            ...current.messages.filter((message) => message.id !== optimisticId),
            ...payload.turn!,
          ],
        };
      });
    } catch (sendError) {
      setState((current) => ({
        ...current,
        messages: current.messages.filter((message) => message.id !== optimisticId),
      }));
      setDraft((current) => current || cleanContent);
      throw sendError;
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
    <div className="flex min-h-0 flex-col lg:h-full">
      <div className="mb-2 flex shrink-0 flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-1 font-mono text-xs uppercase tracking-wider text-foreground-muted">
            Chat de estudio
          </div>
          <h2 className="font-serif text-xl">Compañero de preparación</h2>
          <p className="mt-1 hidden max-w-3xl text-sm text-foreground-muted 2xl:block">
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

      <div className="grid min-h-0 grid-cols-1 gap-3 lg:flex-1 lg:grid-cols-[240px_1fr]">
        <section className="flex min-h-0 flex-col border border-border-subtle bg-surface">
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
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
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

        <section className="flex min-h-[680px] min-w-0 flex-col overflow-hidden border border-border-subtle bg-background lg:min-h-0">
          <div className="flex shrink-0 items-end justify-between gap-4 border-b border-border-subtle px-4 py-2">
            <div>
              <div className="font-mono text-xs uppercase tracking-wider text-foreground-muted">
                {loading ? "Cargando…" : state.activeSessionId ? "Sesión activa" : "Listo para estudiar"}
              </div>
              <h3 className="mt-1 font-serif text-xl">
                {state.sessions.find((session) => session.id === state.activeSessionId)?.title ||
                  "Nuevo chat de examen"}
              </h3>
            </div>
            <p className="max-w-64 text-right text-xs text-foreground-muted">
              {state.provider.message}
            </p>
          </div>

          <div
            ref={threadRef}
            className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(243,164,75,0.05),transparent_42%)] p-4 md:p-6"
            aria-live="polite"
          >
            {loading && <p className="text-sm text-foreground-muted">Cargando conversación…</p>}
            {!loading && state.messages.length === 0 && (
              <div className="mx-auto mt-10 max-w-lg border border-border-subtle bg-surface/80 p-5 text-center">
                <p className="font-serif text-xl text-foreground">
                  {hasReadable ? "¿Qué necesitás aprender esta noche?" : "Primero, demos contexto al estudio"}
                </p>
                <p className="mt-2 text-sm leading-6 text-foreground-muted">
                  {hasReadable
                    ? "Puedo mapear el apunte, enseñarte un tema por vez y chequear si quedó claro antes de avanzar."
                    : "Todavía no hay material legible. Cargá apuntes o un examen y voy a enseñar desde esas fuentes, sin inventar el programa."}
                </p>
              </div>
            )}
            {state.messages.map((message) => {
              const renderedMessage = normalizeChatMessage(message);
              const isUser = renderedMessage.role === "user";
              return (
                <article
                  key={renderedMessage.id}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[88%] md:max-w-[78%] ${isUser ? "items-end" : "items-start"} flex flex-col`}>
                    <div className="mb-1.5 px-1 text-xs font-mono uppercase tracking-wider text-foreground-muted">
                      {isUser ? "Vos" : "Arquimes"}
                    </div>
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm leading-6 shadow-lg ${
                        isUser
                          ? "rounded-br-sm bg-accent text-[#17100a]"
                          : renderedMessage.isError
                            ? "rounded-bl-sm border border-amber-400/30 bg-amber-400/10 text-amber-100"
                            : "rounded-bl-sm border border-border bg-surface-elevated text-foreground"
                      }`}
                      data-chat-role={renderedMessage.role}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap">{renderedMessage.content}</p>
                      ) : (
                        <ChatMarkdown>{renderedMessage.content}</ChatMarkdown>
                      )}
                    </div>
                    {renderedMessage.citations &&
                      renderedMessage.citations.length > 0 && (
                      <footer
                        className="mt-2 flex flex-wrap items-center gap-1.5 px-1 text-xs text-foreground-muted"
                        aria-label="Fuentes de la respuesta"
                      >
                        <span className="font-mono uppercase tracking-wider">
                          Fuentes
                        </span>
                        {renderedMessage.citations.map((citation) => (
                          <span
                            key={citation}
                            className="rounded-full border border-border bg-surface px-2 py-0.5"
                          >
                            {citation}
                          </span>
                        ))}
                      </footer>
                    )}
                  </div>
                </article>
              );
            })}
            {sending && (
              <article className="flex justify-start" data-chat-thinking="true">
                <div className="flex max-w-[78%] flex-col items-start">
                  <div className="mb-1.5 px-1 text-xs font-mono uppercase tracking-wider text-foreground-muted">
                    Arquimes
                  </div>
                  <div
                    role="status"
                    className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-border bg-surface-elevated px-4 py-3 text-sm text-foreground-muted"
                  >
                    <span>Pensando</span>
                    <span className="flex gap-1" aria-hidden="true">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent" />
                    </span>
                  </div>
                </div>
              </article>
            )}
          </div>

          <div className="shrink-0 border-t border-border-subtle bg-background p-2">
            <CompactChatComposer
              id="chat-composer"
              value={draft}
              placeholder="Escribí un mensaje…"
              sending={sending}
              onChange={setDraft}
              onSend={() =>
                sendMessage(draft).catch((err) => setError(err.message))
              }
            />
          </div>
        </section>
      </div>
    </div>
  );
}
