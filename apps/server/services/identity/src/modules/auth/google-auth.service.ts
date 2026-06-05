import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import type { GoogleUserInfo } from '@workspace/schemas';
import type { IGoogleAuthService } from '@server/identity/interfaces/services';
import { AppConfigService } from '@server/shared';

/**
 * Google OAuth Service
 * Handles Google OAuth token verification and user info extraction
 */
@Injectable()
export class GoogleAuthService implements IGoogleAuthService {
  private readonly logger = new Logger(GoogleAuthService.name);
  private readonly client: OAuth2Client;

  constructor(private readonly appConfig: AppConfigService) {
    const clientId = this.appConfig.thirdParty.google.clientId;

    if (!clientId) {
      this.logger.warn(
        'Google Client ID not configured. Google OAuth will not work.',
      );
    }

    this.client = new OAuth2Client(clientId);
  }

  /**
   * Verify Google ID token and extract user information
   */
  async verifyIdToken(idToken: string): Promise<GoogleUserInfo> {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.appConfig.thirdParty.google.clientId,
      });

      const payload = ticket.getPayload();

      if (!payload) {
        throw new UnauthorizedException('Invalid Google ID token');
      }

      // Validate required fields
      if (!payload.sub || !payload.email) {
        throw new UnauthorizedException(
          'Missing required fields in Google token',
        );
      }

      this.logger.log(`Verified Google token for user: ${payload.email}`);

      return {
        sub: payload.sub,
        name: payload.name || payload.email,
        email: payload.email,
        picture: payload.picture || '',
        email_verified: payload.email_verified || false,
        given_name: payload.given_name,
        family_name: payload.family_name,
      };
    } catch (error) {
      this.logger.error('Failed to verify Google ID token', error);
      throw new UnauthorizedException('Invalid Google ID token');
    }
  }

  /**
   * Check if Google OAuth is configured
   */
  isConfigured(): boolean {
    return !!this.appConfig.thirdParty.google.clientId;
  }
}
