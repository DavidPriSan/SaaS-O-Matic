# Vibe-log 01 · Sesión de planificación (2026-11-16)

**Herramienta**: Claude Code (Opus 5.5) en VS Code.
**Objetivo de la sesión**: analizar el enunciado y definir specs y arquitectura **sin escribir código**.

## Prompt inicial
> "Tengo que hacer un proyecto para un puesto de trabajo, te paso el PDF con la información de la prueba técnica.
> Quiero primero hacer el plan para implementarlo y definir la estructura, evalúa el PDF para ello y vamos
> primero a definirlo todo, antes de empezar a implementar."

## Qué propuso la IA
- Tabla de criterios de evaluación y qué implica cada uno.
- Lista de **huecos del enunciado** (plan sin efecto en el precio, almacenamiento y API sin precio, sin tabla de IVA, NIF extranjero, cálculo en tiempo real frente a persistencia, precisión monetaria).
- Stack recomendado y un primer árbol de carpetas.

## Decisiones tomadas por mí (respuestas a la IA)
| Pregunta | Opciones | Elegí | Por qué |
|----------|----------|-------|---------|
| Stack | TS monorepo / Python + React / Express + Angular | **TS monorepo** | Un único lenguaje y la lógica de pricing compartida entre front y back |
| Efecto del plan | Incluidos / solo etiqueta / multiplicador | **Plan con incluidos** | Da sentido al plan sin tocar el algoritmo de tramos del enunciado |
| ¿Cobrar almacenamiento y API? | Extras / solo guardar | **Sí, como extras** | Si se registran, deben influir en la factura |
| Idioma | — | **Código EN, docs/UI ES** | Convención estándar. El equipo comercial trabaja en español |

## Puntos que reviso antes de dar por buena la spec
- [x] Recalcular los 9 ejemplos de spec 01 §5 con un script independiente de la futura implementación: los 9 cuadran (IVA de los ejemplos 7 y 8: 3677.1 → 3677 y 8076.9 → 8077).
- [x] Verificar los 15 vectores de NIF/CIF/NIE de spec 02 §5 con el mismo script: todos cuadran. **Corrección**: la IA había redactado una fila ambigua (`ab-12`, con un resultado contradictorio) y la sustituí por dos casos claros (válido / demasiado corto).
- [x] Contrastar 2–3 CIF reales conocidos: hecho en la fase 1 (ver vibe-log 02).
- [x] Confirmar que open.er-api.com admite CORS desde el navegador: `access-control-allow-origin: *` (verificado en la fase 5, vibe-log 07).

## Resultado
Specs 01–05, arquitectura (estructura y ADRs), roadmap y `CLAUDE.md`. **Siguiente paso**: fase 1, `packages/shared` con TDD.
