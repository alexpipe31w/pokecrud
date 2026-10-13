/**
 * Respuesta de `GET /encounters/:id` (F2-06, contrato app↔servidor, ARQUITECTURA §2). `:id` es el id del spawn de
 * `GET /spawns`. Errores (D-028): 404 no existe, 410 su franja acabó, 403 el jugador está lejos, 409 ya resuelto.
 */
export interface EncounterView {
  id: string;
  speciesId: number;
  level: number;
  gender: 'M' | 'F' | null;
  shiny: boolean;
  heightScale: number;
  /** PC del individuo (D-049): lo calcula el servidor con sus IVs y naturaleza, que no salen de él. */
  cp: number;
  expiresAt: string;
  /** Si este jugador ya lo resolvió. */
  status: 'open' | 'caught' | 'fled';
}
