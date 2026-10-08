"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatMarkdown } from "@/components/ChatMarkdown";
import { CompactChatComposer, type ComposerUploadChip } from "@/components/CompactChatComposer";
import {
  ConfirmDialog,
  Icon,
  IconButton,
  MOBILE_QUERY,
  Popover,
  buttonClasses,
  cx,
  toast,
  useMediaQuery,
  type IconName,
} from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { splitArtefactoMarkers } from "@/lib/artefactos";
import { normalizeChatMessage } from "@/lib/chat-message";
import { fechaCorta } from "@/lib/fechas";
import { rutas } from "@/lib/routes";
import { validateStudyFile } from "@/lib/study-upload";
import { tabKey } from "@/lib/tabs";
import type { ArtefactoCreado, ChatMessage, ChatSession, GroundingPayload, WorkspaceFocus } from "@/lib/types";
import { enqueueUploads } from "@/lib/upload-queue";
import { TabLink } from "./TabLink";
import { useWorkspace } from "./WorkspaceContext";
import { useTabs } from "./tabs-store";

type ChatState = {
  sessions: ChatSession[];
  activeSessionId: string | null;
  messages: ChatMessage[];
  grounding: GroundingPayload | null;
  provider: { configured: boolean; message: string };
};

type ChatPart = ReturnType<typeof splitArtefactoMarkers>[number];

const SUGERENCIAS = [
  "Armame un simulacro con corrección",
  "Haceme una guía de estudio con mis apuntes",
  "Explicame paso a paso el tema que más me cuesta",
  "¿Qué fechas tengo cerca y qué entra en cada una?",
];

const FOCUS_META: Record<WorkspaceFocus["kind"], { label: string; icon: IconName }> = {
  nota: { label: "Clase", icon: "clase" },
  artefacto: { label: "Del chat", icon: "generado" },
  material: { label: "Archivo", icon: "apunte" },
  examen: { label: "Evento", icon: "evento" },
};

const DESKTOP_QUERY = "(min-width: 1024px)";

function typingOutsideChat(): boolean {
  const el = document.activeElement;
  if (!el || el.closest("[data-arq-chat]")) return false;
  return el.matches("input, textarea") || Boolean(el.closest('[contenteditable="true"]'));
}

function sessionDate(iso: string): string {
  const day = fechaCorta(iso);
  const time = new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  return day ? `${day} · ${time}` : time;
}

export function ChatPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    materiaId,
    focus,
    focusEnabled,
    setFocusEnabled,
    closeChat,
    mobileChatOpen,
    registerAsk,
    registerComposerFocus,
    refreshToken,
    bumpRefresh,
  } = useWorkspace();
  const { openInBackground } = useTabs();
  const isDesktop = useMediaQuery(DESKTOP_QUERY, true);
  const [state, setState] = useState<ChatState>({
    sessions: [],
    activeSessionId: null,
    messages: [],
    grounding: null,
    provider: { configured: true, message: "" },
  });
  const [artefactos, setArtefactos] = useState<Map<string, ArtefactoCreado>>(new Map());
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [sessionsAnchor, setSessionsAnchor] = useState<HTMLButtonElement | null>(null);
  const [deleting, setDeleting] = useState<ChatSession | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saved, setSaved] = useState<Map<string, string>>(new Map());
  const [uploadChip, setUploadChip] = useState<ComposerUploadChip | null>(null);
  const [uploadFeedback, setUploadFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const loadSeq = useRef(0);
  const sendRef = useRef<(text: string) => Promise<void>>(async () => {});

  const load = useCallback(
    async (sessionId?: string) => {
      const seq = ++loadSeq.current;
      const params = new URLSearchParams({ materiaId });
      if (sessionId) params.set("sessionId", sessionId);
      const response = await apiFetch(`/api/chat?${params}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "No se pudo cargar el chat.");
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
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar el chat."))
      .finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    apiFetch(`/api/materias/${materiaId}/artefactos`)
      .then((response) => (response.ok ? response.json() : null))
      .then((list: ArtefactoCreado[] | null) => {
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

  useEffect(() => registerComposerFocus(() => textareaRef.current?.focus()), [registerComposerFocus]);

  const sourceLinks = useMemo(() => {
    const map = new Map<string, string>();
    for (const source of state.grounding?.sources || []) {
      if (map.has(source.name)) continue;
      if (source.notaId) map.set(source.name, rutas.clase(materiaId, source.notaId));
      else if (source.materialId) map.set(source.name, rutas.archivo(materiaId, source.materialId));
    }
    return map;
  }, [state.grounding, materiaId]);

  const citationHref = useCallback(
    (citation: string) =>
      sourceLinks.get(citation) ??
      (citation.startsWith("Nota · ") ? sourceLinks.get(`Clase · ${citation.slice(7)}`) : undefined),
    [sourceLinks]
  );

  const activeFocus = focus && focusEnabled ? focus : null;

  const closeIfOverlay = useCallback(() => {
    if (mobileChatOpen) closeChat();
  }, [mobileChatOpen, closeChat]);

  const showCreated = useCallback(
    (created: ArtefactoCreado[]) => {
      if (created.length === 0) return;
      bumpRefresh();
      const [first, ...rest] = created;
      for (const artefacto of rest) openInBackground(rutas.generado(materiaId, artefacto.id), artefacto.titulo);
      const href = rutas.generado(materiaId, first.id);
      if (window.matchMedia(MOBILE_QUERY).matches) {
        openInBackground(href, first.titulo);
        return;
      }
      if (typingOutsideChat()) {
        openInBackground(href, first.titulo);
        toast({ message: `Se guardó «${first.titulo}» en Apuntes`, action: { label: "Abrir", href } });
        return;
      }
      if (tabKey(pathname) === tabKey(href)) router.refresh();
      else router.push(href);
    },
    [bumpRefresh, materiaId, openInBackground, pathname, router]
  );

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
          throw new Error(payload.error || "No se pudo enviar el mensaje.");
        }
        const created = (payload.artefactos ?? []) as ArtefactoCreado[];
        if (created.length) {
          setArtefactos((current) => {
            const next = new Map(current);
            for (const a of created) next.set(a.id, a);
            return next;
          });
        }
        setState((current) => ({
          ...current,
          sessions: [payload.session, ...current.sessions.filter((s) => s.id !== payload.session.id)],
          activeSessionId: payload.session.id,
          messages: [...current.messages.filter((m) => m.id !== optimisticId), ...payload.turn],
        }));
        showCreated(created);
      } catch (err) {
        setState((current) => ({
          ...current,
          messages: current.messages.filter((m) => m.id !== optimisticId),
        }));
        setDraft((current) => current || content);
        setError(err instanceof Error ? err.message : "No se pudo enviar el mensaje.");
      } finally {
        setSending(false);
      }
    },
    [activeFocus, materiaId, sending, showCreated, state.activeSessionId]
  );

  useEffect(() => {
    sendRef.current = sendMessage;
  }, [sendMessage]);

  useEffect(
    () =>
      registerAsk((text, options) => {
        if (options?.send) void sendRef.current(text);
        else {
          setDraft(text);
          window.requestAnimationFrame(() => {
            const textarea = textareaRef.current;
            if (!textarea) return;
            textarea.focus();
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
          });
        }
      }),
    [registerAsk]
  );

  function newSession() {
    setSessionsOpen(false);
    setError(null);
    loadSeq.current += 1;
    setState((current) => ({ ...current, activeSessionId: null, messages: [] }));
    window.requestAnimationFrame(() => textareaRef.current?.focus());
  }

  async function removeSession() {
    const session = deleting;
    if (!session) return;
    const response = await apiFetch(`/api/chat/sessions/${session.id}`, { method: "DELETE" });
    setDeleting(null);
    if (!response.ok) {
      toast({ message: "No se pudo borrar el chat.", tone: "error" });
      return;
    }
    await load(session.id === state.activeSessionId ? undefined : state.activeSessionId || undefined).catch((err) =>
      setError(err instanceof Error ? err.message : "No se pudo cargar el chat.")
    );
  }

  async function attachFiles(files: File[]) {
    for (const file of files) {
      const chip = { name: file.name, size: file.size, type: file.type };
      const invalid = validateStudyFile(file);
      if (invalid) {
        setUploadChip({ ...chip, status: "error" });
        setUploadFeedback({ tone: "error", text: invalid });
        continue;
      }
      setUploadChip({ ...chip, status: "saving" });
      setUploadFeedback(null);
      try {
        const [upload] = enqueueUploads(materiaId, [file], { kind: "apuntes" });
        await upload;
        setUploadChip({ ...chip, status: "saved" });
        setUploadFeedback({ tone: "success", text: `Guardado en Apuntes: ${file.name}` });
        bumpRefresh();
      } catch (err) {
        setUploadChip({ ...chip, status: "error" });
        setUploadFeedback({
          tone: "error",
          text: err instanceof Error ? err.message : `No se pudo guardar «${file.name}».`,
        });
      }
    }
    await load(state.activeSessionId || undefined).catch(() => undefined);
  }

  async function copiar(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast({ message: "Copiado como Markdown" });
    } catch {
      toast({ message: "No se pudo copiar.", tone: "error" });
    }
  }

  async function guardarEnApuntes(message: ChatMessage) {
    const existing = saved.get(message.id);
    if (existing) {
      closeIfOverlay();
      router.push(rutas.generado(materiaId, existing));
      return;
    }
    setSavingId(message.id);
    try {
      const response = await apiFetch(`/api/materias/${materiaId}/artefactos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contenido: message.content, sourceMessageId: message.id }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "No se pudo guardar en Apuntes.");
      const creado = payload as ArtefactoCreado;
      const href = rutas.generado(materiaId, creado.id);
      setSaved((current) => new Map(current).set(message.id, creado.id));
      openInBackground(href, creado.titulo);
      bumpRefresh();
      toast({ message: "Guardado en Apuntes", action: { label: "Abrir", href, onClick: closeIfOverlay } });
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : "No se pudo guardar en Apuntes.", tone: "error" });
    } finally {
      setSavingId(null);
    }
  }

  const activeSession = state.sessions.find((s) => s.id === state.activeSessionId);
  const hasReadable = (state.grounding?.readableCount ?? 0) > 0;

  return (
    <div data-arq-chat="" className="flex h-full min-h-0 w-full flex-col bg-background">
      <div className="flex h-10 shrink-0 items-center gap-0.5 border-b border-border-subtle px-1.5">
        <button
          ref={setSessionsAnchor}
          type="button"
          onClick={() => setSessionsOpen((open) => !open)}
          aria-expanded={sessionsOpen}
          aria-haspopup="dialog"
          aria-label={`Chat: ${activeSession?.title || "Chat nuevo"}. Cambiar de chat`}
          className="flex h-7 min-w-0 flex-1 items-center gap-1.5 rounded-sm px-2 text-left transition-colors duration-(--dur-fast) ease-(--ease-out) hover:bg-hover pointer-coarse:h-10"
        >
          <Icon name="chat" size={14} className="text-foreground-muted" />
          <span className="min-w-0 truncate text-[13px] leading-[18px] text-foreground">
            {activeSession?.title || "Chat nuevo"}
          </span>
          <Icon name="chevron-down" size={14} className="text-foreground-subtle" />
          {state.sessions.length > 1 && (
            <span className="ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-hover px-1.5 font-mono text-[11px] text-foreground-muted">
              {state.sessions.length}
            </span>
          )}
        </button>
        <IconButton icon="plus" label="Nuevo chat" size={28} onClick={newSession} />
        <IconButton
          icon={isDesktop ? "panel" : "x"}
          label="Cerrar chat"
          shortcut={isDesktop ? "Ctrl J" : undefined}
          size={28}
          onClick={closeChat}
        />
      </div>

      <Popover
        open={sessionsOpen}
        onClose={() => setSessionsOpen(false)}
        anchor={sessionsAnchor}
        placement="bottom-start"
        width={320}
        title="Chats de esta materia"
      >
        <div className="p-1">
          <button
            type="button"
            onClick={newSession}
            className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm text-foreground transition-colors hover:bg-selected pointer-coarse:h-11"
          >
            <Icon name="plus" size={16} className="text-foreground-muted" />
            Nuevo chat
          </button>
          <div role="separator" className="mx-1 my-1 h-px bg-border-subtle" />
          {state.sessions.length === 0 ? (
            <p className="px-2 py-3 text-[13px] text-foreground-muted">Todavía no hay chats guardados.</p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {state.sessions.map((session) => (
                <li
                  key={session.id}
                  className={cx(
                    "group flex items-center rounded-md transition-colors",
                    session.id === state.activeSessionId ? "bg-selected" : "hover:bg-hover"
                  )}
                >
                  <button
                    type="button"
                    aria-current={session.id === state.activeSessionId ? "true" : undefined}
                    className="min-w-0 flex-1 rounded-md px-2 py-1.5 text-left"
                    onClick={() => {
                      setSessionsOpen(false);
                      load(session.id).catch((err) => setError(err instanceof Error ? err.message : String(err)));
                    }}
                  >
                    <span className="block truncate text-sm text-foreground">{session.title}</span>
                    <span className="block font-mono text-[11px] leading-4 text-foreground-subtle">
                      {sessionDate(session.updatedAt)}
                    </span>
                  </button>
                  <IconButton
                    icon="trash"
                    label="Borrar chat"
                    size={28}
                    tooltipSide="top"
                    onClick={() => {
                      setSessionsOpen(false);
                      setDeleting(session);
                    }}
                    className="mr-1 opacity-0 focus-visible:opacity-100 group-hover:opacity-100 max-md:opacity-100 pointer-coarse:opacity-100"
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </Popover>

      <div ref={threadRef} className="min-h-0 flex-1 space-y-6 overflow-y-auto px-3 py-4 sm:px-4" aria-live="polite">
        {loading ? (
          <p className="font-mono text-[11px] text-foreground-subtle">Cargando chat…</p>
        ) : state.messages.length === 0 ? (
          <EmptyChat
            hasReadable={hasReadable}
            onPick={(text) => void sendMessage(text)}
            materiaId={materiaId}
            onNavigate={closeIfOverlay}
          />
        ) : (
          state.messages.map((raw) => {
            const message = normalizeChatMessage(raw);
            if (message.role === "user") {
              return (
                <div key={message.id} data-chat-role="user" className="flex justify-end">
                  <p className="max-w-[88%] whitespace-pre-wrap rounded-lg bg-surface-elevated px-3.5 py-2.5 text-sm leading-6 text-foreground [overflow-wrap:anywhere]">
                    {message.content}
                  </p>
                </div>
              );
            }
            const parts = splitArtefactoMarkers(message.content);
            const textOnly = parts
              .flatMap((part) => (part.kind === "text" ? [part.text] : []))
              .join("\n\n");
            const canAct = !message.isError && !message.id.startsWith("optimistic-") && textOnly.trim().length > 0;
            return (
              <AssistantMessage
                key={message.id}
                message={message}
                parts={parts}
                materiaId={materiaId}
                artefactos={artefactos}
                citationHref={citationHref}
                onNavigate={closeIfOverlay}
                actions={
                  canAct ? (
                    <>
                      <IconButton
                        icon="copy"
                        label="Copiar"
                        size={28}
                        tooltipSide="top"
                        onClick={() => void copiar(textOnly)}
                      />
                      <IconButton
                        icon={saved.has(message.id) ? "check" : "bookmark"}
                        label={saved.has(message.id) ? "Abrir en Apuntes" : "Guardar en apuntes"}
                        size={28}
                        tooltipSide="top"
                        disabled={savingId === message.id}
                        aria-busy={savingId === message.id || undefined}
                        onClick={() => void guardarEnApuntes(message)}
                      />
                    </>
                  ) : null
                }
              />
            );
          })
        )}
        {sending && (
          <div role="status" className="flex items-center gap-2 text-[13px] text-foreground-muted" data-chat-thinking="true">
            <span className="flex gap-1" aria-hidden="true">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent" />
            </span>
            Pensando… si estoy armando un documento puede tardar un poco.
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mx-3 mb-2 rounded-md bg-danger-muted px-3 py-2 text-xs leading-5 text-danger">
          {error}
        </p>
      )}
      {!state.provider.configured && (
        <p className="mx-3 mb-2 rounded-md bg-accent-muted px-3 py-2 text-xs leading-5 text-foreground">
          {state.provider.message}
        </p>
      )}

      <div className="shrink-0 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1">
        {focus && (
          <div className="mb-1.5 flex items-center gap-2 px-1">
            <button
              type="button"
              onClick={() => setFocusEnabled(!focusEnabled)}
              aria-pressed={focusEnabled}
              title={focusEnabled ? "El chat ve este documento. Tocá para quitarlo." : "Tocá para que el chat vea este documento."}
              className={cx(
                "inline-flex h-6 min-w-0 max-w-full items-center gap-1.5 rounded-full px-2.5 text-xs transition-colors duration-(--dur-fast) ease-(--ease-out) pointer-coarse:h-9",
                focusEnabled
                  ? "bg-selected text-foreground hover:bg-pressed"
                  : "bg-hover text-foreground-subtle line-through hover:text-foreground-muted"
              )}
            >
              <Icon name={FOCUS_META[focus.kind].icon} size={12} className="text-foreground-muted" />
              <span className="shrink-0 font-mono text-[11px] text-foreground-muted">{FOCUS_META[focus.kind].label}</span>
              <span className="min-w-0 truncate">{focus.titulo}</span>
            </button>
          </div>
        )}
        <CompactChatComposer
          id="chat-composer"
          value={draft}
          placeholder={activeFocus ? "Preguntá sobre lo que estás viendo…" : "Preguntá sobre tus clases y apuntes…"}
          sending={sending}
          onChange={setDraft}
          onSend={() => void sendMessage(draft)}
          onAttachFiles={(files) => void attachFiles(files)}
          uploadChip={uploadChip}
          uploadFeedback={uploadFeedback}
          textareaRef={textareaRef}
        />
      </div>

      <ConfirmDialog
        open={deleting !== null}
        title={deleting ? `¿Borrar «${deleting.title}»?` : ""}
        body="No se puede deshacer."
        onConfirm={removeSession}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

function AssistantMessage({
  message,
  parts,
  materiaId,
  artefactos,
  citationHref,
  onNavigate,
  actions,
}: {
  message: ChatMessage;
  parts: ChatPart[];
  materiaId: string;
  artefactos: Map<string, ArtefactoCreado>;
  citationHref: (citation: string) => string | undefined;
  onNavigate: () => void;
  actions: React.ReactNode;
}) {
  return (
    <article
      data-chat-role="assistant"
      className={cx(
        "group text-sm leading-6",
        message.isError && "rounded-md bg-hover px-3 py-2 text-foreground-muted"
      )}
    >
      {parts.map((part, index) =>
        part.kind === "text" ? (
          <ChatMarkdown key={index}>{part.text}</ChatMarkdown>
        ) : (
          <ArtefactoCard
            key={index}
            materiaId={materiaId}
            artefacto={artefactos.get(part.id)}
            id={part.id}
            onOpen={onNavigate}
          />
        )
      )}
      {message.citations && message.citations.length > 0 && (
        <footer className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="t-meta mr-0.5">Fuentes</span>
          {message.citations.map((citation) => {
            const href = citationHref(citation);
            const chip =
              "inline-flex h-6 max-w-full items-center gap-1 rounded-full bg-hover px-2 text-xs text-foreground-muted pointer-coarse:h-9";
            return href ? (
              <TabLink
                key={citation}
                href={href}
                onClick={onNavigate}
                className={cx(chip, "transition-colors duration-(--dur-fast) ease-(--ease-out) hover:bg-selected hover:text-foreground")}
              >
                <Icon name={citation.startsWith("Clase · ") || citation.startsWith("Nota · ") ? "clase" : "apunte"} size={12} />
                <span className="truncate">{citation}</span>
              </TabLink>
            ) : (
              <span key={citation} className={chip}>
                <span className="truncate">{citation}</span>
              </span>
            );
          })}
        </footer>
      )}
      {actions && (
        <div className="mt-1.5 flex items-center gap-0.5 opacity-0 transition-opacity duration-(--dur-fast) focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100 pointer-coarse:opacity-100">
          {actions}
        </div>
      )}
    </article>
  );
}

function ArtefactoCard({
  materiaId,
  artefacto,
  id,
  onOpen,
}: {
  materiaId: string;
  artefacto?: ArtefactoCreado;
  id: string;
  onOpen: () => void;
}) {
  if (!artefacto) {
    return (
      <div className="my-3 rounded-lg border border-dashed border-border-subtle px-3 py-2.5 text-xs text-foreground-muted">
        Este documento ya no está en Apuntes.
      </div>
    );
  }
  const esExamen = artefacto.tipo === "examen";
  return (
    <TabLink
      href={rutas.generado(materiaId, id)}
      onClick={onOpen}
      className="my-3 flex items-center gap-3 rounded-lg border border-border-subtle bg-surface p-2.5 transition-colors duration-(--dur-fast) ease-(--ease-out) hover:border-border hover:bg-surface-elevated"
    >
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-hover text-foreground-muted">
        <Icon name={esExamen ? "examen" : "generado"} size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm leading-5 text-foreground">{artefacto.titulo}</span>
        <span className="block font-mono text-[11px] leading-4 text-foreground-subtle">
          {esExamen ? "Examen" : "Documento"} · v{artefacto.version}
        </span>
      </span>
      <span className={buttonClasses({ variant: "secondary", size: "sm" })}>Abrir</span>
    </TabLink>
  );
}

function EmptyChat({
  hasReadable,
  onPick,
  materiaId,
  onNavigate,
}: {
  hasReadable: boolean;
  onPick: (text: string) => void;
  materiaId: string;
  onNavigate: () => void;
}) {
  const link = buttonClasses({ variant: "secondary", size: "sm" });
  return (
    <div className="pt-4">
      <p className="font-serif text-[26px] leading-8 text-foreground">¿En qué te ayudo?</p>
      <p className="mt-2 text-[13px] leading-5 text-foreground-muted">
        {hasReadable
          ? "Leo tus clases, tus apuntes y tus fechas. Pedime que te explique algo, un resumen o un simulacro, y si querés lo guardo en Apuntes."
          : "Todavía no tengo nada para leer en esta materia. Anotá una clase o subí apuntes y estudiamos con eso."}
      </p>
      {hasReadable ? (
        <div className="mt-5 flex flex-col gap-1.5">
          {SUGERENCIAS.map((text) => (
            <button
              key={text}
              type="button"
              onClick={() => onPick(text)}
              className="rounded-md bg-hover px-3 py-2 text-left text-[13px] leading-5 text-foreground-muted transition-colors duration-(--dur-fast) ease-(--ease-out) hover:bg-selected hover:text-foreground"
            >
              {text}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-5 flex flex-wrap gap-1.5">
          <TabLink href={rutas.clases(materiaId)} onClick={onNavigate} className={link}>
            <Icon name="clase" size={14} />
            Ir a Clases
          </TabLink>
          <TabLink href={rutas.apuntes(materiaId)} onClick={onNavigate} className={link}>
            <Icon name="upload" size={14} />
            Subir apuntes
          </TabLink>
          <TabLink href={rutas.calendario(materiaId, { nuevo: true })} onClick={onNavigate} className={link}>
            <Icon name="calendario" size={14} />
            Cargar fecha
          </TabLink>
        </div>
      )}
    </div>
  );
}
