# CLAUDE.md · Reglas para la IA en este repositorio

## Fuente de verdad
- Las specs en `ai-workspace/specs/` mandan. Si el código y la spec no coinciden, **para y pregunta**; no "arregles" la spec en silencio.
- Antes de cada feature, lee la spec correspondiente y `ai-workspace/architecture/01-structure.md`.

## Stack (no añadir dependencias sin pedir permiso y justificarlo)
npm workspaces · TypeScript strict · Fastify · Zod · better-sqlite3 · React 19 + Vite · TanStack Query · React Router · Vitest.

## Arquitectura
- Dominio puro en `packages/shared` (sin I/O). El backend y el front lo importan; **nunca** dupliques la lógica de precios ni la validación de NIF.
- Backend por módulos: `*.routes.ts` → `*.service.ts` → `*.repository.ts`. SQL solo en repositorios y siempre parametrizado.
- Errores de dominio tipados; un único error-handler los traduce al formato de error de la spec 03.
- Front por features (`features/<feature>/`). Los componentes no hacen `fetch` directo ni cálculos de negocio: usan hooks y `shared`.

## Reglas de código
- Dinero = **céntimos enteros de EUR**. IVA = puntos básicos. La conversión de divisa solo se aplica al mostrar.
- Prohibido `any`. Evita `as` y `!`; si hacen falta, comenta por qué.
- Ficheros de ~200 líneas como máximo y funciones de ~40 como máximo. Si se pasan, divide.
- Nombres y código en inglés; textos de UI y docs en español.
- Toda entrada externa (body HTTP, respuesta de la API de divisas, env) se valida con Zod.
- No dejes TODOs, código muerto ni `console.log`.

## Tests
- `shared`: TDD. Los tests van antes que la implementación y cubren los ejemplos y vectores de las specs.
- API: tests de integración con `app.inject()` y SQLite `:memory:`.
- Cualquier bug encontrado requiere un test que lo reproduzca antes de corregirlo.

## Forma de trabajar
- Una feature por iteración, con el alcance de ficheros acotado.
- Al terminar: lista de ficheros cambiados, cómo verificarlo y resultado de `npm test`.
- Si la spec es ambigua o la tarea exige salirse del alcance: **pregunta**.
