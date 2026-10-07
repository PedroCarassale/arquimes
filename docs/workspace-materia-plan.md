# Plan: espacio de trabajo por materia

Pedido de Pedro (2026-10-07): cambiar el flujo para que cada materia sea un espacio de trabajo al estilo de los artifacts de Claude.

## Flujo

1. Al entrar: **tus materias** (la barra lateral también lista las materias).
2. Dentro de una materia, un shell persistente con:
   - **Chat a la izquierda**, que se puede abrir y cerrar (en el celular es una hoja a pantalla completa). Mantiene la conversación mientras navegás entre secciones y sabe qué documento estás mirando (nota, generado o archivo), así que podés preguntarle sobre eso.
   - **Contenido a la derecha**, con secciones: Inicio · Notas · Exámenes · Generados · Material.
3. **Notas** en Markdown. «Nueva clase» crea una nota fechada; también podés crear una nota en blanco. Editor con modos Escribir y Leer, autoguardado, barra de formato mínima y soporte para LaTeX. El chat lee las notas como fuentes.
4. **Exámenes y entregas**: exámenes futuros (parcial/final) y entregas de trabajos prácticos, cada uno con nombre, fecha, descripción y temas. Los temas conservan los estados de dominio. Se puede seguir subiendo el archivo de un examen viejo.
5. **Generados (artefactos)**: cuando le pedís al chat un examen de práctica, un resumen o una guía, crea un documento en Markdown que se abre a la derecha. Una tira arriba deja cambiar entre los documentos generados. Si le pedís cambios, crea una versión nueva; hay un selector de versión.
   - `tipo="examen"`: Markdown con una convención de preguntas (opción múltiple `- [x]` / `- [ ]`, preguntas abiertas con `> Respuesta:`, línea `Tema:`). Se renderiza como un examen interactivo. Al corregirlo se actualiza el dominio de los temas que coinciden, y así se mueve la preparación.
   - `tipo="documento"`: Markdown simple. Se puede descargar como .md o guardar como nota.
6. **Inicio** de la materia: responde con honestidad «¿qué tan preparado estoy?», con la próxima evaluación y su cuenta regresiva, los temas y su estado, las últimas notas y los últimos generados. Si falta información, lo dice y señala la siguiente acción.

## Datos (libsql)

- `notas` (id, user_id, materia_id, titulo, contenido, created_at, updated_at)
- `artefactos` (id, user_id, materia_id, session_id, tipo, titulo, contenido, version, created_at, updated_at)
- `artefacto_versiones` (artefacto_id, version, titulo, contenido, created_at)
- `examenes` suma las columnas `kind` (`examen` | `entrega`) y `description`.

## Protocolo de artefactos en el chat

El modelo escribe `<artefacto tipo="examen|documento" titulo="...">…</artefacto>` (o `id="..."` para editar uno existente). El servidor lo extrae, lo guarda o versiona y lo reemplaza en el mensaje por `[[artefacto:ID]]`. El cliente muestra ese marcador como una tarjeta que abre el documento.

## Rutas viejas

`/chat`, `/inicio`, `/practica` y `/preparacion` redirigen al nuevo espacio. `/apuntes` pasa a llamarse **Material**.
