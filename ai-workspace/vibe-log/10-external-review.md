# Vibe-log 10 · Revisión externa: verificarla antes de aplicarla (2026-11-16)

## Prompts
> "Le he pedido a un amigo que lo revise y este ha sido su veredicto, revísalo y dime qué piensas" *(PDF adjunto: 89/100)*

> "Me parece bien el plan que propones. En cuanto al límite en la búsqueda, lo que más me convence es la opción de 'ver más'. Añade Playwright"

## 1. Lectura del veredicto
Cinco recomendaciones:
1. Responsive móvil roto a 390 px (prioridad alta).
2. Marcar las tarifas de extras como inventadas.
3. Un E2E real de navegador.
4. Más evidencia bruta de la conversación con la IA.
5. Tres detalles: `check` sin `npm audit`; búsqueda limitada a 20 sin paginación e historial sin límite; `CHECK` incompletos en `simulations`.

La IA contrastó cada punto con el código antes de opinar. Los puntos 2, 3, 4 y 5 eran ciertos tal cual. Para el 1 hizo una captura con Edge *headless* a 390 px, vio la página cortada y lo dio por **confirmado**, asumiendo el fallo como propio.

## 2. El punto 1 no era lo que parecía
El primer E2E con Playwright a 390 px pasó en **verde**. En lugar de aceptarlo o de forzar un rojo, se investigó la contradicción:

- **Captura de Playwright a 390 px:** diseño móvil correcto. La proyección queda bajo el título, las unidades se ven y `scrollWidth = 390`.
- **Captura de Edge:** mostraba el **diseño de escritorio recortado**. Chrome y Edge *headless* con `--window-size` imponen un ancho mínimo de ventana (unos 500 px): maquetan a ese ancho y recortan la imagen. Una ventana de escritorio redimensionada a mano tiene el mismo mínimo. La descripción del revisor (divisa, proyección, campos y botón cortados) coincide exactamente con ese artefacto.
- **Barrido para no quedarse en "a mí me funciona":** de **320 a 1440 px en saltos de 10**, más 4 móviles emulados (`isMobile`, meta viewport), en las 4 pantallas. Sin desbordamiento.
- **Peor caso deliberado (320 px, valores máximos y MXN):** aquí **sí había fallos reales**.
  - El slider tenía el margen por defecto del navegador (2 px a cada lado) sumado a `width: 100%`, así que invadía el relleno de la tarjeta a cualquier ancho.
  - El total de la proyección es una sola "palabra", porque `Intl` une número y divisa con un espacio no separable. A 1.9rem imponía 264 px.
  - La tabla del desglose pedía 280 px y solo había 254 disponibles.

Lección: **la IA confirmó una hipótesis ajena con una prueba defectuosa**, y fue el test automático, al contradecirla, lo que destapó el error de método. Se corrige aquí en vez de dejar en el registro un "fallo confirmado" que no lo era.

## 3. Lo que se hizo (un commit por punto)
| Commit | Qué | Control de calidad |
|--------|-----|--------------------|
| E2E + responsive | Workspace `e2e/` con Playwright. Recorre buscar → detalle → simular → guardar → divisa, a 390 y 1440 px, contra el **build de producción** y una **API real** (SQLite temporal, puertos propios). Comprueba `scrollWidth <= innerWidth` y, en el caso de 320 px, que nada cruce el relleno de las tarjetas | El test de 320 px estuvo **en rojo antes del arreglo** (321 px en 320). El arreglo no usa `overflow: hidden`: `margin: 0` en el slider, total con `clamp()`, relleno de tarjeta fluido (`--card-padding`) y guiones en las etiquetas de la tabla. Job `e2e` en la CI. `npm run check` añade `npm audit` y el E2E |
| Extras como supuesto | El desglose separa **"Coste por usuarios" (tramos del enunciado)** = `baseCents` y **"Extras por consumo"**, con la marca **"Supuesto propio"**. La spec 05 se actualizó primero | El E2E de 320 px **volvió a fallar** con la nueva etiqueta: un badge `nowrap` fija el ancho mínimo de la columna. Se sustituyó por una marca en línea que puede partirse |
| Paginación "Ver más" | Primero la spec 03: paginación **keyset** por `(createdAt, id)` con cursor opaco y respuesta `{ items, nextCursor }`, en la búsqueda y en el historial. `useInfiniteQuery` en el front | Tests de API: sin duplicados ni saltos si se inserta un cliente mientras se pagina; **empates de `createdAt` resueltos por `id`**; cursor malicioso → 400. Un test destapó un **bug real**: si fallaba la página siguiente, la lista cargada desaparecía tras la pantalla de error. Ahora se conserva, con "Reintentar" |
| Migración `002` | `CHECK` en `simulations`: plan, país, máximos, importes `>= 0`, subtotal coherente e IVA acotado. Reconstruye la tabla **sin editar la `001`**, que ya está aplicada en el volumen de Docker | Test de actualización sobre una base con solo la `001`: conserva filas, ids, índice y **el contador `AUTOINCREMENT`** (sin él se reutilizarían ids borrados). **Mutation check**: quitando esas líneas, el test falla. Test contra la deriva del catálogo. Probada sobre una copia de la BD de desarrollo (11 filas) y sobre el **volumen Docker real** (`001` y `002` aplicadas, 14 filas, prueba de humo 9/9) |

Se dejó fuera, documentado en la spec 04: `customers.country_code` sigue con `length = 2`. Reconstruir `customers` con `foreign_keys = ON` borraría en cascada sus simulaciones, y ese pragma no se puede cambiar dentro de la transacción de la migración.

## 4. Punto 4: evidencia bruta
Los vibe-logs los redacta la IA durante el trabajo. Los prompts se citan literalmente, pero el resto es narración. La evidencia bruta **no la puede generar la IA**: tiene que salir de la conversación real. Pendiente para mí: exportarla con `/export` a `ai-workspace/conversation/`, después de revisar que no contenga datos personales.

## 5. Resultado
244 tests (shared 119, API 67, web 58) más 6 E2E. `npm run check` en verde, igual que la CI.
