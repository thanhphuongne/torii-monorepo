import type {
  UserRegistrationDTO,
  UserLoginDTO,
  UserResponseDTO,
  AuthResponseDTO,
  LoginResponseDTO,
  VerifyOTPDTO,
  ResendOTPDTO,
  ForgotPasswordDTO,
} from '@workspace/schemas';

/**
 * Authentication Service Interface
 * Defines the contract for authentication and authorization operations
 */
export interface IAuthService {
  // ===== Registration & Login =====

  /**
   * Register a new user
   * @param dto - User registration data
   * @returns The created user
   * @throws ConflictException if email already exists
   */
  register(dto: UserRegistrationDTO): Promise<UserResponseDTO>;

  /**
   * Login user and generate JWT token
   * Supports 2FA - returns requiresTwoFactor if 2FA is enabled
   * @param dto - User login credentials
   * @returns Login response with tokens or 2FA requirement
   * @throws UnauthorizedException if credentials are invalid
   */
  login(dto: UserLoginDTO): Promise<LoginResponseDTO>;

  /**
   * Specialized login for admin portals (admin, staff-academic, staff-operations, lecturer)
   * Rejects users with LEARNER role even with valid credentials
   * @param dto - User login credentials
   * @returns Login response with tokens or 2FA requirement
   * @throws UnauthorizedException if credentials invalid OR role is restricted
   */
  adminLogin(dto: UserLoginDTO): Promise<LoginResponseDTO>;

  // ===== Two-Factor Authentication =====

  /**
   * Verify 2FA code and complete login
   * @param tempToken - Temporary token from initial login
   * @param code - 2FA verification code
   * @param isBackupCode - Whether the code is a backup code (default: false)
   * @returns Complete authentication response with tokens
   * @throws UnauthorizedException if token or code is invalid
   */
  verify2FA(
    tempToken: string,
    code: string,
    isBackupCode?: boolean,
  ): Promise<AuthResponseDTO>;

  // ===== User Management =====

  /**
   * Get current authenticated user with permissions
   * @param userId - The user's unique identifier
   * @returns User data with permissions
   * @throws NotFoundException if user not found
   */
  getCurrentUser(
    userId: string,
  ): Promise<UserResponseDTO & { permissions: string[] }>;

  /**
   * Update user information
   * @param userId - The user's unique identifier
   * @param dto - User update data
   * @returns Updated user data with permissions
   * @throws NotFoundException if user not found
   */
  updateUser(
    userId: string,
    dto: { displayName?: string; userMetadata?: Record<string, any> },
  ): Promise<UserResponseDTO & { permissions: string[] }>;

  /**
   * Update user avatar (profile picture)
   * @param userId - The user's unique identifier
   * @param fileId - The file identifier from storage service
   * @returns Updated user data with permissions
   */
  updateAvatar(
    userId: string,
    fileId: string,
  ): Promise<UserResponseDTO & { permissions: string[] }>;

  /**
   * Delete user account (soft delete)
   * @param userId - The user's unique identifier
   */
  deleteUser(userId: string): Promise<void>;

  // ===== Email Verification =====

  /**
   * Generate token for email verification
   * @param email - The user's email address
   * @returns Token to be used in verification URL
   */
  generateVerificationToken(email: string): Promise<string>;

  /**
   * Verify verification token and activate user
   * @param token - The verification token
   * @returns Verification result
   */
  verifyVerificationToken(
    token: string,
  ): Promise<{ success: boolean; email?: string }>;

  /**
   * Resend verification email with magic link
   * Rate limited: 3 requests per hour per email
   * @param email - The user's email address
   * @throws BadRequestException if rate limit exceeded
   * @throws NotFoundException if user not found
   */
  resendVerification(email: string): Promise<void>;

  // ===== Password Reset =====

  /**
   * Initiate password reset flow
   * Generates a magic link (web) or OTP (mobile) and sends reset email
   * Rate limited: 3 requests per hour per email
   * @param dto - Forgot password data (email and platform)
   * @throws BadRequestException if rate limit exceeded
   */
  forgotPassword(dto: ForgotPasswordDTO): Promise<void>;

  /**
   * Verify OTP code (for mobile flow)
   * @param dto - OTP verification data
   * @returns Verification result (email if valid, and optional temp token for reset-password)
   * @throws UnauthorizedException if OTP is invalid
   */
  verifyOTP(
    dto: VerifyOTPDTO,
  ): Promise<{ success: boolean; email?: string; tempToken?: string }>;

  /**
   * Resend OTP code
   * @param dto - OTP resend data
   * @throws BadRequestException if rate limit exceeded
   */
  resendOTP(dto: ResendOTPDTO): Promise<void>;

  /**
   * Verify reset password token
   * @param token - The password reset token
   * @returns Verification result with email if valid
   */
  verifyResetToken(
    token: string,
  ): Promise<{ success: boolean; email?: string }>;

  /**
   * Reset password using valid reset token
   * @param token - The password reset token
   * @param newPassword - The new password
   * @throws UnauthorizedException if token is invalid
   * @throws NotFoundException if user not found
   */
  resetPassword(token: string, newPassword: string): Promise<void>;

  /**
   * Change user password (for authenticated users)
   * @param userId - The user's unique identifier
   * @param oldPassword - Current password
   * @param newPassword - New password
   * @throws UnauthorizedException if old password is incorrect
   */
  changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<void>;

  // ===== OAuth / Google Authentication =====

  /**
   * Register or login with Google OAuth
   * @param idToken - Google ID token
   * @returns Complete authentication response with tokens
   * @throws UnauthorizedException if token is invalid
   */
  registerWithGoogle(idToken: string): Promise<AuthResponseDTO>;

  /**
   * Register or login with Facebook OAuth
   * @param accessToken - Facebook access token
   * @returns Complete authentication response with tokens
   * @throws UnauthorizedException if token is invalid
   */
  registerWithFacebook(accessToken: string): Promise<AuthResponseDTO>;

  linkProvider(userId: string, provider: string, token: string): Promise<void>;

  /**
   * Logout user
   * Blacklists access token and revokes refresh token session
   * Works with both valid and expired tokens
   * @param accessToken - Access token to blacklist
   * @param refreshToken - Refresh token to revoke (optional)
   */
  logout(
    accessToken: string | null,
    refreshToken?: string | null,
  ): Promise<void>;

  /**
   * Unlink OAuth provider from user
   * @param userId - The user's unique identifier
   * @param provider - The provider to unlink (e.g., 'google')
   * @throws BadRequestException if this is the only login method
   * @throws NotFoundException if provider not found
   */
  unlinkProvider(userId: string, provider: string): Promise<void>;

  /**
   * Get linked providers for user
   * @param userId - The user's unique identifier
   * @returns Object with provider information
   */
  getLinkedProviders(userId: string): Promise<{
    providers: Array<{
      provider: string;
      email: string;
      linkedAt: Date;
    }>;
    hasPassword: boolean;
  }>;

  // ===== Invite Token (Internal Users) =====

  /**
   * Verify invite token for internal users (lecturer / staff-academic / staff-operations)
   * @param token - The invite token
   * @returns Verification result with user email and role if valid
   */
  verifyInviteToken(
    token: string,
  ): Promise<{ success: boolean; email?: string; role?: string }>;

  /**
   * Set password for invited internal user
   * Completes the onboarding flow for lecturer / staff-academic / staff-operations
   * @param token - The invite token
   * @param password - The new password
   * @throws UnauthorizedException if token is invalid
   * @throws NotFoundException if user not found
   */
  setPassword(token: string, password: string): Promise<void>;

  // ===== Token Generation =====

  /**
   * Generate access token for a user
   * @param userId - The user's unique identifier
   * @param role - The user's role
   * @returns The generated JWT access token
   */
  generateAccessToken(
    userId: string,
    role: string,
    sid?: string,
    amr?: string[],
    metadata?: { user_metadata?: any; app_metadata?: any },
  ): Promise<string>;

  /**
   * Generate refresh token for a user using a stable session ID
   * @param userId - The user's unique identifier
   * @param sessionId - The stable session record ID
   * @returns The generated JWT refresh token
   */
  generateRefreshToken(userId: string, sessionId: string): Promise<string>;
}
