import { Module } from '@nestjs/common';
import { RedisModule } from '@server/shared';
import { TwoFactorAuthService } from '@server/identity/modules/two-factor-auth/two-factor-auth.service';
import { TwoFactorAuthRepository } from '@server/identity/modules/two-factor-auth/two-factor-auth.repository';
import { TWO_FACTOR_AUTH_SERVICE_TOKEN } from '@server/identity/interfaces/services';
import { TWO_FACTOR_AUTH_REPOSITORY_TOKEN } from '@server/identity/interfaces/repositories';

import { TwoFactorAuthHandler } from '@server/identity/modules/two-factor-auth/two-factor-auth.handler';

/**
 * Two-Factor Authentication Feature Module
 * Handles TOTP setup, verification, and backup codes
 */
@Module({
  imports: [RedisModule],
  controllers: [TwoFactorAuthHandler],
  providers: [
    {
      provide: TWO_FACTOR_AUTH_SERVICE_TOKEN,
      useClass: TwoFactorAuthService,
    },
    {
      provide: TWO_FACTOR_AUTH_REPOSITORY_TOKEN,
      useClass: TwoFactorAuthRepository,
    },
  ],
  exports: [TWO_FACTOR_AUTH_SERVICE_TOKEN],
})
export class TwoFactorAuthModule {}
