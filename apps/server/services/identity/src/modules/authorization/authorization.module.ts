import { Module } from '@nestjs/common';
import { PrismaModule, NatsClientModule } from '@server/shared';
import { AuthorizationService } from '@server/identity/modules/authorization/authorization.service';
import { AuthorizationConfigService } from '@server/identity/services/authorization-config.service';
import { AuthorizationSeederService } from '@server/identity/services/authorization-seeder.service';
import { AuditModule } from '@server/identity/modules/audit/audit.module';
import { AUTHORIZATION_SERVICE_TOKEN } from '@server/identity/interfaces/services';

import { AuthorizationHandler } from '@server/identity/modules/authorization/authorization.handler';

/**
 * Authorization Feature Module
 * Handles permissions, roles, and access control
 */
@Module({
  imports: [PrismaModule, NatsClientModule, AuditModule],
  controllers: [AuthorizationHandler],
  providers: [
    {
      provide: AUTHORIZATION_SERVICE_TOKEN,
      useClass: AuthorizationService,
    },
    AuthorizationConfigService,
    AuthorizationSeederService,
  ],
  exports: [
    AUTHORIZATION_SERVICE_TOKEN,
    AuthorizationConfigService,
    AuthorizationSeederService,
  ],
})
export class AuthorizationModule {}
