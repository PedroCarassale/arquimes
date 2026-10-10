import type { EditorHandle } from "@/components/editor/editor-edits";

const editors = new Map<string, EditorHandle>();
const waiting = new Map<string, ((editor: EditorHandle) => void)[]>();

export function registerClaseEditor(notaId: string, editor: EditorHandle): () => void {
  editors.set(notaId, editor);
  const queued = waiting.get(notaId);
  if (queued) {
    waiting.delete(notaId);
    for (const run of queued) run(editor);
  }
  return () => {
    if (editors.get(notaId) === editor) editors.delete(notaId);
  };
}

export function claseEditor(notaId: string): EditorHandle | undefined {
  return editors.get(notaId);
}

export function whenClaseEditor(notaId: string, run: (editor: EditorHandle) => void): () => void {
  const editor = editors.get(notaId);
  if (editor) {
    run(editor);
    return () => {};
  }
  waiting.set(notaId, [...(waiting.get(notaId) ?? []), run]);
  return () => {
    const queued = waiting.get(notaId)?.filter((item) => item !== run) ?? [];
    if (queued.length) waiting.set(notaId, queued);
    else waiting.delete(notaId);
  };
}
