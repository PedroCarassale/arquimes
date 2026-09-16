import { sanitizeChatText } from "./chat-message.ts";

const DISPLAY_DELIMITER_GLOBAL = /(?<!\\)\$\$/g;
const MARKDOWN_BLOCK_BOUNDARY =
  /^\s*(?:#{1,6}\s|(?:---+|\*\*\*+|___+)\s*$|[-*+]\s+|\d+[.)]\s+|>)/;

/**
 * Makes model-authored math safe for remark-math.
 *
 * A standalone `$$` is only kept when a matching delimiter exists before the
 * next Markdown block. Mixed forms such as an opening `$$` followed by
 * `formula$$` are canonicalized to delimiters on their own lines. Orphans are
 * removed or escaped so they cannot consume the remainder of the message.
 */
export function preprocessAssistantMarkdown(value: unknown): string {
  const markdown = sanitizeChatText(value);
  if (!markdown) return "";

  return mapOutsideFencedCode(markdown, (prose) =>
    withProtectedInlineCode(prose, (safeProse) => {
      const legacyNormalized = safeProse
        .replace(/\\\(([\s\S]+?)\\\)/g, (_, expression: string) => {
          return `$${expression}$`;
        })
        .replace(/\\\[([\s\S]+?)\\\]/g, (_, expression: string) => {
          return `$$\n${expression.trim()}\n$$`;
        });

      return normalizeDisplayMath(legacyNormalized);
    })
  );
}

function normalizeDisplayMath(markdown: string): string {
  const lines = markdown.split("\n");
  const normalized: string[] = [];
  let inDisplayMath = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    if (trimmed === "$$") {
      if (inDisplayMath) {
        normalized.push("$$");
        inDisplayMath = false;
      } else if (findDisplayClose(lines, index + 1) !== -1) {
        normalized.push("$$");
        inDisplayMath = true;
      }
      continue;
    }

    if (inDisplayMath) {
      const closingSuffix = line.match(/^(.*?)(?<!\\)\$\$\s*$/);
      if (closingSuffix) {
        if (closingSuffix[1].trim()) normalized.push(closingSuffix[1]);
        normalized.push("$$");
        inDisplayMath = false;
      } else {
        normalized.push(line);
      }
      continue;
    }

    const completeDisplay = line.match(
      /^\s*\$\$([\s\S]*?)(?<!\\)\$\$\s*$/
    );
    if (completeDisplay) {
      const expression = completeDisplay[1].trim();
      if (expression) normalized.push("$$", expression, "$$");
      continue;
    }

    const openingPrefix = line.match(/^\s*\$\$(.+)$/);
    if (openingPrefix) {
      const expression = openingPrefix[1].trim();
      const closeIndex = findDisplayClose(lines, index + 1);
      if (closeIndex !== -1) {
        normalized.push("$$", expression);
        inDisplayMath = true;
      } else if (looksLikeMath(expression)) {
        normalized.push("$$", expression, "$$");
      } else {
        normalized.push(openingPrefix[1]);
      }
      continue;
    }

    const closingSuffix = line.match(/^(.*?)(?<!\\)\$\$\s*$/);
    if (closingSuffix) {
      const expression = closingSuffix[1].trim();
      if (looksLikeMath(expression)) {
        normalized.push("$$", expression, "$$");
      } else {
        normalized.push(closingSuffix[1]);
      }
      continue;
    }

    const withoutAmbiguousDisplay = normalizeInlineDoubleDollars(line);
    normalized.push(escapeUnbalancedInlineDollars(withoutAmbiguousDisplay));
  }

  return normalized.join("\n");
}

function findDisplayClose(lines: string[], startIndex: number): number {
  let sawContent = false;

  for (let index = startIndex; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (!trimmed) {
      if (sawContent) return -1;
      continue;
    }

    if (
      trimmed === "$$" ||
      /.+(?<!\\)\$\$\s*$/.test(lines[index])
    ) {
      return index;
    }
    if (sawContent && MARKDOWN_BLOCK_BOUNDARY.test(lines[index])) return -1;
    sawContent = true;
  }

  return -1;
}

function normalizeInlineDoubleDollars(line: string): string {
  let normalized = line.replace(
    /(?<!\\)\$\$([^$\n]+?)(?<!\\)\$\$/g,
    (_, expression: string) => `$${expression.trim()}$`
  );

  normalized = normalized.replace(DISPLAY_DELIMITER_GLOBAL, "");
  return normalized;
}

function escapeUnbalancedInlineDollars(line: string): string {
  const matches = [...line.matchAll(/(?<!\\)(?<!\$)\$(?!\$)/g)];
  if (matches.length % 2 === 0) return line;

  return line.replace(/(?<!\\)(?<!\$)\$(?!\$)/g, "\\$");
}

function looksLikeMath(value: string): boolean {
  if (!value || /\s{2,}/.test(value)) return false;
  return (
    /\\[A-Za-z]+/.test(value) ||
    /[_^={}]/.test(value) ||
    /[A-Za-z0-9)]\s*[=<>+\-*/]\s*[A-Za-z0-9(\\]/.test(value)
  );
}

function mapOutsideFencedCode(
  markdown: string,
  transform: (value: string) => string
): string {
  const lines = markdown.split("\n");
  const result: string[] = [];
  let prose: string[] = [];
  let fence: { marker: string; length: number } | null = null;

  const flushProse = () => {
    if (!prose.length) return;
    result.push(...transform(prose.join("\n")).split("\n"));
    prose = [];
  };

  for (const line of lines) {
    const fenceMatch = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (!fence && fenceMatch) {
      flushProse();
      fence = {
        marker: fenceMatch[1][0],
        length: fenceMatch[1].length,
      };
      result.push(line);
      continue;
    }

    if (fence) {
      result.push(line);
      const closingFence = line.match(/^\s{0,3}(`{3,}|~{3,})\s*$/);
      if (
        closingFence &&
        closingFence[1][0] === fence.marker &&
        closingFence[1].length >= fence.length
      ) {
        fence = null;
      }
      continue;
    }

    prose.push(line);
  }

  flushProse();
  return result.join("\n");
}

function withProtectedInlineCode(
  markdown: string,
  transform: (value: string) => string
): string {
  const codeSpans: string[] = [];
  const protectedMarkdown = markdown.replace(
    /(`+)([\s\S]*?)\1/g,
    (codeSpan) => {
      const placeholder = `\u0000ARQUIMES_CODE_${codeSpans.length}\u0000`;
      codeSpans.push(codeSpan);
      return placeholder;
    }
  );

  return transform(protectedMarkdown).replace(
    /\u0000ARQUIMES_CODE_(\d+)\u0000/g,
    (_, index: string) => codeSpans[Number(index)]
  );
}
