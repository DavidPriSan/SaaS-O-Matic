# Vibe-log 08 · Fase 6: cierre, auditoría independiente y prueba desde cero (2026-11-16)

## Prompt
> "Vamos con la fase 6"

## 1. Auditoría independiente con un agente sin contexto
Para evitar revisar mi propio código con los mismos sesgos con los que se escribió, lancé un **subagente que no había visto la conversación**, con un *brief* acotado: prioridades (corrección frente a specs > seguridad > robustez > reglas de `CLAUDE.md`), lo ya aceptado fuera de alcance (auth, rate limiting…), y la obligación de verificar cada hallazgo con código o con una entrada concreta.

**Cada hallazgo se verificó antes de aceptarlo:**
| # | Hallazgo del agente | Mi verificación | Acción |
|---|---------------------|-----------------|--------|
| 1 | `companyName` con `\u0000` → **500 en lugar de 400**: Zod cuenta 5 caracteres y SQLite `length()` se corta en el NUL → falla el `CHECK` | ✅ Reproducido con un test (rojo) | Rechazar caracteres de control (`\P{Cc}`) en el esquema compartido. **No** se convierte el `CHECK` en 400: si salta, es un bug de validación y debe verse como 500 |
| 2 | La búsqueda acepta más de 100 caracteres → la API responde 400 con un "Reintentar" inútil | ✅ | `SEARCH_QUERY_MAX_LENGTH` exportado desde `shared` → `maxLength` en el input y recorte del `?q=` |
| 3 | Guardar con el historial en error lo sustituía por `[nueva]`: desaparecían el error y el historial anterior | ✅ | Sin lista en caché → invalidar en lugar de sembrar |
| 4 | Tras un 409, al editar el NIF aparecía un banner genérico engañoso | ✅ | El banner se deriva del error, no del estado de los campos |
| 5 | `/customers/0x1` devolvía el cliente 1 (`z.coerce` acepta hexadecimal, `1e0`, `" 1"`) | ✅ | `idSchema` canónico (`^[1-9]\d{0,14}$`) compartido por la API y la ruta del front |
| 6 | Un 4xx sin el formato de la API se mostraba como "error del servidor" | ✅ | → `INVALID_RESPONSE` |
| 7a | `Simulator` tenía unas 90 líneas (regla de ~40) | ✅ | Dividido en `ProjectionSummary` y `UsageControls` |
| 7b | "`CLAUDE.md` dice React 18" | ❌ **Falso positivo**: las únicas menciones son históricas (ADR-010) | Ninguna |

Flujo seguido: **18 tests nuevos en rojo → correcciones → 212 en verde**.

> Lección: el informe de un agente es otra salida de IA más; se verifica igual que el código generado (un falso positivo de 8).

## 2. `npm run dev` con un solo comando (sin dependencias nuevas)
- `scripts/dev.mjs` invoca el CLI de npm con el Node actual (`npm_execpath`): sin shell, así se evitan el `EINVAL` de los `.cmd` y el aviso DEP0190 en Windows.
- En Windows cierra el árbol de procesos con `taskkill /T` (`child.kill()` no mata a `tsx` ni a `vite`).
- **Prueba que no salió como esperaba:** para simular un conflicto de puertos ocupé el 3000 con otro servidor… y la API **arrancó igualmente**. En Windows, un proceso en la dirección comodín y otro en `127.0.0.1`/`::1` pueden compartir puerto en silencio. → Se añadió una **comprobación previa de puertos** con mensaje claro.
- **Caída de un servicio**: matar Vite en marcha → el supervisor para la API y sale con código 1, sin huérfanos.
- **Límite conocido y documentado:** `tsx watch` no termina si la API falla al arrancar (espera cambios), y un cierre *forzoso* del supervisor deja hijos vivos (le pasa a cualquier orquestador). Con `Ctrl+C` o cerrando la terminal se paran todos. Se detectó en la prueba desde cero, y la comprobación de puertos lo hace evidente en la siguiente ejecución.

## 3. README pensado para el evaluador
Tres comandos, un **recorrido guiado de 5 minutos** con resultados esperados (169,40 €, DNI inválido frente a válido, 409 con otro formato…), tabla de scripts, variables de entorno, resumen de la API, reglas de negocio con sus supuestos y solución de problemas reales encontrados durante el desarrollo (scripts de instalación de npm 11, puertos, binario nativo). Se sustituyó una sugerencia de `npx kill-port` (ejecutar un paquete de terceros) por comandos nativos del sistema.

## 4. Prueba desde cero (como el evaluador)
Clon limpio **desde GitHub** en una carpeta nueva, siguiendo el README al pie de la letra:
- `npm install`: 19 s, 0 vulnerabilidades, **ningún aviso de scripts bloqueados** (el `allowScripts` versionado funciona).
- `npm run dev`: crea la BD, carga el seed y levanta los dos servidores.
- Recorrido del README contra ese clon: "nebula" → Nébula Analytics, 15 usuarios → 16940 céntimos, DNI `12345678A` → `INVALID_CONTROL`, NIF repetido con otro formato → 409.

## Resultado final
- `npm run check` → OK. **212 tests** (108 shared + 51 API + 53 web). Cobertura: shared 96 %, API 97 %, web 96 %.
- CI en verde en Ubuntu (Node 22 y 26) y Windows.
