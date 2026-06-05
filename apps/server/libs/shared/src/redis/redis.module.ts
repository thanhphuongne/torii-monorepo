import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { redisProvider, REDIS_CLIENT } from './redis.provider';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [redisProvider],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
