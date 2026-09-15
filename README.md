# Arquimes

**¿Qué tan preparado estoy para rendir este examen?**

Arquimes es una app privada de preparación de exámenes universitarios. Creás una materia, cargás la info del examen (apuntes + archivo + temas), practicás y estudiás con chat multi-sesión.

No hay comunidad en este corte.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- Materias, apuntes y exámenes en cookies httpOnly por sesión
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

- `LIBSQL_URL`: URL de Turso/libSQL (obligatoria en producción para guardar chats).
- `LIBSQL_AUTH_TOKEN`: token de Turso/libSQL (si aplica).
- `AI_PROVIDER`: opcional (`openai` o `anthropic`).
- `OPENAI_API_KEY`: API key de OpenAI.
- `OPENAI_MODEL`: opcional (default `gpt-4o-mini`).
- `ANTHROPIC_API_KEY`: API key de Anthropic.
- `ANTHROPIC_MODEL`: opcional (default `claude-3-5-sonnet-latest`).

Si no hay key de IA, la UI sigue funcionando pero el envío de mensajes responde con un error honesto en español.

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
   - atajos para resumen completo, plan de estudio, tema puntual y simulación
   - grounding con apuntes, archivo de examen, nota y temas
   - persistencia durable de títulos/mensajes
6. Práctica: una pregunta corta por tema; responder mueve el dominio y el % de preparado
