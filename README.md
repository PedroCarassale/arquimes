# Arquimes

**¿Qué tan preparado estoy para rendir este examen?**

Arquimes es una app privada de preparación de exámenes universitarios. Creás una materia, subís apuntes, cargás el archivo del examen (con una nota opcional) y agregás los temas que entran. El resumen te dice con honestidad en qué estás. La pestaña Práctica hace preguntas cortas sobre esos temas; responder actualiza el dominio y el porcentaje de preparación. El chat de estudio responde desde los archivos de la materia.

No hay comunidad en este corte.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- Persistencia de sesión en cookies httpOnly (no SQLite en este deploy)

## Desarrollo

```bash
npm install
npm run dev -- --port 43131 --hostname 127.0.0.1
```

Abrí `http://127.0.0.1:43131`. Un puerto distinto es una sesión vacía.

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
2. Subir archivos chicos (hasta 12 KB en esta sesión) y ver el tamaño real
3. Cargar un examen: archivo + una línea opcional de qué se trata
4. Listar, editar y borrar exámenes en `/materias/[id]/examenes`
5. Resumen honesto: si no hay examen, temas o práctica, lo dice
6. Chat de estudio anclado a la materia: responde con apuntes y archivos de examen; si no hay material, lo dice
7. Práctica: una pregunta corta por tema; responder mueve el dominio y el % de preparado
