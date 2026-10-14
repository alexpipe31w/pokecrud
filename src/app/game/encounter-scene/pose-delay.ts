import * as THREE from 'three';

/**
 * Historial corto de orientaciones con su instante (ms), para pedir la de "hace X ms": la imagen de la cámara llega
 * con retraso respecto al giroscopio, y si el Pokémon usa la orientación de ahora se adelanta a la imagen al girar
 * ("nada" sobre el fondo). Retrasando la orientación lo mismo que el vídeo, los dos se mueven a la vez (F2-01).
 * Búfer circular de tamaño fijo: sin crear objetos en cada muestra.
 */
export class PoseDelay {
  private readonly times: number[] = [];
  private readonly poses: THREE.Quaternion[] = [];
  private next = 0;
  private size = 0;

  constructor(private readonly capacity = 32) {
    for (let i = 0; i < capacity; i++) {
      this.times.push(0);
      this.poses.push(new THREE.Quaternion());
    }
  }

  /** Añade una muestra. Los instantes deben llegar en orden creciente (los de los eventos de los sensores lo son). */
  push(t: number, q: THREE.Quaternion): void {
    this.times[this.next] = t;
    this.poses[this.next].copy(q);
    this.next = (this.next + 1) % this.capacity;
    this.size = Math.min(this.size + 1, this.capacity);
  }

  /** Escribe en `out` la orientación del instante `t` (interpolada); `false` si aún no hay ninguna muestra. */
  sample(t: number, out: THREE.Quaternion): boolean {
    if (this.size === 0) return false;
    const oldest = (this.next - this.size + this.capacity) % this.capacity;
    let prev = oldest;
    if (t <= this.times[oldest]) {
      out.copy(this.poses[oldest]);
      return true;
    }
    for (let k = 1; k < this.size; k++) {
      const i = (oldest + k) % this.capacity;
      if (this.times[i] >= t) {
        const span = this.times[i] - this.times[prev];
        const f = span > 0 ? (t - this.times[prev]) / span : 1;
        out.slerpQuaternions(this.poses[prev], this.poses[i], f);
        return true;
      }
      prev = i;
    }
    out.copy(this.poses[prev]);
    return true;
  }
}
