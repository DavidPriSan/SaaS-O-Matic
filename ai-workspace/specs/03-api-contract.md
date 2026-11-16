# Spec 03 · Contrato de la API REST

- Base URL local: `http://localhost:3000`. El front accede a través del proxy de Vite en `/api`.
- JSON en `camelCase`. Fechas en ISO-8601 UTC. Importes en **céntimos de EUR** (enteros).
- Validación de entrada con **Zod**. Los esquemas viven en `packages/shared/src/schemas` y se reutilizan en el front.

## Formato de error (único para toda la API)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "El identificador fiscal no es válido",
    "details": [{ "path": "taxId", "message": "INVALID_CONTROL" }]
  }
}
```

| HTTP | `code` | Cuándo |
|------|--------|--------|
| 400 | `VALIDATION_ERROR` | El body o la query no cumplen el esquema, o falla la validación del NIF |
| 404 | `NOT_FOUND` | El cliente no existe |
| 409 | `CONFLICT` | Ya existe un cliente con ese `country + taxId` |
| 500 | `INTERNAL_ERROR` | Error inesperado (sin filtrar el stack al cliente) |

---

## `POST /customers`
**Body**
```json
{ "companyName": "Acme S.L.", "taxId": "B12345674", "email": "it@acme.es", "countryCode": "ES", "plan": "pro" }
```
| Campo | Regla |
|-------|-------|
| companyName | string con trim, 2–120 caracteres |
| taxId | `validateFiscalId(taxId, countryCode)` (spec 02). Se guarda normalizado |
| email | email válido, se guarda en minúsculas, máximo 254 caracteres |
| countryCode | uno del catálogo (spec 01 §4) |
| plan | `basic` \| `pro` \| `enterprise` |

**201** → `Customer`
```json
{ "id": 1, "companyName": "Acme S.L.", "taxId": "B12345674", "taxIdType": "CIF", "email": "it@acme.es",
  "countryCode": "ES", "plan": "pro", "createdAt": "2026-11-16T09:00:00.000Z" }
```
Errores: 400, 409.

## `GET /customers?q=&limit=&cursor=`
- `q` (opcional, máximo 100 caracteres): búsqueda que no distingue mayúsculas **ni tildes** en `companyName` (contiene; "nebula" encuentra "Nébula") **o** en `taxId` (prefijo, comparado con `q` normalizado).
- Se escapan los comodines `%` y `_` de LIKE. Las consultas van **siempre parametrizadas**.
- `limit` y `cursor`: ver **Paginación**. Orden: `createdAt DESC` (desempate por `id DESC`).
- Sin `q` → últimos clientes registrados (alimenta el dashboard).

**200** → `{ "items": Customer[], "nextCursor": string | null }`

## `GET /customers/:id`
**200** → `Customer` · **404**

## `POST /simulations`
**Body**
```json
{ "customerId": 1, "activeUsers": 15, "storageGb": 300, "apiCalls": 1250500 }
```
- `plan` y `countryCode` **no** se aceptan en el body: se toman del cliente persistido.
- El servidor ejecuta `computeQuote` y persiste el resultado. Cualquier campo de importe que venga en el body se **ignora** (Zod en modo `strict` → 400 si hay campos extra).

**201** → `Simulation`
```json
{ "id": 7, "customerId": 1, "activeUsers": 15, "storageGb": 300, "apiCalls": 1250500,
  "plan": "pro", "countryCode": "ES",
  "quote": { "pricingVersion": "2026-11-v1", "tiers": [ … ], "baseCents": 14000, "storageOverageCents": 1000,
             "apiOverageCents": 2510, "subtotalCents": 17510, "taxRateBp": 2100, "taxCents": 3677, "totalCents": 21187 },
  "createdAt": "…" }
```
Errores: 400, 404 (cliente inexistente).

## `GET /customers/:id/simulations?limit=&cursor=`
**200** → `{ "items": Simulation[], "nextCursor": string | null }` ordenado por `createdAt DESC` (desempate por `id DESC`) · **404** si el cliente no existe. Paginado igual que la búsqueda.

## Paginación (listados)
- `limit`: 1–50, por defecto 20.
- **Keyset por cursor**, no `offset`: `nextCursor` identifica el último elemento devuelto (`createdAt` + `id`) y la página siguiente se pide con `?cursor=<nextCursor>` (y los mismos filtros). Si se insertan filas mientras se pagina, no hay duplicados ni saltos (con `offset` los habría).
- `nextCursor: null` → no hay más resultados.
- El cursor es **opaco** para el cliente: debe reenviarlo tal cual, no construirlo. Un cursor mal formado → **400** (`VALIDATION_ERROR`, campo `cursor`).

## `GET /meta/pricing`
Catálogo para pintar selectores y tablas sin duplicar constantes en el front:
```json
{ "pricingVersion": "2026-11-v1", "tiers": [...], "plans": [...], "countries": [{ "code": "ES", "name": "España", "taxRateBp": 2100 }] }
```
(El front también puede importarlo de `shared`. El endpoint existe para consumidores externos y para pruebas manuales.)

## `GET /health`
**200** → `{ "status": "ok" }`

## Transversal
- CORS limitado a `http://localhost:5173`.
- `bodyLimit` de 16 KB.
- Logs estructurados (pino, el que trae Fastify). No se registran bodies completos.
