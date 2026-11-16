# Vibe-log 04 · Fase 3: base del frontend (2026-11-16)

## Prompt
> "npm de AppData\Roaming borrado, podemos seguir con la fase 3"

## 1. Decisiones antes de programar
| Situación | Decisión |
|-----------|----------|
| La spec y `CLAUDE.md` decían **React 18**; la versión estable es la 19.3 | La IA **paró y preguntó** (las specs mandan). Aprobado React 19 → spec 05, `CLAUDE.md` y ADR-010 actualizados en el mismo commit |
| React Router 8 es una versión mayor reciente | Antes de escribir código se comprobaron sus exports reales (`createBrowserRouter`, `RouterProvider`, `useSearchParams`…) en lugar de suponer la API de la v7 |
| Faltaban los esquemas de las respuestas en forma de lista (`{ items }`) | Se añaden a `shared` (son parte del contrato), no al front |

## 2. Problemas de entorno
| Problema | Decisión |
|----------|----------|
| npm 11 **bloquea los scripts de instalación** no aprobados. `better-sqlite3` necesita el suyo para su binario nativo → en una instalación limpia (la del evaluador) la API no arrancaría | `npm install-scripts approve better-sqlite3 esbuild` → queda versionado en `package.json` (`allowScripts`). Solo se aprueban los dos paquetes que lo necesitan |
| El primer `npm install -w @saas/web` no hizo nada ("no workspace folder present"): el workspace aún no estaba enlazado | Se detectó al revisar la salida (no se dio por bueno el "added 1 package") y se repitió la instalación |

## 3. Implementación
- `api/http.ts`: cliente tipado que **valida cada respuesta** con el esquema de `shared`. Distingue `NETWORK_ERROR` (incluido el 502 del proxy cuando la API está caída), los errores del contrato e `INVALID_RESPONSE`.
- Los mensajes de la API son técnicos y en inglés; el front los traduce **por código** (`describeError`). Así el i18n vive en el front.
- `queryClient`: no reintenta los 4xx (un 404 nunca va a funcionar), solo los fallos transitorios.
- Buscador: debounce de 300 ms, `?q=` en la URL (sobrevive a recargas y al botón atrás), `keepPreviousData` para que no parpadee, skeleton, error con reintento y dos estados vacíos distintos.
- Alta: **mismo esquema Zod que la API** → el formulario nunca acepta lo que el servidor rechazaría. Confirmación en vivo del tipo detectado ("NIE válido"), el 409 y los errores de validación de la API se asignan a su campo y se limpian al editarlo. Se envía la entrada en bruto: la normalización es autoridad del servidor.
- Accesibilidad: `label`/`aria-invalid`/`aria-describedby` cableados por el componente `Field`, `role="alert"` en los errores, `prefers-reduced-motion` y modo oscuro por `prefers-color-scheme`.
- Detalle (parte de la fase 3): card con los datos del cliente, 404 → "Cliente no encontrado" sin reintentos, id mal formado → ni siquiera llama a la API.

## 4. Revisión del código generado
| Hallazgo | Acción |
|----------|--------|
| El hint del país calculaba el IVA con `bp / 100` a mano | Se cambia a `formatBasisPoints` (formato es-ES, ya existía) |
| `es-ES` no agrupa los números de 4 cifras ("1000 GB" frente a "10.000 llamadas"): inconsistente en la UI | `useGrouping: 'always'` (requiere `lib: ES2023`, comentado) + test que comprueba "1.000 GB" |
| Riesgo de bucle de navegación al sincronizar `?q=` (`setSearchParams` cambia de identidad) | Solo se escribe en la URL si el valor difiere |

## 5. Verificación
- 19 tests de front (cliente HTTP, buscador, alta, detalle). Destaca el test que comprueba que el debounce hace **una** petición por palabra y no una por tecla.
- `vite build` correcto (140 kB gzip).
- Servidores reales: SPA, enlace directo `/customers/2` → 200, y el proxy `/api` llega a la API (búsqueda y 400 de NIF).

## Resultado
`npm test` → **152 tests** (95 shared + 38 API + 19 web). `typecheck` limpio. `npm audit` → 0.
