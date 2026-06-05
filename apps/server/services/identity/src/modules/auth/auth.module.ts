import { Module, forwardRef } from '@nestjs/common';
import { RedisModule, NatsClientModule } from '@server/shared';
import { AuthService } from '@server/identity/modules/auth/auth.service';
import { SessionService } from '@server/identity/modules/auth/session.service';
import { GoogleAuthService } from '@server/identity/modules/auth/google-auth.service';
import { FacebookAuthService } from '@server/identity/modules/auth/facebook-auth.service';
import { UserIdentityRepository } from '@server/identity/modules/auth/user-identity.repository';
import { AuthorizationModule } from '@server/identity/modules/authorization/authorization.module';
import { TwoFactorAuthModule } from '@server/identity/modules/two-factor-auth/two-factor-auth.module';
import { UsersModule } from '@server/identity/modules/users/users.module';
import { NotificationModule } from '@server/identity/modules/notification/notification.module';
import {
  AUTH_SERVICE_TOKEN,
  SESSION_SERVICE_TOKEN,
  GOOGLE_AUTH_SERVICE_TOKEN,
  FACEBOOK_AUTH_SERVICE_TOKEN,
} from '@server/identity/interfaces/services';
import { USER_IDENTITY_REPOSITORY_TOKEN } from '@server/identity/interfaces/repositories';

import { AuthHandler } from '@server/identity/modules/auth/auth.handler';

/**
 * Authentication Feature Module
 * Handles authentication, authorization, and session management
 */
@Module({
  imports: [
    RedisModule,
    NatsClientModule,
    AuthorizationModule,
    TwoFactorAuthModule,
    forwardRef(() => UsersModule),
    NotificationModule,
  ],
  controllers: [AuthHandler],
  providers: [
    {
      provide: AUTH_SERVICE_TOKEN,
      useClass: AuthService,
    },
    {
      provide: SESSION_SERVICE_TOKEN,
      useClass: SessionService,
    },
    {
      provide: GOOGLE_AUTH_SERVICE_TOKEN,
      useClass: GoogleAuthService,
    },
    {
      provide: FACEBOOK_AUTH_SERVICE_TOKEN,
      useClass: FacebookAuthService,
    },
    {
      provide: USER_IDENTITY_REPOSITORY_TOKEN,
      useClass: UserIdentityRepository,
    },
  ],
  exports: [
    AUTH_SERVICE_TOKEN,
    SESSION_SERVICE_TOKEN,
    GOOGLE_AUTH_SERVICE_TOKEN,
    FACEBOOK_AUTH_SERVICE_TOKEN,
  ],
})
export class AuthModule {}
