import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from './app.config';

/**
 * COMPREHENSIVE AppConfigService
 * Typed access to EVERY configuration property.
 */
@Injectable()
export class AppConfigService {
  constructor(private configService: ConfigService) {}

  get server(): AppConfig['server'] {
    return this.configService.get<AppConfig['server']>('server')!;
  }
  get database(): AppConfig['database'] {
    return this.configService.get<AppConfig['database']>('database')!;
  }
  get redis(): AppConfig['redis'] {
    return this.configService.get<AppConfig['redis']>('redis')!;
  }
  get nats(): AppConfig['nats'] {
    return this.configService.get<AppConfig['nats']>('nats')!;
  }
  get livekit(): AppConfig['livekit'] {
    return this.configService.get<AppConfig['livekit']>('livekit')!;
  }
  get livekitRoleplay(): AppConfig['livekitRoleplay'] {
    return this.configService.get<AppConfig['livekitRoleplay']>(
      'livekitRoleplay',
    )!;
  }
  get security(): AppConfig['security'] {
    return this.configService.get<AppConfig['security']>('security')!;
  }
  get upload(): AppConfig['upload'] {
    return this.configService.get<AppConfig['upload']>('upload')!;
  }
  get room(): AppConfig['room'] {
    return this.configService.get<AppConfig['room']>('room')!;
  }
  get insights(): AppConfig['insights'] {
    return this.configService.get<AppConfig['insights']>('insights')!;
  }
  get ingress(): AppConfig['ingress'] {
    return this.configService.get<AppConfig['ingress']>('ingress')!;
  }
  get analytics(): AppConfig['analytics'] {
    return this.configService.get<AppConfig['analytics']>('analytics')!;
  }
  get webhook(): AppConfig['webhook'] {
    return this.configService.get<AppConfig['webhook']>('webhook')!;
  }
  get smtp(): AppConfig['smtp'] {
    return this.configService.get<AppConfig['smtp']>('smtp')!;
  }
  get janitor(): AppConfig['janitor'] {
    return this.configService.get<AppConfig['janitor']>('janitor')!;
  }
  get timeouts(): AppConfig['timeouts'] {
    return this.configService.get<AppConfig['timeouts']>('timeouts')!;
  }
  get fastmcp(): AppConfig['fastmcp'] {
    return this.configService.get<AppConfig['fastmcp']>('fastmcp')!;
  }
  get identity(): AppConfig['identity'] {
    return this.configService.get<AppConfig['identity']>('identity')!;
  }
  get thirdParty(): AppConfig['thirdParty'] {
    return this.configService.get<AppConfig['thirdParty']>('thirdParty')!;
  }
  get firebase(): AppConfig['firebase'] {
    return this.configService.get<AppConfig['firebase']>('firebase')!;
  }
}
