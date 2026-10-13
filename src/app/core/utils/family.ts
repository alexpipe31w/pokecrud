/** Tope de saltos: ninguna cadena del dataset pasa de 3; así un dato roto nunca cuelga la app. */
const MAX_STEPS = 10;

/**
 * Primera especie de la cadena evolutiva de `id` (Raichu → Pichu). Da nombre a la familia de caramelos (F3-02b,
 * D-052): "+3 caramelos de Pichu". Si la especie no está o la cadena está rota, la propia especie.
 */
export function familyBaseId(
  species: ReadonlyMap<number, { evolvesFrom: number | null }>,
  id: number,
): number {
  let current = id;
  for (let i = 0; i < MAX_STEPS; i++) {
    const from = species.get(current)?.evolvesFrom;
    if (from == null || !species.has(from)) return current;
    current = from;
  }
  return current;
}
