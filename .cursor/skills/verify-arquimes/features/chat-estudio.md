# Chat de estudio

Chat de estudio lives in `/materias/[id]/chat` as the primary study companion. It supports multi-session chats per materia, shortcut chips, and grounded answers from apuntes + archivo del examen + nota + temas. If there is no provider key, it must fail honestly in Spanish. Sessions and messages persist in durable storage.

## Sub-features

- `chat-empty-materia` on a materia with no apuntes/exam files answers honestly that there is no material (no fake preparado, no generic chatbot voice).
- `chat-shortcut` sends at least one atajo chip from the composer.
- `chat-session-create` creates a new chat session and shows it in the left list.
- `chat-grounded-or-provider-missing` after loading material, sending a question returns either a grounded response (with source context) or an explicit provider-missing error.
- `chat-persist` still shows the same session/thread after a full reload.

## How to get to it (user POV)

- Open a materia and enter tab `Chat`.
- The left panel button `+ Nuevo chat` creates sessions.
- Composer accessible name: `Escribí un mensaje`. Send: `Enviar mensaje`.
- Use one shortcut chip (e.g. `Haceme un resumen completo de lo que entra.`).

## Driving it with verify-arquimes

Preconditions:

- Doctor is green.
- Fresh profile (or a materia you just created).
- Un PDF real con capa de texto (no un PDF vacío).

```bash
.cursor/skills/verify-arquimes/bin/drive-chat-estudio
```

- **Empty + atajo.** From `/` create a materia, open `Chat`, click one atajo chip and verify the answer is honest when material is missing. Capture `artifacts/verify-arquimes/chat-empty.html`.
- **Load exam info.** Upload one apunte PDF en `/cargar`, verificar `grounding.readableCount > 0` en `/api/chat`, luego crear examen en `/examen` con nota y agregar un tema desde el detalle.
- **New session + send.** Back in `Chat`, click `+ Nuevo chat`, send `¿Qué describe el tensor de Cauchy-Stress?` and capture `artifacts/verify-arquimes/chat-grounded.html`.
- **Expected response.** Accept either grounded content using uploaded material or a clear provider-missing error (`No hay proveedor...` / missing key). Never allow fake readiness claims.
- **Persist.** Full reload. Session remains listed and the thread still contains the sent question. Capture `artifacts/verify-arquimes/chat-persist.html`.

## Gotchas

- Do not POST `/api/chat` as a substitute for the composer. Drive real UI only.
- Un PDF vacío (~69 bytes) no prueba grounding; usar un PDF con texto seleccionable.
- Re-running on the same Chromium `USER_DATA_DIR` keeps prior cookies. Use suffixed names to avoid false positives.
