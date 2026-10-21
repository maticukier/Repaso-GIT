# Blobalanche

Juego hyper-casual de "horda y puertas" para Android. Disparás una horda de
gelatinas desde un cañón, la hacés pasar por puertas que la multiplican (o la
reducen), esquivás o rompés a los defensores y derribás la torre enemiga.

- Phaser 3 + TypeScript + Vite, empaquetado para Android con Capacitor.
- Vertical 9:16, se juega con un dedo. 30 niveles con jefes en 10, 20 y 30.
- Todo el arte, los íconos y los sonidos se generan por código: el repo no
  tiene imágenes ni audio de terceros.
- Offline, sin cuentas, sin compras y sin permisos de Android.

---

## Índice

1. [Requisitos](#requisitos)
2. [Correr en el navegador](#correr-en-el-navegador)
3. [Scripts](#scripts)
4. [Estructura del proyecto](#estructura-del-proyecto)
5. [Cómo agregar o editar niveles](#cómo-agregar-o-editar-niveles)
6. [Economía y mejoras](#economía-y-mejoras)
7. [Android: APK y AAB](#android-apk-y-aab)
8. [Anuncios (opcionales, apagados)](#anuncios-opcionales-apagados)
9. [Rendimiento](#rendimiento)
10. [Revisión de honestidad](#revisión-de-honestidad)
11. [Checklist de publicación en Google Play](#checklist-de-publicación-en-google-play)
12. [Limitaciones conocidas](#limitaciones-conocidas)

---

## Requisitos

| Para | Necesitás |
|---|---|
| Jugar / desarrollar en el navegador | Node.js 22 y npm |
| Compilar el APK/AAB en tu máquina | Lo anterior + JDK 21 + Android SDK (plataforma 36). Lo más simple: [Android Studio](https://developer.android.com/studio) |
| Compilar sin instalar nada | GitHub Actions (ya configurado, ver [Android](#android-apk-y-aab)) |

## Correr en el navegador

```bash
npm ci
npm run dev          # http://localhost:5173 (también en la red local para probar en el celu)
```

Controles: arrastrá el dedo (o el mouse) para mover el cañón. Mientras está
apretado, dispara.

Parámetros de URL para pruebas:

| Parámetro | Efecto |
|---|---|
| `?level=N` | Entra directo al nivel N (1-30), salteando el menú |
| `?debug=1` / `?debug=0` | Muestra / oculta el panel de FPS, minions y partículas (por defecto: sólo en `npm run dev`) |
| `?stress=600` | Test de estrés: mantiene N minions vivos, sin daño ni fin de partida |
| `?ads=sim` | Sólo en `npm run dev`: simula el anuncio opcional para probar el flujo |

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Typecheck + validador de niveles + build de producción en `dist/` |
| `npm run validate` | Simula los 30 niveles y falla si alguno es imposible sin mejoras |
| `npm run cap:sync` | `build` + copia el juego al proyecto Android |
| `npm run android:open` | Abre el proyecto en Android Studio |
| `npm run assets` | Regenera íconos, splash y gráficos de tienda (desde código) |
| `npm run screenshots` | Graba capturas de partidas reales para la tienda (`store/screenshots/`) |
| `npm run perf` | Auditoría de rendimiento (emula un celular de gama media) |

`screenshots` y `perf` usan el build de producción (correr `npm run build`
antes) y un Chromium de Playwright. Si es la primera vez:
`npx playwright install chromium`.

## Estructura del proyecto

```
src/
  main.ts              Configuración de Phaser, escenas, ciclo de vida
  scenes/              Boot, Menu, LevelSelect, Upgrades, Game, Result, Settings, Pause
  entities/            Cannon, Gate, Enemy, Tower, Button, CoinCounter
  systems/             MinionPool, SpatialGrid, ParticlePool, Feedback (game feel),
                       Sfx (WebAudio), Haptics, Storage, Progress (guardado),
                       Ammo, Lifecycle (pausa/botón atrás), Ads, DebugOverlay
  data/                tuning (constantes), levelFormat (parser de niveles),
                       levels/level-NN.json, upgrades (economía), features (flags)
  utils/               texturas generadas, math, flags de URL, build a medida de Phaser
scripts/               validador, generador de assets, capturas, auditoría
android/               Proyecto Android de Capacitor (se commitea)
store/                 Ícono 512, feature graphic y capturas para Google Play
.github/workflows/     CI: compila web + APK (y AAB firmado si hay secrets)
```

Decisiones técnicas que conviene conocer:

- **Minions sin física de Phaser.** Están en un pool de capacidad fija (1024),
  con estado en typed arrays y un único Blitter. Las colisiones usan una
  grilla uniforme que se reconstruye cada frame. Durante el juego no se
  reserva memoria.
- **Las partículas y los números flotantes** usan el mismo esquema de pool.
- **El arte se hornea a texturas al arrancar.** Nada se re-tesela por frame.
- **Phaser a medida en producción** (`src/utils/phaser-build.js`): sólo
  incluye los módulos que usa el juego. Si agregás un GameObject nuevo
  (`scene.add.xxx`), sumalo ahí, o funciona en `dev` pero falla en el build.

## Cómo agregar o editar niveles

Los niveles son JSON en `src/data/levels/level-NN.json`. Se cargan en orden
alfabético, así que el número del archivo es el número del nivel.

```jsonc
{
  "name": "Encrucijada",
  "boss": false,                              // torre grande de jefe (opcional)
  "tower": { "hp": 460 },
  "ammo": { "total": 220, "magazine": 40, "regenPerSec": 7 },  // magazine/regen opcionales
  "stars": { "two": 0.1, "three": 0.27 },     // fracción de munición sobrante (opcional)
  "gates": [
    { "x": 225, "y": 900, "width": 230, "type": "mul", "value": 2 },
    { "x": 360, "y": 640, "width": 170, "type": "mul", "value": 3,
      "move": { "minX": 185, "maxX": 535, "speed": 120 } },
    { "x": 180, "y": 380, "width": 150, "type": "add", "value": 25,
      "change": { "mode": "wear", "every": 5,
                  "to": [{ "type": "add", "value": 10 }, { "type": "add", "value": -5 }] } }
  ],
  "enemies": [
    { "type": "static", "x": 360, "y": 775, "radius": 36, "hp": 60 },
    { "type": "patrol", "x": 140, "y": 510, "radius": 30, "hp": 45,
      "patrol": { "minX": 140, "maxX": 580, "speed": 170 } },
    { "type": "brute", "x": 360, "y": 600, "radius": 50, "hp": 80, "regenPerSec": 5 },
    { "type": "orbiter", "x": 360, "y": 560, "radius": 26, "hp": 45,
      "orbit": { "radius": 150, "speed": 1.3, "phase": 0 } }
  ]
}
```

- **Coordenadas** en píxeles lógicos (720×1280). El carril va de x=90 a
  x=630. Puertas y enemigos van entre y=300 y y=960. El cañón llega de
  x=130 a x=590.
- **Puertas:** `type` es `mul` (valores 2 o 3) o `add` (10, 25 o -5).
  `change.mode` puede ser `upgrade` (mejora a medida que le disparás) o
  `wear` (se gasta con cada cruce), y cambia de valor cada `every` cruces.
- **Enemigos:** `static`, `patrol`, `brute` (regenera vida) y `orbiter` (gira
  alrededor de un punto).

Flujo para agregar un nivel:

1. Copiá un JSON parecido como `level-31.json` y editalo.
2. Corré `npm run validate`. Te dice si es ganable sin mejoras, el margen y la
   estrategia ganadora. Si un campo es inválido, falla con la ruta exacta
   (p. ej. `nivel 31.gates[2].value`). El build también corre el validador.
3. Probalo con `npm run dev` y `?level=31`.
4. Para el HP de la torre, una buena regla: `daño máximo ÷ margen`, con el
   margen bajando de ~2.2 (fácil) a ~1.25 (difícil). El validador muestra el
   daño máximo.

> El validador usa una simulación simple. Erra hasta ~15% contra partidas
> reales: es para detectar imposibles y picos de dificultad, no para
> reemplazar jugar el nivel.

## Economía y mejoras

En `src/data/upgrades.ts` están las cuatro mejoras y la fórmula de monedas.

- **Monedas por nivel:** base `5 + nivel`, más 35% por estrella y un bonus la
  primera vez (`10 + 2·nivel`). Al perder se gana algo proporcional al daño
  hecho.
- **Costo de cada mejora:** sube ×1.6 por nivel, con nivel máximo 10.
  Pasar todos los niveles con 3 estrellas da ~2500 monedas, así que llegar al
  máximo es una meta de largo plazo.
- **El juego se guarda** en Capacitor Preferences dentro de la app y en
  localStorage en el navegador, siempre detrás de la interfaz `Storage`
  (`src/systems/Storage.ts`). Si el guardado está corrupto, se empieza de
  cero sin romper nada.

## Android: APK y AAB

El proyecto Android (`android/`) ya está generado y commiteado. Usa
Capacitor 8: minSdk 24 (Android 7.0) y targetSdk 36.

### Opción A: sin instalar nada (GitHub Actions)

Cada push corre `.github/workflows/android.yml`, que:

1. Instala dependencias y compila el juego (incluye el validador).
2. Compila el **APK debug** y lo publica como artefacto `blobalanche-debug-apk`.
3. Si configuraste los secrets de firma, también publica el **AAB de release**
   firmado (`blobalanche-release-aab`).

Bajá el APK desde la pestaña **Actions → última ejecución → Artifacts**.

### Opción B: en tu máquina

```bash
npm ci
npm run cap:sync                 # build web + copia a android/
cd android
./gradlew assembleDebug          # -> app/build/outputs/apk/debug/app-debug.apk
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

O `npm run android:open` y ▶ Run desde Android Studio.

**Importante:** después de cambiar el código web, siempre corré
`npm run cap:sync` antes de compilar Android. Si no, el APK lleva la versión
vieja del juego.

### Firma y AAB de release (Google Play)

1. Creá una *upload key* (una sola vez, y guardala bien):
   ```bash
   keytool -genkeypair -v -keystore upload-keystore.jks -alias upload \
     -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Creá `android/keystore.properties`. Está en `.gitignore`: nunca lo subas.
   ```properties
   storeFile=/ruta/absoluta/upload-keystore.jks
   storePassword=...
   keyAlias=upload
   keyPassword=...
   ```
3. Compilá el AAB:
   ```bash
   npm run cap:sync && cd android && ./gradlew bundleRelease
   # -> app/build/outputs/bundle/release/app-release.aab
   ```
4. Para firmar en CI, cargá estos secrets del repo: `ANDROID_KEYSTORE_BASE64`
   (`base64 -w0 upload-keystore.jks`), `ANDROID_KEYSTORE_PASSWORD`,
   `ANDROID_KEY_ALIAS` y `ANDROID_KEY_PASSWORD`.
5. En cada versión nueva, subí `versionCode` (y `versionName`) en
   `android/app/build.gradle` y `version` en `package.json`.

### Identidad de la app

- **`appId`:** `io.github.maticukier.blobalanche`, definido en
  `capacitor.config.ts` y en `android/app/build.gradle`. Si lo cambiás, que
  sea **antes** de publicar: en Google Play no se puede cambiar después.
- **Íconos y splash:** `npm run assets` los regenera desde
  `scripts/generate-assets.ts`.

### Integración nativa

- **Guardado:** Capacitor Preferences. **Vibración:** Capacitor Haptics. En el
  navegador, localStorage y `navigator.vibrate`, detrás de las mismas
  interfaces.
- **Orientación:** fija en vertical (`screenOrientation="portrait"` en el manifest).
- **Safe areas:** el juego se ubica dentro de las *safe areas* (notch, barra
  de navegación) usando las variables que inyecta `SystemBars`. La barra de
  estado se oculta.
- **Pausa automática:** al ir a segundo plano (home, llamada, pantalla
  apagada), la partida se pausa y el audio se suspende. Al volver queda en
  pausa hasta que tocás "Continuar".
- **Botón atrás:** pausa durante la partida, cierra modales y vuelve una
  pantalla. En el menú principal sale de la app.

## Anuncios (opcionales, apagados)

Hay un único anuncio posible, y está **apagado por defecto**
(`src/data/features.ts` → `rewardedAds: false`). Si se activa:

- Es un rewarded "**x2 con anuncio**" en la pantalla de resultado, que
  duplica las monedas de ese nivel.
- Sólo aparece si ganaste monedas.
- Nunca aparece durante el juego, ni solo, ni como condición para avanzar.
  Ignorarlo no tiene ninguna consecuencia.

El juego define la interfaz `RewardedAds` (`src/systems/Ads.ts`) pero **no
incluye ningún SDK de anuncios**. Para conectar AdMob:

1. `npm i @capacitor-community/admob` y `npx cap sync android`.
2. Agregá tu App ID de AdMob como `<meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" .../>`
   en `AndroidManifest.xml`. **Sin esto la app crashea al abrir.**
3. Volvé a agregar `<uses-permission android:name="android.permission.INTERNET" />`.
4. Implementá `RewardedAds` con el plugin. Usá los IDs de prueba de Google
   mientras desarrollás.
5. Poné `rewardedAds: true`.
6. Actualizá en Play Console: la declaración "Contiene anuncios", el
   formulario de Seguridad de los datos (AdMob recolecta datos), y el
   consentimiento UMP/GDPR.

## Rendimiento

### Auditoría (`npm run perf`)

Corre contra el build de producción en Chromium, emulando un Android de gama
media (412×915 @2.625, táctil) con la **CPU frenada ×4**.

| Métrica | Antes de optimizar | Después |
|---|---|---|
| Bundle JS | 1291 KB (gzip 359 KB) | **746 KB (gzip 218 KB)** |
| Arranque hasta el menú | 2502 ms | **1617 ms** |
| Heap JS en el menú | 6.1 MB | **4.7 MB** |
| Heap JS jugando / estrés con 500 minions | 5.8 / 5.9 MB | **4.5 / 4.4 MB** |
| Long tasks (>50 ms) jugando | 0 | 0 |
| Crecimiento de heap tras 60 reinicios de nivel | — | se estabiliza en +0.3 MB (sin fugas: texturas, objetos y listeners constantes) |

Del lado de la CPU (medido instrumentando el loop del juego con CPU ×4, en el servidor de desarrollo), un frame
cuesta ~3-5 ms típico y 7-8 ms en el p95, con 500 minions y todos los efectos
activos. El presupuesto para 60 fps es 16.7 ms.

**Ojo:** en el entorno donde se hizo esta auditoría no había GPU (se usa
SwiftShader, render por software). Por eso los FPS medidos ahí (~30, y ~23
con estrés) **no representan un teléfono**: hasta el menú quieto da 32 fps.
Hay que medir FPS en un dispositivo real; ver abajo cómo.

### Optimizaciones aplicadas a lo largo del proyecto

- **Pools sin allocations:** minions, partículas y textos flotantes; la grilla
  espacial también es de capacidad fija.
- **Un único batch para los minions:** un Blitter con la lista de render fija.
  El Blitter estándar de Phaser re-alocaba esa lista en cada frame.
- **Puertas horneadas a textura:** como Graphics en vivo costaban ~10 ms por
  frame (CPU ×4).
- **Números con fuente bitmap generada:** `Text` re-rasterizaba su textura en
  cada cambio.
- **WebGL sin MSAA**, y efectos con límite de frecuencia (sonidos, vibración,
  esquirlas).
- **Phaser a medida y sólo WebGL** (Parte 5): −42% de JS y −35% de arranque.

### Medir en un celular

1. Instalá el APK debug, conectalo por USB y activá la depuración USB.
2. En Chrome de la PC, abrí `chrome://inspect` → el WebView de Blobalanche →
   *inspect*.
3. En la pestaña Performance grabá unos segundos jugando con `?stress=500`.
   En el APK no hay URL; para eso, abrí desde la PC la consola del WebView y
   ejecutá `location.search = '?stress=500&debug=1'`.

## Revisión de honestidad

Revisado en el código. Para repetirla, buscá `setTimeout`, `delayedCall` y
`tween` en `src/`.

- [x] **Sin timers de presión:** no hay cuentas regresivas, ofertas por
  tiempo limitado ni energía/vidas que se recarguen. Los únicos tiempos son
  de gameplay (recarga de munición) o animaciones de UI.
- [x] **Sin dinero real:** no hay compras dentro de la app ni moneda premium.
  Las monedas sólo se ganan jugando y se ven siempre con su saldo real.
- [x] **Sin botones engañosos:**
  - Los botones dicen lo que hacen.
  - "Siguiente" deshabilitado se ve gris y no hace nada.
  - Si se activan anuncios, el botón dice "x2 con anuncio", es secundario
    (chico, color neutro) y no se confunde con "Siguiente".
  - No hay botones de cerrar falsos ni anuncios automáticos.
- [x] **Dificultad justa:** los 30 niveles se ganan sin mejoras. Lo verifican
  el validador en cada build y, durante el desarrollo, bots que jugaron cada
  nivel en el juego real. Las 3 estrellas son alcanzables (los umbrales se
  calcularon a partir de partidas reales). No hay picos artificiales para
  empujar a comprar.
- [x] **Sin recolección de datos:** no hay red, analytics ni permisos. El
  guardado vive sólo en el dispositivo.
- [x] **Capturas reales:** `npm run screenshots` juega partidas reales en el
  build de producción, con input real y sin retoques ni panel de debug. Las
  capturas de `store/screenshots/` salen de ahí. Los niveles 11 y 20 se abren
  con `?level=N`, que es el mismo nivel con las mismas reglas: sólo saltea el
  menú. El *feature graphic* es arte promocional con los mismos personajes
  del juego.

## Checklist de publicación en Google Play

Cuenta y ficha:

- [ ] Cuenta de desarrollador de Google Play (pago único) y verificación de identidad.
- [ ] Confirmar que el nombre "Blobalanche" no esté registrado o en uso en la tienda.
- [ ] Definir el `appId` definitivo (ver [Identidad de la app](#identidad-de-la-app)).
- [ ] Ficha de la tienda:
  - Título y descripciones corta y completa.
  - Ícono 512×512 (`store/icon-512.png`).
  - Feature graphic 1024×500 (`store/feature-graphic-1024x500.png`).
  - Al menos 2 capturas de teléfono (`store/screenshots/`).
  - Categoría (Juegos → Casual) y email de contacto.

Políticas y cuestionarios:

- [ ] **Política de privacidad** publicada en una URL. Aunque no se recolecten
  datos, Play la pide. Sin anuncios, alcanza con declarar que no se recolecta
  nada.
- [ ] **Seguridad de los datos:** "no recolecta ni comparte datos" (válido
  mientras los anuncios sigan apagados).
- [ ] **Anuncios:** declarar "No contiene anuncios" (con el flag apagado).
- [ ] **Clasificación de contenido:** cuestionario IARC (fantasía caricaturesca, sin violencia realista).
- [ ] **Público objetivo:** elegir rango de edad. Si incluye menores de 13,
  aplica la política de Familias, que limita los SDK de anuncios.
- [ ] **Acceso a la app:** sin login, todo accesible.

Build y pruebas:

- [ ] Firmar con *upload key* y activar **Play App Signing**.
- [ ] Subir el **AAB** (no el APK) a **Prueba interna**.
- [ ] Probar en 2-3 celulares reales, idealmente uno de gama baja. Revisar:
  - Fluidez con `?stress=500`.
  - Pausa al salir y volver.
  - Botón atrás.
  - Notch y gestos.
  - Que el guardado sobreviva a cerrar la app.
- [ ] Revisar el *pre-launch report* de Play: crashes y accesibilidad.
- [ ] Prueba cerrada si tu cuenta es personal y nueva. Hoy Google exige un
  mínimo de testers durante un período antes de producción; revisá los
  requisitos vigentes en Play Console.
- [ ] Producción con lanzamiento escalonado (p. ej. 20%) y vigilar Android vitals.

## Limitaciones conocidas

- **Sin prueba en dispositivo real.** No hubo emulador Android ni celular
  disponibles: la fluidez en un teléfono real (criterio de 60 fps) está
  inferida de la auditoría de CPU, no medida. Medila antes de publicar (ver
  [Medir en un celular](#medir-en-un-celular)).
- **APK sin compilar localmente durante el desarrollo.** La red del entorno
  bloqueaba la descarga del Android SDK, así que el APK se compila en GitHub
  Actions.
- **El juego requiere WebGL** (cualquier Android 7+ lo tiene). No hay
  fallback a Canvas.
- **Resolución:** el canvas interno es 720×1280 y en pantallas de alta
  densidad se escala. Es nítido para este estilo de arte, pero no es render
  nativo a 1080p/1440p.
- **Sólo en castellano** (rioplatense). No hay sistema de traducción.
- **Ventanas del validador:** su simulación erra ~15% contra partidas reales.
- **El *feature graphic*** usa las fuentes del sistema donde se generó:
  revisalo si lo regenerás en otra máquina.
- **iOS:** no está configurado. Capacitor lo soporta, pero falta `npx cap add ios`, Xcode y probarlo.

---

## Contenido original del repositorio (Repaso Git)

# Repaso Git Clase 1

# Matias Duro

# Alumno: Matias

# Alumno : Elvis Chatzky"

# Prueba

# Navbar www.ort.com / PNT2
