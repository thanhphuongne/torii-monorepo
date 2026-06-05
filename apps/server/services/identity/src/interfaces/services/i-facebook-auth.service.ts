import type { FacebookUserInfo } from '@workspace/schemas';

/**
 * Facebook OAuth Service Interface
 * Defines the contract for Facebook OAuth operations
 */
export interface IFacebookAuthService {
  /**
   * Verify Facebook access token and extract user information
   * @param accessToken - The Facebook access token
   * @returns User information from Facebook
   * @throws UnauthorizedException if token is invalid
   */
  verifyAccessToken(accessToken: string): Promise<FacebookUserInfo>;

  /**
   * Check if Facebook OAuth is configured
   * @returns True if Facebook OAuth is configured, false otherwise
   */
  isConfigured(): boolean;
}
