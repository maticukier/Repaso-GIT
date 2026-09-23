# ⚽ Crucigrama Futbolero

App de celular (Expo / React Native) con un crucigrama de fútbol nuevo cada día.

- **Un crucigrama por día**, igual para todos: se genera de forma determinística a partir de la fecha, con palabras y pistas de un banco de más de 120 términos (jugadas, cracks, clubes, estadios, torneos).
- Teclado en pantalla, tocar una casilla dos veces cambia entre horizontal y vertical, flechas para pasar de pista.
- **Revisar** marca en rojo las letras incorrectas; **Revelar letra** ayuda (y queda registrado).
- Cronómetro, racha de días seguidos, estadísticas y botón para compartir el resultado.
- El progreso se guarda en el dispositivo (AsyncStorage), así se puede cerrar la app y seguir después.

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
- `src/data/words.ts` — banco de palabras y pistas (agregar palabras acá).
- `src/lib/generator.ts` — arma la grilla cruzando palabras.
- `src/lib/daily.ts` — elige el crucigrama del día a partir de la fecha.
- `src/lib/game.ts` — lógica de navegación y verificación.
- `src/lib/storage.ts` — progreso y estadísticas.
- `src/components/` — grilla y teclado.
