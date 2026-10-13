import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SpawnsModule } from '../spawns/spawns.module.js';
import { BattleDataService } from './battle-data.service.js';
import { BattleRoomsService } from './battle-rooms.service.js';
import { PvpLobby } from './pvp-lobby.js';
import { PvpTeamsService } from './pvp-teams.service.js';
import { PvpGateway } from './pvp.gateway.js';

/** PvP en tiempo real (F5, D-056): socket `/pvp`, sala de espera y combates en memoria (un proceso, D-005). */
@Module({
  imports: [AuthModule, SpawnsModule],
  providers: [
    PvpGateway,
    PvpTeamsService,
    BattleDataService,
    BattleRoomsService,
    // Clase pura (reloj y azar inyectables para sus tests): una instancia para todo el servidor.
    { provide: PvpLobby, useFactory: () => new PvpLobby() },
  ],
})
export class PvpModule {}
