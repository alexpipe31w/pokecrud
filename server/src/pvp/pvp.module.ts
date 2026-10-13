import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SpawnsModule } from '../spawns/spawns.module.js';
import { PvpTeamsService } from './pvp-teams.service.js';
import { PvpGateway } from './pvp.gateway.js';

/** PvP en tiempo real (F5, D-056): socket `/pvp`. */
@Module({
  imports: [AuthModule, SpawnsModule],
  providers: [PvpGateway, PvpTeamsService],
})
export class PvpModule {}
