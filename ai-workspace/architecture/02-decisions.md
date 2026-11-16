# Arquitectura · Registro de decisiones (ADR)

Formato corto: contexto → decisión → alternativas descartadas → consecuencias.

## ADR-001 · Monorepo TypeScript con paquete compartido
- **Contexto**: el simulador debe recalcular en tiempo real (front), pero el cálculo persistido es responsabilidad del backend.
- **Decisión**: npm workspaces con `packages/shared` que contiene pricing, validación fiscal, catálogos y esquemas Zod.
- **Descartado**: Python en el backend (duplicaría la lógica en TS, o obligaría a hacer una llamada de red por cada movimiento del slider); un endpoint `/preview` (latencia y carga innecesarias).
- **Consecuencias**: una única implementación testeada. El backend sigue siendo la autoridad porque recalcula siempre.

## ADR-002 · Dinero en céntimos enteros e IVA en puntos básicos
- **Decisión**: `number` entero para céntimos (con un máximo teórico de unos 5·10⁹, muy por debajo de `MAX_SAFE_INTEGER`) y redondeo half-up con aritmética entera.
- **Descartado**: `float` (errores de redondeo); `decimal.js` (dependencia innecesaria para este rango).

## ADR-003 · Fastify + Zod + better-sqlite3 sin ORM
- **Decisión**: Fastify (rápido, `inject()` para tests sin abrir puertos, logger integrado), Zod (esquemas compartidos con el front) y better-sqlite3 (síncrono, sencillo y con prebuilds para Windows).
- **Descartado**: Express (más boilerplate para validación y errores); Prisma/TypeORM (demasiado peso para 2 tablas y ocultan el SQL que queremos enseñar); `node:sqlite` (requiere Node ≥ 22.5).

## ADR-004 · Snapshot de tarificación en cada simulación
- **Decisión**: persistir el desglose, el IVA, el plan, el país y `pricingVersion`.
- **Consecuencias**: el historial es inmutable y auditable. Ocupa algo más de espacio (despreciable).

## ADR-005 · TanStack Query para el estado del servidor
- **Decisión**: TanStack Query para la API propia y la de divisas. El estado de UI (divisa seleccionada) vive en un Context.
- **Descartado**: Redux/Zustand (no hay estado global complejo); `useEffect` + `fetch` a mano (reinventar caché, reintentos y estados).

## ADR-006 · Proxy de Vite en desarrollo
- **Decisión**: el front llama a `/api/*`, que Vite reenvía a `localhost:3000`. CORS restringido igualmente en la API.
- **Consecuencias**: no hay URLs absolutas en el front y evitamos problemas de CORS en local.

## ADR-007 · Validación en 3 capas
Front (UX inmediata) → Zod en la API (autoridad) → `CHECK`/`UNIQUE` en SQLite (última defensa). La regla vive en `shared`, así que front y API no pueden contradecirse.
