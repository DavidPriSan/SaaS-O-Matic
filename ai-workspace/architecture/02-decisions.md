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
- **Descartado**: Express (más boilerplate para validación y errores); Prisma/TypeORM (demasiado peso para 2 tablas y ocultan el SQL que queremos enseñar); `node:sqlite` (al pasar a Node 26 ya está disponible, pero `better-sqlite3` es más maduro, tiene tipos genéricos por *statement* y funciones SQL definidas por el usuario, que usamos en la búsqueda).
- **Validación de entrada**: Zod `parse()` directamente en las rutas, sin el *type provider* de Fastify. Una dependencia menos, y los `ZodError` llegan al único error handler.

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
- **Corrección tras la revisión externa**: la tercera capa estaba incompleta en `simulations` (plan, país y máximos sin `CHECK`). La migración `002` la completa. En `customers`, `country_code` sigue validado en BD solo por formato (el motivo está en la spec 04).

## ADR-010 · React 19 en lugar de React 18
- **Contexto**: la spec original decía React 18. Al empezar la fase 3, la versión estable es la 19.3 y la 18 ya no tiene desarrollo activo.
- **Decisión**: React 19 (aprobado explícitamente; la spec 05 y `CLAUDE.md` se actualizan en el mismo commit).

## ADR-011 · Quality gates y CI (GitHub Actions)
- **Contexto**: hasta aquí la calidad dependía de que yo lanzara los tests a mano. Todas las suites son herméticas (SQLite `:memory:`, `fetch` simulado, sin red), así que pueden correr en cualquier máquina.
- **Decisión**:
  - Job `quality` (Linux): `prettier --check`, ESLint con reglas *type-checked* (`--max-warnings 0`), typecheck y `npm audit --audit-level=moderate`.
  - Job `test` en matriz: Ubuntu con Node 22 (mínimo de `engines`), Ubuntu con Node 26 y **Windows** con Node 26 (valida el binario nativo de `better-sqlite3` y la instalación limpia con `npm ci`). Ejecuta tests con umbrales de cobertura y build de producción.
  - `npm run check` reproduce lo mismo en local. Desde la revisión externa incluye también `npm audit` (antes solo estaba en la CI) y el E2E.
- **Reglas de ESLint que hacen ejecutables las normas de `CLAUDE.md`**: `no-explicit-any`, `no-non-null-assertion`, `no-console`, `max-lines: 200`. En lugar de `max-lines-per-function` se usa `complexity: 10` (con factorías y JSX, contar líneas por función es mal indicador; la complejidad ciclomática no).
- **Cobertura**: umbrales fijados **tras medir** (shared 96 % / 100 % ramas → umbral 95; API 97 % / 87 % → 90 / 80). En el front es solo informativa.
- **Fuera de CI a propósito**: la API real de tipos de cambio (sería frágil; se simula) y la revisión visual. CD descartado: la prueba se evalúa en local y una API con SQLite necesita un host con disco persistente.
- **`overrides` de `minimatch`**: `typescript-eslint@8.72.2` (la última) arrastra `minimatch@10`, con un ReDoS moderado sin parche en la rama 10.x. Se fuerza `^11.0.8` solo dentro de `typescript-estree` y se verifica que ESLint funciona. **Revisar y quitar** cuando `typescript-eslint` actualice la dependencia.

## ADR-012 · Despliegue con Docker Compose (en lugar de instaladores por sistema operativo)
- **Contexto**: se planteó crear instaladores para Windows y Linux que instalaran "todo lo necesario".
- **Descartado**: instaladores que instalan Node en el sistema. Requieren permisos de administrador, son distintos en cada distribución, pueden chocar con nvm o Volta, un evaluador técnico desconfía (con razón) de scripts que modifican su máquina y serían dos artefactos que mantener y probar.
- **Decisión**: dos vías documentadas. **Node** (`npm install && npm run dev`, la principal para desarrollar) y **Docker Compose** (`docker compose up --build`, sin Node en el host).
  - Imagen de la API: Node 26 slim, usuario sin privilegios, healthcheck, `npm ci -w @saas/api` (sin React ni Vite), seed idempotente al arrancar.
  - Imagen web: build de Vite servido por **nginx**, que hace de proxy de `/api` (mismo contrato que el proxy de Vite, ADR-006): un solo origen y sin CORS.
  - SQLite en un **volumen con nombre**. Capas de dependencias cacheadas (manifiestos antes que código).
- **Verificación**: job `docker` en la CI que construye, arranca con `--wait` (healthchecks) y ejecuta `scripts/docker-smoke.sh` (web, enlaces directos, proxy, búsqueda, DNI, precio, **persistencia tras reiniciar**). El mismo script sirve en local.
- **Puerto `4180` (configurable con `WEB_PORT`)**, no `8080`: el 8080 estaba ocupado por un servicio de Windows en el equipo de desarrollo, que lo compartía en silencio por IPv4 mientras Docker escuchaba por IPv6. La prueba de humo comprueba IPv4 e IPv6 por separado para detectarlo.
- **Complemento**: `engine-strict=true` en `.npmrc`. Con un Node antiguo, `npm install` se detiene al principio con un mensaje claro en lugar de fallar de forma confusa más tarde.

## ADR-013 · E2E con Playwright (un flujo, dos anchos)
- **Contexto**: una revisión externa señaló un fallo responsive que ninguna suite podía ver: Testing Library corre en jsdom, que no maqueta, y la prueba de humo es HTTP.
- **Decisión**: workspace `e2e/` con `@playwright/test` (aprobado explícitamente) y solo Chromium.
  - Cubre **un** flujo de negocio a 390 y 1440 px, más un peor caso a 320 px (valores máximos, MXN).
  - Corre contra el **build de producción** (`vite preview`, mismo proxy `/api`) y una **API real** con SQLite temporal.
  - Usa puertos propios (3100/4173) para no chocar con `npm run dev`.
  - La API de divisas se simula con `page.route`: determinista y sin red.
- **Aserciones de maquetación**: `scrollWidth <= innerWidth` y que nada cruce el relleno de las tarjetas. Si falla, el mensaje nombra los elementos que sobresalen.
- **Descartado**: Cypress (más pesado y otro runner); pruebas visuales por captura (frágiles entre sistemas operativos y fuentes); muchos E2E (la lógica ya la cubren 244 tests más rápidos).
- **Lección (vibe-log 10)**: las capturas *headless* con `--window-size` no sirven para probar anchos de móvil, porque el navegador impone un ancho mínimo de ventana. Hay que usar un viewport real.

## ADR-008 · Runtime Node ≥ 22 (desarrollado sobre Node 26 LTS)
- **Contexto**: Fastify 5 actual → `light-my-request@6.8` → `cookie@2`, que exige Node ≥ 22. Además, Node 20 está fuera de soporte desde abril de 2026.
- **Decisión**: `engines.node >= 22` y `.nvmrc`. Desarrollo y tests sobre Node 26 (LTS activa).
- **Descartado**: fijar Fastify o light-my-request a versiones antiguas, o forzar `cookie@1` con `overrides` (cambia de API). Sería deuda técnica para quedarnos en un runtime sin parches de seguridad.

## ADR-009 · Cero vulnerabilidades conocidas en `npm audit`
- **Decisión**: Zod 3 → **Zod 4** (GHSA-mrhx-c7xc-m3w5, *high*) y Vitest 2 → **Vitest 5** (cadena vite, esbuild y tinypool, con 2 *critical*, solo en dev).
- **Consecuencias**: cambios mínimos de API (`z.strictObject`, `z.email()` vía `pipe`, `code: 'custom'`). Los 95 tests de shared siguieron en verde tras la migración.
