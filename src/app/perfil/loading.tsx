"use client";

import { AppShell } from "@/components/AppShell";
import { Bone, BoneBlock, SkeletonRegion } from "@/components/Skeleton";
import { authClient } from "@/lib/auth-client";

const inputClass =
  "flex h-11 w-full items-center border border-border bg-background px-3 text-sm";

export default function PerfilLoading() {
  const { data: session } = authClient.useSession();
  const name = session?.user?.name?.trim();
  const email = session?.user?.email;
  const image =
    typeof session?.user?.image === "string" && session.user.image.trim()
      ? session.user.image
      : null;

  return (
    <AppShell>
      <SkeletonRegion className="mx-auto w-full max-w-3xl p-6 md:p-10">
        <header className="mb-8 border-b border-border-subtle pb-5">
          <p className="font-mono text-xs uppercase tracking-wider text-foreground-muted">Perfil</p>
          <h1 className="mt-2 font-serif text-4xl">Configuración de cuenta</h1>
          <p className="mt-2 text-sm text-foreground-muted">
            Actualizá tu identidad, tu contraseña y tu avatar.
          </p>
        </header>

        <section className="mb-6 rounded-xl border border-border-subtle bg-surface p-4 md:p-5">
          <h2 className="font-serif text-2xl">Identidad</h2>
          <p className="mt-1 text-sm text-foreground-muted">El email es fijo en esta versión.</p>
          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-wider text-foreground-muted">Nombre</span>
              <div className={inputClass}>{name ?? <Bone className="w-32" />}</div>
            </div>
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-wider text-foreground-muted">Email</span>
              <div className={`${inputClass} border-border-subtle text-foreground-muted`}>
                {email ?? <Bone className="w-48" />}
              </div>
            </div>
            <span className="inline-flex h-11 items-center bg-accent px-4 text-sm font-mono uppercase tracking-wider text-background">
              Guardar nombre
            </span>
          </div>
        </section>

        <section className="mb-6 rounded-xl border border-border-subtle bg-surface p-4 md:p-5">
          <h2 className="font-serif text-2xl">Avatar</h2>
          <p className="mt-1 text-sm text-foreground-muted">
            Usá una imagen cuadrada para mejor resultado.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            {image ? (
              <img
                src={image}
                alt=""
                className="h-20 w-20 rounded-full border border-border object-cover"
              />
            ) : name ? (
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-border bg-surface-elevated text-xl font-medium">
                {name[0]?.toUpperCase()}
              </div>
            ) : (
              <BoneBlock className="h-20 w-20 rounded-full" />
            )}
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex h-10 items-center border border-border px-3 text-sm text-foreground-muted">
                Subir avatar
              </span>
              <span className="inline-flex h-10 items-center border border-border px-3 text-sm text-foreground-muted opacity-60">
                Quitar avatar
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border-subtle bg-surface p-4 md:p-5">
          <h2 className="font-serif text-2xl">Contraseña</h2>
          <div className="mt-5 space-y-4">
            {["Contraseña actual", "Nueva contraseña", "Confirmar nueva contraseña"].map(
              (label) => (
                <div key={label} className="space-y-2">
                  <span className="text-xs uppercase tracking-wider text-foreground-muted">{label}</span>
                  <div className={inputClass} />
                </div>
              )
            )}
            <span className="inline-flex h-11 items-center bg-accent px-4 text-sm font-mono uppercase tracking-wider text-background">
              Cambiar contraseña
            </span>
          </div>
        </section>
      </SkeletonRegion>
    </AppShell>
  );
}
