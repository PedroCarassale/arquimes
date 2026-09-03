"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { ChatMessage } from "@/lib/types";

export function ChatRail() {
  const pathname = usePathname();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const materiaId = pathname.match(/^\/materias\/([^/]+)/)?.[1];

  useEffect(() => {
    async function load() {
      const res = await apiFetch("/api/chat");
      if (res.ok) {
        setMessages(await res.json());
      }
    }
    load();
  }, []);

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
          materiaId: materiaId && materiaId !== "nueva" ? materiaId : undefined,
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

  return (
    <aside
      id="estudio-chat"
      aria-label="Chat de estudio"
      className="fixed right-0 top-0 bottom-0 w-[280px] border-l border-border-subtle bg-background flex flex-col"
    >
      <div className="p-4 border-b border-border-subtle">
        <div className="text-xs font-mono text-foreground-muted uppercase tracking-wider mb-1">
          Chat
        </div>
        <h2 className="font-serif text-lg">Estudio</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-foreground-muted">
            Preguntá lo que quieras. Todavía no leí tus apuntes.
          </p>
        )}
        {messages.map((message) => (
          <div key={message.id}>
            <div className="text-xs font-mono text-foreground-muted uppercase mb-1">
              {message.role === "user" ? "Vos" : "Arquimes"}
            </div>
            <p className="text-sm">{message.content}</p>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-border-subtle">
        {error && (
          <p role="alert" className="text-xs text-red-500 mb-2">
            {error}
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
          placeholder="Preguntá sobre tu materia…"
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
