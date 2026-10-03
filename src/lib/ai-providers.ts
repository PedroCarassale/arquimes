type Role = "system" | "user" | "assistant";

export type ProviderMessage = {
  role: Role;
  content: string;
};

export type ProviderResult = {
  text: string;
};

export class ProviderConfigError extends Error {}

type ProviderName = "openai" | "anthropic";

const OPENAI_MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-5.4";
const OPENAI_BASE_URL =
  process.env.OPENAI_BASE_URL?.trim().replace(/\/+$/, "") ||
  "https://api.openai.com/v1";
const ANTHROPIC_MODEL =
  process.env.ANTHROPIC_MODEL?.trim() || "claude-3-5-sonnet-latest";
const OPENAI_TUTOR_MAX_TOKENS = 12_000;
const ANTHROPIC_TUTOR_MAX_TOKENS = 8_192;

const RATE_LIMIT_RETRIES = 3;
const MAX_RATE_LIMIT_WAIT_MS = 30_000;

export async function fetchWithRateLimitRetry(
  url: string,
  init: RequestInit
): Promise<Response> {
  for (let attempt = 0; ; attempt += 1) {
    const response = await fetch(url, init);
    if ((response.status !== 429 && response.status !== 529) || attempt >= RATE_LIMIT_RETRIES) {
      return response;
    }
    const detail = await response.clone().text();
    const hinted = Number(detail.match(/try again in ([\d.]+)s/i)?.[1]);
    const header = Number(response.headers.get("retry-after"));
    const seconds = Number.isFinite(hinted) && hinted > 0 ? hinted : header > 0 ? header : 2 ** attempt * 3;
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(MAX_RATE_LIMIT_WAIT_MS, seconds * 1000 + 500))
    );
  }
}

export function resolveProviderName(): ProviderName {
  const selected = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (selected === "openai" || selected === "anthropic") return selected;
  if (process.env.OPENAI_API_KEY?.trim()) return "openai";
  if (process.env.ANTHROPIC_API_KEY?.trim()) return "anthropic";
  throw new ProviderConfigError(
    "No hay proveedor de IA configurado. Definí OPENAI_API_KEY o ANTHROPIC_API_KEY para habilitar el chat."
  );
}

export function providerStatus(): {
  configured: boolean;
  selected: ProviderName | null;
  message: string;
} {
  try {
    const selected = resolveProviderName();
    return {
      configured: true,
      selected,
      message:
        selected === "openai"
          ? "OpenAI configurado para responder."
          : "Anthropic configurado para responder.",
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No hay proveedor de IA configurado.";
    return { configured: false, selected: null, message };
  }
}

export async function generateWithProvider(
  messages: ProviderMessage[]
): Promise<ProviderResult> {
  const provider = resolveProviderName();
  if (provider === "openai") return callOpenAI(messages);
  return callAnthropic(messages);
}

async function callOpenAI(messages: ProviderMessage[]): Promise<ProviderResult> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new ProviderConfigError(
      "AI_PROVIDER=openai está activo pero falta OPENAI_API_KEY."
    );
  }

  const response = await fetchWithRateLimitRetry(`${OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      max_completion_tokens: OPENAI_TUTOR_MAX_TOKENS,
      messages,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `OpenAI devolvió ${response.status}. ${clip(detail, 240)}`
    );
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenAI no devolvió contenido en la respuesta.");
  return { text };
}

async function callAnthropic(
  messages: ProviderMessage[]
): Promise<ProviderResult> {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) {
    throw new ProviderConfigError(
      "AI_PROVIDER=anthropic está activo pero falta ANTHROPIC_API_KEY."
    );
  }

  const system = messages.find((m) => m.role === "system")?.content || "";
  const chat = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role, content: m.content }));

  const response = await fetchWithRateLimitRetry("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: ANTHROPIC_TUTOR_MAX_TOKENS,
      temperature: 0.2,
      system,
      messages: chat,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Anthropic devolvió ${response.status}. ${clip(detail, 240)}`
    );
  }

  const data = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = data.content
    ?.filter((part) => part.type === "text" && part.text)
    .map((part) => part.text?.trim() || "")
    .join("\n")
    .trim();
  if (!text) {
    throw new Error("Anthropic no devolvió texto en la respuesta.");
  }
  return { text };
}

function clip(text: string, max: number): string {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max).trim()}…`;
}
