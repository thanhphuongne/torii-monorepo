import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma/prisma.service';
import { PrismaModule } from './prisma/prisma.module';
import { JwtTokenProvider } from './providers/jwt-token.provider';
import { BlacklistService } from './services/blacklist.service';

import { RedisModule } from './redis/redis.module';
import { EncryptionModule } from './encryption/encryption.module';
import { SharedStorageModule } from './storage/shared-storage.module';
import { SharedEmailModule } from './email/shared-email.module';
import { loadConfig } from './config/app.config';
import { AppConfigService } from './config/app-config.service';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [loadConfig],
    }),
    PrismaModule,
    RedisModule,
    EncryptionModule,
    SharedStorageModule,
    SharedEmailModule,
  ],
  providers: [
    PrismaService,
    JwtTokenProvider,
    BlacklistService,
    AppConfigService,
  ],
  exports: [
    PrismaService,
    PrismaModule,
    ConfigModule,
    JwtTokenProvider,
    BlacklistService,
    RedisModule,
    EncryptionModule,
    SharedStorageModule,
    SharedEmailModule,
    AppConfigService,
  ],
})
export class SharedModule {}
