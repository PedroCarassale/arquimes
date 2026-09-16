"use client";

import katex from "katex";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { sanitizeChatText } from "@/lib/chat-message";

type HastNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

export function ChatMarkdown({
  children,
}: {
  children?: string | null;
}) {
  const mathReady = sanitizeChatText(children).replace(
    /\\\(([\s\S]+?)\\\)/g,
    (_, expression: string) => `$${expression}$`
  );

  return (
    <div className="chat-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeInvalidMathFallback, rehypeKatex]}
        components={{
          a: ({ children: linkChildren, ...props }) => (
            <a {...props} target="_blank" rel="noreferrer">
              {linkChildren}
            </a>
          ),
        }}
      >
        {mathReady}
      </ReactMarkdown>
    </div>
  );
}

function rehypeInvalidMathFallback() {
  return (tree: HastNode) => {
    visitMathCode(tree);
  };
}

function visitMathCode(node: HastNode): void {
  if (node.type === "element" && node.tagName === "code") {
    const classes = classNames(node.properties?.className);
    const isMath = classes.some((className) =>
      ["language-math", "math-inline", "math-display"].includes(className)
    );

    if (isMath) {
      const expression = textContent(node);
      try {
        katex.renderToString(expression, {
          displayMode: classes.includes("math-display"),
          throwOnError: true,
          strict: "ignore",
        });
      } catch {
        node.properties = {
          ...node.properties,
          className: ["chat-math-fallback"],
          title: "No se pudo renderizar esta fórmula",
        };
      }
    }
  }

  node.children?.forEach(visitMathCode);
}

function classNames(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  return typeof value === "string" ? value.split(/\s+/).filter(Boolean) : [];
}

function textContent(node: HastNode): string {
  if (node.type === "text") return node.value || "";
  return node.children?.map(textContent).join("") || "";
}
