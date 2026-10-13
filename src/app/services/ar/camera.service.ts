import { Injectable, InjectionToken, inject, signal } from '@angular/core';

/** `off` sin abrir · `starting` pidiendo · `on` con imagen · `denied` sin permiso · `unavailable` no hay / falló. */
export type CameraState = 'off' | 'starting' | 'on' | 'denied' | 'unavailable';

/** `navigator.mediaDevices` (token para los tests, D-016). null si el WebView no lo tiene. */
export const MEDIA_DEVICES = new InjectionToken<Pick<
  MediaDevices,
  'getUserMedia' | 'enumerateDevices'
> | null>('MEDIA_DEVICES', {
  providedIn: 'root',
  factory: () => (typeof navigator !== 'undefined' ? (navigator.mediaDevices ?? null) : null),
});

const KEY = 'pokecrud.camera.v1';

const loadId = (): string | null => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};
const saveId = (id: string | null): void => {
  try {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
  } catch {
    /* sin almacenamiento: se elige otra vez la próxima */
  }
};
const stop = (s: MediaStream): void => s.getTracks().forEach((t) => t.stop());

/**
 * Cámara trasera PRINCIPAL para la AR (D-045). `facingMode: 'environment'` abre el gran angular en el Samsung A36, así
 * que la primera vez se abre con `facingMode` (para tener permiso y etiquetas), se busca la trasera de número menor
 * ("camera 0, facing back") y, si no era esa, se cambia; su `deviceId` se guarda y las siguientes veces se abre
 * directa. 720p a 30 fps. El permiso lo pide Capacitor (diálogo de Android); denegado → `denied`.
 */
@Injectable({ providedIn: 'root' })
export class CameraService {
  private readonly media = inject(MEDIA_DEVICES);
  private readonly _state = signal<CameraState>('off');
  private stream: MediaStream | null = null;
  /** Cada apertura lleva su número: si se cierra (o se abre otra) antes de responder, la vieja se suelta. */
  private gen = 0;

  readonly state = this._state.asReadonly();

  async open(): Promise<MediaStream | null> {
    this.close();
    const gen = ++this.gen;
    if (!this.media?.getUserMedia) {
      this._state.set('unavailable');
      return null;
    }
    this._state.set('starting');
    const saved = loadId();
    try {
      let stream = await this.get(saved);
      if (gen !== this.gen) return this.discard(stream);
      if (!saved) {
        const main = await this.mainBackCamera();
        const opened = stream.getVideoTracks()[0]?.getSettings().deviceId ?? null;
        if (main && main !== opened) {
          stop(stream);
          stream = await this.get(main);
          if (gen !== this.gen) return this.discard(stream);
        }
        saveId(main ?? opened);
      }
      this.stream = stream;
      this._state.set('on');
      return stream;
    } catch (err) {
      if (gen !== this.gen) return null;
      const name = err instanceof DOMException ? err.name : '';
      if (saved && (name === 'OverconstrainedError' || name === 'NotFoundError')) {
        saveId(null); // la cámara guardada ya no existe (otro móvil, datos borrados): se elige otra vez
        return this.open();
      }
      console.warn('[camera]', name, err);
      this._state.set(
        name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unavailable',
      );
      return null;
    }
  }

  /** Suelta la cámara (al salir de la pantalla o pasar a segundo plano, D-045). */
  close(): void {
    this.gen++;
    if (this.stream) stop(this.stream);
    this.stream = null;
    if (this._state() === 'on' || this._state() === 'starting') this._state.set('off');
  }

  private get(deviceId: string | null): Promise<MediaStream> {
    return this.media!.getUserMedia({
      audio: false,
      video: {
        ...(deviceId
          ? { deviceId: { exact: deviceId } }
          : { facingMode: { ideal: 'environment' } }),
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
      },
    });
  }

  /** La trasera de número menor según la etiqueta ("camera 0, facing back"); undefined si no hay etiquetas. */
  private async mainBackCamera(): Promise<string | undefined> {
    const devices = await this.media!.enumerateDevices();
    return devices
      .filter((d) => d.kind === 'videoinput' && /back/i.test(d.label))
      .map((d) => ({ n: Number(/(\d+)/.exec(d.label)?.[1] ?? 99), id: d.deviceId }))
      .sort((a, b) => a.n - b.n)[0]?.id;
  }

  private discard(stream: MediaStream): null {
    stop(stream);
    return null;
  }
}
