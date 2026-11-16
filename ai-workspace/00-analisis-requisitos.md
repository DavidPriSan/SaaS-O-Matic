# 00 · Análisis de requisitos

Lectura crítica del enunciado (*Prueba Devs con IA.pdf*) antes de escribir una sola línea de código.
Objetivo: separar **lo que se pide explícitamente**, **lo que falta** y **lo que decidimos**.

## 1. Requisitos explícitos

### Backend
| ID | Requisito | Fuente |
|----|-----------|--------|
| B1 | API REST, Node.js (TypeScript) o Python | §2.A |
| B2 | Persistencia en SQLite | §2.A |
| B3 | `POST /customers`: nombre empresa, identificador fiscal, email, país, plan | §2.A |
| B4 | Validación algorítmica estricta de DNI/NIF/CIF **si el país es España** | §2.A |
| B5 | `POST /simulations`: cliente, usuarios activos, almacenamiento, llamadas API. Se persiste | §2.A |
| B6 | Coste base por tramos **acumulativos**: 1–10 → 10 €, 11–50 → 8 €, >50 → 5 € | §2.A |
| B7 | Sumar el impuesto (IVA) del país del cliente | §2.A |

### Frontend
| ID | Requisito | Fuente |
|----|-----------|--------|
| F1 | Framework libre | §2.B |
| F2 | Integración con API pública de tipos de cambio (open.er-api.com), cambio de divisa en tiempo real | §2.B |
| F3 | Buscador por nombre de empresa o identificador fiscal | §2.B |
| F4 | Detalle de cliente en *cards* responsive + historial de simulaciones | §2.B |
| F5 | Simulador interactivo (slider) con proyección en tiempo real, en la divisa seleccionada | §2.B |
| F6 | Estados de carga/error al consumir la API externa | §4.3 |

### Entregables
| ID | Requisito |
|----|-----------|
| E1 | Carpeta `/ai-workspace` con specs, arquitectura y proceso de vibe coding |
| E2 | README que permita levantar back y front en local en pocos pasos |

## 2. Ambigüedades detectadas y decisiones

| # | Ambigüedad | Decisión | Justificación |
|---|-----------|----------|---------------|
| A1 | El "Plan Elegido" se guarda pero no se dice cómo afecta al precio | 3 planes (`basic`, `pro`, `enterprise`) que **incluyen** una cuota de almacenamiento y llamadas API. Los tramos de usuarios son iguales para todos | Da sentido a la existencia del plan sin alterar el algoritmo de tramos pedido |
| A2 | Almacenamiento y llamadas API se registran pero no tienen precio | Se cobran como **excedente** sobre lo incluido en el plan | Si se registran es porque deben influir en la factura. Queda documentado como supuesto propio |
| A3 | No hay tabla de IVA | Catálogo cerrado de países con su tipo general de IVA (ver spec 01) | Evita texto libre en `country` y hace el cálculo determinista |
| A4 | Identificador fiscal de países no españoles | Solo validación de formato genérico | El enunciado solo exige el algoritmo para España |
| A5 | El cálculo debe verse "en tiempo real" en el slider, pero también persistirse en el backend | La lógica de precios vive en un **paquete compartido** (`packages/shared`) que usan front y back. El backend **siempre recalcula** e ignora cualquier total enviado por el cliente | Una sola fuente de verdad, sin divergencias. Además el front nunca decide el precio |
| A6 | Precisión monetaria | Todo importe se guarda y calcula en **céntimos enteros de EUR**. El IVA se expresa en puntos básicos (2100 = 21 %) | Evita errores de coma flotante (0.1 + 0.2) |
| A7 | La divisa afecta a la visualización, no a la facturación | La moneda de cálculo y persistencia es siempre EUR. La conversión es solo de presentación | La tarifa está definida en EUR y los tipos de cambio son volátiles |
| A8 | ¿Cambios futuros de tarifa? | Cada simulación guarda una **instantánea**: desglose por tramos, tipo de IVA, plan y `pricingVersion` | El historial no debe reescribirse si cambian las tarifas |
| A9 | ¿Clientes duplicados? | `UNIQUE(country_code, tax_id)` → `409 Conflict` | Un mismo NIF no puede ser dos clientes |
| A10 | Las vistas obligatorias necesitan **leer** datos, pero solo se piden endpoints `POST` | Se añaden `GET /customers?q=`, `GET /customers/:id`, `GET /customers/:id/simulations`, `GET /meta/pricing` | Sin ellos el buscador y el detalle son imposibles |
| A11 | ¿0 usuarios? | Mínimo 1 usuario activo | Una suscripción sin usuarios no tiene sentido comercial |
| A12 | IVA intracomunitario B2B (inversión del sujeto pasivo) | **Fuera de alcance**. Se aplica siempre el tipo general del país del cliente | Lo pide así el enunciado. Lo documentamos para que se vea que lo hemos considerado |

## 3. Fuera de alcance (explícitamente)
- Autenticación y autorización (es una herramienta interna; se menciona como mejora futura).
- Edición y borrado de clientes o simulaciones.
- Facturación real, pasarela de pago y multi-tenant.
- Validación algorítmica de identificadores fiscales extranjeros (VIES, etc.).
