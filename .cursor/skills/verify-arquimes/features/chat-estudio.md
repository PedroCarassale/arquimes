# Chat de estudio

Chat de estudio lives in `/materias/[id]/chat` as the primary study companion. It supports multi-session chats per materia, shortcut chips, and progressive tutoring grounded in apuntes + archivo del examen + nota + temas. Teaching answers map visible topics, open one block at a time, render KaTeX formulas, and close with a comprehension check. Sessions and messages persist in durable storage.

## Sub-features

- `chat-empty-materia` on a materia with no apuntes/exam files answers honestly that there is no material (no fake preparado, no generic chatbot voice).
- `chat-shortcut` sends at least one atajo chip from the composer.
- `chat-session-create` creates a new chat session and shows it in the left list.
- `chat-optimistic-messenger` shows the user bubble on the right and a visible assistant-side `Pensando` state before the response.
- `chat-grounded-tutor` uses the disposable local OpenAI-compatible provider to verify a long grounded response with a topic map, progressive first block, formulas, citations, and 2–3 questions.
- `chat-persist` still shows the same session/thread after a full reload.

## How to get to it (user POV)

- Open a materia and enter tab `Chat`.
- The left panel button `+ Nuevo chat` creates sessions.
- Composer accessible name: `Escribí un mensaje`. Send: `Enviar mensaje`.
- Use the learning shortcut chip (`Necesito aprender todo el apunte...`).

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
- **Expected response.** The local mock rejects the request unless the server prompt contains all four concepts recovered from the beginning, middle, and end of the disposable PDF plus the tutor contract. The rendered answer must have a topic map, one progressive block, at least two checks, KaTeX, and the exact source citation. Never allow fake readiness claims.
- **Messenger.** Capture `artifacts/verify-arquimes/chat-thinking.png` while the optimistic user bubble and assistant thinking indicator are both visible. Verify user bubble is to the right of the assistant bubble.
- **Persist.** Full reload. Session remains listed and the thread still contains the sent question. Capture `artifacts/verify-arquimes/chat-persist.html`.

## Gotchas

- Do not POST `/api/chat` as a substitute for the composer. Drive real UI only.
- `bin/launch` starts a loopback-only OpenAI-compatible mock; it never calls production.
- Un PDF vacío (~69 bytes) no prueba grounding; usar un PDF con texto seleccionable.
- Re-running on the same Chromium `USER_DATA_DIR` keeps prior cookies. Use suffixed names to avoid false positives.
