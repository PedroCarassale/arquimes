"use client";

import { MateriaLayoutSkeleton } from "@/components/MateriaLayoutSkeleton";
import { CompactChatComposer } from "@/components/CompactChatComposer";
import {
  StudyChatLoadingSessions,
  StudyChatLoadingThread,
} from "@/components/StudyChatLoading";

function noop() {}

export default function ChatLoading() {
  return (
    <MateriaLayoutSkeleton immersive>
      {({ snapshot }) => (
        <div className="flex h-full min-h-0 flex-col">
          <div className="mb-2 flex shrink-0 flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div className="hidden md:block">
              <div className="mb-1 font-mono text-xs uppercase tracking-wider text-foreground-muted">
                Chat de estudio
              </div>
              <h2 className="font-serif text-xl">Compañero de preparación</h2>
              <p className="mt-1 hidden max-w-3xl text-sm text-foreground-muted 2xl:block">
                Cargá información del examen y preguntá libremente. El chat usa tus apuntes,
                archivo de examen, nota y temas.
              </p>
            </div>
            <div className="-mx-3 flex gap-2 overflow-x-auto px-3 text-xs font-mono uppercase tracking-wider [scrollbar-width:none] sm:mx-0 sm:gap-3 sm:px-0">
              <span className="shrink-0 whitespace-nowrap border border-border px-3 py-2">1) Cargar apuntes</span>
              <span className="shrink-0 whitespace-nowrap border border-border px-3 py-2">2) Cargar examen</span>
              <span className="shrink-0 whitespace-nowrap border border-border px-3 py-2">3) Definir temas</span>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-2 lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-3">
            <section className="flex min-h-0 flex-col border border-border-subtle bg-surface max-lg:shrink-0">
              <div className="flex gap-2 border-b border-border-subtle p-2 lg:p-3">
                <div className="flex-1 bg-accent px-3 py-2 text-center text-sm text-background">
                  + Nuevo chat
                </div>
                <div className="border border-border px-3 py-2 text-sm text-foreground-muted lg:hidden">
                  Historial
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-2 max-lg:hidden">
                <StudyChatLoadingSessions
                  count={Math.min(snapshot.chatSessionsCount ?? 2, 8)}
                />
              </div>
            </section>

            <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border border-border-subtle bg-background">
              <div className="flex shrink-0 items-end justify-between gap-4 border-b border-border-subtle px-3 py-2 sm:px-4">
                <div>
                  <div className="font-mono text-xs uppercase tracking-wider text-foreground-muted">
                    Cargando…
                  </div>
                  <h3 className="mt-1 truncate font-serif text-lg sm:text-xl">Nuevo chat de examen</h3>
                </div>
                <p className="hidden max-w-64 text-right text-xs text-foreground-muted sm:block">
                  Cargando proveedor…
                </p>
              </div>

              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(243,164,75,0.05),transparent_42%)] p-3 sm:p-4 md:p-6">
                <StudyChatLoadingThread />
              </div>

              <div className="shrink-0 border-t border-border-subtle bg-background p-2">
                <CompactChatComposer
                  id="chat-composer-skeleton"
                  value=""
                  placeholder="Escribí un mensaje…"
                  sending={false}
                  onChange={noop}
                  onSend={noop}
                />
              </div>
            </section>
          </div>
        </div>
      )}
    </MateriaLayoutSkeleton>
  );
}
