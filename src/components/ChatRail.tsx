"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { ChatMessage, GroundingPayload } from "@/lib/types";

export function ChatRail() {
  const pathname = usePathname();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [grounding, setGrounding] = useState<GroundingPayload | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
    if (!materiaId) return;
    let cancelled = false;

    async function refreshGrounding() {
      const res = await apiFetch(
        `/api/chat?materiaId=${encodeURIComponent(materiaId)}`
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
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || "No pude enviar");
      }
      const turn = data as ChatMessage[];
      setMessages((prev) => [...prev, ...turn]);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pude enviar el mensaje");
    } finally {
      setSending(false);
    }
  }

  const sourceNames = grounding?.sources.map((s) => s.name) ?? [];
  const hasReadable = (grounding?.readableCount ?? 0) > 0;

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
        {messages.map((message) => (
          <div key={message.id}>
            <div className="text-xs font-mono text-foreground-muted uppercase mb-1">
              {message.role === "user" ? "Vos" : "Arquimes"}
            </div>
            <p
              className="text-sm whitespace-pre-wrap"
              data-chat-role={message.role}
            >
              {message.content}
            </p>
            {message.role === "assistant" &&
              message.citations &&
              message.citations.length > 0 && (
                <p className="text-xs font-mono text-foreground-muted mt-1">
                  Fuente: {message.citations.join(", ")}
                </p>
              )}
          </div>
        ))}
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
        <label htmlFor="chat-composer" className="sr-only">
          Escribí un mensaje
        </label>
        <textarea
          id="chat-composer"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={composerPlaceholder(materiaId, hasReadable)}
          aria-label="Escribí un mensaje"
          rows={3}
          className="w-full p-2 bg-surface border border-border text-sm text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent resize-none mb-2"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || !draft.trim()}
          aria-label="Enviar mensaje"
          className="w-full h-9 bg-accent text-background text-sm hover:bg-accent/90 disabled:opacity-50"
        >
          {sending ? "Enviando…" : "Enviar"}
        </button>
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
