import type { PvpErrorCode } from '../../../shared/protocol/pvp.js';

/** Fallo esperado del PvP: el gateway lo convierte en `{ ok: false, code }` por el ack. */
export class PvpFailure extends Error {
  constructor(readonly code: PvpErrorCode) {
    super(code);
    this.name = 'PvpFailure';
  }
}
