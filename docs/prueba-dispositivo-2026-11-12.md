# Primera prueba en un teléfono (2026-11-12)

Cumple el ítem P0-3 del [backlog](reevaluacion-2026-11-12.md#backlog-para-la-demo-19-días). Es la primera vez que la app corre en un dispositivo.

- **Quién probó:** el CTO, en su teléfono Android. Modelo y versión de Android: no registrados.
- **Cómo:** Expo Go (SDK 58) contra el servidor de desarrollo de la PC (`expo start --go`, misma wifi) y la API de producción en Vercel (`EXPO_PUBLIC_API_URL=https://colpa-belgica-conecta-api.vercel.app`).
- **Cuentas:** las tres `*.demo` del seed.
- **Evidencia:** reporte del CTO por chat. **No hay capturas del teléfono.** Las capturas `docs/evidencias/RF-xx-dispositivo.png` siguen pendientes (P0-5, con el APK).
- **Datos creados:** las publicaciones de prueba quedaron en la única base (rama Neon `production`). No se pueden borrar por SQL, solo archivar.

## Cómo repetirla

```
cd apps/mobile
EXPO_PUBLIC_API_URL=https://colpa-belgica-conecta-api.vercel.app npx expo start --go
```

Escanear el QR con Expo Go. Al arrancar, Expo reescribe `apps/mobile/tsconfig.json` (quita `.expo/types` del `include` y lo reformatea): restaurarlo con `git checkout apps/mobile/tsconfig.json` antes de commitear.

## Resultado por requerimiento

"Funciona" significa que el CTO lo vio funcionar en el teléfono. Los defectos se corrigieron en el PR #18 y, donde se indica, el CTO volvió a probar.

| RF            | Qué se probó                                                 | Resultado                                                                                     |
| ------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| RF-01         | Login con las tres cuentas                                   | Funciona                                                                                      |
| RF-04, 11     | Ficha de vacunación; errores al enviarla vacía               | Funciona. Defectos: fecha y hora a mano, campos sin explicación (corregidos; ver abajo)       |
| RF-05         | Añadir imagen desde la galería                               | Defecto: "Añadir" no hacía nada en una ficha nueva. Corregido y **vuelto a probar: funciona** |
| RF-06         | Enviar a revisión                                            | Funciona                                                                                      |
| RF-07, 08     | Cola del Aprobador: publicar y devolver                      | Funciona, según el CTO ("todo lo demás en aprobador funciona"); no detalló cada acción        |
| RF-15, 16     | Habitante: la publicación aprobada aparece en Inicio y Salud | Funciona                                                                                      |
| RF-02, 03, 10 | Administrador: Cuentas y Auditoría                           | Muestran "disponible en la próxima versión" (esperado; backlog P1-2)                          |
| RF-09         | Archivar                                                     | No alcanzable desde la app (backlog P1-1)                                                     |
| RF-14         | Destacar un comunicado                                       | No probado                                                                                    |

## Defectos encontrados y su estado

1. **La app arrancaba en el login de funcionarios**, no en el Inicio del habitante. Causa: expo-router ordena los grupos por largo del nombre y `(panel)` quedaba antes que `(habitante)`; en web no se veía porque la URL `/` resuelve por otro camino. Corregido con `unstable_settings.anchor`. **Vuelto a probar: funciona.**
2. **"Añadir" imagen no hacía nada en una ficha nueva.** El botón estaba deshabilitado hasta guardar el borrador y solo lo decía una nota gris. Ahora guarda el borrador y abre la galería. **Vuelto a probar: funciona** (primera subida real a Cloudinary desde un teléfono).
3. **Fecha y hora se tipeaban a mano.** Ahora abren el selector nativo de Android. **Calendario vuelto a probar: funciona.**
4. **Los campos no explicaban qué poner.** Ahora cada uno tiene una línea de ayuda.
5. **El calendario dejaba elegir fechas pasadas.** Regla nueva del CTO: la fecha de inicio no puede ser anterior a hoy. Va en el selector y en la validación compartida (la API la rechaza). **Vuelto a probar: el calendario bloquea los días pasados.**
6. **El reloj circular de 24 h era poco intuitivo y no decía a. m./p. m.** Ahora son ruedas de hora, minuto y a. m./p. m., y la hora se muestra en 12 h en toda la app. **Vuelto a probar: funciona.**

## Sin verificar en el teléfono

- Modo avión: aviso de sin conexión en el habitante.
- Escala de fuente al 200 %, TalkBack, botón atrás de Android, teclado tapando botones.
- Devolver con observaciones y reenviar, paso por paso.
- `expo-doctor`.
- Todo lo anterior con un APK en vez de Expo Go.
