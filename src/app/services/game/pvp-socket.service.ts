import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import {
  PVP_NAMESPACE,
  type PvpClientEvents,
  type PvpErrorCode,
  type PvpServerEvents,
} from '@shared/protocol/pvp';

import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';

/** Lo que espera una petición antes de darla por perdida. */
export const PVP_REQUEST_TIMEOUT_MS = 8000;

export type PvpStatus = 'offline' | 'connecting' | 'online';

/** Opciones con las que se abre el socket (el subconjunto de Socket.IO que se usa). */
export interface PvpSocketOptions {
  transports: string[];
  /** false: se conecta cuando ya están puestos los manejadores. */
  autoConnect: boolean;
  /** Función: Socket.IO la llama en CADA (re)conexión, así siempre va el token vigente. */
  auth: (cb: (data: { token: string | null }) => void) => void;
}

export type AnyHandler = (...args: never[]) => void;

/** Lo que el servicio usa del socket de `socket.io-client` (y lo que imita el falso de los tests). */
export interface PvpSocketLike {
  connected: boolean;
  on(event: string, handler: AnyHandler): unknown;
  off(event: string, handler: AnyHandler): unknown;
  connect(): unknown;
  disconnect(): unknown;
  timeout(ms: number): { emitWithAck(event: string, body: unknown): Promise<unknown> };
}

export type PvpSocketFactory = (url: string, options: PvpSocketOptions) => Promise<PvpSocketLike>;

/** `socket.io-client` se carga al conectar (import dinámico): no pesa en el arranque de la app. */
export const PVP_SOCKET_FACTORY = new InjectionToken<PvpSocketFactory>('PVP_SOCKET_FACTORY', {
  providedIn: 'root',
  factory: () => async (url, options) => {
    const { io } = await import('socket.io-client');
    return io(url, options) as unknown as PvpSocketLike;
  },
});

type Ack<K extends keyof PvpClientEvents> = Parameters<Parameters<PvpClientEvents[K]>[1]>[0];

const MESSAGES: Partial<Record<PvpErrorCode, string>> = {
  unauthorized: 'Tu sesión caducó. Vuelve a entrar.',
  'rate-limited': 'Tienes demasiadas pantallas de combate abiertas. Cierra alguna.',
};

/**
 * Conexión al socket `/pvp` (F5-02, D-056). Se abre solo al entrar en el PvP (`connect()`), no al arrancar la app.
 * Socket.IO reconecta solo con espera creciente; si el servidor rechaza el token, se refresca UNA vez y se reintenta.
 */
@Injectable({ providedIn: 'root' })
export class PvpSocketService {
  private readonly auth = inject(AuthService);
  private readonly factory = inject(PVP_SOCKET_FACTORY);

  private readonly _status = signal<PvpStatus>('offline');
  private readonly _error = signal<string | null>(null);
  readonly status = this._status.asReadonly();
  /** Por qué se cortó (para enseñarlo), o null. */
  readonly error = this._error.asReadonly();

  private socket: PvpSocketLike | null = null;
  private opening: Promise<void> | null = null;
  private authRetried = false;
  /** Suscripciones de la app; se enganchan también a los sockets que se creen después. */
  private readonly listeners = new Map<string, Set<AnyHandler>>();

  connect(): Promise<void> {
    if (this.socket) return Promise.resolve();
    this.opening ??= this.open().finally(() => (this.opening = null));
    return this.opening;
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this._status.set('offline');
  }

  /** Petición con ack. Lanza un error legible si el servidor no responde a tiempo. */
  async request<K extends keyof PvpClientEvents>(
    event: K,
    body: Parameters<PvpClientEvents[K]>[0],
  ): Promise<Ack<K>> {
    await this.connect();
    const socket = this.socket as PvpSocketLike;
    try {
      return (await socket.timeout(PVP_REQUEST_TIMEOUT_MS).emitWithAck(event, body)) as Ack<K>;
    } catch (err) {
      console.warn('[pvp] sin respuesta del servidor', { event, err });
      throw new Error('Sin conexión con el servidor. Inténtalo otra vez.', { cause: err });
    }
  }

  /** Escucha un mensaje del servidor. Devuelve la función para dejar de escuchar. */
  on<K extends keyof PvpServerEvents>(event: K, handler: PvpServerEvents[K]): () => void {
    const h = handler as AnyHandler;
    const set = this.listeners.get(event) ?? new Set<AnyHandler>();
    set.add(h);
    this.listeners.set(event, set);
    this.socket?.on(event, h);
    return () => {
      set.delete(h);
      this.socket?.off(event, h);
    };
  }

  private async open(): Promise<void> {
    this._status.set('connecting');
    this._error.set(null);
    const socket = await this.factory(`${environment.serverUrl}${PVP_NAMESPACE}`, {
      // Solo WebSocket: sin sondeo HTTP (más simple con CORS y el proxy de Render, plan F5).
      transports: ['websocket'],
      autoConnect: false,
      auth: (cb) => void this.handshakeToken().then((token) => cb({ token })),
    });
    this.socket = socket;
    socket.on('connect', () => {
      this.authRetried = false;
      this._error.set(null);
      this._status.set('online');
    });
    socket.on('disconnect', () => {
      // Si fue disconnect() nuestro, `socket` ya no es el actual.
      if (this.socket === socket) this._status.set('connecting');
    });
    socket.on(
      'pvp:error',
      ((msg: { code: PvpErrorCode }) => void this.onServerError(socket, msg.code)) as AnyHandler,
    );
    for (const [event, set] of this.listeners) for (const h of set) socket.on(event, h);
    socket.connect();
  }

  private async onServerError(socket: PvpSocketLike, code: PvpErrorCode): Promise<void> {
    if (code === 'unauthorized' && !this.authRetried) {
      this.authRetried = true;
      if (await this.auth.refresh()) {
        socket.connect();
        return;
      }
    }
    console.warn('[pvp] el servidor cerró la conexión', { code });
    this._error.set(MESSAGES[code] ?? 'No se pudo conectar con el combate.');
    this.disconnect();
  }

  private async handshakeToken(): Promise<string | null> {
    return this.auth.getAccessToken() ?? (await this.auth.refresh());
  }
}
