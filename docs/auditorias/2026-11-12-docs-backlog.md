# Auditoría de documentación y backlog — Colpa Bélgica Conecta

Fecha: 2026-11-12 (quedan 19 días para la demo ≈ 1-dic-2026). Auditoría de solo lectura: no se editó nada.
Rutas abreviadas: `app/` = `/home/shadowfreak/Documents/Colpa Belgica Conecta app/app`; `fuente/` = `.../Documento PG - Trabajo/fuente`; `PG/` = `.../Documento PG - Trabajo`.

Nota de premisa: los casos de prueba (80 CP) no están en el Cap. II (03-cap2a..d) sino en el **Cap. III** (`fuente/04-cap3.md:144-218`, total en `:511`). El plan también lo atribuye mal (`app/docs/plan-puesta-en-marcha.md:9`).

---

## A. El 30 % y lo que el tutor verá en el teléfono (lo más grave)

### A1. `pnpm progreso` NO lee los tests del móvil, y nadie lo sabe — ALTO

- **Qué:** el script solo corre las apps que tienen un archivo `jest.config*`. `apps/mobile` define Jest en `package.json` (`"jest": {"preset": "jest-expo"}`) y no tiene ningún `jest.config`, así que se salta en silencio. Los tests del móvil etiquetados `RF-15`/`RF-16` (`apps/mobile/__tests__/Habitante.test.tsx:74,121,146,171,193`) nunca cuentan.
- **Evidencia:** `app/scripts/progreso.mjs:69-71` (filtro `f.startsWith('jest.config')`); `app/apps/mobile/package.json` (clave `jest`); `ls apps/mobile` (sin jest.config); `apps/api/jest.config.cjs` (existe).
- **Consecuencia:** el handoff dice "Todo lo contado es API" (`app/docs/handoff.md:8`) como si fuera una decisión; es un efecto colateral de un bug del detector. El README promete que cuentan "los tests de `apps/*`" (`app/README.md`, sección Comandos), lo que es falso para mobile.
- **Cambio:** backlog P0 (Sonnet): detectar Jest por `jest.config*` **o** por la clave `jest` en `package.json`, con un test en `scripts/progreso.test.mjs` que cubra ese caso. Luego regenerar `docs/progreso.md`.

### A2. La métrica cuenta "RF con test de API verde", no "RF demostrable en el teléfono" — ALTO

- **Qué:** de los 14 RF contados, **4 no tienen camino en la UI del teléfono**:
  - RF-02, RF-03 (cuentas y roles) y RF-10 (auditoría): el panel del Administrador muestra literalmente "La gestión de cuentas y la auditoría estarán disponibles en la próxima versión" (`app/apps/mobile/app/(panel)/inicio.tsx:53`). No hay pantallas en `app/(panel)/` (solo `inicio`, `login`, `publicaciones/*`, `revision/*`).
  - RF-09 (archivar): el botón Archivar existe (`features/publicaciones/RevisionPublicacion.tsx:78-83`) pero solo para una publicación en estado PUBLICADO, y el Aprobador solo puede llegar a la cola `EN_REVISION` (`app/(panel)/revision/index.tsx:17`, `inicio.tsx` PanelAprobador). Tras publicar, la pantalla hace `router.dismissTo('/(panel)/revision')` (`RevisionPublicacion.tsx:42`) y la publicación desaparece de la cola. **No hay ruta de UI para archivar.** (Verificado leyendo código; no verificado en dispositivo.)
- **Cuenta honesta en el teléfono:** RF-01, 04, 05, 06, 07, 08, 11, 14, 15, 16 = **10/35 = 28,6 %**, por debajo del 30 %, y eso suponiendo que la prueba en dispositivo pase (nunca se hizo).
- **Lo que preguntará un tutor escéptico:** "muéstreme crear una cuenta, cambiar un rol, ver la auditoría y archivar desde el teléfono". La propia tesis dice que el Sprint 1 entrega HU-01 a HU-10 "de extremo a extremo" (`fuente/03-cap2d.md:225`).
- **Cambio en `progreso.md`/script:** reportar tres columnas por RF: `API` (test de integración), `Móvil` (test de UI), `Dispositivo` (evidencia manual con fecha y captura en `docs/evidencias/RF-xx-*.png`). El titular del avance debe ser "RF demostrables en teléfono" (las tres en verde); el actual pasa a llamarse "RF con API probada".
- **Cambio en el handoff:** `handoff.md:8` "Progreso real: 14/35 RF (40 %)" → "RF con API probada: 14/35 (40 %). RF demostrables en el teléfono: 0 verificados (10 con pantalla, sin probar en dispositivo). Sin UI: RF-02, 03, 09, 10."

### A3. Tres cifras distintas para el mismo objetivo — MEDIO

- `handoff.md:5` "núcleo 13 RF" · `handoff.md:8` "14/35 (40 %)" · `plan:25` "13 de 35 RF, 37 %" · `plan:117,159` "37 % o más" · memoria del proyecto "núcleo 13 RF". RF-14 entró al núcleo de hecho (está en progreso.md) pero no en la definición.
- **Cambio:** redefinir el núcleo en el plan como 14 RF (agregar RF-14) y usar una sola cifra en todos lados.

### A4. Nadie dejó por escrito cómo mide el tutor el 30 % — ALTO

- **Qué:** el plan afirma "El tutor lo mide con una demo funcional en teléfono" (`plan:4`) sin fuente. La métrica elegida (RF/35) es una decisión interna. El tutor puede medir de otra forma:
  - **por módulos:** M01 + M02 completos = 2/7 = **28,6 %** (no llega);
  - **por UCP** (la tesis usa UCP 123,13 en el Cap. IV): no calculado (**no verificado**);
  - **por pantallas** (25 en la tesis): hay unas 10 rutas en el móvil (**no verificado** contra la lista de la tesis).
- **Cambio:** backlog P0 (CTO): pedirle al tutor el criterio por escrito (correo o acta) y guardarlo en `docs/`. Mientras tanto, apuntar a superar el 30 % con cualquier lectura: M01 + M02 completos en el teléfono **más** offline (RF-29..31) da 19/35 = 54 % por RF y 2 módulos más 3/4 de M06 por módulos.

### A5. Los 80 casos de prueba de la tesis no se pueden rastrear desde los tests — MEDIO

- **Qué:** la tesis tiene los CP-U/CP-I/... "Por ejecutar" (`fuente/04-cap3.md:144-187`). Ningún test del repo lleva un ID de CP (`grep CP-` en `apps/` y `packages/` = 0). Para llenar las evidencias del Sprint 1 y 2 (`fuente/03-cap2d.md:227,233`) y los resultados del Cap. III (`04-cap3.md:161,191`), el CTO necesita "CP-I-03 ejecutado, verde, fecha X".
- **Cambio:** backlog P2 (Sonnet, barato): agregar el ID de CP al nombre de los tests que ya lo cubren (p. ej. `describe('RF-06 CP-U-01 …')`) y que `progreso.mjs` emita también una tabla CP → estado. Sin código nuevo de producto.

### A6. `progreso.md` está viejo — BAJO

- Generado el 2026-11-04 (`docs/progreso.md:3`); después se mergearon #8, #10 y #11. Hoy no cambiaría la cifra (por A1), pero la fecha contradice el "(pnpm progreso)" del handoff del 12-nov.
- **Cambio:** regenerar después de arreglar A1, y hacerlo parte del cierre de cada PR (regla 5).

---

## B. Riesgo de la demo: cosas que faltan en el backlog

### B1. Nada corrió nunca en un teléfono; el gate de la Fase 0 falló y no quedó registrado — ALTO

- El plan exigía "la app vacía corriendo en un teléfono Android" como gate de la Fase 0 (`plan:89`) y "el flujo completo funciona en Android" como gate de la Fase 3 (`plan:117`). Ninguno se cumplió; el handoff lo menciona como riesgo (`handoff.md:48`) pero no como gate incumplido. Se avanzó a 3 PRs de móvil (#8, #11) sin un solo arranque en dispositivo.
- **Cambio:** registrar en el plan "Gate Fase 0: incumplido (sin dispositivo); Gate Fase 3: pendiente" y poner la prueba en dispositivo como P0 del día 1.

### B2. No hay camino de APK: Expo Go es frágil para la demo y la tesis dice EAS — ALTO

- **Qué:**
  - `app.json` no tiene `android.package`, no hay `eas.json` ni `extra.eas.projectId` (`app/apps/mobile/app.json`; `ls -a apps/mobile`). No se puede compilar con EAS tal como está.
  - La cuenta Expo está aplazada "cuando lleguemos al push" (`handoff.md:54`).
  - Expo Go en Play Store solo soporta **un** SDK a la vez; si ya no es el 58, la app no abre. El plan pedía confirmarlo en el Sprint 0 (`plan:22`) y sigue abierto (`handoff.md:48`). **No verificado** qué SDK soporta hoy Expo Go.
  - Expo Go necesita que el teléfono alcance el servidor Metro de la laptop (misma Wi-Fi o túnel). En la oficina del tutor eso es un punto de falla extra.
  - La propia tesis define el entorno de pruebas como "Compilación interna de EAS Build instalada en dispositivos de prueba" (`fuente/03-cap2d.md:339`). Hacer la demo en Expo Go contradice lo escrito.
- **Cambio:** backlog P0 (CTO + Sonnet, 0,5 a 1 día): crear la cuenta Expo **ahora**, agregar `android.package`, `eas.json` con un perfil `preview` (APK, distribución interna) que fije `EXPO_PUBLIC_API_URL=https://colpa-belgica-conecta-api.vercel.app`, compilar e instalar el APK. Expo Go queda solo para iterar. **No verificado:** cómo llega hoy `EXPO_PUBLIC_API_URL` al bundle (no se leyeron archivos `.env*`); `lib/api.ts:36-39` aborta si falta o si no es https en release.

### B3. No hay guion de demo, procedimiento de reinicio de datos ni video de respaldo — ALTO

- El plan los pone en la Fase 4 (`plan:123,125`: guion de 5 minutos, video, "3 veces seguidas con la seed limpia"), pero el handoff no los tiene en "Retomar aquí" ni en "Pendiente".
- **Reinicio de datos:** no existe. El seed se niega a correr con `NODE_ENV=production` (`apps/api/prisma/seed.ts:47`) y no borra publicaciones. `colpa_app` no puede borrar `registro_auditoria` (`handoff.md:29`). Borrar la auditoría de la rama `production` a mano sería incoherente con el RNF de auditoría de solo inserción.
- **Cambio:** backlog P1:
  1. `docs/demo.md` (lo escribe el chairman): pasos con las cuentas `*.demo`, qué se toca en cada pantalla, qué RF se muestra en cada paso, el plan B si falla la red y los tiempos.
  2. Una **rama Neon `demo`** creada desde `production` después del seed; para reiniciar se usa "reset from parent" de Neon. Así nunca se borra la auditoría a mano. **No verificado** si el plan de Neon permite reiniciar la rama y si el proyecto de Vercel puede apuntar a ella sin tocar producción (otra variable o un deploy aparte).
  3. Video grabado del recorrido completo en el teléfono, a más tardar el 28-nov.
  4. Ensayo de 3 corridas seguidas el 29 o 30-nov.

### B4. Subida de imagen desde el teléfono a Cloudinary nunca probada — ALTO

- `handoff.md:39` ("los tests no usan red") y `:55` ("Sin verificar: … subida real a Cloudinary"). RF-05 está contado como verde con firma simulada. En la demo es el paso con más partes móviles (permiso de galería, firma, subida directa, registro).
- **Cambio:** incluirlo explícitamente en la prueba en dispositivo P0; si falla, es lo primero que se arregla.

### B5. El backlog del handoff no tiene las pantallas que faltan para el 30 % demostrable — ALTO

- Las pantallas de Cuentas y Auditoría estaban en el plan (`plan:46,115`) y desaparecieron del backlog: no figuran en "Retomar aquí" ni en "Pendiente" (`handoff.md:45-60`). Tampoco figura la lista de "Publicadas" del Aprobador para archivar (A2).
- **Cambio:** agregar al handoff, en "Retomar aquí": "Pantallas Cuentas (RF-02, 03), Auditoría (RF-10) y Publicadas del Aprobador con Archivar (RF-09). La API ya existe."

### B6. RF-12 y RF-13 casi gratis y fuera del backlog — MEDIO

- Los tipos `JORNADA_ATENCION` y `ENTREGA_MEDICAMENTOS` ya existen en el catálogo, en Prisma y en las etiquetas del móvil (`packages/shared/src/catalogo.ts:3`, `schema.prisma:42-43`, `features/publicaciones/etiquetas.ts:11-12`). Solo les faltan sus campos propios en `EXTRAS` (`packages/shared/src/schemas/publicacion.ts:31-33`, hoy solo vacunación) y tests etiquetados RF-12 y RF-13 (CP-U-07).
- Con eso se cierra **M02 completo**, que es lo que la tesis promete para el Sprint 2 (30-nov al 6-dic, `fuente/03-cap2a.md:70`, `03-cap2d.md:233`) y coincide con la fecha de la demo.
- **Cambio:** backlog P2, alrededor de 1 día con Sonnet. Antes, confirmar en la ficha de la tesis cuáles son los campos propios de jornada y entrega.

### B7. Accesibilidad del Cap. II no verificada en dispositivo — MEDIO

- 200 %, TalkBack y `expo-doctor` siguen "sin verificar" (`handoff.md:48,55`). Son RNF-03 y RNF-04, que el diseño C presume (P-03 al 200 %).
- **Cambio:** que la prueba P0 tenga una lista de verificación: escala 200 %, TalkBack en Inicio y en el detalle, `npx expo-doctor`.

### B8. Codex no estará disponible antes de la demo — BAJO (registrar)

- Sin cuota hasta el 2026-12-03 (`handoff.md:35`), después de la demo. #6, #8, #10 y #11 tienen Codex "no verificado".
- **Cambio:** decirlo en el plan: "Codex no participa en el ciclo de la demo; pasada de Codex sobre #6..#11 el 3-dic".

### B9. El cuerpo del PR #11 quedó como borrador — BAJO

- `gh pr view 11` muestra "Borrador … Pendiente: /code-review, /ponytail-review, prueba en dispositivo". Ya está mergeado y revisado según `handoff.md:47`. Cualquiera que lea el PR ve las revisiones como pendientes.
- **Cambio:** actualizar el cuerpo del PR #11 con el resumen de revisión que ya está en el handoff.

---

## C. Backlog propuesto para los 19 días (orden de prioridad)

Esfuerzo estimado en días de trabajo efectivo, con implementación por Sonnet y verificación del CTO. **No verificado** cuántas horas por día tiene el CTO, que además tiene pendientes las correcciones v12 del tutor sobre el Documento PG (`PG/handoff.md:174-176`), que compiten por el mismo tiempo.

| #    | Ítem                                                                                                                                                                                                                   | RF/objetivo              | Esfuerzo          | Fecha límite |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ----------------- | ------------ |
| P0-1 | Cuenta Expo, `android.package`, `eas.json` preview APK con la URL de la API, compilar e instalar                                                                                                                       | habilita todo            | 0,5–1 d           | 14-nov       |
| P0-2 | Prueba en dispositivo del núcleo (Publicador crea con imagen y envía; Aprobador publica y devuelve; Habitante ve en Inicio y Salud) + 200 %, TalkBack, `expo-doctor`; capturas `docs/evidencias/RF-xx-dispositivo.png` | RF-01,04..08,11,14..16   | 1 d + fixes 1–2 d | 16-nov       |
| P0-3 | Arreglar el detector de `progreso.mjs` (A1) y agregar las columnas API / Móvil / Dispositivo (A2)                                                                                                                      | métrica                  | 0,5 d             | 15-nov       |
| P0-4 | Pedirle al tutor el criterio del 30 % por escrito (A4)                                                                                                                                                                 | —                        | CTO               | 15-nov       |
| P1-1 | Pantalla "Publicadas" del Aprobador con Archivar (reusa `ListaPublicaciones` con `estado="PUBLICADO"`)                                                                                                                 | RF-09                    | 0,5 d             | 18-nov       |
| P1-2 | Pantallas Cuentas (lista, alta, edición, desactivación, rol) y Auditoría (lista cronológica) del Administrador; API ya existe                                                                                          | RF-02, 03, 10            | 2–3 d             | 21-nov       |
| P1-3 | Rama Neon `demo` + procedimiento de reinicio + `docs/demo.md` (guion)                                                                                                                                                  | demo                     | 0,5 d             | 22-nov       |
| P2-1 | Campos propios de jornada y entrega + tests                                                                                                                                                                            | RF-12, 13 (M02 completo) | 1 d               | 23-nov       |
| P2-2 | Offline: persistencia de Query + sello desde `dataUpdatedAt`/`Date` + aviso sin conexión (ya diferido en `handoff.md:47,57`)                                                                                           | RF-29, 30, 31            | 2–3 d             | 26-nov       |
| P2-3 | IDs de CP en los nombres de los tests (A5)                                                                                                                                                                             | evidencia tesis          | 0,5 d             | 26-nov       |
| P3-1 | Video de respaldo + 3 corridas seguidas con la rama reiniciada                                                                                                                                                         | demo                     | 1 d               | 28–30-nov    |
| —    | Margen para fallos del dispositivo                                                                                                                                                                                     | —                        | 2–3 d             | —            |

Total: unos 13–16 días de 19. No hay margen para push.

**Cortar o diferir hasta después de la demo:**

- **Push RF-24, 25, 27:** exige un development build, credenciales FCM y la cuenta Expo; el plan lo puso como extensión (`plan:30,120`), pero es el ítem de más riesgo por RF ganado. Si se aplica P2-2, el 54 % se alcanza con offline, sin push. Además, `handoff.md:56` ya prohíbe anunciarlo en la UI.
- Flujo Maestro (`plan:124`).
- RF-35 "Ver ficha del lugar" (`handoff.md:57`), autor y unidad en P-18 (`:58`), mover `PublicacionDto` a shared (`:59`).
- Upstash para el rate limit (`:41`) y el test de `X-Forwarded-For` falsificado: después de la demo.
- Arreglar el Preview rojo de Vercel (`:28`): ruido, no bloquea. Para hacerlo barato, desactivar Preview en la consola, sin tocar código.
- Neon Auth activado y no conectado (`:27`): desactivarlo o dejarlo anotado como fuera de alcance. No suma nada a la demo y es superficie extra.

---

## D. Puntos de la tesis que hay que reescribir: lista incompleta y dispersa

Hoy están desperdigados en el handoff del código (`handoff.md:17,23,43`). El handoff del Documento PG, que es donde se trabaja la tesis, **no menciona ninguno** de los cambios que vienen del código: Vercel/Neon, cifras de RNF-24, contrato de imágenes, decisiones donde la tesis calla (`PG/handoff.md`; solo `:167` lista Figma como `[PENDIENTE]` de Sprint 0).

- **Cambio:** crear **una sola** sección "Cambios del código que la tesis debe reflejar" en `PG/handoff.md` (o en `app/docs/tesis-pendientes.md` enlazado desde los dos handoffs), con la ubicación exacta de cada uno. Lista completa encontrada:

| #   | Tema                                                                                                         | Dónde dice lo viejo                                                                                                                                                                                                                                                                                                                                                                                                                        | Qué cambió                                                                                                                                                                                                                                                                                                                                                 | Estado en los docs                                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | Hosting Railway → Vercel + Neon                                                                              | `03-cap2c.md:323`; `03-cap2d.md:339-346` (Tabla de entornos y título 2.7.2), `:378`; `04-cap3.md:83,353,361-362,385-386`; `05-cap4.md:196,227-228` (Tabla 4.13: USD 1.575 / 159 por año calculados con Railway); `06-cap5.md:9,17,85` (respaldos 6/27/89 días de Railway), `:91`; `diagramas/despliegue.puml:14`; bibliografía `90-bibliografia.md:171-177`; también el SRS v1 ya generado (`SRS_ColpaBelgicaConecta_v1.pdf`, 4 menciones) | API en Vercel (gru1), Postgres en Neon (sa-east-1, PG 18)                                                                                                                                                                                                                                                                                                  | **Falta en la lista.** El handoff registra la decisión (`handoff.md:27`) pero no que la tesis deba cambiar, ni los costos ni los respaldos |
| D2  | RNF-21 "salvo la conexión interna de la API con la base de datos"                                            | `03-cap2c.md:323`, `03-cap2d.md:346`                                                                                                                                                                                                                                                                                                                                                                                                       | Con Neon, la conexión API→BD sale por internet con TLS; deja de ser interna                                                                                                                                                                                                                                                                                | **Falta**                                                                                                                                  |
| D3  | Planificador de recordatorios "dentro del servicio de la API" (node-cron)                                    | `03-cap2d.md:346`; `plan:56`                                                                                                                                                                                                                                                                                                                                                                                                               | En serverless no hay proceso persistente: hace falta Vercel Cron o un planificador externo. **No verificado** el límite actual de cron del plan Hobby; si es diario, no alcanza para la anticipación libre de RF-26                                                                                                                                        | **Falta** (afecta a RF-26, que es post-demo)                                                                                               |
| D4  | RNF-24 (intentos y duración "se fijan en el Sprint 1") y RNF-22                                              | `03-cap2a.md:418,420`; CP-U-13 `04-cap3.md:156`                                                                                                                                                                                                                                                                                                                                                                                            | 5 intentos / 15 min; JWT HS256 de 1 h con `jti` y `sv` (`apps/api/src/config.ts`)                                                                                                                                                                                                                                                                          | Listado (`handoff.md:23`)                                                                                                                  |
| D5  | Prototipos "en Figma"                                                                                        | `03-cap2a.md:55`, `03-cap2d.md:104`, `03-cap2d.md:203`                                                                                                                                                                                                                                                                                                                                                                                     | Prototipos HTML (propuesta C)                                                                                                                                                                                                                                                                                                                              | Listado solo como "2.4.3" (`handoff.md:17`); **faltan 2 de las 3 ubicaciones**. Decisión del CTO pendiente desde la Fase 1 (`plan:21`)     |
| D6  | Contrato de imágenes: "POST /imagenes carga una imagen en Cloudinary" y en el diagrama la API sube la imagen | `03-cap2c.md:354`; `diagramas/seq_enviar_revision.puml:20-23` (`P -> C : Sube la imagen`)                                                                                                                                                                                                                                                                                                                                                  | El móvil sube directo con una firma; endpoint nuevo `POST /panel/publicaciones/:id/imagenes/firma` (`apps/api/src/routes/index.ts`), y `POST /imagenes` solo registra                                                                                                                                                                                      | **Falta**                                                                                                                                  |
| D7  | Decisiones donde la tesis calla                                                                              | —                                                                                                                                                                                                                                                                                                                                                                                                                                          | Máx. 4 imágenes jpg/png/webp; Publicador limitado a su unidad; Aprobador ve la cola de todas las unidades y nunca borradores; descartar prohibido después del envío; regla de vigencia; destacado solo sanitario (`handoff.md:43`); además: DTO público por lista blanca, ETag/304, máximo 10 destacadas, rate limit público 1000/15 min (`handoff.md:25`) | Parcial: la línea 43 no incluye los puntos de la línea 25                                                                                  |
| D8  | Cronograma: el Sprint 0 (2 al 22-nov) es "requerimientos y diseño" y el Sprint 1 arranca el 23-nov           | `03-cap2a.md:43,69-70`; `03-cap2d.md:209-213`                                                                                                                                                                                                                                                                                                                                                                                              | M01 y M02 (parcial) se codificaron el 3 y 4-nov, dentro del Sprint 0. Las evidencias de 2.5.1 y 2.5.2 tendrán fechas que contradicen la Tabla 2.70                                                                                                                                                                                                         | **Falta.** Decidir cómo se reporta (adelanto declarado o cronograma ajustado)                                                              |
| D9  | Un solo entorno                                                                                              | `03-cap2d.md:339-340` (Pruebas y Producción separados)                                                                                                                                                                                                                                                                                                                                                                                     | Hoy existe una sola rama Neon, llamada `production` pero cargada con datos `[FICTICIO]` (`seed.ts:6`; `handoff.md:29`). En términos de la tesis, eso es el entorno de pruebas                                                                                                                                                                              | **Falta**: renombrarla o documentarla como entorno de pruebas                                                                              |
| D10 | RF-31 y RNF-07 (fecha día/mes/año)                                                                           | `03-cap2a.md:333,370`                                                                                                                                                                                                                                                                                                                                                                                                                      | El sello muestra "Actualizado hoy HH:MM" (`components/SelloActualizacion.tsx:13`; desvío en `handoff.md:47`)                                                                                                                                                                                                                                               | **Falta** como punto de tesis o de UI                                                                                                      |
| D11 | RNF-13 / CP-I-15 (100 consultas simultáneas)                                                                 | `04-cap3.md:187`                                                                                                                                                                                                                                                                                                                                                                                                                           | Rate limit en memoria de 1000/15 min por IP: una prueba de carga desde una sola IP choca con el límite                                                                                                                                                                                                                                                     | Post-demo, **falta**                                                                                                                       |
| D12 | RF-28 "entregadas" = aceptado por FCM/APNs                                                                   | `plan:20`                                                                                                                                                                                                                                                                                                                                                                                                                                  | —                                                                                                                                                                                                                                                                                                                                                          | Solo en el plan; post-demo                                                                                                                 |

---

## E. Partes del plan que hoy son falsas (`app/docs/plan-puesta-en-marcha.md`)

| Línea           | Dice                                                          | Realidad                                                                                                                            | Cambio                                                                                                       |
| --------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 5               | "El código está al 0 %"                                       | Era el estado del 3-nov                                                                                                             | Encabezar con "Estado al 2026-11-03 (histórico)" y agregar una sección "Estado al día" que apunte al handoff |
| 9               | "80 casos de prueba" en el Cap. II                            | Están en el Cap. III (`04-cap3.md:511`)                                                                                             | Corregir la referencia                                                                                       |
| 10              | Stack con Railway                                             | Vercel + Neon desde el 4-nov                                                                                                        | Reemplazar y enlazar la decisión `handoff.md:27`                                                             |
| 21              | Figma "lo decide el CTO en la Fase 1"                         | Sin decidir el 12-nov                                                                                                               | Marcar abierto con fecha límite                                                                              |
| 22              | SDK 58 "confirmar en el Sprint 0"                             | No hay registro del resultado                                                                                                       | Marcar abierto y moverlo a P0                                                                                |
| 25-29, 117, 159 | Núcleo 13 RF / 37 %                                           | Se cuenta RF-14 (14 RF)                                                                                                             | Unificar (A3)                                                                                                |
| 31              | Cómo se mide: tests de `apps/*`                               | El móvil se salta (A1)                                                                                                              | Corregir junto con el script                                                                                 |
| 46, 115         | Panel con Cuentas y Auditoría                                 | No existen; "próxima versión"                                                                                                       | Mantener en la Fase 3 como pendiente explícito (B5)                                                          |
| 53              | "la ficha va como `detalle Json`"                             | Columnas explícitas (`handoff.md:21`)                                                                                               | Corregir                                                                                                     |
| 54              | Imágenes con `expo-image` y `cachePolicy: 'disk'`             | Se usa RN `Image`, sin expo-image (`handoff.md:47`)                                                                                 | Corregir, o dejarlo como requisito de la fase offline                                                        |
| 56              | `node-cron` + "Railway Cron"                                  | Serverless: no hay proceso persistente                                                                                              | Reemplazar por Vercel Cron o un planificador externo (D3)                                                    |
| 73              | Evidencias `docs/evidencias/RF-xx.png`                        | Se llaman `habitante-*.png` y `panel-*.png`; `panel-revision.png` retirada (`handoff.md:55`), así que no hay captura de la revisión | Unificar el nombre por RF                                                                                    |
| 85, 89          | Development build EAS y app en Android como gate de la Fase 0 | No hecho                                                                                                                            | Marcar el gate como incumplido (B1)                                                                          |
| 87              | Proyecto Railway                                              | Descartado                                                                                                                          | Reemplazar                                                                                                   |
| 104, 114, 119   | Fechas de las fases                                           | Fase 2 hecha el 3 y 4-nov; Fase 3 a medias                                                                                          | Agregar una columna de estado por fase (regla 8.b)                                                           |
| 117, 160        | "contra el entorno de pruebas de Railway"                     | Contra Vercel/Neon `production`                                                                                                     | Reemplazar                                                                                                   |
| 154             | "también corre el hook de Codex"                              | Sin cuota hasta el 3-dic                                                                                                            | Anotar (B8)                                                                                                  |

Sobre "no git integration": el handoff ya lo corrigió (`handoff.md:28`: la integración de Git de Vercel está activa). **No verificado** por mí contra Vercel. El plan no lo menciona.

---

## F. Higiene del handoff (`app/docs/handoff.md`)

- **F1 — MEDIO:** "Retomar aquí" punto 1 (`:47`) es un párrafo de unas 300 palabras sobre un PR ya mergeado, y además se contradice: dice "mergeado" y dos frases después "Falta: /code-review + /ponytail-review, CI, merge". **Cambio:** mover el historial de #11 a "Revisiones" y dejar en "Retomar aquí" solo los próximos pasos (P0-1 … P3-1).
- **F2 — MEDIO:** la regla 8.b pide el hito activo y el estado del plan en la sección de reanudación. Hoy hay un puntero (`:5`) pero no dice en qué fase está el plan ni qué gates fallaron. **Cambio:** una línea "Hito activo: Fase 3 (móvil), gate pendiente: dispositivo. Fases 0 y 3: gate de dispositivo incumplido."
- **F3 — BAJO:** `:24` "(Railway = 1)"; `apps/api/src/config.ts:16,21` y `app.ts:9` también nombran Railway. **Cambio:** quitar Railway del handoff (el código lo arregla Sonnet aparte, en el PR de limpieza).
- **F4 — BAJO:** `:54` "cuenta Expo cuando lleguemos al push": hay que moverla a P0 (B2).
- **F5 — BAJO:** CI y local usan Postgres 17 (`.github/workflows/ci.yml`, `README.md`) y Neon usa PG 18 (`handoff.md:27`). Es una diferencia de versión entre pruebas y producción. Anotarla, o subir CI y docker a 18.
- **F6 — BAJO:** `:4-8` no distingue "verificado en web" (con un proxy local por CORS, `:50`) de "verificado contra la API de Vercel". Aclarar contra qué servidor se hicieron las capturas.

---

## Lo no verificado en esta auditoría

- Qué SDK de Expo soporta hoy Expo Go en Play Store, y si SDK 58 es la versión estable vigente.
- Cómo se inyecta `EXPO_PUBLIC_API_URL` (no se leyeron archivos `.env*`).
- El estado real de la integración de Git de Vercel y de los deploys (no se consultó Vercel).
- Si Neon permite reiniciar una rama `demo` en el plan actual; el límite de cron del plan Hobby de Vercel.
- El criterio real del tutor para el 30 %; el cálculo por UCP y por pantallas.
- Ningún comportamiento en dispositivo: lo dicho sobre RF-09 sale de leer el código de navegación.
