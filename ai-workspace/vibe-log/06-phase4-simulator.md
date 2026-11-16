# Vibe-log 06 · Fase 4: simulador interactivo e historial (2026-11-16)

## Prompt
> "Vamos a por la fase 4"

## 1. Decisiones de diseño antes de programar
| Decisión | Por qué |
|----------|---------|
| `formatMoney(cents, { currency, rate })` y `useMoneyFormatter()` creados ya en `features/currency/` | La fase 5 (divisas) solo tendrá que cambiar el hook por dentro; ningún componente llamará a `formatMoney` con una divisa a mano |
| Estado del simulador subido a la página de detalle | Permite "Cargar" una simulación guardada en el simulador (ampliación sobre la spec, documentada en spec 05 §4) |
| Cálculo en el cliente con el **mismo** `computeQuote` de `shared` | Respuesta instantánea al slider, sin red. Hay un test que comprueba que mover el slider **no** hace peticiones |
| Al guardar se comparan el total del servidor y el del cliente | Si algún día difirieran (bundle del front antiguo frente a una tarifa nueva en el servidor), el usuario lo ve. Hay test con una respuesta manipulada |
| `RangeField` con borrador mientras se escribe | Se puede vaciar el campo y teclear "1000" sin que salte a 1. Solo se confirman enteros dentro de los límites, así que el simulador nunca recibe un valor que haría lanzar a `computeQuote` |

## 2. Bugs y problemas encontrados
| Hallazgo | Cómo apareció | Acción |
|----------|---------------|--------|
| **Importes de 4 cifras sin separador de miles** ("6255,70 €" frente a "16.940,00 €"). Mismo problema de `es-ES` que ya se arregló en `formatNumber`, pero **no se trasladó** a `formatMoney` | Un test del simulador con 1.000 usuarios | `useGrouping: 'always'` + test específico. Lección: cuando se arregla algo, buscar si el mismo patrón se repite en otro sitio |
| **La herramienta de escritura de la IA convertía ` ` en el carácter NBSP literal** (dos veces). El editor no lo distingue a la vista, pero es frágil | ESLint `no-irregular-whitespace` | Usar `/\s+/g` (en JS, `\s` incluye NBSP): ASCII puro e inmune. Se rastreó el repositorio entero en busca de NBSP literales: ninguno |
| Un `sed` para arreglarlo produjo `/00a0/`: en GNU sed, `\u` en el reemplazo pasa a mayúscula la letra siguiente | Revisión de la línea resultante | Se descartó `sed` para esto y se usó Edit con una solución sin escapes |
| **19 tests fallaban solo con `--coverage` y todos los ficheros en paralelo**: `Invalid Chai property: toBeInTheDocument` | `npm run check` | Ver abajo |

### Diagnóstico del fallo con cobertura (por qué no se "parcheó")
1. Primera hipótesis: Git Bash frente a PowerShell → **descartada**: un fichero suelto pasaba en Bash.
2. Segunda: la cobertura → **descartada parcialmente**: un fichero con cobertura también pasaba.
3. Aislamiento: falla con **todos los ficheros + cobertura**. El error real (no el resumen) era `Invalid Chai property`: los matchers de jest-dom no estaban registrados en algunos workers.
4. Causa: el setup los registraba con `import '@testing-library/jest-dom/vitest'` (efecto secundario que resuelve `expect` por su cuenta). Empezó a fallar al añadir `Simulator.test.tsx` (más carga en paralelo).
5. Solución: `expect.extend(matchers)` **explícito** sobre el `expect` que importa el setup, más `import type {}` para conservar los tipos sin el efecto secundario. Verificado con 3 ejecuciones seguidas con cobertura.

> Lo que **no** se hizo: bajar el paralelismo, marcar los tests como reintentables o quitar la cobertura del front. Esas opciones habrían ocultado el problema, no lo habrían resuelto.

## 3. Verificación
- 6 tests nuevos del flujo del simulador: tiempo real sin red, valores fuera del rango del slider con validación del borrador, guardado (body solo con el uso) que aparece en el historial, discrepancia del servidor, error de guardado sin perder los datos introducidos, y "Cargar" desde el historial.
- Prueba en vivo por el proxy: guardar 15 usuarios para un cliente pro de España → 16940 céntimos, el primero del historial.

## Resultado
`npm run check` → OK. **169 tests** (95 shared + 45 API + 29 web). Cobertura web 95 %.
