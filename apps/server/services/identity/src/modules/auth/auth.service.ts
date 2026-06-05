import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  Inject,
  BadRequestException,
  forwardRef,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import Redis from 'ioredis';
import * as argon2 from 'argon2';
import {
  JwtTokenProvider,
  REDIS_CLIENT,
  BlacklistService,
  AppConfigService,
  parseUserAgent,
} from '@server/shared';
import type {
  IUsersRepository,
  IUserIdentityRepository,
} from '@server/identity/interfaces/repositories';
import type {
  IAuthService,
  ISessionService,
  IGoogleAuthService,
  IFacebookAuthService,
  IAuthorizationService,
  ITwoFactorAuthService,
} from '@server/identity/interfaces/services';
import {
  USERS_REPOSITORY_TOKEN,
  USER_IDENTITY_REPOSITORY_TOKEN,
} from '@server/identity/interfaces/repositories';
import {
  SESSION_SERVICE_TOKEN,
  GOOGLE_AUTH_SERVICE_TOKEN,
  FACEBOOK_AUTH_SERVICE_TOKEN,
  AUTHORIZATION_SERVICE_TOKEN,
  TWO_FACTOR_AUTH_SERVICE_TOKEN,
} from '@server/identity/interfaces/services';

import { NotificationType } from '@workspace/schemas';
import type {
  UserRegistrationDTO,
  UserLoginDTO,
  UserResponseDTO,
  AuthResponseDTO as AuthResponse,
  LoginResponseDTO as LoginResponse,
  VerifyOTPDTO,
  ResendOTPDTO,
  ForgotPasswordDTO,
  GoogleUserInfo,
  FacebookUserInfo,
  AppMetadata,
  UserMetadata,
  UserActivityEvent,
} from '@workspace/schemas';
import type { User, Prisma } from '@prisma/generated';
import type { TwoFactorTempTokenPayload } from '@server/shared';
import type { INotificationService } from '@server/identity/interfaces/services';
import { NOTIFICATION_SERVICE_TOKEN } from '@server/identity/interfaces/services';

@Injectable()
export class AuthService implements IAuthService {
  constructor(
    private readonly appConfig: AppConfigService,
    @Inject(forwardRef(() => USERS_REPOSITORY_TOKEN))
    private readonly usersRepository: IUsersRepository,

    private readonly jwtTokenProvider: JwtTokenProvider,
    @Inject(AUTHORIZATION_SERVICE_TOKEN)
    private readonly authorizationService: IAuthorizationService,
    @Inject(TWO_FACTOR_AUTH_SERVICE_TOKEN)
    private readonly twoFactorAuthService: ITwoFactorAuthService,
    @Inject(SESSION_SERVICE_TOKEN)
    private readonly sessionService: ISessionService,
    @Inject(GOOGLE_AUTH_SERVICE_TOKEN)
    private readonly googleAuthService: IGoogleAuthService,
    @Inject(FACEBOOK_AUTH_SERVICE_TOKEN)
    private readonly facebookAuthService: IFacebookAuthService,
    @Inject(USER_IDENTITY_REPOSITORY_TOKEN)
    private readonly userIdentityRepository: IUserIdentityRepository,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
    private readonly blacklistService: BlacklistService,
    @Inject(NOTIFICATION_SERVICE_TOKEN)
    private readonly notificationService: INotificationService,
  ) { }

  /**
   * Logout user - Revoke tokens
   * Blacklists access token and revokes refresh token session
   * Works with both valid and expired tokens
   */
  async logout(
    accessToken: string | null,
    refreshToken?: string | null,
  ): Promise<void> {
    // 1. Blacklist Access Token (decode without verification to handle expired tokens)
    if (accessToken) {
      try {
        const jwt = await import('jsonwebtoken');
        // Decode without verification to get payload (works even if expired)
        const decoded = jwt.decode(accessToken) as {
          jti?: string;
          exp?: number;
        } | null;

        if (decoded?.jti) {
          const now = Math.floor(Date.now() / 1000);
          const exp = decoded.exp;

          // Calculate TTL: if expired, blacklist for 1 minute; otherwise use remaining time
          const ttl = exp && exp > now ? exp - now : 60;
          await this.blacklistService.blacklist(decoded.jti, ttl);
        }
      } catch (error) {
        // Ignore decode errors - token might be malformed
      }
    }

    // 2. Revoke Refresh Token Session & Clear Permission Cache
    if (refreshToken) {
      try {
        // Decode refresh token to get sid
        const payload =
          await this.jwtTokenProvider.verifyRefreshToken(refreshToken);
        if (payload?.sid) {
          await this.redis.del(`session:${payload.sid}:permissions`);
        }

        const tokenHash = this.sessionService.hashTokenPublic(refreshToken);
        await this.sessionService.revokeSession(tokenHash);
      } catch (error) {
        // Ignore errors - token might be invalid
      }
    }
  }

  /**
   * Register a new user
   */
  async register(dto: UserRegistrationDTO): Promise<UserResponseDTO> {
    const email = dto.email.toLowerCase();
    // Check if email already exists
    const existingUser = await this.usersRepository.findByEmail(email);

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Validate password is provided
    if (!dto.password) {
      throw new BadRequestException('Password is required for registration');
    }

    // Hash password
    const hashedPassword = await argon2.hash(dto.password);

    // Use email username as displayName if not provided
    const displayName =
      dto.displayName?.trim() ||
      dto.fullName?.trim() ||
      dto.email.split('@')[0];

    // Create user
    const fullUser = await this.usersRepository.create({
      email,
      password: hashedPassword,
      displayName,
      role: 'learner',
      // emailVerifiedAt: null (default) = pending verification
    });

    // Exclude password from response
    const { password, ...user } = fullUser;

    // Create welcome notification (non-blocking)
    try {
      await this.notificationService.create({
        userId: user.id,
        title: 'Chào mừng bạn đến với Torii 🎉',
        message:
          'Tài khoản của bạn đã được tạo thành công. Hãy xác minh email và bắt đầu hành trình luyện JLPT nhé!',
        notificationType: NotificationType.SYSTEM,
        metadata: {
          email: user.email,
          displayName: user.displayName,
          source: dto.platform || 'web',
        },
      });
    } catch (error) {
      // Không chặn flow đăng ký nếu tạo notification thất bại

      console.error(
        '[AuthService] Failed to create welcome notification for user',
        user.id,
        error,
      );
    }

    // Generate Verification token or OTP
    if (dto.platform === 'mobile') {
      const otp = await this.generateOTP(user.email, 'registration');
      this.natsClient.emit(
        { cmd: 'send_email' },
        {
          type: 'otp',
          to: user.email,
          data: { displayName: user.displayName, otp, otpType: 'registration' },
        },
      );
    } else {
      const verificationToken = await this.generateVerificationToken(
        user.email,
      );
      const verificationUrl = `${this.appConfig.identity.webLearnerUrl}/verify?token=${verificationToken}`;
      this.natsClient.emit(
        { cmd: 'send_email' },
        {
          type: 'verification',
          to: user.email,
          data: { displayName: user.displayName, verificationUrl },
        },
      );
    }

    return {
      ...user,
      role: user.role as string,
      points: (user as any).gamification?.points || 0,
    } as any;
  }

  /**
   * Login user and generate JWT token
   * Now supports 2FA - returns requiresTwoFactor if 2FA is enabled
   */
  async login(dto: UserLoginDTO): Promise<LoginResponse> {
    const email = dto.email.toLowerCase();
    const user = await this.usersRepository.findByEmail(email);
    const result = await this.processLoginFlow(user, dto);

    // Emit activity if login complete (not requiring 2FA)
    if (!result.requiresTwoFactor && user) {
      this.emitLoginActivity(user.id);
    }

    return result;
  }

  /**
   * Specialized login for admin portals (admin, staff-academic, staff-operations, lecturer)
   * Rejects users with LEARNER role even with valid credentials
   */
  async adminLogin(dto: UserLoginDTO): Promise<LoginResponse> {
    const email = dto.email.toLowerCase();
    const user = await this.usersRepository.findByEmail(email);

    if (user) {
      const { permissions } =
        await this.authorizationService.getUserPermissions(user.id, user.role);
      if (permissions.length === 0) {
        // Log security event for audit (F6)
        console.warn(
          `[Security] Admin portal access denied for user with no permissions: ${dto.email}`,
        );
        throw new UnauthorizedException(
          'Access denied: Admin portals are restricted',
        );
      }
    }

    return this.processLoginFlow(user, dto);
  }

  /**
   * Shared logic for processing login after user is found (F1, F3, F4)
   */
  private async processLoginFlow(
    user: any,
    dto: UserLoginDTO,
  ): Promise<LoginResponse> {
    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isValid = await argon2.verify(user.password, dto.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active or pending
    // Check if user is banned or deleted
    this.checkUserStatus(user);

    // Check if email is verified
    if (!user.verifiedAt) {
      throw new UnauthorizedException(
        'Email not verified. Please check your email.',
      );
    }

    // Check if 2FA is enabled
    const twoFactorStatus = await this.twoFactorAuthService.get2FAStatus(
      user.id,
    );

    if (twoFactorStatus.isEnabled) {
      // Generate temporary token (valid for 5 minutes)
      const tempToken = await this.generate2FATempToken(
        user.id,
        user.email,
        'totp',
        user.role as string,
      );

      return {
        requiresTwoFactor: true,
        twoFactorMethod: 'totp',
        tempToken,
      };
    }

    // Update last sign in
    await this.usersRepository.update(user.id, { lastSignInAt: new Date() });

    // Create session with metadata
    const { refreshToken, sessionId } = await this.sessionService.createSession(
      user.id,
      {
        deviceInfo: parseUserAgent(dto.userAgent),
        userAgent: dto.userAgent,
        ipAddress: dto.ip,
      },
    );

    const { permissions } = await this.authorizationService.getUserPermissions(
      user.id,
      user.role,
    );
    const accessToken = await this.generateAccessToken(
      user.id,
      user.role,
      sessionId,
      ['password'],
      { user_metadata: { displayName: user.displayName } },
    );

    return {
      requiresTwoFactor: false,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role as string,
        verifiedAt: user.verifiedAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        walletBalance: Number(user.walletBalance),
        points: (user as any).gamification?.points || 0,
        permissions,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Generate temporary token for 2FA verification
   * Valid for 5 minutes (configurable via TWO_FACTOR_TEMP_TOKEN_EXPIRY)
   */
  private async generate2FATempToken(
    userId: string,
    email: string,
    method: string,
    userRole: string,
  ): Promise<string> {
    const tempTokenExpiry = this.appConfig.identity.twoFactorTempTokenExpiry; // in seconds

    const payload: TwoFactorTempTokenPayload = {
      sub: userId, // Standard JWT claim (subject)
      role: userRole, // User role for compatibility
      userId, // User ID (duplicate for clarity)
      email, // User email
      method, // 2FA method (e.g., 'totp')
      type: '2fa-temp', // Token type identifier
    };

    // Generate token using dedicated 2FA method
    const token = await this.jwtTokenProvider.generate2FATempToken(
      payload,
      `${tempTokenExpiry}s`, // Convert to seconds format (e.g., "300s")
    );

    // Store in Redis with expiry
    await this.redis.set(`2fa:temp:${userId}`, token, 'EX', tempTokenExpiry);

    return token;
  }

  /**
   * Verify 2FA code and complete login
   */
  async verify2FA(
    tempToken: string,
    code: string,
    isBackupCode: boolean = false,
  ): Promise<AuthResponse> {
    // Verify temp token using dedicated 2FA verification method
    const payload = await this.jwtTokenProvider.verify2FATempToken(tempToken);

    if (!payload) {
      throw new UnauthorizedException('Invalid or expired temporary token');
    }

    const userId = payload.userId || payload.sub;
    if (!userId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Check if temp token exists in Redis
    const storedToken = await this.redis.get(`2fa:temp:${userId}`);
    if (!storedToken || storedToken !== tempToken) {
      throw new UnauthorizedException(
        'Temporary token expired or already used',
      );
    }

    // Verify 2FA code
    let isValid = false;
    if (isBackupCode) {
      isValid = await this.twoFactorAuthService.verifyBackupCode(userId, code);
    } else {
      // Only TOTP is supported now
      isValid = await this.twoFactorAuthService.verifyTotp(userId, code);
    }

    if (!isValid) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    // Delete temp token
    await this.redis.del(`2fa:temp:${userId}`);

    // Get user
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user is banned or deleted
    this.checkUserStatus(user);

    // Complete login
    const role = user.role;

    // Update last sign in
    await this.usersRepository.update(user.id, { lastSignInAt: new Date() });

    // Create session
    const { refreshToken, sessionId } = await this.sessionService.createSession(
      user.id,
    );
    const accessToken = await this.generateAccessToken(
      user.id,
      role,
      sessionId,
      ['password', 'totp'],
      { user_metadata: { displayName: user.displayName } },
    );

    // Emit activity

    // Emit activity
    this.emitLoginActivity(user.id);

    // Get permissions for the user object in the response
    const { permissions } = await this.authorizationService.getUserPermissions(
      user.id,
      user.role,
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: role as string,
        verifiedAt: user.verifiedAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        walletBalance: Number(user.walletBalance),
        points: (user as any).gamification?.points || 0,
        permissions,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Get current authenticated user with permissions
   */
  async getCurrentUser(
    userId: string,
  ): Promise<UserResponseDTO & { permissions: string[] }> {
    const user = await this.usersRepository.getUserBasicInfo(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user is banned or deleted
    this.checkUserStatus(user as unknown as User);

    // Get permissions
    const { permissions } = await this.authorizationService.getUserPermissions(
      user.id,
      user.role,
    );

    return {
      ...user,
      avatarUrl: user.avatarUrl || undefined,
      userMetadata: user.userMetadata || undefined,
      verifiedAt: user.verifiedAt || undefined,
      bannedUntil: undefined,
      lastSignInAt: undefined,
      deletedAt: undefined,
      appMetadata: undefined,
      permissions,
    } as any;
  }

  /**
   * Generate token for email verification
   * Returns the token to be used in verification URL
   */
  async generateVerificationToken(emailRaw: string): Promise<string> {
    const email = emailRaw.toLowerCase();
    // Generate secure random token (32 bytes = 64 hex chars)
    const crypto = await import('crypto');
    const token = crypto.randomBytes(32).toString('hex');

    // Store email associated with token in Redis (24h expiry)
    await this.redis.set(`verification-token:${token}`, email, 'EX', 86400);

    return token;
  }

  /**
   * Verify verification token and activate user
   */
  async verifyVerificationToken(
    token: string,
  ): Promise<{ success: boolean; email?: string }> {
    const email = await this.redis.get(`verification-token:${token}`);

    if (!email) {
      return { success: false };
    }

    // Update user status to ACTIVE
    await this.usersRepository.updateByEmail(email, { verifiedAt: new Date() });

    // Delete token (one-time use)
    await this.redis.del(`verification-token:${token}`);

    return { success: true, email };
  }

  /**
   * Resend verification email with magic link
   * Rate limited: 3 requests per hour per email
   */
  async resendVerification(emailRaw: string): Promise<void> {
    const email = emailRaw.toLowerCase();
    const user = await this.usersRepository.findByEmail(email);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Block if banned or deleted
    this.checkUserStatus(user);

    // Only allow resend for PENDING users (not yet verified)
    if (user.verifiedAt) {
      throw new BadRequestException(
        'Email already verified or account is not active',
      );
    }

    // Rate limiting: 3 requests per hour
    const rateLimitKey = `resend-verification:${email}`;
    const attempts = await this.redis.get(rateLimitKey);
    const attemptsCount = attempts ? parseInt(attempts) : 0;

    if (attemptsCount >= 3) {
      const ttl = await this.redis.ttl(rateLimitKey);
      const minutesLeft = Math.ceil(ttl / 60);
      throw new BadRequestException(
        `Too many requests. Please try again in ${minutesLeft} minutes.`,
      );
    }

    // Generate new Verification token
    const verificationToken = await this.generateVerificationToken(email);

    // Send verification email
    const verificationUrl = `${this.appConfig.identity.webLearnerUrl}/verify?token=${verificationToken}`;
    this.natsClient.emit(
      { cmd: 'send_email' },
      {
        type: 'verification',
        to: email,
        data: { displayName: user.displayName, verificationUrl },
      },
    );

    // Increment rate limit counter
    if (attemptsCount === 0) {
      await this.redis.set(rateLimitKey, '1', 'EX', 3600); // 1 hour
    } else {
      await this.redis.incr(rateLimitKey);
    }
  }

  // ========================================
  // Password Reset Methods
  // ========================================

  /**
   * Initiate password reset flow
   * Generates a magic link token (web) or OTP (mobile) and sends reset email
   * Rate limited: 3 requests per hour per email
   */
  async forgotPassword(dto: ForgotPasswordDTO): Promise<void> {
    const { email: emailRaw, platform } = dto;
    const email = emailRaw.toLowerCase();
    const user = await this.usersRepository.findByEmail(email);

    // Don't reveal if user exists or not (security best practice)
    if (!user) {
      return;
    }

    // Block if banned or deleted
    this.checkUserStatus(user);

    // Only allow password reset for users with password (not OAuth-only users)
    if (!user.password) {
      throw new BadRequestException(
        'This account uses OAuth login. Password reset is not available.',
      );
    }

    // Rate limiting: 3 requests per hour
    const rateLimitKey = `reset-password:${email}`;
    const attempts = await this.redis.get(rateLimitKey);
    const attemptsCount = attempts ? parseInt(attempts) : 0;

    if (attemptsCount >= 3) {
      const ttl = await this.redis.ttl(rateLimitKey);
      const minutesLeft = Math.ceil(ttl / 60);
      throw new BadRequestException(
        `Too many requests. Please try again in ${minutesLeft} minutes.`,
      );
    }

    if (platform === 'mobile') {
      const otp = await this.generateOTP(email, 'reset-password');
      this.natsClient.emit(
        { cmd: 'send_email' },
        {
          type: 'otp',
          to: email,
          data: {
            displayName: user.displayName,
            otp,
            otpType: 'reset-password',
          },
        },
      );
    } else {
      // Generate reset token (valid for 1 hour)
      const crypto = await import('crypto');
      const resetToken = crypto.randomBytes(32).toString('hex');

      // Store email associated with reset token in Redis (1 hour expiry)
      await this.redis.set(`reset-token:${resetToken}`, email, 'EX', 3600);

      // Send password reset email
      const resetUrl =
        dto.clientType === 'admin'
          ? `${this.appConfig.identity.webAdminUrl}/reset-password?token=${resetToken}`
          : `${this.appConfig.identity.webLearnerUrl}/reset-password?token=${resetToken}`;

      this.natsClient.emit(
        { cmd: 'send_email' },
        {
          type: 'password_reset',
          to: email,
          data: { displayName: user.displayName, resetUrl },
        },
      );
    }

    // Increment rate limit counter
    if (attemptsCount === 0) {
      await this.redis.set(rateLimitKey, '1', 'EX', 3600); // 1 hour
    } else {
      await this.redis.incr(rateLimitKey);
    }
  }

  /**
   * Verify OTP code (for mobile flow)
   */
  async verifyOTP(
    dto: VerifyOTPDTO,
  ): Promise<{ success: boolean; email?: string; tempToken?: string }> {
    const { email, otp, type } = dto;
    const otpKey = `otp:${type}:${email}`;

    const storedOtp = await this.redis.get(otpKey);

    if (!storedOtp || storedOtp !== otp) {
      throw new UnauthorizedException('Invalid or expired verification code');
    }

    // Delete OTP (one-time use)
    await this.redis.del(otpKey);

    if (type === 'registration') {
      // Update user status to ACTIVE
      await this.usersRepository.updateByEmail(email, {
        verifiedAt: new Date(),
      });
      return { success: true, email };
    } else {
      // For reset-password, generate a temporary reset token
      const crypto = await import('crypto');
      const resetToken = crypto.randomBytes(32).toString('hex');
      await this.redis.set(`reset-token:${resetToken}`, email, 'EX', 3600);
      return { success: true, email, tempToken: resetToken };
    }
  }

  /**
   * Verify reset password token
   * Returns email if token is valid
   */
  async verifyResetToken(
    token: string,
  ): Promise<{ success: boolean; email?: string }> {
    const email = await this.redis.get(`reset-token:${token}`);

    if (!email) {
      return { success: false };
    }

    return { success: true, email };
  }

  /**
   * Resend OTP code
   * Rate limited: 3 requests per hour
   */
  async resendOTP(dto: ResendOTPDTO): Promise<void> {
    const { email, type } = dto;
    const user = await this.usersRepository.findByEmail(email);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (type === 'registration' && user.verifiedAt) {
      throw new BadRequestException('Email already verified');
    }

    // Rate limiting: 3 requests per hour
    const rateLimitKey = `resend-otp:${email}:${type}`;
    const attempts = await this.redis.get(rateLimitKey);
    const attemptsCount = attempts ? parseInt(attempts) : 0;

    if (attemptsCount >= 3) {
      const ttl = await this.redis.ttl(rateLimitKey);
      const minutesLeft = Math.ceil(ttl / 60);
      throw new BadRequestException(
        `Too many requests. Please try again in ${minutesLeft} minutes.`,
      );
    }

    const otp = await this.generateOTP(email, type);
    this.natsClient.emit(
      { cmd: 'send_email' },
      {
        type: 'otp',
        to: email,
        data: { displayName: user.displayName, otp, otpType: type },
      },
    );

    // Increment rate limit counter
    if (attemptsCount === 0) {
      await this.redis.set(rateLimitKey, '1', 'EX', 3600); // 1 hour
    } else {
      await this.redis.incr(rateLimitKey);
    }
  }

  /**
   * Generate 6-digit OTP and store in Redis
   * Valid for 10 minutes
   */
  private async generateOTP(
    email: string,
    type: 'registration' | 'reset-password',
  ): Promise<string> {
    // Generate 6-digit numeric OTP securely
    const crypto = await import('crypto');
    const otp = crypto.randomInt(100000, 999999).toString();

    // Store in Redis with 10-minute expiry
    await this.redis.set(`otp:${type}:${email}`, otp, 'EX', 600);

    return otp;
  }

  /**
   * Reset password using valid reset token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const email = await this.redis.get(`reset-token:${token}`);

    if (!email) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const user = await this.usersRepository.findByEmail(email);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Hash new password
    const hashedPassword = await argon2.hash(newPassword);

    // Update password
    await this.usersRepository.update(user.id, {
      password: hashedPassword,
    });

    // Revoke all existing sessions (F4)
    await this.sessionService.revokeAllUserSessions(user.id);

    // Delete reset token (one-time use)
    await this.redis.del(`reset-token:${token}`);

    // Send password reset confirmation email
    this.natsClient.emit(
      { cmd: 'send_email' },
      {
        type: 'password_reset_confirmation',
        to: email,
        data: { displayName: user.displayName },
      },
    );
  }

  /**
   * Change password for currently authenticated user
   */
  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User account not found');
    }

    // 1. Verify old password if it exists
    if (user.password) {
      if (!oldPassword) {
        throw new UnauthorizedException('Current password is required');
      }
      const isOldPasswordCorrect = await argon2.verify(
        user.password,
        oldPassword,
      );
      if (!isOldPasswordCorrect) {
        throw new UnauthorizedException('Current password is incorrect');
      }
    }

    // 2. Hash new password
    const hashedPassword = await argon2.hash(newPassword);

    // 3. Update password
    await this.usersRepository.update(user.id, {
      password: hashedPassword,
    });

    // 4. Revoke other sessions (optional but recommended for security)
    // For now we keep current session but could revoke all others if we want.
  }

  /**
   * Update user information
   */
  async updateUser(
    userId: string,
    dto: { displayName?: string; userMetadata?: Record<string, any> },
  ): Promise<UserResponseDTO & { permissions: string[] }> {
    // Get current user to merge userMetadata
    const currentUser = await this.usersRepository.findById(userId);
    const currentMetadata =
      (currentUser?.userMetadata as Record<string, any>) || {};

    // Merge userMetadata if provided
    const mergedMetadata = dto.userMetadata
      ? { ...currentMetadata, ...dto.userMetadata }
      : currentMetadata;

    const updateData: any = {};
    if (dto.displayName !== undefined) {
      updateData.displayName = dto.displayName;
    }
    if (dto.userMetadata !== undefined) {
      updateData.userMetadata = mergedMetadata;
    }

    const fullUser = await this.usersRepository.update(userId, updateData);

    // Exclude password
    const { password, ...user } = fullUser;

    // Get permissions
    const { permissions } = await this.authorizationService.getUserPermissions(
      user.id,
      user.role,
    );

    // Ensure proper mapping of userMetadata and avatarUrl
    const userMetadata = user.userMetadata
      ? typeof user.userMetadata === 'object' &&
        user.userMetadata !== null &&
        !Array.isArray(user.userMetadata)
        ? (user.userMetadata as Record<string, unknown>)
        : undefined
      : undefined;

    return {
      ...user,
      avatarUrl: user.avatarUrl || undefined,
      userMetadata,
      verifiedAt: user.verifiedAt || undefined,
      bannedUntil: user.bannedUntil || undefined,
      lastSignInAt: user.lastSignInAt || undefined,
      deletedAt: user.deletedAt || undefined,
      role: user.role as string,
      appMetadata: user.appMetadata
        ? typeof user.appMetadata === 'object' &&
          user.appMetadata !== null &&
          !Array.isArray(user.appMetadata)
          ? (user.appMetadata as Record<string, unknown>)
          : undefined
        : undefined,
      points: (user as any).gamification?.points || 0,
      permissions,
    } as any;
  }

  /**
   * Update user avatar
   */
  async updateAvatar(
    userId: string,
    fileId: string,
  ): Promise<UserResponseDTO & { permissions: string[] }> {
    // 1. Verify file exists in storage microservice
    const fileAsset = await firstValueFrom(
      this.natsClient.send({ cmd: 'academy.storage.findById' }, { fileId }),
    );

    if (!fileAsset || fileAsset.status !== 'uploaded') {
      throw new BadRequestException('File not found or upload not confirmed');
    }

    // 2. Get old user to see if we should delete old avatar
    const oldUser = await this.usersRepository.findById(userId);
    const oldAvatarUrl = oldUser?.avatarUrl;

    // 2b. Delete old avatar via Storage (NATS) if it exists
    // Supports both raw fileId and public R2 URLs
    if (oldAvatarUrl) {
      try {
        let fileIdToDelete = oldAvatarUrl;

        // If it's a full URL, try to extract the fileId (last segment)
        if (oldAvatarUrl.startsWith('http')) {
          const urlParts = oldAvatarUrl.split('/');
          let potentialFileId = urlParts[urlParts.length - 1]; // "uuid.png"

          // Strip extension if present to get raw UUID
          if (potentialFileId.includes('.')) {
            potentialFileId = potentialFileId.split('.')[0];
          }

          // Basic validation: ensure it's not empty and resembles an ID
          if (potentialFileId && potentialFileId.length > 0) {
            fileIdToDelete = potentialFileId;
          }
        }

        await firstValueFrom(
          this.natsClient.send(
            { cmd: 'academy.storage.deleteFile' },
            { fileId: fileIdToDelete },
          ),
        );
      } catch (error) {
        // Ignore if delete fails (e.g. file not found or already deleted)
        console.warn(`[AuthService] Failed to delete old avatar: ${error}`);
      }
    }

    // 3. Update user: save public R2 URL (fileAsset.fileUrl)
    const fullUser = await this.usersRepository.update(userId, {
      avatarUrl: fileAsset.fileUrl,
    });

    const { password, ...user } = fullUser;
    const { permissions } = await this.authorizationService.getUserPermissions(
      user.id,
      user.role,
    );

    // Ensure proper mapping of userMetadata and avatarUrl
    const userMetadata = user.userMetadata
      ? typeof user.userMetadata === 'object' &&
        user.userMetadata !== null &&
        !Array.isArray(user.userMetadata)
        ? (user.userMetadata as Record<string, unknown>)
        : undefined
      : undefined;

    return {
      ...user,
      avatarUrl: user.avatarUrl || undefined,
      userMetadata,
      verifiedAt: user.verifiedAt || undefined,
      bannedUntil: user.bannedUntil || undefined,
      lastSignInAt: user.lastSignInAt || undefined,
      deletedAt: user.deletedAt || undefined,
      role: user.role as string,
      appMetadata: user.appMetadata
        ? typeof user.appMetadata === 'object' &&
          user.appMetadata !== null &&
          !Array.isArray(user.appMetadata)
          ? (user.appMetadata as Record<string, unknown>)
          : undefined
        : undefined,
      points: (user as any).gamification?.points || 0,
      permissions,
    } as any;
  }

  /**
   * Delete user account (soft delete)
   */
  async deleteUser(userId: string): Promise<void> {
    await this.usersRepository.softDelete(userId);
  }

  // ========================================
  // OAuth Methods
  // ========================================

  /**
   * Register or login with Google OAuth
   */
  async registerWithGoogle(idToken: string): Promise<AuthResponse> {
    // Verify Google ID token
    const googleUser = await this.googleAuthService.verifyIdToken(idToken);
    googleUser.email = googleUser.email.toLowerCase();

    // Check if user exists by Google provider ID
    const existingIdentity = await this.userIdentityRepository.findByProvider(
      'google',
      googleUser.sub,
    );

    if (existingIdentity) {
      // User exists - login
      // User exists - login
      const user = await this.usersRepository.findById(existingIdentity.userId);

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Check if user is banned or deleted
      this.checkUserStatus(user);

      // Update last sign in
      await this.usersRepository.update(user.id, { lastSignInAt: new Date() });

      await this.userIdentityRepository.updateLastSignIn(existingIdentity.id);

      const { permissions } =
        await this.authorizationService.getUserPermissions(user.id, user.role);

      // Create session
      const { refreshToken, sessionId } =
        await this.sessionService.createSession(user.id);
      const accessToken = await this.generateAccessToken(
        user.id,
        user.role,
        sessionId,
        ['oauth'],
        {
          user_metadata: { displayName: user.displayName },
          app_metadata: { provider: 'google' },
        },
      );

      // Emit activity
      this.emitLoginActivity(user.id);

      return {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          role: user.role as string,
          verifiedAt: user.verifiedAt,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          walletBalance: Number(user.walletBalance),
          points: (user as any).gamification?.points || 0,
          permissions,
        },
        accessToken,
        refreshToken,
      };
    }

    // Check if email already exists
    const existingUser = await this.usersRepository.findByEmail(
      googleUser.email,
    );

    if (existingUser) {
      // Check if user is banned or deleted
      this.checkUserStatus(existingUser);

      // Link Google to existing account
      await this.userIdentityRepository.create({
        user: { connect: { id: existingUser.id } },
        provider: 'google',
        providerId: googleUser.sub,
        providerData: googleUser as unknown as Prisma.InputJsonValue,
      });

      // Update user metadata
      const currentMetadata =
        (existingUser.appMetadata as unknown as AppMetadata) || {
          provider: 'email',
          providers: ['email'],
        };
      const providers = currentMetadata.providers || ['email'];

      const metadataToMerge = (googleUser as unknown as UserMetadata) || {};

      await this.usersRepository.update(existingUser.id, {
        avatarUrl: existingUser.avatarUrl || googleUser.picture,
        appMetadata: {
          ...currentMetadata,
          providers: [...new Set([...providers, 'google'])],
        } as unknown as Prisma.InputJsonValue,
        userMetadata: {
          ...((existingUser.userMetadata as unknown as UserMetadata) || {}),
          ...metadataToMerge,
        } as unknown as Prisma.InputJsonValue,
        verifiedAt: googleUser.email_verified
          ? new Date()
          : existingUser.verifiedAt,
        lastSignInAt: new Date(),
      });

      // Emit audit log
      this.natsClient.emit(
        { cmd: 'identity.audit.log' },
        {
          userId: existingUser.id,
          action: 'user.identity_linked',
          entity: 'user_identity',
          entityId: googleUser.sub,
          description: `Automatically linked Google account: ${googleUser.sub}`,
          metadata: { provider: 'google', providerId: googleUser.sub },
        },
      );

      const { permissions } =
        await this.authorizationService.getUserPermissions(
          existingUser.id,
          existingUser.role,
        );

      // Create session
      const { refreshToken, sessionId } =
        await this.sessionService.createSession(existingUser.id);
      const accessToken = await this.generateAccessToken(
        existingUser.id,
        existingUser.role,
        sessionId,
        ['oauth'],
        {
          user_metadata: { displayName: existingUser.displayName },
          app_metadata: { provider: 'google' },
        },
      );

      // Emit activity
      this.emitLoginActivity(existingUser.id);

      return {
        user: {
          id: existingUser.id,
          email: existingUser.email,
          displayName: existingUser.displayName,
          role: existingUser.role as string,
          verifiedAt: existingUser.verifiedAt,
          createdAt: existingUser.createdAt,
          updatedAt: existingUser.updatedAt,
          walletBalance: Number(existingUser.walletBalance),
          points: (existingUser as any).gamification?.points || 0,
          permissions,
        },
        accessToken,
        refreshToken,
      };
    }

    // Create new user
    const newUser = await this.usersRepository.create({
      email: googleUser.email,
      displayName: googleUser.name,
      avatarUrl: googleUser.picture,
      role: 'learner',
      verifiedAt: googleUser.email_verified ? new Date() : null,
      lastSignInAt: new Date(),
      appMetadata: {
        provider: 'google',
        providers: ['google'],
      } as unknown as Prisma.InputJsonValue,
      userMetadata:
        googleUser as unknown as UserMetadata as unknown as Prisma.InputJsonValue,
    });

    // Create welcome notification for new Google user (non-blocking)
    try {
      await this.notificationService.create({
        userId: newUser.id,
        title: 'Chào mừng bạn đến với Torii 🎉',
        message:
          'Bạn đã đăng ký thành công bằng Google. Bắt đầu khám phá các khóa học JLPT ngay nào!',
        notificationType: NotificationType.SYSTEM,
        metadata: {
          email: newUser.email,
          displayName: newUser.displayName,
          source: 'google_oauth',
        },
      });
    } catch (error) {
      // Không chặn flow đăng ký nếu tạo notification thất bại

      console.error(
        '[AuthService] Failed to create welcome notification for Google user',
        newUser.id,
        error,
      );
    }

    // Create Google identity
    await this.userIdentityRepository.create({
      user: { connect: { id: newUser.id } },
      provider: 'google',
      providerId: googleUser.sub,
      providerData: googleUser as unknown as Prisma.InputJsonValue,
    });

    const { permissions } = await this.authorizationService.getUserPermissions(
      newUser.id,
      newUser.role,
    );

    // Create session
    const { refreshToken, sessionId } = await this.sessionService.createSession(
      newUser.id,
    );
    const accessToken = await this.generateAccessToken(
      newUser.id,
      newUser.role,
      sessionId,
      ['oauth'],
      {
        user_metadata: { displayName: newUser.displayName },
        app_metadata: { provider: 'google' },
      },
    );

    // Emit activity
    this.emitLoginActivity(newUser.id);

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        displayName: newUser.displayName,
        role: newUser.role as string,
        verifiedAt: newUser.verifiedAt,
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt,
        walletBalance: Number(newUser.walletBalance),
        points: (newUser as any).gamification?.points || 0,
        permissions,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Register or login with Facebook OAuth
   */
  async registerWithFacebook(accessToken: string): Promise<AuthResponse> {
    // Verify Facebook access token
    const facebookUser =
      await this.facebookAuthService.verifyAccessToken(accessToken);
    facebookUser.email = facebookUser.email?.toLowerCase();

    // Check if user exists by Facebook provider ID
    const existingIdentity = await this.userIdentityRepository.findByProvider(
      'facebook',
      facebookUser.id,
    );

    if (existingIdentity) {
      // User exists - login
      const user = await this.usersRepository.findById(existingIdentity.userId);

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Check if user is banned or deleted
      this.checkUserStatus(user);

      // Update last sign in
      await this.usersRepository.update(user.id, { lastSignInAt: new Date() });

      await this.userIdentityRepository.updateLastSignIn(existingIdentity.id);

      const { permissions } =
        await this.authorizationService.getUserPermissions(user.id, user.role);

      // Create session
      const { refreshToken, sessionId } =
        await this.sessionService.createSession(user.id);
      const access_token = await this.generateAccessToken(
        user.id,
        user.role,
        sessionId,
        ['oauth'],
        {
          user_metadata: { displayName: user.displayName },
          app_metadata: { provider: 'facebook' },
        },
      );

      // Emit activity
      this.emitLoginActivity(user.id);

      return {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          role: user.role as string,
          verifiedAt: user.verifiedAt,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          walletBalance: Number(user.walletBalance),
          points: (user as any).gamification?.points || 0,
          permissions,
        },
        accessToken: access_token,
        refreshToken,
      };
    }

    // Check if email already exists
    const existingUser = await this.usersRepository.findByEmail(
      facebookUser.email,
    );

    if (existingUser) {
      // Check if user is banned or deleted
      this.checkUserStatus(existingUser);

      // Link Facebook to existing account
      await this.userIdentityRepository.create({
        user: { connect: { id: existingUser.id } },
        provider: 'facebook',
        providerId: facebookUser.id,
        providerData: facebookUser as unknown as Prisma.InputJsonValue,
      });

      // Update user metadata
      const currentMetadata =
        (existingUser.appMetadata as unknown as AppMetadata) || {
          provider: 'email',
          providers: ['email'],
        };
      const providers = currentMetadata.providers || ['email'];

      const metadataToMerge = (facebookUser as unknown as UserMetadata) || {};

      await this.usersRepository.update(existingUser.id, {
        avatarUrl: existingUser.avatarUrl || facebookUser.picture?.data.url,
        appMetadata: {
          ...currentMetadata,
          providers: [...new Set([...providers, 'facebook'])],
        } as unknown as Prisma.InputJsonValue,
        userMetadata: {
          ...((existingUser.userMetadata as unknown as UserMetadata) || {}),
          ...metadataToMerge,
        } as unknown as Prisma.InputJsonValue,
        verifiedAt: existingUser.verifiedAt || new Date(), // Facebook verify is implicit or just trust it
        lastSignInAt: new Date(),
      });

      // Emit audit log
      this.natsClient.emit(
        { cmd: 'identity.audit.log' },
        {
          userId: existingUser.id,
          action: 'user.identity_linked',
          entity: 'user_identity',
          entityId: facebookUser.id,
          description: `Automatically linked Facebook account: ${facebookUser.id}`,
          metadata: { provider: 'facebook', providerId: facebookUser.id },
        },
      );

      const { permissions } =
        await this.authorizationService.getUserPermissions(
          existingUser.id,
          existingUser.role,
        );

      // Create session
      const { refreshToken, sessionId } =
        await this.sessionService.createSession(existingUser.id);
      const access_token = await this.generateAccessToken(
        existingUser.id,
        existingUser.role,
        sessionId,
        ['oauth'],
        {
          user_metadata: { displayName: existingUser.displayName },
          app_metadata: { provider: 'facebook' },
        },
      );

      // Emit activity
      this.emitLoginActivity(existingUser.id);

      return {
        user: {
          id: existingUser.id,
          email: existingUser.email,
          displayName: existingUser.displayName,
          role: existingUser.role as string,
          verifiedAt: existingUser.verifiedAt,
          createdAt: existingUser.createdAt,
          updatedAt: existingUser.updatedAt,
          walletBalance: Number(existingUser.walletBalance),
          points: (existingUser as any).gamification?.points || 0,
          permissions,
        },
        accessToken: access_token,
        refreshToken,
      };
    }

    // Create new user
    const newUser = await this.usersRepository.create({
      email: facebookUser.email,
      displayName: facebookUser.name,
      avatarUrl: facebookUser.picture?.data.url,
      role: 'learner',
      verifiedAt: new Date(),
      lastSignInAt: new Date(),
      appMetadata: {
        provider: 'facebook',
        providers: ['facebook'],
      } as unknown as Prisma.InputJsonValue,
      userMetadata:
        facebookUser as unknown as UserMetadata as unknown as Prisma.InputJsonValue,
    });

    // Create welcome notification for new Facebook user (non-blocking)
    try {
      await this.notificationService.create({
        userId: newUser.id,
        title: 'Chào mừng bạn đến với Torii 🎉',
        message:
          'Bạn đã đăng ký thành công bằng Facebook. Bắt đầu khám phá các khóa học JLPT ngay nào!',
        notificationType: NotificationType.SYSTEM,
        metadata: {
          email: newUser.email,
          displayName: newUser.displayName,
          source: 'facebook_oauth',
        },
      });
    } catch (error) {
      // Không chặn flow đăng ký nếu tạo notification thất bại
      console.error(
        '[AuthService] Failed to create welcome notification for Facebook user',
        newUser.id,
        error,
      );
    }

    // Create Facebook identity
    await this.userIdentityRepository.create({
      user: { connect: { id: newUser.id } },
      provider: 'facebook',
      providerId: facebookUser.id,
      providerData: facebookUser as unknown as Prisma.InputJsonValue,
    });

    const { permissions } = await this.authorizationService.getUserPermissions(
      newUser.id,
      newUser.role,
    );

    // Create session
    const { refreshToken, sessionId } = await this.sessionService.createSession(
      newUser.id,
    );
    const access_token = await this.generateAccessToken(
      newUser.id,
      newUser.role,
      sessionId,
      ['oauth'],
      {
        user_metadata: { displayName: newUser.displayName },
        app_metadata: { provider: 'facebook' },
      },
    );

    // Emit activity
    this.emitLoginActivity(newUser.id);

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        displayName: newUser.displayName,
        role: newUser.role as string,
        verifiedAt: newUser.verifiedAt,
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt,
        walletBalance: Number(newUser.walletBalance),
        points: (newUser as any).gamification?.points || 0,
        permissions,
      },
      accessToken: access_token,
      refreshToken,
    };
  }

  /**
   * Link an OAuth provider to an existing user
   */
  async linkProvider(
    userId: string,
    provider: string,
    token: string,
  ): Promise<void> {
    let providerUser: GoogleUserInfo | FacebookUserInfo;

    // 1. Verify provider token and get user info
    if (provider === 'google') {
      providerUser = await this.googleAuthService.verifyIdToken(token);
    } else if (provider === 'facebook') {
      providerUser = await this.facebookAuthService.verifyAccessToken(token);
    } else {
      throw new BadRequestException(`Unsupported provider: ${provider}`);
    }

    const providerId =
      provider === 'google'
        ? (providerUser as GoogleUserInfo).sub
        : (providerUser as FacebookUserInfo).id;

    // 2. Check if this provider account is already linked to another user
    const existingIdentity = await this.userIdentityRepository.findByProvider(
      provider,
      providerId,
    );

    if (existingIdentity) {
      throw new ConflictException(
        `This ${provider} account is already linked to another user`,
      );
    }

    // 3. Check if already linked to this user
    const hasProvider = await this.userIdentityRepository.hasProvider(
      userId,
      provider,
    );
    if (hasProvider) {
      throw new ConflictException(
        `${provider} account already linked to this user`,
      );
    }

    // 4. Create identity
    await this.userIdentityRepository.create({
      user: { connect: { id: userId } },
      provider,
      providerId,
      providerData: providerUser as unknown as Prisma.InputJsonValue,
    });

    // 5. Update user metadata
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Block if banned or deleted
    this.checkUserStatus(user);

    const currentMetadata = (user.appMetadata as unknown as AppMetadata) || {
      provider: 'email',
      providers: ['email'],
    };
    const providers = currentMetadata.providers || ['email'];

    const avatarUrl =
      provider === 'facebook'
        ? (providerUser as FacebookUserInfo).picture?.data.url
        : (providerUser as GoogleUserInfo).picture;

    const metadataToMerge = (providerUser as unknown as UserMetadata) || {};

    await this.usersRepository.update(userId, {
      avatarUrl: user.avatarUrl || avatarUrl,
      appMetadata: {
        ...currentMetadata,
        providers: [...new Set([...providers, provider])],
      } as unknown as Prisma.InputJsonValue,
      userMetadata: {
        ...((user.userMetadata as unknown as UserMetadata) || {}),
        ...metadataToMerge,
      } as unknown as Prisma.InputJsonValue,
    });

    // 6. Emit audit log
    this.natsClient.emit(
      { cmd: 'identity.audit.log' },
      {
        userId,
        action: 'user.identity_linked',
        entity: 'user_identity',
        entityId: providerId,
        description: `Linked ${provider} account: ${providerId}`,
        metadata: { provider, providerId },
      },
    );
  }

  /**
   * Unlink OAuth provider from user
   */
  async unlinkProvider(userId: string, provider: string): Promise<void> {
    // 1. Get user and check if they exist
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 2. Check if user has multiple authentication methods
    const identityCount =
      await this.userIdentityRepository.countByUserId(userId);
    const hasPassword = !!user.password;

    // Cannot unlink if this is the ONLY way to log in
    if (identityCount <= 1 && !hasPassword) {
      throw new BadRequestException('Cannot unlink last authentication method');
    }

    // 3. Find and delete identity
    const identities = await this.userIdentityRepository.findByUserId(userId);
    const identity = identities.find((i) => i.provider === provider);

    if (!identity) {
      throw new NotFoundException('Provider not linked to this account');
    }

    await this.userIdentityRepository.delete(identity.id);

    // 4. Update user metadata
    const currentMetadata = (user.appMetadata as unknown as AppMetadata) || {
      provider: 'email',
      providers: ['email'],
    };
    const providers = (currentMetadata.providers || []).filter(
      (p: string) => p !== provider,
    );

    await this.usersRepository.update(userId, {
      appMetadata: {
        ...currentMetadata,
        provider: providers[0] || 'email',
        providers,
      } as unknown as Prisma.InputJsonValue,
    });

    // 5. Emit audit log
    this.natsClient.emit(
      { cmd: 'identity.audit.log' },
      {
        userId,
        action: 'user.identity_unlinked',
        entity: 'user_identity',
        entityId: identity.providerId,
        description: `Unlinked ${provider} account`,
        metadata: { provider, providerId: identity.providerId },
      },
    );
  }

  /**
   * Get linked providers for user
   */
  async getLinkedProviders(userId: string) {
    const identities = await this.userIdentityRepository.findByUserId(userId);
    const user = await this.usersRepository.findById(userId);

    const result = {
      providers: identities.map((identity) => ({
        provider: identity.provider,
        email:
          (identity.providerData as unknown as GoogleUserInfo)?.email || '',
        linkedAt: identity.createdAt,
      })),
      hasPassword: !!user?.password,
    };
    console.log(`[getLinkedProviders] Returning: ${JSON.stringify(result)}`);
    return result;
  }

  // ========================================
  // Invite Token Methods (Internal Users)
  // ========================================

  /**
   * Verify invite token for internal users (lecturer / staff-academic / staff-operations)
   * Returns user email and role if token is valid
   */
  async verifyInviteToken(
    token: string,
  ): Promise<{ success: boolean; email?: string; role?: string }> {
    const userId = await this.redis.get(`invite-token:${token}`);

    if (!userId) {
      return { success: false };
    }

    // Get user details
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      return { success: false };
    }

    // Check if user already has password set (already onboarded)
    if (user.password) {
      return { success: false };
    }

    return {
      success: true,
      email: user.email,
      role: user.role,
    };
  }

  /**
   * Set password for invited internal user
   * Allows changing default password to a new password via invite token
   * Completes the onboarding flow for lecturer / staff-academic / staff-operations
   */
  async setPassword(token: string, password: string): Promise<void> {
    const userId = await this.redis.get(`invite-token:${token}`);

    if (!userId) {
      throw new UnauthorizedException('Invalid or expired invite token');
    }

    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Block if banned or deleted (onboarding check)
    this.checkUserStatus(user);

    // Note: Users now have a default password from creation
    // This method allows changing the default password to a new one

    // Hash new password
    const hashedPassword = await argon2.hash(password);

    // Update user: set new password and verify email (if not already verified)
    const updateData: any = {
      password: hashedPassword,
    };

    // Auto-verify email for invited users (if not already verified)
    if (!user.verifiedAt) {
      updateData.verifiedAt = new Date();
    }

    await this.usersRepository.update(user.id, updateData);

    // Delete invite token (one-time use)
    await this.redis.del(`invite-token:${token}`);

    // Send welcome email
    this.natsClient.emit(
      { cmd: 'send_email' },
      {
        type: 'welcome',
        to: user.email,
        data: { displayName: user.displayName },
      },
    );
  }

  /**
   * Generate access token for a user
   */
  async generateAccessToken(
    userId: string,
    role: string,
    sid?: string,
    amr: string[] = ['password'],
    metadata?: { user_metadata?: any; app_metadata?: any },
  ): Promise<string> {
    // Centralized caching: If session ID is provided, cache the latest permissions in Redis
    if (sid) {
      try {
        const { permissions } =
          await this.authorizationService.getUserPermissions(userId, role);
        await this.redis.set(
          `session:${sid}:permissions`,
          JSON.stringify(permissions),
          'EX',
          7 * 24 * 60 * 60, // 7 days matches refresh token expiry
        );
      } catch (error) {
        console.error(
          `[AuthService] Failed to cache permissions for session ${sid}:`,
          error,
        );
        // Continue token generation even if cache fails
      }
    }

    return this.jwtTokenProvider.generateToken({
      sub: userId,
      role: role as string,
      sid,
      amr,
      ...metadata,
    });
  }

  /**
   * Generate refresh token for a user using a stable session ID
   */
  async generateRefreshToken(
    userId: string,
    sessionId: string,
  ): Promise<string> {
    return this.jwtTokenProvider.generateRefreshToken({
      sub: userId,
      sid: sessionId,
    });
  }

  /**
   * Internal helper to check if user is banned or deleted
   */
  private checkUserStatus(user: User): void {
    if (user.deletedAt) {
      throw new UnauthorizedException('Account has been deleted');
    }
    if (user.bannedUntil && new Date(user.bannedUntil) > new Date()) {
      const dateStr = new Date(user.bannedUntil).toLocaleDateString();
      throw new UnauthorizedException(`Account is banned until ${dateStr}`);
    }
  }

  /**
   * Helper to emit login activity for gamification
   */
  private emitLoginActivity(userId: string) {
    try {
      const loginEvent: UserActivityEvent = {
        userId,
        activityType: 'LOGIN',
        timestamp: new Date().toISOString(),
        meta: {
          platform: 'unknown',
        },
      };
      this.natsClient.emit('user.activity', loginEvent);
      console.log(`[Gamification] Emitted LOGIN event for user: ${userId}`);
    } catch (error) {
      console.error(
        `[Gamification] Failed to emit LOGIN event for user ${userId}`,
        error,
      );
    }
  }
}
