"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

type AuthMode = "login" | "register";

const RETRATO_MASK =
  "linear-gradient(to bottom, #000 0%, #000 45%, transparent 90%), linear-gradient(to right, transparent 0%, #000 10%, #000 90%, transparent 100%)";
type AuthField = "name" | "email" | "password";

function GoogleGIcon() {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <path
        fill="#4285F4"
        d="M17.64 9.20455C17.64 8.56637 17.5827 7.95273 17.4764 7.36364H9V10.8455H13.8436C13.635 11.9705 13.0009 12.9236 12.0468 13.561V15.8191H14.9555C16.6573 14.2527 17.64 11.9455 17.64 9.20455Z"
      />
      <path
        fill="#34A853"
        d="M9 18C11.43 18 13.4673 17.1945 14.9555 15.8191L12.0468 13.561C11.2418 14.1019 10.2118 14.4209 9 14.4209C6.65591 14.4209 4.67182 12.8373 3.96409 10.7091H0.957275V13.0409C2.43727 15.9809 5.47909 18 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.96409 10.7091C3.78409 10.1682 3.68182 9.59091 3.68182 9C3.68182 8.40909 3.78409 7.83182 3.96409 7.29091V4.95909H0.957273C0.348182 6.17273 0 7.54545 0 9C0 10.4545 0.348182 11.8273 0.957273 13.0409L3.96409 10.7091Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.57909C10.3227 3.57909 11.51 4.03364 12.4436 4.92545L15.0205 2.34864C13.4632 0.894545 11.4259 0 9 0C5.47909 0 2.43727 2.01909 0.957275 4.95909L3.96409 7.29091C4.67182 5.16273 6.65591 3.57909 9 3.57909Z"
      />
    </svg>
  );
}

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
  const [errorPulse, setErrorPulse] = useState(0);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<AuthField, string>>
  >({});
  const [shakingField, setShakingField] = useState<AuthField | null>(null);

  const isRegister = mode === "register";

  function showError(message: string) {
    setError(message);
    setErrorPulse((current) => current + 1);
  }

  function clearFieldError(field: AuthField) {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function triggerFieldShake(field: AuthField) {
    setShakingField(null);
    requestAnimationFrame(() => {
      setShakingField(field);
      window.setTimeout(() => {
        setShakingField((current) => (current === field ? null : current));
      }, 320);
    });
  }

  function getValidationMessage(
    field: AuthField,
    input: HTMLInputElement
  ): string {
    if (input.validity.valueMissing) {
      if (field === "name") return "Ingresá tu nombre.";
      if (field === "email") return "Ingresá tu email.";
      return "Ingresá tu contraseña.";
    }
    if (field === "email" && input.validity.typeMismatch) {
      return "Ingresá un email válido, por ejemplo nombre@universidad.edu.";
    }
    if (field === "password" && input.validity.tooShort) {
      return "La contraseña debe tener al menos 8 caracteres.";
    }
    return "Revisá este campo.";
  }

  function invalidHandler(field: AuthField) {
    return (event: React.InvalidEvent<HTMLInputElement>) => {
      const message = getValidationMessage(field, event.currentTarget);
      event.currentTarget.setCustomValidity(message);
      setFieldErrors((current) => ({ ...current, [field]: message }));
      triggerFieldShake(field);
    };
  }

  function inputHandler(field: AuthField) {
    return (event: React.FormEvent<HTMLInputElement>) => {
      event.currentTarget.setCustomValidity("");
      clearFieldError(field);
    };
  }

  async function handleEmailAuth(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!email.trim() || !password.trim() || (isRegister && !name.trim())) {
      showError("Completá todos los campos requeridos.");
      if (isRegister && !name.trim()) {
        setFieldErrors((current) => ({
          ...current,
          name: "Ingresá tu nombre.",
        }));
        triggerFieldShake("name");
      } else if (!email.trim()) {
        setFieldErrors((current) => ({
          ...current,
          email: "Ingresá tu email.",
        }));
        triggerFieldShake("email");
      } else if (!password.trim()) {
        setFieldErrors((current) => ({
          ...current,
          password: "Ingresá tu contraseña.",
        }));
        triggerFieldShake("password");
      }
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
          showError(registerError.message || "No pude crear tu cuenta.");
          return;
        }
      } else {
        const { error: loginError } = await authClient.signIn.email({
          email: email.trim(),
          password: password.trim(),
        });
        if (loginError) {
          showError(loginError.message || "No pude iniciar sesión.");
          return;
        }
      }
      router.push(redirectTo);
      router.refresh();
    } catch (authError) {
      showError(
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
      showError(
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
        showError(googleError.message || "No pude iniciar con Google.");
      }
    } catch (authError) {
      showError(
        authError instanceof Error
          ? authError.message
          : "No pude iniciar con Google."
      );
    } finally {
      setGoogleBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-background text-foreground lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <aside className="relative h-56 overflow-hidden border-b border-border-subtle sm:h-72 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <Image
          src="/brand/arquimedes-retrato.png"
          alt="Grabado de Arquímedes con un compás"
          fill
          priority
          unoptimized
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover object-[50%_18%] opacity-80"
          style={{
            maskImage: RETRATO_MASK,
            WebkitMaskImage: RETRATO_MASK,
            maskComposite: "intersect",
            WebkitMaskComposite: "source-in",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 hidden p-10 lg:block">
          <p className="max-w-sm font-serif text-[28px] leading-[34px] text-foreground">
            «Dadme un punto de apoyo y moveré el mundo.»
          </p>
          <p className="mt-3 font-mono text-[11px] uppercase leading-4 tracking-[0.08em] text-foreground-subtle">
            Arquímedes de Siracusa · c. 287–212 a. C.
          </p>
        </div>
      </aside>

      <div className="flex items-center justify-center px-4 py-10 sm:px-8 lg:py-16">
      <section className="w-full max-w-sm">
        <Link href="/" className="font-serif text-2xl tracking-tight">
          Arquímedes
        </Link>
        <h1 className="mt-4 font-serif text-3xl">
          {isRegister ? "Crear cuenta" : "Iniciar sesión"}
        </h1>
        <p className="mt-2 text-sm text-foreground-muted">
          {isRegister
            ? "Tu espacio de materias queda privado, solo lo ves vos."
            : "Entrá para ver tus materias."}
        </p>

        <form className="mt-8 space-y-5" onSubmit={handleEmailAuth}>
          {isRegister && (
            <div
              className={`t-input-wrap ${
                fieldErrors.name ? "is-error" : ""
              }`}
            >
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
                onInput={inputHandler("name")}
                onInvalid={invalidHandler("name")}
                autoComplete="name"
                required
                aria-invalid={Boolean(fieldErrors.name)}
                className={`t-input h-11 w-full border bg-background px-3 text-sm outline-none transition-colors focus:border-accent ${
                  fieldErrors.name ? "is-error border-red-400" : "border-border"
                } ${shakingField === "name" ? "is-shaking" : ""}`}
                placeholder="Pedro"
              />
              <p className="t-error-msg mt-1 text-xs text-red-300">
                {fieldErrors.name || ""}
              </p>
            </div>
          )}

          <div
            className={`t-input-wrap ${fieldErrors.email ? "is-error" : ""}`}
          >
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
              onInput={inputHandler("email")}
              onInvalid={invalidHandler("email")}
              autoComplete="email"
              required
              aria-invalid={Boolean(fieldErrors.email)}
              className={`t-input h-11 w-full border bg-background px-3 text-sm outline-none transition-colors focus:border-accent ${
                fieldErrors.email ? "is-error border-red-400" : "border-border"
              } ${shakingField === "email" ? "is-shaking" : ""}`}
              placeholder="vos@universidad.edu"
            />
            <p className="t-error-msg mt-1 text-xs text-red-300">
              {fieldErrors.email || ""}
            </p>
          </div>

          <div
            className={`t-input-wrap ${
              fieldErrors.password ? "is-error" : ""
            }`}
          >
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
              onInput={inputHandler("password")}
              onInvalid={invalidHandler("password")}
              autoComplete={isRegister ? "new-password" : "current-password"}
              required
              minLength={8}
              aria-invalid={Boolean(fieldErrors.password)}
              className={`t-input h-11 w-full border bg-background px-3 text-sm outline-none transition-colors focus:border-accent ${
                fieldErrors.password
                  ? "is-error border-red-400"
                  : "border-border"
              } ${shakingField === "password" ? "is-shaking" : ""}`}
              placeholder="Mínimo 8 caracteres"
            />
            <p className="t-error-msg mt-1 text-xs text-red-300">
              {fieldErrors.password || ""}
            </p>
          </div>

          {error && (
            <p
              key={errorPulse}
              className="t-toast is-open t-input is-shaking break-words text-sm text-red-300"
              role="alert"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="h-11 w-full rounded-md bg-accent text-background text-sm font-medium transition-colors hover:bg-accent/90 enabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
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
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-[#0c0d10] px-3 text-sm transition-colors hover:bg-hover enabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
        >
          {googleEnabled && <GoogleGIcon />}
          <span>
            {!googleEnabled
              ? "Google no configurado en este entorno"
              : googleBusy
                ? "Redirigiendo..."
                : "Continuar con Google"}
          </span>
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
      </div>
    </main>
  );
}
