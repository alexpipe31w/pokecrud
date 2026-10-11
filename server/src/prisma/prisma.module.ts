import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

/** Un solo cliente de Prisma (y un solo pool) para todo el servidor. */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
