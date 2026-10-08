# ROADMAP

Canonical vision: [AGENTS.md](./AGENTS.md) and the build spec [docs/arquimedes-v2-spec.md](./docs/arquimedes-v2-spec.md). Central idea: **Arquímedes es el lugar donde un estudiante organiza toda su vida de estudio en la facu.**

Private, single user per account. Nothing shared, no community.

Live: https://arquimes-app.vercel.app

Every feature lands only after `.cursor/skills/verify-arquimes` drives the **local** app. A CloudAgent that skips verification is not done. Do not doctor or drive the Vercel deploy for proof.

## Now (v2)

Each materia has four sections: Inicio · Clases · Apuntes · Calendario. Global inicio with «Seguir donde dejaste», «Se viene» and the materias grid; global calendario. Notion-like editor for clases and event descriptions; apuntes with files and what the chat generated; calendario with exámenes, entregas and other events (fecha, hora, temas as plain chips); browser-like tabs inside a materia; always-on study chat grounded in the student's material. Out: any preparación %, dominio por tema, práctica that moves states, sharing.

## Next

Edit chat-generated documents with the editor, attach files to existing events, reschedule by dragging in the calendario.

## Later

Study planner, calendar sync, notifications.
