import { Module } from '@nestjs/common';
import { ProgressionService } from './progression.service.js';

@Module({
  providers: [ProgressionService],
  exports: [ProgressionService],
})
export class ProgressionModule {}
