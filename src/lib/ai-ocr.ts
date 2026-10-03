import { PDFDocument } from "pdf-lib";
import { ProviderConfigError, resolveProviderName } from "./ai-providers";

const OPENAI_BASE_URL =
  process.env.OPENAI_BASE_URL?.trim().replace(/\/+$/, "") ||
  "https://api.openai.com/v1";
const OCR_MAX_TOKENS = 32_000;
const OPENAI_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export type OcrInput = {
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
  startPage: number;
  endPage: number;
};

export function ocrAvailable(): boolean {
  try {
    resolveProviderName();
    return true;
  } catch {
    return false;
  }
}

function instructions(input: OcrInput, isImage: boolean): string {
  const pages =
    input.startPage === input.endPage
      ? `la página ${input.startPage}`
      : `las páginas ${input.startPage} a ${input.endPage}`;
  return [
    `Transcribí textualmente ${isImage ? "el contenido de esta imagen" : `${pages} de este documento`} («${input.fileName}»), que es material de estudio de un estudiante universitario.`,
    isImage
      ? `Empezá con una línea exacta «[Página ${input.startPage}]».`
      : `Antes de cada página escribí una línea exacta «[Página N]», donde N es el número de página dentro del documento original (empezando en ${input.startPage}).`,
    "- Conservá títulos, numeración de artículos e incisos, listas y el orden de lectura.",
    "- Pasá las tablas a Markdown y las fórmulas a LaTeX.",
    "- Transcribí también texto manuscrito. Si hay opciones marcadas, tildadas o respuestas escritas a mano, indicá cuáles son entre corchetes.",
    "- Si una zona es ilegible escribí [ilegible]. Describí gráficos o diagramas en una línea entre corchetes.",
    "- No resumas, no corrijas, no traduzcas y no agregues comentarios propios. Devolvé solo la transcripción.",
  ].join("\n");
}

async function imageAsPdf(bytes: Uint8Array, mimeType: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const image =
    mimeType === "image/png" ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
  const page = pdf.addPage([image.width, image.height]);
  page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
  return pdf.save();
}

export async function transcribeWithAi(input: OcrInput): Promise<string> {
  const provider = resolveProviderName();
  const mimeType = (input.mimeType || "").toLowerCase();
  const isImage = mimeType.startsWith("image/");
  const prompt = instructions(input, isImage);
  const text =
    provider === "openai"
      ? await transcribeOpenAI(input, mimeType, isImage, prompt)
      : await transcribeAnthropic(input, mimeType, isImage, prompt);
  const cleaned = text
    .replace(/^```(?:markdown|md|text)?\s*\n/i, "")
    .replace(/\n```\s*$/, "")
    .trim();
  if (!cleaned) throw new Error("La IA no devolvió texto para estas páginas.");
  return cleaned;
}

async function transcribeOpenAI(
  input: OcrInput,
  mimeType: string,
  isImage: boolean,
  prompt: string
): Promise<string> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new ProviderConfigError("Falta OPENAI_API_KEY para leer archivos.");
  const model =
    process.env.OPENAI_OCR_MODEL?.trim() || process.env.OPENAI_MODEL?.trim() || "gpt-5.4";
  const base64 = Buffer.from(input.bytes).toString("base64");
  const attachment =
    isImage && OPENAI_IMAGE_TYPES.has(mimeType)
      ? {
          type: "image_url",
          image_url: { url: `data:${mimeType};base64,${base64}`, detail: "high" },
        }
      : {
          type: "file",
          file: {
            filename: input.fileName.replace(/\.[^.]+$/, "") + ".pdf",
            file_data: `data:application/pdf;base64,${base64}`,
          },
        };

  const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      max_completion_tokens: OCR_MAX_TOKENS,
      messages: [
        { role: "user", content: [{ type: "text", text: prompt }, attachment] },
      ],
    }),
  });
  if (!response.ok) {
    throw new Error(`OpenAI devolvió ${response.status}. ${clip(await response.text(), 240)}`);
  }
  const data = (await response.json()) as {
    choices?: { message?: { content?: string }; finish_reason?: string }[];
  };
  const choice = data.choices?.[0];
  if (choice?.finish_reason === "length") {
    throw new Error("La transcripción quedó cortada por longitud.");
  }
  return choice?.message?.content || "";
}

async function transcribeAnthropic(
  input: OcrInput,
  mimeType: string,
  isImage: boolean,
  prompt: string
): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) throw new ProviderConfigError("Falta ANTHROPIC_API_KEY para leer archivos.");
  const attachment =
    isImage && mimeType !== "image/png" && mimeType !== "image/jpeg"
      ? {
          type: "image",
          source: {
            type: "base64",
            media_type: mimeType,
            data: Buffer.from(input.bytes).toString("base64"),
          },
        }
      : {
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: Buffer.from(
              isImage ? await imageAsPdf(input.bytes, mimeType) : input.bytes
            ).toString("base64"),
          },
        };
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL?.trim() || "claude-3-5-sonnet-latest",
      max_tokens: 16_000,
      messages: [
        {
          role: "user",
          content: [attachment, { type: "text", text: prompt }],
        },
      ],
    }),
  });
  if (!response.ok) {
    throw new Error(`Anthropic devolvió ${response.status}. ${clip(await response.text(), 240)}`);
  }
  const data = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
    stop_reason?: string;
  };
  if (data.stop_reason === "max_tokens") {
    throw new Error("La transcripción quedó cortada por longitud.");
  }
  return (data.content || [])
    .filter((part) => part.type === "text")
    .map((part) => part.text || "")
    .join("\n");
}

function clip(text: string, max: number): string {
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length <= max ? compact : `${compact.slice(0, max).trim()}…`;
}
