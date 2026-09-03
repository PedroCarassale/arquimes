# Apuntes / upload

Apuntes is the private file library for one materia. The student selects real files, they belong to that materia, and they list again after reload. A failed upload must show Spanish error text and must not claim success.

## Sub-features

- `apuntes-open` opens the library from the Apuntes tab.
- `apuntes-cargar` opens `Seleccionar archivos` (`/materias/[id]/cargar`).
- `apuntes-save` stores a small file and lists its name on Apuntes.
- `apuntes-error` surfaces a Spanish error if the file cannot be stored (too large, empty, or session overflow).

## How to get to it (user POV)

- On Resumen, choose `Apuntes`.
- On Resumen, choose `Cargar apuntes` / `Subir material`.
- Open `/materias/[id]/apuntes`.
- Open `/materias/[id]/cargar`.
- Sidebar `Archivos` (first materia's apuntes when any exist).

## Driving it with verify-arquimes

Preconditions:

- A materia exists.
- A real file on disk ≤ 12 KB (this session store cannot hold larger bytes). Example: a tiny `nota.txt`.

- **Open library.** From Resumen choose `Apuntes`. Heading `Apuntes y material`.
- **Select files.** Choose `Cargar apuntes` or go to `/cargar`. Heading `Seleccionar archivos`. Choose `Explorar archivos` and pick the real file, or drop it on `Arrastrá los archivos acá`.
- **Submit.** Choose `Continuar →`. If the response is an error, the alert text is Spanish and the URL stays on cargar. Do not continue.
- **Second view.** On Apuntes the filename is visible. Reload. Still visible. Optional side-effect: `Abrir →` downloads bytes for that file in this session.
- **Proof.** `artifacts/verify-arquimes/apuntes.html` contains the filename.

## Gotchas

- This slice stores file bytes in the session cookie budget. Files over 12 KB must fail visibly, not redirect as if saved.
- Silent `catch` + navigate to Apuntes is a bug; treat as fail.
- Do not use a production blob URL as proof unless this local instance actually wrote it.
