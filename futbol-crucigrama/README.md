# ⚽ Crucigrama Futbolero

App de celular (Expo / React Native) con tres crucigramas de fútbol nuevos cada día.

- **Tres crucigramas por día**, iguales para todos: se generan de forma determinística a partir de la fecha.
  - **Fácil** (11×11): términos de fútbol, cracks y clubes conocidos.
  - **Medio** (11×11): clubes, estadios, selecciones y jugadores.
  - **Difícil** (12×12): apodos, leyendas, clubes por su sobrenombre e historia.
- Cada nivel tiene su propio progreso, racha y estadísticas.
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
- `src/data/words.ts`, `words-medio.ts`, `words-dificil.ts` — bancos de palabras y pistas de cada nivel.
- `src/lib/generator.ts` — arma la grilla cruzando palabras.
- `src/lib/daily.ts` — niveles y crucigrama del día a partir de la fecha.
- `src/lib/game.ts` — lógica de navegación y verificación.
- `src/lib/storage.ts` — progreso y estadísticas.
- `src/components/` — grilla y teclado.
