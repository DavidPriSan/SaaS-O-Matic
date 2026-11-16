# Spec 01 · Reglas de negocio: tarificación

> Implementación: `packages/shared/src/pricing/`. Función pura, sin I/O, 100 % cubierta por tests.

## 1. Entrada y salida

```ts
type PlanId = 'basic' | 'pro' | 'enterprise';

interface QuoteInput {
  activeUsers: number;   // entero, 1 … 100_000
  storageGb: number;     // entero, 0 … 1_000_000
  apiCalls: number;      // entero, 0 … 10_000_000_000 (mensuales estimadas)
  plan: PlanId;
  countryCode: CountryCode; // ISO 3166-1 alfa-2, del catálogo
}

interface Quote {
  pricingVersion: string;          // "2026-11-v1"
  tiers: TierLine[];               // desglose por tramo (solo tramos con unidades > 0)
  baseCents: number;               // suma de tramos
  storageOverageGb: number;
  storageOverageCents: number;
  apiOverageBlocks: number;        // bloques de 1.000 llamadas
  apiOverageCents: number;
  subtotalCents: number;           // base + excedentes
  taxRateBp: number;               // puntos básicos, 2100 = 21 %
  taxCents: number;
  totalCents: number;              // subtotal + IVA
}

interface TierLine { from: number; to: number | null; units: number; unitPriceCents: number; amountCents: number; }
```

`computeQuote(input: QuoteInput): Quote`. Es determinista: misma entrada, misma salida. Lanza `PricingInputError` si la entrada no cumple los rangos.

## 2. Tramos de usuarios (acumulativos)

| Tramo | Usuarios | Precio unitario |
|-------|----------|-----------------|
| 1 | 1 – 10 | 1000 cts (10 €) |
| 2 | 11 – 50 | 800 cts (8 €) |
| 3 | 51 – ∞ | 500 cts (5 €) |

Algoritmo: se recorre la tabla de tramos y cada tramo consume `min(restantes, capacidad del tramo)` unidades.
La tabla es **datos, no condicionales**: añadir un tramo nuevo no debe exigir tocar el algoritmo.

## 3. Planes (cuota incluida) y excedentes

| Plan | Almacenamiento incluido | Llamadas API incluidas / mes |
|------|------------------------|------------------------------|
| `basic` | 50 GB | 100.000 |
| `pro` | 250 GB | 1.000.000 |
| `enterprise` | 1.000 GB | 10.000.000 |

| Concepto | Precio |
|----------|--------|
| Excedente de almacenamiento | 20 cts por GB por encima de lo incluido |
| Excedente de llamadas API | 10 cts por **bloque iniciado** de 1.000 llamadas por encima de lo incluido (`ceil`) |

## 4. IVA por país (tipo general)

| Código | País | IVA (bp) |
|--------|------|----------|
| ES | España | 2100 |
| PT | Portugal | 2300 |
| FR | Francia | 2000 |
| DE | Alemania | 1900 |
| IT | Italia | 2200 |
| NL | Países Bajos | 2100 |
| IE | Irlanda | 2300 |
| GB | Reino Unido | 2000 |
| US | Estados Unidos | 0 (*sales tax* estatal fuera de alcance) |
| MX | México | 1600 |

Redondeo del IVA: **half-up sobre céntimos con aritmética entera**:
`taxCents = floor((subtotalCents * taxRateBp + 5000) / 10000)`.

## 5. Ejemplos de aceptación (se convierten en tests)

| # | Usuarios | Plan | GB | Llamadas | País | Base | Excedentes | Subtotal | IVA | **Total** |
|---|---------|------|----|---------|------|------|-----------|----------|-----|-----------|
| 1 | 15 | basic | 0 | 0 | US | 14000 | 0 | 14000 | 0 | **14000** (ejemplo del PDF: 140 €) |
| 2 | 10 | basic | 0 | 0 | ES | 10000 | 0 | 10000 | 2100 | **12100** |
| 3 | 11 | basic | 0 | 0 | ES | 10800 | 0 | 10800 | 2268 | **13068** |
| 4 | 50 | basic | 0 | 0 | US | 42000 | 0 | 42000 | 0 | **42000** |
| 5 | 51 | basic | 0 | 0 | US | 42500 | 0 | 42500 | 0 | **42500** |
| 6 | 120 | basic | 40 | 80.000 | US | 77000 | 0 | 77000 | 0 | **77000** |
| 7 | 15 | pro | 300 | 1.250.500 | ES | 14000 | 1000 + 2510 | 17510 | 3677 | **21187** |
| 8 | 51 | enterprise | 1000 | 10.000.001 | DE | 42500 | 0 + 10 | 42510 | 8077 | **50587** |
| 9 | 1 | basic | 0 | 0 | MX | 1000 | 0 | 1000 | 160 | **1160** |

Casos de error: `activeUsers` = 0, negativo, decimal (`10.5`), `NaN`, mayor que el máximo; plan o país desconocidos.

## 6. Invariantes (tests de propiedades)
- `sum(tiers.units) === activeUsers`.
- `totalCents === subtotalCents + taxCents`.
- El coste base es **monótono creciente** en `activeUsers` y su coste marginal nunca sube (10 → 8 → 5).
- Todos los importes son enteros ≥ 0.
