# Arquímedes v2: la facu organizada (spec final de construcción)

Spec de producto y técnica pedida por Pedro (2026-10-08) y cerrada después de tres revisiones (editor, UX y técnica). Es la **única fuente de verdad** para los agentes de construcción (A1, A2, B1–B4, C). Si contradice código viejo, gana esta spec. `AGENTS.md` ya está alineado con esta spec; si algo no coincide, gana esta spec y se avisa al orquestador.

Convenciones del documento:
- Prosa en español; identificadores, rutas, tipos y código en inglés o tal como existen.
- «Debe» = obligatorio. «Nice-to-have» = solo si sobra tiempo dentro del paquete, sin tocar archivos ajenos.
- Las cifras de layout (px, ms) son exactas, no orientativas.
- Hoy es jueves 8 de octubre de 2026 (para los ejemplos de fechas).

---

## 1. Producto

**Idea central:** Arquímedes es el lugar donde un estudiante universitario **organiza toda su vida de estudio en la facu**: sus materias, las clases que toma, sus apuntes, su calendario de exámenes y entregas, y un chat que estudia con él usando lo que cargó.

Decisiones de Pedro (no se discuten):
1. Cada materia tiene cuatro secciones: **Inicio · Clases · Apuntes · Calendario**. No hay más secciones.
2. Lo que genera el chat (documentos y exámenes de práctica, «artefactos») vive **dentro de Apuntes** por ahora.
3. **Se elimina por completo** la preparación: nada de % de preparación, estados de dominio por tema (no estudiado → dominado), «preparación estimada», «¿Qué tan preparado estoy?», «Guardar en mi preparación» ni práctica que mueva estados. Los temas de un evento son **chips de texto sin estado**.
4. **Nada compartido.** No hay ningún texto, ruta, placeholder, modelo de datos ni botón de comunidad, compartir, invitar, unirse o descargar apuntes de otros. Tampoco «Próximamente». Se borra el bloque «Unirme a una materia / Próximamente» de `/materias/nueva`.
5. Un usuario por cuenta (better-auth ya existe). Español rioplatense en toda la UI (ver §9).

---

## 2. Arquitectura de información y shell

### 2.1 Rutas

| Pantalla | Ruta | Archivo de página | Dueño (Fase B) |
|---|---|---|---|
| Inicio global | `/` | `src/app/(inicio)/page.tsx` | B4 |
| Calendario global | `/calendario` | `src/app/calendario/page.tsx` | B2 |
| Nueva materia | `/materias/nueva` | `src/app/materias/nueva/page.tsx` | B4 |
| Inicio de la materia | `/materias/[id]` | `src/app/materias/[id]/(resumen)/page.tsx` | B4 |
| Pestaña nueva (lanzador) | `/materias/[id]/nueva` | `src/app/materias/[id]/nueva/page.tsx` | A2 |
| Clases (lista) | `/materias/[id]/clases` | `src/app/materias/[id]/clases/page.tsx` | B1 |
| Clase | `/materias/[id]/clases/[notaId]` | `src/app/materias/[id]/clases/[notaId]/page.tsx` | B1 |
| Apuntes (lista) | `/materias/[id]/apuntes` (`?tipo=archivos\|generados`, `?orden=nombre`) | `src/app/materias/[id]/apuntes/page.tsx` | B3 |
| Archivo | `/materias/[id]/apuntes/archivo/[materialId]` | `src/app/materias/[id]/apuntes/archivo/[materialId]/page.tsx` | B3 |
| Generado por el chat | `/materias/[id]/apuntes/generado/[artefactoId]` | `src/app/materias/[id]/apuntes/generado/[artefactoId]/page.tsx` | B3 |
| Calendario de la materia | `/materias/[id]/calendario` (`?mes=YYYY-MM`, `?vista=agenda`, `?nuevo=1`, `?fecha=YYYY-MM-DD`) | `src/app/materias/[id]/calendario/page.tsx` | B2 |
| Evento | `/materias/[id]/calendario/[eventoId]` | `src/app/materias/[id]/calendario/[eventoId]/page.tsx` | B2 |

`/archivos` queda como ruta pero sin ningún link. `/perfil`, `/login`, `/register` y `/dev/*` no cambian.

### 2.2 Reglas de rutas (obligatorias)

1. `/materias/nueva` (estática, B4) y `/materias/[id]/nueva` (A2) no chocan: están en niveles distintos y en el nivel 2 la estática gana sobre `[id]`.
2. `/materias/[id]` lo resuelve **solo** `src/app/materias/[id]/(resumen)/page.tsx`. Prohibido crear `src/app/materias/[id]/page.tsx` (dos páginas para la misma URL rompen el build).
3. A2 crea `src/app/materias/[id]/not-found.tsx` y `src/app/materias/[id]/error.tsx`. Se renderizan dentro del layout con pestañas. El `notFound()` del propio `[id]/layout.tsx` (materia inexistente) cae al not-found raíz; el de una página hija (clase borrada) cae en `[id]/not-found.tsx`.
4. `src/app/materias/[id]/loading.tsx` (A2) es el fallback genérico. Cada dueño puede agregar un `loading.tsx` en su segmento con la forma final de su pantalla.
5. `/calendario` (B2) está fuera de `[id]`: no hay `WorkspaceContext`. Se envuelve en `<AppShell>` y los componentes compartidos de `src/components/calendar` usan `useOptionalWorkspace()`.
6. Las páginas reciben `params` y `searchParams` como `Promise`. Usar el tipo explícito, por ejemplo `{ params: Promise<{ id: string; notaId: string }> }`, como el código actual. Si alguien usa `PageProps<"/materias/[id]/...">`, corre `npx next typegen` antes de `tsc`.
7. Todas las páginas de materia son `export const dynamic = "force-dynamic"`. No activar `experimental.staleTimes` ni `cacheComponents`: cada click en una pestaña vuelve a pedir la página al server y muestra el `loading.tsx` del segmento (el layout con chat y barra no se re-renderiza). Es aceptado para v2.
8. Ningún componente arma hrefs de materia a mano: todo pasa por `rutas` (§2.3).
9. `src/middleware.ts` está deprecado en Next 16 (se renombra a `proxy.ts`). **No se migra en esta versión y nadie lo toca.**

### 2.3 Helpers de rutas: `src/lib/routes.ts` (A2, primer commit de Fase A)

```ts
export const rutas = {
  inicio: "/",
  calendarioGlobal: "/calendario",
  nuevaMateria: "/materias/nueva",
  materia: (m: string) => `/materias/${m}`,
  nueva: (m: string) => `/materias/${m}/nueva`,
  clases: (m: string) => `/materias/${m}/clases`,
  clase: (m: string, notaId: string) => `/materias/${m}/clases/${notaId}`,
  apuntes: (m: string, opts?: { tipo?: "archivos" | "generados"; orden?: "nombre" }) => string,
  archivo: (m: string, materialId: string) => `/materias/${m}/apuntes/archivo/${materialId}`,
  generado: (m: string, artefactoId: string) => `/materias/${m}/apuntes/generado/${artefactoId}`,
  calendario: (m: string, opts?: { mes?: string; vista?: "agenda"; nuevo?: boolean; fecha?: string }) => string,
  evento: (m: string, eventoId: string) => `/materias/${m}/calendario/${eventoId}`,
} as const;
```
- Los parámetros opcionales se serializan con `URLSearchParams` en orden fijo (`tipo`, `orden`, `mes`, `vista`, `nuevo`, `fecha`); `nuevo: true` → `nuevo=1`. Sin opciones no hay `?`.
- Imports relativos únicamente (sin `@/`), para que se pueda testear con node.
- `materialViewerRoute` (`src/lib/material-viewer.ts`, A2) pasa a devolver `rutas.archivo(materiaId, materialId)`. Se eliminan los parámetros `volver` y `etiqueta` (y sus usos).
- Los generados viven en Apuntes por ahora. Su ubicación se decide **solo** en `rutas.generado()`, en el filtro `tipo=generados` de la lista y en la copy «Guardar en apuntes». Siguen en la tabla `artefactos` (no se mezclan con `materiales`), así se pueden mover a otra sección más adelante sin migrar datos.

### 2.4 Redirects (A2, `next.config.ts`)

Van en `next.config.ts` → `async redirects()`, todos con `permanent: false`. **No** se hacen con páginas que llamen `redirect()`: bajo `[id]` esas páginas se renderizan dentro del layout y del `loading.tsx`, y el redirect llega por streaming con un 200 después de mostrar el esqueleto. Los redirects de config corren antes que el filesystem y pasan la query sola al destino.

Orden obligatorio (gana el primero que matchea):

```ts
async redirects() {
  const m = "/materias/:id";
  return [
    { source: "/materias", destination: "/", permanent: false },
    { source: "/materias/chats", destination: "/", permanent: false },
    { source: `${m}/examenes/nuevo`, destination: `${m}/calendario?nuevo=1`, permanent: false },
    { source: `${m}/examenes/:eid`, destination: `${m}/calendario/:eid`, permanent: false },
    { source: `${m}/examenes`, destination: `${m}/calendario`, permanent: false },
    { source: `${m}/notas/:nid`, destination: `${m}/clases/:nid`, permanent: false },
    { source: `${m}/notas`, destination: `${m}/clases`, permanent: false },
    { source: `${m}/generados/:aid`, destination: `${m}/apuntes/generado/:aid`, permanent: false },
    { source: `${m}/generados`, destination: `${m}/apuntes?tipo=generados`, permanent: false },
    { source: `${m}/materiales/:mid`, destination: `${m}/apuntes/archivo/:mid`, permanent: false },
    { source: `${m}/examen`, destination: `${m}/calendario?nuevo=1`, permanent: false },
    { source: `${m}/cargar`, destination: `${m}/apuntes`, permanent: false },
    { source: `${m}/:legacy(chat|inicio|practica|preparacion)`, destination: m, permanent: false },
  ];
}
```
Se conserva `allowedDevOrigins`. Se borran las carpetas viejas (ver A2): `notas`, `generados`, `materiales`, `examenes`, `examen`, `chat`, `inicio`, `practica`, `preparacion`, `cargar` dentro de `src/app/materias/[id]/`, más `src/app/materias/chats/` y `src/app/materias/(lista)/` (incluido su redirect `destino=chat`).

### 2.5 Sidebar global (B4, `src/components/Sidebar.tsx` y `AppShell.tsx`)

Contenido, de arriba abajo:
1. Marca «Arquímedes» (serif) → `/`.
2. `Inicio` (`/`) y `Calendario` (`/calendario`). **Se saca «Archivos».**
3. Sección «Materias» (encabezado mono 11 mayúsculas `foreground-subtle`) con un `+` (IconButton 28) → `/materias/nueva`. Cada materia es una fila de 32px con su punto de color de 6px (§8.9) y el nombre truncado.
4. **Árbol de la materia activa** (la de la URL): debajo de su fila, cuatro subitems de 32px, sangría 12px, ícono 16px: **Inicio · Clases · Apuntes · Calendario**. Cada uno navega a `rutas.materia/clases/apuntes/calendario(m)`; como las vistas son pestañas únicas, eso activa o crea su pestaña. Las materias no activas quedan colapsadas. Subitem activo: fondo `--selected`, texto `foreground` (sin acento, sin `inset` amarillo).
5. Al pie: perfil (existe).

**Ancho y colapso (decisión que une el árbol con el riel de íconos):**
- Expandido: **208px** (el ancho actual). Riel: **56px**.
- Preferencia en `localStorage["arq.sidebar.collapsed"]` = `"1"` | `"0"`, leída con `useSyncExternalStore` (server snapshot = sin preferencia). Toggle con un IconButton 28 (ícono `panel`) arriba a la derecha del sidebar; en el riel, el mismo botón queda arriba.
- Sin preferencia guardada: expandido, salvo **dentro de una materia con viewport < 1280px**, donde arranca en riel. Con preferencia, se respeta en cualquier ancho y en cualquier pantalla.
- El riel no se expande con hover (evita overlays accidentales); solo con el botón. Cada ítem del riel es un IconButton 40 con `Tooltip` a la derecha.
- Riel: ícono de marca, Inicio, Calendario, separador 1px, cada materia como un tile de 32px `rounded-md` con sus iniciales (mono 11) y su punto de color; debajo de la materia activa, sus 4 subitems como íconos de 16px en botones de 32px; `+` al final.
- `AppShell` aplica `padding-left` 208 o 56 en `lg` (≥1024) según el estado, con transición de 160ms (sin transición con `prefers-reduced-motion`).
- < 1024px: el sidebar es el drawer actual (260px) que abre el botón de menú del header mobile de 56px. El árbol de la materia activa también aparece ahí.

### 2.6 Layout del espacio de trabajo de la materia (A2, `MateriaWorkspace.tsx`)

```
┌ Sidebar ┬─────────────┬──────────────────────────────────────────────┐
│ 208/56  │ Chat header │ [⌂ Análisis II] │ [Clase 3 ×] [Apuntes ×] [+] [⌄] │ ← 40px
│         ├─────────────┼──────────────────────────────────────────────┤
│         │ Chat        │ contenido de la pestaña activa                │
│         │ 380 (320–560)│ (mín. 560px)                                 │
└─────────┴─────────────┴──────────────────────────────────────────────┘
```
- Se elimina el header actual de 56px («Materias / Nombre» + fila `SECTIONS`) y se borra `DocumentStrip`. El nombre de la materia vive en la pestaña Inicio y en el sidebar.
- La **barra de pestañas va solo sobre la columna de contenido**. El chat tiene su propio header de **40px** a la misma altura (B3), así una sola línea de 1px `border-subtle` cruza toda la pantalla.
- Chat a la izquierda del contenido: ancho por defecto **380px**, mínimo **320**, máximo **560** (`arq.chat.width`; valores guardados fuera de rango se recortan). Redimensionable con la manija existente. Preferencia de abierto en `arq.chat.open` (existe).
- **Mínimo de contenido 560px:** un `ResizeObserver` mide la fila completa (chat + contenido, que no cambia de ancho al ocultar el chat). Si `filaAncho − chatAncho < 560`, el chat no se muestra en columna aunque la preferencia diga abierto (no se pisa la preferencia). Se vuelve a mostrar solo cuando vuelve a entrar. Mientras no entra, el botón de chat lo abre como **drawer superpuesto de 380px** (el mismo que tablet). El `setState` va dentro del callback del observer, nunca en el cuerpo de un effect.
- Con el chat cerrado (o sin lugar), el botón para abrirlo (IconButton 28, ícono `panel`, tooltip «Abrir chat · Ctrl J») queda a la izquierda de la pestaña Inicio.
- Anchos máximos de contenido (los aplica cada página, centrada, padding lateral 32px desktop / 16px mobile): editor de clase y página de evento **720px**, listas (Clases, Apuntes) **880px**, inicio de materia **960px**, lanzador **560px**, calendario **sin máximo**.
- Breakpoints: mobile `< 768`, tablet `768–1023`, desktop `≥ 1024`.
  - Tablet: tira de pestañas normal; chat siempre como drawer superpuesto de 380px.
  - Mobile: ver §2.12.

### 2.7 Pestañas: comportamiento

Funcionan como un navegador y como los artifacts de Claude. **La URL manda.**

1. La pestaña activa es siempre la que corresponde a `pathname`. `localStorage` solo guarda la lista y el orden.
2. Identidad de una pestaña = `pathname` normalizado (sin query, sin hash, sin `/` final). `/apuntes?tipo=generados` activa la pestaña de Apuntes existente y le actualiza el `href` (guarda el filtro). Lo mismo con `?mes=` en Calendario.
3. **Inicio** de la materia está siempre fija a la izquierda, no se cierra y no se guarda (es implícita).
4. **Documentos** (clase, archivo, generado, evento): cada uno en su propia pestaña. **Vistas** (Clases, Apuntes, Calendario): como su identidad es el pathname, hay una sola de cada una. **Pestaña nueva** (`/nueva`): una sola a la vez; `+` la activa si ya existe.
5. Navegar a una URL que no está en la lista (link, sidebar, deep link, recarga, botón atrás, redirect viejo) crea su pestaña **a la derecha de la activa** y la activa. Si la activa es Inicio, se agrega al final. Si la activa era la pestaña nueva, la reemplaza en su lugar.
   - Decisión de arbitraje: un link a otra vista desde un documento **no** reemplaza al documento; abre o activa la pestaña de esa vista. Así ningún documento desaparece sin que lo cierres.
6. Ctrl/Cmd+click o click del medio sobre un link interno (`TabLink`): la pestaña se crea **en segundo plano** (a la derecha de la activa, con un punto de 6px de acento hasta que se activa) y no se navega.
7. Activar una pestaña = `<Link href={tab.href}>` (push), así el botón atrás vuelve a la pestaña anterior. Cerrar la activa = `router.replace(vecina.href)`. Vecina: la de la derecha; si no hay, la de la izquierda; si no queda ninguna, Inicio. Si el usuario vuelve con atrás a una URL cerrada, la regla 5 la reabre (aceptado y predecible).
8. `×` (18px, `rounded-xs`, visible en la activa y en hover) o click del medio sobre la pestaña la cierran.
9. Documento borrado o 404: `[id]/not-found.tsx` cierra la pestaña de ese pathname (navega a la vecina) y muestra el toast «Esa clase ya no existe» / «Ese apunte ya no existe» / «Ese evento ya no existe» según el tipo. Quien borra un documento llama `close(href)` (§2.8).
10. No se cierra nada automáticamente salvo el tope técnico de **30** pestañas: al abrir la 31.ª se descarta la no activa usada hace más tiempo. Arbitraje: la UX pedía no cerrar nunca y la técnica un tope de 12; se elige 30 para que el uso normal nunca dispare el descarte, y el tope existe solo para acotar `localStorage`. El menú de desborde (§8.7) cubre el caso de 12+.
11. Hidratación: la barra tiene alto fijo de 40px. En el server y en la hidratación se renderiza Inicio + la pestaña de la URL actual (calculada en forma pura); las demás aparecen al leer `localStorage`. Sin salto de layout ni mismatch.
12. Cambiar de pestaña desmonta la página anterior: **todo editor guarda al desmontarse** (§4.6).
13. Reordenar arrastrando: nice-to-have (`tabsStore.move`).

Íconos por tipo (§8.8): inicio `home`, nueva `plus`, clases/clase `clase`, apuntes `apunte`, archivo según tipo de archivo (`pdf`, `imagen`, `texto`, `video`, `apunte`), generado `generado`, calendario `calendario`, evento según kind (`examen`, `entrega`, `evento`).

Títulos por defecto: Inicio = nombre de la materia; nueva «Pestaña nueva»; clases «Clases»; clase «Clase»; apuntes «Apuntes»; archivo «Archivo»; generado «Documento»; calendario «Calendario»; evento «Evento». La página informa el título real (§2.9).

### 2.8 Pestañas: diseño técnico (A2)

**`src/lib/tabs.ts`** — TS puro, sin React, imports relativos, testeable con node:
```ts
export type TabKind = "inicio" | "nueva" | "clases" | "clase" | "apuntes" | "archivo" | "generado" | "calendario" | "evento";
export type Tab = { href: string; title: string; kind: TabKind; at: number; unread?: boolean; icon?: string };
export const MAX_TABS = 30;
export function tabKey(href: string): string;                       // pathname sin query/hash/"/" final
export function tabKindFromPath(materiaId: string, pathname: string): TabKind | null; // null = no pertenece a esta materia
export function defaultTitle(kind: TabKind): string;               // "inicio" → "" (lo pone TabBar)
export function isDocumentKind(kind: TabKind): boolean;           // clase | archivo | generado | evento
export function openPath(
  tabs: Tab[],
  href: string,
  opts: { materiaId: string; prevActiveKey: string | null; now: number; background?: boolean; title?: string }
): Tab[];
// - kind null o "inicio": devuelve tabs sin cambios.
// - ya existe la key: actualiza href; si !background: at = now y unread = false. No reordena.
// - !background y prevActiveKey es la pestaña "nueva": "nueva" se quita siempre. Si la key destino no existía, entra en el índice que ocupaba "nueva"; si ya existía, solo se actualiza (regla anterior) y "nueva" desaparece.
// - si no: inserta después de prevActiveKey (o al final si es null/inicio/no está). background → unread: true.
// - si queda > MAX_TABS: quita la no activa de menor `at`.
export function closeTab(tabs: Tab[], key: string, activeKey: string | null, materiaId: string): { tabs: Tab[]; next: string | null };
// next = href a navegar solo si key era la activa: derecha, si no izquierda, si no rutas.materia(materiaId).
export function setTabTitle(tabs: Tab[], key: string, title: string, icon?: string): Tab[]; // misma referencia si no cambia
export function markSeen(tabs: Tab[], key: string): Tab[];
export function moveTab(tabs: Tab[], key: string, toIndex: number): Tab[];
```
Patrones de `tabKindFromPath` (sobre `/materias/<id>`): `` → inicio, `/nueva`, `/clases`, `/clases/<x>` → clase, `/apuntes`, `/apuntes/archivo/<x>`, `/apuntes/generado/<x>`, `/calendario`, `/calendario/<x>` → evento. Cualquier otra cosa → `null`.

**`src/components/workspace/tabs-store.ts`** — store de módulo (no React state):
- `localStorage["arq.tabs.<materiaId>"] = JSON.stringify({ v: 1, tabs: Tab[] })`. Versión distinta o JSON roto → lista vacía.
- `getSnapshot(materiaId)` parsea una vez y **cachea por string crudo** (misma referencia mientras no cambie). `getServerSnapshot()` devuelve la constante de módulo `EMPTY: Tab[] = []`.
- `subscribe(cb)` escucha su evento propio `arq-tabs` y `storage`. Toda lectura/escritura de `localStorage` va en `try/catch`.
- `lastActive: Map<materiaId, key>` vive en memoria del módulo (no en `localStorage`, así dos ventanas no se pelean). `open()` sin background lee el anterior como `prevActiveKey` y guarda el nuevo. `open()` con `background: true` usa `lastActive.get(materiaId)` como `prevActiveKey` y **no** lo actualiza.
- `closed: string[]` (pila de 10 hrefs, memoria) para «reabrir la última cerrada».
- **Recientes**: `localStorage["arq.recent"] = { v: 1, items: Reciente[] }`, máx. 20, dedupe por key, más reciente primero. `type Reciente = { materiaId: string; materiaName: string; href: string; title: string; kind: TabKind; at: number }`. Se escribe en `open()` sin background y en `setTitle()`, solo para `isDocumentKind`.
- API exportada:
```ts
export const tabsStore: {
  subscribe(cb: () => void): () => void;
  getSnapshot(materiaId: string): Tab[];
  getServerSnapshot(): Tab[];
  open(materiaId: string, href: string, opts?: { background?: boolean; title?: string; materiaName?: string }): void;
  close(materiaId: string, key: string, activeKey: string | null): string | null; // devuelve href a navegar o null
  setTitle(materiaId: string, key: string, title: string, icon?: string): void;
  markSeen(materiaId: string, key: string): void;
  move(materiaId: string, key: string, toIndex: number): void;
  popClosed(materiaId: string): string | null;
};
export function forgetTabs(materiaId: string): void; // borra tabs y recientes de la materia
export function useTabs(): {
  tabs: Tab[];
  activeKey: string;
  close(href: string): void;                       // si era la activa, router.replace(next)
  openNueva(): void;                               // push a rutas.nueva(m)
  openInBackground(href: string, title?: string): void;
};
export function useRecientes(materiaId?: string): Reciente[]; // server/hidratación: []
```
**`TabBar.tsx`** (dentro del layout, envuelto en `<Suspense>` con un fallback de 40px vacío porque usa `useSearchParams`):
- `const tabs = useSyncExternalStore(tabsStore.subscribe, () => tabsStore.getSnapshot(m), tabsStore.getServerSnapshot)`.
- `activeKey = tabKey(pathname)` se deriva **durante el render**. Si la key no es Inicio y no está en `tabs`, se renderiza una pestaña provisional calculada en forma pura con `openPath(tabs, pathname, { …, now: 0 })`. Sin `setState`.
- `useEffect(() => { tabsStore.open(m, pathname + search, { materiaName }); tabsStore.markSeen(m, key) }, [pathname, search])`. Es un store externo, no un setState: pasa `react-hooks/set-state-in-effect`. **Nunca escribir refs durante el render.**
- Cerrar la activa: `tabsStore.close(...)` y después `router.replace(next)`. El effect depende solo de `[pathname, search]`, así que no vuelve a agregar la pestaña cerrada.
- Cada pestaña es un `<Link>`; `onAuxClick` (botón del medio) cierra.

**`TabLink.tsx`** (A2): wrapper de `next/link` con las mismas props. Con Ctrl/Cmd/botón del medio hace `preventDefault()` y `openInBackground(href)`. Todos los links internos de documentos dentro de una materia (listas, inicio, lanzador, chat) usan `TabLink`. Fuera de una materia (`useOptionalWorkspace()` null) se comporta como `Link`.

Import único: `import { TabLink } from "@/components/workspace/TabLink"` (export con nombre). No se re-exporta desde `@/components/ui`. Igual: `tabsStore`, `useTabs`, `useRecientes` y `forgetTabs` desde `@/components/workspace/tabs-store`; `FocusRegister` y `TabMeta` (`{ title: string }`) desde `@/components/workspace/WorkspaceContext`.

`tabs-store.ts` no importa `WorkspaceContext`. `useTabs()` saca el materiaId de `usePathname()` con `/^\/materias\/([^/]+)/` (si no matchea, lanza error) y solo importa `react`, `next/navigation`, `@/lib/tabs` y `@/lib/routes`.

Íconos por archivo: `Tab` lleva `icon?: string`; `setTabTitle(tabs, key, title, icon?)` y `tabsStore.setTitle(materiaId, key, title, icon?)` lo guardan; `FocusRegister` acepta `icon?: IconName` opcional y lo pasa; TabBar usa `tab.icon ?? iconoPorKind(kind)`. B3 renderiza `<FocusRegister kind="material" … icon={fileIconName(material.type, material.name)} />` (§8.6).

### 2.9 Contrato de título y foco (A2 lo implementa, todas las páginas lo usan)

- `FocusRegister` (existe en `WorkspaceContext.tsx`) además llama `tabsStore.setTitle(materiaId, tabKey(pathname), titulo)` en su effect.
- Nuevo `<TabMeta title="…" />` (mismo archivo) para páginas que no son documento: listas, calendario, pestaña nueva.
- **Toda página bajo `/materias/[id]` renderiza uno de los dos.** `NotaEditor` y la página de evento lo renderizan con el título del **estado cliente**, así renombrar actualiza la pestaña en vivo.
- `WorkspaceValue` cambia así (A2, Fase A):
```ts
openChat: (opts?: { focusComposer?: boolean }) => void;   // antes: () => void
registerComposerFocus: (handler: () => void) => () => void; // mismo patrón que registerAsk
```
  `openChat({ focusComposer: true })` abre el chat (columna, drawer o hoja según el ancho) y en el siguiente frame llama al handler registrado. `ChatPanel` (B3) registra `() => textarea.focus()`.
- Al borrar un documento, su dueño llama `useTabs().close(href)` (eso navega a la vecina si era la activa). Al borrar una materia (B4) se llama `forgetTabs(materiaId)`.

### 2.10 Lanzador y Ctrl/Cmd+K (A2)

Un mismo componente `src/components/workspace/Launcher.tsx` en dos lugares:
- La pestaña `/materias/[id]/nueva`: columna de 560px centrada, a 12vh del borde superior.
- Overlay global dentro de la materia con **Ctrl/Cmd+K**: modal de 600px, `rounded-xl`, `shadow-pop`, a 15vh del borde superior, `Esc` cierra.

Contenido:
- Buscador de 44px, `rounded-md`, ícono `search`, placeholder «Buscá una clase, un apunte o una fecha…», autofoco.
- Secciones con encabezado mono 11:
  - **Crear**: «Nueva clase» (crea con `crearNota(m, { titulo: "" })`, el server pone «Clase N», y navega a la clase), «Subir archivo» (input de archivos oculto → `enqueueUploads(m, files, { kind: "apuntes" })` → navega a `rutas.apuntes(m)`), «Cargar examen o entrega» (`rutas.calendario(m, { nuevo: true })`).
  - **Ir a**: Clases · Apuntes · Calendario.
  - **Recientes**: hasta 8 de `useRecientes(m)` con ícono, título y tipo en mono a la derecha. Si no hay, la sección no se muestra.
- Ítems de 36px, `rounded-md`, hover y selección `--selected`; flechas ↑↓ y Enter; atajo a la derecha en mono.
- Al tipear filtra en vivo títulos de clases, apuntes y eventos (`GET /api/materias/[id]/indice`, se pide una vez al montar). El último ítem siempre es «Preguntarle al chat: «<texto>»» → `askChat(texto, { send: true })` (y cierra el overlay). Si no hay resultados, es el único.
- En la pestaña, elegir un ítem de navegación hace `router.replace` (reemplaza la pestaña nueva, regla 5 de §2.7). En el overlay hace `router.push`.

### 2.11 Atajos (A2, salvo Ctrl+S que es de cada editor)

| Atajo | Acción |
|---|---|
| Ctrl/Cmd+K | Abre el lanzador overlay |
| Ctrl/Cmd+J | Abre o cierra el chat; al abrir, foco en el composer |
| Alt+1…9 | Activa la pestaña N (1 = Inicio) |
| Alt+W | Cierra la pestaña activa |
| Alt+Shift+T | Reabre la última cerrada (`popClosed`) |
| Ctrl/Cmd+S | Fuerza el guardado (clase y evento) |

No usar Ctrl+T, Ctrl+W ni Ctrl+Tab. Los tooltips muestran el atajo («Cerrar pestaña · Alt W»). Alt+1…9, Alt+W y Alt+Shift+T son nice-to-have; Ctrl+K y Ctrl+J son obligatorios.

### 2.12 Mobile y tablet

- **Mobile (< 768):** no hay tira de pestañas. Debajo del header de la app (56px, existente) va una barra de **44px** (A2, variante mobile de `TabBar`): a la izquierda un botón «selector de pestaña» (ícono del tipo, título actual truncado, chevron y un contador en pill, por ejemplo «4») que abre una hoja inferior con las pestañas (filas de 52px con ×; «Pestaña nueva» arriba); a la derecha un IconButton «Chat» de 40px que abre la hoja del chat a pantalla completa (existe).
- Tocar una tarjeta de artefacto en el chat cierra la hoja y navega a la pestaña.
- Inicio de materia: tiles 2×2 de 72px sin descripción. Calendario: agenda por defecto con tira de semana. Editor: barra de formato sobre el teclado (§4.7).
- En `pointer: coarse` todo objetivo táctil mide al menos 40px.
- **Tablet (768–1023):** tira de pestañas normal, chat como drawer superpuesto de 380px, sidebar como drawer.

### 2.13 Chat dentro de la materia (B3, con A1 para el prompt)

- Sigue a la izquierda, colapsable y redimensionable. Conoce el documento de la pestaña activa (`FocusRegister`).
- Header de **40px** (hoy es `h-12`): título del hilo, selector de hilos y cerrar.
- Al entrar a una materia el chat arranca siempre en un hilo nuevo y vacío; los anteriores quedan en el selector de hilos.
- Cuando el chat **crea un artefacto**:
  - La tarjeta del mensaje queda siempre: `rounded-lg`, tile de ícono de 32px, título, «Documento · v1» o «Examen · v1» en mono, botón «Abrir».
  - Desktop: si `const el = document.activeElement; el && !el.closest("[data-arq-chat]") && (el.matches("input, textarea") || el.closest('[contenteditable="true"]'))`, se abre **en segundo plano** (`openInBackground(rutas.generado(m, id), titulo)`) y se muestra el toast «Se guardó «<título>» en Apuntes · Abrir». Si no, `router.push(rutas.generado(m, id))` y la reconciliación de pestañas la abre activa. La raíz de `ChatPanel` lleva `data-arq-chat`. («Guardado pendiente» se descarta: no hay una señal compartida y el foco ya cubre el caso.)
  - Versión nueva de un artefacto que ya está abierto: mismo href → se activa esa pestaña (no se duplica); si ya era la activa, `router.refresh()` para mostrar la versión nueva.
  - Mobile: no se navega; tocar la tarjeta cierra la hoja y navega.
- **«Guardar en apuntes»**: IconButton (ícono `bookmark`, tooltip «Guardar en apuntes») en la fila de acciones del mensaje del asistente (copiar · guardar en apuntes), visible en hover o foco y siempre en mobile. Hace `POST /api/materias/[id]/artefactos` con `{ contenido: message.content, sourceMessageId: message.id }`, abre la pestaña en segundo plano y muestra el toast «Guardado en Apuntes · Abrir». No aparece en mensajes del usuario, en errores ni en mensajes cuyo contenido visible es solo un marcador de artefacto.
- Las citas del chat usan `TabLink` con `rutas.archivo` / `rutas.clase`. Sin `hover:border-accent`.

---

## 3. Inicio de la materia (B4, `src/app/materias/[id]/(resumen)/page.tsx`)

Pregunta guía implícita: «¿Qué querés hacer?». Ancho máximo 960, padding 40px arriba y 32px a los costados en desktop; 24 y 16 en mobile. Renderiza `<TabMeta title={materia.name} />`.

1. **Encabezado.** Nombre de la materia en serif 40/44. Debajo, cátedra · facultad en mono 11 mayúsculas, tracking .06em, `foreground-subtle` (se omite si no hay). Línea de estado en sans 15/22 `foreground-muted`, 8px abajo:
   - Con próximo evento: «Próximo: Primer parcial, jueves 15 de octubre (en 7 días)». Hoy: «Hoy: Entrega TP 2». Mañana: «Mañana: …».
   - Sin eventos futuros: «Sin fechas cargadas».
2. **Fila de acciones** (margin-top 24): grilla de 4 columnas, gap 12. Tiles de **84px** de alto, `rounded-lg` (12), padding 14/16, ícono 18 arriba a la izquierda, título 14/20 medium, descripción 12/16 muted en una línea. Orden y copy:
   - «Empezar clase» · «Arrancá a tomar apuntes» — **primaria**: fondo `bg-accent-muted` (token existente, 15%) e ícono acento; es el único acento del bloque. Crea la clase (`crearNota(m, { titulo: "" })` → «Clase N») y navega a `rutas.clase(m, id)`.
   - «Preguntarle al chat» · «Sobre tus clases y apuntes» → `openChat({ focusComposer: true })`.
   - «Subir apuntes» · «PDF, fotos, videos o texto» → input de archivos oculto → `enqueueUploads(m, files, { kind: "apuntes" })` (el panel de Subidas muestra el progreso).
   - «Cargar fecha» · «Examen, entrega u otro» → `rutas.calendario(m, { nuevo: true })`.
   - Tablet: 2×2. Mobile: 2×2 con tiles de 72px y sin descripción.
3. **Contenido** (margin-top 40): grilla de 12 columnas, gap 32.
   - Izquierda (7 col.): «Clases recientes», 4 filas de 44px (título, fecha mono a la derecha «3 oct», extracto de una línea opcional en muted). Link «Ver todas» → `rutas.clases(m)`.
   - Derecha (5 col.): «Se viene», hasta 4 eventos futuros: bloque de 36×36 `rounded-md` con día y mes en mono 11 («15 / oct»), nombre y «en 7 días». Link «Ver calendario».
   - Abajo, a lo ancho: «Apuntes recientes», una fila de hasta 4 ítems compactos (ícono, título, tipo en mono). Link «Ver todos».
   - < 1024: una sola columna, en el mismo orden.
4. Encabezados de sección: mono 11 mayúsculas `foreground-subtle`, con el link a la derecha como botón fantasma sm. Sin reglas gruesas.
5. **Materia totalmente vacía** (sin clases, sin archivos en Apuntes, sin eventos de ningún tipo, incluidos los sin fecha): encabezado y fila de acciones iguales; en lugar de las tres secciones, una tarjeta «Primeros pasos» (ancho máximo 560, `rounded-lg`, padding 20) con 3 filas de 44px, cada una con un círculo de 16px que se tilda solo cuando se cumple: «Anotá tu primera clase» · «Subí un PDF, foto o apunte» · «Cargá la fecha del primer parcial». Cada fila es un link a la acción. Al pie, línea muted: «El chat estudia con lo que cargues acá.» La tarjeta desaparece cuando se cumplen los 3 pasos.
6. **Parcial:** cada sección sin datos queda en su lugar con una línea muted y un link: «Todavía no tenés clases anotadas. Empezá una →», «Nada en las próximas semanas. Cargá una fecha →», «Todavía no subiste apuntes. Subí uno →».
7. Datos (server): `listNotas(m)`, `listApuntes(m)`, `listEventos({ materiaId: m, desde: hoyYmd(), hasta: sumarDias(hoyYmd(), 365) })` y `getExamenes(m)` (solo para saber si hay algún evento). Nada de `calculatePreparation`, `MASTERY_*` ni «Pedí un examen de práctica»: el archivo se **reescribe completo**.

---

## 4. Editor tipo Notion (B1): clases y descripciones de eventos

### 4.1 Librería y paquetes

- **Milkdown Crepe 7.22.2** con **@milkdown/kit 7.22.2**, versiones exactas: `npm i -E @milkdown/crepe@7.22.2 @milkdown/kit@7.22.2`. Es Markdown-nativo y usa el mismo parser remark (remark-gfm + remark-math 6) que `ChatMarkdown`, así `$..$`, `$$..$$`, `- [ ]` y tablas GFM significan lo mismo en el editor y en el chat.
- **No** agregar `@milkdown/react` (Crepe vanilla en un `useEffect` es más simple y evita sus quirks de contexto y StrictMode).
- `katex` queda en `^0.18.7` (Crepe pide `^0.18.0`; se deduplica).
- Seguridad: CVE-2026-57530 (XSS almacenado en commonmark/components) está corregido desde 7.21.3. **Nunca bajar de 7.21.3.**
- Fallback: Tiptap 3.31.4 (§4.10).
- El editor se usa **solo** para clases (`notas.contenido`) y descripciones de eventos (`examenes.description`). Los documentos generados por el chat viven en Apuntes y se ven con `ArtefactoViewer`/`ChatMarkdown` (solo lectura en v2). Editarlos con el editor queda para más adelante; el normalizador compartido hace que ese cambio no necesite migración.

### 4.2 Archivos (B1)

```
src/components/editor/
  index.ts                 export { MarkdownEditor } from "./MarkdownEditor"; export type { MarkdownEditorProps } from "./MarkdownEditor";
  MarkdownEditor.tsx       "use client"; wrapper con next/dynamic(ssr:false) + EditorSkeleton. API pública fija.
  MarkdownEditorImpl.tsx   "use client"; Crepe. Importa los CSS.
  editor-config.ts         EDITOR_FEATURE_CONFIGS (labels en español).
  markdown-editor.css      tema oscuro mapeado a tokens (nunca en globals.css).
  EditorSkeleton.tsx       3–4 líneas muted (alto ~120px) para que no salte el layout.
src/lib/editor-markdown.ts       normalizeEditorMarkdown()
src/lib/editor-markdown.test.ts
```
Los consumidores importan siempre `import { MarkdownEditor } from "@/components/editor"`. **Nadie más llama a `next/dynamic` para el editor** (`ssr: false` no está permitido en Server Components según `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md`).

### 4.3 API fija

```ts
export type MarkdownEditorProps = {
  value: string;                       // markdown inicial; se lee una sola vez al montar
  onChange: (markdown: string) => void;
  placeholder?: string;                // default: «Escribí algo, o «/» para insertar» (desktop) / «Escribí algo…» (pointer coarse)
  autoFocus?: boolean;
  readOnly?: boolean;
  className?: string;
  onAskSelection?: (text: string) => void; // opcional: ítem «Preguntarle al chat» del menú de selección
};
export function MarkdownEditor(props: MarkdownEditorProps): React.ReactElement;
```
- `value` **no** es controlado: para cargar otro contenido se remonta con `key={nota.id}` / `key={evento.id}`.
- `JSX.Element` no existe en los tipos de React 19: usar `React.ReactElement`.
- Formato guardado: Markdown. Fórmulas: inline `$...$`; bloque `$$` en línea propia + fórmula + `$$` en línea propia; nunca `\(..\)` ni `\[..\]`. Listas con `-`, divisor `---`.

`MarkdownEditor.tsx`:
```tsx
"use client";
import dynamic from "next/dynamic";
import type { MarkdownEditorProps } from "./MarkdownEditorImpl";
import { EditorSkeleton } from "./EditorSkeleton";
export type { MarkdownEditorProps };
const Impl = dynamic(() => import("./MarkdownEditorImpl").then((m) => m.MarkdownEditorImpl), {
  ssr: false,
  loading: () => <EditorSkeleton />,
});
export function MarkdownEditor(props: MarkdownEditorProps): React.ReactElement {
  return <Impl {...props} />;
}
```

### 4.4 Implementación (`MarkdownEditorImpl.tsx`)

```tsx
"use client";
import { useEffect, useRef } from "react";
import { Crepe } from "@milkdown/crepe";
import { editorViewCtx, remarkStringifyOptionsCtx } from "@milkdown/kit/core";
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame-dark.css";
import "./markdown-editor.css";
import { normalizeEditorMarkdown } from "@/lib/editor-markdown";
import { EDITOR_FEATURE_CONFIGS, defaultPlaceholder } from "./editor-config";

export type MarkdownEditorProps = { value: string; onChange: (markdown: string) => void; placeholder?: string; autoFocus?: boolean; readOnly?: boolean; className?: string; onAskSelection?: (text: string) => void };

export function MarkdownEditorImpl({ value, onChange, placeholder, autoFocus = false, readOnly = false, className, onAskSelection }: MarkdownEditorProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const crepeRef = useRef<Crepe | null>(null);
  const onChangeRef = useRef(onChange);
  const onAskRef = useRef(onAskSelection);
  const init = useRef({ value, placeholder, autoFocus, readOnly });
  useEffect(() => { onChangeRef.current = onChange; onAskRef.current = onAskSelection; });

  useEffect(() => {
    const host = document.createElement("div");
    rootRef.current!.appendChild(host);
    let disposed = false;
    const { value, placeholder, autoFocus, readOnly } = init.current;
    const crepe = new Crepe({
      root: host,
      defaultValue: normalizeEditorMarkdown(value),
      features: { [Crepe.Feature.ImageBlock]: false, [Crepe.Feature.TopBar]: false, [Crepe.Feature.AI]: false },
      featureConfigs: EDITOR_FEATURE_CONFIGS(placeholder ?? defaultPlaceholder()),
    });
    crepe.editor.config((ctx) => ctx.update(remarkStringifyOptionsCtx, (p) => ({ ...p, bullet: "-", rule: "-" })));
    crepe.on((l) => l.markdownUpdated((_ctx, md, prev) => { if (md !== prev) onChangeRef.current(md); }));
    const ready = crepe.create().then(() => {
      if (disposed) return;
      crepe.setReadonly(readOnly);
      crepeRef.current = crepe;
      if (autoFocus && !readOnly) crepe.editor.action((ctx) => ctx.get(editorViewCtx).focus());
    });
    return () => { disposed = true; crepeRef.current = null; ready.finally(() => { crepe.destroy(); host.remove(); }); };
  }, []);

  useEffect(() => { crepeRef.current?.setReadonly(readOnly); }, [readOnly]);
  return <div ref={rootRef} className={["arq-editor", className].filter(Boolean).join(" ")} />;
}
```
- El host nuevo y el `destroy()` recién cuando `create()` resolvió lo hacen seguro ante el doble montaje de StrictMode de React 19.
- Si alguna clave de `Crepe.Feature` (por ejemplo `AI` o `TopBar`) no existe en 7.22.2, se quita (tsc lo marca); no se cambia de versión por eso.
- `onAskSelection`: si el `Toolbar` de Crepe 7.22.2 expone `buildToolbar` en `featureConfigs`, se agrega un ítem «Preguntarle al chat» que llama `onAskRef.current?.(textoSeleccionado)`. Si no lo expone, la prop queda sin efecto (nice-to-have) y no se construye una toolbar propia.

`editor-config.ts` → `EDITOR_FEATURE_CONFIGS(placeholder)` devuelve:
- `Placeholder`: `{ text: placeholder, mode: "block" }`
- `BlockEdit`:
  - `textGroup`: `{ label: "Texto", text: { label: "Texto" }, h1: { label: "Título 1" }, h2: { label: "Título 2" }, h3: { label: "Título 3" }, h4: null, h5: null, h6: null, quote: { label: "Cita" }, divider: { label: "Divisor" } }`
  - `listGroup`: `{ label: "Listas", bulletList: { label: "Lista" }, orderedList: { label: "Lista numerada" }, taskList: { label: "Tareas" } }`
  - `advancedGroup`: `{ label: "Bloques", image: null, codeBlock: { label: "Código" }, table: { label: "Tabla" }, math: { label: "Fórmula en bloque" } }`
- `CodeMirror`: `{ searchPlaceholder: "Buscar lenguaje", copyText: "Copiar", noResultText: "Sin resultados", previewToggleText: (p) => (p ? "Editar" : "Ocultar"), previewOnlyByDefault: true }` (opcional: `theme` con `EditorView.theme` y fondo `var(--surface)` en lugar de oneDark).
- `Latex`: `{ katexOptions: { strict: "ignore" } }`
- `defaultPlaceholder()`: `matchMedia("(pointer: coarse)").matches ? "Escribí algo…" : "Escribí algo, o «/» para insertar"`.

Lo que trae Crepe y se usa tal cual: menú `/` (filtra al tipear), manija para arrastrar bloques (queda prendida), menú flotante de formato al seleccionar, tareas clickeables, tablas con herramientas de fila/columna, bloques de código CodeMirror, KaTeX inline y en bloque (se ve renderizado y al entrar con el cursor se edita el fuente), placeholder por bloque, pegado de Markdown y modo solo lectura.

### 4.5 Normalizador (`src/lib/editor-markdown.ts`, B1)

```ts
import { preprocessAssistantMarkdown } from "./chat-markdown.ts";
export function normalizeEditorMarkdown(md: string): string; // = preprocessAssistantMarkdown(md)
```
Convierte `\(..\)` → `$..$` y `\[..\]` → `$$\n..\n$$` fuera de código, y normaliza `$$`. Se llama **solo sobre el valor inicial**, nunca en cada tecla. Motivo: en la prueba de ida y vuelta, Crepe convirtió `\(a+b\)` en `(a+b)` (CommonMark se come los escapes). Test en `src/lib/editor-markdown.test.ts`: `\(a+b\)` → `$a+b$`; `\[x\]` → `$$\nx\n$$`; texto sin math queda igual; `""` → `""`. Si `sanitizeChatText` (que usa `preprocessAssistantMarkdown`) resulta alterar contenido legítimo de una nota, B1 lo informa como pedido a `chat-markdown.ts` en su salida final; no lo edita.

### 4.6 Guardado, título y Ctrl+S (B1 en `NotaEditor`; B2 replica el patrón en el evento)

- `MarkdownEditor` es tonto: no guarda. `NotaEditor` mantiene su lógica actual (ref `latest` actualizada en `useLayoutEffect`, `schedule(800)`, `save()`), con `onChange={(md) => { setContenido(md); schedule(800); }}`.
- **Flush obligatorio al desmontar** (cambiar de pestaña desmonta la página): en el cleanup del effect, si hay cambios pendientes, `fetch(PATCH, …)` normal (una navegación cliente no cancela el fetch). En `pagehide`/`beforeunload`: `fetch(..., { keepalive: true })` si el body pesa menos de 60 000 bytes (límite de keepalive); si pesa más, fetch normal como mejor esfuerzo.
- Ctrl/Cmd+S: listener `keydown` en `window` dentro de `NotaEditor`: `(e.ctrlKey || e.metaKey) && e.key === "s"` → `preventDefault()` + `save()`. ProseMirror no usa Mod-s.
- Título: `<input>` grande serif 32/38 en la misma columna de 720px, sin borde ni fondo, placeholder «Sin título». Enter en el título: `preventDefault()` y `wrapRef.current?.querySelector<HTMLElement>(".ProseMirror")?.focus()`, donde `wrapRef` es un `<div>` de `NotaEditor` que envuelve a `<MarkdownEditor>`. Sin remontar y sin cambiar la API.
- Se borran el modo «Escribir/Leer» y la barra `FORMATOS`. `readOnly` solo para un estado bloqueado.
- Indicador de guardado en mono 11, arriba a la derecha del documento: «Guardando…» y después «Guardado», que se desvanece a los 2 s. Si falla: «No se pudo guardar · Reintentar» en `--danger`.

### 4.7 Experiencia y estilo (`markdown-editor.css`, importado después de `frame-dark.css`)

```css
.arq-editor .milkdown {
  --crepe-color-background: transparent;
  --crepe-color-on-background: var(--foreground);
  --crepe-color-surface: var(--surface);
  --crepe-color-surface-low: var(--surface-elevated);
  --crepe-color-on-surface: var(--foreground);
  --crepe-color-on-surface-variant: var(--foreground-muted);
  --crepe-color-outline: var(--foreground-subtle);
  --crepe-color-primary: var(--accent);
  --crepe-color-secondary: var(--surface-overlay);
  --crepe-color-on-secondary: var(--foreground);
  --crepe-color-inverse: var(--foreground);
  --crepe-color-on-inverse: var(--background);
  --crepe-color-inline-code: var(--foreground);
  --crepe-color-error: var(--danger);
  --crepe-color-hover: var(--hover);
  --crepe-color-selected: var(--accent-muted);
  --crepe-color-inline-area: var(--surface-elevated);
  --crepe-font-title: var(--font-cormorant), serif;
  --crepe-font-default: var(--font-inter), system-ui, sans-serif;
  --crepe-font-code: var(--font-ibm-plex-mono), monospace;
  --crepe-shadow-1: var(--shadow-pop);
  --crepe-shadow-2: var(--shadow-pop);
}
.arq-editor .milkdown .ProseMirror { padding: 0 0 0 44px; }  /* reset.css trae 60px 120px; 44px = lugar para la manija */
.arq-editor .milkdown-slash-menu,
.arq-editor .milkdown-toolbar { border-radius: var(--radius-lg); background: var(--surface-overlay); border: 1px solid rgba(255,255,255,.08); }
```
Además:
- Ítems del menú `/` con `border-radius: var(--radius-md)`, 32px de alto, ícono de 16; menú de 280px de ancho.
- Código inline con fondo `var(--surface-elevated)` y `rounded-xs`, no el rojo por defecto.
- Manija `.milkdown-block-handle`: botón de 32px `rounded-md`, `color: var(--foreground-subtle)`, hover `var(--hover)`.
- Tipografía: cuerpo Inter 16/26; H1 serif 28/34; H2 serif 22/28; H3 Inter 16/24 semibold.
- `@media (prefers-reduced-motion: reduce)`: sin transiciones en menús y toolbar.
- Mobile (nice-to-have): si el menú de selección de Crepe no es usable en touch, una barra de 44px fija sobre el teclado (negrita, lista, título, «/») posicionada con `visualViewport`.
- Pegar una respuesta del chat ya renderizada (HTML con KaTeX) — should: plugin `$prose` con `transformPastedHTML` que reemplaza `span.katex` / `.katex-display` por `$tex$` / `$$\ntex\n$$` usando `annotation[encoding="application/x-tex"]`. B3 además agrega a cada mensaje la acción «Copiar» que escribe el Markdown crudo en `text/plain`.

### 4.8 Notas del editor (comportamiento esperado, no «arreglar»)

1. El Markdown se canonicaliza en el primer guardado: `*`/`_`, padding de tablas y saltos duros (`\` + salto de línea). Es cosmético; genera un diff en la primera edición.
2. `$100 y $200` se interpreta como math inline, igual que en `ChatMarkdown`. Para plata se escribe `\$`.
3. Un bloque de código con lenguaje `latex` se trata como fórmula en bloque y se guarda como `$$`.
4. Imágenes desactivadas (`ImageBlock` off): pegadas se guardarían como URLs `blob:`.
5. Crepe trae el runtime de Vue para sus menús (~35 kB gzip). Aceptable porque se carga lazy.
6. Milkdown ≥ 7.21.3 siempre (CVE-2026-57530).
7. `value` no es controlado; remontar con `key`.

### 4.9 Verificación del editor

- B1, sin dev server: `node -e "for (const p of ['@milkdown/crepe/theme/common/style.css','@milkdown/crepe/theme/frame-dark.css']) require.resolve(p)"` y el test de `editor-markdown`.
- B1 escribe `.cursor/skills/verify-arquimes/bin/drive-clase-editor.mjs` (Playwright, siguiendo el patrón de `drive-crear-materia.mjs`); lo corre la Fase C:
  1. Abre una clase y tipea `## Hola`, `- [ ] tarea`, `$x^2$ ` y `$$` + Enter + `\int x`; verifica render en vivo (h2, checkbox, `.katex`).
  2. Clickea el checkbox.
  3. Espera «Guardado» y verifica que el `contenido` enviado por PATCH contiene `## Hola`, `- [x] tarea`, `$x^2$` y un bloque `$$` en líneas propias.
  4. Recarga y verifica que se ve igual.
  5. Pega el texto `| a | b |\n| - | - |\n| 1 | 2 |` y verifica que aparece una tabla.
  6. Cambia de pestaña a los 300 ms de tipear y verifica que el cambio se guardó (flush al desmontar).
- Fase C corre `npm run build` para confirmar que Next/Turbopack resuelve los `@import 'katex/dist/katex.min.css'` de Crepe.

### 4.10 Fallback

Si Crepe falla la verificación (bundler o CSS, bugs de StrictMode o de cambio de pestaña, pérdida de Markdown en notas reales), se cambian **solo** las tripas de `MarkdownEditorImpl.tsx`, con la misma API: `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/markdown`, `@tiptap/extension-mathematics`, `@tiptap/extension-table`, `@tiptap/extension-list` (tareas), `@tiptap/suggestion` (menú `/` propio con `Menu` de `src/components/ui`) y `@tiptap/extension-drag-handle-react`, todos fijos en **3.31.4**. Hay que reemplazar sus tokenizers de math: el inline `/^\$([^$]+)\$(?!\$)/` convierte «Cuesta $100 y $200» en fórmula y el de bloque `/^\$\$([^$]+)\$\$/` falla con cualquier `$` adentro. Se corre la misma verificación. Último recurso: el textarea actual de `NotaEditor` con vista previa en `ChatMarkdown`.

---

## 5. Clases (B1)

- **Lista** `/materias/[id]/clases`: `<TabMeta title="Clases" />`. Encabezado «Clases» serif 32 y botón primario «Nueva clase» a la derecha. Agrupada por mes («Octubre 2026», mono 11 mayúsculas), de la más reciente a la más vieja. Filas de 52px, `rounded-md` en hover (`--hover`): fecha a la izquierda en mono 11 («8 oct»), título 14 truncado, extracto de una línea muted (primeros ~120 caracteres de texto plano). Cada fila es `TabLink` a `rutas.clase`. Menú «más» por fila con «Borrar».
- Vacío: `EmptyState` «Todavía no tenés clases anotadas.» con botón «Empezar clase».
- **Nueva clase**: `crearNota(m, { titulo: "" })` → el server pone «Clase N» (N = cantidad de clases de la materia + 1) y contenido vacío (sin plantilla). Se navega con `router.push(rutas.clase(m, id))`.
- **Página de clase** (`NotaEditor`): columna 720. Arriba, fecha de creación en mono 11 minúscula («jueves 8 de octubre»), a la derecha el indicador de guardado y un menú «más» (Descargar .md, Borrar). Título serif. Editor con `key={nota.id}` y `autoFocus` si `contenido === ""` (el foco va al cuerpo, no al título). `onAskSelection={(t) => askChat(`Explicame esto de mi clase «${titulo}»:\n\n${t}`, { send: true })}`. `<FocusRegister kind="nota" id={nota.id} titulo={titulo} />`.
- **Borrar**: `ConfirmDialog` «¿Borrar «Clase 4»?», cuerpo «No se puede deshacer.», botones «Borrar» (danger) y «Cancelar». `DELETE /api/notas/[id]` → `close(pathname)`.
- `NuevaNotaButtons` se reescribe con las primitivas manteniendo su export y props. B1 no lo borra. Si al final de B queda sin imports, lo borra Fase C.
- `src/lib/notas-client.ts` (B1): `crearNota(materiaId, input?: { titulo?: string; contenido?: string })`; `tituloNuevaClase` y `PLANTILLA_CLASE` se borran solo si `NuevaNotaButtons` ya no los usa.

---

## 6. Calendario y eventos (B2)

### 6.1 Datos

- Un **evento** es una fila de `examenes`. `kind`: `examen` | `entrega` | `evento` (lo que no es ni examen ni entrega: consulta, salida de campo…; en la UI se llama «Otro»). `kind` NULL se trata como `examen`.
- Para `examen`, `type`: `parcial` | `recuperatorio` | `final` (opcional).
- `date` (`YYYY-MM-DD`, obligatorio al crear desde el calendario), `hora` (`HH:MM`, opcional, columna nueva), `name`, `description` (Markdown) y temas (filas de `temas`, chips sin estado).
- Filas sin fecha (subidas de examen viejas de `createExamenWithFile`): no aparecen en la grilla; aparecen en la agenda bajo «Sin fecha».
- Borrar el archivo de un examen desde Apuntes no borra el evento: limpia `examenes.material_id` y `file_*` (A1). Borrar un evento conserva su archivo como apunte: `materiales.kind = NULL`, `exam_id = NULL` (A1).
- Fechas siempre **locales** (nunca `new Date("YYYY-MM-DD")`, que es UTC): usar `src/lib/fechas.ts` (§10.3).

### 6.2 Componentes (`src/components/calendar/`)

```ts
type CalendarViewProps = {
  scope: { tipo: "materia"; materiaId: string; materiaName: string } | { tipo: "global"; materias: { id: string; name: string }[] };
  mes: string;                    // "YYYY-MM"
  vista: "mes" | "agenda";
  eventosMes: EventoResumen[];    // rango visible de la grilla
  agenda: EventoResumen[];        // de hoy a +120 días, más los sin fecha (date undefined)
  nuevo?: { fecha?: string };     // viene de ?nuevo=1&fecha=
};
```
Archivos sugeridos: `CalendarView.tsx`, `MonthGrid.tsx`, `Agenda.tsx`, `WeekStrip.tsx`, `EventChip.tsx`, `QuickCreatePopover.tsx`, `EventoPreviewPopover.tsx`, `DayPopover.tsx`, `EventoDetalle.tsx`, `TemasChips.tsx`, `types.ts` (tipos locales del paquete).

### 6.3 Vista

- `<TabMeta title="Calendario" />` en la materia.
- Desktop: vista mes por defecto. Mobile (< 768): agenda por defecto, con `WeekStrip` arriba (7 días de 44px con puntos).
- Barra superior de 48px: mes en serif 24 («Octubre 2026»), botones ‹ › de 28px, «Hoy» (secundario sm) y, a la derecha, el `SegmentedControl` «Mes · Agenda» y «Nuevo evento» (primario sm). Navegar cambia `?mes=` con `router.replace` (la pestaña guarda el mes).
- Grilla: encabezados «lun mar mié jue vie sáb dom» en mono 11 muted (la semana arranca el lunes). Celdas de altura mínima 104px separadas por líneas de 1px `border-subtle` (sin tarjetas por celda). Número del día 13px arriba a la izquierda; días de otro mes al 35% de opacidad; días pasados al 60%. **Hoy**: número dentro de un círculo de 22px relleno de acento con texto oscuro (único acento de la grilla).
- Chips de evento: 20px de alto, `rounded-sm`, fondo `--hover`, texto 12px truncado. Prefijo: hora en mono si hay, o ícono de 12px del tipo. En el calendario global, además, el punto de color de la materia. Hasta 2 chips por celda y después «+N más», que abre `DayPopover` con todos los del día.
- Agenda: al costado solo si el contenedor mide ≥ 900px (`@container (min-width: 900px)`, columna de 320px); si no, debajo. Grupos «Hoy», «Mañana», «Esta semana», «La que viene», luego por mes («Noviembre»), y «Sin fecha» al final. Filas de 52px: día en mono, nombre, tipo y cuenta regresiva (`cuentaRegresiva`).
- Nice-to-have: arrastrar un chip a otro día para reprogramar (`PATCH date`).

### 6.4 Creación rápida

- Click en un día (o «Nuevo evento», que usa hoy) abre `QuickCreatePopover`: 320px, anclado a la celda, `rounded-lg`, `shadow-pop`; en mobile, hoja inferior.
- Orden: (global: selector «Materia» primero, con la última usada por defecto, guardada en `localStorage["arq.calendario.ultimaMateria"]`); chips de tipo «Examen · Entrega · Otro» (con Examen aparecen subchips «Parcial · Recuperatorio · Final»); «Nombre» con autofoco y placeholder según tipo («Primer parcial», «TP 2», «Consulta»); fecha precargada editable; «Hora» opcional (`HH:MM`, campo de 88px).
- Enter guarda (`POST /api/materias/[id]/evaluaciones`), Esc cierra. «Más detalles» guarda y navega a `rutas.evento`. Después de guardar: `router.refresh()`.
- `?nuevo=1` (y `?fecha=`) se leen en la página server desde `searchParams` y llegan como prop `nuevo`. Al abrir el popover se hace `router.replace(rutas.calendario(m, { mes }))` para que restaurar la pestaña no lo reabra. Sin `useSearchParams` en estos componentes.
- Los temas se cargan en la página del evento, no en el popover.

### 6.5 Página del evento (`/materias/[id]/calendario/[eventoId]`, `EventoDetalle`)

- Columna 720. Encabezado: pill de tipo (mono 11, `rounded-full`, fondo `--hover`: «Examen · Parcial», «Entrega», «Otro»); nombre editable en serif 32 (input sin borde); línea de metadatos sans 14 muted: «jueves 15 de octubre · 18:00 · en 7 días». Fecha, hora y tipo se editan cada uno en un `Popover` al clickearlos. `PATCH /api/examenes/[id]`.
- «Temas»: chips editables (`TemasChips`): input inline, Enter agrega (`POST /api/examenes/[id]/temas { name }`), `×` borra (`DELETE /api/temas/[id]`). Sin estados, sin colores.
- Acciones con el chat (botones secundarios sm, `askChat(texto, { send: true })`):
  - examen: «Armame un simulacro» → `Armame un simulacro de «${name}»${temas ? ` con estos temas: ${temas}` : ""}.`; «Haceme una guía de estudio» → `Haceme una guía de estudio para «${name}»${temas…}.`
  - entrega: «Armame un plan para la entrega» → `Armame un plan para la entrega «${name}» del ${fechaLarga}.`; «Haceme una guía de estudio».
  - evento: «Haceme una guía de estudio».
- Si el evento tiene archivo (filas viejas): fila «Archivo del examen» con `TabLink` a `rutas.archivo(m, materialId)`. Adjuntar un archivo a un evento existente está fuera de alcance.
- Descripción: `MarkdownEditor` con `key={evento.id}`, placeholder «Anotá qué entra, qué dijo el profe, links…», autoguardado con el mismo patrón que `NotaEditor` (debounce 800, flush al desmontar, Ctrl+S) sobre `PATCH { description }`.
- Menú «más»: «Borrar» → `ConfirmDialog` «¿Borrar «Primer parcial»?» / «No se puede deshacer.» → `DELETE /api/examenes/[id]` → `close(pathname)`.
- `<FocusRegister kind="examen" id={evento.id} titulo={name} />` con el nombre del estado cliente.

### 6.6 Calendario global (`/calendario`)

- `<AppShell>` + mismo `CalendarView` con `scope.tipo = "global"`. Datos: `listEventos` sin `materiaId`, `getMaterias()`.
- Click en un evento abre `EventoPreviewPopover` (nombre, materia con su punto, fecha y hora, temas) con «Abrir en la materia» → `rutas.evento(materiaId, id)`.
- Sin materias: `EmptyState` «Primero creá una materia.» con «Crear materia».

---

## 7. Apuntes (B3)

- **Qué es un apunte:** archivos (`materiales`, **incluidos** los de `kind = 'examen'`) + generados por el chat (`artefactos`). Se listan con `listApuntes(m)` (§10.4).
- `<TabMeta title="Apuntes" />`. Encabezado «Apuntes» serif 32 y, debajo, muted: «Tus archivos y lo que guardaste del chat.»
- Barra: buscador de 32px (240px de ancho, filtra en cliente por título), `SegmentedControl` «Todos · Archivos · Del chat» (`?tipo=` vacío / `archivos` / `generados`), orden «Recientes · Nombre» (`?orden=nombre`) y botón «Subir» (secundario, ícono `upload`) a la derecha. Filtros y orden cambian la URL con `router.replace`.
- **Lista** (no grilla), filas de 52px, `rounded-md` en hover: tile de ícono de 32px `rounded-md` (PDF, Imagen, Texto, Video, Examen —archivo de examen—, «Examen del chat», «Documento del chat»); título 14 truncado; metadatos en mono 11 («PDF · 2,4 MB · 3 oct», «Examen · PDF · 1,1 MB · 2 sep», «Del chat · v2 · 5 oct»); a la derecha, el estado de lectura de los archivos: `subiendo`/`leyendo` → «Leyendo…», `lista` → «Listo para el chat», `parcial` → «Leído en parte», `sin-texto` → «Sin texto legible», `no-aplica` → nada. Menú «más» por fila: «Descargar» (archivos), «Borrar».
- Cada fila es `TabLink` a `rutas.archivo` o `rutas.generado`.
- **Soltar archivos:** toda la pestaña es zona de soltar. Mientras se arrastra aparece un overlay con borde punteado de 1.5px, `rounded-xl`, inset 16, con «Soltá los archivos acá». No hay caja punteada fija, salvo en el estado vacío: caja de 200px de alto, ícono `upload`, «Arrastrá PDFs, fotos o apuntes, o elegí archivos» y la línea muted «El chat va a poder estudiar con esto.»
- Subir usa la cola existente (`enqueueUploads(m, files, { kind: "apuntes" })`, `usePendingUploads`, `onUploadComplete` → `router.refresh()`). Los pendientes se muestran como filas arriba con progreso. `ApuntesLibrary` se reescribe (o se reemplaza por un componente nuevo en la misma carpeta) sin `MateriaLayout`.
- Borrar: `ConfirmDialog` «¿Borrar «<nombre>»?» / «No se puede deshacer.» → `DELETE /api/materiales/[id]` o `DELETE /api/artefactos/[id]`; si su pestaña está abierta, `close(href)`.
- **Archivo** (`apuntes/archivo/[materialId]`): `MaterialViewer` existente sin `MateriaLayout`, `<FocusRegister kind="material" …/>`, título = nombre del archivo.
- **Generado** (`apuntes/generado/[artefactoId]`): `ArtefactoViewer` existente (versiones, examen interactivo), solo lectura, `<FocusRegister kind="artefacto" …/>`. El examen interactivo **solo corrige y muestra el puntaje** («Sacaste 7 de 10»): se borra «Guardar en mi preparación» y la llamada a `POST /api/artefactos/[id]/resultado`.
- Restos a reescribir completos (no parchear): `ChatPanel` (navegación a `/generados/<id>`, `hover:border-accent`, `text-[10px]`), `ExamenInteractivo`, `ArtefactoViewer`, `PedirAlChat`, `ChatToggle` si existe dentro de esos archivos.

---

## 8. Sistema visual (más suave, menos cuadrado)

Se mantiene la identidad: fondo gris oscuro `#151515` (no negro puro), texto blanco cálido, serif (Cormorant) para títulos grandes, sans (Inter) para la UI, mono (IBM Plex Mono) para etiquetas y metadatos, acento `rgb(243,164,75)` solo para acción primaria, progreso, alertas, foco y «hoy». Cambian la geometría y la interacción.

### 8.1 Tokens (A2, `src/app/globals.css`)

En `:root` (se agregan; los existentes quedan):
```css
--background: #151515;
--surface: #1b1b1b;
--surface-elevated: #222222;
--surface-overlay: #292929;    /* popovers, menús, modales */
--hover: rgba(255,255,255,.045);
--selected: rgba(255,255,255,.08);
--pressed: rgba(255,255,255,.11);
--border-strong: rgba(255,255,255,.18);
--accent-hover: rgb(247,178,102);
--ring: rgba(243,164,75,.5);
--danger: #f2877d;
--danger-muted: rgba(242,135,125,.12);
--dur-fast: 120ms;
--dur-pop: 160ms;
--ease-out: cubic-bezier(.22,1,.36,1);
```
En `@theme inline` (crea utilidades `bg-hover`, `bg-selected`, `ring-ring`, etc.):
```css
--color-surface-overlay: var(--surface-overlay);
--color-hover: var(--hover);
--color-selected: var(--selected);
--color-pressed: var(--pressed);
--color-border-strong: var(--border-strong);
--color-accent-hover: var(--accent-hover);
--color-ring: var(--ring);
--color-danger: var(--danger);
--color-danger-muted: var(--danger-muted);
```
En un bloque `@theme` (no inline; Tailwind v4 lo emite también como variables en `:root`, así que no se duplica en `:root`), sobreescribiendo la escala de Tailwind:
```css
--radius-xs: 4px;   /* kbd, chips internos, × de pestaña, código inline */
--radius-sm: 6px;   /* pestañas, chips de calendario, IconButton 28 */
--radius-md: 8px;   /* botones, inputs, ítems de menú, filas en hover, IconButton 32/40 */
--radius-lg: 12px;  /* tarjetas, tiles, popovers, menús, toasts */
--radius-xl: 16px;  /* modales, lanzador, overlay de soltar */
--shadow-pop: 0 12px 32px rgba(0,0,0,.5), 0 2px 6px rgba(0,0,0,.3);
```
Así: botón = `rounded-md` (8), tarjeta = `rounded-lg` (12), modal = `rounded-xl` (16), pills = `rounded-full`. Se borran `--tabs-pill-bg` y la clase `.t-tabs-pill` (y sus usos).

Se descarta la escala 4/6/10/14/20 y los grises sólidos `surface-hover`/`surface-active` de la revisión técnica: gana la escala de UX (4/6/8/12/16) con hovers translúcidos. Se conserva de esa revisión ponerlos en `@theme` para que existan las utilidades.

### 8.2 Capas, foco y movimiento

- Hover, seleccionado y presionado son **capas translúcidas** (`--hover`, `--selected`, `--pressed`) que funcionan sobre cualquier superficie. No usar grises sólidos para hover.
- Foco solo con `:focus-visible`: `outline: none; box-shadow: 0 0 0 2px var(--background), 0 0 0 4px var(--ring);` (regla global en `globals.css` para `a, button, [role=button], [role=tab], input, textarea, select, [tabindex]`).
- Popovers y menús: `bg-surface-overlay`, borde 1px `rgba(255,255,255,.08)`, `shadow-pop` (en fondo oscuro la sombra sola no alcanza).
- Transiciones: 120ms `ease-out` en fondo y color; 160ms en opacidad/transform de popovers (escala .98 → 1). `@media (prefers-reduced-motion: reduce)`: sin transform ni transiciones de layout.
- **Prohibido:** `hover:border-accent`, `hover:text-accent` en links y tarjetas, bordes blancos fuertes en hover, `text-[10px]` (mínimo absoluto 11px), degradés decorativos, acento como fondo grande.

### 8.3 Tipografía (clases utilitarias en `globals.css`, A2)

| Uso | Clase | Spec |
|---|---|---|
| Display (inicio de materia) | `.t-display` | serif 40/44 |
| Saludo del inicio global | `.t-greeting` | serif 36/40 |
| Título de documento (clase, evento, Apuntes, Clases) | `.t-doc-title` | serif 32/38 |
| Título de sección (mes del calendario) | `.t-section` | serif 24/30 |
| Meta / etiquetas | `.t-meta` | IBM Plex Mono 11/16, mayúsculas, tracking .06em, `foreground-subtle` |
| UI | (Tailwind) | Inter 14/20; chica 13/18 |
| Editor | `markdown-editor.css` | cuerpo Inter 16/26; H1 serif 28/34; H2 serif 22/28; H3 Inter 16/24 semibold |

### 8.4 Espaciado y alturas

- Espaciado base 4: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.
- Controles: **sm 28**, **md 32** (por defecto en barras y filas), **lg 40** (CTA de estados vacíos y formularios). IconButton 28 o 32 con ícono de 16; 40 en mobile.

### 8.5 Componentes base (reglas)

- Botón primario: `bg-accent text-[#0a0a0a]`, hover `bg-accent-hover`. Secundario: `bg-hover`, hover `bg-selected`, active `bg-pressed`, **sin bordes**. Fantasma: transparente, hover `bg-hover`. Danger: texto `danger`, hover `bg-danger-muted`. Todos `rounded-md`.
- Tarjetas: `rounded-lg bg-surface border border-border-subtle`; si son interactivas, hover `bg-surface-elevated border-border`.
- Inputs: `rounded-md bg-surface border border-border-subtle`, hover `border-border`, foco con el anillo (sin borde amarillo).
- Pills/chips: `rounded-full`.
- Pestañas: §8.7.

### 8.6 Primitivas (`src/components/ui/`, A2; todas las pantallas nuevas o tocadas las usan)

Todo se exporta desde `src/components/ui/index.ts`.
```ts
type IconName = "home" | "clase" | "apunte" | "generado" | "calendario" | "chat" | "panel" | "plus" | "x" | "search"
  | "upload" | "download" | "trash" | "more" | "chevron-down" | "chevron-left" | "chevron-right" | "check" | "copy"
  | "bookmark" | "clock" | "pdf" | "imagen" | "texto" | "video" | "examen" | "entrega" | "evento" | "sparkle" | "link" | "menu";
Icon: { name: IconName; size?: 12 | 14 | 16 | 18 | 20 | 24; className?: string }       // SVG inline, stroke 1.5, stroke-linecap/linejoin round, currentColor
Button: { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "md" | "lg"; icon?: IconName; iconRight?: IconName; loading?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>
ButtonLink: mismas props visuales & { href: string } & Omit<ComponentProps<typeof Link>, "href">   // usa next/link (TabLink adentro de una materia lo pone el consumidor)
IconButton: { icon: IconName; label: string; size?: 28 | 32 | 40; variant?: "ghost" | "secondary"; shortcut?: string } & ButtonHTMLAttributes<HTMLButtonElement> // label = aria-label + Tooltip
Card: { as?: "div" | "a" | "button"; href?: string; interactive?: boolean; className?: string; children: ReactNode }
Pill: { tone?: "neutral" | "accent"; size?: "sm" | "md"; icon?: IconName; onRemove?: () => void; children: ReactNode }
Input: forwardRef<HTMLInputElement, { size?: "sm" | "md" | "lg"; invalid?: boolean } & Omit<InputHTMLAttributes<HTMLInputElement>, "size">>
Textarea: forwardRef<HTMLTextAreaElement, { invalid?: boolean } & TextareaHTMLAttributes<HTMLTextAreaElement>>
SegmentedControl<T extends string>: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; size?: "sm" | "md"; ariaLabel: string }
Popover: { open: boolean; onClose: () => void; anchor: HTMLElement | DOMRect | null; placement?: "bottom-start" | "bottom-end" | "right-start"; width?: number; children: ReactNode } // portal, Esc, click afuera, foco vuelve al anchor
Menu: { trigger: (p: { onClick: () => void; "aria-expanded": boolean; ref: Ref<HTMLButtonElement> }) => ReactNode; items: ({ label: string; icon?: IconName; shortcut?: string; danger?: boolean; onSelect: () => void } | { separator: true })[]; placement?: "bottom-start" | "bottom-end" | "right-start" /* default "bottom-end" */; width?: number /* 220 */ }
Modal: { open: boolean; onClose: () => void; title: string; description?: string; children?: ReactNode; footer?: ReactNode; width?: number /* 440 */ }
ConfirmDialog: { open: boolean; title: string; body?: string; confirmLabel?: string /* «Borrar» */; cancelLabel?: string /* «Cancelar» */; tone?: "danger" | "default"; onConfirm: () => void | Promise<void>; onCancel: () => void }
EmptyState: { icon?: IconName; title: string; description?: string; action?: ReactNode; size?: "sm" | "lg" }
Tooltip: { label: string; shortcut?: string; side?: "top" | "right" | "bottom"; children: ReactElement } // hover/focus, 400ms de demora, sin JS de posicionamiento complejo
Kbd: { children: ReactNode }
toast(input: { message: string; action?: { label: string; href?: string; onClick?: () => void }; tone?: "default" | "error" }): void
Toaster: () => ReactElement   // montado una sola vez en src/app/layout.tsx (A2); 5 s; abajo a la derecha (desktop), abajo al centro (mobile)
Sheet: { open: boolean; onClose: () => void; title?: string; children: ReactNode } // portal, anclada abajo, rounded-t-xl, bg-surface-overlay, Esc y backdrop cierran, alto máximo 85vh

// src/components/ui/Icon.tsx (A2), exportado desde index.ts
export function fileIconName(mime: string, fileName: string): "pdf" | "imagen" | "texto" | "video" | "apunte";
// pdf/imagen/texto vía inferMaterialViewerKind; mime "video/*" → "video"; resto → "apunte"
export function apunteIconName(item: ApunteItem): IconName;
// archivo con esExamen → "examen"; archivo → fileIconName; generado tipo "examen" → "examen"; generado tipo "documento" → "generado"
```
Mobile: todo popover/menú de B usa `Sheet` en `< 768`. Ícono de archivo: A2 (pestañas), B3 (filas de Apuntes) y B4 (apuntes recientes, «Seguir donde dejaste») usan `fileIconName`/`apunteIconName`; nadie escribe su propio mapeo.
`src/components/Button.tsx`, `Input.tsx` (sin imports hoy) se borran. `src/components/Skeleton.tsx` queda (A2 puede ajustar radios). El `PanelIcon` con `rect` sin redondear se reemplaza por `Icon name="panel"`.

### 8.7 Pestañas (visual, A2)

- Barra de 40px, fondo `--background`, padding horizontal 8px, gap 2px, `border-bottom: 1px solid var(--border-subtle)`.
- Pestaña píldora: 28px de alto, `rounded-sm` (6px), padding `0 8px 0 10px`; ícono 14; título 13/18 truncado; ancho flexible entre 120 y 200px (200 si sobra lugar).
- Inactiva: texto `foreground-muted`; hover `bg-hover`. Activa: `bg-selected` y texto `foreground`. **Sin acento** (salvo el punto de 6px de «sin ver» de las abiertas en segundo plano).
- `×` de 18px `rounded-xs`, visible en la activa y en hover; hover `bg-hover`.
- Inicio fija: ícono + nombre de la materia en serif 15px, máximo 180px; separador de 1px × 16px a su derecha.
- `+`: IconButton 28 pegado a la última pestaña (no al borde), tooltip «Pestaña nueva».
- **Desborde:** cuando ya no entran a 120px, la tira hace scroll horizontal (`scrollbar-width: none`) con un degradé de 24px hacia `--background` en el borde que corta (es funcional, no decorativo); la activa siempre visible (`scrollIntoView({ inline: "nearest" })`); la rueda vertical sobre la barra hace scroll horizontal. A la derecha, fijo y fuera del scroll, un IconButton 28 con `chevron-down` abre el menú «Pestañas abiertas»: filas con ícono, título, tipo en mono y `×`, y un buscador si hay más de 8.

### 8.8 Íconos

Set propio en `src/components/ui/Icon.tsx`: SVG inline 24×24 viewBox, trazo 1.5px, `stroke-linecap: round`, `stroke-linejoin: round`, `fill: none`, `currentColor`. Nombres en §8.6.

### 8.9 Color por materia (A2, `src/lib/materia-tone.ts`)

```ts
export type MateriaTone = { name: string; color: string };
export const MATERIA_TONES: MateriaTone[]; // 8 tonos
export function materiaTone(materiaId: string): MateriaTone; // FNV-1a 32 bits del id, módulo 8. Sin migración.
```
Tonos (OKLCH, baja saturación, ninguno cerca del acento): arena `oklch(.74 .05 95)`, salvia `oklch(.72 .07 150)`, pizarra `oklch(.70 .06 245)`, lavanda `oklch(.72 .07 295)`, terracota `oklch(.70 .08 25)`, musgo `oklch(.72 .07 120)`, acero `oklch(.72 .05 215)`, rosa viejo `oklch(.72 .07 350)`.
Uso **solo** como punto de 6px o filete izquierdo de 2px: sidebar, calendario global, «Se viene» del inicio global, preview de evento. Nunca como fondo ni texto.

### 8.10 Marca

La marca de Arquímedes (grabado punteado con compás) está en `assets/brand/`. B4 copia `arquimedes-archimedes-white-on-black.png` a `public/brand/arquimedes-mark.png` y la usa en el estado vacío del inicio global (96px, opacidad .5). No se usa en pantallas de estudio.

---

## 9. Copy (glosario obligatorio)

- Voseo rioplatense siempre: «Subí», «Cargá», «Empezá», «Tenés». Prohibido: tuteo («haz», «tienes», «sube»), «clic aquí», «usuario», «Próximamente», cualquier referencia a compartir/comunidad/preparación/dominio.
- Nombres: «Empezar clase» (acción), «Nueva clase» (botón de lista y lanzador), «Clases», «Apuntes», «Calendario», «Inicio», «Del chat» (filtro), «Guardar en apuntes», «Cargar examen o entrega» (lanzador), «Cargar fecha» (tile), «Nuevo evento» (calendario), tipos «Examen · Entrega · Otro», subtipos «Parcial · Recuperatorio · Final».
- Vacíos: «Todavía no tenés clases anotadas.», «Todavía no subiste apuntes.», «Nada en los próximos 14 días.», «Sin fechas cargadas».
- Soltar: «Soltá los archivos acá». Placeholder del editor: «Escribí algo, o «/» para insertar» / «Escribí algo…».
- Borrar: título «¿Borrar «<nombre>»?», cuerpo «No se puede deshacer.», botones «Borrar» y «Cancelar».
- Toasts: «Guardado en Apuntes · Abrir», «Se guardó «<título>» en Apuntes · Abrir», «Esa clase ya no existe», «Ese apunte ya no existe», «Ese evento ya no existe», «No se pudo guardar · Reintentar».
- Chat: «Armame un simulacro», «Armame un plan para la entrega», «Haceme una guía de estudio», «Preguntarle al chat».
- Fechas siempre en minúscula y con día de la semana: «jueves 15 de octubre» (con año solo si no es el actual: «martes 2 de marzo de 2027»). Cortas en mono: «15 oct». Cuenta regresiva: «hoy», «mañana», «pasado mañana», «en N días» (hasta 14), después «el 3 de noviembre»; pasado: «ayer», «hace N días».
- Metadata raíz (`src/app/layout.tsx`): description «Organizá toda tu vida de estudio en la facu.»

---

## 10. Datos y API (A1)

### 10.1 Tipos nuevos (`src/lib/types.ts`, A1 los agrega **todos en su primer commit**)

```ts
export type ExamType = "parcial" | "recuperatorio" | "final";
export type EvaluacionKind = "examen" | "entrega" | "evento";
// ExamenEnPreparacion suma:  hora?: string;   // "HH:MM"
export type Evento = ExamenEnPreparacion;      // alias de dominio para código nuevo

export type EventoResumen = {
  id: string; materiaId: string; materiaName: string;
  kind: EvaluacionKind; type?: ExamType;
  name: string; date?: string; hora?: string;   // date undefined = «Sin fecha»
  temasCount: number;
};

export type ApunteItem =
  | { origen: "archivo"; id: string; name: string; type: string; size: number; addedAt: string; lectura?: LecturaArchivo; esExamen: boolean; examenId?: string }
  | { origen: "generado"; id: string; titulo: string; tipo: ArtefactoTipo; version: number; createdAt: string; updatedAt: string };

export type MateriaResumen = { materia: Materia; proximoEvento?: EventoResumen; clasesCount: number; apuntesCount: number };

export type MateriaIndice = {
  clases: { id: string; titulo: string; updatedAt: string }[];
  apuntes: ApunteItem[];
  eventos: EventoResumen[];
};

export type ArtefactoCreado = { id: string; titulo: string; tipo: ArtefactoTipo; version: number };
```
`Tema.masteryState`, `MasteryState`, `MASTERY_LABELS`, `MASTERY_ORDER`, `PracticeOutcome`, `PlanPreparacion*` y `Materia.preparacion` quedan en Fase A marcados `/** @deprecated v2 */` (se borran en Fase C, §10.7). Los tipos de pestañas viven en `src/lib/tabs.ts` (A2), no en `types.ts`.

### 10.2 Migración `hora` (en `ensureSchema` de `src/lib/db-auth.ts`)

- `if (!names.has("hora")) await db.execute("ALTER TABLE examenes ADD COLUMN hora TEXT")`, envuelto en `try/catch` que ignore `/duplicate column/i` (cold starts concurrentes en Turso/Vercel). Mismo patrón que `kind` y `description`.
- `CREATE INDEX IF NOT EXISTS idx_examenes_user_date ON examenes (user_id, date)`.
- Agregar `hora` a las listas **explícitas** de columnas de `getExamenes` y `getExamen` (los `SELECT` cerca de las líneas 534 y 550), a `toExamen`, al `INSERT` de `createEvaluacion` y al `set()` de `updateEvaluacion`.
- `toExamen`: `kind` `"entrega"` → entrega, `"evento"` → evento, cualquier otro/NULL → examen.
- Si la promesa de schema falla, resetear `schemaReady = null` para no cachear el rechazo.
- **No tocar** `mastery_state TEXT NOT NULL`: `createTema` sigue insertando el literal `'no_estudiado'`. La columna `materias.preparacion_json` queda y no se lee más.

### 10.3 Fechas (`src/lib/fechas.ts`, A1; imports relativos; test en `src/lib/fechas.test.ts`)

```ts
export const ZONA = "America/Argentina/Buenos_Aires";
export function hoyYmd(now?: Date, timeZone?: string): string;           // "2026-10-08" en ZONA
export function parseYmd(ymd: string): Date;                              // fecha local a las 00:00, nunca UTC
export function toYmd(d: Date): string;
export function sumarDias(ymd: string, n: number): string;               // seguro ante DST
export function diasHasta(ymd?: string, now?: Date): number | null;
export function cuentaRegresiva(ymd?: string, now?: Date): string | null; // §9
export function fechaLarga(ymd?: string, now?: Date): string | null;      // «jueves 15 de octubre»
export function fechaCorta(ymd?: string): string | null;                  // «15 oct»
export function mesTitulo(mes: string): string;                           // "2026-10" → «Octubre 2026»
export function mesActual(now?: Date): string;                            // "YYYY-MM"
export function mesVecino(mes: string, delta: number): string;
export function mesGrid(mes: string): { ymd: string; enMes: boolean }[]; // semanas completas, empieza lunes (35 o 42 celdas)
export function grupoAgenda(ymd: string | undefined, now?: Date): "Hoy" | "Mañana" | "Esta semana" | "La que viene" | string; // mes «Noviembre» o «Sin fecha»
export function formatHora(hora?: string): string | null;                 // "18:00"
```
`src/lib/evaluaciones.ts` re-exporta `diasHasta`, `cuentaRegresiva` y `fechaLarga` desde `fechas.ts` (los usos viejos siguen compilando) y `evaluacionTipoLabel` suma «Recuperatorio» y «Otro». Tests: `diasHasta` con fechas locales, `mesGrid` de octubre 2026 (empieza el lunes 28 de septiembre), cruce de DST, `cuentaRegresiva` en 0/1/2/14/15 días y en pasado.

### 10.4 Funciones de servidor (las usan las páginas server; nadie llama a su propia API desde el server)

Desde `@/lib/db` (alias de `db-auth.ts`):
```ts
listEventos(opts: { desde?: string; hasta?: string; materiaId?: string; incluirSinFecha?: boolean }): Promise<EventoResumen[]>;
// orden: date asc, hora asc (NULL al final), created_at asc; sin fecha al final si incluirSinFecha; kind NULL → "examen"; una sola query con JOIN a materias y COUNT de temas.
```
Desde `@/lib/workspace-store`:
```ts
listApuntes(materiaId: string): Promise<ApunteItem[]>;     // materiales de cualquier kind (incluye 'examen') con lectura + artefactos; orden por fecha desc
getMateriasResumen(): Promise<MateriaResumen[]>;           // a lo sumo 3 queries, sin N+1
getMateriaIndice(materiaId: string): Promise<MateriaIndice>;
```
Cambios en existentes:
- `createNota(materiaId, { titulo, contenido })`: si `titulo` está vacío o es solo espacios → `Clase ${n}` con `n = cantidad de notas de la materia + 1`.
- `deleteMaterial(id)`: si `kind = 'examen'`, además `UPDATE examenes SET material_id = NULL, file_name = NULL, file_type = NULL, file_size = NULL, file_content_base64 = NULL WHERE id = exam_id`.
- `deleteExamen(id)`: conserva el archivo como apunte (`UPDATE materiales SET kind = NULL, exam_id = NULL WHERE exam_id = ?`) en lugar de borrarlo; borra temas y la fila.
- `saveArtefacto` admite crear un `documento` sin `sessionId`.

### 10.5 API (request/response exactos)

| Método y ruta | Request | Response |
|---|---|---|
| `GET /api/eventos?desde=YYYY-MM-DD&hasta=YYYY-MM-DD` (nuevo) | query obligatoria; regex `^\d{4}-\d{2}-\d{2}$`; rango ≤ 400 días | `200 EventoResumen[]` · `400 { error }` |
| `GET /api/materias/[id]/eventos?desde&hasta` (nuevo) | igual | `200 EventoResumen[]` · `404` |
| `GET /api/materias/[id]/apuntes` (nuevo) | — | `200 ApunteItem[]` |
| `GET /api/materias/[id]/indice` (nuevo) | — | `200 MateriaIndice` |
| `POST /api/materias/[id]/evaluaciones` (existe) | `{ kind: "examen"\|"entrega"\|"evento"; name: string; type?: ExamType; date?: string; hora?: string; description?: string; temas?: string[] }` | `201 ExamenEnPreparacion` · `400 { error: "Poné un nombre." }` · `400 { error: "La hora tiene que ser HH:MM." }` |
| `PATCH /api/examenes/[id]` (existe) | parcial: `{ kind?, type?, name?, date?, hora?, description?, note? }`; `hora: ""` o `date: ""` borra | `200 ExamenEnPreparacion` |
| `DELETE /api/examenes/[id]` (existe) | — | `200 { ok: true }` (archivo queda como apunte) |
| `POST /api/examenes/[id]/temas` (existe) | `{ name: string }` | `201 Tema` |
| `DELETE /api/temas/[id]` (existe) | — | `200 { success: true }` |
| `PATCH /api/temas/[id]` | **se borra** (era mastery) | — |
| `POST /api/materias/[id]/notas` (existe) | `{ titulo?: string; contenido?: string }`; vacío → «Clase N» | `201 Nota` |
| `PATCH /api/notas/[id]` (existe) | `{ titulo?: string; contenido?: string }` | `200 Nota` |
| `POST /api/materias/[id]/artefactos` (se agrega al route existente, que ya tiene GET) | `{ contenido: string; titulo?: string; sourceMessageId?: string }` | `201 ArtefactoCreado` · `400 { error: "No hay nada para guardar." }` · `413 { error: "Es demasiado largo para guardarlo." }` |

Reglas de `POST artefactos`: `tipo` siempre `"documento"`; el server quita los marcadores `[[artefacto:uuid]]` (`splitArtefactoMarkers`) y el comentario `<!-- ARQUIMES_CITATIONS: … -->`; tope `MAX_ARTEFACTO_CHARS = 200_000` en `src/lib/limits.ts`; `titulo` = el pedido, o el texto del primer heading `#`…`######`, o «Apunte del chat · 8 oct» (`fechaCorta(hoyYmd())`). Contenido vacío después de limpiar → 400.

`src/lib/evaluacion-input.ts` acepta `kind: "evento"`, `type: "recuperatorio"` y `hora` (`^([01]\d|2[0-3]):[0-5]\d$`, `""` = borrar, inválida → error de validación). Test en `src/lib/evaluacion-input.test.ts`.

### 10.6 Chat (A1: `src/lib/chat-service.ts`, `src/lib/study-chat.ts`)

- Reemplazar la línea «Norte del producto: ayudar a responder «¿Qué tan preparado estoy…»» por el rol: compañero de estudio que ayuda a organizar la cursada y explica usando el material del estudiante (clases, apuntes, eventos), sin inventar contenido que no está.
- En `ARTEFACTOS_CONTRACT`: quitar «en el nivel del examen que se prepara»; «Tema:» queda como etiqueta informativa (no mueve nada). Sumar: «Si el estudiante pide explícitamente guardar algo o desarrollar a fondo un tema, creá `<artefacto tipo="documento" titulo="Apunte: <tema>">`. No lo hagas en cada explicación.»
- `buildExamChunks` / `summarizeExamen`: sumar `HORA:` y el tipo «Otro» para `kind = evento` y «Recuperatorio». Los temas se listan solo por nombre (sin estados).
- Reescribir los fallbacks de `study-chat.ts` que dicen «no voy a decirte que estás preparado» (líneas ~347, 370, 380, 387, 415), por ejemplo: «Todavía no hay apuntes ni clases en ${materiaName}. No voy a inventar el contenido. Subí material en Apuntes o anotá una clase y preguntame de nuevo.»
- Actualizar `chat-service.test.ts` si alguna aserción depende de esas líneas; correr `npm run test:chat-grounding`, `test:artefactos`, `test:chat-markdown`, `test:chat-format`.

### 10.7 Retiro de mastery y preparación (dos pasos, tsc verde entre fases)

**Paso 1 — A1, Fase A:**
- Borrar rutas API: `src/app/api/materias/[id]/practica/route.ts`, `src/app/api/artefactos/[id]/resultado/route.ts`, `src/app/api/materias/[id]/preparacion/route.ts`, `src/app/api/materias/[id]/preparacion/plan/route.ts`, y el handler `PATCH` de `src/app/api/temas/[id]/route.ts` (el `DELETE` queda).
- En `db-auth.ts` borrar `applyPracticeOutcome`, `updateTemaMastery`, `updateMateriaPreparacion`, `saveMateriaPlanPreparacion` y el import de `nextMasteryFromPractice`. Dejar de leer `preparacion_json`.
- Borrar `src/lib/practice.ts` y `src/lib/preparacion-plan.ts`.
- Borrar los archivos legacy muertos `src/lib/db.ts`, `src/lib/file-store.ts`, `src/lib/chat-store.ts` (ningún módulo los importa: `tsconfig` aliasa `@/lib/db`, `file-store` y `chat-store` a los `*-auth`; pero `**/*.ts` los compila y `db.ts` importa `./practice`).
- **Dejar** `src/lib/mastery.ts`, `MASTERY_LABELS`, `MASTERY_ORDER`, `MasteryState` y `Tema.masteryState` con `/** @deprecated v2 */`, porque los usan archivos de otros paquetes: `(resumen)/page.tsx` (B4), la página movida `calendario/page.tsx` y `calendario/[eventoId]/page.tsx` (B2), `MateriasHubPage.tsx` (B4), `EvaluacionDetalle.tsx` (B2), `ExamenInteractivo.tsx` (B3).
- En `src/lib/artefactos.ts` se mantiene `normalizeTemaName` (lo usa `artefactos.test.ts`).
- Efecto aceptado entre A y B: `ExamenInteractivo` y `EvaluacionDetalle` llaman rutas borradas (`fetch`, no rompe tsc) y fallan en runtime hasta que B3/B2 los reescriben.

**Paso 2 — Fase C:** cuando `rg -n "calculatePreparation|MASTERY_|MasteryState|masteryState|PracticeOutcome|PlanPreparacion" src` matchee solo `src/lib/types.ts`, `src/lib/mastery.ts` y `src/lib/db-auth.ts`, borrar `mastery.ts`, los `MASTERY_*`, `MasteryState`, `PracticeOutcome`, `PlanPreparacion*`, `Materia.preparacion` y `Tema.masteryState` (y su mapeo en `db-auth.ts`).

### 10.8 Inventario de archivos con mastery/preparación (todos tienen dueño)

| Archivo | Dueño | Acción |
|---|---|---|
| `src/lib/mastery.ts`, `MASTERY_*`/`MasteryState`/`PracticeOutcome`/`PlanPreparacion*`/`Materia.preparacion` en `types.ts` | A1 (deprecar) → C (borrar) | §10.7 |
| `src/lib/practice.ts`, `src/lib/preparacion-plan.ts`, `src/lib/db.ts`, `file-store.ts`, `chat-store.ts` | A1 | borrar |
| `src/lib/db-auth.ts` | A1 | §10.7 paso 1 |
| `src/lib/chat-service.ts:68`, `src/lib/study-chat.ts` (fallbacks) | A1 | §10.6 |
| `src/lib/materia-snapshot.ts` (`hasPreparacionConfig`, `practicaVariant`, `ResumenVariant`) | B4 | quitar |
| `src/app/api/materias/[id]/practica`, `artefactos/[id]/resultado`, `materias/[id]/preparacion(/plan)`, `temas/[id]` PATCH | A1 | borrar |
| `src/app/materias/[id]/practica`, `preparacion` (páginas) | A2 | borrar carpeta (redirect) |
| `src/app/materias/[id]/(resumen)/page.tsx` | B4 | reescribir |
| `src/app/materias/[id]/examenes/page.tsx` → `calendario/page.tsx` | A2 mueve → B2 reescribe | |
| `src/components/MateriasHubPage.tsx` | B4 | reescribir |
| `src/components/workspace/EvaluacionDetalle.tsx` | B2 | reemplazar por `EventoDetalle` y borrar |
| `src/components/workspace/ExamenInteractivo.tsx` | B3 | solo puntaje |
| `src/app/layout.tsx` (metadata «¿Qué tan preparado estoy…») | A2 | nueva description (§9) |
| `docs/preparacion-plan-schema.md` | C | borrar |
| `.cursor/skills/verify-arquimes/bin/drive-practica(.mjs)`, `features/practica.md`, `features/preparacion.md`, `features/resumen.md`, `drive-chat-estudio.mjs` | C | borrar / actualizar |

---

## 11. Fuera de alcance

Compartir o comunidad (en cualquier forma, incluido «Próximamente»), docentes, % de preparación o dominio por tema, práctica que mueva estados, planificador de estudio, sincronización con Google Calendar, notificaciones, adjuntar archivos a un evento existente, editar generados con el editor, OCR nuevo, offline, migrar `middleware.ts` a `proxy.ts`, `staleTimes`/`cacheComponents`, landing de marketing.

---

## 12. Plan de construcción

### 12.0 Reglas para todos los agentes

1. **Un solo working tree compartido.** Cada agente toca solo los archivos que su paquete lista como propios. Lo que no está en tu lista no se toca, aunque «sea un cambio chiquito».
2. **Archivos compartidos con dueño único:** `src/lib/types.ts` → A1. `src/app/globals.css` → A2. `next.config.ts` → A2. `package.json` y `package-lock.json` → B1 (el **único** que corre `npm install`). `src/app/layout.tsx` → A2. `src/components/workspace/WorkspaceContext.tsx` → A2. `src/lib/routes.ts` → A2.
3. **Congelados en Fase B:** `src/lib/types.ts`, `src/app/globals.css`, `next.config.ts`, `src/components/workspace/WorkspaceContext.tsx`, `src/components/workspace/tabs-store.ts`, `src/lib/tabs.ts`, `src/lib/routes.ts`, `src/components/ui/**`, `src/app/api/**` y el resto de `src/lib/**` de A1. Si un agente B necesita un cambio ahí, **no lo hace**: lo escribe al final de su salida en una sección `## Pedidos para archivos congelados` (archivo, cambio exacto, motivo) y el orquestador lo aplica entre sub-fases o en C. Tipos locales de un paquete van en su carpeta (por ejemplo `src/components/calendar/types.ts`).
4. **CRLF:** varios archivos tienen CRLF en el working tree (`core.autocrlf=true`; `git ls-files --eol` muestra `w/crlf`): `src/lib/{types,chat-service,chat-service.test,study-chat,study-ingest,study-upload,apunte-upload,ai-ocr,ai-providers}.ts`, `src/app/layout.tsx`, `src/app/materias/[id]/apuntes/{ApuntesLibrary,page}.tsx`, `src/app/perfil/loading.tsx`, `src/components/{AppShell,AuthScreen,CompactChatComposer,LecturaEnCurso,MaterialViewer,MateriasHubPage,MateriasHubSkeleton,ProfileScreen,SubidasDeMateria,SubidasPanel}.tsx` y las rutas API `archivos/route.ts`, `archivos/[fileId]/releer`, `examenes/[id]/archivo`, `materiales/[id]`, `materias/[id]/examenes`, `materias/[id]/materiales` (y `/[materialId]/archivo`). **Editá archivos existentes solo con la herramienta Edit** (o Write para reescribirlos completos después de leerlos). Nada de `sed`, `perl`, PowerShell `-replace`, ni scripts de node/python con regex multilínea sobre archivos existentes; no normalicés finales de línea. Para mover usá `git mv`. Archivos nuevos en LF. Si escribís un heredoc en bash, no dupliques barras invertidas (`\\` queda literal dentro de `<<'EOF'`).
5. **Nadie corre `next dev` ni `next build`** (un único dev server por checkout, lo maneja el orquestador; `.next` tiene lock). Cada agente, al terminar: `npx tsc --noEmit` y `npx eslint <sus archivos>`; baseline actual: 0 errores, 3 warnings de `<img>`. Debe seguir en 0 errores (en Fase B, según la regla 11).
6. Reglas de lint del repo: nada de `setState` sincrónico dentro de un `useEffect` (usar `useSyncExternalStore`, derivar en render o setear en callbacks), nada de escribir refs durante el render, nada de leer `localStorage` durante el render salvo vía `useSyncExternalStore`.
7. Tests puros: `node --experimental-strip-types --test <archivo>`; imports relativos con `.ts`, sin alias `@/`, sin React.
8. Nadie toca `src/middleware.ts`, `src/lib/auth*.ts`, `src/app/api/auth/**`, `src/lib/upload-queue.ts`, `src/components/AuthScreen.tsx`, `src/components/ProfileScreen.tsx`.
9. Leé la guía relevante en `node_modules/next/dist/docs/` antes de usar una API de Next que no conozcas en su versión 16.
10. Salida final de cada agente: archivos tocados, checks corridos con su resultado, desvíos de la spec y `## Pedidos para archivos congelados` (puede estar vacía).
11. En Fase B, `npx tsc --noEmit` es global. Tu aceptación es 0 errores **en tus archivos**: `npx tsc --noEmit 2>&1 | rg "<tus rutas>"` vacío. Si ves errores en archivos ajenos, no los arreglás: los listás en tu salida final y el orquestador los resuelve al cerrar Fase B. El orquestador corre `npx tsc --noEmit` global cuando terminan B1–B4 y antes de Fase C.
12. **Contratos estables en Fase B** (el dueño puede cambiar la implementación, no el nombre ni las props):
    - `AppShell({ children }: { children: React.ReactNode })` (B4). Lo usan `MateriaWorkspace` (A2), `/calendario` (B2) y `/perfil`.
    - `ChatPanel()` sin props (B3). Lo renderiza `MateriaWorkspace` (A2).
    - `LecturaEnCurso()` sin props (B3). Lo renderiza `AppShell` (B4).
    - `ChatMarkdown({ children, className })` (B3). Lo usan `NotaEditor` (B1) y `EvaluacionDetalle` (B2).
    - `PedirAlChat({ texto, label, send })` (B3) y `NuevaNotaButtons({ materiaId, compact })` (B1). Los importa el `(resumen)/page.tsx` viejo (B4). Nadie los borra en Fase B; C los borra si quedan sin uso.
    - De `notas-client.ts` (B1): `crearNota(materiaId: string, input?: { titulo?: string; contenido?: string }): Promise<Nota>`, `descargarMarkdown(nombre: string, contenido: string): void` y `relativo(iso: string): string`. Los usan `ArtefactoViewer` (B3), `Launcher` (A2) y el inicio (B4).
    - De `materia-snapshot.ts` (B4): `useRememberMateria(id, patch)`, `RememberMaterias`, `useMateriaSnapshots`, `HUB_KEY` y los campos `name`, `info` y `materialesCount` de `MateriaSnapshot`. Los usan `MateriaWorkspace` (A2) y `ApuntesLibrary` (B3).
    - `WorkspaceValue` (A2): no se quita ni se renombra ningún miembro existente (`closeChat`, `toggleChat`, `mobileChatOpen`, `askChat`, `registerAsk`, `refreshToken`, `bumpRefresh`, `focusEnabled`, …). Solo gana `openChat(opts?)` y `registerComposerFocus`.
    - `MarkdownEditor` / `MarkdownEditorProps` con la API de §4.3 (stub o real).

### 12.1 Fase 0.5 (hecha por el editor de la spec)

`AGENTS.md` reescrito y alineado con esta spec (sin preparación, mastery ni práctica; bloque de Next intacto).

### Fase A (A1 y A2 en paralelo)

#### A1 — Datos, API y chat

**Es dueño de:**
- `src/lib/**` **excepto**: `routes.ts`, `tabs.ts`, `tabs.test.ts`, `materia-tone.ts`, `material-viewer.ts` (A2); `editor-markdown.ts`, `editor-markdown.test.ts`, `notas-client.ts` (B1); `materia-snapshot.ts` (B4); `upload-queue.ts`, `auth.ts`, `auth-client.ts`, `auth-session.ts` (nadie).
- Nuevos: `src/lib/fechas.ts`, `src/lib/fechas.test.ts`, `src/lib/evaluacion-input.test.ts`.
- `src/app/api/**` excepto `src/app/api/auth/**`.

**No toca:** nada en `src/app/**` fuera de `api`, nada en `src/components/**`, `package.json`, `next.config.ts`, `globals.css`.

**Consume:** nada de otros paquetes.

**Entregables (en este orden):**
1. Primer commit lógico: todos los tipos de §10.1 en `types.ts` + deprecaciones. (A2 y B dependen de esto.)
2. `fechas.ts` + test; `evaluaciones.ts` re-exporta.
3. Migración `hora` (§10.2), `evaluacion-input.ts` + test.
4. `listEventos`, `listApuntes`, `getMateriasResumen`, `getMateriaIndice`, cambios en `createNota`, `deleteMaterial`, `deleteExamen`, `saveArtefacto` (§10.4).
5. Endpoints de §10.5 (nuevos y modificados), `MAX_ARTEFACTO_CHARS`.
6. Paso 1 del retiro de mastery (§10.7) y borrado de legacy.
7. Cambios de chat (§10.6).

**Aceptación:**
- `npx tsc --noEmit` 0 errores; `npx eslint src/lib src/app/api` 0 errores.
- `node --experimental-strip-types --test src/lib/fechas.test.ts src/lib/evaluacion-input.test.ts` verde; `npm run test:chat-grounding`, `test:artefactos`, `test:chat-markdown`, `test:chat-format` verdes.
- `rg -n "applyPracticeOutcome|updateTemaMastery|calculatePreparation|preparado" src/lib src/app/api` vacío (salvo `mastery.ts` deprecado).
- `rg -n "kind.*evento" src/lib/evaluacion-input.ts` y `rg -n "hora" src/lib/db-auth.ts` con resultados en SELECT, INSERT, `toExamen` y `updateEvaluacion`.

#### A2 — Shell, pestañas, primitivas, rutas

**Es dueño de:**
- `src/app/globals.css`, `src/app/layout.tsx`, `next.config.ts`.
- `src/components/ui/**` (nuevo), `src/components/Skeleton.tsx`; borra `src/components/Button.tsx`, `src/components/Input.tsx`, `src/components/ExamenForm.tsx`, `src/components/workspace/DocumentStrip.tsx`.
- `src/components/workspace/{MateriaWorkspace,WorkspaceContext,TabBar,TabLink,Launcher,tabs-store}.*` (+ cualquier `TabBar*`/`Launcher*` nuevo en esa carpeta).
- `src/lib/routes.ts`, `src/lib/tabs.ts`, `src/lib/tabs.test.ts`, `src/lib/materia-tone.ts`, `src/lib/material-viewer.ts`.
- `src/app/materias/[id]/{layout,loading,not-found,error}.tsx`, `src/app/materias/[id]/nueva/**`.
- **Solo durante Fase A**, los movimientos mecánicos (con `git mv`) y su ajuste mínimo para que compilen: `notas/` → `clases/`; `generados/[artefactoId]/` → `apuntes/generado/[artefactoId]/`; `materiales/[materialId]/` → `apuntes/archivo/[materialId]/`; `examenes/page.tsx` → `calendario/page.tsx`; `examenes/[examId]/` → `calendario/[eventoId]/` (renombrar el param). En esos archivos solo: imports, quitar `DocumentStrip`, params, y hrefs a `rutas.*`. El contenido se mantiene; en Fase B cada dueño los reescribe donde quedaron.
- Borra: `src/app/materias/[id]/{chat,inicio,practica,preparacion,cargar,examen,generados,examenes/nuevo}/`, `src/app/materias/chats/`, `src/app/materias/(lista)/` (las carpetas `notas`, `materiales`, `examenes` quedan vacías tras los `git mv` y se eliminan).
- Stub `src/components/editor/MarkdownEditor.tsx` + `src/components/editor/index.ts` con la API fija de §4.3 (un `<textarea>` client con `defaultValue`/`onChange`), para que B2 compile antes de que llegue B1. B1 los reemplaza.
- `.cursor/skills/verify-arquimes/bin/drive-pestanas.mjs` (nuevo).

**No toca:** `src/lib/types.ts` (pide tipos a A1 vía §10.1: ya están todos), `src/app/api/**`, `Sidebar.tsx`, `AppShell.tsx`, `ChatPanel.tsx`, `package.json`.

**Consume:** de A1 solo los tipos de §10.1 (si A1 aún no los subió, A2 usa los suyos de `tabs.ts` y no depende de otros) y `GET /api/materias/[id]/indice` para el lanzador (llamada `fetch`, no rompe tsc si todavía no existe); de B nada. Usa `crearNota` de `src/lib/notas-client.ts` con su firma actual (`{ titulo: "" }`) y `enqueueUploads` de `upload-queue.ts`.

**Entregables:**
1. `routes.ts` (primer commit), `tabs.ts` + `tabs.test.ts` (open, reemplazo de nueva, inserción tras la activa, background/unread, cierre con vecina derecha/izquierda/inicio, tope de 30, `tabKindFromPath` con todas las rutas y con rutas ajenas).
2. Tokens, utilidades tipográficas, foco global y borrado de `--tabs-pill-bg`/`.t-tabs-pill` en `globals.css` (§8.1–8.3).
3. Primitivas de §8.6 con `Icon` completo, `Toaster` montado en `src/app/layout.tsx`, nueva metadata description.
4. `tabs-store.ts`, `TabBar` (desktop + mobile 44px), `TabLink`, `Launcher` (pestaña + Ctrl+K), atajos de §2.11, `TabMeta`, `FocusRegister` extendido, `openChat({ focusComposer })`, `registerComposerFocus`.
5. `MateriaWorkspace` nuevo layout (§2.6): sin header de 56px ni `SECTIONS`, chat 380/320/560, mínimo de contenido 560 con `ResizeObserver`, drawer superpuesto.
6. `not-found.tsx` (cierra la pestaña + toast por tipo), `error.tsx` («Algo salió mal. Reintentar»), `loading.tsx`.
7. `next.config.ts` con los redirects de §2.4; movimientos y borrados de carpetas; `materialViewerRoute` → `rutas.archivo`.
8. `materia-tone.ts`.
9. Stub del editor.

**Aceptación:**
- `npx tsc --noEmit` 0 errores; `npx eslint` de sus archivos 0 errores (en especial `react-hooks/set-state-in-effect` y refs en render).
- `node --experimental-strip-types --test src/lib/tabs.test.ts` verde.
- `rg -n "DocumentStrip|SECTIONS|tabs-pill|components/Button|components/Input|ExamenForm" src` vacío.
- `rg -n "/materias/\$\{[^}]+\}/(notas|generados|materiales|examenes)" src --glob "!src/app/api/**"` vacío en sus archivos.
- Al cerrar Fase A el orquestador para el dev server, corre `npx next typegen && npx tsc --noEmit && npm run build` (verde obligatorio), lo vuelve a levantar y navega las páginas movidas y 3 redirects de §2.4.

### Fase B (B1–B4 en paralelo, después de A)

#### B1 — Editor y clases

**Es dueño de:** `src/components/editor/**` (reemplaza el stub), `src/lib/editor-markdown.ts`, `src/lib/editor-markdown.test.ts`, `src/lib/notas-client.ts`, `src/app/materias/[id]/clases/**`, `src/components/workspace/{NotaEditor,NuevaNotaButtons}.tsx`, `package.json`, `package-lock.json`, `.cursor/skills/verify-arquimes/bin/drive-clase-editor.mjs` (nuevo).

**No toca:** `globals.css` (los estilos del editor van en `markdown-editor.css`), `types.ts`, `WorkspaceContext.tsx`, `src/components/ui/**`, páginas de otros.

**Consume:** `rutas.*`; `useTabs().close`, `FocusRegister`, `useWorkspace().askChat`; primitivas `Button`, `IconButton`, `Menu`, `ConfirmDialog`, `EmptyState`, `TabLink`; `fechaLarga`, `fechaCorta` de `fechas.ts`; `listNotas`/`getNota` de `@/lib/workspace-store`; `POST /api/materias/[id]/notas` (vacío → «Clase N»), `PATCH`/`DELETE /api/notas/[id]`.

**Entregables:** §4 completo (paquetes, wrapper, impl, config, CSS, normalizador, guardado, fallback si hace falta), §5 completo, `package.json` con `@milkdown/crepe` y `@milkdown/kit` en `7.22.2` exacto y el script `"test": "node --experimental-strip-types --test src/lib/*.test.ts"`.

**Aceptación:** tsc y eslint 0 errores; `node --experimental-strip-types --test src/lib/editor-markdown.test.ts` verde; `require.resolve` de los CSS de Crepe; `rg -n "Escribir|Leer|FORMATOS" src/components/workspace/NotaEditor.tsx` vacío; `drive-clase-editor.mjs` escrito (lo corre C); el `MarkdownEditor` exporta exactamente la API de §4.3.

#### B2 — Calendario y eventos

**Es dueño de:** `src/components/calendar/**`, `src/app/calendario/**`, `src/app/materias/[id]/calendario/**`, `src/components/workspace/{EvaluacionForm,EvaluacionDetalle}.tsx` (los reemplaza y puede borrarlos), `.cursor/skills/verify-arquimes/bin/drive-calendario.mjs` (nuevo).

**No toca:** `src/components/editor/**` (usa `@/components/editor` tal como está; en Fase B es el stub o ya el de B1, misma API), `types.ts`, `globals.css`, API.

**Consume:** `EventoResumen`, `Evento`, `ExamType`, `EvaluacionKind`; `listEventos`, `getExamen`, `getTemas`, `getMaterias`, `getMateria` de `@/lib/db`; `fechas.ts` completo; `materiaTone`; `rutas.calendario/evento/archivo`; `MarkdownEditor`; `useOptionalWorkspace`, `useTabs().close`, `FocusRegister`, `TabMeta`, `TabLink`; primitivas `Popover`, `SegmentedControl`, `Pill`, `Button`, `IconButton`, `Input`, `ConfirmDialog`, `EmptyState`, `Menu`, `toast`; endpoints `POST evaluaciones`, `PATCH/DELETE /api/examenes/[id]`, `POST /api/examenes/[id]/temas`, `DELETE /api/temas/[id]`.

**Entregables:** §6 completo; calendario global con `AppShell`; página de evento con descripción autoguardada; mobile (agenda + `WeekStrip` + hoja inferior).

**Aceptación:** tsc y eslint 0 errores; `rg -n "MASTERY_|masteryState|new Date\(\"" src/components/calendar src/app/calendario "src/app/materias/[id]/calendario"` vacío; `rg -n "useSearchParams" src/components/calendar` vacío; `drive-calendario.mjs` escrito (crear evento con hora en una materia y verlo en `/calendario`).

#### B3 — Apuntes y chat

**Es dueño de:** `src/app/materias/[id]/apuntes/**` (incluye `ApuntesLibrary.tsx`, `archivo/**`, `generado/**`), `src/components/workspace/{ArtefactoViewer,ExamenInteractivo,ChatPanel,PedirAlChat}.tsx`, `src/components/{MaterialViewer,SubidasDeMateria,LecturaEnCurso,CompactChatComposer,ChatMarkdown,MateriaLayout}.tsx` (borra `MateriaLayout.tsx` cuando quede sin imports), `.cursor/skills/verify-arquimes/bin/drive-apuntes-chat.mjs` (nuevo).

**No toca:** `src/lib/**` (el prompt es de A1), `MateriaWorkspace.tsx`, `WorkspaceContext.tsx`, `types.ts`, `globals.css`.

**Consume:** `ApunteItem`, `ArtefactoCreado`; `listApuntes`, `getArtefacto`, `listArtefactoVersiones` de `@/lib/workspace-store`; `getMaterial` de `@/lib/db`; `rutas.apuntes/archivo/generado/clase`; `useTabs().close/openInBackground`, `registerComposerFocus`, `FocusRegister`, `TabMeta`, `TabLink`; `enqueueUploads`, `usePendingUploads`, `onUploadComplete`; primitivas; `toast`; endpoints `GET /api/materias/[id]/apuntes`, `POST /api/materias/[id]/artefactos`, `DELETE /api/materiales/[id]`, `DELETE /api/artefactos/[id]`.

**Entregables:** §7 completo y §2.13 (header de 40px, artefactos en pestaña o segundo plano, «Guardar en apuntes», «Copiar» como Markdown crudo, registro del foco del composer, citas con `TabLink`). Sin `/generados/` ni `router.push` a rutas viejas.

**Aceptación:** tsc y eslint 0 errores; `rg -n "Guardar en mi preparación|/resultado|/generados/|hover:border-accent|text-\[10px\]|MateriaLayout" src/components/workspace src/components/MaterialViewer.tsx "src/app/materias/[id]/apuntes"` vacío; `drive-apuntes-chat.mjs` escrito («Guardar en apuntes» con `mock-openai.mjs` y verlo en Apuntes › Del chat; subir un PDF y verlo en la lista).

#### B4 — Inicios, sidebar y copy

**Es dueño de:** `src/app/(inicio)/**`, `src/app/materias/nueva/**`, `src/app/materias/[id]/(resumen)/**`, `src/components/{Sidebar,AppShell,MateriasHubPage,MateriasHubSkeleton,SubidasPanel}.tsx` (puede crear componentes nuevos en `src/components/home/**`), `src/lib/materia-snapshot.ts`, `public/brand/**`, `ROADMAP.md`, `README.md` (solo copy de producto).

**No toca:** `AGENTS.md` (ya está hecho), `src/app/layout.tsx` (A2), `MateriaWorkspace.tsx`, `TabBar.tsx`, `types.ts`, `globals.css`, API.

**Consume:** `MateriaResumen`, `EventoResumen`, `ApunteItem`; `getMateriasResumen`, `listApuntes`, `listNotas` de `@/lib/workspace-store`; `listEventos`, `getExamenes`, `getMateria`, `getMaterias` de `@/lib/db`; `getServerSession` de `@/lib/auth-session` (nombre para el saludo); `fechas.ts`; `materiaTone`; `rutas.*`; `useRecientes`, `forgetTabs`, `openChat({ focusComposer: true })`, `TabMeta`, `TabLink`; `crearNota`; `enqueueUploads`; primitivas.

**Entregables:**
1. Sidebar y AppShell (§2.5): sin «Archivos», árbol de la materia activa, riel de 56px con la regla de preferencia, drawer mobile, sin `shadow-[inset_2px_0_0_var(--accent)]`.
2. Inicio global `/` (ancho máximo 960):
   - Saludo `.t-greeting`: «Buen día, <nombre>» (antes de las 13), «Buenas tardes, <nombre>» (13 a 20), «Buenas noches, <nombre>» (después), en hora de `ZONA`. Debajo la fecha en mono 11 minúscula: «jueves 8 de octubre».
   - «Seguir donde dejaste» (isla cliente con `useRecientes()`): hasta 4 documentos con ícono, título y nombre de la materia muted; abren `href`. Oculta si no hay.
   - «Se viene»: `listEventos` de hoy a +13 días, agrupado «Esta semana» / «La que viene»; filas con punto de color de la materia, nombre, materia y «en N días». Vacío: «Nada en los próximos 14 días.» + link «Cargar una fecha» (→ `/calendario`).
   - «Materias»: grilla `repeat(auto-fill, minmax(260px, 1fr))`, gap 12, tarjetas de 120px `rounded-lg`: nombre serif 22, cátedra en mono 11, al pie «Próximo: Primer parcial · 4 clases» (o «Sin fechas · 4 clases»). Última tarjeta: «Nueva materia» fantasma.
   - Vacío (sin materias): composición centrada (ancho máximo 440, a 20vh): marca 96px opacidad .5, título serif 28 «Empezá por tu primera materia», línea muted «Cada materia guarda tus clases, apuntes y fechas.» y botón primario lg «Crear materia».
3. `/materias/nueva`: formulario con Nombre (obligatorio), Cátedra y Facultad opcionales, botón «Crear materia»; **sin** «Unirme a una materia», sin «Próximamente». Al crear navega a `rutas.materia(id)`.
4. Inicio de materia (§3), reescrito completo.
5. Borrar materia (donde ya exista la acción): `ConfirmDialog` + `forgetTabs(materiaId)`.
6. `materia-snapshot.ts` sin variantes de preparación; `ROADMAP.md` y `README.md` con la nueva idea central.

**Aceptación:** tsc y eslint 0 errores; `rg -n "preparad|Próximamente|Unirme|MASTERY|calculatePreparation|Tus materias" "src/app/(inicio)" src/app/materias/nueva "src/app/materias/[id]/(resumen)" src/components/Sidebar.tsx src/components/MateriasHubPage.tsx src/lib/materia-snapshot.ts` vacío; `rg -n "/archivos" src/components/Sidebar.tsx` vacío.

### Fase C — Integración, e2e y crítica visual (un agente, después de B)

**Es dueño de:** todo el árbol para correcciones de integración, en especial `.cursor/skills/verify-arquimes/**`, `docs/**` (salvo esta spec, que solo se toca para registrar desvíos aprobados), el paso 2 de §10.7 y los pedidos de archivos congelados pendientes.

**Pasos:**
1. Aplicar los `## Pedidos para archivos congelados` de B1–B4.
2. `npm install` (si B1 cambió el lock), `npx next typegen && npx tsc --noEmit`, `npm run lint`, `npm test` y los `test:*` existentes, `npm run build`. Si el build falla por Crepe (CSS o Vue), aplicar el fallback de §4.10.
3. Paso 2 del retiro de mastery (§10.7) y borrar `docs/preparacion-plan-schema.md`.
4. Redirects: con el dev server corriendo, `curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" "http://localhost:3000<url>"` para cada fila de §2.4 (y una con query, por ejemplo `/materias/X/notas?a=1`): esperado `307` y destino exacto con la query preservada.
5. Grep gates (deben dar vacío):
   - `rg -n "preparaci[oó]n estimada|Guardar en mi preparación|Próximamente|Unirme|calculatePreparation|applyPracticeOutcome|MASTERY_|masteryState|¿Qué tan preparado" src`
   - `rg -n "/(notas|generados|materiales|examenes)/" src --glob "!src/app/api/**" | rg -v "/api/"`
   - `rg -n "hover:border-accent|hover:text-accent|text-\[10px\]|JSX\.Element" src`
   - `rg -n -i "comunidad|compartir|invitar|unite" src` (revisar cada match a mano: no puede quedar ninguna superficie de UI ni copy de compartir)
6. e2e (`.cursor/skills/verify-arquimes`): borrar `drive-practica`, `drive-practica.mjs`, `features/practica.md`, `features/preparacion.md`; actualizar `features/resumen.md`; en `drive-cargar-examen.mjs` y `drive-chat-estudio.mjs` cambiar `waitForURL` de `/examenes` a `/calendario`; en `launch` cambiar el chequeo que espera «Tus materias» en `/` por el copy nuevo («Empezá por tu primera materia» o el saludo). Correr los `drive-*.mjs` nuevos de A2/B1/B2/B3 con `mock-openai.mjs`. Flujos mínimos: crear materia; crear clase, editar con autoguardado y recargar; abrir 3 pestañas, recargar y verlas restauradas; cerrar la activa y que se active la vecina; Ctrl+K y «Preguntarle al chat»; crear evento con hora y verlo en `/calendario`; subir un PDF y preguntarle al chat algo que el PDF responde; «Guardar en apuntes» y verlo en Apuntes › Del chat; examen generado que corrige y muestra puntaje. En Windows, `launch` y `doctor` usan `lsof` y `/proc`: levantar el server a mano y correr solo los `drive-*.mjs` con `node`.
7. Crítica visual con capturas a **1440** y **390** px de ancho (y 1280 con chat abierto), cada pantalla vacía y con datos: inicio global, inicio de materia, clase, apuntes, calendario (mes y agenda), evento, lanzador, overflow de pestañas, mobile con selector de pestañas. Chequear contra §8: radios por escala, hover por capas, acento solo en primaria/foco/hoy, mínimo 11px, sin bordes amarillos en hover, alineación de la línea de 40px entre chat y pestañas. Corregir y volver a capturar.

**Aceptación final (criterios de éxito):** un desconocido puede crear una materia, empezar una clase y escribir con fórmulas que se guardan, subir un PDF, cargar un parcial con fecha y hora y verlo en el calendario de la materia y en el global, preguntarle al chat algo que el PDF responde y recibir una respuesta que lo usa, guardar esa respuesta en Apuntes, y moverse entre todo eso con pestañas que sobreviven a una recarga. No existe ninguna superficie de preparación, dominio, práctica ni comunidad. La identidad es oscura y editorial, más suave (radios 8/12/16, hovers por capas) y usa la marca de Arquímedes.
