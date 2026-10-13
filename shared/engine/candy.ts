/** Caramelos (F3, D-052): por familia = cadena evolutiva del dataset. Como Pokémon GO: capturar 3, transferir 1. */
export const CANDY_PER_CATCH = 3;
export const CANDY_PER_TRANSFER = 1;

export const familyOf = (species: { evolutionChainId: number }): number => species.evolutionChainId;
