import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular';

import { environment } from '../../../environments/environment';
import { UiService } from '../../services/ui.service';
import { errorInterceptor } from './error.interceptor';

describe('errorInterceptor (HU-07)', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  const ui = { errorToast: vi.fn() };
  const dbUrl = `${environment.apiUrl}/pokemon`;
  const pokeApiUrl = `${environment.pokeApiUrl}/pokemon/25`;

  /** Hace la petición, responde con el error indicado y devuelve el error que recibió quien llamó. */
  function failWith(url: string, status: number, network = false): unknown {
    let received: unknown;
    http.get(url).subscribe({ error: (e) => (received = e) });
    const req = backend.expectOne(url);
    if (network) req.error(new ProgressEvent('error'), { status: 0, statusText: '' });
    else req.flush(null, { status, statusText: 'Error' });
    return received;
  }

  beforeEach(() => {
    ui.errorToast.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(),
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: UiService, useValue: ui },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('explains that the backend is down when JSON Server does not answer', () => {
    failWith(dbUrl, 0, true);
    expect(ui.errorToast).toHaveBeenCalledWith(expect.stringContaining('npm run api'));
  });

  it('explains that PokéAPI is unreachable when there is no internet', () => {
    failWith(pokeApiUrl, 0, true);
    expect(ui.errorToast).toHaveBeenCalledWith(expect.stringContaining('PokéAPI'));
  });

  it('shows a friendly message for server errors', () => {
    failWith(dbUrl, 500);
    expect(ui.errorToast).toHaveBeenCalledWith(
      'El servidor tuvo un problema. Intenta de nuevo en un momento.',
    );
  });

  it('shows a friendly message for invalid data', () => {
    failWith(dbUrl, 400);
    expect(ui.errorToast).toHaveBeenCalledWith('Los datos enviados no son válidos.');
  });

  it('does not warn about 404, which the pages show as a state', () => {
    failWith(`${dbUrl}/9999`, 404);
    expect(ui.errorToast).not.toHaveBeenCalled();
  });

  it('passes the original error on to the caller', () => {
    const err = failWith(dbUrl, 500) as { status: number };
    expect(err.status).toBe(500);
  });

  it('does nothing when the request succeeds', () => {
    http.get(dbUrl).subscribe();
    backend.expectOne(dbUrl).flush([]);
    expect(ui.errorToast).not.toHaveBeenCalled();
  });
});

describe('UiService.errorToast', () => {
  it('shows the same error only once when several requests fail together', async () => {
    TestBed.configureTestingModule({ providers: [provideIonicAngular()] });
    const service = TestBed.inject(UiService);
    const toast = vi.spyOn(service, 'toast').mockResolvedValue();

    service.errorToast('Sin conexión');
    service.errorToast('Sin conexión');
    service.errorToast('Otro error');

    expect(toast).toHaveBeenCalledTimes(2);
    expect(toast).toHaveBeenNthCalledWith(1, 'Sin conexión', 'danger');
    expect(toast).toHaveBeenNthCalledWith(2, 'Otro error', 'danger');
  });
});
