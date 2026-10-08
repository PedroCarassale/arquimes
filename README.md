# Arquímedes

**La facu organizada.**

Arquímedes es el lugar donde organizás toda tu vida de estudio en la facu: tus materias, las clases que tomás, tus apuntes, el calendario de exámenes y entregas, y un chat que estudia con vos usando lo que cargaste.

Cada materia tiene cuatro secciones: **Inicio · Clases · Apuntes · Calendario**. Todo es privado: no hay nada compartido.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- Better Auth (email+contraseña + Google OAuth)
- Materias, exámenes, temas, chats y archivos en SQLite/libSQL (Turso) con scope por `user_id`
- **Chat multi-sesión durable** con SQLite/libSQL (`@libsql/client`) para Vercel Serverless (Turso/libSQL)
- Providers de IA compatibles: OpenAI y Anthropic

## Desarrollo

```bash
npm install
npm run dev -- --port 43131 --hostname 127.0.0.1
```

Abrí `http://127.0.0.1:43131`. Un puerto distinto es una sesión vacía.

## Variables de entorno

Copiá `.env.example` a `.env.local` y completá según necesites:

- `BETTER_AUTH_SECRET`: secreto de sesión (obligatorio en producción).
- `BETTER_AUTH_URL`: URL base de auth (ej. `http://127.0.0.1:43131` en local, `https://arquimes-app.vercel.app` en prod).
- `GOOGLE_CLIENT_ID`: client id OAuth de Google.
- `GOOGLE_CLIENT_SECRET`: client secret OAuth de Google.
- `LIBSQL_URL`: URL de Turso/libSQL (obligatoria en producción para guardar chats y archivos).
- `LIBSQL_AUTH_TOKEN`: token de Turso/libSQL (si aplica).
- `AI_PROVIDER`: opcional (`openai` o `anthropic`).
- `OPENAI_API_KEY`: API key de OpenAI.
- `OPENAI_MODEL`: opcional (default `gpt-5.4`, prioriza calidad de tutoría).
- `OPENAI_BASE_URL`: opcional (default `https://api.openai.com/v1`; permite gateways compatibles).
- `ANTHROPIC_API_KEY`: API key de Anthropic.
- `ANTHROPIC_MODEL`: opcional (default `claude-3-5-sonnet-latest`).
- `PDF_OCR_API_URL`: endpoint opcional para OCR de PDFs escaneados.
- `PDF_OCR_API_KEY`: bearer token opcional para ese endpoint OCR.

### Google OAuth redirect URI

Configurá en Google Cloud Console:

- Producción: `https://arquimes-app.vercel.app/api/auth/callback/google`
- Local: `http://127.0.0.1:43131/api/auth/callback/google` (o tu puerto local actual)

Si no hay key de IA, la UI sigue funcionando pero el envío de mensajes responde con un error honesto en español.
Si no hay `PDF_OCR_API_URL`, los PDFs escaneados se detectan como no legibles y el chat lo explica sin inventar contenido.
Si faltan `GOOGLE_CLIENT_ID/SECRET`, la app sigue funcionando con email+contraseña (Google queda deshabilitado en ese entorno).

## Seguridad y límites actuales

- Límite de subida: **15 MB por archivo**.
- Sesiones con cookie httpOnly segura (Better Auth) + protección CSRF integrada.
- Passwords hasheadas por Better Auth (nunca plaintext).
- Todas las queries sensibles filtran por `user_id` en backend.
- Los bytes del archivo se guardan en libSQL con scope privado por usuario autenticado.

## Migración de datos locales

Antes de auth multiusuario, el proyecto guardaba parte del estado en cookies de sesión/owner anónimo.
En este corte se usan tablas nuevas con `user_id`; ese estado antiguo puede quedar inaccesible, lo cual es intencional para evitar mezclas entre usuarios.

## Verificar en local

```bash
.cursor/skills/verify-arquimes/bin/launch
.cursor/skills/verify-arquimes/bin/doctor
.cursor/skills/verify-arquimes/bin/drive-cargar-examen
.cursor/skills/verify-arquimes/bin/drive-chat-estudio
.cursor/skills/verify-arquimes/bin/cleanup
```

No uses el deploy de Vercel como prueba: es otro origen y otra cookie.

## Qué hay en este corte

1. Inicio global (`/`): saludo, «Seguir donde dejaste», lo que se viene en los próximos 14 días y tus materias.
2. Crear una materia personal (`/materias/nueva`): nombre, cátedra y facultad opcionales.
3. Inicio de la materia (`/materias/[id]`): próximo evento, accesos rápidos (empezar clase, preguntarle al chat, subir apuntes, cargar fecha), clases recientes, lo que se viene y apuntes recientes.
4. Clases (`/materias/[id]/clases`): notas de clase con un editor tipo Notion (Markdown, fórmulas KaTeX, tareas y tablas) con autoguardado.
5. Apuntes (`/materias/[id]/apuntes`): tus archivos (PDF, fotos, videos, texto) y lo que guardaste del chat.
6. Calendario (`/materias/[id]/calendario` y `/calendario`): exámenes, entregas y otros eventos con fecha y hora, con sus temas como etiquetas.
7. Chat de estudio por materia, siempre a mano:
   - responde con tus clases, apuntes y fechas, y cita las fuentes que usa
   - si no hay material legible, lo dice sin inventar contenido
   - puede armar documentos y exámenes de práctica que quedan en Apuntes
   - extracción de PDF con `pdf-parse` (capa de texto) y OCR opcional por `PDF_OCR_API_URL` para escaneados
   - persistencia durable de hilos y mensajes
8. Pestañas dentro de cada materia, que sobreviven a una recarga, y un lanzador con Ctrl/Cmd+K.
