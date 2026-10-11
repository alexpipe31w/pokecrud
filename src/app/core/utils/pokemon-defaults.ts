/**
 * Valores iniciales de precio y stock (PokéAPI no los tiene).
 * scripts/seed-151.mjs usa las mismas reglas para precargar la base de datos.
 */
export function defaultPrice(baseExperience: number | null | undefined): number {
  return Math.max(1, baseExperience ?? 0) * 100;
}

export function defaultStock(id: number): number {
  return ((id * 7) % 50) + 5;
}

/** URL del sprite pequeño de PokéAPI (para listas y buscador). */
export function spriteUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

/** Nombre con la primera letra en mayúscula (`mewtwo` → `Mewtwo`). */
export function displayName(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** Formatea el número de la Pokédex como `#001`. */
export function dexNumber(id: number): string {
  return `#${String(id).padStart(3, '0')}`;
}
