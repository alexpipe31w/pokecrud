const SPRITES = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';

/**
 * Arte de un Pokémon en orden de prueba (CLAUDE.md: no todas las especies tienen todos los sprites):
 * `home` → `official-artwork` → el sprite normal. Con `shiny`, las versiones variocolor.
 */
export const spriteUrls = (id: number, shiny = false): string[] =>
  shiny
    ? [
        `${SPRITES}/other/home/shiny/${id}.png`,
        `${SPRITES}/other/official-artwork/shiny/${id}.png`,
        `${SPRITES}/shiny/${id}.png`,
      ]
    : [
        `${SPRITES}/other/home/${id}.png`,
        `${SPRITES}/other/official-artwork/${id}.png`,
        `${SPRITES}/${id}.png`,
      ];
