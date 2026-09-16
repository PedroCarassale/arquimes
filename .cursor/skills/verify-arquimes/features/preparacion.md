# Preparación

Preparación is opt-in per materia. Students define `Temas a evaluar` + `Fecha del parcial`, then generate a structured plan from GPT. Resumen should not force empty prep blocks when this is unset.

## Sub-features

- `preparacion-empty-cta`: on Resumen without config, a light CTA points to `Preparación`.
- `preparacion-form`: `/materias/[id]/preparacion` allows saving temas + fecha.
- `preparacion-plan`: after generate/regenerate, plan renders from structured fields (`resumen`, `semanas`, `agendaDiaria`, `hitos`).
- `preparacion-persist`: reload keeps config and last generated plan for that materia.

## How to get to it (user POV)

- Open a materia.
- From `Resumen`, click `Configurar preparación` or open tab `Preparación`.

## Driving it with verify-arquimes

Preconditions:

- Doctor is green.
- A materia exists in this profile.
- `OPENAI_API_KEY` is configured (or local OpenAI-compatible mock for disposable verification).

- **Empty CTA.** On Resumen with no preparación configurada, confirm a light CTA to `Preparación`. Capture `artifacts/verify-arquimes/preparacion-cta-empty.png`.
- **Fill + save.** In tab `Preparación`, write at least 3 temas (one per line), set `Fecha del parcial`, save, and confirm success message. Capture `artifacts/verify-arquimes/preparacion-form-filled.png`.
- **Generate.** Click `Generar plan` and wait for rendered `Resumen del plan`, `Semanas`, `Agenda diaria`, and `Hitos`. Capture `artifacts/verify-arquimes/preparacion-plan-rendered.png`.
- **Persist.** Reload the page. Verify same temas, fecha, and last plan are still visible.

## Gotchas

- Do not call `/api/materias/[id]/preparacion/plan` directly as proof; use the button.
- If temas or fecha change, the previous plan is intentionally invalidated until regenerated.
- Keep evidence local (`127.0.0.1`), never production Vercel URL.
