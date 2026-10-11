import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';

import { environment } from '../../environments/environment';
import { Pokemon, PokemonDraft } from '../models/pokemon.model';

/** CRUD de los Pokémon guardados en el backend propio (JSON Server → `/pokemon`). */
@Injectable({ providedIn: 'root' })
export class PokemonService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/pokemon`;
  private readonly _version = signal(0);

  /** Cambia cada vez que se crea, edita o elimina un Pokémon (para recargar listas). */
  readonly version = this._version.asReadonly();

  getAll(): Observable<Pokemon[]> {
    return this.http.get<Pokemon[]>(this.url, { params: { _sort: 'id', _order: 'asc' } });
  }

  getById(id: number): Observable<Pokemon> {
    return this.http.get<Pokemon>(`${this.url}/${id}`);
  }

  /** `true` si el Pokémon ya está guardado (JSON Server responde 404 si no). */
  exists(id: number): Observable<boolean> {
    return this.getById(id).pipe(
      map(() => true),
      catchError(() => of(false)),
    );
  }

  create(draft: PokemonDraft): Observable<Pokemon> {
    const now = new Date().toISOString();
    return this.http
      .post<Pokemon>(this.url, { ...draft, createdAt: now, updatedAt: now })
      .pipe(tap(() => this.bump()));
  }

  update(pokemon: Pokemon): Observable<Pokemon> {
    const body: Pokemon = { ...pokemon, updatedAt: new Date().toISOString() };
    return this.http.put<Pokemon>(`${this.url}/${pokemon.id}`, body).pipe(tap(() => this.bump()));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`).pipe(tap(() => this.bump()));
  }

  private bump(): void {
    this._version.update((v) => v + 1);
  }
}
