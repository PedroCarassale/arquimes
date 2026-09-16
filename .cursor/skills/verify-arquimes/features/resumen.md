# Resumen

Resumen answers ¿qué tan preparado estoy? for one materia: próximo examen, preparación estimada, and the next action. Empty exam or temas must say so in Spanish. It must not invent a high score.

## Sub-features

- `resumen-empty-exam` says there is no exam and points to cargar examen / subir material.
- `resumen-exam` shows the saved exam name (or filename) after [cargar-examen](./cargar-examen.md). Reload. Same exam still shows.
- `resumen-temas` lists per-tema states starting at no estudiado.
- `resumen-tabs` reaches Apuntes without leaving the materia.

## How to get to it (user POV)

- Choose a materia row on `Tus materias`.
- After create, `/materias/[id]/inicio` redirects here.
- Open `/materias/[id]`.
- Choose the `Resumen` tab.

## Driving it with verify-arquimes

Preconditions:

- A materia exists in this profile (see crear-materia).
- Doctor is green.

- **Open resumen.** From `/` choose the materia name. Route `/materias/<id>`. Heading is the materia name.
- **No exam.** If none, copy includes `No tenés ningún examen cargado` and a control to `Cargar examen`. Capture that state.
- **With exam.** After [cargar-examen](./cargar-examen.md), Resumen shows the exam **name** (the note) and/or the filename. Reload. Same exam still shows.
- **Proof.** Artifact in `artifacts/verify-arquimes/resumen.html` includes materia heading plus exam name or the empty-exam sentence.

## Gotchas

- `inicio` redirects to Resumen when the materia exists; a 404 means the cookie session is wrong.
- Do not treat a hardcoded 78% as success.
- La barra principal de materia tiene solo `Resumen`, `Apuntes` y `Chat`. Las rutas de examen/práctica siguen vivas y se disparan desde CTAs de Resumen o por URL directa.
- A `0%` with `No estudiado` is honest until [práctica](./practica.md) is answered. Do not treat `—` with temas as success.
