# ai-workspace

Cómo se ha diseñado, planificado y construido SaaS-O-Matic con IA (Claude Code), y cómo se ha controlado lo que la IA generaba.

## Mapa

| Carpeta | Dimensión del enunciado | Contenido |
|---------|------------------------|-----------|
| [00-analisis-requisitos.md](00-analisis-requisitos.md) | 1 · Planificación | Requisitos explícitos, **12 ambigüedades** del enunciado y la decisión tomada en cada una |
| [specs/](specs/) | 1 · Spec-Driven Development | Reglas de negocio con ejemplos verificados, algoritmo fiscal con vectores, contrato de la API, modelo de datos y frontend |
| [plans/00-roadmap.md](plans/00-roadmap.md) | 1 · Planificación | Fases con criterios de aceptación, plantilla de prompt por feature y checklist de revisión del código generado |
| [architecture/](architecture/) | 2 · Arquitectura | Estructura y capas, estrategia de tests y **11 ADRs** (decisiones con alternativas descartadas) |
| [../CLAUDE.md](../CLAUDE.md) | 2 · Directrices para la IA | Reglas permanentes: capas, dinero en céntimos, sin `any`, tamaño de ficheros, TDD, "si la spec es ambigua, pregunta" |
| [vibe-log/](vibe-log/) | 3 · Vibe coding y control de calidad | Diario por sesión: prompt → propuesta de la IA → revisión → corrección |

Las reglas de `CLAUDE.md` no se quedaron en el papel: **ESLint las hace ejecutables** (`no-explicit-any`, `max-lines`, `complexity`…) y la **CI** las comprueba en cada push (ADR-011).

## Diario de desarrollo

| Sesión | Qué se hizo | Momentos de criterio destacados |
|--------|-------------|---------------------------------|
| [01 · Planificación](vibe-log/01-planning-session.md) | Análisis del PDF, decisiones, specs | Ejemplos y vectores de NIF verificados con un script independiente **antes** de fijarlos; corrección de un vector ambiguo de la IA |
| [02 · Shared (TDD)](vibe-log/02-phase1-shared.md) | Precios y validación fiscal | Tests en rojo antes de implementar (commit propio); bug de tabla de tramos desordenada; CIF reales de Telefónica, Mercadona e Inditex como tests |
| [03 · API](vibe-log/03-phase2-api.md) | Fastify + SQLite | Hueco en la spec detectado antes de la migración; Node 20 EOL y vulnerabilidades resueltas sin "parches"; **bug de búsqueda con tildes** encontrado en la prueba en vivo |
| [04 · Front base](vibe-log/04-phase3-frontend-base.md) | Buscador, alta, detalle | La IA paró y preguntó (React 18 frente a 19); scripts de instalación bloqueados por npm 11 que romperían la instalación limpia |
| [05 · Calidad y CI](vibe-log/05-quality-and-ci.md) | ESLint, Prettier, cobertura, GitHub Actions | 4 problemas reales que el typecheck no veía; la ruta del 500 sin test; override de supply chain acotado |
| [06 · Simulador](vibe-log/06-phase4-simulator.md) | Slider en tiempo real, historial | Formato de miles sin aplicar a importes; diagnóstico por eliminación de un fallo que solo ocurría con cobertura en paralelo |
| [07 · Divisas](vibe-log/07-phase5-currency.md) | API externa, caché, estados | **Mutation testing manual**: un test que faltaba habría permitido mostrar euros con etiqueta de dólares; feedback de usuario sobre la zona horaria |
| [08 · Cierre](vibe-log/08-phase6-closing.md) | README, `npm run dev`, auditoría | **Auditoría con un agente independiente** (6 bugs reales y 1 falso positivo, todos verificados); prueba desde un clon limpio; **diagnóstico de procesos huérfanos** hasta la causa raíz (job objects de Windows) tras descartar una solución "de libro" que no funcionaba |

## Retrospectiva: cómo se dirigió a la IA

1. **Spec antes que código, y specs verificadas.** Los números de las specs (precios, vectores de NIF) se comprobaron con un script ajeno a la implementación. Cuando el código destapó un hueco en la spec, primero se corrigió la spec.
2. **La IA no decide lo que es del negocio o del usuario.** Efecto del plan, stack, versión de React o qué controles de calidad añadir se preguntaron. `CLAUDE.md` lo exige ("si la spec es ambigua, pregunta").
3. **No aceptar el primer verde.** Prueba en vivo además de los tests (bug de tildes), mutation testing (fallback de divisa) y auditoría por un agente sin contexto (6 bugs).
4. **No parchear síntomas.** Actualizar Node en vez de fijar versiones antiguas, Zod 4 en vez de ignorar un CVE, registrar los matchers bien en vez de bajar el paralelismo, rechazar los caracteres de control en vez de convertir un `CHECK` en 400.
5. **Todo lo que hace la IA también se audita**: su informe de auditoría tuvo un falso positivo; su herramienta de escritura convirtió ` ` en un carácter invisible (lo cazó ESLint).

## Cómo leerlo
Orden recomendado: `00-analisis` → `specs/` → `architecture/` → `plans/` → `vibe-log/` (por orden).
El historial de git refleja las mismas fases: un commit por fase o feature, con los tests de la fase 1 en un commit anterior a su implementación.
