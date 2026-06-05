import type { GoogleUserInfo } from '@workspace/schemas';

/**
 * Google OAuth Service Interface
 * Defines the contract for Google OAuth operations
 */
export interface IGoogleAuthService {
  /**
   * Verify Google ID token and extract user information
   * @param idToken - The Google ID token
   * @returns User information from Google
   * @throws UnauthorizedException if token is invalid
   */
  verifyIdToken(idToken: string): Promise<GoogleUserInfo>;

  /**
   * Check if Google OAuth is configured
   * @returns True if Google OAuth is configured, false otherwise
   */
  isConfigured(): boolean;
}
