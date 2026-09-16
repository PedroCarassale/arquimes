import type { ChatMessage } from "./types";

const CITATIONS_MARKER = /<!--\s*ARQUIMES_CITATIONS:\s*(\[[\s\S]*\])\s*-->/i;
const RAW_ENVELOPE = /^(?:```(?:json)?\s*)?\{\s*"answer"\s*:/i;
const INVALID_ENVELOPE_COPY =
  "No pude interpretar esta respuesta. Pedime que la genere de nuevo.";

const TEX_COMMANDS = new Set([
  "Delta",
  "Gamma",
  "Omega",
  "Phi",
  "Pi",
  "Sigma",
  "Theta",
  "alpha",
  "approx",
  "bar",
  "begin",
  "beta",
  "cdot",
  "cos",
  "delta",
  "dfrac",
  "end",
  "epsilon",
  "frac",
  "gamma",
  "ge",
  "geq",
  "hat",
  "infty",
  "lambda",
  "le",
  "left",
  "leq",
  "lim",
  "ln",
  "log",
  "mathrm",
  "mathbf",
  "nabla",
  "neq",
  "omega",
  "operatorname",
  "overline",
  "partial",
  "phi",
  "pi",
  "pm",
  "rho",
  "right",
  "sigma",
  "sin",
  "sqrt",
  "sum",
  "tan",
  "text",
  "tfrac",
  "theta",
  "times",
  "underline",
  "varepsilon",
  "vec",
]);

export type AssistantContent = {
  answer: string;
  citations: string[];
};

export function parseAssistantContent(content: string): AssistantContent | null {
  const trimmed = content.trim();
  if (!trimmed) return null;

  const marker = CITATIONS_MARKER.exec(trimmed);
  if (marker) {
    const answer = `${trimmed.slice(0, marker.index)}${trimmed.slice(
      marker.index + marker[0].length
    )}`.trim();
    if (!answer) return null;
    return {
      answer,
      citations: parseCitations(marker[1]),
    };
  }

  const jsonCandidate = extractJsonEnvelope(trimmed);
  if (!jsonCandidate) return null;

  try {
    const parsed = JSON.parse(repairTexEscapes(jsonCandidate)) as unknown;
    return assistantContentFromUnknown(parsed);
  } catch {
    return null;
  }
}

export function normalizeAssistantContent(
  content: string,
  citations?: string[]
): AssistantContent {
  const parsed = parseAssistantContent(content);
  if (parsed) {
    return {
      answer: parsed.answer,
      citations: uniqueCitations([...(citations ?? []), ...parsed.citations]),
    };
  }

  const trimmed = content.trim();
  return {
    answer: RAW_ENVELOPE.test(trimmed) ? INVALID_ENVELOPE_COPY : trimmed,
    citations: uniqueCitations(citations ?? []),
  };
}

export function normalizeChatMessage<T extends ChatMessage>(message: T): T {
  if (message.role !== "assistant") return message;
  const normalized = normalizeAssistantContent(message.content, message.citations);
  return {
    ...message,
    content: normalized.answer,
    citations: normalized.citations.length ? normalized.citations : undefined,
  } as T;
}

function assistantContentFromUnknown(value: unknown): AssistantContent | null {
  if (typeof value === "string") {
    return parseAssistantContent(value);
  }
  if (!value || typeof value !== "object") return null;

  const envelope = value as { answer?: unknown; citations?: unknown };
  const answer =
    typeof envelope.answer === "string" ? envelope.answer.trim() : "";
  if (!answer) return null;

  return {
    answer,
    citations: Array.isArray(envelope.citations)
      ? uniqueCitations(
          envelope.citations.filter(
            (citation): citation is string => typeof citation === "string"
          )
        )
      : [],
  };
}

function extractJsonEnvelope(content: string): string | null {
  const withoutFence = content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  const candidate = withoutFence.slice(start, end + 1);
  return /^\{\s*"answer"\s*:/i.test(candidate) ? candidate : null;
}

function parseCitations(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? uniqueCitations(
          parsed.filter(
            (citation): citation is string => typeof citation === "string"
          )
        )
      : [];
  } catch {
    return [];
  }
}

function uniqueCitations(citations: string[]): string[] {
  return [
    ...new Set(
      citations.map((citation) => citation.trim()).filter(Boolean)
    ),
  ];
}

function repairTexEscapes(json: string): string {
  let repaired = "";

  for (let index = 0; index < json.length; index += 1) {
    if (json[index] !== "\\") {
      repaired += json[index];
      continue;
    }

    let end = index;
    while (json[end] === "\\") end += 1;
    const slashCount = end - index;
    const command = json.slice(end).match(/^[A-Za-z]+/)?.[0];
    const delimiter = json[end];
    const likelyTex =
      (command ? TEX_COMMANDS.has(command) : false) ||
      delimiter === "(" ||
      delimiter === ")" ||
      delimiter === "[" ||
      delimiter === "]";

    repaired += "\\".repeat(
      likelyTex && slashCount % 2 === 1 ? slashCount + 1 : slashCount
    );
    index = end - 1;
  }

  return repaired;
}
