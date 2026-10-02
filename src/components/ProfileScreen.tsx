"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

type ProfileScreenProps = {
  initialName: string;
  email: string;
  initialImage: string | null;
  canChangePassword: boolean;
};

type Feedback = { type: "ok" | "error"; message: string } | null;

const MAX_AVATAR_SIZE_BYTES = 1_000_000;

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No pude leer la imagen."));
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("No pude procesar la imagen."));
    };
    reader.readAsDataURL(file);
  });
}

export function ProfileScreen({
  initialName,
  email,
  initialImage,
  canChangePassword,
}: ProfileScreenProps) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(initialName);
  const [nameBusy, setNameBusy] = useState(false);
  const [nameFeedback, setNameFeedback] = useState<Feedback>(null);

  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarFeedback, setAvatarFeedback] = useState<Feedback>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<Feedback>(null);

  const effectiveName = (session?.user?.name?.trim() || name || "Cuenta").trim();
  const fromSessionImage =
    typeof session?.user?.image === "string" && session.user.image.trim()
      ? session.user.image
      : null;
  const effectiveImage = fromSessionImage ?? initialImage;
  const avatarFallback = effectiveName[0]?.toUpperCase() || "U";

  async function saveName(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNameFeedback(null);
    const trimmedName = name.trim();

    if (!trimmedName) {
      setNameFeedback({ type: "error", message: "El nombre no puede estar vacío." });
      return;
    }

    setNameBusy(true);
    try {
      const { error } = await authClient.updateUser({ name: trimmedName });
      if (error) {
        setNameFeedback({
          type: "error",
          message: error.message || "No pude guardar tu nombre.",
        });
        return;
      }
      setName(trimmedName);
      setNameFeedback({ type: "ok", message: "Nombre actualizado." });
      router.refresh();
    } catch (err) {
      setNameFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "No pude guardar tu nombre.",
      });
    } finally {
      setNameBusy(false);
    }
  }

  async function updateAvatar(image: string | null) {
    setAvatarFeedback(null);
    setAvatarBusy(true);
    try {
      const { error } = await authClient.updateUser({ image });
      if (error) {
        setAvatarFeedback({
          type: "error",
          message: error.message || "No pude actualizar el avatar.",
        });
        return;
      }
      setAvatarFeedback({
        type: "ok",
        message: image ? "Avatar actualizado." : "Avatar eliminado.",
      });
      router.refresh();
    } catch (err) {
      setAvatarFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "No pude actualizar el avatar.",
      });
    } finally {
      setAvatarBusy(false);
    }
  }

  async function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setAvatarFeedback({
        type: "error",
        message: "Subí una imagen válida (JPG, PNG o WebP).",
      });
      e.target.value = "";
      return;
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setAvatarFeedback({
        type: "error",
        message: "La imagen supera 1 MB. Elegí un archivo más liviano.",
      });
      e.target.value = "";
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      await updateAvatar(dataUrl);
    } finally {
      e.target.value = "";
    }
  }

  async function savePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPasswordFeedback(null);

    if (!canChangePassword) {
      setPasswordFeedback({
        type: "error",
        message: "Tu cuenta no tiene contraseña local para actualizar.",
      });
      return;
    }

    if (!currentPassword.trim() || !newPassword.trim()) {
      setPasswordFeedback({
        type: "error",
        message: "Completá contraseña actual y nueva contraseña.",
      });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordFeedback({
        type: "error",
        message: "La nueva contraseña debe tener al menos 8 caracteres.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordFeedback({
        type: "error",
        message: "La confirmación no coincide con la nueva contraseña.",
      });
      return;
    }

    setPasswordBusy(true);
    try {
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
      });
      if (error) {
        setPasswordFeedback({
          type: "error",
          message: error.message || "No pude cambiar la contraseña.",
        });
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordFeedback({ type: "ok", message: "Contraseña actualizada." });
    } catch (err) {
      setPasswordFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "No pude cambiar la contraseña.",
      });
    } finally {
      setPasswordBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:p-6 md:p-10">
      <header className="mb-8 border-b border-border-subtle pb-5">
        <p className="font-mono text-xs uppercase tracking-wider text-foreground-muted">Perfil</p>
        <h1 className="mt-2 font-serif text-3xl leading-tight sm:text-4xl">Configuración de cuenta</h1>
        <p className="mt-2 text-sm text-foreground-muted">
          Actualizá tu identidad, tu contraseña y tu avatar.
        </p>
      </header>

      <section className="mb-6 rounded-xl border border-border-subtle bg-surface p-4 md:p-5">
        <h2 className="font-serif text-2xl">Identidad</h2>
        <p className="mt-1 text-sm text-foreground-muted">El email es fijo en esta versión.</p>

        <form className="mt-5 space-y-4" onSubmit={saveName}>
          <div className="space-y-2">
            <label htmlFor="profile-name" className="text-xs uppercase tracking-wider text-foreground-muted">
              Nombre
            </label>
            <input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={nameBusy}
              className="h-11 w-full border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-accent"
              placeholder="Tu nombre"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-foreground-muted">Email</label>
            <div
              title={email}
              className="h-11 w-full truncate border border-border-subtle bg-background px-3 leading-[42px] text-sm text-foreground-muted"
            >
              {email}
            </div>
          </div>

          {nameFeedback && (
            <p
              className={`text-sm ${
                nameFeedback.type === "ok" ? "text-accent" : "text-red-300"
              } break-words`}
            >
              {nameFeedback.message}
            </p>
          )}

          <button
            type="submit"
            disabled={nameBusy}
            className="h-11 bg-accent px-4 text-sm font-mono uppercase tracking-wider text-background transition-colors hover:bg-accent/90 disabled:opacity-60"
          >
            {nameBusy ? "Guardando..." : "Guardar nombre"}
          </button>
        </form>
      </section>

      <section className="mb-6 rounded-xl border border-border-subtle bg-surface p-4 md:p-5">
        <h2 className="font-serif text-2xl">Avatar</h2>
        <p className="mt-1 text-sm text-foreground-muted">
          Usá una imagen cuadrada para mejor resultado.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-4">
          {effectiveImage ? (
            <img
              src={effectiveImage}
              alt={`Avatar de ${effectiveName}`}
              className="h-20 w-20 rounded-full border border-border object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-border bg-surface-elevated text-xl font-medium">
              {avatarFallback}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={onAvatarChange}
            />
            <button
              type="button"
              disabled={avatarBusy}
              onClick={() => fileInputRef.current?.click()}
              className="h-10 border border-border px-3 text-sm text-foreground-muted transition-colors hover:border-accent hover:text-foreground disabled:opacity-60"
            >
              {avatarBusy ? "Subiendo..." : "Subir avatar"}
            </button>
            <button
              type="button"
              disabled={avatarBusy || !effectiveImage}
              onClick={() => void updateAvatar(null)}
              className="h-10 border border-border px-3 text-sm text-foreground-muted transition-colors hover:border-accent hover:text-foreground disabled:opacity-60"
            >
              Quitar avatar
            </button>
          </div>
        </div>

        {avatarFeedback && (
          <p
            className={`mt-4 text-sm ${
              avatarFeedback.type === "ok" ? "text-accent" : "text-red-300"
            } break-words`}
          >
            {avatarFeedback.message}
          </p>
        )}
      </section>

      <section className="rounded-xl border border-border-subtle bg-surface p-4 md:p-5">
        <h2 className="font-serif text-2xl">Contraseña</h2>
        {!canChangePassword ? (
          <div className="mt-4 border border-border-subtle bg-background p-4 text-sm text-foreground-muted">
            Esta cuenta inició con proveedor social y no tiene contraseña local para cambiar desde
            aquí.
          </div>
        ) : (
          <form className="mt-5 space-y-4" onSubmit={savePassword}>
            <div className="space-y-2">
              <label htmlFor="current-password" className="text-xs uppercase tracking-wider text-foreground-muted">
                Contraseña actual
              </label>
              <input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={passwordBusy}
                className="h-11 w-full border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-accent"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="new-password" className="text-xs uppercase tracking-wider text-foreground-muted">
                Nueva contraseña
              </label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={passwordBusy}
                className="h-11 w-full border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-accent"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="confirm-password" className="text-xs uppercase tracking-wider text-foreground-muted">
                Confirmar nueva contraseña
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={passwordBusy}
                className="h-11 w-full border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-accent"
              />
            </div>

            {passwordFeedback && (
              <p
                className={`text-sm ${
                  passwordFeedback.type === "ok" ? "text-accent" : "text-red-300"
                } break-words`}
              >
                {passwordFeedback.message}
              </p>
            )}

            <button
              type="submit"
              disabled={passwordBusy}
              className="h-11 bg-accent px-4 text-sm font-mono uppercase tracking-wider text-background transition-colors hover:bg-accent/90 disabled:opacity-60"
            >
              {passwordBusy ? "Actualizando..." : "Cambiar contraseña"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
