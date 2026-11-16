# Vibe-log 05 · Quality gates y CI (2026-11-16)

## Prompt (iniciativa mía, antes de la fase 4)
> "Antes de seguir, yo añadiría controles de calidad y CI/CD. ¿Está la opción de hacer estos tests cada vez que se hace un commit en el repo en GitHub? ¿Nos sirve para este proyecto o habría tests que no se pueden hacer?"

## Análisis previo de la IA
- **Todo lo que tenemos puede correr en CI**: shared es puro, la API usa SQLite `:memory:` con `inject()` y el front usa jsdom con `fetch` simulado. No es casualidad: viene de la factoría `buildApp(deps)` y de la BD en memoria.
- **Lo que no se mete en CI**: la API real de divisas (sería frágil; se simulará en la fase 5) y la revisión visual. E2E con Playwright es posible, pero se aplaza.
- **CD**: aporta poco aquí (evaluación en local; SQLite necesita disco persistente).

## Decisión mía
ESLint + Prettier + cobertura mínima (Playwright se aplaza). La IA preguntó porque `CLAUDE.md` exige aprobación para añadir dependencias.

## Lo que encontraron las herramientas nuevas (y el typecheck no)
| Herramienta | Hallazgo | Acción |
|-------------|----------|--------|
| ESLint | `JSON.parse()` metía un `any` silencioso en el repositorio de simulaciones | `as unknown` explícito (luego lo valida Zod) |
| ESLint | `navigate()` (React Router 8) devuelve una Promise que quedaba flotando en `NewCustomerPage` | `void navigate(...)` |
| ESLint | El mock de `fetch` haría `String(Request)` → `"[object Request]"` | Distinguir `Request`, `URL` y `string` |
| ESLint | Handlers `async` sin `await` en Fastify | Handlers síncronos con `reply.send()` (better-sqlite3 es síncrono) |
| Cobertura | **La ruta del 500 no tenía test**: nadie garantizaba que un error inesperado no filtrara detalles internos | Test: el error interno "SQLITE secret…" no aparece en la respuesta |
| Cobertura | `config.ts` al 0 %: nada comprobaba que un env inválido haga fallar el arranque | Tests de valores por defecto, coerción y *fail fast* |
| `npm run check` | Los nuevos `vitest.config.ts` no estaban en ningún `tsconfig` → ni lint ni typecheck los veían | Añadidos al `include` |

Lo que **no** se hizo: tests artificiales para ramas defensivas que nunca se alcanzan (`PricingInputError` después de Zod). Los umbrales se fijaron tras medir, con margen, y no "al 100 %".

## Incidencia de supply chain
`typescript-eslint@8.72.2` (la última) trae `minimatch@10.2.6` (ReDoS moderado, solo parcheado en la 11.x). El "fix" que proponía npm era **bajar** a typescript-eslint 8.36, lo que no tiene sentido.
- Se añadió un `overrides` acotado a `typescript-estree` → `minimatch@^11.0.8`.
- npm conservaba la versión antigua por el lockfile: se eliminó **solo esa entrada** (sin regenerar el lockfile entero, para no mover otras 300 dependencias).
- Se verificó que ESLint funciona con la 11 → `npm audit`: 0. Documentado en ADR-011 con la nota "quitar cuando se actualice".

## Resultado
- `npm run check` → OK (format, lint, types, 159 tests con cobertura y build).
- Cobertura: shared 96 % líneas / 100 % ramas; API 97 % / 87 %; web 96 % (informativa).
- `.github/workflows/ci.yml`: job de calidad y matriz de tests con Ubuntu Node 22, Ubuntu Node 26 y Windows Node 26.
