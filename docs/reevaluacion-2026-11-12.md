# Reevaluación de documentación, backlog y stack (2026-11-12)

Pedido del CTO (2026-11-12): reevaluar documentación, backlog y stack buscando flaquezas y corregir lo necesario.
Chairman de la sesión: Opus 5.5 (Fable 5.2 disponible, pero esta sesión no corría en Fable).
Tres auditorías de solo lectura, informes completos en `docs/auditorias/2026-11-12-*.md`:

- `docs-backlog` (Opus): coherencia de handoff, plan, progreso y tesis; backlog para la demo.
- `stack-ops` (Opus): encaje serverless, móvil/EAS, operación, seguridad.
- `codigo` (Sonnet, ponytail-audit): bugs y riesgos del código en `main`.

## Diagnóstico (lo que cambia la lectura del proyecto)

1. **El 40 % estaba inflado y a la vez mal medido.** `pnpm progreso` no leía los tests del móvil (solo detectaba `jest.config*`; el móvil configura Jest en `package.json`). Y 4 de los 14 RF contados no tienen camino en la app: RF-02/03 (cuentas, roles) y RF-10 (auditoría) muestran "disponible en la próxima versión"; RF-09 (archivar) no es alcanzable desde la cola del Aprobador. **En el teléfono hoy: 10/35 (28,6 %), bajo el 30 %.**
2. **Nada corrió nunca en un teléfono y no existe camino a un APK** (sin `eas.json`, `android.package`, projectId ni cuenta Expo). El gate "app en Android" de la Fase 0 se incumplió sin quedar registrado. Es el riesgo n.º 1 para el 1-dic.
3. **El criterio del tutor para "30 %" no está escrito en ningún lado.** Contado por módulos, M01 + M02 completos = 2/7 = 28,6 %.
4. **Reinicio de la demo imposible por SQL**: el trigger de `registro_auditoria` impide UPDATE/DELETE/TRUNCATE incluso al dueño y el seed no borra publicaciones. Neon Free restaura solo dentro de 6 h.
5. **Tres defectos de código que pegan en la demo**: imágenes a tamaño original (red rural), `fechaFin` no editable desde la app (los eventos de varios días caducan el primer día), `fetch` móvil sin timeout (spinner infinito).
6. **Hallazgos de stack**:
   - Expo Go sí soporta SDK 58 en Android (verificado en expo.dev/go), pero sin push remoto desde SDK 53. Sirve para probar hoy, no para la demo.
   - `node-cron` (RF-26) no corre en Vercel.
   - El pool `pg` va sin `max` ni manejador de `error`.
   - Los Preview de Vercel fallan en cada PR por `env('DATABASE_URL')` en `prisma.config.ts`.
   - Cada merge despliega producción solo, mientras la migración es manual: hay una ventana de 500 en producción.
7. **La tesis tiene mucho más por reescribir de lo anotado** (Railway en ~15 lugares, costos, respaldos, RNF-21, contrato de imágenes, cronograma). Lista única: [tesis-cambios.md](tesis-cambios.md).

## Decisiones (chairman, 2026-11-12)

- **La métrica que vale es la del teléfono.** `pnpm progreso` pasa a mostrar las columnas API y Móvil. El avance "demostrable" se registra a mano por RF tras la prueba en dispositivo (columna Dispositivo en `progreso.md`). No se reporta 40 % al tutor.
- **Camino a la demo: APK `preview` con EAS, no Expo Go.** Expo Go solo para la primera prueba de hoy. El primer APK ya incluye `expo-sqlite` (offline) para no gastar builds (Free: 15/mes, cola lenta).
- **Push (RF-24/25/27) baja a "solo si sobra"**: necesita un development build, FCM y la cuenta Expo, y es el ítem con más riesgo por RF. La extensión al ~54 % se busca con offline (RF-29..31) y RF-12/13, no con push.
- **Reinicio de la demo con una rama Neon `demo-baseline` sin TTL**: se restaura desde ella antes de cada ensayo. Pendiente de verificar en Neon Free.
- **Migraciones**: siempre aditivas, y `migrate deploy` antes del merge (el merge despliega solo).
- **Se mantiene**: sin CORS (API solo nativa), helmet, JWT HS256 fijado.
- **Se descarta para estos 19 días**: Upstash, pino, Sentry, Maestro, ramas de BD por preview, automatizar migraciones en CI.
- **Neon Auth**: sigue activado por decisión del CTO, sin conectar. Recomiendo desactivarlo (superficie sin uso); decide el CTO.

## Ejecución

- **PR `fix/robustez-demo`** (en curso, Sonnet):
  - progreso cuenta el móvil, con columnas API/Móvil;
  - Preview de Vercel en verde;
  - timeout de 15 s en el `fetch` del móvil;
  - imágenes con `f_auto,q_auto,w_1080`;
  - `fechaFin` editable;
  - pool `max: 5` con `on('error')`;
  - 404 en JSON;
  - ESLint ignora `.claude/**`;
  - caché pública `s-maxage=30, stale-while-revalidate=60`.
- **PR siguiente (con `/security-review`)**, sobre el bloqueo de login:
  - escribir `bloqueado_hasta` en el mismo UPDATE que el contador;
  - que el contador decaiga;
  - que un fallo de escritura no deje la cuenta bloqueada para siempre;
  - auditar alta, rol y desactivación de cuentas (`registrar` en la misma transacción).
- **Sin decidir**: el riesgo aceptado de bloquear la cuenta de un admin con 5 requests ya estaba registrado; se mantiene.

## Backlog para la demo (19 días)

| #    | Ítem                                                                                                                                             | RF                        | Esfuerzo             | Límite    | Quién          |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------- | -------------------- | --------- | -------------- |
| P0-1 | Cuenta Expo + `eas login`                                                                                                                        | habilita APK              | 15 min               | 13-nov    | **CTO**        |
| P0-2 | Criterio del 30 % del tutor, por escrito                                                                                                         | —                         | —                    | 15-nov    | **CTO**        |
| P0-3 | Prueba hoy en Expo Go (Android del CTO) del núcleo contra Vercel                                                                                 | RF-01, 04..08, 11, 14..16 | 0,5 d                | 13-nov    | CTO + chairman |
| P0-4 | `android.package`, `eas.json` (perfil `preview` APK, `EXPO_PUBLIC_API_URL`, Node 24), primer APK con `expo-sqlite`                               | —                         | 0,5–1 d              | 15-nov    | Sonnet + CTO   |
| P0-5 | Prueba en dispositivo con APK: imagen desde el teléfono, escala 200 %, TalkBack, `expo-doctor`; capturas `docs/evidencias/RF-xx-dispositivo.png` | núcleo                    | 1 d + arreglos 1–2 d | 17-nov    | CTO + Sonnet   |
| P1-1 | "Publicadas" del Aprobador con Archivar                                                                                                          | RF-09                     | 0,5 d                | 18-nov    | Sonnet         |
| P1-2 | Pantallas Cuentas (alta, edición, rol, desactivar) y Auditoría (la API ya existe)                                                                | RF-02, 03, 10             | 2–3 d                | 21-nov    | Sonnet         |
| P1-3 | Rama `demo-baseline` + procedimiento de reinicio + `docs/demo.md` (guion de 5 min)                                                               | demo                      | 0,5 d                | 22-nov    | chairman       |
| P1-4 | PR de seguridad del login + auditoría de cuentas                                                                                                 | RF-01, 02, 10             | 1 d                  | 22-nov    | Sonnet         |
| P2-1 | Campos propios de jornada y entrega                                                                                                              | RF-12, 13                 | 1 d                  | 23-nov    | Sonnet         |
| P2-2 | Offline: persistencia de Query (expo-sqlite), sello desde `dataUpdatedAt`/`Date`, `placeholderData` del detalle                                  | RF-29, 30, 31             | 2–3 d                | 26-nov    | Sonnet         |
| P2-3 | IDs de caso de prueba (CP) en los nombres de los tests                                                                                           | evidencia tesis           | 0,5 d                | 26-nov    | Sonnet         |
| P3-1 | Video de respaldo y 3 corridas seguidas con la rama reiniciada; warm-up de la API antes                                                          | demo                      | 1 d                  | 28–30-nov | CTO            |
| —    | Margen para fallos en dispositivo                                                                                                                | —                         | 2–3 d                | —         | —              |

Total: unos 13–16 días de 19. Push queda fuera salvo que sobre margen.

## Deuda nueva (después de la demo)

- RF-26 con Vercel Cron (Hobby: 1 vez al día) o Schedules (beta), con un endpoint idempotente con `CRON_SECRET`; RF-24 con `await`/`waitUntil` en la request.
- CI con Postgres 18 (hoy 17; Neon 18). CI no bundlea el móvil ni corre `expo install --check`; 8 paquetes Expo van un parche atrás.
- Imágenes: verificar en Cloudinary que el archivo exista al registrar.
- 4 tablas sin uso (Establecimiento, Dispositivo, Recordatorio, Notificacion): se quedan, porque son del modelo de la tesis.
- `/health` consulta la BD en cada llamada y no tiene límite de tasa.
- Límite de login por IP y bloqueo de cuenta: con la IP compartida del aula pueden saltar durante la demo. Ensayar con las cuentas demo, sin fallar contraseñas.
- El MCP de Neon versionado da a los agentes escritura sobre la única base: ningún agente escribe en Neon sin aprobación del CTO.

## No verificado

- EAS con pnpm 11 y Node 24.
- Restaurar una rama en Neon Free conservando el endpoint.
- El límite de cron de Vercel Hobby.
- La precedencia de `git.deploymentEnabled`.
- Cualquier comportamiento en un dispositivo.
- Codex, sin cuota hasta el 3-dic.
