/** Sockets de `/pvp` abiertos a la vez por un mismo jugador (pestañas, reconexiones que se solapan). */
export const MAX_SOCKETS_PER_PLAYER = 3;

/**
 * Qué sockets tiene cada jugador. Comprobar y añadir son síncronos (sin `await` en medio), así dos conexiones a la
 * vez no pueden pasar las dos el tope.
 */
export class PvpSessions {
  private readonly byPlayer = new Map<string, Set<string>>();
  private readonly owner = new Map<string, string>();

  /** Registra el socket; false si el jugador ya tiene el máximo. */
  add(playerId: string, socketId: string): boolean {
    const set = this.byPlayer.get(playerId) ?? new Set<string>();
    if (!set.has(socketId) && set.size >= MAX_SOCKETS_PER_PLAYER) return false;
    set.add(socketId);
    this.byPlayer.set(playerId, set);
    this.owner.set(socketId, playerId);
    return true;
  }

  /** Quita el socket. null si no estaba registrado (p. ej. se rechazó al conectar). */
  remove(socketId: string): { playerId: string; remaining: number } | null {
    const playerId = this.owner.get(socketId);
    if (!playerId) return null;
    this.owner.delete(socketId);
    const set = this.byPlayer.get(playerId);
    set?.delete(socketId);
    const remaining = set?.size ?? 0;
    if (remaining === 0) this.byPlayer.delete(playerId);
    return { playerId, remaining };
  }

  count(playerId: string): number {
    return this.byPlayer.get(playerId)?.size ?? 0;
  }
}
