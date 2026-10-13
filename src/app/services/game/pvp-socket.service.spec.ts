import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import {
  PVP_REQUEST_TIMEOUT_MS,
  PVP_SOCKET_FACTORY,
  PvpSocketService,
  type AnyHandler,
  type PvpSocketLike,
  type PvpSocketOptions,
} from './pvp-socket.service';

type Handler = AnyHandler;

/** Socket falso: guarda los manejadores y deja disparar eventos del servidor. */
class FakeSocket implements PvpSocketLike {
  connected = false;
  readonly handlers = new Map<string, Set<Handler>>();
  readonly sent: { event: string; body: unknown; timeout: number }[] = [];
  reply: unknown = { ok: true };
  connectCalls = 0;
  closed = false;

  constructor(
    readonly url: string,
    readonly options: PvpSocketOptions,
  ) {}

  on(event: string, h: Handler): this {
    const set = this.handlers.get(event) ?? new Set<Handler>();
    set.add(h);
    this.handlers.set(event, set);
    return this;
  }
  off(event: string, h: Handler): this {
    this.handlers.get(event)?.delete(h);
    return this;
  }
  connect(): this {
    this.connectCalls++;
    return this;
  }
  disconnect(): this {
    this.closed = true;
    this.connected = false;
    return this;
  }
  timeout(ms: number) {
    return {
      emitWithAck: async (event: string, body: unknown) => {
        this.sent.push({ event, body, timeout: ms });
        if (this.reply instanceof Error) throw this.reply;
        return this.reply;
      },
    };
  }
  fire(event: string, ...args: unknown[]): void {
    if (event === 'connect') this.connected = true;
    if (event === 'disconnect') this.connected = false;
    for (const h of this.handlers.get(event) ?? []) (h as (...a: unknown[]) => void)(...args);
  }
  /** Lo que mandaría el handshake (la opción `auth` es una función). */
  async handshakeAuth(): Promise<unknown> {
    const auth = this.options.auth;
    return new Promise((resolve) => auth((data) => resolve(data)));
  }
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('PvpSocketService', () => {
  let svc: PvpSocketService;
  let sockets: FakeSocket[];
  let token: string | null;
  const auth = {
    getAccessToken: vi.fn(() => token),
    refresh: vi.fn(async () => (token = 'nuevo')),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    sockets = [];
    token = 'actual';
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        {
          provide: PVP_SOCKET_FACTORY,
          useValue: async (url: string, options: PvpSocketOptions) => {
            const s = new FakeSocket(url, options);
            sockets.push(s);
            return s;
          },
        },
      ],
    });
    svc = TestBed.inject(PvpSocketService);
  });

  it('conecta a /pvp del servidor, solo por WebSocket, y una sola vez aunque se llame dos veces', async () => {
    expect(svc.status()).toBe('offline');
    await Promise.all([svc.connect(), svc.connect()]);
    expect(sockets).toHaveLength(1);
    expect(sockets[0].url).toBe(`${environment.serverUrl}/pvp`);
    expect(sockets[0].options.transports).toEqual(['websocket']);
    expect(sockets[0].options.autoConnect).toBe(false);
    expect(sockets[0].connectCalls).toBe(1);
    expect(svc.status()).toBe('connecting');
    sockets[0].fire('connect');
    expect(svc.status()).toBe('online');
  });

  it('el handshake lleva el token ACTUAL en cada (re)conexión, y lo refresca si no hay', async () => {
    await svc.connect();
    expect(await sockets[0].handshakeAuth()).toEqual({ token: 'actual' });
    token = null;
    expect(await sockets[0].handshakeAuth()).toEqual({ token: 'nuevo' });
    expect(auth.refresh).toHaveBeenCalledTimes(1);
  });

  it('unauthorized → refresca el token y reintenta UNA vez; si vuelve a fallar, sesión perdida', async () => {
    await svc.connect();
    const s = sockets[0];
    s.fire('pvp:error', { code: 'unauthorized' });
    await flush();
    expect(auth.refresh).toHaveBeenCalledTimes(1);
    expect(s.connectCalls).toBe(2); // al abrir + el reintento
    s.fire('pvp:error', { code: 'unauthorized' });
    await flush();
    expect(auth.refresh).toHaveBeenCalledTimes(1);
    expect(svc.status()).toBe('offline');
    expect(svc.error()).toMatch(/sesión/i);
  });

  it('tras conectar bien, un unauthorized posterior vuelve a tener su reintento', async () => {
    await svc.connect();
    const s = sockets[0];
    s.fire('pvp:error', { code: 'unauthorized' });
    await flush();
    s.fire('connect');
    s.fire('pvp:error', { code: 'unauthorized' });
    await flush();
    expect(auth.refresh).toHaveBeenCalledTimes(2);
  });

  it('request manda con ack y tiempo límite, y devuelve la respuesta del servidor', async () => {
    await svc.connect();
    sockets[0].reply = { ok: true, battle: null, lobby: null };
    expect(await svc.request('pvp:hello', {})).toEqual({ ok: true, battle: null, lobby: null });
    expect(sockets[0].sent).toEqual([
      { event: 'pvp:hello', body: {}, timeout: PVP_REQUEST_TIMEOUT_MS },
    ]);
  });

  it('request sin respuesta → error legible', async () => {
    await svc.connect();
    sockets[0].reply = new Error('operation has timed out');
    await expect(svc.request('pvp:hello', {})).rejects.toThrow(/sin conexión con el servidor/i);
  });

  it('on() se suscribe a eventos del servidor y devuelve cómo darse de baja', async () => {
    await svc.connect();
    const seen: unknown[] = [];
    const off = svc.on('battle:end', (m) => seen.push(m));
    sockets[0].fire('battle:end', { battleId: 'b', winner: 0, reason: 'faint' });
    off();
    sockets[0].fire('battle:end', { battleId: 'b', winner: 1, reason: 'faint' });
    expect(seen).toEqual([{ battleId: 'b', winner: 0, reason: 'faint' }]);
  });

  it('on() antes de conectar también vale (se engancha al crear el socket)', async () => {
    const seen: unknown[] = [];
    svc.on('battle:end', (m) => seen.push(m));
    await svc.connect();
    sockets[0].fire('battle:end', { battleId: 'b', winner: null, reason: 'abandon' });
    expect(seen).toHaveLength(1);
  });

  it('desconexión del servidor o de la red → connecting (Socket.IO reintenta solo); disconnect() → offline', async () => {
    await svc.connect();
    sockets[0].fire('connect');
    sockets[0].fire('disconnect', 'transport close');
    expect(svc.status()).toBe('connecting');
    svc.disconnect();
    expect(svc.status()).toBe('offline');
    expect(sockets[0].closed).toBe(true);
    await svc.connect();
    expect(sockets).toHaveLength(2);
  });
});
