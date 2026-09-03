---
name: verify-arquimes
description: Drive the Arquimes Next.js web UI locally the way a student does. Use when proving slice-1 flows (Tus materias, crear materia, resumen, apuntes, cargar examen, chat de estudio, práctica) or after changing those screens. Never use this skill against the Vercel production deploy.
---

# verify-arquimes

Arquimes is a private exam-prep Next.js app. Students create a materia, upload files, declare an exam, and read an honest resumen. Persistence is an httpOnly cookie store on the **browser origin** (`127.0.0.1:<port>`), so two windows on the same origin share data. Isolation is a unique port **and** a disposable browser profile (cookie jar or Chromium `user-data-dir`).

**One Next.js dev server per checkout.** Next 16 refuses a second `npm run dev` in the same `/workspace` (lock in `.next`). Two isolated Next processes are therefore **not** possible here. Do not start another. If `run/current` is green, reuse it. If some other `next dev` owns the repo, stop that run only if it is this verification PID; otherwise refuse rather than hijacking a stranger's server. Isolate browser data with `USER_DATA_DIR` / cookie jar even when the port is unique.

**Refuse production.** Do not doctor or drive `https://arquimes-app.vercel.app` or any `*.vercel.app` host. That origin is a different cookie jar and is not this run.

**Refuse a second drive** of an instance you did not launch. If `.cursor/skills/verify-arquimes/run/current` exists and `bin/doctor` is green, reuse that instance.

## Launch

Repo command: `npm run dev -- --port <PORT> --hostname 127.0.0.1`

```bash
.cursor/skills/verify-arquimes/bin/launch
```

What it does:

- Picks a free port in `43131–43189` (or uses `VERIFY_PORT`).
- Writes run state to `.cursor/skills/verify-arquimes/run/current` (`PORT`, `PID`, `BASE_URL`, `COOKIE_JAR`, `USER_DATA_DIR`, `LOG`).
- Starts Next.js from the repo root with that port, bound to `127.0.0.1` only.
- Ready when `GET $BASE_URL/` returns HTTP 200 and the HTML contains `Arquimes` and `Tus materias`.
- Browser profile / cookie jar live under `/tmp/arquimes-verify-<run-id>/` (disposable).

Teardown: `.cursor/skills/verify-arquimes/bin/cleanup` (kills **that PID only**; does not delete evidence).

There is no auth. Empty cookie jar = empty materias list.

## Doctor

Read-only. Run first, and again after any failed drive.

```bash
.cursor/skills/verify-arquimes/bin/doctor
```

It answers: is **this** run worth driving?

- `current` state file exists.
- `PID` is alive.
- `BASE_URL` is `http://127.0.0.1:<port>` (fails if the host is Vercel or not loopback).
- That PID owns `PORT` (`lsof` / `/proc/net`).
- `GET $BASE_URL/` is 200 and the body contains `Arquimes`.

Exit `0` only if all pass. Distinguishes this instance from another local window and from production.

## Drive

Harness: `verify-arquimes` helpers plus a real browser (Playwright Chromium with `USER_DATA_DIR`, or Cursor browser tools) against `$BASE_URL` from `run/current`.

Stable handles (prefer these, never generated CSS hashes, child indexes, or coordinates unless a fresh screenshot is last resort):

| Handle | Kind |
| --- | --- |
| `Tus materias` | visible heading, route `/` |
| `Crear materia` / `+ Crear materia` | link/button name, route `/materias/nueva` |
| `Empezá tu propio espacio` | heading on create |
| `Nombre de la materia` | textbox accessible name |
| `Crear materia →` | button name |
| `Unirme a una materia` / `Próximamente` | disabled community column — do not treat as a path |
| materia name heading | route `/materias/[id]` Resumen |
| `Apuntes` | tab, route `/materias/[id]/apuntes` |
| `Seleccionar archivos` | heading, route `/materias/[id]/cargar` |
| `Cargar examen` | heading, route `/materias/[id]/examen` |
| `Archivo del examen`, `De qué trata` | file input + optional one-line note |
| `Guardar examen →` | exam submit (multipart file + note) |
| `Exámenes` | tab, route `/materias/[id]/examenes` |
| `Descargar archivo →` | exam file bytes on `/materias/[id]/examenes/[examId]` |
| `Agregar otro tema`, `Agregar tema` | add a tema on the exam detail |
| `Guardar archivos →` | apuntes upload submit |
| `Chat de estudio`, `Escribí un mensaje` | shell composer (always on screen; grounded in the open materia) |
| `Enviar mensaje` | send in the study chat rail |
| `Práctica` | tab, route `/materias/[id]/practica` |
| `Tu respuesta` | practice textarea |
| `Así lo explicaría` / `Todavía no` | practice submit |
| `Practicar ahora →` | Resumen link into práctica |

One mapped feature per drive unless the task names more. Start from `/` unless the feature file says otherwise. A toast or `Creando...` is not proof: reopen from **Tus materias** (or Apuntes list) after refresh.

```bash
.cursor/skills/verify-arquimes/bin/drive-crear-materia
```

That helper is the scripted path for `crear-materia`. Other features: follow `features/*.md` in a browser pointed at `$BASE_URL` with `USER_DATA_DIR`.

```bash
.cursor/skills/verify-arquimes/bin/drive-chat-estudio
```

Scripted path for `chat-estudio`: empty chat → upload apunte → grounded reply with citation persists after reload.

```bash
.cursor/skills/verify-arquimes/bin/drive-practica
```

Scripted path for `practica`: empty tab → cargar examen (file + note) → add a tema on the exam detail → answer one item → Resumen mastery/preparado after reload.

## Evidence

Directory (Cleanup must not delete this):

`artifacts/verify-arquimes/`

Proof standards:

- Exercise the real UI path (click, type, submit). Do not POST `/api/*` as a substitute for the button, inject DOM, or call test-only endpoints.
- Capture the action and the resulting state (HTML or screenshot **before** and **after**).
- Screenshots must show Arquimes chrome (wordmark or `Tus materias` / create heading).
- Mutations need a second view: after crear materia, open `/` (or go **Tus materias**) and see the name. After cargar examen, open **Exámenes**, reload, and see the note plus filename; then open the row and download the file. After práctica, answer one item then open Resumen and refresh: mastery and preparación estimada must change. After upload, open Apuntes and see the filename.
- File upload: a real file on disk, then the name on Apuntes after reload.

## Cleanup

```bash
.cursor/skills/verify-arquimes/bin/cleanup
```

- Sends SIGTERM to the PID recorded in `run/current` only. Never `pkill next` / `killall node`.
- Removes `/tmp/arquimes-verify-<run-id>/` and `run/current`.
- Leaves `artifacts/verify-arquimes/` in place.
- After cleanup, confirm artifacts still exist (`ls artifacts/verify-arquimes`).
- Run cleanup after failed iterations too.

## Helpers

All executable from repo root:

| Command | Purpose |
| --- | --- |
| `.cursor/skills/verify-arquimes/bin/launch` | Start isolated `npm run dev` |
| `.cursor/skills/verify-arquimes/bin/doctor` | Read-only health of this run |
| `.cursor/skills/verify-arquimes/bin/drive-crear-materia` | Browser path: empty home → create → list |
| `.cursor/skills/verify-arquimes/bin/drive-cargar-examen` | Browser path: create materia → attach tiny PDF + note → Exámenes list + download after reload |
| `.cursor/skills/verify-arquimes/bin/drive-chat-estudio` | Browser path: empty materia chat → upload txt → grounded reply persists |
| `.cursor/skills/verify-arquimes/bin/drive-practica` | Browser path: empty práctica → exam file + tema → answer → resumen mastery |
| `.cursor/skills/verify-arquimes/bin/cleanup` | Tear down this run only |

Feature recipes: `.cursor/skills/verify-arquimes/features/`.
