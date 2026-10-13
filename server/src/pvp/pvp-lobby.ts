import { randomInt } from 'node:crypto';
import {
  PVP_INVITE_ALPHABET,
  PVP_INVITE_LENGTH,
  PVP_INVITE_TTL_MS,
} from '../../../shared/protocol/pvp.js';
import { PvpFailure } from './pvp-failure.js';
import type { PvpSideInit } from './pvp-teams.service.js';

/** Quien espera rival: su id y el equipo YA cargado (se carga antes de entrar, D-056). */
export interface LobbyEntrant {
  playerId: string;
  side: PvpSideInit;
}

export type LobbyStatus =
  | { kind: 'invite'; code: string; remainingMs: number }
  | { kind: 'queue' }
  | null;

interface Invite {
  code: string;
  expiresAt: number;
  host: LobbyEntrant;
}

/**
 * Sala de espera del PvP (F5-03, D-056): invitaciones con código y cola "buscar rival", en memoria (un proceso, D-005).
 * TODO síncrono: comprobar y cambiar sin `await` en medio, así dos "unirse" al mismo código no pueden ganar los dos.
 * Una entrada por jugador (invitación O cola). Los caducados se limpian en cada operación (sin temporizadores).
 */
export class PvpLobby {
  private readonly invites = new Map<string, Invite>();
  private readonly inviteOf = new Map<string, string>();
  private readonly queue: LobbyEntrant[] = [];

  constructor(
    private readonly now: () => number = Date.now,
    private readonly random: (max: number) => number = (max) => randomInt(max),
  ) {}

  createInvite(host: LobbyEntrant): { code: string; remainingMs: number } {
    this.purge();
    this.leave(host.playerId);
    const code = this.newCode();
    this.invites.set(code, {
      code,
      expiresAt: this.now() + PVP_INVITE_TTL_MS,
      host,
    });
    this.inviteOf.set(host.playerId, code);
    return { code, remainingMs: PVP_INVITE_TTL_MS };
  }

  /** Reclama el código: devuelve al anfitrión y borra su invitación (y lo que tuviera el que se une). */
  joinInvite(playerId: string, code: string): LobbyEntrant {
    this.purge();
    const invite = this.invites.get(code);
    if (!invite) throw new PvpFailure('invite-not-found');
    if (invite.host.playerId === playerId) throw new PvpFailure('own-invite');
    this.leave(invite.host.playerId);
    this.leave(playerId);
    return invite.host;
  }

  /** Entra en la cola. Si había alguien esperando, sale con él: devuelve el rival; si no, null (a esperar). */
  joinQueue(entrant: LobbyEntrant): LobbyEntrant | null {
    this.purge();
    this.leave(entrant.playerId);
    const rival = this.queue.shift();
    if (rival) return rival;
    this.queue.push(entrant);
    return null;
  }

  leave(playerId: string): void {
    const code = this.inviteOf.get(playerId);
    if (code) {
      this.invites.delete(code);
      this.inviteOf.delete(playerId);
    }
    const i = this.queue.findIndex((e) => e.playerId === playerId);
    if (i >= 0) this.queue.splice(i, 1);
  }

  status(playerId: string): LobbyStatus {
    this.purge();
    const code = this.inviteOf.get(playerId);
    const invite = code ? this.invites.get(code) : undefined;
    if (invite) {
      return {
        kind: 'invite',
        code: invite.code,
        remainingMs: invite.expiresAt - this.now(),
      };
    }
    return this.queue.some((e) => e.playerId === playerId)
      ? { kind: 'queue' }
      : null;
  }

  private purge(): void {
    const t = this.now();
    for (const invite of this.invites.values()) {
      if (invite.expiresAt <= t) {
        this.invites.delete(invite.code);
        this.inviteOf.delete(invite.host.playerId);
      }
    }
  }

  private newCode(): string {
    for (;;) {
      let code = '';
      for (let i = 0; i < PVP_INVITE_LENGTH; i++)
        code += PVP_INVITE_ALPHABET[this.random(PVP_INVITE_ALPHABET.length)];
      if (!this.invites.has(code)) return code;
    }
  }
}
