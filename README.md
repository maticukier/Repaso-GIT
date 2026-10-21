# Repaso Git Clase 1

# Matias Duro

# Alumno: Matias

# Alumno : Elvis Chatzky"

# Prueba

# Navbar www.ort.com / PNT2




---

# Blob Brigade (prototipo hyper-casual)

Phaser 3 + TypeScript + Vite. Portrait 9:16, touch-first.

```bash
npm install
npm run dev        # http://localhost:5173 (también expuesto en la red local)
npm run build      # typecheck + build de producción en dist/
```

- Arrastrá el dedo (o el mouse) para mover el cañón; mientras está apretado dispara minions.
- Puertas: `x2`/`x3` clonan, `+10`/`+25` suman, `-5` resta. Cada minion cruza cada puerta una sola vez.
  Hay una puerta que se mueve, una que mejora si le disparás (-5 → x2 → x3) y una que se gasta con el uso (+25 → +10 → -5).
- Defensores (estático y patrullero) eliminan minions al tocarlos; cada contacto les saca 1 de HP.
- La barra amarilla es el cargador: se recarga solo desde la reserva (el número). Ganás al destruir la torre;
  perdés si te quedás sin munición y sin minions vivos.
- Panel de debug arriba a la izquierda: FPS, peor frame y minions activos / capacidad del pool.
- Test de estrés: botón del panel, o `?stress` en la URL (`?stress=600`, `?stress=1000`, máx. 1024).
- `?debug=0` oculta el panel.
