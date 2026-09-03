# Arquimes — Product Vision

> Canonical source of truth for this product. Do not contradict.

## North Star

Help a student constantly answer: **¿Qué tan preparado estoy para rendir este examen?**

Arquimes is NOT a PDF library, flashcard app, generic chatbot, or study calendar. Those may exist later only in service of exam prep.

## Locked Product Sequence (Pedro, 2026-09-02)

- **v1 is self-driven / private.** The student creates their own space (a materia / curso) and uploads their own material (PDFs, videos, images, notes, anything).
- Community courses, shared libraries, public discovery, and "everybody uploads into one materia" come LATER. Zero community UI, routes, copy, or data models that imply sharing in this slice.
- The eventual vision (do not implement all of it now) also includes: exam-from-past-papers analytics, a per-materia study chat, practice that updates mastery, study plans, docentes.
- **Sequence: private space + ingest first.**

## Current Slice (v1)

1. Student can create a personal materia. Spanish product copy. Empty state should invite creating one, not browsing a catalog.
2. Inside a materia they can upload files (at least PDF, common video types, images, and generic files). Files belong to that materia and list back. Do not OCR, transcribe, or RAG yet — ingest + belonging is enough.
3. They can declare they are preparing an exam (parcial or final) with a date and optional topic list.
4. The materia home answers the north-star question honestly for this depth: if there is no exam, no topics, or no practice yet, say so in plain Spanish and point at the next action (subir material, cargar examen, agregar temas). If topics exist, show per-topic states starting at "no estudiado" (no estudiado / empezado / estudiado / necesita práctica / dominado). Do not fake a high readiness score.
5. Skip a marketing landing. First useful screen is "tus materias" / crear materia.
6. Always-on study chat answers from that student's materia (apuntes and uploaded exam files). If there is no readable material, say so in Spanish. Do not fake preparado. Persist the thread in the session store.

## Visual Identity

Dark, editorial, technological.

- Near-black background
- Warm white/light gray type
- Serif for big titles, sans for UI, mono for metrics/labels
- Accent yellow: approximately `rgb(243, 164, 75)` — use only for progress, alerts, primary actions
- Palettes stay mostly mono; accent sparingly
- Tight grids, thin low-contrast rules, little/no rounded-card chrome, no decorative gradients
- ASCII/dot textures may appear as background identity, not as noise on study screens
- Respect `prefers-reduced-motion`
- Brand mark: stippled Archimedes engraving with compass

## Domain Model

- **Materia**: private, owned by this student. Name, optional faculty/cátedra fields that stay personal (not a global catalog).
- **Material**: file belonging to one materia (name, type, size, addedAt, storage key).
- **ExamenEnPreparacion**: parcial | final, **name**, date, optional personal objective, optional topics included, optional modality.

- **Tema**: name + mastery state (no estudiado / empezado / estudiado / necesita práctica / dominado). Manual for now; future practice will move it.
- **ChatMessage**: per-materia study thread. Assistant replies cite files when they use them.

Single-user persistence. No auth/multi-tenant unless it is the smallest way to keep data. No fake community seed data.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- SQLite (better-sqlite3) for local persistence
- Spanish UI strings
- English code/comments only if comments are necessary (prefer none)

## Out of Scope (This Slice)

- Community features
- Docentes
- Past-exam intelligence
- Study planner
- OCR/transcription/vector RAG (chat reads stored text bytes; it does not invent a syllabus)
- Paper design tooling
- User accounts beyond single-user
- Marketing site

## Success Criteria

A stranger can:
1. Create a materia
2. Upload a PDF
3. Optionally add an exam + topics
4. See an honest readiness screen
5. Ask the study chat something the uploaded file can answer, and get a reply that uses it

There is no community surface. Visual identity is recognizably dark/editorial and uses the Archimedes mark.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
