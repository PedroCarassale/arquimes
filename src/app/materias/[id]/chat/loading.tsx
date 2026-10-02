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
              <span className="border border-border px-3 py-2">1) Cargar apuntes</span>
              <span className="border border-border px-3 py-2">2) Cargar examen</span>
              <span className="border border-border px-3 py-2">3) Definir temas</span>
            </div>
          </div>

          <div className="grid min-h-0 grid-cols-1 gap-3 lg:flex-1 lg:grid-cols-[240px_1fr]">
            <section className="flex min-h-0 flex-col border border-border-subtle bg-surface">
              <div className="border-b border-border-subtle p-3">
                <div className="w-full bg-accent px-3 py-2 text-center text-sm text-background">
                  + Nuevo chat
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-2">
                <StudyChatLoadingSessions
                  count={Math.min(snapshot.chatSessionsCount ?? 2, 8)}
                />
              </div>
            </section>

            <section className="flex min-h-[680px] min-w-0 flex-col overflow-hidden border border-border-subtle bg-background lg:min-h-0">
              <div className="flex shrink-0 items-end justify-between gap-4 border-b border-border-subtle px-4 py-2">
                <div>
                  <div className="font-mono text-xs uppercase tracking-wider text-foreground-muted">
                    Cargando…
                  </div>
                  <h3 className="mt-1 font-serif text-xl">Nuevo chat de examen</h3>
                </div>
                <p className="max-w-64 text-right text-xs text-foreground-muted">
                  Cargando proveedor…
                </p>
              </div>

              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(243,164,75,0.05),transparent_42%)] p-4 md:p-6">
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
