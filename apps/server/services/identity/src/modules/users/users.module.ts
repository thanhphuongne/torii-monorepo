import { Module } from '@nestjs/common';
import { PrismaModule, NatsClientModule } from '@server/shared';
import { UsersService } from '@server/identity/modules/users/users.service';
import { UsersRepository } from '@server/identity/modules/users/users.repository';
import { UserProfile } from '@server/identity/modules/users/mappings/user.profile';
import { AuthorizationModule } from '@server/identity/modules/authorization/authorization.module';
import { AuthModule } from '@server/identity/modules/auth/auth.module';
import { USERS_REPOSITORY_TOKEN } from '@server/identity/interfaces/repositories';
import {
  USERS_SERVICE_TOKEN,
  SESSION_SERVICE_TOKEN,
} from '@server/identity/interfaces/services';
import { forwardRef } from '@nestjs/common';

import { UsersHandler } from '@server/identity/modules/users/users.handler';

/**
 * Users Feature Module
 * Handles user management and profile operations
 */
@Module({
  imports: [
    PrismaModule,
    NatsClientModule,
    AuthorizationModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [UsersHandler],
  providers: [
    {
      provide: USERS_REPOSITORY_TOKEN,
      useClass: UsersRepository,
    },
    {
      provide: USERS_SERVICE_TOKEN,
      useClass: UsersService,
    },
    UserProfile,
  ],
  exports: [USERS_SERVICE_TOKEN, USERS_REPOSITORY_TOKEN],
})
export class UsersModule {}
