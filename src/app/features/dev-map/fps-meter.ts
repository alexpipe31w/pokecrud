/** Resumen de una medición de fluidez (F1-01). */
export interface FpsSummary {
  frames: number;
  seconds: number;
  avgFps: number;
  /** Percentil 95 del tiempo entre fotogramas: el 5 % de los fotogramas tarda más que esto. */
  p95Ms: number;
  worstMs: number;
  /** % de fotogramas que tardan más de 2 refrescos de 60 Hz (33,4 ms): tirones que se notan. */
  jankPct: number;
}

const JANK_MS = 1000 / 30 + 0.1;

const round = (n: number, decimals = 1): number => {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
};

/**
 * Cuenta fotogramas a partir de los timestamps de `requestAnimationFrame`. Sin estado global ni DOM: se le pasan
 * los tiempos y devuelve el resumen, así se prueba con números fijos.
 */
export class FpsMeter {
  private deltas: number[] = [];
  private last: number | null = null;

  reset(): void {
    this.deltas = [];
    this.last = null;
  }

  frame(now: number): void {
    if (this.last !== null) this.deltas.push(now - this.last);
    this.last = now;
  }

  /** fps de los últimos `windowMs` (para el contador en pantalla). */
  recentFps(windowMs = 1000): number {
    let total = 0;
    let n = 0;
    for (let i = this.deltas.length - 1; i >= 0 && total < windowMs; i--) {
      total += this.deltas[i];
      n++;
    }
    return total > 0 ? round((n * 1000) / total, 0) : 0;
  }

  summary(): FpsSummary {
    const d = this.deltas;
    if (d.length === 0) {
      return { frames: 0, seconds: 0, avgFps: 0, p95Ms: 0, worstMs: 0, jankPct: 0 };
    }
    const total = d.reduce((a, b) => a + b, 0);
    const sorted = [...d].sort((a, b) => a - b);
    const p95 = sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)];
    return {
      frames: d.length,
      seconds: round(total / 1000, 1),
      avgFps: round((d.length * 1000) / total, 1),
      p95Ms: round(p95, 1),
      worstMs: round(sorted[sorted.length - 1], 1),
      jankPct: round((d.filter((x) => x > JANK_MS).length * 100) / d.length, 1),
    };
  }
}
