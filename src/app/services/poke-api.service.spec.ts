import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import { PokeApiService, filterRefs } from './poke-api.service';

describe('PokeApiService', () => {
  let service: PokeApiService;
  let http: HttpTestingController;
  const base = environment.pokeApiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PokeApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists the first 151 with ids taken from the url', async () => {
    const result = firstValueFrom(service.list151());
    http.expectOne(`${base}/pokemon?limit=151`).flush({
      results: [
        { name: 'bulbasaur', url: `${base}/pokemon/1/` },
        { name: 'mewtwo', url: `${base}/pokemon/150/` },
      ],
    });
    expect(await result).toEqual([
      { id: 1, name: 'bulbasaur' },
      { id: 150, name: 'mewtwo' },
    ]);
  });

  it('maps a PokéAPI pokemon into a form draft with price and stock', async () => {
    const result = firstValueFrom(service.getById('Mewtwo'));
    http.expectOne(`${base}/pokemon/mewtwo`).flush({
      id: 150,
      name: 'mewtwo',
      height: 20,
      weight: 1220,
      base_experience: 306,
      types: [{ slot: 1, type: { name: 'psychic' } }],
      abilities: [{ ability: { name: 'pressure' } }],
      stats: [
        { base_stat: 106, stat: { name: 'hp' } },
        { base_stat: 154, stat: { name: 'special-attack' } },
      ],
      sprites: {
        front_default: 'small.png',
        other: { 'official-artwork': { front_default: 'big.png' } },
      },
    });
    const draft = await result;
    expect(draft).toMatchObject({
      id: 150,
      name: 'mewtwo',
      types: ['psychic'],
      abilities: ['pressure'],
      imageUrl: 'big.png',
      height: 2,
      weight: 122,
      price: 30600,
      stock: 5,
    });
    expect(draft.stats.hp).toBe(106);
    expect(draft.stats.specialAttack).toBe(154);
  });

  it('rejects ids outside 1–151 without calling the API', async () => {
    await expect(firstValueFrom(service.getById(152))).rejects.toThrow(/1 al 151/);
    await expect(firstValueFrom(service.getById(0))).rejects.toThrow(/1 al 151/);
  });

  it('rejects a name that resolves to a pokemon after #151', async () => {
    const result = firstValueFrom(service.getById('chikorita'));
    http.expectOne(`${base}/pokemon/chikorita`).flush({ id: 152 });
    await expect(result).rejects.toThrow(/1 al 151/);
  });
});

describe('filterRefs', () => {
  const refs = [
    { id: 25, name: 'pikachu' },
    { id: 150, name: 'mewtwo' },
    { id: 151, name: 'mew' },
  ];

  it('matches an exact id, with or without #', () => {
    expect(filterRefs(refs, '150')).toEqual([{ id: 150, name: 'mewtwo' }]);
    expect(filterRefs(refs, '#25')).toEqual([{ id: 25, name: 'pikachu' }]);
  });

  it('matches part of the name, ignoring case', () => {
    expect(filterRefs(refs, 'MEW').map((r) => r.id)).toEqual([150, 151]);
  });

  it('returns everything for an empty term', () => {
    expect(filterRefs(refs, '  ')).toHaveLength(3);
  });
});
