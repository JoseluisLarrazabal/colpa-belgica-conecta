# Handoff — código Colpa Bélgica Conecta

## Estado (2026-11-04)

- Plan aprobado: [plan-puesta-en-marcha.md](plan-puesta-en-marcha.md). Meta: demo del 30% ≈ 1-dic-2026 (núcleo 13 RF: RF-01..10, 11, 15, 16).
- Fuente de requisitos: `../Documentos para mi proyecto de titulacion/Documento PG - Trabajo/fuente/03-cap2a..d.md`. SRS IEEE 830 generado: `Documento PG - Trabajo/SRS_ColpaBelgicaConecta_v1.pdf` (`build_srs.py`).
- **Mergeado:** #1 Fase 0 · #2 RF-01..03 (login, cuentas, roles) · #3 diseño C · #4 RF-04..11 (motor de publicaciones, imágenes, máquina de estados, auditoría) · #6 RF-14/15/16 (destacar comunicado, lectura pública del habitante, destacados).
- **Progreso real: 14/35 RF (40 %)** (`pnpm progreso`). Todo lo contado es API. App móvil: panel del funcionario en rama `feat/mobile-panel` (en revisión, sin mergear); pantallas del habitante sin empezar. La demo del tutor exige ambas.

## Diseño (aprobado por el CTO 2026-11-04)

- **Propuesta C**: [docs/diseno/propuesta-C.html](diseno/propuesta-C.html) · Artifact https://claude.ai/artifact/Et1g1rFrtSEWQZQKvmDJNP
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
- Riesgo aceptado: un atacante puede bloquear una cuenta ajena 15 min (inherente al RNF de bloqueo). Si el proceso cae entre reservar el 5.º intento y escribir el bloqueo, la cuenta queda sin poder entrar hasta que un admin la reactive.

## Revisiones

- Codex: Fase 0 sin defectos. Auth: 1 hallazgo (iat por segundo) corregido; `verify-fix` = fixes_root_cause. Imágenes (#4): URL construida en servidor, `verify-fix` = fixes_root_cause.
- **Codex sin cuota hasta 2026-12-03.** #6 (fix `destacado`): Codex no verificado (sin cuota); cubierto por `/code-review` + `/ponytail-review` y test que falla sin el fix. Al volver la cuota: `codex review` sobre #6 y la rama móvil.

## Deuda registrada

- Imágenes: sin reserva de cupos de subida ni `destroy` en Cloudinary; firmas repetidas o borrados dejan archivos huérfanos (costo, requiere funcionario autenticado). Verificar firma/carpeta con la cuenta real de Cloudinary (los tests no usan red).
- Auditoría: en producción, si el rol de la app no es dueño de la tabla, `REVOKE UPDATE, DELETE, TRUNCATE` sobre `registro_auditoria`.
- Decisiones donde la tesis calla (reflejar en el Documento PG): máx. 4 imágenes jpg/jpeg/png/webp; Publicador limitado a su unidad; Aprobador ve la cola En revisión de todas las unidades y nunca borradores; descartar prohibido si ya fue enviado a revisión; regla de vigencia de RF-15; destacado solo para comunicados sanitarios.

## Pendiente

- CTO: `railway login` y `eas login` (entorno de pruebas y development build Android).
- En curso: cerrar `feat/mobile-panel` (fixes de revisión en marcha: borrador duplicado al reintentar envío, switch de destacado, logout local primero, URL https obligatoria en release, errores solo tras tocar, Roboto en web).
- Siguiente: pantallas del habitante (Inicio con destacados + próximas actividades, Salud, detalle con "Ver ficha del lugar", sello de frescura, persistencia offline con TanStack Query persist + expo-sqlite).
- P-18 (detalle en revisión) sin autor ni unidad: el DTO del panel solo trae ids. Sumar nombres al DTO en un PR de API aparte.
- DRY: tipos de respuesta (`PublicacionDto`) declarados en `apps/mobile`; moverlos a `packages/shared`.
- Puerto 5432 ocupado en esta máquina: `DB_PORT=5440` en `.env`.
