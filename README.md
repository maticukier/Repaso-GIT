# Repaso Git Clase 1

# Matias Duro

# Alumno: Matias

# Alumno : Elvis Chatzky"

# Prueba

# Navbar www.ort.com / PNT2




---

# Blobalanche (prototipo hyper-casual)

Phaser 3 + TypeScript + Vite. Portrait 9:16, touch-first.

```bash
npm install
npm run dev        # http://localhost:5173 (también expuesto en la red local)
npm run validate   # simula los 30 niveles y falla si alguno es imposible sin mejoras
npm run build      # typecheck + validador + build de producción en dist/
```

- Arrastrá el dedo (o el mouse) para mover el cañón; mientras está apretado dispara minions.
- Puertas: `x2`/`x3` clonan, `+10`/`+25` suman, `-5` resta. Cada minion cruza cada puerta una sola vez.
  Hay una puerta que se mueve, una que mejora si le disparás (-5 → x2 → x3) y una que se gasta con el uso (+25 → +10 → -5).
- Defensores (estático y patrullero) eliminan minions al tocarlos; cada contacto les saca 1 de HP.
- La barra amarilla es el cargador: se recarga solo desde la reserva (el número). Ganás al destruir la torre;
  perdés si te quedás sin munición y sin minions vivos.
- 30 niveles en `src/data/levels/level-NN.json` (jefes en 10, 20 y 30). Se desbloquean ganando;
  las estrellas dependen de la munición que sobra.
- Monedas por nivel (base según nivel + bonus por estrellas + bonus de primera vez; al perder,
  algo proporcional al daño hecho). Se gastan en 4 mejoras permanentes (cadencia, munición,
  daño por minion, puertas potenciadas) con costo creciente x1.5 por nivel (máx. 10).
- Progreso, monedas, mejoras y ajustes se guardan en `localStorage` detrás de la interfaz
  `Storage` (`src/systems/Storage.ts`), lista para cambiarse por otro backend.
- Ajustes: sonido (WebAudio sintetizado, sin archivos) y vibración (`navigator.vibrate` detrás
  de la interfaz `Haptics`).
- `?level=N` entra directo al nivel N (para pruebas).
- Panel de debug (por defecto sólo en `npm run dev`; `?debug=1` / `?debug=0` lo fuerza) arriba a la izquierda: FPS, peor frame y minions activos / capacidad del pool.
- Test de estrés: botón del panel, o `?stress` en la URL (`?stress=600`, `?stress=1000`, máx. 1024).

## Formato de nivel

```jsonc
{
  "name": "Encrucijada",
  "boss": false,                       // torre grande (opcional)
  "tower": { "hp": 450 },
  "ammo": { "total": 220, "magazine": 40, "regenPerSec": 7 },   // magazine/regen opcionales
  "stars": { "two": 0.08, "three": 0.2 },   // fracción de munición sobrante (opcional)
  "gates": [
    { "x": 225, "y": 900, "width": 230, "type": "mul", "value": 2 },
    { "x": 360, "y": 640, "width": 170, "type": "mul", "value": 3,
      "move": { "minX": 185, "maxX": 535, "speed": 120 } },
    { "x": 180, "y": 380, "width": 150, "type": "add", "value": 25,
      "change": { "mode": "wear", "every": 5, "to": [{ "type": "add", "value": 10 }, { "type": "add", "value": -5 }] } }
  ],
  "enemies": [
    { "type": "static", "x": 360, "y": 775, "radius": 36, "hp": 60 },
    { "type": "patrol", "x": 140, "y": 510, "radius": 30, "hp": 45, "patrol": { "minX": 140, "maxX": 580, "speed": 170 } },
    { "type": "brute", "x": 360, "y": 600, "radius": 50, "hp": 80, "regenPerSec": 5 },
    { "type": "orbiter", "x": 360, "y": 560, "radius": 26, "hp": 45, "orbit": { "radius": 150, "speed": 1.3, "phase": 0 } }
  ]
}
```

- Puertas: `type` `mul` (2, 3) o `add` (10, 25, -5). `change.mode`: `upgrade` (mejora al dispararle) o `wear` (se gasta).
- Coordenadas en px lógicos (720x1280). Carril de x=90 a x=630; puertas y enemigos entre y=300 y y=960.
- El juego y el validador usan el mismo parser (`src/data/levelFormat.ts`): un campo inválido falla con su ruta exacta.
