# Handoff — código Colpa Bélgica Conecta

## Estado (2026-11-12)

- Plan aprobado: [plan-puesta-en-marcha.md](plan-puesta-en-marcha.md). Meta: demo del 30% ≈ 1-dic-2026 (núcleo 13 RF: RF-01..10, 11, 15, 16).
- Fuente de requisitos: `../Documentos para mi proyecto de titulacion/Documento PG - Trabajo/fuente/03-cap2a..d.md`. SRS IEEE 830 generado: `Documento PG - Trabajo/SRS_ColpaBelgicaConecta_v1.pdf` (`build_srs.py`).
- **Mergeado:** #1 Fase 0 · #2 RF-01..03 (login, cuentas, roles) · #3 diseño C · #4 RF-04..11 (motor de publicaciones, imágenes, máquina de estados, auditoría) · #6 RF-14/15/16 (destacar comunicado, lectura pública del habitante, destacados) · #8 app móvil: panel del funcionario · #10 Neon + API en Vercel · #11 pantallas del habitante (Inicio, Salud, detalle).
- **Reevaluación 2026-11-12:** [reevaluacion-2026-11-12.md](reevaluacion-2026-11-12.md) (diagnóstico, decisiones, backlog) · cambios para la tesis en una sola lista: [tesis-cambios.md](tesis-cambios.md) · auditorías completas en `docs/auditorias/`.
- **Hito activo:** Fase 3 (móvil). **Primera prueba en un teléfono hecha el 2026-11-12** (Expo Go, Android del CTO): [prueba-dispositivo-2026-11-12.md](prueba-dispositivo-2026-11-12.md). El núcleo funciona; sus defectos se corrigieron en #18. Sigue sin haber APK ni capturas del teléfono.
- **Progreso:** `pnpm progreso` decía 14/35 (40 %), pero no leía los tests del móvil, y 4 de esos RF (02, 03, 09, 10) no tienen pantalla. **Demostrable en el teléfono: 10/35 (28,6 %).** No reportar 40 %. App móvil: panel del funcionario mergeado (login, Mis publicaciones, ficha con imágenes y destacado, Revisión); verificado en web, tests y en el teléfono (login, ficha, imagen, enviar, revisión). Pantallas del habitante mergeadas (#11, 2026-11-12); verificadas con tests, web y en el teléfono (Inicio y Salud). API pública en producción: https://colpa-belgica-conecta-api.vercel.app.

## Diseño (aprobado por el CTO 2026-11-04)

- **Propuesta C**: [docs/diseno/propuesta-C.html](diseno/propuesta-C.html) (fuente de verdad; los Artifacts publicados ya no existen).
- Estructura de B (sello de frescura en cada pantalla de lectura, vocabulario de estados, una acción primaria) + paleta de A (solo tokens de la Tabla 2.66, sin tintes).
- Sin conexión = banda neutra #49454F (no alarma); ámbar solo para avisos reales.
- Inicio con "Próximas actividades" (fecha relativa) para planificar el traslado; el Lugar del detalle enlaza a la ficha del directorio (RF-35).
- Pantallas de referencia: P-01, P-01 sin conexión, P-03, P-03 al 200 %, P-14, P-18.
- Pendiente de redacción en la tesis (2.4.3): dice "prototipos en Figma"; los prototipos son HTML. Ajustar el texto o exportar a Figma.

## Decisiones

- La ficha de `publicacion` usa las columnas explícitas del diccionario (Tabla 2.55), no `detalle Json`.
- Un solo `.env` en la raíz (+ `.env.test`); los tests exigen BD `_test`.
- Auth: JWT HS256 1 h con `jti` (revocación) y `sv` = `funcionario.version_sesion` (aumenta al desactivar, reactivar o cambiar rol). Bloqueo 5 intentos / 15 min con reserva atómica del intento. Cifras definidas en `apps/api/src/config.ts` porque RNF-22/24 las dejan "para el Sprint 1": reflejarlas en la tesis.
- `TRUST_PROXY_HOPS` obligatorio en producción (Vercel = 1).
- Lectura pública (RF-15/16): DTO por lista blanca (sin observaciones, autor ni ids internos). Vigencia = `fechaFin ?? fechaInicio >= hoy` en `America/La_Paz`. ETag = hash del DTO (listas incluyen la fecha) y 304; el cliente debe usar el header `Date` del 304 como "última actualización" (RF-31). Destacadas: máx. 10. Rate limit público 1000/15 min por IP (CGNAT de operadoras móviles; `shortcut:` en memoria por proceso).
- **Fecha de inicio no anterior a hoy (CTO 2026-11-12, #18):** `fichaSchema` (crear) y `editarFichaSchema` (solo si viene `fechaInicio`) la rechazan; "hoy" es `hoyLaPaz()` de `packages/shared` (única implementación, UTC-4 fijo). `fichaCompletaSchema` no tiene la regla y es la que revalida una ficha guardada (`validarFicha`, resolver al editar, `progresoFicha`): una ficha cuya fecha quedó atrás se puede seguir editando, enviando y publicando. Una actividad de varios días ya empezada se carga con inicio hoy.
- **Hora en 12 h con a. m./p. m. (CTO 2026-11-12, #18):** se guarda `HH:MM` en 24 h; se muestra con `hora12` en la ficha y en las pantallas del habitante.
- **Pantalla inicial:** `unstable_settings.anchor = '(habitante)'` en el layout raíz. Sin ancla, expo-router ordena los grupos por largo del nombre y en nativo arranca en `(panel)/login`; en web no se nota.
- RF-14: solo `COMUNICADO_SANITARIO` es destacable (`TIPOS_DESTACABLES`). Zod 4 aplica `.default()` aun bajo `.partial()`: el default de `destacado` se aplica solo al crear (`aColumnas`). No poner `.default()` en campos de `base`.
- **Hosting (CTO 2026-11-04):** Railway descartado (trial vencido). API en **Vercel** (proyecto `colpa-belgica-conecta-api`, cuenta `jencarlosmoral2-1127`, región `gru1`): https://colpa-belgica-conecta-api.vercel.app. Postgres en **Neon** (proyecto `crimson-snow-48687079`, rama `production`, `aws-sa-east-1`, Postgres 18). Neon Auth (Better Auth) activado en la consola por decisión del CTO, **no conectado**: la app conserva su login propio. Imágenes en Cloudinary (carpeta `colpa-belgica-conecta`).
- Despliegue (corregido 2026-11-12; Preview en verde desde #16): **la integración Git de Vercel sí está activa**; cada merge a `main` despliega producción solo (#11 = cc95b12, READY, health/destacadas/salud 200). El CLI desde `git archive` queda solo como respaldo. Las ramas generan un deploy Preview que **falla siempre** (`PrismaConfigEnvError: Cannot resolve environment variable: DATABASE_URL`: el entorno Preview no tiene variables). No bloquea el código (el check `verificar` es el que cuenta), pero es ruido rojo en cada PR: desactivar Preview o hacer que `prisma.config` no exija `DATABASE_URL` en `generate` (sin dar a Preview la BD de producción). Variables de Vercel (sensitive): `DATABASE_URL` (rol `colpa_app`, pooled), `JWT_SECRET`, `TRUST_PROXY_HOPS=1`, `CLOUDINARY_*`. Secretos locales solo en `.env.neon` (gitignored; leer con dotenv o `util.parseEnv`, nunca `source`: lleva `&`).
- Base: la API usa `colpa_app` (lectura/escritura, sin UPDATE/DELETE/TRUNCATE sobre `registro_auditoria`, sin acceso a `_prisma_migrations`). Migraciones siempre como `neondb_owner` con la URL directa: ver `apps/api/prisma/rol-app.sql`. Seed demo cargado (3 cuentas `*.demo`, contraseña en `SEED_PASSWORD` de `.env.neon`) + 1 comunicado destacado publicado con imagen real.
- Riesgo aceptado: un atacante puede bloquear una cuenta ajena 15 min (inherente al RNF de bloqueo). Si el proceso cae entre reservar el 5.º intento y escribir el bloqueo, la cuenta queda sin poder entrar hasta que un admin la reactive.

## Revisiones

- Codex: Fase 0 sin defectos. Auth: 1 hallazgo (iat por segundo) corregido; `verify-fix` = fixes_root_cause. Imágenes (#4): URL construida en servidor, `verify-fix` = fixes_root_cause.
- **Codex sin cuota hasta 2026-12-03.** #6 (fix `destacado`): Codex no verificado (sin cuota); cubierto por `/code-review` + `/ponytail-review` y test que falla sin el fix. Al volver la cuota: `codex review` sobre #6 y la rama móvil.

- PR #11: **mergeado 2026-11-12** (squash cc95b12). Revisión: `/ponytail-review` sin Must; `/code-review` medium 9 hallazgos. Corregidos en el PR: un error de refetch ya no tapa datos en caché (Inicio, Salud, detalle); Próximas excluye por ids de Destacadas (antes una destacada no destacable o la 11.ª desaparecía); sello "Actualizado" = lectura más antigua; guardas `!!` contra `''` en `VistaPublicacion`; unidad educativa visible en el detalle; icono sin foto por módulo; spinner de Salud solo en refresh manual. Tests: mobile 54, shared 50, api 106; 3 de los nuevos fallan sin el fix. Codex: no verificado (sin cuota). Diferidos (con offline RF-29..31): sello desde `dataUpdatedAt`/header `Date` (en iOS un 304 resuelto por la caché nativa deja el `generadoEn` viejo), `placeholderData` del detalle desde la lista, `onError` de imágenes, fecha vencida tras medianoche hasta el próximo refetch, `error && <CajaError>` en login/FormPublicacion/RevisionPublicacion (romperían con `''`). Contenido original del PR: Inicio (destacados + próximas actividades con fecha relativa La Paz), lista de Salud, detalle público (`app/publicacion/[id].tsx`), DTO público en `packages/shared/src/dominio/publico.ts`, `VistaPublicacion` generalizada (`DatosVista`). Tests: mobile 46 (12 nuevos), shared 50, api 106; typecheck y lint OK; capturas `docs/evidencias/habitante-*.png`. Falta: `/code-review` + `/ponytail-review`, CI, merge. Desvíos: detalle fuera de las pestañas (con `href:null` dentro de Tabs, expo-router web redirigía a `/`), sello "Actualizado hoy HH:MM" (no "Última actualización"), RN `Image` (sin expo-image), Salud sin paginación (1 página de 50), captura "vacío" con respuesta interceptada.

- PR #18 (`fix/feedback-dispositivo`, correcciones de la primera prueba en teléfono): `/ponytail-review` 3 hallazgos, corregidos; `/code-review` medium 9 hallazgos, 6 corregidos y 3 rechazados (dos solo afectan a iOS/web: el contador de progreso y un aviso de fecha pasada que llega del servidor; una guarda de `Invalid Date` sin camino real); `/security-review` (Opus) sin vulnerabilidades. Codex: no verificado (sin cuota). Tests: shared 54, mobile 66, api 111, scripts 6.

## Deuda registrada

- Selector de fecha y hora nativo solo en Android (`shortcut:` en `CampoSelector`): iOS y web tipean el valor. Añadir el modal de iOS cuando se construya para iOS. En esas plataformas el contador "N de 5" cuenta como completa una fecha de inicio pasada y, al editar, el aviso llega del servidor.
- `expo start` reescribe `apps/mobile/tsconfig.json` en cada arranque (quita `.expo/types` del `include`): restaurar antes de commitear, o aceptar el formato de Expo en un PR aparte.
- 8 paquetes Expo van un parche atrás (`npx expo install --check`).

- Imágenes: sin reserva de cupos de subida ni `destroy` en Cloudinary; firmas repetidas o borrados dejan archivos huérfanos (costo, requiere funcionario autenticado). Verificar firma/carpeta con la cuenta real de Cloudinary (los tests no usan red).
- **Rotar credenciales al cerrar el proyecto (decisión del CTO):** contraseña de `neondb_owner` y API secret de Cloudinary quedaron en logs locales de esta máquina; regenerar ambos y actualizar Vercel y `.env.neon`.
- Rate limit en memoria: en Vercel es por instancia y se reinicia en cada arranque en frío; el bloqueo por cuenta (BD) sí vale. Pasar a un store compartido (p. ej. Upstash) antes de uso público real. Falta un test de `X-Forwarded-For` falsificado.
- ESLint local recorre `.claude/worktrees/` (worktrees de agentes): ignorar `.claude` en la config.
- Todo lo que la tesis debe reflejar está en [tesis-cambios.md](tesis-cambios.md). Resumen de decisiones donde la tesis calla: máx. 4 imágenes jpg/jpeg/png/webp; Publicador limitado a su unidad; Aprobador ve la cola En revisión de todas las unidades y nunca borradores; descartar prohibido si ya fue enviado a revisión; regla de vigencia de RF-15; destacado solo para comunicados sanitarios.

## Retomar aquí (siguiente sesión)

Backlog completo y fechas: [reevaluacion-2026-11-12.md](reevaluacion-2026-11-12.md#backlog-para-la-demo-19-días).

1. ~~PR `fix/robustez-demo`~~ **mergeado 2026-11-12 (#16, bded732)**, verificado en producción: el CDN responde `x-vercel-cache: HIT` al segundo pedido, el 404 sale en JSON, las imágenes llegan con `f_auto,q_auto,w_1080` y el Preview de Vercel pasó a verde. Revisión: `/ponytail-review` sin Must; `/code-review` medium con 10 hallazgos, 5 aplicados (`fechaFin` vaciable, que antes se perdía sin aviso al enviar; caché acortada a ~60 s como máximo para retiros; `imagenDto` en registrar y obtener; `existsSync` en progreso; tests de PATCH) y 5 rechazados con motivo (timeout del cuerpo, `prisma.config`, 405, constante en tests, variable de pool). Tests: shared 50, mobile 57, api 110, scripts 6. Codex: no verificado (sin cuota). `pnpm progreso` sigue en 14/35: el móvil solo tiene tests de RF-15/16, que la API ya cubría.
2. ~~Primera prueba en Expo Go (P0-3)~~ **hecha 2026-11-12**; correcciones en #18. El CTO confirmó en el teléfono los seis arreglos. Falta probar: modo avión, escala 200 %, TalkBack, botón atrás.
   **CTO, P0 que siguen abiertos:** crear cuenta Expo + `eas login`; pedir al tutor por escrito cómo mide el 30 %.
3. **P0-4/5:** `eas.json` (perfil `preview` APK) y prueba en dispositivo: imagen desde el teléfono, 200 %, TalkBack, `expo-doctor`.
4. **P1:** Publicadas con Archivar (RF-09), pantallas Cuentas y Auditoría (RF-02/03/10), rama Neon `demo-baseline` + `docs/demo.md`, PR de seguridad del login.
5. Historial del PR #11 (mergeado 2026-11-12): ver Revisiones.

## Pendiente

- Panel móvil, desvíos conocidos: un PATCH no puede vaciar campos opcionales (la API no acepta `null`; el formulario lo bloquea con aviso); `panel-revision.png` retirada de evidencias (mostraba un aviso de push inexistente), regenerar. Sin verificar: escala 200 %, TalkBack, `expo-doctor`, y todo con APK en vez de Expo Go.
- No anunciar push en la UI hasta que RF-24 exista.
- Pendiente del habitante: "Ver ficha del lugar" (RF-35, directorio), persistencia offline (TanStack Query persist + expo-sqlite, RF-29/30) y aviso "lo puede ver sin conexión" solo cuando exista.
- P-18 (detalle en revisión) sin autor ni unidad: el DTO del panel solo trae ids. Sumar nombres al DTO en un PR de API aparte.
- DRY: el DTO público ya vive en `packages/shared` (PR #11); el `PublicacionDto` del panel sigue en `apps/mobile`, moverlo también.
- Puerto 5432 ocupado en esta máquina: `DB_PORT=5440` en `.env`.
