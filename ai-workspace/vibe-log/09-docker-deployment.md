# Vibe-log 09 · Despliegue con Docker, validado en CI y en local (2026-11-16)

## Prompt
> "¿Ves bien dejar así el despliegue? ¿O podemos hacer un par de instaladores, uno para Windows y otro para Linux, para que sea más fácil aún instalar todo lo necesario?"

## 1. Recomendación de la IA: no hacer instaladores de sistema (ADR-012)
- Para instalar "todo lo necesario" tendrían que instalar Node: permisos de administrador, distinto en cada distribución, posibles choques con nvm o Volta.
- Un evaluador técnico desconfía, con razón, de un script que modifica su sistema, y más en una prueba de "calidad y seguridad".
- Alternativa propuesta: **Docker Compose** (sin Node en el host, idéntico en todos los sistemas operativos) + `engine-strict` en `.npmrc`.
- Salvedad declarada desde el principio: Docker no estaba instalado en local → **se valida primero en la CI**; sin esa prueba no se daría por bueno.

## 2. Mi decisión
> "Me parece bien lo que propones, aunque igual estaría bien también probarlo en local. Instala lo que haga falta o dime qué tengo que instalar."

La IA **no instaló Docker por su cuenta**: requiere permisos de administrador y reinicio (WSL2), y la licencia de Docker Desktop depende del tamaño de la empresa, una condición que tengo que aceptar yo. Antes de darme los pasos comprobó que el equipo era apto (virtualización activada en la BIOS, build 19045, RAM y disco) y ofreció una alternativa sin condiciones de licencia (Rancher Desktop).

## 3. Implementación
| Pieza | Decisiones |
|-------|-----------|
| `docker/api.Dockerfile` | Node 26 slim; manifiestos antes que código (capas cacheadas); `npm ci -w @saas/api` (sin React ni Vite); usuario `node`; healthcheck; seed idempotente al arrancar; `exec` para que el servidor sea el PID 1 |
| `docker/web.Dockerfile` + `nginx.conf` | Build de Vite servido por nginx, que hace de **proxy de `/api`** (mismo contrato que el proxy de Vite → un solo origen, sin CORS); SPA *fallback*; caché inmutable para `/assets`; `server_tokens off`; cabeceras de seguridad; `client_max_body_size 16k` |
| `compose.yaml` | Web en el puerto `8080` (no choca con el 5173 de desarrollo; **cambiado a `4180` configurable**, ver §6); `depends_on: service_healthy`; SQLite en un volumen con nombre |
| `scripts/docker-smoke.sh` | 7 comprobaciones reales, incluida la **persistencia tras reiniciar** la API. El mismo script en CI y en local |
| `.npmrc` `engine-strict=true` | Verificado que ninguna dependencia excluye Node 26 (local) ni Node 22 (CI) |

## 4. Validación
**CI (Ubuntu):** el nuevo job `docker` construye, arranca con `--wait` (healthchecks) y pasa la prueba de humo **a la primera**.

**Local (Windows 10 + Docker Desktop 29.9 / Compose 5.7):**
- Incidencia: tras instalar, `docker` "no existía". Diagnóstico antes de pedir nada: el binario estaba instalado y en el PATH del sistema, pero la sesión era anterior a la instalación; además Docker Desktop no estaba arrancado (WSL sin la distribución `docker-desktop`). Se arrancó y se esperó al motor.
- `docker compose up -d --build --wait`: 184 s la primera vez, los dos contenedores *healthy*.
- Prueba de humo: **7/7**, incluida la persistencia (simulación #8 tras `restart`).
- Comprobaciones extra que la prueba de humo no cubre: la API corre como `node` (no root), nginx no expone su versión, `nosniff` y `Referrer-Policy` presentes, assets con `immutable`, body de más de 16 KB → 413 en el propio proxy.

## 6. Feedback mío: "no carga la página" (captura con *Access Error: 404 -- Not Found*)
La prueba de humo estaba en verde, pero en mi navegador `localhost:8080` mostraba un 404 de **otro servidor**.

- **Diagnóstico:** en el 8080 escuchaba un servicio de Windows ajeno (`ApplicationWebServer`, hijo de `services.exe`) en `0.0.0.0` (IPv4), y Docker en `::` (IPv6). `localhost` resuelve a las dos direcciones: **el navegador fue por IPv4** (al otro servidor) y **`curl` por IPv6** (a nginx). La prueba daba un falso verde.
- **Es el mismo fenómeno de Windows** (dos procesos en el mismo puerto, en direcciones distintas) que ya se había encontrado con el 3000 en `scripts/dev.mjs`, y **no se trasladó** al despliegue Docker. Lección: cuando se descubre una clase de problema, buscar dónde más puede aparecer.
- **Proceso:**
  1. La prueba de humo se corrige **primero** (IPv4 explícito y comprobación de que IPv4 e IPv6, si responden, sirven esta app) y se ejecuta contra el 8080 → **falla**, reproduciendo lo que veía yo.
  2. El puerto por defecto pasa a **4180** (el 8080 es el puerto HTTP alternativo más usado; un evaluador podría tener el mismo conflicto) y es configurable con `WEB_PORT`.
  3. Prueba de humo en el 4180: **9/9**, con IPv4 e IPv6 verificados por separado.
- No se tocó el servicio ajeno: es software del equipo, no del proyecto.

## 5. Pendiente declarado
La imagen de la API pesa **421 MB** (unos 220 MB son la base `node:26-slim`; el resto son `tsx`, esbuild y la compilación de `better-sqlite3`). Mejora posible: compilar TS a JS con `tsc` e instalar con `--omit=dev`, lo que la reduciría a la mitad. No se aplica ahora porque cambia el runtime de producción (hoy `tsx`, igual que en desarrollo) y la prueba no lo requiere.
