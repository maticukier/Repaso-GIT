# ⚽ Crucigrama Futbolero

App de celular (Expo / React Native) con juegos de fútbol diarios: tres crucigramas, **Adiviná el crack** y **¿Quién es la carta?**.

- **Tres crucigramas por día**, iguales para todos: se generan de forma determinística a partir de la fecha.
  - **Fácil** (11×11): términos de fútbol, cracks y clubes conocidos.
  - **Medio** (11×11): clubes, estadios, selecciones y jugadores.
  - **Difícil** (12×12): apodos, leyendas, clubes por su sobrenombre e historia.
- Cada nivel tiene su propio progreso, racha y estadísticas.
- **Adiviná el crack**: estilo Wordle. Una palabra por día (jugador, club o término de fútbol, de 5 a 7 letras) y 6 intentos. Verde = letra en su lugar, amarillo = está en otro lugar, gris = no está. Después del 3er intento aparece una pista. Tiene racha, % de victorias y gráfico de intentos.
- Teclado en pantalla, tocar una casilla dos veces cambia entre horizontal y vertical, flechas para pasar de pista.
- **Revisar** marca en rojo las letras incorrectas; **Revelar letra** ayuda (y queda registrado).
- Cronómetro, racha de días seguidos, estadísticas y botón para compartir el resultado.
- El progreso se guarda en el dispositivo (AsyncStorage), así se puede cerrar la app y seguir después.

- **¿Quién es la carta?**: una carta de FIFA 14 a FC 26 por día y 6 intentos para adivinar el jugador. Al principio se ven 2 stats; con cada error se suma una pista: nacionalidad, posición, 2 stats más, todos los stats y, por último, la media. Los arqueros muestran sus stats de arquero.

## Datos

Los stats de las cartas salen de [mzafram2001/ea-fc](https://github.com/mzafram2001/ea-fc) (licencia MIT, datos de SoFIFA). Para regenerar `src/data/fifa-cards.json`:

```bash
git clone --depth 1 https://github.com/mzafram2001/ea-fc.git /tmp/ea-fc
python3 scripts/build-fifa-data.py /tmp/ea-fc/data
```

## Cómo correrla

```bash
cd futbol-crucigrama
npm install
npx expo start      # escanear el QR con Expo Go en el celular
npx expo start --web  # o probarla en el navegador
```

## Scripts

```bash
npm test            # tests del generador, navegación y rachas
npm run typecheck   # TypeScript
npx expo lint       # ESLint
```

## Estructura

- `App.tsx` — pantalla del juego, modales de pistas y resultado.
- `src/data/words.ts`, `words-medio.ts`, `words-dificil.ts` — bancos de palabras y pistas de cada nivel.
- `src/lib/generator.ts` — arma la grilla cruzando palabras.
- `src/lib/daily.ts` — niveles y crucigrama del día a partir de la fecha.
- `src/lib/game.ts` — lógica de navegación y verificación.
- `src/lib/wordle.ts` — palabra del día y colores de Adiviná el crack.
- `src/lib/cartas.ts` — carta del día, pistas, buscador y nacionalidades de ¿Quién es la carta?.
- `src/lib/storage.ts` — progreso y estadísticas.
- `src/components/` — grilla, teclado, encabezado, pantallas de los juegos y resultado.
