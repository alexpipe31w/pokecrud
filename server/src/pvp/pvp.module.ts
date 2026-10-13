import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PvpGateway } from './pvp.gateway.js';

/** PvP en tiempo real (F5, D-056): socket `/pvp`. */
@Module({
  imports: [AuthModule],
  providers: [PvpGateway],
})
export class PvpModule {}
