# Cargar examen

Cargar examen declares the exam the student is preparing: parcial or final, a date, a name, optional objective, and at least one tema. Resumen must show that exam after a reload.

## Sub-features

- `examen-open` opens `Crear examen objetivo`.
- `examen-fields` sends nombre, fecha, objetivo, tipo, and temas (not discarded UI).
- `examen-error` shows Spanish `role=alert` text if fecha or temas are missing, or if save fails.
- `examen-resumen` shows the exam name and temas on Resumen after refresh.

## How to get to it (user POV)

- On Resumen empty state, choose `Cargar examen →`.
- On a materia, open `/materias/[id]/examen`.
- From F2-style next step `Preparar un examen` if that card is shown.

## Driving it with verify-arquimes

Preconditions:

- A materia exists in this profile.
- Doctor is green.

- **Open form.** From Resumen choose `Cargar examen`. Route `/materias/<id>/examen`. Heading `Crear examen objetivo`.
- **Tipo.** Choose `Parcial` (pressed) or `Final`.
- **Nombre.** In `Nombre del examen` type `Parcial Verify`.
- **Fecha.** In `Fecha del examen` set a future date.
- **Objetivo.** In `Objetivo personal` type a short sentence (must persist, not an uncontrolled throwaway).
- **Temas.** Do not rely on calculus defaults. Type a tema in `Agregar otro tema` (e.g. `Cinemática`) and choose `Agregar tema` / `+`. At least one tema must be selected.
- **Submit.** Choose `Continuar →` (enabled even before fecha; missing fecha shows `Indicá la fecha del examen.`). Wait for Resumen.
- **Second view.** Reload `/materias/<id>`. Exam name `Parcial Verify` and tema `Cinemática` are visible. Capture `artifacts/verify-arquimes/cargar-examen-resumen.html`.
- **Failure path.** Submit without fecha; alert is visible and you stay on the form.

## Gotchas

- Suggested temas are previous temas of **this** materia, not a global calculus list.
- `if (!res.ok)` must not fail silently. No navigation on error.
- Cookie credentials stay on this origin; a new port is a new empty store.
