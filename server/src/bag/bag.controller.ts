import { Controller, Get } from '@nestjs/common';
import type { AuthPlayer } from '../auth/auth.decorators.js';
import { CurrentPlayer } from '../auth/auth.decorators.js';
import { BagService, BagView } from './bag.service.js';

/** `GET /bag`: la mochila del jugador del token (nunca la de otro: no hay id en la ruta). */
@Controller('bag')
export class BagController {
  constructor(private readonly bag: BagService) {}

  @Get()
  get(@CurrentPlayer() player: AuthPlayer): Promise<BagView> {
    return this.bag.get(player.id);
  }
}
