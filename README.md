# Arquimes

**¿Qué tan preparado estoy para rendir este examen?**

Arquimes es una aplicación web de preparación de exámenes universitarios. Te ayuda a organizar tu material de estudio, cargar tus próximos exámenes con sus temas, y hacer un seguimiento honesto de tu nivel de preparación.

## Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS 4
- SQLite (better-sqlite3) para persistencia local

## Desarrollo

```bash
npm install
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`.

## Estructura

```
src/
├── app/
│   ├── api/          # API routes
│   ├── materias/     # Páginas de materias
│   └── page.tsx      # Redirect a /materias
├── components/       # Componentes reutilizables
└── lib/
    ├── db.ts         # Capa de persistencia SQLite
    └── types.ts      # Tipos del dominio
```

## Modelo de dominio

- **Materia**: Espacio privado del estudiante (nombre, facultad, cátedra)
- **Material**: Archivos subidos a una materia (PDF, video, imágenes, etc.)
- **ExamenEnPreparacion**: Parcial o final con fecha y modalidad
- **Tema**: Contenido del examen con estado de dominio (no estudiado → dominado)

## Visión del producto

Ver [AGENTS.md](./AGENTS.md) para la visión completa del producto.
