import { IsISO8601, IsOptional, ValidateIf, IsUrl } from 'class-validator';

/** Los 18 tipos (claves en inglés, como PokéAPI y `src/app/shared` de la app). */
export const POKEMON_TYPES = [
  'normal',
  'fire',
  'water',
  'electric',
  'grass',
  'ice',
  'fighting',
  'poison',
  'ground',
  'flying',
  'psychic',
  'bug',
  'rock',
  'ghost',
  'dragon',
  'dark',
  'steel',
  'fairy',
] as const;

/** Vacío o una URL http(s). */
export const OptionalImageUrl = (): PropertyDecorator => (target, key) => {
  ValidateIf((o: Record<string | symbol, unknown>) => o[key] !== '')(
    target,
    key,
  );
  IsUrl({ protocols: ['http', 'https'], require_protocol: true })(target, key);
};

/**
 * `createdAt`/`updatedAt` que mandan los clientes de JSON Server (la app de IS-11 y Postman): se aceptan para no
 * romper el contrato pero se IGNORAN; las fechas las pone el servidor.
 */
export class ClientTimestamps {
  @IsOptional()
  @IsISO8601()
  createdAt?: string;

  @IsOptional()
  @IsISO8601()
  updatedAt?: string;
}
