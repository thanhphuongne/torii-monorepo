import { Controller, Inject, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import type {
  IAuthService,
  ISessionService,
} from '@server/identity/interfaces/services';
import {
  AUTH_SERVICE_TOKEN,
  SESSION_SERVICE_TOKEN,
} from '@server/identity/interfaces/services';
import { parseUserAgent } from '@server/shared';
import type {
  UserRegistrationDTO,
  UserLoginDTO,
  VerifyOTPDTO,
  ResendOTPDTO,
  ForgotPasswordDTO,
} from '@workspace/schemas';

@Controller()
export class AuthHandler {
  private readonly logger = new Logger(AuthHandler.name);

  constructor(
    @Inject(AUTH_SERVICE_TOKEN) private readonly authService: IAuthService,
    @Inject(SESSION_SERVICE_TOKEN)
    private readonly sessionService: ISessionService,
  ) {}

  @MessagePattern({ cmd: 'identity.auth.register' })
  async register(@Payload() dto: UserRegistrationDTO) {
    return this.authService.register(dto);
  }

  @MessagePattern({ cmd: 'identity.auth.login' })
  async login(@Payload() dto: UserLoginDTO) {
    return this.authService.login(dto);
  }

  @MessagePattern({ cmd: 'identity.auth.adminLogin' })
  async adminLogin(@Payload() dto: UserLoginDTO) {
    return this.authService.adminLogin(dto);
  }

  @MessagePattern({ cmd: 'identity.auth.verify2FA' })
  async verify2FA(
    @Payload() data: { tempToken: string; code: string; backupCode: boolean },
  ) {
    return this.authService.verify2FA(
      data.tempToken,
      data.code,
      data.backupCode,
    );
  }

  @MessagePattern({ cmd: 'identity.auth.googleAuth' })
  async googleAuth(@Payload() data: { idToken: string }) {
    return this.authService.registerWithGoogle(data.idToken);
  }

  @MessagePattern({ cmd: 'identity.auth.facebookAuth' })
  async facebookAuth(@Payload() data: { accessToken: string }) {
    return this.authService.registerWithFacebook(data.accessToken);
  }

  @MessagePattern({ cmd: 'identity.session.create' })
  async createSession(
    @Payload() data: { userId: string; userAgent?: string; ip?: string },
  ) {
    const result = await this.sessionService.createSession(data.userId, {
      deviceInfo: parseUserAgent(data.userAgent),
      userAgent: data.userAgent,
      ipAddress: data.ip,
    });
    return result.refreshToken;
  }

  @MessagePattern({ cmd: 'identity.session.list' })
  async listSessions(@Payload() userId: string) {
    return this.sessionService.getUserSessions(userId);
  }

  @MessagePattern({ cmd: 'identity.session.revoke' })
  async revokeSession(@Payload() data: { sessionId: string; userId: string }) {
    await this.sessionService.revokeSessionById(data.sessionId, data.userId);
    return { success: true };
  }

  @MessagePattern({ cmd: 'identity.session.revokeAllOther' })
  async revokeAllOtherUserSessions(
    @Payload() data: { userId: string; currentRefreshToken: string },
  ) {
    const currentHash = this.sessionService.hashTokenPublic(
      data.currentRefreshToken,
    );
    await this.sessionService.revokeAllOtherUserSessions(
      data.userId,
      currentHash,
    );
    return { success: true };
  }

  @MessagePattern({ cmd: 'identity.auth.hashToken' })
  async hashToken(@Payload() data: { token: string }) {
    return this.sessionService.hashTokenPublic(data.token);
  }

  @MessagePattern({ cmd: 'identity.auth.refreshToken' })
  async refreshToken(@Payload() data: { refreshToken: string }) {
    // Verify refresh token
    const payload = await this.sessionService.verifySession(data.refreshToken);
    if (!payload) {
      throw new Error('Invalid or expired refresh token');
    }

    // Get user
    const user = await this.authService.getCurrentUser(payload.sub);
    if (!user) {
      throw new Error('User not found');
    }

    // Generate new tokens
    const accessToken = await this.authService.generateAccessToken(
      user.id,
      user.role,
      payload.sid,
      ['refresh'],
      { user_metadata: { displayName: user.displayName } },
    );

    // 2FA check or other logic can be here if needed
    // (but for pure refresh, we just rotate the refresh token on the SAME stable row)
    const newRefreshToken = await this.authService.generateRefreshToken(
      user.id,
      payload.sid,
    );

    // Update the stable session record with the new hash
    const newTokenHash = this.sessionService.hashTokenPublic(newRefreshToken);
    await this.sessionService.updateSessionTokenHash(payload.sid, newTokenHash);

    return { user, accessToken, refreshToken: newRefreshToken };
  }

  @MessagePattern({ cmd: 'identity.auth.logout' })
  async logout(
    @Payload()
    data: {
      accessToken: string | null;
      refreshToken: string | null;
    },
  ) {
    await this.authService.logout(data.accessToken, data.refreshToken);
    return { success: true };
  }

  @MessagePattern({ cmd: 'identity.auth.linkProvider' })
  async linkProvider(
    @Payload() data: { userId: string; provider: string; token: string },
  ) {
    return this.authService.linkProvider(
      data.userId,
      data.provider,
      data.token,
    );
  }

  @MessagePattern({ cmd: 'identity.auth.unlinkProvider' })
  async unlinkProvider(@Payload() data: { userId: string; provider: string }) {
    return this.authService.unlinkProvider(data.userId, data.provider);
  }

  @MessagePattern({ cmd: 'identity.auth.getLinkedProviders' })
  async getLinkedProviders(@Payload() data: { userId: string }) {
    return this.authService.getLinkedProviders(data.userId);
  }

  // User Profile Management
  @MessagePattern({ cmd: 'identity.auth.me' })
  async getMe(@Payload() data: { userId: string }) {
    return this.authService.getCurrentUser(data.userId);
  }

  @MessagePattern({ cmd: 'identity.auth.updateMe' })
  async updateMe(
    @Payload()
    data: {
      userId: string;
      dto: { displayName?: string; userMetadata?: Record<string, any> };
    },
  ) {
    return this.authService.updateUser(data.userId, data.dto);
  }

  @MessagePattern({ cmd: 'identity.auth.updateAvatar' })
  async updateAvatar(@Payload() data: { userId: string; fileId: string }) {
    return this.authService.updateAvatar(data.userId, data.fileId);
  }

  @MessagePattern({ cmd: 'identity.auth.deleteMe' })
  async deleteMe(@Payload() data: { userId: string }) {
    await this.authService.deleteUser(data.userId);
    return { success: true };
  }

  // Email & Password Management
  @MessagePattern({ cmd: 'identity.auth.resendVerification' })
  async resendVerification(@Payload() data: { email: string }) {
    await this.authService.resendVerification(data.email);
    return { success: true };
  }

  @MessagePattern({ cmd: 'identity.auth.verifyEmail' })
  async verifyEmail(@Payload() data: { token: string }) {
    return this.authService.verifyVerificationToken(data.token);
  }

  @MessagePattern({ cmd: 'identity.auth.forgotPassword' })
  async forgotPassword(@Payload() dto: ForgotPasswordDTO) {
    await this.authService.forgotPassword(dto);
    return { success: true };
  }

  @MessagePattern({ cmd: 'identity.auth.verifyOTP' })
  async verifyOTP(@Payload() dto: VerifyOTPDTO) {
    return this.authService.verifyOTP(dto);
  }

  @MessagePattern({ cmd: 'identity.auth.resendOTP' })
  async resendOTP(@Payload() dto: ResendOTPDTO) {
    await this.authService.resendOTP(dto);
    return { success: true };
  }

  @MessagePattern({ cmd: 'identity.auth.verifyResetToken' })
  async verifyResetToken(@Payload() data: { token: string }) {
    return this.authService.verifyResetToken(data.token);
  }

  @MessagePattern({ cmd: 'identity.auth.resetPassword' })
  async resetPassword(@Payload() data: { token: string; password: string }) {
    await this.authService.resetPassword(data.token, data.password);
    return { success: true };
  }

  @MessagePattern({ cmd: 'identity.auth.changePassword' })
  async changePassword(
    @Payload()
    data: {
      userId: string;
      oldPassword: string;
      newPassword: string;
    },
  ) {
    await this.authService.changePassword(
      data.userId,
      data.oldPassword,
      data.newPassword,
    );
    return { success: true };
  }

  // Invite Management
  @MessagePattern({ cmd: 'identity.auth.verifyInviteToken' })
  async verifyInviteToken(@Payload() data: { token: string }) {
    return this.authService.verifyInviteToken(data.token);
  }

  @MessagePattern({ cmd: 'identity.auth.setPassword' })
  async setPassword(@Payload() data: { token: string; password: string }) {
    await this.authService.setPassword(data.token, data.password);
    return { success: true };
  }
}
