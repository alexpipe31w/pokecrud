/** Mensajes que puede mandar un socket de `/pvp` por ventana (D-056). Un combate usa ~1 por decisión. */
export const SOCKET_MSG_LIMIT = 20;
export const SOCKET_MSG_WINDOW_MS = 10_000;

/**
 * Límite POR SOCKET (ventana deslizante en memoria, un solo proceso: D-005). El `ThrottlerGuard` global es solo para
 * HTTP: con sockets metía a todos en un mismo cubo y perdía mensajes en silencio (spike de F5-01).
 */
export class SocketRateLimiter {
  /** Instantes de los mensajes aceptados en la ventana, por socket (como mucho SOCKET_MSG_LIMIT cada uno). */
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly now: () => number = Date.now) {}

  get size(): number {
    return this.hits.size;
  }

  /** ¿Puede pasar este mensaje? Si pasa, gasta cupo; si no, no. */
  take(socketId: string): boolean {
    const t = this.now();
    const recent = (this.hits.get(socketId) ?? []).filter(
      (at) => t - at < SOCKET_MSG_WINDOW_MS,
    );
    if (recent.length >= SOCKET_MSG_LIMIT) {
      this.hits.set(socketId, recent);
      return false;
    }
    recent.push(t);
    this.hits.set(socketId, recent);
    return true;
  }

  /** Al desconectarse el socket. */
  forget(socketId: string): void {
    this.hits.delete(socketId);
  }
}
