# Vibe-log 03 · Fase 2: API REST + SQLite (2026-11-16)

## Prompt
> "Seguimos con la fase 2"

## 1. Revisión de las specs antes de programar
| Hallazgo | Acción |
|----------|--------|
| El tipo `Quote` tiene `storageOverageGb` y `apiOverageBlocks`, pero el DDL de la spec 04 no los guardaba. No se podía reconstruir la cotización desde la BD | Se añaden las columnas a la spec 04 **antes** de escribir la migración |

## 2. Implementación
Capas `routes → service → repository` por módulo, `buildApp(deps)` como factoría inyectable, un único error handler que también traduce los 4xx propios de Fastify (JSON malformado, 413…), mapeo de filas validado con los esquemas de `shared` (sin casts) y 37 tests de integración con `app.inject()` sobre `:memory:`.

## 3. Problemas de entorno (y por qué no se "parchearon")
| Problema | Opción rápida descartada | Decisión |
|----------|--------------------------|----------|
| Los tests fallaban: `require() of ES Module cookie`. Fastify 5 → light-my-request 6.8 → `cookie@2`, que exige Node ≥ 22. El equipo tenía Node 20.13 | Fijar versiones antiguas de Fastify o forzar `cookie@1` con `overrides` | **Actualizar el runtime** (Node 20 está fuera de soporte desde abril de 2026). Se instaló Node 26 LTS → ADR-008 |
| `npm audit`: Zod 3 con una vulnerabilidad *high* | Ignorarla ("con el bodyLimit de 16 KB no es explotable") | Migrar a **Zod 4**. Riesgo sutil detectado: en Zod 4 el formato `z.email()` se valida antes que un `.trim()` encadenado → se usa `z.string().trim().toLowerCase().pipe(z.email())` |
| Tras reinstalar sobre Node 26: 6 vulnerabilidades (2 *critical*) en la cadena de Vitest 2 | "Solo son de dev" | Subir a **Vitest 5** con Vite 8 como *peer* explícito → `npm audit`: **0** |

> Nota: recomendé "Node 24 LTS" cuando en noviembre de 2026 la LTS activa ya es la 26. Se instaló la 26, que es lo correcto.

## 4. Prueba manual en vivo (no solo tests)
Seed (idempotente: la segunda ejecución lo omite) y servidor real con `curl`: health, búsqueda por nombre y por NIF, DNI inválido → 400, alta → 201, duplicado con otro formato → 409, 15 usuarios en ES → 16940 céntimos (140 € + 21 %), `totalCents` enviado por el cliente → 400, *preflight* CORS correcto.

**Bug encontrado en esta prueba (los tests no lo cubrían):**
- `GET /customers?q=NÉBULA` → `[]`. El `LIKE` de SQLite solo pasa a minúsculas los caracteres ASCII → incumple la spec 03 ("sin distinguir mayúsculas"). Para nombres en español (tildes, ñ) es un fallo real.
- Proceso: **primero el test que lo reproduce (rojo)** y luego la corrección. Una función SQL determinista `search_normalize()` (NFD + quitar diacríticos + minúsculas) registrada en la conexión. Como extra, la búsqueda tampoco distingue tildes ("nebula" → "Nébula"). Spec 03 actualizada y marcada.

**Hallazgo de revisión asociado:** el índice `idx_customers_name` no servía para nada (un `LIKE '%x%'` nunca usa índice). Se elimina de la migración (aún no publicada) y de la spec 04, con la justificación y la alternativa FTS5 si el volumen creciera.

## 5. Checklist
- [x] Capas respetadas: SQL solo en repositorios y siempre parametrizado. Comodines de LIKE escapados (test con `%` y `_`) e intento de inyección testeado.
- [x] Sin `any`. Las filas de la BD se parsean con Zod en lugar de hacer cast.
- [x] El cliente no puede fijar precio, plan ni país (`strictObject` + test).
- [x] Defensa en profundidad comprobada: `CHECK total = subtotal + tax` y FK testeados insertando SQL crudo.

## Resultado
`npm test` → **133 tests** (95 shared + 38 API). `typecheck` limpio. `npm audit` → 0 vulnerabilidades.
