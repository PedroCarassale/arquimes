"use client";

import katex from "katex";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { preprocessAssistantMarkdown } from "@/lib/chat-markdown";

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
  const mathReady = preprocessAssistantMarkdown(children);

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
    isolateInvalidMath(tree);
  };
}

function isolateInvalidMath(node: HastNode): void {
  node.children?.forEach((child) => {
    if (
      node.type === "element" &&
      node.tagName === "pre" &&
      child.type === "element" &&
      child.tagName === "code" &&
      invalidMathClasses(child).length
    ) {
      node.tagName = "div";
      node.properties = {
        className: ["chat-math-fallback", "chat-math-fallback-display"],
        title: "No se pudo renderizar esta fórmula",
      };
      node.children = [{ type: "text", value: textContent(child) }];
      return;
    }

    if (
      child.type === "element" &&
      child.tagName === "code" &&
      invalidMathClasses(child).length
    ) {
      child.tagName = "span";
      child.properties = {
        className: ["chat-math-fallback"],
        title: "No se pudo renderizar esta fórmula",
      };
    }

    isolateInvalidMath(child);
  });
}

function invalidMathClasses(node: HastNode): string[] {
  if (node.type === "element" && node.tagName === "code") {
    const classes = classNames(node.properties?.className);
    const isMath = classes.some((className) =>
      ["language-math", "math-inline", "math-display"].includes(className)
    );

    if (!isMath) return [];

    try {
      katex.renderToString(textContent(node), {
        displayMode: classes.includes("math-display"),
        throwOnError: true,
        strict: "ignore",
      });
    } catch {
      return classes;
    }
  }
  return [];
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
