/** Tipos de Pokémon con su nombre en español y color de chip. */
export const POKEMON_TYPES: Record<string, { label: string; color: string }> = {
  normal: { label: 'Normal', color: '#a8a77a' },
  fire: { label: 'Fuego', color: '#ee8130' },
  water: { label: 'Agua', color: '#6390f0' },
  electric: { label: 'Eléctrico', color: '#d4a90b' },
  grass: { label: 'Planta', color: '#5fa83a' },
  ice: { label: 'Hielo', color: '#5fbfbb' },
  fighting: { label: 'Lucha', color: '#c22e28' },
  poison: { label: 'Veneno', color: '#a33ea1' },
  ground: { label: 'Tierra', color: '#c4a245' },
  flying: { label: 'Volador', color: '#8f7fd8' },
  psychic: { label: 'Psíquico', color: '#f95587' },
  bug: { label: 'Bicho', color: '#8a9a1b' },
  rock: { label: 'Roca', color: '#a8932e' },
  ghost: { label: 'Fantasma', color: '#735797' },
  dragon: { label: 'Dragón', color: '#6f35fc' },
  dark: { label: 'Siniestro', color: '#705746' },
  steel: { label: 'Acero', color: '#8f8fa8' },
  fairy: { label: 'Hada', color: '#d685ad' },
};

export const POKEMON_TYPE_KEYS = Object.keys(POKEMON_TYPES);
