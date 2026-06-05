import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import axios from 'axios';
import type { FacebookUserInfo } from '@workspace/schemas';
import type { IFacebookAuthService } from '@server/identity/interfaces/services';
import { AppConfigService } from '@server/shared';

/**
 * Facebook OAuth Service
 * Handles Facebook access token verification and user info extraction
 */
@Injectable()
export class FacebookAuthService implements IFacebookAuthService {
  private readonly logger = new Logger(FacebookAuthService.name);

  constructor(private readonly appConfig: AppConfigService) {
    const appId = this.appConfig.thirdParty.facebook.appId;

    if (!appId) {
      this.logger.warn(
        'Facebook App ID not configured. Facebook OAuth will not work.',
      );
    }
  }

  /**
   * Verify Facebook access token and extract user information
   * Uses Facebook Graph API to verify the token and get user profile
   */
  async verifyAccessToken(accessToken: string): Promise<FacebookUserInfo> {
    try {
      // Step 1: Get user profile information using the access token
      // Fields we need: id, name, email, picture
      const response = await axios.get<FacebookUserInfo>(
        'https://graph.facebook.com/me',
        {
          params: {
            fields: 'id,name,email,picture',
            access_token: accessToken,
          },
        },
      );

      const payload = response.data;

      if (!payload || !payload.id || !payload.email) {
        throw new UnauthorizedException('Invalid Facebook access token');
      }

      this.logger.log(`Verified Facebook token for user: ${payload.email}`);

      return {
        id: payload.id,
        name: payload.name,
        email: payload.email,
        picture: payload.picture,
      };
    } catch (error) {
      this.logger.error('Failed to verify Facebook access token', error);
      throw new UnauthorizedException('Invalid Facebook access token');
    }
  }

  /**
   * Check if Facebook OAuth is configured
   */
  isConfigured(): boolean {
    return !!this.appConfig.thirdParty.facebook.appId;
  }
}
