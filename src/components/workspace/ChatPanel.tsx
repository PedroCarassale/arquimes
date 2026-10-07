"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { ChatMarkdown } from "@/components/ChatMarkdown";
import { CompactChatComposer } from "@/components/CompactChatComposer";
import type { ComposerUploadChip } from "@/components/CompactChatComposer";
import { normalizeChatMessage } from "@/lib/chat-message";
import { splitArtefactoMarkers } from "@/lib/artefactos";
import { uploadApunteFile, validateApunteFile } from "@/lib/apunte-upload";
import { materialViewerRoute } from "@/lib/material-viewer";
import type { ArtefactoTipo, ChatMessage, ChatSession, GroundingPayload } from "@/lib/types";
import { useWorkspace } from "./WorkspaceContext";

type ArtefactoRef = { id: string; titulo: string; tipo: ArtefactoTipo; version: number };

type ChatState = {
  sessions: ChatSession[];
  activeSessionId: string | null;
  messages: ChatMessage[];
  grounding: GroundingPayload | null;
  provider: { configured: boolean; message: string };
};

const SUGERENCIAS = [
  "Armame un simulacro de examen con corrección",
  "Resumime mis notas en una guía de estudio",
  "Explicame el tema que más me cuesta, paso a paso",
  "¿Qué me falta para estar preparado?",
];

const FOCUS_LABEL = {
  nota: "Nota",
  artefacto: "Generado",
  material: "Archivo",
  examen: "Evaluación",
} as const;

export function ChatPanel() {
  const router = useRouter();
  const {
    materiaId,
    focus,
    focusEnabled,
    setFocusEnabled,
    closeChat,
    registerAsk,
    refreshToken,
    bumpRefresh,
  } = useWorkspace();
  const [state, setState] = useState<ChatState>({
    sessions: [],
    activeSessionId: null,
    messages: [],
    grounding: null,
    provider: { configured: true, message: "" },
  });
  const [artefactos, setArtefactos] = useState<Map<string, ArtefactoRef>>(new Map());
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [uploadChip, setUploadChip] = useState<ComposerUploadChip | null>(null);
  const [uploadFeedback, setUploadFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const loadSeq = useRef(0);
  const sendRef = useRef<(text: string) => Promise<void>>(async () => {});

  const load = useCallback(
    async (sessionId?: string) => {
      const seq = ++loadSeq.current;
      const params = new URLSearchParams({ materiaId });
      if (sessionId) params.set("sessionId", sessionId);
      const response = await apiFetch(`/api/chat?${params}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "No pude cargar el chat.");
      if (seq !== loadSeq.current) return;
      setState({
        sessions: payload.sessions ?? [],
        activeSessionId: payload.activeSessionId ?? null,
        messages: payload.messages ?? [],
        grounding: payload.grounding ?? null,
        provider: payload.provider ?? { configured: true, message: "" },
      });
    },
    [materiaId]
  );

  useEffect(() => {
    load()
      .catch((err) => setError(err instanceof Error ? err.message : "No pude cargar el chat."))
      .finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    apiFetch(`/api/materias/${materiaId}/artefactos`)
      .then((response) => (response.ok ? response.json() : null))
      .then((list: ArtefactoRef[] | null) => {
        if (!cancelled && list) setArtefactos(new Map(list.map((a) => [a.id, a])));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [materiaId, refreshToken]);

  useEffect(() => {
    const thread = threadRef.current;
    if (thread) thread.scrollTop = thread.scrollHeight;
  }, [state.messages, sending]);

  const sourceLinks = useMemo(() => {
    const map = new Map<string, string>();
    for (const source of state.grounding?.sources || []) {
      if (map.has(source.name)) continue;
      if (source.notaId) map.set(source.name, `/materias/${materiaId}/notas/${source.notaId}`);
      else if (source.materialId)
        map.set(
          source.name,
          materialViewerRoute({ materiaId, materialId: source.materialId })
        );
    }
    return map;
  }, [state.grounding, materiaId]);

  const activeFocus = focus && focusEnabled ? focus : null;

  const sendMessage = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || sending) return;
      const optimisticId = `optimistic-${crypto.randomUUID()}`;
      setSending(true);
      setError(null);
      setDraft("");
      setState((current) => ({
        ...current,
        messages: [
          ...current.messages,
          { id: optimisticId, role: "user", content, createdAt: new Date().toISOString() },
        ],
      }));
      try {
        const response = await apiFetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            materiaId,
            sessionId: state.activeSessionId || undefined,
            content,
            focus: activeFocus ? { kind: activeFocus.kind, id: activeFocus.id } : undefined,
          }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.turn || !payload.session) {
          throw new Error(payload.error || "No pude enviar el mensaje.");
        }
        const created = (payload.artefactos ?? []) as ArtefactoRef[];
        if (created.length) {
          setArtefactos((current) => {
            const next = new Map(current);
            for (const a of created) next.set(a.id, a);
            return next;
          });
        }
        setState((current) => ({
          ...current,
          sessions: [
            payload.session,
            ...current.sessions.filter((s) => s.id !== payload.session.id),
          ],
          activeSessionId: payload.session.id,
          messages: [
            ...current.messages.filter((m) => m.id !== optimisticId),
            ...payload.turn,
          ],
        }));
        if (created.length) {
          bumpRefresh();
          if (window.matchMedia("(min-width: 1024px)").matches) {
            router.push(`/materias/${materiaId}/generados/${created[0].id}`);
          }
          router.refresh();
        }
      } catch (err) {
        setState((current) => ({
          ...current,
          messages: current.messages.filter((m) => m.id !== optimisticId),
        }));
        setDraft((current) => current || content);
        setError(err instanceof Error ? err.message : "No pude enviar el mensaje.");
      } finally {
        setSending(false);
      }
    },
    [activeFocus, bumpRefresh, materiaId, router, sending, state.activeSessionId]
  );

  useEffect(() => {
    sendRef.current = sendMessage;
  }, [sendMessage]);

  useEffect(
    () =>
      registerAsk((text, options) => {
        if (options?.send) void sendRef.current(text);
        else setDraft(text);
      }),
    [registerAsk]
  );

  async function newSession() {
    setSessionsOpen(false);
    setError(null);
    loadSeq.current += 1;
    setState((current) => ({ ...current, activeSessionId: null, messages: [] }));
  }

  async function removeSession(id: string) {
    const response = await apiFetch(`/api/chat/sessions/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setError("No pude borrar el chat.");
      return;
    }
    await load();
  }

  async function attachFiles(files: File[]) {
    for (const file of files) {
      const invalid = validateApunteFile(file);
      const chip = { name: file.name, size: file.size, type: file.type };
      if (invalid) {
        setUploadChip({ ...chip, status: "error" });
        setUploadFeedback({ tone: "error", text: invalid });
        continue;
      }
      setUploadChip({ ...chip, status: "saving" });
      setUploadFeedback(null);
      try {
        await uploadApunteFile(materiaId, file);
        setUploadChip({ ...chip, status: "saved" });
        setUploadFeedback({ tone: "success", text: `Guardado en Material: ${file.name}` });
        router.refresh();
      } catch (err) {
        setUploadChip({ ...chip, status: "error" });
        setUploadFeedback({
          tone: "error",
          text: err instanceof Error ? err.message : `No pude guardar “${file.name}”.`,
        });
      }
    }
    await load(state.activeSessionId || undefined);
  }

  const activeSession = state.sessions.find((s) => s.id === state.activeSessionId);

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="relative flex h-12 shrink-0 items-center gap-1 border-b border-border-subtle px-2">
        <button
          type="button"
          onClick={() => setSessionsOpen((open) => !open)}
          aria-expanded={sessionsOpen}
          className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left hover:bg-surface"
        >
          <span className="truncate text-sm">{activeSession?.title || "Chat nuevo"}</span>
          <span className="shrink-0 font-mono text-[10px] text-foreground-muted">
            {state.sessions.length > 0 ? `▾ ${state.sessions.length}` : ""}
          </span>
        </button>
        <button
          type="button"
          onClick={newSession}
          className="shrink-0 px-2 py-1.5 font-mono text-xs uppercase tracking-wider text-foreground-muted hover:bg-surface hover:text-foreground"
          title="Nuevo chat"
        >
          + Nuevo
        </button>
        <button
          type="button"
          onClick={closeChat}
          aria-label="Cerrar chat"
          title="Cerrar chat"
          className="flex h-8 w-8 shrink-0 items-center justify-center text-foreground-muted hover:bg-surface hover:text-foreground"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        {sessionsOpen && (
          <div className="absolute left-2 right-2 top-full z-20 mt-1 max-h-80 overflow-y-auto border border-border bg-surface-elevated shadow-xl">
            {state.sessions.length === 0 ? (
              <p className="p-3 text-sm text-foreground-muted">Todavía no hay chats guardados.</p>
            ) : (
              state.sessions.map((session) => (
                <div
                  key={session.id}
                  className={`group flex items-center gap-2 border-b border-border-subtle px-3 py-2 last:border-b-0 ${
                    session.id === state.activeSessionId ? "bg-accent-muted/40" : "hover:bg-surface"
                  }`}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => {
                      setSessionsOpen(false);
                      load(session.id).catch((err) => setError(err.message));
                    }}
                  >
                    <div className="truncate text-sm">{session.title}</div>
                    <div className="font-mono text-[10px] text-foreground-muted">
                      {new Date(session.updatedAt).toLocaleString("es-AR", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeSession(session.id)}
                    className="shrink-0 text-xs text-foreground-subtle opacity-0 hover:text-red-300 group-hover:opacity-100 focus:opacity-100"
                  >
                    Borrar
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div ref={threadRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-4 sm:px-4" aria-live="polite">
        {loading ? (
          <p className="font-mono text-xs uppercase tracking-wider text-foreground-muted">Cargando chat…</p>
        ) : state.messages.length === 0 ? (
          <EmptyChat
            hasReadable={(state.grounding?.readableCount ?? 0) > 0}
            onPick={(text) => void sendMessage(text)}
            materiaId={materiaId}
          />
        ) : (
          state.messages.map((raw) => {
            const message = normalizeChatMessage(raw);
            const isUser = message.role === "user";
            if (isUser) {
              return (
                <div key={message.id} className="flex justify-end">
                  <p className="max-w-[88%] whitespace-pre-wrap bg-surface-elevated px-3.5 py-2.5 text-sm leading-6">
                    {message.content}
                  </p>
                </div>
              );
            }
            return (
              <article
                key={message.id}
                data-chat-role="assistant"
                className={`text-sm leading-6 ${message.isError ? "border-l-2 border-accent/60 pl-3 text-foreground-muted" : ""}`}
              >
                {splitArtefactoMarkers(message.content).map((part, index) =>
                  part.kind === "text" ? (
                    <ChatMarkdown key={index}>{part.text}</ChatMarkdown>
                  ) : (
                    <ArtefactoCard
                      key={index}
                      materiaId={materiaId}
                      artefacto={artefactos.get(part.id)}
                      id={part.id}
                      onOpen={closeChatOnMobile(closeChat)}
                    />
                  )
                )}
                {message.citations && message.citations.length > 0 && (
                  <footer className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-foreground-muted">
                    <span className="font-mono uppercase tracking-wider">Fuentes</span>
                    {message.citations.map((citation) => {
                      const href = sourceLinks.get(citation);
                      return href ? (
                        <Link key={citation} href={href} className="border border-border px-1.5 py-0.5 text-accent hover:border-accent">
                          {citation}
                        </Link>
                      ) : (
                        <span key={citation} className="border border-border px-1.5 py-0.5">
                          {citation}
                        </span>
                      );
                    })}
                  </footer>
                )}
              </article>
            );
          })
        )}
        {sending && (
          <div role="status" className="flex items-center gap-2 text-sm text-foreground-muted" data-chat-thinking="true">
            <span className="flex gap-1" aria-hidden="true">
              <span className="h-1.5 w-1.5 animate-bounce bg-accent [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce bg-accent [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce bg-accent" />
            </span>
            Pensando… si estoy armando un documento puede tardar un poco.
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mx-3 mb-2 border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {error}
        </p>
      )}
      {!state.provider.configured && (
        <p className="mx-3 mb-2 border border-accent/40 bg-accent-muted px-3 py-2 text-xs text-foreground">
          {state.provider.message}
        </p>
      )}

      <div className="shrink-0 border-t border-border-subtle p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {focus && (
          <div className="mb-2 flex items-center gap-2 px-1 text-xs">
            <button
              type="button"
              onClick={() => setFocusEnabled(!focusEnabled)}
              aria-pressed={focusEnabled}
              title={focusEnabled ? "El chat ve este documento. Click para quitarlo." : "Click para que el chat vea este documento."}
              className={`flex min-w-0 items-center gap-1.5 border px-2 py-1 ${
                focusEnabled
                  ? "border-accent/50 text-foreground"
                  : "border-border-subtle text-foreground-subtle line-through"
              }`}
            >
              <span className="font-mono uppercase tracking-wider text-accent">{FOCUS_LABEL[focus.kind]}</span>
              <span className="truncate">{focus.titulo}</span>
            </button>
          </div>
        )}
        <CompactChatComposer
          id="chat-composer"
          value={draft}
          placeholder={activeFocus ? "Preguntá sobre lo que estás viendo…" : "Preguntá o pedí un examen de práctica…"}
          sending={sending}
          onChange={setDraft}
          onSend={() => void sendMessage(draft)}
          onAttachFiles={(files) => void attachFiles(files)}
          uploadChip={uploadChip}
          uploadFeedback={uploadFeedback}
        />
      </div>
    </div>
  );
}

function closeChatOnMobile(closeChat: () => void) {
  return () => {
    if (!window.matchMedia("(min-width: 1024px)").matches) closeChat();
  };
}

function ArtefactoCard({
  materiaId,
  artefacto,
  id,
  onOpen,
}: {
  materiaId: string;
  artefacto?: ArtefactoRef;
  id: string;
  onOpen: () => void;
}) {
  if (!artefacto) {
    return (
      <div className="my-3 border border-dashed border-border px-3 py-2 text-xs text-foreground-muted">
        Documento borrado
      </div>
    );
  }
  return (
    <Link
      href={`/materias/${materiaId}/generados/${id}`}
      onClick={onOpen}
      className="group my-3 flex items-center gap-3 border border-border bg-surface px-3 py-3 transition-colors hover:border-accent"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-border-subtle font-mono text-[10px] uppercase text-accent">
        {artefacto.tipo === "examen" ? "Ex" : "Doc"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-foreground">{artefacto.titulo}</span>
        <span className="block font-mono text-[10px] uppercase tracking-wider text-foreground-muted">
          {artefacto.tipo === "examen" ? "Examen interactivo" : "Documento"} · v{artefacto.version}
        </span>
      </span>
      <span className="shrink-0 text-xs text-foreground-muted group-hover:text-accent">Abrir →</span>
    </Link>
  );
}

function EmptyChat({
  hasReadable,
  onPick,
  materiaId,
}: {
  hasReadable: boolean;
  onPick: (text: string) => void;
  materiaId: string;
}) {
  return (
    <div className="pt-6">
      <p className="font-serif text-2xl leading-tight">¿En qué te ayudo hoy?</p>
      <p className="mt-2 text-sm leading-6 text-foreground-muted">
        {hasReadable
          ? "Leo tus notas, tu material y tus exámenes. Pedime explicaciones, o un examen de práctica y lo armo al lado."
          : "Todavía no tengo nada que leer en esta materia. Escribí una nota, subí material o cargá un examen con sus temas."}
      </p>
      {hasReadable ? (
        <div className="mt-5 flex flex-col gap-2">
          {SUGERENCIAS.map((text) => (
            <button
              key={text}
              type="button"
              onClick={() => onPick(text)}
              className="border border-border-subtle px-3 py-2 text-left text-sm text-foreground-muted transition-colors hover:border-accent hover:text-foreground"
            >
              {text}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-5 flex flex-wrap gap-2 text-sm">
          <Link href={`/materias/${materiaId}/notas`} className="border border-border px-3 py-2 hover:border-accent">
            Escribir una nota
          </Link>
          <Link href={`/materias/${materiaId}/apuntes`} className="border border-border px-3 py-2 hover:border-accent">
            Subir material
          </Link>
          <Link href={`/materias/${materiaId}/examenes/nuevo`} className="border border-border px-3 py-2 hover:border-accent">
            Cargar examen
          </Link>
        </div>
      )}
    </div>
  );
}
