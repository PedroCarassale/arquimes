const BASE = "http://redirect.invalid";

export function safeRedirectPath(value: unknown, fallback = "/"): string {
  if (typeof value !== "string" || !value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.includes("\\")) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;
  try {
    if (new URL(value, BASE).origin !== BASE) return fallback;
  } catch {
    return fallback;
  }
  return value;
}
