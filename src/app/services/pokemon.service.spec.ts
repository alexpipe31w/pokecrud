import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import { Pokemon } from '../models/pokemon.model';
import { PokemonService } from './pokemon.service';

const MEWTWO: Pokemon = {
  id: 150,
  name: 'mewtwo',
  types: ['psychic'],
  abilities: ['pressure'],
  imageUrl: '',
  height: 2,
  weight: 122,
  baseExperience: 306,
  stats: { hp: 106, attack: 110, defense: 90, specialAttack: 154, specialDefense: 90, speed: 130 },
  price: 30600,
  stock: 5,
  createdAt: '2026-10-08T00:00:00.000Z',
  updatedAt: '2026-10-08T00:00:00.000Z',
};

describe('PokemonService', () => {
  let service: PokemonService;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/pokemon`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PokemonService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists pokemon sorted by id', async () => {
    const result = firstValueFrom(service.getAll());
    http.expectOne(`${url}?_sort=id&_order=asc`).flush([MEWTWO]);
    expect(await result).toEqual([MEWTWO]);
  });

  it('creates with POST, adds dates and bumps the version', async () => {
    const { createdAt: _c, updatedAt: _u, ...draft } = MEWTWO;
    const before = service.version();
    const result = firstValueFrom(service.create(draft));
    const req = http.expectOne(url);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.id).toBe(150);
    expect(req.request.body.createdAt).toBeTruthy();
    req.flush(MEWTWO);
    await result;
    expect(service.version()).toBe(before + 1);
  });

  it('updates with PUT on /pokemon/:id', async () => {
    const result = firstValueFrom(service.update({ ...MEWTWO, price: 50000 }));
    const req = http.expectOne(`${url}/150`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.price).toBe(50000);
    req.flush(MEWTWO);
    await result;
  });

  it('deletes with DELETE on /pokemon/:id', async () => {
    const result = firstValueFrom(service.delete(150));
    const req = http.expectOne(`${url}/150`);
    expect(req.request.method).toBe('DELETE');
    req.flush({});
    await result;
  });

  it('exists() is false when the API answers 404', async () => {
    const result = firstValueFrom(service.exists(150));
    http.expectOne(`${url}/150`).flush(null, { status: 404, statusText: 'Not Found' });
    expect(await result).toBe(false);
  });
});
