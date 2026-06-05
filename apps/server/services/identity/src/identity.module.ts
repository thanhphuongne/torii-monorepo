import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { AutomapperModule } from '@automapper/nestjs';
import { pojos } from '@automapper/pojos';
import { SharedModule } from '@server/shared';

// Feature modules
import { AuthModule } from '@server/identity/modules/auth/auth.module';
import { UsersModule } from '@server/identity/modules/users/users.module';
import { AuthorizationModule } from '@server/identity/modules/authorization/authorization.module';
import { AuditModule } from '@server/identity/modules/audit/audit.module';
import { TwoFactorAuthModule } from '@server/identity/modules/two-factor-auth/two-factor-auth.module';
import { AnalyticsModule } from '@server/identity/modules/analytics/analytics.module';
import { EmailModule } from '@server/identity/modules/email/email.module';
import { NotificationModule } from '@server/identity/modules/notification/notification.module';

// Filters
import { GlobalRpcExceptionFilter } from '@server/shared';

// Services
import { DefaultAdminService } from '@server/identity/services/default-admin.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    AutomapperModule.forRoot({
      strategyInitializer: pojos(),
    }),
    SharedModule,
    AuthModule,
    UsersModule,
    AuthorizationModule,
    AuditModule,
    TwoFactorAuthModule,
    AnalyticsModule,
    EmailModule,
    NotificationModule,
  ],
  controllers: [],
  providers: [
    // Global RPC exception filter for Identity module
    {
      provide: APP_FILTER,
      useClass: GlobalRpcExceptionFilter,
    },
    // Default admin creation service
    DefaultAdminService,
  ],
  exports: [
    AuthModule,
    UsersModule,
    AuthorizationModule,
    AuditModule,
    TwoFactorAuthModule,
    AnalyticsModule,
    EmailModule,
    NotificationModule,
  ],
})
export class IdentityModule {}
