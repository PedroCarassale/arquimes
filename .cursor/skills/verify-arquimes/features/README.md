# Arquimes verification map

This directory is the maintained source for verifying slice-1 user-facing behavior. Read this index before driving, then use the matching feature file.

## Baseline preconditions

- Launch Arquimes with `.cursor/skills/verify-arquimes/bin/launch` from the repo root.
- Drive only `$BASE_URL` from `.cursor/skills/verify-arquimes/run/current` (`http://127.0.0.1:<port>`).
- Run `.cursor/skills/verify-arquimes/bin/doctor` and require a live PID that owns that port.
- Use the run's cookie jar / Chromium `USER_DATA_DIR`. Do not reuse a personal browser profile.
- Never drive `https://arquimes-app.vercel.app`.
- Community copy (`Unirme a una materia`, `Próximamente`) is not a feature path.

## Driving conventions

- Start from `/` unless the feature lists another entry point.
- Prefer accessible names and route paths over CSS or coordinates.
- Treat quoted Spanish strings as literal.
- After a mutation, reload or navigate to a second view before claiming proof.
- Restore nothing global; cookies die with the profile. Do not delete `artifacts/verify-arquimes/`.

## Proof and skip reporting

- Capture action + resulting state, not only the last screen.
- UI proof: HTML snapshot or screenshot with Arquimes identity visible.
- Persistence proof: the same name still visible after a full page reload.
- Report an unreachable path with the command and the unmet precondition.
- Do not report a skipped entry point as verified through a different path.

## Feature entry contract

Each file starts with an H1 and one paragraph, then exactly these H2s:

1. `Sub-features`
2. `How to get to it (user POV)`
3. `Driving it with verify-arquimes`
4. `Gotchas`

## Features

- [Tus materias](./tus-materias.md) — home list and empty state.
- [Crear materia](./crear-materia.md) — private space create, not unirse.
- [Resumen](./resumen.md) — north-star exam readiness.
- [Apuntes / upload](./apuntes-upload.md) — files belonging to a materia.
- [Cargar examen](./cargar-examen.md) — parcial/final with date, name, temas.
- [Práctica](./practica.md) — short question from temas; answering updates mastery.
