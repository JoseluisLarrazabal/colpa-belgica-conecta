# Plan: SRS IEEE 830 y puesta en marcha del código de Colpa Bélgica Conecta (meta: demo del 30% en ~4 semanas)

## Contexto
- **El requisito.** Para avanzar, el software tiene que estar al 30%. El tutor lo mide con una **demo funcional en teléfono**, alrededor del **1-dic-2026**.
- **Estado real.** El código de la app está al **0%**. No existe ningún repo ni ningún archivo de código. Lo que sí existe es el diseño completo en el Documento PG, Cap. II (`Documento PG - Trabajo/fuente/03-cap2a..d.md`):
  - 35 RF y 41 RNF;
  - 25 casos de uso y 10 entidades;
  - 37 endpoints y 25 pantallas;
  - 80 casos de prueba, todos "Por ejecutar".
- **El stack ya figura en la tesis**, así que no se cambia sin una razón: Expo con React Native y TypeScript, Node con Express, Prisma con PostgreSQL, Railway, Cloudinary y Expo Push.
- **Decisiones del CTO (2026-11-03):**
  - la demo tiene que funcionar de punta a punta;
  - el SRS se genera en formato IEEE 830 desde las fuentes del Cap. II, sin reescribirlo a mano;
  - se usa un monorepo pnpm con GitHub privado y CI.

## Objeciones (cero complacencia, dichas una vez)
1. **El alcance completo no entra en 12 semanas.** El propio Cap. IV lo dice: UCP 123,13 equivale a 2.463 h, contra 480 h planificadas. La palanca real es aplicar DRY al dominio (ver Arquitectura), no trabajar más horas.
2. **El cronograma de "un módulo por Sprint" choca con el DRY.** M02, M03 y M04 son la *misma* entidad `publicacion`; solo cambian `modulo`, `tipo` y la ficha. El código se construye como un motor de publicaciones más su configuración. La tesis sigue reportando por módulo mediante trazabilidad por RF, sin mentir: cada RF tiene sus tests etiquetados.
3. **Push en Android no funciona en Expo Go.** Hace falta un *development build* de EAS, lo que requiere una cuenta Expo. iOS además necesita Apple Developer (USD 99/año), así que **la demo será solo en Android**. iOS queda para la fase de despliegue.
4. **"Entregadas" (RF-28) no significa "llegó al teléfono".** Los receipts de Expo confirman que FCM o APNs aceptaron el mensaje. Hay que documentarlo así en la tesis.
5. **La tesis dice "prototipos en Figma".** Los comps del bake-off (Fase 1) serán HTML. Hay dos salidas: exportarlos como evidencia y ajustar la redacción del 2.4.3, o pasarlos a Figma. Lo decide el CTO en la Fase 1.
6. **Expo SDK 58 no está verificado.** En el Sprint 0 hay que confirmar con context7 cuál es la versión estable vigente. Si no coincide, se corrige la tesis; no se fuerza la versión.

## Definición del 30% (medible, no opinable)
- **Núcleo obligatorio (13 de 35 RF, 37%).** Es el flujo completo de una campaña de vacunación:
  1. el Publicador la elabora y la envía a revisión;
  2. el Aprobador la publica;
  3. el Habitante la ve en Inicio y en Salud.
  - RF que cubre: M01 completo (RF-01 a RF-10), RF-11, RF-15 y RF-16.
- **Extensión, si sobra semana 4 (19 RF, 54%):** push al publicar y abrir la publicación (RF-24, 25, 27), y lectura sin conexión con el indicador de última actualización (RF-29, 30, 31).
- **Cómo se mide:** cada test lleva su RF en el nombre (`describe('RF-07 …')`). El script `pnpm progreso` cruza los tests verdes con la lista de los 35 RF y escribe el % real en `docs/progreso.md`. Ese archivo es evidencia para el tutor y para el Documento PG.

## Arquitectura (clean + DRY)
```
Colpa Belgica Conecta app/app/        (monorepo pnpm, git, GitHub privado)
├─ packages/shared/   ← ÚNICA fuente del contrato
│   ├─ schemas/       zod: publicacion, ficha por tipo (discriminatedUnion), funcionario, establecimiento
│   ├─ dominio/       estados.ts (tabla de transiciones Borrador→En revisión→Publicado→Archivado + rol permitido)
│   │                 permisos.ts (matriz rol×acción, Tabla 2.1/2.2 del Cap. II)
│   └─ catalogo.ts    módulos y tipos (vacunacion, jornada, entrega, comunicado_salud, actividad_escolar, …)
├─ apps/api/          Express 5 · Prisma · PostgreSQL
│   routes → controllers (finos) → services (dominio) → prisma
│   middleware: auth JWT (jti + tabla sesion_revocada), validar(zod), rateLimit login + bloqueo, helmet, pino
└─ apps/mobile/       Expo Router · react-native-paper (MD3) · TanStack Query · react-hook-form + zodResolver
    app/(habitante)/  tabs: Inicio · Salud · Educación · Eventos · Directorio
    app/(panel)/      login → Mis publicaciones · Revisión · Cuentas · Auditoría
    features/publicaciones/  ListaPublicaciones({modulo}), DetallePublicacion, FormPublicacion({tipo})
```
**Reglas DRY clave:**
- **Una sola máquina de estados**, `services/publicacion.transicionar(id, accion, funcionario)`, en `prisma.$transaction`. Valida el rol y el estado con `shared/dominio`, cambia el estado y escribe `registro_auditoria` en la misma transacción. RF-06, 07, 08 y 09, y la auditoría de RF-10, pasan *todos* por ahí.
- **Un formulario y una lista genéricos** que se alimentan de `catalogo.ts` y del schema de la ficha. Agregar el tipo "feria" es una entrada de catálogo, no una pantalla nueva.
- **Los zod schemas de `shared`** validan en la API y en los formularios del móvil, y de ellos se infieren los tipos TS. Nada se duplica.
- **El modelo de datos** sale de `diagramas/bd_relacional.puml` (10 entidades) transcrito a `schema.prisma`. Es la única fuente de la BD; la ficha va como `detalle Json`, validado por zod.
- **Offline (M06):** toda lectura del habitante pasa por TanStack Query con `persistQueryClient` sobre expo-sqlite kv-store, y las imágenes van con `expo-image` y `cachePolicy: 'disk'`. Con eso RF-29 y RF-30 salen casi solos, siempre que *ninguna* pantalla lea fuera de Query.
- **Imágenes:** subida firmada a Cloudinary. La API firma y el móvil sube directo, así la API no transporta binarios.
- **Recordatorios (RF-26):** `node-cron` dentro de la API. `shortcut: una sola instancia; pasar a Railway Cron si se escala a más de 1 réplica.`
- **Seguridad** (mapeo a MASVS y API Top 10):
  - hash argon2;
  - access token corto con revocación por `jti`;
  - bloqueo tras N intentos (RNF-20 a 27);
  - chequeo de propiedad de objeto (BOLA): el Publicador solo ve y edita lo de su `unidad`;
  - el token va en `expo-secure-store`;
  - los secretos solo en variables de entorno.

## Flujo de implementación por feature (se repite igual en cada RF)
1. Schema o regla en `packages/shared`.
2. Migración Prisma, si aplica.
3. Service, con test de integración Supertest contra un **Postgres real** de docker compose (sin mocks de BD), etiquetado con el RF.
4. Route y controller.
5. Hook de Query en el móvil.
6. Pantalla, usando los componentes genéricos.
7. Test del formulario con jest-expo y RNTL, solo en lógica con riesgo.
8. Captura de evidencia en `docs/evidencias/RF-xx.png`, para los `[PENDIENTE]` del Documento PG.

**Git:** rama `feat/rf-04-06-ficha-envio` → PR → CI verde → merge → borrar la rama (reglas 3 y 4).

## Fases (4 semanas, 40 h por semana)
**Fase 0. Cimientos, 3 al 9 de noviembre (Sprint 0)**
- Monorepo pnpm y TS estricto.
- ESLint y Prettier.
- docker-compose con Postgres.
- `schema.prisma` con las 10 entidades y una seed: unidades, 3 funcionarios (uno por rol) y 5 establecimientos de ejemplo marcados como ficticios.
- Esqueleto de Express con `/health`.
- Expo app con Router y Paper.
- Development build de EAS para Android.
- GitHub Actions: install, typecheck, lint y test de la API con un servicio postgres.
- Proyecto en Railway, entorno de pruebas: API y BD de la demo.
- `docs/handoff.md` y `docs/plan-puesta-en-marcha.md`.
- **Gate:** CI verde, `/health` desplegado y la app vacía corriendo en un teléfono Android.

**Fase 1. UI/UX, en paralelo con el final de la Fase 0 (regla 7, caso app móvil)**
- Lookup de `ui-ux-pro-max`, sembrado con los **tokens MD3 ya corregidos por contraste** del 2.4.3; no se inventa una paleta nueva.
- Bake-off con 2 comps HTML en marco de teléfono, publicados como Artifacts, de 3 pantallas: Inicio del habitante, Detalle de publicación y Ficha del Publicador.
  - A: `design-taste-frontend` más `minimalist-ui`.
  - B: `impeccable` (`shape`).
- El CTO elige.
- Los tokens se trasladan a `theme.ts` de Paper.
- Criterios fijos para público rural:
  - texto de 16 sp como mínimo y área táctil de 48 dp o más;
  - contraste AA;
  - estados vacío, error y sin conexión diseñados desde el día 1;
  - "Última actualización" siempre visible.

**Fase 2. Panel y motor de publicaciones, 10 al 16 de noviembre**
- RF-01: login, JWT, bloqueo y revocación.
- RF-02 y RF-03: cuentas y roles.
- RF-04 y RF-11: ficha genérica más el tipo vacunación.
- RF-05: imágenes con Cloudinary.
- RF-06 a RF-09: `transicionar`.
- RF-10: auditoría.
- La API queda completa para el núcleo, con los tests RF en verde.
- **Gate:** `/code-review`, `/ponytail-review` y **`/security-review`** (toca auth y roles).

**Fase 3. Experiencia del habitante y del panel en el móvil, 17 al 23 de noviembre**
- Panel: login, Mis publicaciones, formulario, bandeja de Revisión del Aprobador (publicar, devolver con observaciones, archivar), Cuentas y Auditoría.
- Habitante: Inicio con destacados (RF-16), lista y detalle de Salud (RF-15), sin login.
- **Gate:** el flujo completo funciona en Android contra el entorno de pruebas de Railway, y `pnpm progreso` da 37% o más.

**Fase 4. Extensión y ensayo de la demo, 24 al 30 de noviembre**
- Push: registrar el token (RF-25), enviar al publicar (RF-24) y abrir la publicación desde el push (RF-27).
- Offline: RF-29, RF-30 y RF-31, verificados en modo avión.
- Endurecimiento: estados de error y reintento.
- Guion de demo de 5 minutos y respaldo en video.
- Opcional: flujo Maestro que reproduce la demo.
- **Gate:** la demo corre 3 veces seguidas sin fallar, en un teléfono físico y con la seed limpia.

Después del 30%, en otro plan:
- M03 y M04, que casi todo es catálogo;
- RF-26 y RF-28;
- M07, mapa y directorio;
- iOS;
- pruebas SUS y WCAG, con la población del perfil;
- producción.

## SRS IEEE 830 (en paralelo, subagente Sonnet aparte)
- **`Documento PG - Trabajo/build_srs.py`** lee los mismos `fuente/03-cap2a..d.md` y no copia nada a mano. Reutiliza los helpers de formato ISI de `build_documento.py`; antes hay que verificar que se puedan importar, y si no, extraerlos a un módulo común.
  - Salida: `SRS_ColpaBelgicaConecta_v1.docx` y `.pdf`.
- **Estructura IEEE 830:**
  1. Introducción: propósito, alcance, definiciones, referencias y visión general.
  2. Descripción general: perspectiva, funciones, características de los usuarios (los 4 actores), restricciones, y suposiciones y dependencias (responsable designado por el GAM, conectividad).
  3. Requisitos específicos:
     - interfaces externas: usuario, hardware, software (Expo Push, Cloudinary, mapas) y comunicaciones;
     - RF-01 a RF-35 con entrada, proceso y salida;
     - RNF de rendimiento ("meta de diseño");
     - restricciones de diseño;
     - atributos: seguridad, mantenibilidad y portabilidad.
  - Apéndices: matriz de trazabilidad OE → RF → HU → CU (Tabla 2.51) y modelo de datos.
- **Se respetan las reglas duras:** "aplicación", nunca "sistema"; cero "multiplataforma"; cero cifras inventadas; APA 6 y formato ISI; sin rayas de inciso.

## Ejecución (reglas del CTO)
- Todo el código y el SRS los escriben subagentes `general-purpose` con `model: "sonnet"`, un brief por fase.
- El chairman revisa los diffs y corre `tsc`, los tests y el build.
- Los fixes los hace un Sonnet nuevo.
- Antes de cada merge: `/code-review` + `/ponytail-review`, más `/security-review` cuando toca auth o input. Al existir git, también corre el hook de Codex.
- Al salir de plan mode: copiar este plan a `app/docs/plan-puesta-en-marcha.md` y dejar el puntero en el handoff (regla 8).

## Verificación
- `pnpm -r typecheck && pnpm -r test` en verde, también en CI.
- `pnpm progreso` reporta 37% o más; la meta extendida es 54%.
- Demo en un Android físico contra el entorno de pruebas de Railway:
  1. login del Publicador, crear la campaña y enviarla;
  2. login del Aprobador y publicar;
  3. el Habitante la ve en Inicio y en Salud, sin login;
  4. extensión: llega el push y, en modo avión, se sigue leyendo con la fecha de última actualización.
- **SQL de solo lectura:** `registro_auditoria` tiene una fila por cada transición. Un Publicador de otra unidad recibe 403 al editar.
- **SRS:**
  - los 35 RF y los 41 RNF están presentes (conteo automático contra el Cap. II);
  - 0 "multiplataforma";
  - 0 "sistema" referido al producto;
  - el PDF abre bien.
