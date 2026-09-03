# Práctica

Práctica is a short recall question from the materia's temas (and file names if any). Answering updates tema mastery so Resumen's preparación estimada is no longer stuck at "—" or 0% without evidence. No wizard. Empty copy is honest when there are no temas or files.

## Sub-features

- `practica-tab` reaches `/materias/[id]/practica` from the `Práctica` tab (not `cursor-not-allowed`).
- `practica-empty` says there are no temas nor files, or that files exist but temas are missing, in Spanish.
- `practica-item` shows one short question for a tema, with `Tu respuesta`.
- `practica-mastery` answering `Así lo explicaría` moves the tema off `No estudiado` and changes preparación estimada after a Resumen refresh.

## How to get to it (user POV)

- Inside a materia, choose the `Práctica` tab.
- On Resumen with temas, choose `Practicar ahora →`.
- Open `/materias/[id]/practica`.

## Driving it with verify-arquimes

Preconditions:

- Doctor is green.
- Use a non-calculus materia (e.g. `Mecánica de fluidos`) so leaked lists cannot hide.

- **Empty.** Create a materia. Choose `Práctica`. Copy includes `No hay temas ni archivos para practicar.` Capture `artifacts/verify-arquimes/practica-empty.html`.
- **Setup.** From Resumen choose `Cargar examen`. Name, date, one tema the student types (e.g. `Ecuación de Bernoulli`). `Guardar examen →`. Reload Resumen: tema is `No estudiado` and preparación is `0%` (not a fake high score).
- **Open práctica.** Choose `Práctica`. Heading `Práctica`. Prompt mentions the tema. No `Paso 1 de`.
- **Answer.** Focus `Tu respuesta`. Type a short sentence. Choose `Así lo explicaría`. Wait until `Práctica guardada` (not only `Guardando...`).
- **Second view.** Choose `Ver preparación en Resumen` or the `Resumen` tab. Reload. The tema is `Estudiado`. Preparación estimada is greater than `0%` and is not `—`. Capture `artifacts/verify-arquimes/practica-resumen-after.html`.

```bash
.cursor/skills/verify-arquimes/bin/drive-practica
```

## Gotchas

- Do not POST `/api/materias/[id]/practica` as a substitute for the button.
- `Así lo explicaría` requires a phrase (about 8 characters). `Todavía no` still moves `No estudiado` to `Empezado`.
- Tabs `Programa y temas`, `Chat` (tab), `Miembros` stay disabled. The shell chat rail is separate. Do not treat sidebar `Práctica` (global, still disabled) as this path.
- Cookie credentials stay on this origin; a new port is a new empty store.
