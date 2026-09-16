# Arquimes

**¿Qué tan preparado estoy para rendir este examen?**

Arquimes es una app privada de preparación de exámenes universitarios. Creás una materia, cargás la info del examen (apuntes + archivo + temas), practicás y estudiás con chat multi-sesión.

No hay comunidad en este corte.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- Materias y metadatos en cookies httpOnly por sesión
- Archivos (bytes + texto extraído) en SQLite/libSQL owner-scoped
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

Si no hay key de IA, la UI sigue funcionando pero el envío de mensajes responde con un error honesto en español.
Si no hay `PDF_OCR_API_URL`, los PDFs escaneados se detectan como no legibles y el chat lo explica sin inventar contenido.

## Límites actuales

- Límite de subida: **15 MB por archivo**.
- Los bytes del archivo ya no quedan en cookies; se guardan en libSQL con scope privado por owner cookie.

## Verificar en local

```bash
.cursor/skills/verify-arquimes/bin/launch
.cursor/skills/verify-arquimes/bin/doctor
.cursor/skills/verify-arquimes/bin/drive-cargar-examen
.cursor/skills/verify-arquimes/bin/drive-chat-estudio
.cursor/skills/verify-arquimes/bin/drive-practica
.cursor/skills/verify-arquimes/bin/cleanup
```

No uses el deploy de Vercel como prueba: es otro origen y otra cookie.

## Qué hay en este corte

1. Crear una materia personal
2. Cargar info del examen en flujo unificado:
   - Paso 1: cargar apuntes
   - Paso 2: cargar archivo del examen + nota opcional
   - Paso 3: definir temas del examen
3. Listar, editar y borrar exámenes en `/materias/[id]/examenes`
4. Resumen honesto: si no hay examen, temas o práctica, lo dice
5. Chat multi-sesión por materia (`/materias/[id]/chat`):
   - crear, abrir, renombrar y borrar sesiones
   - compositor libre y área de conversación amplia para estudiar sin distracciones
   - tutoría progresiva con mapa de temas, fórmulas KaTeX, ejemplos y chequeos de comprensión
   - recuperación por consulta sobre apuntes, archivo de examen, nota y temas
   - extracción robusta de PDF con `pdf-parse` (capa de texto)
   - fallback OCR opcional por `PDF_OCR_API_URL` para escaneados
   - persistencia durable de títulos/mensajes
6. Práctica: una pregunta corta por tema; responder mueve el dominio y el % de preparado
