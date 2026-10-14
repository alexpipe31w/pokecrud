/**
 * Objetos del inventario (F1-08). Las claves coinciden con el enum `InventoryItem` de Prisma. Los multiplicadores de
 * captura de cada bola/baya van en `capture.ts` (F2-06), no aquí.
 */
export const ITEMS = ['POKE_BALL', 'GREAT_BALL', 'ULTRA_BALL', 'RAZZ_BERRY'] as const;
export type ItemId = (typeof ITEMS)[number];

export const ITEM_NAMES: Record<ItemId, string> = {
  POKE_BALL: 'Poké Ball',
  GREAT_BALL: 'Super Ball',
  ULTRA_BALL: 'Ultra Ball',
  RAZZ_BERRY: 'Baya Frambu',
};

/** Lo que recibe un jugador nuevo (y los que ya existían al crear el inventario, D-026). */
export const STARTER_KIT: Readonly<Record<ItemId, number>> = {
  POKE_BALL: 30,
  GREAT_BALL: 5,
  ULTRA_BALL: 0,
  RAZZ_BERRY: 5,
};
