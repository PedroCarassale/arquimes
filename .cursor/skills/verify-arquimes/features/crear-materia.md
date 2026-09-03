# Crear materia

Crear materia opens a private space from `Empezá tu propio espacio`. The student types a name (and optional universidad/cátedra) and lands on that materia. Unirse is not a working path.

## Sub-features

- `create-open` opens the create screen from home.
- `create-save` persists name (and optional facultad/cátedra) and navigates to the new materia.
- `create-unirse-disabled` shows `Unirme a una materia` as `Próximamente` and must not create or join anything.
- `create-persist` still lists the materia on `/` after a full reload.

## How to get to it (user POV)

- Choose `+ Crear materia` on empty `Tus materias`.
- Choose `+ Crear materia` under a populated list.
- Open `/materias/nueva` directly.

## Driving it with verify-arquimes

Preconditions:

- `bin/doctor` is green.
- No materia titled `Verify Química` exists in this profile.

- **Open create.** From `/` choose `Crear materia` (link or button). Run `bin/drive-crear-materia` or click the control named `Crear materia`. Route is `/materias/nueva`. Heading includes `Crear o unirse a una materia` and `Empezá tu propio espacio`.
- **Fill name.** Focus the textbox `Nombre de la materia`. Type `Verify Química`.
- **Submit.** Choose `Crear materia →`. Wait until the URL is `/materias/<id>/inicio` then Resumen (`/materias/<id>`), or the materia heading `Verify Química` is visible.
- **Second view.** Go to `/`. The list contains `Verify Química`. Reload. It is still there.
- **Unirse.** The right column still says `Próximamente`. Do not treat it as success.
- **Proof.** Save HTML/screenshot of create and of `/` after reload to `artifacts/verify-arquimes/crear-materia-home.html`.

## Gotchas

- `fetch` must keep the same origin cookies (`credentials: include` is already default same-origin). A second browser profile will look empty.
- `Creando...` is not proof. The list after reload is.
- Community search or invite codes are out of scope; skip if they appear as disabled.
