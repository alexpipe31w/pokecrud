/**
 * Tipos de Pokémon con su nombre en español, color de chip y color de texto.
 * Los colores salen de los tokens de src/theme/tokens.scss (una sola paleta). El texto es blanco solo
 * en los tipos oscuros; en el resto es tinta para llegar al contraste AA (DECISIONES D-015).
 */
const TEXT_ON_LIGHT = 'var(--ink)';
const TEXT_ON_DARK = 'var(--accent-ink)';

export const POKEMON_TYPES: Record<string, { label: string; color: string; text: string }> = {
  normal: { label: 'Normal', color: 'var(--t-normal)', text: TEXT_ON_LIGHT },
  fire: { label: 'Fuego', color: 'var(--t-fire)', text: TEXT_ON_LIGHT },
  water: { label: 'Agua', color: 'var(--t-water)', text: TEXT_ON_LIGHT },
  electric: { label: 'Eléctrico', color: 'var(--t-electric)', text: TEXT_ON_LIGHT },
  grass: { label: 'Planta', color: 'var(--t-grass)', text: TEXT_ON_LIGHT },
  ice: { label: 'Hielo', color: 'var(--t-ice)', text: TEXT_ON_LIGHT },
  fighting: { label: 'Lucha', color: 'var(--t-fighting)', text: TEXT_ON_DARK },
  poison: { label: 'Veneno', color: 'var(--t-poison)', text: TEXT_ON_DARK },
  ground: { label: 'Tierra', color: 'var(--t-ground)', text: TEXT_ON_LIGHT },
  flying: { label: 'Volador', color: 'var(--t-flying)', text: TEXT_ON_LIGHT },
  psychic: { label: 'Psíquico', color: 'var(--t-psychic)', text: TEXT_ON_LIGHT },
  bug: { label: 'Bicho', color: 'var(--t-bug)', text: TEXT_ON_LIGHT },
  rock: { label: 'Roca', color: 'var(--t-rock)', text: TEXT_ON_LIGHT },
  ghost: { label: 'Fantasma', color: 'var(--t-ghost)', text: TEXT_ON_DARK },
  dragon: { label: 'Dragón', color: 'var(--t-dragon)', text: TEXT_ON_DARK },
  dark: { label: 'Siniestro', color: 'var(--t-dark)', text: TEXT_ON_DARK },
  steel: { label: 'Acero', color: 'var(--t-steel)', text: TEXT_ON_LIGHT },
  fairy: { label: 'Hada', color: 'var(--t-fairy)', text: TEXT_ON_LIGHT },
};

export const POKEMON_TYPE_KEYS = Object.keys(POKEMON_TYPES);
