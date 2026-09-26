## Transiciones aplicadas (free)

Referencia: snippets free de `transitions-dev` (`npx transitions-dev add --free`).

- **Error state shake** (`error-state-shake`): auth (`AuthScreen`) en campos inválidos y mensaje de error general.
- **Tabs sliding** (`tabs-sliding`): barra de tabs en `MateriaLayout` (Resumen | Apuntes | Chat | Preparación) con indicador deslizante.
- **Toast open** (`toast`): feedback visible en errores/notices de auth, preparación y carga de archivos en chat.
- **Skeleton + reveal** (`skeleton-reveal`): estado de carga de conversación en `StudyChatWorkspace`.
- **Success check / spinner** (`success-check`): feedback de guardado/subida en `PreparacionClient` y `CompactChatComposer`.

Todo está namespaced en clases `t-*` y queda amortiguado por `prefers-reduced-motion`.
