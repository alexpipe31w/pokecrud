import { normDeg, smoothAngle } from '../geo/angles';

export type Gait = 'idle' | 'walk' | 'run';
export const WALK_MIN_MS = 0.5;
export const RUN_MIN_MS = 2.8;
export const TELEPORT_M = 150;
/** Constante de tiempo del seguimiento: el avatar tarda ~0,5 s en "alcanzar" un cambio de posición. */
const FOLLOW_TAU_S = 0.5;
const SPEED_TAU_S = 0.6;
const TURN_ALPHA = 0.2;

export interface AvatarFrame {
  east: number;
  north: number;
  speed: number;
  facingDeg: number;
  gait: Gait;
}

/** Interpola el avatar hacia la última posición conocida a 60 fps (ARQUITECTURA §4). Metros locales. */
export class AvatarMotion {
  readonly target = { east: 0, north: 0 };
  private pos = { east: 0, north: 0 };
  private speed = 0;
  private facing = 0;

  setTarget(east: number, north: number): void {
    this.target.east = east;
    this.target.north = north;
  }

  step(dt: number): AvatarFrame {
    const dx = this.target.east - this.pos.east;
    const dy = this.target.north - this.pos.north;
    const dist = Math.hypot(dx, dy);
    if (dist > TELEPORT_M) {
      this.pos = { ...this.target };
      this.speed = 0;
    } else if (dt > 0) {
      // Acercamiento exponencial: nunca rebasa el objetivo y no depende de los fps.
      const k = 1 - Math.exp(-dt / FOLLOW_TAU_S);
      const mx = dx * k;
      const my = dy * k;
      this.pos.east += mx;
      this.pos.north += my;
      const inst = Math.hypot(mx, my) / dt;
      this.speed += (inst - this.speed) * (1 - Math.exp(-dt / SPEED_TAU_S));
      if (inst > 0.2) {
        this.facing = smoothAngle(this.facing, normDeg((Math.atan2(mx, my) * 180) / Math.PI), TURN_ALPHA);
      }
    }
    const gait: Gait = this.speed >= RUN_MIN_MS ? 'run' : this.speed >= WALK_MIN_MS ? 'walk' : 'idle';
    return { east: this.pos.east, north: this.pos.north, speed: this.speed, facingDeg: this.facing, gait };
  }

  /** Re-anclaje del origen (F1-04): desplaza todo sin animar. */
  shift(east: number, north: number): void {
    this.pos.east -= east;
    this.pos.north -= north;
    this.target.east -= east;
    this.target.north -= north;
  }
}
