import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
  Inject,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  BadRequestException,
  InternalServerErrorException,
  Query,
  Param,
  Headers,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { Response } from 'express';
import {
  successResponse,
  errorResponse,
  AppConfigService,
  ReqWithRequester,
} from '@server/shared';
import { GatewayAuthGuard } from '@server/shared';
import {
  UserRegistrationDTO,
  UserLoginDTO,
  VerifyOTPDTO,
  ResendOTPDTO,
  ForgotPasswordDTO,
  LoginResponseDTO,
  LogoutDTO,
} from '@workspace/schemas';

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly appConfig: AppConfigService,
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: UserRegistrationDTO) {
    try {
      const user = await firstValueFrom(
        this.natsClient.send({ cmd: 'identity.auth.register' }, dto),
      );
      return successResponse(
        { user },
        'Registration successful. Please check your email to verify your account.',
      );
    } catch (error: unknown) {
      return errorResponse(
        error instanceof Error ? error.message : 'Registration failed',
      );
    }
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body('email') email: string) {
    if (!email) {
      throw new BadRequestException('Email is required');
    }
    try {
      await firstValueFrom(
        this.natsClient.send(
          { cmd: 'identity.auth.resendVerification' },
          { email },
        ),
      );
      return successResponse(null, 'Verification email sent');
    } catch (error: unknown) {
      return errorResponse(
        error instanceof Error
          ? error.message
          : 'Failed to resend verification email',
      );
    }
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body('token') token: string) {
    if (!token) {
      throw new BadRequestException('Token is required');
    }
    try {
      const result = await firstValueFrom(
        this.natsClient.send({ cmd: 'identity.auth.verifyEmail' }, { token }),
      );
      if (!result.success) {
        return errorResponse('Invalid or expired verification link');
      }
      return successResponse(
        { email: result.email },
        'Email verified successfully',
      );
    } catch (error: unknown) {
      return errorResponse(
        error instanceof Error ? error.message : 'Verification failed',
      );
    }
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body() dto: ForgotPasswordDTO,
    @Req() req: ReqWithRequester,
    @Headers('x-platform') platformHeader?: string,
  ) {
    const platform =
      dto.platform || platformHeader || req.headers?.['x-platform'] || 'web';
    try {
      await firstValueFrom(
        this.natsClient.send(
          { cmd: 'identity.auth.forgotPassword' },
          { ...dto, platform },
        ),
      );
      return successResponse(
        null,
        platform === 'mobile'
          ? 'If an account exists, a 6-digit OTP has been sent.'
          : 'If an account exists, a password reset link has been sent.',
      );
    } catch (error: unknown) {
      return errorResponse(
        error instanceof Error
          ? error.message
          : 'Failed to process password reset request',
      );
    }
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOTP(@Body() dto: VerifyOTPDTO) {
    try {
      const result = await firstValueFrom(
        this.natsClient.send({ cmd: 'identity.auth.verifyOTP' }, dto),
      );
      if (!result.success) {
        return errorResponse('Invalid or expired verification code');
      }
      return successResponse(
        {
          email: result.email,
          tempToken: result.tempToken,
        },
        'OTP verified successfully',
      );
    } catch (error: unknown) {
      return errorResponse(
        error instanceof Error ? error.message : 'Verification failed',
      );
    }
  }

  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  async resendOTP(@Body() dto: ResendOTPDTO) {
    try {
      await firstValueFrom(
        this.natsClient.send({ cmd: 'identity.auth.resendOTP' }, dto),
      );
      return successResponse(null, 'New verification code has been sent');
    } catch (error: unknown) {
      return errorResponse(
        error instanceof Error ? error.message : 'Failed to resend code',
      );
    }
  }

  @Post('verify-reset-token')
  @HttpCode(HttpStatus.OK)
  async verifyResetToken(@Body('token') token: string) {
    if (!token) {
      throw new BadRequestException('Token is required');
    }
    try {
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'identity.auth.verifyResetToken' },
          { token },
        ),
      );
      if (!result.success) {
        return errorResponse('Invalid or expired reset token');
      }
      return successResponse({ email: result.email }, 'Reset token is valid');
    } catch (error: unknown) {
      return errorResponse(
        error instanceof Error ? error.message : 'Token verification failed',
      );
    }
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body('token') token: string,
    @Body('password') password: string,
  ) {
    if (!token || !password) {
      throw new BadRequestException('Token and new password are required');
    }
    if (password.length < 8) {
      throw new BadRequestException(
        'Password must be at least 8 characters long',
      );
    }
    try {
      await firstValueFrom(
        this.natsClient.send(
          { cmd: 'identity.auth.resetPassword' },
          { token, password },
        ),
      );
      return successResponse(
        null,
        'Password has been reset successfully. You can now login with your new password.',
      );
    } catch (error: unknown) {
      return errorResponse(
        error instanceof Error ? error.message : 'Failed to reset password',
      );
    }
  }

  @Post('change-password')
  @UseGuards(GatewayAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Req() req: ReqWithRequester,
    @Body() dto: { oldPassword?: string; newPassword?: string },
  ) {
    if (!dto.newPassword) {
      throw new BadRequestException('New password is required');
    }
    if (dto.newPassword.length < 8) {
      throw new BadRequestException(
        'New password must be at least 8 characters long',
      );
    }
    const requester = req.requester;
    try {
      await firstValueFrom(
        this.natsClient.send(
          { cmd: 'identity.auth.changePassword' },
          {
            userId: requester.sub,
            oldPassword: dto.oldPassword,
            newPassword: dto.newPassword,
          },
        ),
      );
      return successResponse(null, 'Password changed successfully');
    } catch (error: unknown) {
      return errorResponse(
        error instanceof Error ? error.message : 'Failed to change password',
      );
    }
  }

  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  async adminLogin(
    @Body() dto: UserLoginDTO,
    @Req() req: ReqWithRequester,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'identity.auth.adminLogin' },
          {
            ...dto,
            userAgent: req.headers['user-agent'],
            ip: req.ip,
          },
        ),
      );
      return await this.handleLoginResult(result, req, res);
    } catch (error: any) {
      throw error;
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: UserLoginDTO,
    @Req() req: ReqWithRequester,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'identity.auth.login' },
          {
            ...dto,
            userAgent: req.headers['user-agent'],
            ip: req.ip,
          },
        ),
      );
      return await this.handleLoginResult(result, req, res);
    } catch (error: any) {
      throw error;
    }
  }

  private async handleLoginResult(
    result: LoginResponseDTO,
    req: ReqWithRequester,
    res: Response,
  ) {
    if (result.requiresTwoFactor) {
      return successResponse(
        {
          requiresTwoFactor: true,
          twoFactorMethod: result.twoFactorMethod,
          tempToken: result.tempToken,
        },
        result.twoFactorMethod === 'totp'
          ? 'Enter code from your authenticator app'
          : `Verification code sent to your ${result.twoFactorMethod}`,
      );
    }

    const { user, accessToken, refreshToken } = result;

    if (!user || !user.id || !accessToken || !refreshToken) {
      throw new InternalServerErrorException(
        'Login succeeded but returned invalid user data',
      );
    }

    const platform = req.headers?.['x-platform'];
    const userData = {
      id: user?.id,
      email: user?.email,
      displayName: user?.displayName,
      role: user?.role,
      verifiedAt: user?.verifiedAt,
      permissions: (user as any)?.permissions || [],
    };

    if (platform === 'mobile') {
      return successResponse({
        access_token: accessToken,
        refresh_token: refreshToken,
        user: userData,
      });
    } else {
      this.setAuthCookies(res, accessToken, refreshToken);
      return successResponse({ user: userData });
    }
  }

  @Post('login/verify-2fa')
  @HttpCode(HttpStatus.OK)
  async verify2FA(
    @Body('tempToken') tempToken: string,
    @Body('code') code: string,
    @Body('backupCode') backupCode: boolean = false,
    @Req() req: ReqWithRequester,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!tempToken || !code) {
      throw new BadRequestException('Temporary token and code are required');
    }
    try {
      const { user, accessToken } = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'identity.auth.verify2FA' },
          { tempToken, code, backupCode },
        ),
      );

      const refreshToken = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'identity.session.create' },
          {
            userId: user.id,
            userAgent: req.headers['user-agent'],
            ip: req.ip,
          },
        ),
      );

      const platform = req.headers['x-platform'];
      if (platform === 'mobile') {
        return successResponse({
          access_token: accessToken,
          refresh_token: refreshToken,
          user: {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            role: user.role,
            verifiedAt: user.verifiedAt,
            permissions: user.permissions || [],
          },
        });
      } else {
        this.setAuthCookies(res, accessToken, refreshToken);
        return successResponse({
          user: {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            role: user.role,
            verifiedAt: user.verifiedAt,
            permissions: user.permissions || [],
          },
        });
      }
    } catch (error: unknown) {
      return errorResponse(
        error instanceof Error ? error.message : '2FA verification failed',
      );
    }
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  async googleAuth(
    @Body('idToken') idToken: string,
    @Req() req: ReqWithRequester,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!idToken) {
      throw new BadRequestException('Google ID token is required');
    }
    try {
      const { user, accessToken } = await firstValueFrom(
        this.natsClient.send({ cmd: 'identity.auth.googleAuth' }, { idToken }),
      );

      const refreshToken = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'identity.session.create' },
          {
            userId: user.id,
            userAgent: req.headers['user-agent'],
            ip: req.ip,
          },
        ),
      );

      const platform = req.headers['x-platform'];
      if (platform === 'mobile') {
        return successResponse({
          access_token: accessToken,
          refresh_token: refreshToken,
          user: {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            role: user.role,
            verifiedAt: user.verifiedAt,
          },
        });
      } else {
        this.setAuthCookies(res, accessToken, refreshToken);
        return successResponse({
          user: {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            role: user.role,
            verifiedAt: user.verifiedAt,
            permissions: user.permissions || [],
          },
        });
      }
    } catch (error: unknown) {
      return errorResponse(
        error instanceof Error ? error.message : 'Google authentication failed',
      );
    }
  }

  @Post('facebook')
  @HttpCode(HttpStatus.OK)
  async facebookAuth(
    @Body('accessToken') accessToken: string,
    @Req() req: ReqWithRequester,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!accessToken) {
      throw new BadRequestException('Facebook access token is required');
    }
    try {
      const { user, accessToken: jwtAccessToken } = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'identity.auth.facebookAuth' },
          { accessToken },
        ),
      );

      const refreshToken = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'identity.session.create' },
          {
            userId: user.id,
          },
        ),
      );

      const platform = req.headers['x-platform'];
      if (platform === 'mobile') {
        return successResponse({
          access_token: jwtAccessToken,
          refresh_token: refreshToken,
          user: {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            role: user.role,
            verifiedAt: user.verifiedAt,
          },
        });
      } else {
        this.setAuthCookies(res, jwtAccessToken, refreshToken);
        return successResponse({
          user: {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            role: user.role,
            verifiedAt: user.verifiedAt,
            permissions: user.permissions || [],
          },
        });
      }
    } catch (error: unknown) {
      return errorResponse(
        error instanceof Error
          ? error.message
          : 'Facebook authentication failed',
      );
    }
  }
  @Post('link/google')
  @UseGuards(GatewayAuthGuard)
  @HttpCode(HttpStatus.OK)
  async linkGoogle(
    @Req() req: ReqWithRequester,
    @Body('idToken') idToken: string,
  ) {
    if (!idToken) {
      throw new BadRequestException('Google ID token is required');
    }
    const requester = req.requester;
    try {
      await firstValueFrom(
        this.natsClient.send(
          { cmd: 'identity.auth.linkProvider' },
          { userId: requester.sub, provider: 'google', token: idToken },
        ),
      );
      return successResponse(
        { provider: 'google' },
        'Google account linked successfully',
      );
    } catch (error: unknown) {
      return errorResponse(
        error instanceof Error
          ? error.message
          : 'Failed to link Google account',
      );
    }
  }

  @Post('link/facebook')
  @UseGuards(GatewayAuthGuard)
  @HttpCode(HttpStatus.OK)
  async linkFacebook(
    @Req() req: ReqWithRequester,
    @Body('accessToken') accessToken: string,
  ) {
    if (!accessToken) {
      throw new BadRequestException('Facebook access token is required');
    }
    const requester = req.requester;
    try {
      await firstValueFrom(
        this.natsClient.send(
          { cmd: 'identity.auth.linkProvider' },
          { userId: requester.sub, provider: 'facebook', token: accessToken },
        ),
      );
      return successResponse(
        { provider: 'facebook' },
        'Facebook account linked successfully',
      );
    } catch (error: unknown) {
      return errorResponse(
        error instanceof Error
          ? error.message
          : 'Failed to link Facebook account',
      );
    }
  }

  @Delete('link/:provider')
  @UseGuards(GatewayAuthGuard)
  @HttpCode(HttpStatus.OK)
  async unlinkProvider(
    @Req() req: ReqWithRequester,
    @Param('provider') provider: string,
  ) {
    if (!provider) {
      throw new BadRequestException('Provider is required');
    }

    const allowedProviders = ['google', 'facebook'];
    if (!allowedProviders.includes(provider)) {
      throw new BadRequestException('Unsupported provider');
    }

    const requester = req.requester;
    try {
      await firstValueFrom(
        this.natsClient.send(
          { cmd: 'identity.auth.unlinkProvider' },
          { userId: requester.sub, provider },
        ),
      );
      return successResponse(null, `${provider} account unlinked successfully`);
    } catch (error: unknown) {
      return errorResponse(
        error instanceof Error ? error.message : 'Failed to unlink provider',
      );
    }
  }

  @Get('linked-providers')
  @UseGuards(GatewayAuthGuard)
  async getLinkedProviders(@Req() req: ReqWithRequester) {
    const requester = req.requester;
    try {
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'identity.auth.getLinkedProviders' },
          { userId: requester.sub },
        ),
      );
      return successResponse({
        providers: result.providers.map((p: any) => p.provider),
        hasPassword: result.hasPassword,
      });
    } catch (error: unknown) {
      return errorResponse(
        error instanceof Error
          ? error.message
          : 'Failed to get linked providers',
      );
    }
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: ReqWithRequester,
    @Res({ passthrough: true }) res: Response,
  ) {
    const oldRefreshToken =
      req.cookies?.refresh_token || req.body?.refresh_token;
    if (!oldRefreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }

    try {
      // New NATS call to handle refresh in one go (improving over 3 separate calls in original)
      // But to keep consistency with services, let's call dedicated refresh handler
      const { user, accessToken, refreshToken } = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'identity.auth.refreshToken' },
          {
            refreshToken: oldRefreshToken,
          },
        ),
      );

      const platform = req.headers['x-platform'];
      if (platform === 'mobile') {
        return successResponse({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
      } else {
        this.setAuthCookies(res, accessToken, refreshToken);
        return successResponse(null, 'Token refreshed successfully');
      }
    } catch (error: any) {
      throw new UnauthorizedException(
        error.message || 'Invalid or expired refresh token',
      );
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body() dto: LogoutDTO = {} as LogoutDTO,
    @Req() req: ReqWithRequester,
    @Res({ passthrough: true }) res: Response,
  ) {
    const authHeader = req.headers?.authorization;
    const accessToken = authHeader?.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : req.cookies?.access_token || null;

    const refreshToken =
      req.cookies?.refresh_token || dto?.refreshToken || null;

    await firstValueFrom(
      this.natsClient.send(
        { cmd: 'identity.auth.logout' },
        { accessToken, refreshToken },
      ),
    );

    res.clearCookie('access_token', {
      httpOnly: true,
      secure: this.appConfig.server.nodeEnv === 'production',
      sameSite: 'lax',
    });
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: this.appConfig.server.nodeEnv === 'production',
      sameSite: 'lax',
    });

    return successResponse(null, 'Logged out successfully');
  }

  @Get('me')
  @UseGuards(GatewayAuthGuard)
  async getMe(@Req() req: ReqWithRequester) {
    const requester = req.requester;
    if (!requester || !requester.sub) {
      throw new UnauthorizedException('No token provided');
    }
    // In JwtAuthGuard, user is already populated from the token.
    // We can just return it, OR fetch fresh data from DB if needed.
    // Original controller calls authService.getCurrentUser
    try {
      const userData = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'identity.auth.me' },
          { userId: requester.sub },
        ),
      );
      return successResponse({ user: userData });
    } catch (error) {
      throw new UnauthorizedException('Failed to get user');
    }
  }

  @Get('sessions')
  @UseGuards(GatewayAuthGuard)
  async getSessions(@Req() req: ReqWithRequester) {
    const requester = req.requester;

    try {
      const sessions = await firstValueFrom(
        this.natsClient.send({ cmd: 'identity.session.list' }, requester.sub),
      );

      // Identify current session via access token sid (works for both web & mobile).
      const currentSessionId = (requester as any)?.sid || null;

      return successResponse({
        sessions: sessions.map((s: any) => ({
          ...s,
          isCurrent: currentSessionId ? s.id === currentSessionId : false,
          tokenHash: undefined, // Don't leak other hashes
        })),
      });
    } catch (error: unknown) {
      return errorResponse(
        error instanceof Error ? error.message : 'Failed to get sessions',
      );
    }
  }

  @Delete('sessions/other')
  @UseGuards(GatewayAuthGuard)
  async revokeOtherSessions(@Req() req: ReqWithRequester) {
    const requester = req.requester;
    const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken;

    if (!refreshToken) {
      throw new BadRequestException('Refresh token is required');
    }

    try {
      await firstValueFrom(
        this.natsClient.send(
          { cmd: 'identity.session.revokeAllOther' },
          { userId: requester.sub, currentRefreshToken: refreshToken },
        ),
      );
      return successResponse(null, 'Other sessions revoked successfully');
    } catch (error: unknown) {
      return errorResponse(
        error instanceof Error
          ? error.message
          : 'Failed to revoke other sessions',
      );
    }
  }

  @Delete('sessions/:id')
  @UseGuards(GatewayAuthGuard)
  async revokeSession(
    @Req() req: ReqWithRequester,
    @Param('id') sessionId: string,
  ) {
    const requester = req.requester;
    if (!sessionId) {
      throw new BadRequestException('Session ID is required');
    }

    try {
      await firstValueFrom(
        this.natsClient.send(
          { cmd: 'identity.session.revoke' },
          { sessionId, userId: requester.sub },
        ),
      );
      return successResponse(null, 'Session revoked successfully');
    } catch (error: unknown) {
      return errorResponse(
        error instanceof Error ? error.message : 'Failed to revoke session',
      );
    }
  }

  @Patch('me')
  @UseGuards(GatewayAuthGuard)
  async updateMe(
    @Req() req: ReqWithRequester,
    @Body() dto: { displayName?: string; userMetadata?: Record<string, any> },
  ) {
    const requester = req.requester;
    try {
      const userData = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'identity.auth.updateMe' },
          { userId: requester.sub, dto },
        ),
      );
      return successResponse({ user: userData });
    } catch (error: unknown) {
      return errorResponse(
        error instanceof Error ? error.message : 'Failed to update user',
      );
    }
  }

  @Patch('me/avatar')
  @UseGuards(GatewayAuthGuard)
  async updateAvatar(
    @Req() req: ReqWithRequester,
    @Body('fileId') fileId: string,
  ) {
    if (!fileId) {
      throw new BadRequestException('fileId is required');
    }
    const requester = req.requester;
    try {
      const userData = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'identity.auth.updateAvatar' },
          { userId: requester.sub, fileId },
        ),
      );
      return successResponse({ user: userData }, 'Avatar updated successfully');
    } catch (error: unknown) {
      return errorResponse(
        error instanceof Error ? error.message : 'Failed to update avatar',
      );
    }
  }

  @Delete('me')
  @UseGuards(GatewayAuthGuard)
  async deleteMe(@Req() req: ReqWithRequester) {
    const requester = req.requester;
    try {
      await firstValueFrom(
        this.natsClient.send(
          { cmd: 'identity.auth.deleteMe' },
          { userId: requester.sub },
        ),
      );
      return successResponse(null, 'User deleted successfully');
    } catch (error: unknown) {
      return errorResponse(
        error instanceof Error ? error.message : 'Failed to delete user',
      );
    }
  }

  @Post('verify-invite-token')
  @HttpCode(HttpStatus.OK)
  async verifyInviteToken(@Body('token') token: string) {
    if (!token) {
      throw new BadRequestException('Token is required');
    }
    try {
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'identity.auth.verifyInviteToken' },
          { token },
        ),
      );
      if (!result.success) {
        return errorResponse('Invalid or expired invite link');
      }
      return successResponse(
        {
          email: result.email,
          role: result.role,
        },
        'Invite token is valid',
      );
    } catch (error: unknown) {
      return errorResponse(
        error instanceof Error ? error.message : 'Token verification failed',
      );
    }
  }

  @Post('set-password')
  @HttpCode(HttpStatus.OK)
  async setPassword(
    @Body('token') token: string,
    @Body('password') password: string,
  ) {
    if (!token || !password) {
      throw new BadRequestException('Token and password are required');
    }
    if (password.length < 8) {
      throw new BadRequestException(
        'Password must be at least 8 characters long',
      );
    }
    try {
      await firstValueFrom(
        this.natsClient.send(
          { cmd: 'identity.auth.setPassword' },
          { token, password },
        ),
      );
      return successResponse(
        null,
        'Password set successfully. You can now login with your credentials.',
      );
    } catch (error: unknown) {
      return errorResponse(
        error instanceof Error ? error.message : 'Failed to set password',
      );
    }
  }

  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: this.appConfig.server.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: this.appConfig.server.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
}
