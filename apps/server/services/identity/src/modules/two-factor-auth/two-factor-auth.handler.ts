import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import type { ITwoFactorAuthService } from '@server/identity/interfaces/services';
import { TWO_FACTOR_AUTH_SERVICE_TOKEN } from '@server/identity/interfaces/services';
import { PrismaService } from '@server/shared';
import * as argon2 from 'argon2';

@Controller()
export class TwoFactorAuthHandler {
  constructor(
    @Inject(TWO_FACTOR_AUTH_SERVICE_TOKEN)
    private readonly twoFactorAuthService: ITwoFactorAuthService,
    private readonly prisma: PrismaService,
  ) {}

  @MessagePattern({ cmd: 'identity.2fa.generateTotpSecret' })
  async generateTotpSecret(@Payload() data: { userId: string }) {
    return this.twoFactorAuthService.generateTotpSecret(data.userId);
  }

  @MessagePattern({ cmd: 'identity.2fa.enableTotp' })
  async enableTotp(
    @Payload() data: { userId: string; secret: string; code: string },
  ) {
    return this.twoFactorAuthService.enableTotp(
      data.userId,
      data.secret,
      data.code,
    );
  }

  @MessagePattern({ cmd: 'identity.2fa.disableTotp' })
  async disableTotp(@Payload() data: { userId: string; password?: string }) {
    // Verify password logic was in controller. Moving it here for security.
    // Or if Gateway already checked? Gateway passed password.
    if (data.password) {
      const user = await this.prisma.user.findUnique({
        where: { id: data.userId },
        select: { password: true },
      });

      if (!user || !user.password) {
        throw new Error('Invalid password');
      }

      const isValid = await argon2.verify(user.password, data.password);
      if (!isValid) {
        throw new Error('Invalid password');
      }
    }

    await this.twoFactorAuthService.disable2FA(data.userId);
    return { success: true };
  }

  @MessagePattern({ cmd: 'identity.2fa.regenerateBackupCodes' })
  async regenerateBackupCodes(@Payload() data: { userId: string }) {
    const backupCodes = await this.twoFactorAuthService.regenerateBackupCodes(
      data.userId,
    );
    return { backupCodes };
  }

  @MessagePattern({ cmd: 'identity.2fa.getStatus' })
  async getStatus(@Payload() data: { userId: string }) {
    return this.twoFactorAuthService.get2FAStatus(data.userId);
  }
}
