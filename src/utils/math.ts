export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Factor de interpolación exponencial independiente del framerate. */
export function damp(sharpness: number, dt: number): number {
  return 1 - Math.exp(-sharpness * dt);
}
