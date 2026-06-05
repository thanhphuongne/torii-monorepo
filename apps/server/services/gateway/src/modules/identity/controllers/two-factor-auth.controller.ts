import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  Inject,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  successResponse,
  errorResponse,
  GatewayAuthGuard,
  ReqWithRequester,
} from '@server/shared';
import type { EnableTotpDTO, Disable2FADTO } from '@workspace/schemas';

@Controller('api/auth/2fa')
@UseGuards(GatewayAuthGuard)
export class TwoFactorAuthController {
  constructor(
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) {}

  @Post('totp/generate')
  async generateTotpSecret(@Req() req: ReqWithRequester) {
    try {
      const requester = req.requester;
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'identity.2fa.generateTotpSecret' },
          { userId: requester.sub },
        ),
      );
      return successResponse(result);
    } catch (error: unknown) {
      return errorResponse(
        error instanceof Error
          ? error.message
          : 'Failed to generate TOTP secret',
      );
    }
  }

  @Post('totp/enable')
  @HttpCode(HttpStatus.OK)
  async enableTotp(@Req() req: ReqWithRequester, @Body() dto: EnableTotpDTO) {
    try {
      const requester = req.requester;
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'identity.2fa.enableTotp' },
          { userId: requester.sub, secret: dto.secret, code: dto.code },
        ),
      );
      return successResponse(
        result,
        'Dual-factor authentication enabled successfully',
      );
    } catch (error: unknown) {
      return errorResponse(
        error instanceof Error ? error.message : 'Failed to enable 2FA',
      );
    }
  }

  @Post('totp/disable')
  @HttpCode(HttpStatus.OK)
  async disableTotp(@Req() req: ReqWithRequester, @Body() dto: Disable2FADTO) {
    try {
      const requester = req.requester;
      await firstValueFrom(
        this.natsClient.send(
          { cmd: 'identity.2fa.disableTotp' },
          { userId: requester.sub, password: dto.password },
        ),
      );
      return successResponse(null, '2FA disabled successfully');
    } catch (error: unknown) {
      return errorResponse(
        error instanceof Error ? error.message : 'Failed to disable 2FA',
      );
    }
  }

  @Post('backup-codes/regenerate')
  @HttpCode(HttpStatus.OK)
  async regenerateBackupCodes(@Req() req: ReqWithRequester) {
    try {
      const requester = req.requester;
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'identity.2fa.regenerateBackupCodes' },
          { userId: requester.sub },
        ),
      );
      return successResponse(result, 'Backup codes regenerated successfully');
    } catch (error: unknown) {
      return errorResponse(
        error instanceof Error
          ? error.message
          : 'Failed to regenerate backup codes',
      );
    }
  }

  @Get('status')
  async get2FAStatus(@Req() req: ReqWithRequester) {
    try {
      const requester = req.requester;
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'identity.2fa.getStatus' },
          { userId: requester.sub },
        ),
      );
      return successResponse(result);
    } catch (error: unknown) {
      return errorResponse(
        error instanceof Error ? error.message : 'Failed to fetch 2FA status',
      );
    }
  }
}
