import { renderSong } from './music-synth';
import { type MusicTrack, SONGS } from './music-songs';

/**
 * Genera los temas de música (F2-10) fuera del hilo de la pantalla: en un móvil de gama media tarda más de un segundo y
 * congelaría el mapa (REGLA 3: 60 fps). Responde con las muestras transferidas (sin copiarlas).
 */
interface WorkerScope {
  onmessage: ((e: MessageEvent<{ id: number; track: MusicTrack; rate: number }>) => void) | null;
  postMessage(message: unknown, transfer: Transferable[]): void;
}
const scope = globalThis as unknown as WorkerScope;

scope.onmessage = ({ data }) => {
  const samples = renderSong(SONGS[data.track], data.rate);
  scope.postMessage({ id: data.id, samples }, [samples.buffer]);
};
