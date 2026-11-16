# Arquitectura · Estructura del proyecto

## Vista general

```
                ┌────────────────────────── navegador ──────────────────────────┐
                │  apps/web (React + Vite)                                       │
                │   features/* ──hooks──► api/client ──/api──┐                   │
                │        │                                   │   open.er-api.com │
                │        └──► @saas/shared (pricing, fiscal-id, schemas) ◄───────┼── tipos de cambio
                └────────────────────────────────────────────┼───────────────────┘
                                                             │ proxy Vite
                ┌────────────────────────────────────────────▼───────────────────┐
                │  apps/api (Fastify)                                            │
                │   routes ──► service ──► repository ──► better-sqlite3 ──► .db │
                │                │                                               │
                │                └──► @saas/shared (misma lógica que el front)   │
                └────────────────────────────────────────────────────────────────┘
```

## Árbol de carpetas

```
SaaS-O-Matic/
├─ ai-workspace/                  # proceso de ingeniería (specs, arquitectura, planes, vibe-log)
├─ CLAUDE.md                      # reglas que la IA debe seguir en este repo
├─ .github/workflows/ci.yml       # CI: calidad + matriz de tests (ADR-011)
├─ scripts/dev.mjs                # `npm run dev`: API + web juntos, comprobación de puertos, parada conjunta
├─ eslint.config.js · .prettierrc.json
├─ package.json                   # npm workspaces + scripts raíz (dev, check, test, build, seed)
├─ tsconfig.base.json             # strict: true, noUncheckedIndexedAccess
├─ packages/
│  └─ shared/                     # @saas/shared: TS puro, sin dependencias de runtime salvo zod
│     └─ src/
│        ├─ pricing/              # tiers.ts, plans.ts, computeQuote.ts, *.test.ts
│        ├─ fiscal-id/            # normalize.ts, spain.ts, validateFiscalId.ts, *.test.ts
│        ├─ catalog/              # countries.ts (IVA), currencies.ts
│        ├─ schemas/              # Zod: customer, simulation, errors (contratos de la API)
│        └─ index.ts
├─ apps/
│  ├─ api/
│  │  ├─ src/
│  │  │  ├─ app.ts                # buildApp(deps): factory testeable (inyección de db)
│  │  │  ├─ server.ts             # arranque (lee env, abre db, listen)
│  │  │  ├─ config.ts             # variables de entorno validadas con Zod
│  │  │  ├─ db/                   # connection.ts, migrate.ts, migrations/*.sql, seed.ts
│  │  │  ├─ plugins/              # error-handler.ts, cors.ts
│  │  │  └─ modules/
│  │  │     ├─ customers/         # customers.routes.ts / .service.ts / .repository.ts / .test.ts
│  │  │     ├─ simulations/       # ídem
│  │  │     └─ meta/              # meta.routes.ts
│  │  └─ data/                    # .db local (gitignored)
│  └─ web/                        # ver spec 05 §7
└─ README.md
```

## Capas del backend (regla de dependencias)

| Capa | Responsabilidad | Puede importar |
|------|-----------------|----------------|
| `routes` | HTTP: parsear con Zod, llamar al servicio, mapear a status code | service, shared/schemas |
| `service` | Reglas de aplicación: unicidad, existencia del cliente, `computeQuote`, orquestación | repository, shared |
| `repository` | SQL parametrizado y mapeo fila ↔ objeto de dominio | db |
| `shared` | Dominio puro (precios, NIF, catálogos) | zod |

Las flechas solo van hacia abajo. Ni SQL fuera de `repository` ni `request`/`reply` fuera de `routes`.
Los errores de dominio (`NotFoundError`, `ConflictError`, `ValidationError`) los traduce a HTTP un único `error-handler`.

## Estrategia de tests

| Nivel | Herramienta | Qué cubre |
|-------|-------------|-----------|
| Unitario | Vitest | `shared`: todos los ejemplos de spec 01 §5 y vectores de spec 02 §5, más invariantes |
| Integración API | Vitest + `app.inject()` + SQLite `:memory:` | Cada endpoint: camino feliz, 400, 404, 409, snapshot persistido |
| Front | Vitest + Testing Library | `formatMoney`, `useExchangeRates` (éxito, error y respuesta malformada), Simulator recalcula al mover el slider |

`npm test` en la raíz ejecuta todo.
