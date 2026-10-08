import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import { PokeApiService, filterRefs, spanishDescription } from './poke-api.service';

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

  it('lists every species (beyond #151) and leaves out special forms', async () => {
    const result = firstValueFrom(service.listAll());
    http.expectOne(`${base}/pokemon?limit=2000`).flush({
      results: [
        { name: 'bulbasaur', url: `${base}/pokemon/1/` },
        { name: 'lucario', url: `${base}/pokemon/448/` },
        { name: 'pecharunt', url: `${base}/pokemon/1025/` },
        { name: 'charizard-mega-x', url: `${base}/pokemon/10034/` },
      ],
    });
    expect(await result).toEqual([
      { id: 1, name: 'bulbasaur' },
      { id: 448, name: 'lucario' },
      { id: 1025, name: 'pecharunt' },
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

  it('accepts pokemon after #151', async () => {
    const result = firstValueFrom(service.getById(448));
    http.expectOne(`${base}/pokemon/448`).flush({
      id: 448,
      name: 'lucario',
      height: 12,
      weight: 540,
      base_experience: 184,
      types: [
        { slot: 2, type: { name: 'steel' } },
        { slot: 1, type: { name: 'fighting' } },
      ],
      abilities: [],
      stats: [],
      sprites: { front_default: 'l.png' },
    });
    expect(await result).toMatchObject({ id: 448, types: ['fighting', 'steel'], price: 18400 });
  });

  it('rejects an empty or invalid id without calling the API', async () => {
    await expect(firstValueFrom(service.getById(0))).rejects.toThrow(/válido/);
    await expect(firstValueFrom(service.getById('  '))).rejects.toThrow(/válido/);
  });

  it('explains when PokéAPI does not know the pokemon', async () => {
    const result = firstValueFrom(service.getById('agumon'));
    http
      .expectOne(`${base}/pokemon/agumon`)
      .flush('Not Found', { status: 404, statusText: 'Not Found' });
    await expect(result).rejects.toThrow(/No se encontró «agumon»/);
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

describe('spanishDescription', () => {
  it('takes the last Spanish entry and cleans line breaks', () => {
    const text = spanishDescription({
      flavor_text_entries: [
        { flavor_text: 'Old', language: { name: 'es' } },
        { flavor_text: 'English', language: { name: 'en' } },
        { flavor_text: 'Fue creado\npor un\fcientífico.', language: { name: 'es' } },
      ],
    });
    expect(text).toBe('Fue creado por un científico.');
  });

  it('returns an empty string when there is no Spanish entry', () => {
    expect(spanishDescription({ flavor_text_entries: [] })).toBe('');
  });
});
