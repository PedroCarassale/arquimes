"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { ChatMarkdown } from "@/components/ChatMarkdown";
import { CompactChatComposer } from "@/components/CompactChatComposer";
import type { ComposerUploadChip } from "@/components/CompactChatComposer";
import { normalizeChatMessage } from "@/lib/chat-message";
import { uploadApunteFile, validateApunteFile } from "@/lib/apunte-upload";
import { materialViewerRoute } from "@/lib/material-viewer";
import type { ChatMessage, GroundingPayload } from "@/lib/types";

export function ChatRail() {
  const pathname = usePathname();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [grounding, setGrounding] = useState<GroundingPayload | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadChip, setUploadChip] = useState<ComposerUploadChip | null>(null);
  const [uploadChipHref, setUploadChipHref] = useState<string | null>(null);
  const [uploadFeedback, setUploadFeedback] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  const rawId = pathname.match(/^\/materias\/([^/]+)/)?.[1];
  const materiaId = rawId && rawId !== "nueva" ? rawId : undefined;

  useEffect(() => {
    let cancelled = false;

    async function load(showLoading: boolean) {
      if (showLoading) setLoading(true);
      setError(null);
      const path = materiaId
        ? `/api/chat?materiaId=${encodeURIComponent(materiaId)}`
        : "/api/chat";
      const res = await apiFetch(path);
      if (!res.ok) {
        if (!cancelled) {
          setError("No pude cargar el chat");
          setLoading(false);
        }
        return;
      }
      const data = (await res.json()) as {
        messages?: ChatMessage[];
        grounding?: GroundingPayload | null;
      };
      if (cancelled) return;
      setMessages(Array.isArray(data.messages) ? data.messages : []);
      setGrounding(data.grounding ?? null);
      setLoading(false);
    }

    load(true);
    return () => {
      cancelled = true;
    };
  }, [materiaId]);

  useEffect(() => {
    const id = materiaId ?? "";
    if (!id) return;
    let cancelled = false;

    async function refreshGrounding() {
      const res = await apiFetch(
        `/api/chat?materiaId=${encodeURIComponent(id)}`
      );
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as {
        grounding?: GroundingPayload | null;
        messages?: ChatMessage[];
      };
      if (cancelled) return;
      setGrounding(data.grounding ?? null);
      if (Array.isArray(data.messages)) setMessages(data.messages);
    }

    refreshGrounding();
    return () => {
      cancelled = true;
    };
  }, [materiaId, pathname]);

  useEffect(() => {
    const node = threadRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, sending]);

  async function handleSend() {
    const content = draft.trim();
    if (!content || sending) return;

    setSending(true);
    setError(null);

    try {
      const res = await apiFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          materiaId,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        turn?: ChatMessage[];
      };
      if (!res.ok) {
        throw new Error(data.error || "No pude enviar");
      }
      if (!Array.isArray(data.turn)) {
        throw new Error("El chat devolvió una respuesta incompleta.");
      }
      setMessages((prev) => [...prev, ...data.turn!]);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pude enviar el mensaje");
    } finally {
      setSending(false);
    }
  }

  async function handleAttachFiles(files: File[]) {
    if (files.length === 0) return;
    if (!materiaId) {
      setUploadFeedback({
        tone: "error",
        text: "Abrí una materia para guardar apuntes desde el chat.",
      });
      return;
    }

    let savedCount = 0;
    for (const file of files) {
      const validationError = validateApunteFile(file);
      if (validationError) {
        setUploadChip({
          name: file.name,
          size: file.size,
          type: file.type,
          status: "error",
        });
        setUploadFeedback({ tone: "error", text: validationError });
        continue;
      }
      setUploadChip({
        name: file.name,
        size: file.size,
        type: file.type,
        status: "saving",
      });
      setUploadChipHref(null);
      setUploadFeedback(null);
      try {
        const uploaded = await uploadApunteFile(materiaId, file);
        savedCount += 1;
        setUploadChip({
          name: file.name,
          size: file.size,
          type: file.type,
          status: "saved",
        });
        setUploadChipHref(
          materialViewerRoute({
            materiaId,
            materialId: uploaded.id,
            volver: `/materias/${materiaId}/chat`,
            etiqueta: "Volver al chat",
          })
        );
        setUploadFeedback({
          tone: "success",
          text: `Apunte guardado: ${file.name}`,
        });
      } catch (uploadError) {
        setUploadChip({
          name: file.name,
          size: file.size,
          type: file.type,
          status: "error",
        });
        setUploadChipHref(null);
        setUploadFeedback({
          tone: "error",
          text:
            uploadError instanceof Error
              ? uploadError.message
              : `No pude guardar “${file.name}”.`,
        });
      }
    }

    if (savedCount > 0) {
      const res = await apiFetch(`/api/chat?materiaId=${encodeURIComponent(materiaId)}`);
      if (!res.ok) return;
      const data = (await res.json()) as {
        grounding?: GroundingPayload | null;
        messages?: ChatMessage[];
      };
      setGrounding(data.grounding ?? null);
      if (Array.isArray(data.messages)) setMessages(data.messages);
    }
  }

  const sourceNames = grounding?.sources.map((s) => s.name) ?? [];
  const hasReadable = (grounding?.readableCount ?? 0) > 0;
  const citationMaterialMap = new Map<string, string>();
  for (const source of grounding?.sources || []) {
    if (source.materialId && !citationMaterialMap.has(source.name)) {
      citationMaterialMap.set(source.name, source.materialId);
    }
  }

  return (
    <aside
      id="estudio-chat"
      aria-label="Chat de estudio"
      className="fixed right-0 top-0 bottom-0 w-[280px] border-l border-border-subtle bg-background flex flex-col"
      role="complementary"
    >
      <div className="p-4 border-b border-border-subtle">
        <div className="text-xs font-mono text-foreground-muted uppercase tracking-wider mb-1">
          Chat de estudio
        </div>
        <h2 className="font-serif text-lg">
          {grounding?.materiaName || "Estudio"}
        </h2>
        <p className="text-xs text-foreground-muted mt-1">
          {headerCopy(materiaId, grounding)}
        </p>
      </div>

      <div ref={threadRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && (
          <p className="text-sm text-foreground-muted">Cargando el hilo…</p>
        )}
        {!loading && messages.length === 0 && (
          <p className="text-sm text-foreground-muted">
            {emptyThreadCopy(materiaId, grounding, hasReadable, sourceNames)}
          </p>
        )}
        {messages.map((message) => {
          const renderedMessage = normalizeChatMessage(message);
          return (
            <div key={renderedMessage.id}>
              <div className="text-xs font-mono text-foreground-muted uppercase mb-1">
                {renderedMessage.role === "user" ? "Vos" : "Arquimes"}
              </div>
              <div
                className="text-sm"
                data-chat-role={renderedMessage.role}
              >
                {renderedMessage.role === "assistant" ? (
                  <ChatMarkdown>{renderedMessage.content}</ChatMarkdown>
                ) : (
                  <p className="whitespace-pre-wrap">{renderedMessage.content}</p>
                )}
              </div>
              {renderedMessage.role === "assistant" &&
                renderedMessage.citations &&
                renderedMessage.citations.length > 0 && (
                  <footer
                    className="mt-1.5 flex flex-wrap gap-1 text-xs text-foreground-muted"
                    aria-label="Fuentes de la respuesta"
                  >
                    <span className="font-mono uppercase tracking-wider">
                      Fuentes
                    </span>
                    {renderedMessage.citations.map((citation) => {
                      const materialId = citationMaterialMap.get(citation);
                      if (!materialId || !materiaId) {
                        return (
                          <span
                            key={citation}
                            className="rounded-full border border-border px-1.5 py-0.5"
                          >
                            {citation}
                          </span>
                        );
                      }
                      return (
                        <Link
                          key={citation}
                          href={materialViewerRoute({
                            materiaId,
                            materialId,
                            volver: `/materias/${materiaId}/chat`,
                            etiqueta: "Volver al chat",
                          })}
                          className="rounded-full border border-border px-1.5 py-0.5 text-accent hover:underline"
                        >
                          {citation}
                        </Link>
                      );
                    })}
                  </footer>
                )}
            </div>
          );
        })}
      </div>

      <div className="p-3 border-t border-border-subtle">
        {error && (
          <p role="alert" className="text-xs text-red-500 mb-2">
            {error}
          </p>
        )}
        {!materiaId && (
          <p className="text-xs text-foreground-muted mb-2">
            <Link href="/" className="text-accent hover:underline">
              Tus materias
            </Link>{" "}
            · el chat se ancla a una materia.
          </p>
        )}
        {materiaId && !hasReadable && (
          <p className="text-xs text-foreground-muted mb-2">
            <Link
              href={`/materias/${materiaId}/cargar`}
              className="text-accent hover:underline"
            >
              Cargar apuntes
            </Link>{" "}
            para poder responder desde tu material.
          </p>
        )}
        <CompactChatComposer
          id="rail-chat-composer"
          value={draft}
          placeholder={composerPlaceholder(materiaId, hasReadable)}
          sending={sending}
          onChange={setDraft}
          onAttachFiles={(files) => {
            handleAttachFiles(files).catch((attachError) =>
              setUploadFeedback({
                tone: "error",
                text:
                  attachError instanceof Error
                    ? attachError.message
                    : "No pude guardar el archivo.",
              })
            );
          }}
          uploadChip={uploadChip}
          uploadFeedback={uploadFeedback}
          uploadChipHref={uploadChipHref}
          uploadChipActionLabel="Abrir"
          onSend={handleSend}
        />
      </div>
    </aside>
  );
}

function headerCopy(
  materiaId: string | undefined,
  grounding: GroundingPayload | null
): string {
  if (!materiaId) return "Abrí una materia para anclar el chat.";
  if (!grounding) return "No encuentro esa materia.";
  if (grounding.readableCount > 0) {
    const n = grounding.readableCount;
    return `${n} archivo${n === 1 ? "" : "s"} con texto en esta materia.`;
  }
  if (grounding.sourceCount > 0) {
    return "Hay archivos, pero no pude leer el texto.";
  }
  return "Sin apuntes ni archivos de examen todavía.";
}

function emptyThreadCopy(
  materiaId: string | undefined,
  grounding: GroundingPayload | null,
  hasReadable: boolean,
  sourceNames: string[]
): string {
  if (!materiaId) {
    return "Abrí una materia. El chat responde desde tus apuntes y archivos de examen; no inventa un programa.";
  }
  if (!grounding) {
    return "No encuentro esa materia en tu sesión.";
  }
  if (hasReadable) {
    return `Puedo ayudarte con ${grounding.materiaName} a partir de ${sourceNames.join(", ")}. Preguntá sobre ese material para ver qué cubre respecto del examen.`;
  }
  return `Todavía no hay apuntes ni archivos de examen con texto en ${grounding.materiaName}. Preguntá igual y te lo digo con honestidad; no voy a fingir que estás preparado.`;
}

function composerPlaceholder(
  materiaId: string | undefined,
  hasReadable: boolean
): string {
  if (!materiaId) return "Abrí una materia para preguntar…";
  if (!hasReadable) return "Preguntá: te voy a decir si falta material…";
  return "Preguntá sobre tus apuntes…";
}
