import type { BattleEvent, MajorStatus, SideIndex, StageStat } from '@shared/engine/battle/types';

/**
 * Textos en español de los eventos del motor (F4-05). El motor no sabe de idiomas (D-031): la escena le pasa
 * los nombres y aquí se arma la frase, igual que en los juegos. `null` = el evento no lleva texto (se anima y ya).
 */
export interface Names {
  /** Nombre del Pokémon activo de cada lado (ya traducido). El rival lleva "del rival" delante en los textos. */
  pokemon: (side: SideIndex) => string;
  move: (moveId: number) => string;
  /** Nombre del entrenador de cada lado. */
  trainer: (side: SideIndex) => string;
  /** Lado del jugador (el otro es el rival). */
  player: SideIndex;
}

const STATUS_TEXT: Record<MajorStatus, string> = {
  burn: 'se ha quemado',
  paralysis: 'está paralizado. Quizá no se pueda mover',
  poison: 'ha sido envenenado',
  toxic: 'ha sido gravemente envenenado',
  sleep: 'se ha dormido',
  freeze: 'se ha congelado',
};

const STAT_TEXT: Record<StageStat, string> = {
  attack: 'Ataque',
  defense: 'Defensa',
  specialAttack: 'Ataque Especial',
  specialDefense: 'Defensa Especial',
  speed: 'Velocidad',
  accuracy: 'Precisión',
  evasion: 'Evasión',
};

function statChange(change: number): string {
  const n = Math.abs(change);
  const how = n >= 3 ? 'muchísimo' : n === 2 ? 'mucho' : '';
  return `${change > 0 ? 'ha subido' : 'ha bajado'}${how ? ` ${how}` : ''}`;
}

export function describeEvent(e: BattleEvent, n: Names): string | null {
  const who = (side: SideIndex) =>
    side === n.player ? n.pokemon(side) : `${n.pokemon(side)} rival`;
  switch (e.kind) {
    case 'switch':
      return e.side === n.player
        ? `¡Adelante, ${n.pokemon(e.side)}!`
        : `${n.trainer(e.side)} saca a ${n.pokemon(e.side)}.`;
    case 'move':
      return `¡${who(e.side)} usó ${n.move(e.moveId)}!`;
    case 'struggle':
      return `¡A ${who(e.side)} no le quedan PP y forcejea!`;
    case 'cant-move':
      return {
        sleep: `${who(e.side)} está dormido como un tronco.`,
        freeze: `¡${who(e.side)} está congelado!`,
        paralysis: `¡${who(e.side)} está paralizado y no se puede mover!`,
        flinch: `¡${who(e.side)} retrocedió!`,
      }[e.reason];
    case 'wake':
      return `¡${who(e.side)} se ha despertado!`;
    case 'thaw':
      return `¡${who(e.side)} se ha descongelado!`;
    case 'confusion-hit':
      return `¡Está tan confuso que se hirió a sí mismo!`;
    case 'confusion-end':
      return `${who(e.side)} ya no está confuso.`;
    case 'confused':
      return `¡${who(e.side)} se encuentra confuso!`;
    case 'miss':
      return `¡El ataque de ${who(e.side)} ha fallado!`;
    case 'crit':
      return '¡Un golpe crítico!';
    case 'effectiveness':
      return e.multiplier > 1
        ? '¡Es superefectivo!'
        : e.multiplier > 0
          ? 'No es muy efectivo…'
          : null;
    case 'immune':
      return `No afecta a ${who(e.side)}…`;
    case 'hits':
      return `¡Recibió ${e.count} golpes!`;
    case 'damage':
      return e.source === 'burn'
        ? `${who(e.side)} se resiente de la quemadura.`
        : e.source === 'poison'
          ? `${who(e.side)} sufre por el veneno.`
          : e.source === 'recoil'
            ? `${who(e.side)} también se ha hecho daño.`
            : null;
    case 'heal':
      return `${who(e.side)} ha recuperado salud.`;
    case 'status':
      return `¡${who(e.side)} ${STATUS_TEXT[e.status]}!`;
    case 'stat':
      return `¡${STAT_TEXT[e.stat]} de ${who(e.side)} ${statChange(e.change)}!`;
    case 'stat-limit':
      return `¡${STAT_TEXT[e.stat]} de ${who(e.side)} no puede ${e.up ? 'subir' : 'bajar'} más!`;
    case 'fail':
      return '¡Pero no ha tenido efecto!';
    case 'faint':
      return `¡${who(e.side)} se ha debilitado!`;
    case 'needs-switch':
      return e.side === n.player ? '¿Qué Pokémon vas a sacar?' : null;
    case 'forfeit':
      return e.side === n.player
        ? '¡Has huido del combate!'
        : `${n.trainer(e.side)} se ha rendido.`;
    case 'win':
      return e.side === n.player
        ? `¡Has derrotado a ${n.trainer(e.side === 0 ? 1 : 0)}!`
        : `${n.trainer(e.side)} te ha ganado…`;
  }
}

/** Final de un combate PvP según el motivo (F5-04): [si ganas, si pierdes]. */
export const PVP_END_TEXT: Record<'faint' | 'forfeit' | 'abandon' | 'inactive', [string, string]> =
  {
    faint: ['¡Ganaste el combate!', 'Perdiste el combate.'],
    forfeit: ['Tu rival se rindió. ¡Ganaste!', 'Te rendiste.'],
    abandon: ['Tu rival se desconectó. ¡Ganaste!', 'Perdiste por desconectarte.'],
    inactive: ['Tu rival no eligió a tiempo. ¡Ganaste!', 'Perdiste por no elegir a tiempo.'],
  };
