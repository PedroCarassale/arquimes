# Plan (pendiente): Arquimedes Desktop + chat vía CLI de suscripción

**Status: PENDING — no implementar salvo que Pedro lo pida explícitamente.**  
Fecha: 2026-09-26

## Objetivo

Correr Arquimedes como **desktop app** donde el alumno ve el **chat de Arquimedes** (UI messenger), **no** la terminal.

Por detrás, un proceso oculto usa el **CLI del modelo** (Claude Code, Codex, ChatGPT CLI, u otro) autenticado con la **suscripción** del alumno, para no gastar tokens de API de Arquimedes/Vercel cuando ese camino exista.

La web en Vercel **no puede** spawnear CLIs locales del alumno. Este plan solo aplica a un shell desktop.

## No-objetivos

- No construir esto ahora.
- No reescribir Arquimedes offline/local-first.
- No “convertir” llamadas API en suscripción por magia.
- No mostrar la terminal cruda al alumno.
- No inventar un inbox global de chats distinto al modelo actual (chat siempre atado a una materia).

## Por qué desktop

| Superficie | ¿Puede ocultar un CLI local y streamear al UI? |
|---|---|
| `arquimes-app.vercel.app` | No |
| Electron / Tauri en la máquina del alumno | Sí |

## Arquitectura propuesta

```
┌─────────────────────────────────────┐
│  UI Arquimedes (chat messenger)       │
│  — sin terminal visible             │
└──────────────▲──────────────────────┘
               │ prompts / stream / cancel
┌──────────────┴──────────────────────┐
│  Bridge desktop (Electron o Tauri)  │
│  — child_process / pty oculto       │
│  — sesiones, errores, onboarding    │
└──────────────▲──────────────────────┘
               │ stdin / stdout
┌──────────────┴──────────────────────┐
│  CLI del proveedor (logueado c/ sub)│
│  cwd = workdir de la materia        │
└─────────────────────────────────────┘
```

### Piezas

1. **Shell:** Electron (más ecosistema) o Tauri (más liviano). Elegir en el spike.
2. **UI:** reutilizar el chat de Arquimedes (embed de la web con bridge, o empaquetar la UI).
3. **Bridge:** proceso hijo oculto; streamear salida al bubble del tutor; cancelar/matar proceso; mapear errores (“CLI no instalado”, “no hay sesión”).
4. **Contexto de materia:** carpeta de trabajo por materia con apuntes (copy/symlink) + preamble de sistema para que se sienta tutor Arquimedes, no agente de código pelado.
5. **Auth:** la del CLI (login suscripción). `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` ≠ Plus/Pro. Verificar al implementar qué CLI acepta login de suscripción hoy.
6. **Fallback:** si no hay CLI/sesión, mensaje claro en el UI (no caer callado a API de Arquimedes salvo decisión explícita de producto).

## Matriz de proveedores (verificar al implementar)

| CLI | ¿Sub del usuario? | Fricción | Notas |
|---|---|---|---|
| Claude Code (`claude`) | A menudo cuenta Claude (Pro/Max); confirmar | Alta (install + login) | Agente con tools; hay que acotar cwd/prompt |
| Codex CLI | A menudo login ChatGPT; confirmar | Alta | Pensado para código; adaptar a tutor |
| ChatGPT CLI / otros | Depende del binario | Variable | Protocolo de stream frágil |

Marcar cada celda como **verify-at-build-time**: los productos cambian auth y ToS.

**ToS / zona gris:** envolver CLIs oficiales en una app de terceros puede violar términos. Revisar licencia de cada uno antes de shippear.

## Fases (sin fechas)

### Fase 0 — Spike (1–2 días)

- Una ventana mínima con UI de chat.
- Un solo proveedor.
- Proceso oculto + stream + cancel.
- Criterio de éxito: respuesta sin API key de Arquimedes, sin terminal visible, auth de sub del CLI OK.

### Fase 1 — Contexto Arquimedes

- Workdir por materia + apuntes.
- Preamble de tutor (español, grounded en materiales).
- Sesiones multi-turno estables.

### Fase 2 — Empaquetado

- Installers Mac/Windows, auto-update.
- Code signing / notarización (costo y fricción reales).

### Fase 3 — Onboarding

- Detectar CLI instalado / versión.
- Guía de login.
- Deep links si el proveedor los expone.

## Riesgos

1. ToS al wrappear CLIs.
2. stdout/protocolo del CLI cambia sin aviso.
3. El alumno debe tener el CLI instalado y logueado (soporte).
4. Calidad tutor vs defaults de coding-agent.
5. Signing/notarización vs valor de producto.
6. Dos productos que mantener (web API tutor + desktop CLI tutor).

## Decision gate

Retomar **solo** si Pedro prioriza explícitamente desktop + chat por suscripción por encima del tutor web con API.

El spike solo “aprueba” el camino si cumple:

- [ ] Auth sin API key de Arquimedes
- [ ] Stream en el UI de Arquimedes
- [ ] Terminal no visible
- [ ] Al menos un apunte grounded en la respuesta

## Relación con el producto actual

La app web en Vercel (Better Auth, Turso, chat API, preparación, apuntes) **sigue siendo el producto**. Este plan es una pista paralela, no un reemplazo.

Hasta nueva orden: **no implementar.**
