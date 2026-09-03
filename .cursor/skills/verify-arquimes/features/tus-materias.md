# Tus materias

Tus materias is the first useful screen: a list of the student's private materias with próximo examen, falta, preparado, and siguiente acción, or an empty state that invites creating one.

## Sub-features

- `home-empty` shows `No tenés materias todavía` and `+ Crear materia` when the session has none.
- `home-list` lists each materia name and does not invent a high preparado % without temas.
- `home-nav` reaches create from the empty CTA and from `+ Crear materia` when the list is populated.

## How to get to it (user POV)

- Open `/` (Inicio).
- Open `/materias` (redirects to `/`).
- Choose the Arquimes wordmark in the sidebar.

## Driving it with verify-arquimes

Preconditions:

- `bin/doctor` is green for this run.
- Browser or cookie jar is the run profile, not production.

- **Open home.** Go to `$BASE_URL/`. The heading `Tus materias` is visible and the sidebar shows `Arquimes`.
- **Empty state.** With a fresh profile, the copy `No tenés materias todavía` and a control named `Crear materia` appear. Capture `artifacts/verify-arquimes/tus-materias-empty.html`.
- **After create.** Complete [crear-materia](./crear-materia.md), then return to `/`. The new name is in the list. Reload once. The name is still there.
- **Proof.** Screenshot or HTML includes the wordmark and `Tus materias`.

## Gotchas

- `/materias` is a redirect, not a second app. Assert the landing heading.
- Preparedo `%` on a row with no temas must be `—`, not a fake score.
- Driving Vercel here invalidates the run.
