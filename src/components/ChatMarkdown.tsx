"use client";

import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

export function ChatMarkdown({ children }: { children: string }) {
  const mathReady = children.replace(
    /\\\(([\s\S]+?)\\\)/g,
    (_, expression: string) => `$${expression}$`
  );

  return (
    <div className="chat-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
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
