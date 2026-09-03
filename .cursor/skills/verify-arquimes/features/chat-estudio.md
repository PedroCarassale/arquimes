# Chat de estudio

Chat de estudio is the always-on rail (`Chat de estudio`) that answers from the student's materia: apuntes and uploaded exam files when they have readable text. Empty material must say so in Spanish. The thread persists in the same cookie session.

## Sub-features

- `chat-empty-materia` on a materia with no apuntes/exam files answers honestly that there is no material (no fake preparado, no generic chatbot voice).
- `chat-grounded` after a small uploaded file, a question that file can answer is replied using that file and citing its name.
- `chat-persist` still shows the same thread in the rail after a full reload of the materia.
- `chat-home` off a materia does not invent a syllabus; copy tells the student to open a materia.

## How to get to it (user POV)

- The rail `Chat de estudio` is always on the right of the app shell.
- Sidebar `Chats` jumps to `#estudio-chat`.
- Composer accessible name: `Escribí un mensaje`. Send: `Enviar mensaje`.
- The Chat tab on a materia may stay disabled; the rail is the path.

## Driving it with verify-arquimes

Preconditions:

- Doctor is green.
- Fresh profile (or a materia you just created).
- A real tiny text file on disk (not a blank PDF).

```bash
.cursor/skills/verify-arquimes/bin/drive-chat-estudio
```

- **Empty.** From `/` create a materia (e.g. `Mecánica del continuo`). On Resumen, in `Chat de estudio`, type a content question (`¿Qué describe el tensor de Cauchy-Stress?`) and `Enviar`. The Arquimes reply says there are no apuntes / archivos de examen. It must not claim the student is preparado. Capture `artifacts/verify-arquimes/chat-empty.html`.
- **Upload.** Open `Cargar apuntes` / `/cargar`. `Explorar archivos` with a small `.txt` whose body contains a unique token the question can hit (the drive helper writes `cauchy-stress.txt`). `Guardar archivos →`. Apuntes lists the filename after reload.
- **Grounded.** Back on the materia, ask the same question in the rail. The reply quotes or uses the file body and names `cauchy-stress.txt` (visible as `Fuente:` or inside the answer). Capture `artifacts/verify-arquimes/chat-grounded.html`.
- **Persist.** Full reload. The user question and the grounded reply are still in the rail. Capture `artifacts/verify-arquimes/chat-persist.html`.

## Gotchas

- Do not POST `/api/chat` as a substitute for the composer. Cookie session is the browser origin.
- A 69-byte empty PDF is not readable text; use a `.txt` (or a PDF with a text layer) to prove grounding.
- Exam create/upload is another agent's path. Chat must still read apuntes of this materia, and exam `note` / `fileContentBase64` if those store fields are present.
- Home without a materia is not a generic chatbot. Community copy is not a chat path.
