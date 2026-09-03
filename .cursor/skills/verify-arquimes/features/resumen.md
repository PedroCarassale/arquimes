# Resumen

Resumen answers ¿qué tan preparado estoy? for one materia: próximo examen, preparación estimada, and the next action. Empty exam or temas must say so in Spanish. It must not invent a high score.

## Sub-features

- `resumen-empty-exam` says there is no exam and points to cargar examen / subir material.
- `resumen-exam` shows the saved exam name or tipo, date, and days remaining.
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
- **With exam.** After [cargar-examen](./cargar-examen.md), Resumen shows the exam **name** (not only Parcial/Final) and at least one tema. Reload. Same exam still shows.
- **Proof.** Artifact in `artifacts/verify-arquimes/resumen.html` includes materia heading plus exam name or the empty-exam sentence.

## Gotchas

- `inicio` redirects to Resumen when the materia exists; a 404 means the cookie session is wrong.
- Do not treat a hardcoded 78% as success.
- Tabs `Programa y temas`, `Práctica`, `Chat` (tab), `Miembros` may be disabled. `Exámenes` and `Apuntes` are real. The shell chat rail is separate.
