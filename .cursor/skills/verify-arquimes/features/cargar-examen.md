# Cargar examen

Cargar examen is a short dump: attach a real file (PDF / image / doc), optionally write one line of what it is, and Guardar. The file bytes persist with the exam record. After a reload, the Exámenes list still shows the name and the file, and opening the exam can view it online (with optional download).

## Sub-features

- `examen-open` opens heading `Cargar examen` on `/materias/<id>/examen`. There is a real file input (`Archivo del examen`). No wizard, no modalidad, no fecha, no hardcoded temas, no objetivo personal.
- `examen-file` requires a file. Submit without one shows Spanish `role=alert` `Adjuntá el archivo del examen.` and stays on the form.
- `examen-note` optional one-liner (`De qué trata`, e.g. `Parcial 2023`). If empty, the list uses the filename.
- `examen-save` POSTs multipart with `credentials: 'include'`. Guardar persists the exam and its stored bytes/metadata. A toast is not proof.
- `examen-error` shows the Spanish error if the POST fails (file too big, cookie overflow, empty file). Never navigate as if saved.
- `examen-list` after save: Exámenes shows the note and the filename. Reopen the row: `Ver archivo online →` opens the in-app viewer and `Descargar` remains optional.

## How to get to it (user POV)

- On Resumen empty state, choose `Cargar examen →`.
- On a materia, open `/materias/[id]/examen`.

## Driving it with verify-arquimes

Preconditions:

- Doctor is green.
- A real tiny file on disk (example: 69-byte `parcial-2023.pdf`).

- **Open form.** From Resumen choose `Cargar examen`. Route `/materias/<id>/examen`. Heading `Cargar examen`. Control `Archivo del examen` exists. No `Paso 1 de 3`, `Modalidad`, `Objetivo personal`, `Derivadas`.
- **Missing file.** Choose `Guardar examen →` with no file. Alert `Adjuntá el archivo del examen.` URL stays on `/examen`.
- **Attach + note.** Choose `Elegir archivo` / `Archivo del examen` and pick the tiny PDF. Optional: `De qué trata` = `Parcial 2023`. Size under 1 KB shows bytes (`69 B`), not `0 KB`.
- **Submit.** Choose `Guardar examen →`. Wait for `/materias/<id>/examenes`.
- **Second view.** Reload the list. Note `Parcial 2023` and filename are visible. Capture `artifacts/verify-arquimes/cargar-examen-list.html`.
- **Open + viewer.** Open the row. `Ver archivo online →` opens `/materias/[id]/materiales/[materialId]` without forcing a download. Optional: `Descargar` yields the same tiny PDF. Reload the detail: file still named.
- **Overflow.** A file over 12 KB must fail in Spanish and must not appear on the list.

## Gotchas

- `if (!res.ok)` must not navigate. Never claim guardado when the file was dropped.
- Cookie credentials stay on this origin; a new port is a new empty store.
- `/api/materias/[id]/examenes` POST is multipart (`file`, optional `note`). JSON without a file is an error.
- The student list is the page `/materias/[id]/examenes`, not the JSON API.
