# Vibe-log 02 · Fase 1: `packages/shared` con TDD (2026-11-16)

## Prompt
> "Vamos con la fase 1"

Contexto que ya tenía la IA: roadmap (fase 1 = shared con TDD), specs 01–03 y `CLAUDE.md`.

## Proceso
1. **Andamiaje mínimo**: npm workspaces, `tsconfig.base.json` en modo estricto (`strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`).
2. **Tests primero** (commit `Add shared package tests`). Traducción directa de las tablas de las specs:
   - spec 01 §5 → `it.each` con los 9 ejemplos de aceptación. Bordes 10/11 y 50/51, excedentes y redondeo del IVA hacia arriba y hacia abajo.
   - spec 01 §6 → invariantes recorriendo de 1 a 300 usuarios (reparto exacto, monotonía, coste marginal no creciente).
   - spec 02 §5 → vectores de DNI, NIE, K/L/M y CIF (letra, dígito o ambos) y el caso genérico.
   - spec 03 → esquemas Zod en modo *strict* (rechazan `totalCents` o `plan` enviados por el cliente).
   - Resultado: **4 ficheros en rojo** (no existía la implementación).
3. **Implementación** → 91/91 en verde a la primera y `tsc` sin errores.

## Revisión del código generado (checklist del roadmap)
| Hallazgo | Acción |
|----------|--------|
| `computeTieredCost` con una tabla de tramos **mal ordenada** (`upTo` decreciente) daba capacidad negativa y producía líneas con unidades negativas **sin fallar** | Se añade una guarda (`capacity <= 0` → error) y un test que la reproduce |
| Quedaba pendiente "contrastar con identificadores reales" (vibe-log 01) | Se calculan a mano los CIF públicos de Telefónica (A28015865), Mercadona (A46103834) e Inditex (A15075062) y se añaden como tests. Coinciden |
| Riesgo de que el tipo `Quote` y su esquema Zod diverjan | `quoteSchema: z.ZodType<Quote>`: si alguien cambia uno sin el otro, `tsc` falla |
| Constantes de catálogo como `string[]` obligarían a usar `as` para `z.enum` | Tuplas `as const` (`COUNTRY_CODES`, `PLAN_IDS`) con tipos derivados. Sin casts en el código de producción |
| ¿Hay `any`, `!` o ficheros grandes? | Ninguno. El fichero más largo (`computeQuote.ts`) tiene unas 100 líneas |

## Decisiones técnicas tomadas en caliente
- **La normalización del NIF va dentro del esquema Zod** (`createCustomerSchema` hace un `transform`): el backend recibe directamente `taxId` normalizado y `taxIdType`. La regla vive en un solo sitio y el formulario del front reutiliza el mismo esquema.
- **`exports` apunta a `src/index.ts`** (paquete interno sin build): Vite y Vitest lo consumen directamente. Cómo lo consume la API (tsx o compilación) se decide en la fase 2.
- Se mantiene **Zod 3** (API estable y conocida); no hay necesidad de Zod 4 para este alcance.

## Resultado
`npm test` → **95 tests en verde**. `npm run typecheck` → sin errores.
