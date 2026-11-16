# Spec 05 · Frontend (Dashboard comercial)

Stack: **React 19 + Vite + TypeScript** (era React 18; ver ADR-010), **TanStack Query** (caché y estados de carga/error de servidor), **React Router**, **CSS Modules** con variables CSS (sin librería de UI: menos dependencias, control total sobre el responsive). UI en español.

## 1. Rutas y vistas

| Ruta | Vista | Contenido |
|------|-------|-----------|
| `/` | Dashboard | Buscador (debounce de 300 ms) + grid de *cards* de clientes + botón "Nuevo cliente" |
| `/customers/new` | Alta de cliente | Formulario con validación en vivo (esquema Zod y `validateFiscalId` de `shared`) |
| `/customers/:id` | Detalle | Card de datos del cliente + **Simulador** + **Historial** de simulaciones |

Cabecera global: logo y **selector de divisa**, presente en todas las vistas.

## 2. Divisas (API externa)
- Fuente: `GET https://open.er-api.com/v6/latest/EUR` (llamada directa desde el navegador; la API admite CORS).
- Hook `useExchangeRates()` sobre TanStack Query: `staleTime` de 1 h, 2 reintentos con backoff y persistencia en `localStorage` (con `try/catch`) para un arranque instantáneo.
- Se valida la respuesta con Zod (`result === 'success'`, `rates` numéricos). Una respuesta corrupta se trata como error.
- Divisas ofrecidas: `EUR, USD, GBP, CHF, MXN, JPY`, filtradas a las que existan en `rates`.
- `CurrencyContext` guarda la divisa elegida (y la persiste en `localStorage`).
- `formatMoney(cents, currency, rate)` usa `Intl.NumberFormat('es-ES', { style: 'currency', currency })`. Solo se redondea al mostrar.

| Estado | Comportamiento |
|--------|----------------|
| Cargando | Selector deshabilitado con *spinner*. Importes en EUR |
| Error | Banner no bloqueante "No se pudieron cargar los tipos de cambio · Reintentar". Se fuerza EUR. La app sigue siendo usable |
| OK | Pie con "Tipos publicados el {fecha} ({zona}) · próxima actualización: {fecha}" (`time_last_update_unix` / `time_next_update_unix`), en la zona horaria del equipo que visualiza |

**Ampliaciones y decisiones de la fase 5:**
- CORS verificado (`access-control-allow-origin: *`): llamada directa desde el navegador, sin proxy en la API.
- **Caché obsoleta con API caída**: si hay tipos guardados, se siguen usando con un aviso discreto ("no se pudieron actualizar") en lugar del banner de error. Solo sin caché se fuerza EUR.
- **Nunca se etiqueta un importe en EUR con otra divisa**: si la divisa guardada no tiene tipo disponible, se muestra EUR y el selector refleja EUR.
- En el simulador, con divisa distinta de EUR, se muestra el importe que se factura en EUR y el tipo aplicado.
- Atribución "Rates By Exchange Rate API" en el pie (exigida por las condiciones del endpoint gratuito).
- La caché de `localStorage` se valida con Zod al leerla, y solo guarda las 6 divisas ofrecidas.

## 3. Simulador (detalle de cliente)
- Controles: **slider de usuarios** (1–500) sincronizado con un input numérico (hasta 100.000), y sliders o inputs para GB y llamadas API.
- Cálculo **en el cliente** con `computeQuote` de `shared` en cada cambio: sin red y sin lag. Plan y país salen del cliente.
- Desglose visible: tabla de tramos, excedentes, subtotal, IVA (%) y **total** en la divisa seleccionada. El tramo activo se resalta.
- Botón "Guardar simulación" → `POST /simulations`. Al terminar se invalida la query del historial. Estado de guardado: *loading*, éxito (toast) o error (mensaje del contrato).
- El total que devuelve el servidor es el que se guarda. Se muestra un aviso si difiere del calculado en el front (no debería pasar nunca; sirve de alarma).

## 4. Historial
Lista o tabla de simulaciones (fecha, usuarios, GB, llamadas, total), convertida a la divisa activa. Estado vacío con llamada a la acción.

**Ampliaciones añadidas en la fase 4** (no estaban en la spec original):
- Botón **"Cargar"** en cada simulación guardada: devuelve sus valores al simulador para retomar y ajustar una propuesta. Por eso el estado del simulador vive en la página de detalle y no en el componente.
- Precio medio por usuario (base / usuarios) bajo la proyección, como ayuda comercial.
- El slider de almacenamiento y el de llamadas escalan con el plan (hasta 4 veces lo incluido). Los valores mayores se teclean.

## 5. Estados transversales
Cada consulta al backend tiene sus 3 estados (skeleton, error con reintentar y vacío). 404 de cliente → vista "Cliente no encontrado".

## 6. Responsive
Mobile-first. Grid de cards: 1 columna (<640 px), 2 (≥640 px) y 3 (≥1024 px). En el detalle, simulador e historial van apilados en móvil y lado a lado en escritorio. Sin scroll horizontal.

## 7. Organización (estado final)
```
apps/web/src/
├─ api/            # http.ts (cliente tipado + ApiError), customers, simulations, exchangeRates, queryClient
├─ app/            # Layout (cabecera con divisa, banner, pie) y tabla de rutas
├─ features/
│  ├─ customers/   # SearchPage, CustomerCard, NewCustomerPage + CustomerForm/useCustomerForm, CustomerDetailPage
│  ├─ simulator/   # Simulator, ProjectionSummary, UsageControls, QuoteBreakdown, SimulationHistory, hooks
│  └─ currency/    # CurrencyContext, CurrencySelector, RatesStatus, useExchangeRates, ratesCache, formatMoney
├─ components/     # UI genérica: Button, Field, RangeField, Badge, PageHeader, StatusViews
├─ hooks/          # useDebouncedValue
├─ lib/            # format (fechas y números es-ES), storage (localStorage seguro)
├─ styles/         # tokens.css (claro/oscuro), global.css
└─ main.tsx
```
Regla: los componentes no contienen lógica de negocio. Calculan con `shared` y hablan con la API a través de hooks.
