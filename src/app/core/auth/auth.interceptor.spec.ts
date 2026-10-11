import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

const SERVER = `${environment.serverUrl}/inventario`;
const settle = () => new Promise((r) => setTimeout(r, 0));

describe('authInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  const auth = {
    getAccessToken: vi.fn<() => string | null>(),
    refresh: vi.fn<() => Promise<string | null>>(),
    logout: vi.fn(() => Promise.resolve()),
  };
  const router = { navigateByUrl: vi.fn(() => Promise.resolve(true)) };

  beforeEach(() => {
    vi.clearAllMocks();
    auth.getAccessToken.mockReturnValue('acc-1');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('añade el Bearer a las peticiones al servidor del juego', () => {
    http.get(SERVER).subscribe();
    expect(backend.expectOne(SERVER).request.headers.get('Authorization')).toBe('Bearer acc-1');
  });

  it('NO manda el token a PokéAPI ni a JSON Server', () => {
    const pokeApi = `${environment.pokeApiUrl}/pokemon/25`;
    const jsonServer = `${environment.apiUrl}/pokemon`;
    http.get(pokeApi).subscribe();
    http.get(jsonServer).subscribe();
    expect(backend.expectOne(pokeApi).request.headers.has('Authorization')).toBe(false);
    expect(backend.expectOne(jsonServer).request.headers.has('Authorization')).toBe(false);
  });

  it('ante un 401 refresca una vez y repite la petición con el token nuevo', async () => {
    auth.refresh.mockResolvedValue('acc-2');
    const result = firstValueFrom(http.get<{ ok: boolean }>(SERVER));
    backend.expectOne(SERVER).flush({}, { status: 401, statusText: 'Unauthorized' });
    await settle();
    const retry = backend.expectOne(SERVER);
    expect(retry.request.headers.get('Authorization')).toBe('Bearer acc-2');
    retry.flush({ ok: true });
    expect(await result).toEqual({ ok: true });
    expect(auth.refresh).toHaveBeenCalledTimes(1);
  });

  it('si el refresh falla, cierra sesión y lleva a /login', async () => {
    auth.refresh.mockResolvedValue(null);
    const result = firstValueFrom(http.get(SERVER)).catch((e: { status: number }) => e.status);
    backend.expectOne(SERVER).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(await result).toBe(401);
    await settle();
    expect(auth.logout).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('si la petición repetida vuelve a dar 401 no entra en bucle', async () => {
    auth.refresh.mockResolvedValue('acc-2');
    const result = firstValueFrom(http.get(SERVER)).catch((e: { status: number }) => e.status);
    backend.expectOne(SERVER).flush({}, { status: 401, statusText: 'Unauthorized' });
    await settle();
    backend.expectOne(SERVER).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(await result).toBe(401);
    expect(auth.refresh).toHaveBeenCalledTimes(1);
  });

  it('los demás errores pasan tal cual, sin refrescar', async () => {
    const result = firstValueFrom(http.get(SERVER)).catch((e: { status: number }) => e.status);
    backend.expectOne(SERVER).flush({}, { status: 500, statusText: 'Error' });
    expect(await result).toBe(500);
    expect(auth.refresh).not.toHaveBeenCalled();
  });
});
