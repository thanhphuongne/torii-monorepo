import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/generated';
import { PrismaPg } from '@prisma/adapter-pg';
import { loadConfig } from '../config/app.config';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const config = loadConfig();
    const adapter = new PrismaPg({
      connectionString: config.database.url,
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
