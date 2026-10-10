import assert from "node:assert/strict";
import test from "node:test";
import {
  captionFromAlt,
  editorImageError,
  editorImageIdFromSrc,
  editorImageIds,
  withoutEditorImage,
  withoutPendingImages,
} from "./editor-images.ts";
import { extractoPlano } from "./editor-markdown.ts";

test("saca las imágenes que todavía no se subieron sin dejar líneas de más", () => {
  const input = "Antes\n\n![1.00](blob:http://localhost/abc)\n\nDespués";
  assert.equal(withoutPendingImages(input), "Antes\n\nDespués");
});

test("saca imágenes data: en línea y deja el texto", () => {
  assert.equal(withoutPendingImages("Mirá ![](data:image/png;base64,iVBORw0KGgo=) acá"), "Mirá  acá");
});

test("deja las imágenes subidas y las remotas", () => {
  const input = "![1.00](/api/imagenes/abc)\n\n![dados](https://example.com/a.png \"dados\")";
  assert.equal(withoutPendingImages(input), input);
});

test("no toca bloques de código", () => {
  const input = "```md\n![](blob:http://localhost/abc)\n```";
  assert.equal(withoutPendingImages(input), input);
});

test("valida tipo y tamaño de las imágenes del editor", () => {
  assert.equal(editorImageError("image/png", 1024), null);
  assert.match(editorImageError("image/svg+xml", 1024) ?? "", /formato/);
  assert.match(editorImageError("image/png", 21 * 1024 * 1024) ?? "", /20 MB/);
});

test("el extracto no muestra la proporción de las imágenes", () => {
  assert.equal(extractoPlano("Intro\n\n![1.00](/api/imagenes/abc)\n\nFin"), "Intro Fin");
  assert.equal(extractoPlano("![diagrama](https://example.com/a.png)"), "diagrama");
});

const ID = "0f8fad5b-d9cb-469f-a165-70867728950e";
const OTRO = "7c9e6679-7425-40de-944b-e07fc1f90ae7";

test("encuentra las imágenes del editor en el Markdown", () => {
  const input = `![1.00](/api/imagenes/${ID})\n\nTexto ![](/api/imagenes/${OTRO} "x") y ![](/api/imagenes/${ID})`;
  assert.deepEqual(editorImageIds(input), [ID, OTRO]);
  assert.deepEqual(editorImageIds("![](/api/imagenes/no-es-un-id)"), []);
  assert.equal(editorImageIdFromSrc(`/api/imagenes/${ID}`), ID);
  assert.equal(editorImageIdFromSrc(`https://otro.sitio/api/imagenes/${ID}`), null);
});

test("saca una imagen del editor sin tocar las demás ni el código", () => {
  const codigo = "```\n![](/api/imagenes/" + ID + ")\n```";
  const input = `Antes\n\n![1.00](/api/imagenes/${ID} "Fuerzas")\n\n![1.00](/api/imagenes/${OTRO})\n\n${codigo}`;
  assert.equal(withoutEditorImage(input, ID), `Antes\n\n![1.00](/api/imagenes/${OTRO})\n\n${codigo}`);
  assert.equal(withoutEditorImage("Sin imágenes", ID), "Sin imágenes");
});

test("pasa el texto alternativo al epígrafe cuando no es una proporción", () => {
  assert.deepEqual(captionFromAlt("Diagrama de fuerzas", ""), { alt: "", title: "Diagrama de fuerzas" });
  assert.deepEqual(captionFromAlt("1.00", ""), { alt: "1.00", title: "" });
  assert.deepEqual(captionFromAlt("Diagrama", "Epígrafe"), { alt: "Diagrama", title: "Epígrafe" });
  assert.deepEqual(captionFromAlt(null, null), { alt: "", title: "" });
});
