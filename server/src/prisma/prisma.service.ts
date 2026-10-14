import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const url = process.env['DATABASE_URL'];
    if (!url)
      throw new Error(
        'DATABASE_URL no está definida (ver docs/plan/SECRETOS.md)',
      );
    // Pool pequeño: el session pooler gratis de Supabase tiene pocas conexiones.
    super({
      adapter: new PrismaPg({
        connectionString: url,
        max: 5,
        connectionTimeoutMillis: 5000,
      }),
    });
  }
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
