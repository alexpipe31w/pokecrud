import { Module } from '@nestjs/common';
import { BagController } from './bag.controller.js';
import { BagService } from './bag.service.js';

@Module({
  controllers: [BagController],
  providers: [BagService],
  exports: [BagService],
})
export class BagModule {}
