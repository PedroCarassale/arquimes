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

const OPENAI_MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
const ANTHROPIC_MODEL =
  process.env.ANTHROPIC_MODEL?.trim() || "claude-3-5-sonnet-latest";

function resolveProviderName(): ProviderName {
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

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.2,
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

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 900,
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
