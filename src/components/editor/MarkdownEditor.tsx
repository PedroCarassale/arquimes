"use client";

import dynamic from "next/dynamic";
import type { MarkdownEditorProps } from "./MarkdownEditorImpl";
import { EditorSkeleton } from "./EditorSkeleton";

export type { MarkdownEditorProps };

const Impl = dynamic(() => import("./MarkdownEditorImpl").then((m) => m.MarkdownEditorImpl), {
  ssr: false,
  loading: () => <EditorSkeleton />,
});

export function MarkdownEditor(props: MarkdownEditorProps): React.ReactElement {
  return <Impl {...props} />;
}
