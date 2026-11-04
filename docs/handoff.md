# Handoff — código Colpa Bélgica Conecta

## Estado (2026-11-04)

- Plan aprobado: [plan-puesta-en-marcha.md](plan-puesta-en-marcha.md). Meta: demo del 30% ≈ 1-dic-2026 (núcleo 13 RF: RF-01..10, 11, 15, 16).
- Fuente de requisitos: `../Documentos para mi proyecto de titulacion/Documento PG - Trabajo/fuente/03-cap2a..d.md`. SRS IEEE 830 generado: `Documento PG - Trabajo/SRS_ColpaBelgicaConecta_v1.pdf` (`build_srs.py`).
- **Mergeado:** #1 Fase 0 (monorepo, esquema, CI) · #2 RF-01..03 (login, cuentas, roles).
- **En curso:** `feat/rf-04-11-publicaciones` (motor de publicaciones, imágenes, máquina de estados, auditoría).
- **Progreso real: 3/35 RF** (`pnpm progreso`; solo tests de `apps/*` sin fallos).

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
- Riesgo aceptado: un atacante puede bloquear una cuenta ajena 15 min (inherente al RNF de bloqueo). Si el proceso cae entre reservar el 5.º intento y escribir el bloqueo, la cuenta queda sin poder entrar hasta que un admin la reactive.

## Revisiones

- Codex vuelve a tener cuota (cuenta nueva, 2026-11-04). Fase 0: sin defectos. Auth: 1 hallazgo (iat por segundo) corregido; `verify-fix` = fixes_root_cause.

## Pendiente

- CTO: `railway login` y `eas login` (entorno de pruebas y development build Android).
- Siguiente: RF-15/16 (lectura del habitante) + app móvil del panel con el diseño C.
- Puerto 5432 ocupado en esta máquina: `DB_PORT=5440` en `.env`.
