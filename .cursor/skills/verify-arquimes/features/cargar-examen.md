# Cargar examen

Cargar examen declares the exam the student is preparing: nombre, parcial or final, a date, optional objective, optional temas the student types. Resumen, the Exámenes list, and the exam detail must show that exam after a reload. Re-opening `/examen` is always a blank create form.

## Sub-features

- `examen-open` opens `Crear examen objetivo` with the materia name already on screen (never `Cargando...`).
- `examen-honesty` does not claim `Paso 1 de 3`. Submit is `Guardar examen →`. Suggested temas are not a hardcoded calculus list.
- `examen-fields` stores nombre, fecha, objetivo, tipo, modalidad, and any temas the student added.
- `examen-error` shows Spanish `role=alert` if nombre or fecha is missing, if save fails, or if the same nombre+fecha already exists.
- `examen-resumen` shows the exam **name**, tipo, objetivo, and temas on Resumen after refresh.
- `examen-list` reaches `/materias/[id]/examenes` from the Exámenes tab: view, edit, delete. Creating the same nombre+fecha again is refused.

## How to get to it (user POV)

- On Resumen empty state, choose `Cargar examen →`.
- On a materia, open `/materias/[id]/examen`.
- From the Exámenes tab, choose `Cargar examen →`.

## Driving it with verify-arquimes

Preconditions:

- Doctor is green.
- Use a materia that is **not** calculus (e.g. `Álgebra lineal`) so a leaked Derivadas list cannot hide.

- **Open form.** From Resumen choose `Cargar examen`. Route `/materias/<id>/examen`. Heading `Crear examen objetivo`. Materia field shows the materia name immediately. Nombre is empty (not `Primer parcial`). No `Paso 1 de 3`. No `Derivadas` / `Integrales`. `Guardar examen →` is enabled with zero temas.
- **Nombre / fecha.** Submit empty → `Indicá el nombre del examen.` Fill nombre, submit without fecha → `Indicá la fecha del examen.` Stay on the form.
- **Temas.** Type a tema for this materia (e.g. `Espacios vectoriales`) in `Agregar otro tema` and choose `Agregar tema`. Temas are optional; do not require a checkbox from a suggested list.
- **Submit.** Choose `Guardar examen →`. Wait for Resumen.
- **Second view.** Reload `/materias/<id>`. Exam name (`Parcial 1`), tipo Parcial, objetivo, and tema are visible. Capture `artifacts/verify-arquimes/cargar-examen-resumen.html`.
- **List / detail.** Choose `Exámenes`. The exam is a real link. Open it (`Editar examen`). Name and objective are filled. Change objective, save, reload: still there.
- **No silent duplicate.** Re-open `/examen`: blank form. Submit the same nombre+fecha → `Ya existe un examen con ese nombre y esa fecha.` URL stays on create.
- **Upload honesty (same drive).** `/cargar` has no `Paso 1 de 5`. A 69-byte PDF shows `69 B`, not `0 KB`. After `Guardar archivos →`, Apuntes lists the file and `69 B`.
- **Delete.** From exam detail, `Eliminar este examen` → confirm. Exámenes empty copy: `Todavía no cargaste un examen`.

## Gotchas

- Do not invent a programa. The student types temas. Previous temas of **this** materia are not offered as a fake syllabus for another subject.
- `if (!res.ok)` must not fail silently. No navigation on error.
- Cookie credentials stay on this origin; a new port is a new empty store.
- `/api/materias/[id]/examenes` is the JSON API. The student list is the page `/materias/[id]/examenes`.
