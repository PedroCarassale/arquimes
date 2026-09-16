# Esquema de respuesta — Plan de preparación (v1)

La ruta `POST /api/materias/[id]/preparacion/plan` genera el plan con OpenAI usando `response_format.type = "json_schema"` y `strict: true`.

## Campos persistidos

El plan se guarda en `materia.preparacion.plan` con esta estructura:

```json
{
  "version": "1",
  "generatedAt": "2026-09-16T23:59:59.000Z",
  "resumen": {
    "objetivo": "string",
    "diasHastaParcial": 21,
    "minutosPorDia": 90
  },
  "semanas": [
    {
      "semana": 1,
      "foco": "string",
      "temas": ["string"],
      "meta": "string"
    }
  ],
  "agendaDiaria": [
    {
      "dia": 1,
      "fecha": "YYYY-MM-DD",
      "foco": "string",
      "tareas": ["string"],
      "checkpoint": "string"
    }
  ],
  "hitos": [
    {
      "titulo": "string",
      "fecha": "YYYY-MM-DD",
      "criterio": "string"
    }
  ]
}
```

## Validaciones server-side

- `resumen.diasHastaParcial`: entero 1..365.
- `resumen.minutosPorDia`: entero 15..360.
- `semanas`: 1..8 elementos.
- `agendaDiaria`: 3..28 elementos.
- `hitos`: 2..8 elementos.
- Fechas de `agendaDiaria` y `hitos`: formato `YYYY-MM-DD`.

Si el modelo devuelve JSON inválido o fuera de contrato, la API responde error y no persiste el plan.
