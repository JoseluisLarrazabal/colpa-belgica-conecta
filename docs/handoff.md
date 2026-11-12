# Handoff — código Colpa Bélgica Conecta

## Estado (2026-11-12)

- Plan aprobado: [plan-puesta-en-marcha.md](plan-puesta-en-marcha.md). Meta: demo del 30% ≈ 1-dic-2026 (núcleo 13 RF: RF-01..10, 11, 15, 16).
- Fuente de requisitos: `../Documentos para mi proyecto de titulacion/Documento PG - Trabajo/fuente/03-cap2a..d.md`. SRS IEEE 830 generado: `Documento PG - Trabajo/SRS_ColpaBelgicaConecta_v1.pdf` (`build_srs.py`).
- **Mergeado:** #1 Fase 0 · #2 RF-01..03 (login, cuentas, roles) · #3 diseño C · #4 RF-04..11 (motor de publicaciones, imágenes, máquina de estados, auditoría) · #6 RF-14/15/16 (destacar comunicado, lectura pública del habitante, destacados) · #8 app móvil: panel del funcionario · #10 Neon + API en Vercel · #11 pantallas del habitante (Inicio, Salud, detalle).
- **Progreso real: 14/35 RF (40 %)** (`pnpm progreso`). Todo lo contado es API. App móvil: panel del funcionario mergeado (login, Mis publicaciones, ficha con imágenes y destacado, Revisión); verificado en web y tests, **no en dispositivo**. Pantallas del habitante mergeadas (#11, 2026-11-12); verificadas con tests y web, **no en dispositivo**. API pública en producción: https://colpa-belgica-conecta-api.vercel.app.

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
- `TRUST_PROXY_HOPS` obligatorio en producción (Railway = 1).
- Lectura pública (RF-15/16): DTO por lista blanca (sin observaciones, autor ni ids internos). Vigencia = `fechaFin ?? fechaInicio >= hoy` en `America/La_Paz`. ETag = hash del DTO (listas incluyen la fecha) y 304; el cliente debe usar el header `Date` del 304 como "última actualización" (RF-31). Destacadas: máx. 10. Rate limit público 1000/15 min por IP (CGNAT de operadoras móviles; `shortcut:` en memoria por proceso).
- RF-14: solo `COMUNICADO_SANITARIO` es destacable (`TIPOS_DESTACABLES`). Zod 4 aplica `.default()` aun bajo `.partial()`: el default de `destacado` se aplica solo al crear (`aColumnas`). No poner `.default()` en campos de `base`.
- **Hosting (CTO 2026-11-04):** Railway descartado (trial vencido). API en **Vercel** (proyecto `colpa-belgica-conecta-api`, cuenta `jencarlosmoral2-1127`, región `gru1`): https://colpa-belgica-conecta-api.vercel.app. Postgres en **Neon** (proyecto `crimson-snow-48687079`, rama `production`, `aws-sa-east-1`, Postgres 18). Neon Auth (Better Auth) activado en la consola por decisión del CTO, **no conectado**: la app conserva su login propio. Imágenes en Cloudinary (carpeta `colpa-belgica-conecta`).
- Despliegue (corregido 2026-11-12): **la integración Git de Vercel sí está activa**; cada merge a `main` despliega producción solo (#11 = cc95b12, READY, health/destacadas/salud 200). El CLI desde `git archive` queda solo como respaldo. Las ramas generan un deploy Preview que **falla siempre** (`PrismaConfigEnvError: Cannot resolve environment variable: DATABASE_URL`: el entorno Preview no tiene variables). No bloquea el código (el check `verificar` es el que cuenta), pero es ruido rojo en cada PR: desactivar Preview o hacer que `prisma.config` no exija `DATABASE_URL` en `generate` (sin dar a Preview la BD de producción). Variables de Vercel (sensitive): `DATABASE_URL` (rol `colpa_app`, pooled), `JWT_SECRET`, `TRUST_PROXY_HOPS=1`, `CLOUDINARY_*`. Secretos locales solo en `.env.neon` (gitignored; leer con dotenv o `util.parseEnv`, nunca `source`: lleva `&`).
- Base: la API usa `colpa_app` (lectura/escritura, sin UPDATE/DELETE/TRUNCATE sobre `registro_auditoria`, sin acceso a `_prisma_migrations`). Migraciones siempre como `neondb_owner` con la URL directa: ver `apps/api/prisma/rol-app.sql`. Seed demo cargado (3 cuentas `*.demo`, contraseña en `SEED_PASSWORD` de `.env.neon`) + 1 comunicado destacado publicado con imagen real.
- Riesgo aceptado: un atacante puede bloquear una cuenta ajena 15 min (inherente al RNF de bloqueo). Si el proceso cae entre reservar el 5.º intento y escribir el bloqueo, la cuenta queda sin poder entrar hasta que un admin la reactive.

## Revisiones

- Codex: Fase 0 sin defectos. Auth: 1 hallazgo (iat por segundo) corregido; `verify-fix` = fixes_root_cause. Imágenes (#4): URL construida en servidor, `verify-fix` = fixes_root_cause.
- **Codex sin cuota hasta 2026-12-03.** #6 (fix `destacado`): Codex no verificado (sin cuota); cubierto por `/code-review` + `/ponytail-review` y test que falla sin el fix. Al volver la cuota: `codex review` sobre #6 y la rama móvil.

## Deuda registrada

- Imágenes: sin reserva de cupos de subida ni `destroy` en Cloudinary; firmas repetidas o borrados dejan archivos huérfanos (costo, requiere funcionario autenticado). Verificar firma/carpeta con la cuenta real de Cloudinary (los tests no usan red).
- **Rotar credenciales al cerrar el proyecto (decisión del CTO):** contraseña de `neondb_owner` y API secret de Cloudinary quedaron en logs locales de esta máquina; regenerar ambos y actualizar Vercel y `.env.neon`.
- Rate limit en memoria: en Vercel es por instancia y se reinicia en cada arranque en frío; el bloqueo por cuenta (BD) sí vale. Pasar a un store compartido (p. ej. Upstash) antes de uso público real. Falta un test de `X-Forwarded-For` falsificado.
- ESLint local recorre `.claude/worktrees/` (worktrees de agentes): ignorar `.claude` en la config.
- Decisiones donde la tesis calla (reflejar en el Documento PG): máx. 4 imágenes jpg/jpeg/png/webp; Publicador limitado a su unidad; Aprobador ve la cola En revisión de todas las unidades y nunca borradores; descartar prohibido si ya fue enviado a revisión; regla de vigencia de RF-15; destacado solo para comunicados sanitarios.

## Retomar aquí (siguiente sesión)

1. ~~PR #11~~ **mergeado 2026-11-12** (squash cc95b12). Revisión: `/ponytail-review` sin Must; `/code-review` medium 9 hallazgos. Corregidos en el PR: un error de refetch ya no tapa datos en caché (Inicio, Salud, detalle); Próximas excluye por ids de Destacadas (antes una destacada no destacable o la 11.ª desaparecía); sello "Actualizado" = lectura más antigua; guardas `!!` contra `''` en `VistaPublicacion`; unidad educativa visible en el detalle; icono sin foto por módulo; spinner de Salud solo en refresh manual. Tests: mobile 54, shared 50, api 106; 3 de los nuevos fallan sin el fix. Codex: no verificado (sin cuota). Diferidos (con offline RF-29..31): sello desde `dataUpdatedAt`/header `Date` (en iOS un 304 resuelto por la caché nativa deja el `generadoEn` viejo), `placeholderData` del detalle desde la lista, `onError` de imágenes, fecha vencida tras medianoche hasta el próximo refetch, `error && <CajaError>` en login/FormPublicacion/RevisionPublicacion (romperían con `''`). Contenido original del PR: Inicio (destacados + próximas actividades con fecha relativa La Paz), lista de Salud, detalle público (`app/publicacion/[id].tsx`), DTO público en `packages/shared/src/dominio/publico.ts`, `VistaPublicacion` generalizada (`DatosVista`). Tests: mobile 46 (12 nuevos), shared 50, api 106; typecheck y lint OK; capturas `docs/evidencias/habitante-*.png`. Falta: `/code-review` + `/ponytail-review`, CI, merge. Desvíos: detalle fuera de las pestañas (con `href:null` dentro de Tabs, expo-router web redirigía a `/`), sello "Actualizado hoy HH:MM" (no "Última actualización"), RN `Image` (sin expo-image), Salud sin paginación (1 página de 50), captura "vacío" con respuesta interceptada.
2. **Prueba en teléfono** (riesgo principal: nada corrió aún en un dispositivo): Expo Go en el Android del CTO, `EXPO_PUBLIC_API_URL=https://colpa-belgica-conecta-api.vercel.app`, recorrer el núcleo: publicador crea y envía, aprobador publica, habitante lo ve en Inicio y Salud. Cuentas `publicador.demo` / `aprobador.demo` / `admin.demo` (contraseña: `SEED_PASSWORD` en `.env.neon`). Verificar subida de imagen desde el teléfono, escala 200 % y TalkBack. Confirmar que Expo Go soporta SDK 58.
3. Con el núcleo verificado en teléfono, `pnpm progreso` debería reflejar el 30 % comprometido; luego extensión: push (RF-24/25/27, requiere cuenta Expo + EAS) y offline (RF-29..31).
4. La API no envía CORS: no afecta a la app nativa; solo a Expo web (las capturas usaron un proxy local).

## Pendiente

- CTO: cuenta Expo + `eas login` cuando lleguemos al push (development build Android). Instalar Expo Go en el teléfono para probar el núcleo.
- Panel móvil, desvíos conocidos: fechas/horas como texto; un PATCH no puede vaciar campos opcionales (la API no acepta `null`; el formulario lo bloquea con aviso); `panel-revision.png` retirada de evidencias (mostraba un aviso de push inexistente), regenerar. Sin verificar: dispositivo Android, subida real a Cloudinary, escala 200 %, TalkBack, `expo-doctor`.
- No anunciar push en la UI hasta que RF-24 exista.
- Pendiente del habitante: "Ver ficha del lugar" (RF-35, directorio), persistencia offline (TanStack Query persist + expo-sqlite, RF-29/30) y aviso "lo puede ver sin conexión" solo cuando exista.
- P-18 (detalle en revisión) sin autor ni unidad: el DTO del panel solo trae ids. Sumar nombres al DTO en un PR de API aparte.
- DRY: el DTO público ya vive en `packages/shared` (PR #11); el `PublicacionDto` del panel sigue en `apps/mobile`, moverlo también.
- Puerto 5432 ocupado en esta máquina: `DB_PORT=5440` en `.env`.
