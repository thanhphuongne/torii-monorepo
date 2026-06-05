import { Provider } from '@nestjs/common';
import Redis from 'ioredis';
import { AppConfigService } from '../config/app-config.service';

export const REDIS_CLIENT = 'REDIS_CLIENT';

export const redisProvider: Provider = {
  provide: REDIS_CLIENT,
  useFactory: (appConfig: AppConfigService) => {
    const { host, port, password } = appConfig.redis;

    return new Redis({
      host,
      port,
      password,
    });
  },
  inject: [AppConfigService],
};
