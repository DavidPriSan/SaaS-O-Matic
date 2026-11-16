# Vibe-log 07 · Fase 5: divisas con API externa (2026-11-16)

## Prompt
> "Vamos con la fase 5"

## 1. Verificar antes de diseñar (pendiente desde la fase 0)
Petición real a `open.er-api.com` con cabecera `Origin`:
| Hallazgo | Consecuencia en el diseño |
|----------|---------------------------|
| `access-control-allow-origin: *` | Llamada directa desde el navegador. **No hace falta un proxy en la API** |
| `Cache-Control: max-age=3600` y actualización diaria | `staleTime` de 1 h, alineado con el proveedor |
| Las condiciones del endpoint gratuito exigen atribución | Enlace "Rates By Exchange Rate API" en el pie |
| 166 divisas en la respuesta | Solo se guardan las 6 que ofrece la UI |

## 2. Diseño
- **La respuesta externa se valida con Zod** (`result: 'success'`, `base_code: 'EUR'`, tipos > 0). Una respuesta mal formada es un error, no datos.
- **Caché persistente** como `initialData` de TanStack Query, con `initialDataUpdatedAt`: arranque instantáneo y la app sigue funcionando si el proveedor cae. La caché **también se valida al leerla**: el `localStorage` es entrada externa.
- **Cuatro estados explícitos**: `loading` (selector deshabilitado, EUR), `ready`, `stale` (tipos guardados y aviso discreto), `error` (EUR, banner y "Reintentar").
- **Los reintentos se heredan del QueryClient** (2 en producción, 0 en tests), en vez de definirlos en el hook. Si no, los tests de error tardarían segundos en los *backoffs*.
- Gracias al `useMoneyFormatter()` que se dejó preparado en la fase 4, **simulador, desglose e historial no se tocaron** para convertir: solo cambió el hook por dentro.
- `mockFetch` atiende al proveedor de divisas por separado y **no mezcla esas peticiones** con las de nuestra API, para no romper los tests que cuentan peticiones (debounce, 404 sin reintento…).

## 3. Control de calidad: mutation testing manual
Los 48 tests del front pasaron a la primera. En lugar de darlo por bueno, se comprobó si los tests **detectan** un fallo de verdad:

| Mutación introducida a propósito | ¿La detectaron los tests? | Acción |
|----------------------------------|---------------------------|--------|
| Quitar el fallback a EUR (`{ currency: selected, rate: rate ?? 1 }`) | ❌ **No**: los 17 tests de divisas pasaban | Era un hueco real: con **USD guardado + proveedor caído sin caché**, la UI mostraría "121,00 US$" (importe en EUR con etiqueta de dólares). Nuevo test → falla con la mutación y pasa con el código real |
| Quitar la escritura en caché tras una descarga correcta | ❌ No (solo había test unitario de la caché) | Comprobación añadida en el test de integración |

> Lección: "todo verde a la primera" no demuestra que los tests protejan. La pregunta útil es "¿qué cambio peligroso dejaría pasar esta suite?".

## 4. Otras revisiones
- `formatDateTime` solo aceptaba ISO strings y forzaba `new Date(ms).toISOString()`, una conversión innecesaria. Se amplía para aceptar epoch ms.
- Choque de nombres: `DisplayCurrency` existía en `shared` (código de divisa) y en `formatMoney` (código + tipo). Se renombra este último a `MoneyDisplay`.

## Resultado
`npm run check` → OK. **189 tests** (95 shared + 45 API + 49 web). Cobertura web 95,7 %.
