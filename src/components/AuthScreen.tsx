"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

type AuthMode = "login" | "register";

export function AuthScreen({
  mode,
  googleEnabled,
  nextPath = "/",
}: {
  mode: AuthMode;
  googleEnabled: boolean;
  nextPath?: string;
}) {
  const router = useRouter();
  const redirectTo = nextPath.startsWith("/") ? nextPath : "/";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  const isRegister = mode === "register";

  async function handleEmailAuth(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim() || (isRegister && !name.trim())) {
      setError("Completá todos los campos requeridos.");
      return;
    }

    setBusy(true);
    try {
      if (isRegister) {
        const { error: registerError } = await authClient.signUp.email({
          name: name.trim(),
          email: email.trim(),
          password: password.trim(),
        });
        if (registerError) {
          setError(registerError.message || "No pude crear tu cuenta.");
          return;
        }
      } else {
        const { error: loginError } = await authClient.signIn.email({
          email: email.trim(),
          password: password.trim(),
        });
        if (loginError) {
          setError(loginError.message || "No pude iniciar sesión.");
          return;
        }
      }
      router.push(redirectTo);
      router.refresh();
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : "No pude completar la autenticación."
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    if (!googleEnabled) {
      setError(
        "Google OAuth todavía no está configurado en este entorno. Podés entrar con email y contraseña."
      );
      return;
    }

    setGoogleBusy(true);
    try {
      const { error: googleError } = await authClient.signIn.social({
        provider: "google",
        callbackURL: redirectTo,
      });
      if (googleError) {
        setError(googleError.message || "No pude iniciar con Google.");
      }
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : "No pude iniciar con Google."
      );
    } finally {
      setGoogleBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <section className="w-full max-w-md border border-border bg-surface p-8">
        <Link href="/" className="font-serif text-2xl tracking-tight">
          Arquimes
        </Link>
        <h1 className="mt-4 font-serif text-3xl">
          {isRegister ? "Crear cuenta" : "Iniciar sesión"}
        </h1>
        <p className="mt-2 text-sm text-foreground-muted">
          {isRegister
            ? "Tu espacio de materias queda privado para tu usuario."
            : "Entrá para ver solo tus materias y tu progreso."}
        </p>

        <form className="mt-8 space-y-5" onSubmit={handleEmailAuth}>
          {isRegister && (
            <div>
              <label
                htmlFor="auth-name"
                className="mb-2 block text-xs font-mono uppercase tracking-wider text-foreground-muted"
              >
                Nombre
              </label>
              <input
                id="auth-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                className="h-11 w-full border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-accent"
                placeholder="Pedro"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="auth-email"
              className="mb-2 block text-xs font-mono uppercase tracking-wider text-foreground-muted"
            >
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="h-11 w-full border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-accent"
              placeholder="vos@universidad.edu"
            />
          </div>

          <div>
            <label
              htmlFor="auth-password"
              className="mb-2 block text-xs font-mono uppercase tracking-wider text-foreground-muted"
            >
              Contraseña
            </label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isRegister ? "new-password" : "current-password"}
              className="h-11 w-full border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-accent"
              placeholder="Mínimo 8 caracteres"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="h-11 w-full bg-accent text-background text-sm font-mono uppercase tracking-wider transition-colors hover:bg-accent/90 disabled:opacity-60"
          >
            {busy
              ? isRegister
                ? "Creando..."
                : "Entrando..."
              : isRegister
                ? "Crear cuenta"
                : "Entrar"}
          </button>
        </form>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleBusy || !googleEnabled}
          className="mt-3 h-11 w-full border border-border text-sm transition-colors hover:border-accent disabled:opacity-60"
        >
          {!googleEnabled
            ? "Google no configurado en este entorno"
            : googleBusy
              ? "Redirigiendo..."
              : "Continuar con Google"}
        </button>

        <p className="mt-6 text-sm text-foreground-muted">
          {isRegister ? "¿Ya tenés cuenta?" : "¿No tenés cuenta?"}{" "}
          <Link
            href={isRegister ? "/login" : "/register"}
            className="text-accent hover:underline"
          >
            {isRegister ? "Iniciá sesión" : "Crear cuenta"}
          </Link>
        </p>
      </section>
    </main>
  );
}
