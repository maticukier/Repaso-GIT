# ⚽ Crucigrama Futbolero

App de celular (Expo / React Native) con cinco juegos de fútbol que se renuevan cada día. Todos los jugadores reciben los mismos juegos: se generan de forma determinística a partir de la fecha. El progreso, las rachas y las estadísticas se guardan en el dispositivo (AsyncStorage).

## Los juegos

- **🧩 Crucigrama**: tres por día.
  - **Fácil** (11×11): términos de fútbol, cracks y clubes conocidos.
  - **Medio** (11×11): clubes, estadios, selecciones y jugadores.
  - **Difícil** (12×12): apodos, leyendas, clubes por su sobrenombre e historia.
  - Teclado en pantalla; tocar una casilla dos veces cambia entre horizontal y vertical. **Revisar** marca en rojo las letras incorrectas y **Revelar letra** ayuda (y queda registrado).
- **🎯 Adiviná el crack**: estilo Wordle. Una palabra por día (jugador, club o término de fútbol, de 5 a 7 letras) y 6 intentos. Después del 3er intento aparece una pista.
- **🃏 ¿Quién es la carta?**: una carta de FIFA 14 a FC 26 por día y 6 intentos para adivinar el jugador. Al principio se ven 2 stats; con cada error se suma una pista: nacionalidad, posición, 2 stats más, todos los stats y, por último, la media. Al terminar se ve la foto del jugador.
- **🕵️ Rebuscado**: 5 categorías por día (por ejemplo, "Argentinos que jugaron en el Liverpool"). Se da una sola respuesta por categoría y cuanto menos conocido es el jugador, más puntos: de 10 por el más obvio a 100 por una joya oculta.
- **📊 Ranking**: 5 preguntas por día del tipo "¿quién es el goleador histórico n.º 28 del Manchester United?". Un intento por pregunta: el puesto exacto vale 100 puntos y va bajando según a cuántos puestos quedó el jugador nombrado.

## Datos y créditos

| Dato | Fuente | Licencia |
| --- | --- | --- |
| Stats de las cartas (`src/data/fifa-cards.json`) | SoFIFA, vía el dataset `mzafram2001/ea-fc` | MIT (el repositorio original ya no es público) |
| Banderas (`src/data/flags.ts`) | [flag-icons](https://github.com/lipis/flag-icons) | MIT |
| Fotos de jugadores (`src/data/photos.ts`) | Wikimedia Commons | CC BY / CC BY-SA / dominio público; autor y licencia de cada foto en `src/data/photo-credits.json`, y la app los muestra junto a la foto |
| Categorías de Rebuscado (`src/data/rebuscado.json`) | Categorías de Wikipedia en inglés + Wikidata | CC BY-SA 4.0 / CC0 |
| Rankings (`src/data/rankings.json`) | Listas de Wikipedia en inglés (noviembre de 2026) | CC BY-SA 4.0 |
| Base de jugadores (`src/data/players.json`) | Wikipedia y Wikidata | CC BY-SA 4.0 / CC0 |

En Rebuscado, "qué tan conocido" es un jugador se mide por la cantidad de Wikipedias (idiomas) que tienen un artículo sobre él. Solo se usan categorías con fuentes completas (planteles de clubes, convocados a cada torneo y premios individuales); las de campeones de Libertadores, Champions, Copa América y Eurocopa se descartaron porque las listas de Wikipedia omiten jugadores. Si alguien tiene doble nacionalidad, su respuesta cuenta para cualquiera de sus países.

### Cómo regenerar los datos

Los scripts están en `scripts/data-tools/` (Python 3 con `beautifulsoup4`, `lxml` y `Pillow`). Necesitan acceso a `en.wikipedia.org`, `query.wikidata.org`, `commons.wikimedia.org` y `upload.wikimedia.org`, y guardan todo en una carpeta de trabajo (`WORK`):

```bash
cd scripts/data-tools
mkdir -p $WORK/kr $WORK/rk
python3 kr_clubs.py $WORK        # jugadores de cada club (categorías de Wikipedia)
python3 kr_extra_api.py $WORK    # premios (Balón de Oro, campeones del mundo, etc.)
python3 squads_pages.py $WORK    # planteles completos de Mundiales y Copas América
python3 rk_parse.py $WORK        # rankings de goleadores y partidos
python3 rk_resolve.py $WORK      # identifica a los jugadores de los rankings
python3 wd_attrs.py $WORK        # fama, nacionalidad y nombres desde Wikidata (SPARQL)
python3 api_attrs.py $WORK       # completa lo que falte con la API de Wikidata
python3 resolve_redirects.py $WORK
python3 build_games.py $WORK ../../src/data
```

Las fotos se bajan con `match_players.py`, `photos_meta.py` y `photos_crop.py`. Los servidores de Wikimedia limitan la cantidad de pedidos, así que la descarga completa puede tardar más de una hora.

## Cómo correrla

```bash
cd futbol-crucigrama
npm install
npx expo start        # escanear el QR con Expo Go en el celular
npx expo start --web  # o probarla en el navegador
```

## Verificaciones

```bash
npm test            # tests de la lógica de los cinco juegos y de los datos
npm run typecheck   # TypeScript
npx expo lint       # ESLint
```

## Estructura

- `App.tsx` — navegación entre juegos y pantalla del crucigrama.
- `src/lib/` — lógica sin interfaz, con sus tests:
  - `generator.ts`, `daily.ts`, `game.ts` — crucigrama.
  - `wordle.ts` — Adiviná el crack.
  - `cartas.ts` — ¿Quién es la carta?
  - `jugadores.ts` — base de jugadores y buscador de Rebuscado y Ranking.
  - `rebuscado.ts`, `ranking.ts` — categorías, preguntas y puntajes.
  - `storage.ts` — progreso y estadísticas.
- `src/components/` — pantallas de cada juego (`AdivinaGame`, `CartaGame`, `RebuscadoGame`, `RankingGame`), el juego por rondas que comparten los dos últimos (`RondasGame`), buscador, teclado, grilla, barra inferior y carteles de resultado.
- `src/data/` — bancos de palabras y datos generados.
- `scripts/` — scripts que generan los datos.
