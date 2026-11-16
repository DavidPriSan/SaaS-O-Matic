# Plan de implementación por fases

Cada fase termina con: tests en verde, revisión manual del código generado (anotada en `vibe-log/`) y un commit.
Ninguna fase empieza sin que la anterior cumpla sus criterios de aceptación.

| Fase | Entregable | Criterio de aceptación |
|------|-----------|------------------------|
| **0. Specs** | `ai-workspace/` y `CLAUDE.md` | Ambigüedades resueltas y documentadas ✅ |
| **1. Shared (TDD)** | `packages/shared` | Tests escritos **antes** que la implementación. Pasan todos los ejemplos de spec 01 §5 y los vectores de spec 02 §5 ✅ |
| **2. API** | `apps/api` | Tests de integración de cada endpoint (feliz, 400, 404, 409). La BD tiene los `CHECK`. Seed funcionando ✅ |
| **3. Front: base** | Layout, router, cliente API, dashboard y buscador, alta de cliente | Búsqueda por nombre y NIF contra la API real. Estados de carga, error y vacío |
| **4. Front: detalle y simulador** | Cards, simulador, historial | Mover el slider recalcula al instante. Guardar persiste y refresca el historial |
| **5. Divisas** | `currency/` | Cambiar de divisa convierte todos los importes. Con la API caída la app sigue en EUR y muestra un banner |
| **6. Cierre** | README, revisión final, vibe-log | `npm install && npm run dev` levanta todo. Auditoría final de seguridad y calidad |

## Plantilla de prompt por feature

Cada feature se pide a la IA con este formato, apuntando siempre a la spec (no se re-explica la regla en el prompt):

```
CONTEXTO: Fase N – <feature>. Lee CLAUDE.md y ai-workspace/specs/<spec>.md §<sección>.
OBJETIVO: <resultado verificable en una frase>.
ALCANCE: crear/modificar solo <rutas>. No toques <rutas>.
RESTRICCIONES: <reglas específicas, p. ej. "sin dependencias nuevas", "TDD: primero tests">.
CRITERIOS DE ACEPTACIÓN:
  - [ ] <test o comportamiento concreto>
ENTREGA: lista de ficheros cambiados + cómo verificarlo. Si la spec es ambigua, PARA y pregunta.
```

## Checklist de revisión del código generado (se aplica en cada fase)
- [ ] ¿Respeta las capas? (sin SQL fuera del repositorio, sin lógica de negocio en componentes)
- [ ] ¿Hay `any`, `as` injustificados o `!` non-null?
- [ ] ¿Los importes son enteros en céntimos de punta a punta?
- [ ] ¿Las consultas están parametrizadas? ¿Se escapan los comodines de LIKE?
- [ ] ¿Se manejan los errores (red, 4xx, 5xx, respuesta malformada)?
- [ ] ¿Algún fichero supera las ~200 líneas o alguna función las ~40?
- [ ] ¿Los tests prueban comportamiento y no detalles de implementación? ¿Cubren los bordes (10/11, 50/51)?
- [ ] ¿Se ha añadido alguna dependencia sin justificar?
