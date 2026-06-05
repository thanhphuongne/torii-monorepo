import { Module } from '@nestjs/common';
import { NatsClientModule } from '@server/shared';

// Identity Controllers (Gateway)
import { UsersController } from './controllers/users.controller';
import { AuthorizationController } from './controllers/authorization.controller';
import { AuditLogController } from './controllers/audit-log.controller';
import { TwoFactorAuthController } from './controllers/two-factor-auth.controller';
import { AuthController } from './controllers/auth.controller';

import { ProfilesController } from './controllers/profiles.controller';
import { NotificationController } from './controllers/notification.controller';
import { OnboardingController } from './controllers/onboarding.controller';

/**
 * Identity Module for Gateway
 * Handles all Identity service HTTP routes via NATS
 */
@Module({
  imports: [NatsClientModule],
  controllers: [
    UsersController,
    AuthorizationController,
    AuditLogController,
    TwoFactorAuthController,
    AuthController,
    ProfilesController,
    NotificationController,
    OnboardingController,
  ],
})
export class IdentityModule {}
