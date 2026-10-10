import { editorViewCtx } from "@milkdown/kit/core";
import type { Ctx, MilkdownPlugin } from "@milkdown/kit/ctx";
import { uploadConfig } from "@milkdown/kit/plugin/upload";
import type { Node as ProseNode } from "@milkdown/kit/prose/model";
import { Plugin, PluginKey } from "@milkdown/kit/prose/state";
import { Decoration, DecorationSet, type EditorView } from "@milkdown/kit/prose/view";
import { $prose, $remark } from "@milkdown/kit/utils";
import type { ImageBlockFeatureConfig } from "@milkdown/crepe/feature/image-block";
import { toast } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { discardEditorImage, startEditorImageUpload } from "@/lib/editor-image-upload";
import { captionFromAlt, editorImageError, editorImageIdFromSrc, isPendingImageSrc } from "@/lib/editor-images";

const IMAGE_NODES = new Set(["image", "image-block"]);
const NOT_IMAGE = "Acá solo se pueden pegar imágenes. Los archivos van en Apuntes.";
const MISSING = "No se pudo cargar la imagen";
const localPreviews = new Map<string, string>();
const ownedPreviews = new Set<string>();
const uploading = new Set<string>();
const reading = new Set<string>();
const checking = new Set<string>();
const liveViews = new Set<EditorView>();
const key = new PluginKey("ARQ_IMAGE_UPLOADS");

export const IMAGES_CHANGED = "arq-images-changed";

type MdastNode = { type: string; title?: string | null; alt?: string | null; children?: MdastNode[] };

function fillImageAttrs(node: MdastNode) {
  const alone = node.type === "paragraph" && node.children?.length === 1 ? node.children[0] : null;
  if (alone?.type === "image") Object.assign(alone, captionFromAlt(alone.alt, alone.title));
  if (node.type === "image-block") Object.assign(node, captionFromAlt(node.alt, node.title));
  if (node.type === "image" || node.type === "image-block") {
    node.title ??= "";
    node.alt ??= "";
  }
  node.children?.forEach(fillImageAttrs);
}

const remarkImageAttrs = $remark("arqRemarkImageAttrs", () => () => (tree: unknown) => fillImageAttrs(tree as MdastNode));

function failed(message: string) {
  toast({ message, tone: "error" });
}

function uploadFile(file: File): string {
  const invalid = editorImageError(file.type, file.size);
  if (invalid) {
    failed(invalid);
    return "";
  }
  try {
    return beginUpload(file);
  } catch (error) {
    failed(error instanceof Error ? error.message : "No pude subir la imagen.");
    return "";
  }
}

export function imageBlockConfig(): ImageBlockFeatureConfig {
  return {
    onUpload: async (file) => uploadFile(file),
    proxyDomURL: (url) => localPreviews.get(url) ?? url,
    blockUploadButton: "Subir imagen",
    blockUploadPlaceholderText: "o pegá un link",
    blockConfirmButton: "Listo",
    blockCaptionPlaceholderText: "Escribí un epígrafe",
    inlineUploadButton: "Subir",
    inlineUploadPlaceholderText: "o pegá un link",
  };
}

export function configureImageUploads(ctx: Ctx) {
  ctx.update(uploadConfig.key, (prev) => ({
    ...prev,
    getInsertPos: (_event, ctx, pos) => {
      const $pos = ctx.get(editorViewCtx).state.doc.resolve(pos);
      return $pos.depth > 0 && $pos.parent.isTextblock && $pos.parent.content.size === 0 ? $pos.before() : pos;
    },
    uploader: async (files, schema) => {
      const list = Array.from(files);
      const images = list.filter((file) => file.type.startsWith("image/"));
      if (images.length === 0) {
        if (list.length > 0) failed(NOT_IMAGE);
        return [];
      }
      const type = schema.nodes["image-block"] ?? schema.nodes.image;
      return images.flatMap((file) => {
        const src = uploadFile(file);
        const node = src ? type.createAndFill({ src }) : null;
        return node ? [node] : [];
      });
    },
  }));
}

function eachImage(doc: ProseNode, matches: (src: string) => boolean, visit: (node: ProseNode, pos: number) => void) {
  doc.descendants((node, pos) => {
    if (IMAGE_NODES.has(node.type.name) && matches(String(node.attrs.src))) visit(node, pos);
  });
}

function updateImages(view: EditorView, src: string, next: string | null) {
  if (view.isDestroyed) return;
  const found: Array<{ node: ProseNode; pos: number }> = [];
  eachImage(view.state.doc, (value) => value === src, (node, pos) => found.push({ node, pos }));
  if (found.length === 0) return;
  const tr = view.state.tr;
  for (const { node, pos } of found.reverse()) {
    if (next === null) tr.delete(pos, pos + node.nodeSize);
    else tr.setNodeMarkup(pos, undefined, { ...node.attrs, src: next });
  }
  view.dispatch(tr.setMeta("addToHistory", false).setMeta(key, true));
  view.dom.dispatchEvent(new Event(IMAGES_CHANGED, { bubbles: true }));
}

let guardingUnload = false;

function guardUnload() {
  if (guardingUnload) return;
  guardingUnload = true;
  window.addEventListener("beforeunload", (event) => {
    if (uploading.size > 0 || reading.size > 0) event.preventDefault();
  });
}

function preload(url: string): Promise<void> {
  const image = new Image();
  image.src = url;
  return image.decode().catch(() => undefined);
}

function settle(url: string, ok: boolean) {
  uploading.delete(url);
  const preview = localPreviews.get(url);
  localPreviews.delete(url);
  for (const view of liveViews) updateImages(view, url, ok ? url : null);
  if (preview && ownedPreviews.delete(preview)) URL.revokeObjectURL(preview);
}

function beginUpload(blob: Blob, existingPreview?: string): string {
  const { url, done } = startEditorImageUpload(blob);
  const preview = existingPreview ?? URL.createObjectURL(blob);
  if (preview !== existingPreview) ownedPreviews.add(preview);
  localPreviews.set(url, preview);
  uploading.add(url);
  done.then(
    () => preload(url).then(() => settle(url, true)),
    (error: unknown) => {
      failed(error instanceof Error ? error.message : "No pude subir la imagen.");
      settle(url, false);
    }
  );
  return url;
}

function imageHolder(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLImageElement) || target.closest(".image-edit")) return null;
  return target.closest<HTMLElement>(".milkdown-image-block, .milkdown-image-inline");
}

function onImageLoad(event: Event) {
  imageHolder(event.target)?.removeAttribute("data-image-missing");
}

function onImageError(view: EditorView, event: Event) {
  const holder = imageHolder(event.target);
  if (!holder) return;
  holder.setAttribute("data-image-missing", MISSING);
  const src = (event.target as HTMLImageElement).getAttribute("src") ?? "";
  if (!view.editable || !editorImageIdFromSrc(src) || uploading.has(src) || checking.has(src)) return;
  checking.add(src);
  void apiFetch(src, { cache: "no-store" })
    .then((response) => {
      void response.body?.cancel().catch(() => undefined);
      if (response.status !== 404) return;
      return discardEditorImage(src, { faltante: true }).then((ok) => {
        if (ok) for (const live of liveViews) if (live.editable) updateImages(live, src, null);
      });
    })
    .catch(() => undefined)
    .finally(() => checking.delete(src));
}

const pendingImageUploads = $prose(() => {
  async function upload(view: EditorView, src: string) {
    reading.add(src);
    try {
      const blob = await fetch(src)
        .then((response) => (response.ok ? response.blob() : null))
        .catch(() => null);
      if (!blob) throw new Error("No pude recuperar una imagen pegada. Probá pegarla de nuevo.");
      const url = beginUpload(blob, src.startsWith("blob:") ? src : undefined);
      reading.delete(src);
      updateImages(view, src, url);
    } catch (error) {
      failed(error instanceof Error ? error.message : "No pude subir la imagen.");
      reading.delete(src);
      updateImages(view, src, null);
    }
  }

  function sync(view: EditorView) {
    if (view.isDestroyed || !view.editable) return;
    let started = false;
    eachImage(view.state.doc, isPendingImageSrc, (node) => {
      const src = String(node.attrs.src);
      if (reading.has(src)) return;
      started = true;
      void upload(view, src);
    });
    if (started) {
      void Promise.resolve().then(() => {
        if (!view.isDestroyed) view.dispatch(view.state.tr.setMeta(key, true).setMeta("addToHistory", false));
      });
    }
  }

  return new Plugin({
    key,
    view(view) {
      liveViews.add(view);
      guardUnload();
      const first = requestAnimationFrame(() => sync(view));
      const onError = (event: Event) => onImageError(view, event);
      view.dom.addEventListener("error", onError, true);
      view.dom.addEventListener("load", onImageLoad, true);
      return {
        update(view, prevState) {
          if (view.state.doc !== prevState.doc) sync(view);
        },
        destroy() {
          cancelAnimationFrame(first);
          liveViews.delete(view);
          view.dom.removeEventListener("error", onError, true);
          view.dom.removeEventListener("load", onImageLoad, true);
        },
      };
    },
    props: {
      decorations(state) {
        if (reading.size === 0 && uploading.size === 0) return null;
        const decorations: Decoration[] = [];
        eachImage(
          state.doc,
          (src) => reading.has(src) || uploading.has(src),
          (node, pos) => {
            decorations.push(
              Decoration.node(pos, pos + node.nodeSize, {
                class: "arq-image-uploading",
                "aria-busy": "true",
                "data-uploading": "Subiendo imagen…",
              })
            );
          }
        );
        return DecorationSet.create(state.doc, decorations);
      },
    },
  });
});

export const imageUploads: MilkdownPlugin[] = [remarkImageAttrs, pendingImageUploads].flat();
