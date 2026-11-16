# SaaS-O-Matic

[![CI](https://github.com/DavidPriSan/SaaS-O-Matic/actions/workflows/ci.yml/badge.svg)](https://github.com/DavidPriSan/SaaS-O-Matic/actions/workflows/ci.yml)

Herramienta interna para que el equipo comercial **simule, optimice y presupueste suscripciones SaaS** de clientes corporativos: alta de clientes con validación fiscal oficial, simulador de factura por tramos en tiempo real y conversión a varias divisas.

> El proceso de ingeniería con IA (specs, arquitectura, decisiones y diario de desarrollo) está en **[`ai-workspace/`](ai-workspace/README.md)**.

---

## Puesta en marcha

**Requisitos:** [Node.js](https://nodejs.org) **22 o superior** (la CI lo prueba en Node 22 y 26, sobre Linux y Windows) y Git.

```bash
git clone https://github.com/DavidPriSan/SaaS-O-Matic.git
cd SaaS-O-Matic
npm install
npm run dev
```

Abre **http://localhost:5173**. Eso es todo.

`npm run dev` crea la base de datos SQLite (aplica las migraciones), carga **datos de ejemplo la primera vez** (6 clientes con simulaciones) y arranca juntos la API (`:3000`) y el frontend (`:5173`). `Ctrl+C` para los dos.

## Recorrido sugerido (5 minutos)

1. **Buscador**: escribe `nebula` (sin tilde ni mayúsculas) → encuentra *Nébula Analytics*. Prueba también con un NIF parcial: `x-123`.
2. **Simulador**: abre *Acme Ibérica S.L.* y lleva el slider a **15 usuarios** → 10 × 10 € + 5 × 8 € = **140 €** + 21 % IVA = **169,40 €** (el ejemplo del enunciado). El tramo activo se resalta en el desglose.
3. **Divisa**: cambia a **USD** en la cabecera → simulador, desglose e historial se convierten al instante. Debajo del total se indica el importe que se factura en EUR.
4. **Historial**: pulsa **Guardar simulación** → aparece arriba del historial. Con **Cargar** se recupera cualquier simulación anterior en el simulador.
5. **Alta con validación fiscal**: *Nuevo cliente* → con país España, `12345678A` se rechaza (letra de control incorrecta) y `12345678Z` se acepta como "DNI válido". También valida NIE (`X1234567L`) y CIF (`B12345674`). Si repites un NIF ya registrado, aunque sea con otro formato (`b-1234567-4`), la API responde 409 y el error aparece en el campo.
6. **Resiliencia**: para la API (`Ctrl+C`) y recarga → estados de error con "Reintentar" en lugar de una pantalla rota.

## Scripts

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Seed (solo si la BD está vacía) + API y web juntos, con salida prefijada `[api]` / `[web]`. Avisa cuando la app está lista (o qué servicio no responde); si uno cae, para el otro |
| `npm run dev:api` / `npm run dev:web` | Solo uno de los dos |
| `npm run seed` | Carga los datos de ejemplo (no hace nada si ya hay clientes) |
| `npm test` | Todos los tests (shared, API y web) |
| `npm run check` | **Lo mismo que la CI**: formato, lint, typecheck, tests con umbrales de cobertura y build |
| `npm run build` | Build de producción del frontend (`apps/web/dist`) |

## Configuración (API)

Todas las variables son opcionales y se validan al arrancar: un valor inválido detiene la API con un error claro.

| Variable | Por defecto | Descripción |
|----------|-------------|-------------|
| `PORT` | `3000` | Puerto de la API (el proxy de Vite apunta a `3000`) |
| `HOST` | `localhost` | Interfaz de escucha |
| `DB_PATH` | `apps/api/data/saas-o-matic.db` | Fichero SQLite |
| `CORS_ORIGIN` | `http://localhost:5173` | Único origen permitido |
| `LOG_LEVEL` | `info` | `fatal` … `trace`, `silent` |

## API

Contrato completo (cuerpos, validaciones y errores) en [spec 03](ai-workspace/specs/03-api-contract.md). Importes siempre en **céntimos de EUR**.

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/customers` | Alta de cliente. `400` si un dato no es válido (con el motivo por campo), `409` si el NIF ya existe en ese país |
| `GET` | `/customers?q=&limit=` | Búsqueda por nombre (sin distinguir mayúsculas ni tildes) o prefijo de NIF |
| `GET` | `/customers/:id` | Detalle (`404` si no existe) |
| `POST` | `/simulations` | Registra una simulación. **El servidor calcula el precio**: no acepta importes, plan ni país del cliente |
| `GET` | `/customers/:id/simulations` | Historial, de la más reciente a la más antigua |
| `GET` | `/meta/pricing` | Catálogo: tramos, planes, excedentes y países con IVA |
| `GET` | `/health` | Estado |

```bash
curl -X POST http://localhost:3000/simulations -H "content-type: application/json" \
  -d '{"customerId": 1, "activeUsers": 15, "storageGb": 300, "apiCalls": 1250500}'
```

## Reglas de negocio

- **Tramos acumulativos por usuario**: 1–10 → 10 €, 11–50 → 8 €, más de 50 → 5 €.
- **Planes** (`basic` / `pro` / `enterprise`): incluyen almacenamiento y llamadas API. El excedente se cobra a 0,20 €/GB y a 0,10 € por cada bloque de 1.000 llamadas empezado. *Supuesto propio: el enunciado no definía el efecto del plan.*
- **IVA** del país del cliente (10 países), con redondeo *half-up* sobre céntimos enteros.
- **Identificador fiscal**: en España, algoritmo oficial de DNI, NIE, NIF K/L/M y CIF (dígito o letra de control según el tipo de entidad). En el resto de países, solo formato.

Detalle, ejemplos verificados y supuestos en [spec 01](ai-workspace/specs/01-business-rules.md), [spec 02](ai-workspace/specs/02-fiscal-id-validation.md) y [análisis de requisitos](ai-workspace/00-analisis-requisitos.md).

## Arquitectura

```
packages/shared   Dominio puro: precios, validación fiscal, catálogos, esquemas Zod (contratos)
apps/api          Fastify + better-sqlite3 · módulos routes → service → repository
apps/web          React 19 + Vite + TanStack Query · organizado por features
```

- **Una sola implementación del precio**: el simulador calcula en el navegador (sin red, al instante) con el **mismo** `computeQuote` que usa la API. El servidor siempre recalcula y es quien decide el importe guardado.
- **Dinero en céntimos enteros** de principio a fin; la divisa solo se aplica al mostrar.
- **Cada simulación guarda una copia de su precio** (tramos, IVA, plan, versión de tarifa): el historial no cambia aunque cambien las tarifas.
- **Validación en 3 capas**: formulario (mismo esquema que la API) → Zod en la API → `CHECK`/`UNIQUE` en SQLite.

Más en [arquitectura](ai-workspace/architecture/01-structure.md) y en el [registro de decisiones](ai-workspace/architecture/02-decisions.md).

## Calidad

- **212 tests**: dominio (ejemplos de la spec, vectores de NIF y CIF reales, invariantes), integración de la API sobre SQLite en memoria y flujos de UI con Testing Library.
- **Cobertura mínima** obligatoria: `shared` 95 %, API 90 %.
- **CI en cada push y PR** (GitHub Actions): formato, ESLint con reglas que usan los tipos, typecheck, `npm audit` y tests + build en Ubuntu (Node 22 y 26) y Windows.

## Solución de problemas

| Problema | Solución |
|----------|----------|
| `Port(s) already in use: 3000 …` | Otro proceso (ajeno a este proyecto) usa el puerto. Localízalo y ciérralo: en Windows con `netstat -ano \| findstr :3000` y `taskkill /PID <pid> /F`; en macOS o Linux con `lsof -i :3000` y `kill <pid>`. Después repite `npm run dev` |
| Error de `better-sqlite3` al arrancar (*bindings*) | Módulo nativo compilado para otra versión de Node: `npm rebuild better-sqlite3`. Con npm 11, sus scripts de instalación ya están aprobados en `package.json` (`allowScripts`) |
| `npm warn EBADENGINE` o errores raros de sintaxis | Comprueba `node -v` ≥ 22 (hay `.nvmrc` para `nvm use`) |
| Quiero empezar con la base de datos vacía o recargar los ejemplos | Borra `apps/api/data/` y vuelve a ejecutar `npm run dev` |
| No cargan los tipos de cambio | La app sigue funcionando en EUR y muestra un aviso con "Reintentar". Si hay tipos de una visita anterior, se usan indicando su fecha |
| `⚠ Not responding after 20s: api` | La API falló al arrancar (p. ej. `Invalid environment configuration → at LOG_LEVEL`): el motivo está en las líneas `[api]`. En modo watch se reinicia sola al guardar el arreglo |
