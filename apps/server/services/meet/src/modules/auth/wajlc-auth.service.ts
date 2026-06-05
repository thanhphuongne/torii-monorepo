/**
 * Wajlc Authentication Service
 *
 */

import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { generateWajlcJWTAccessToken } from '@server/shared/utils/access_token';
import { verifyWajlcAccessToken } from '@server/shared/utils/verify_token';
import { verifyWebhookRequest } from '@server/shared/utils/webhook_verify';
import { NatsUserInfoService } from '@server/meet/infrastructure/nats/nats-user-info.service';
import * as jwt from 'jsonwebtoken';
import { AppConfigService } from '@server/shared';

/**
 * Plain Wajlc token claims (not protobuf)
 */
export interface WajlcTokenClaims {
  name: string;
  userId: string;
  roomId: string;
  isAdmin: boolean;
  isHidden?: boolean;
}

/**
 * AuthService handles JWT token generation and verification
 */
@Injectable()
export class WajlcAuthService {
  private readonly logger = new Logger(WajlcAuthService.name);
  private readonly apiKey: string;
  private readonly secret: string;
  private readonly tokenValidity: number; // in seconds
  private readonly livekitApiKey: string;
  private readonly livekitSecret: string;

  constructor(
    private readonly appConfig: AppConfigService,
    @Inject(forwardRef(() => NatsUserInfoService))
    private readonly natsUserInfoService: NatsUserInfoService,
  ) {
    const { wajlc } = this.appConfig.security;
    this.apiKey = wajlc.apiKey;
    this.secret = wajlc.apiSecret;
    this.tokenValidity = 3600; // 1 hour default (hardcoded for now as it's not in schema)

    const { apiKey: lkKey, apiSecret: lkSecret } = this.appConfig.livekit;
    this.livekitApiKey = lkKey;
    this.livekitSecret = lkSecret;

    if (!this.apiKey || !this.secret) {
      this.logger.error(
        'API Key or Secret is missing. Please check configuration wajlc: section.',
      );
    }
  }

  /**
   * Generate Wajlc JWT access token
   */
  generateWajlcJoinToken(claims: WajlcTokenClaims): string {
    try {
      // Delegate to shared utils
      const token = generateWajlcJWTAccessToken(
        this.apiKey,
        this.secret,
        claims.userId,
        this.tokenValidity,
        claims as any, // Cast to protocol type
      );

      this.logger.log(`Generated Wajlc token for user: ${claims.userId}`);
      return token;
    } catch (error) {
      this.logger.error(`Failed to generate Wajlc token: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verify Wajlc access token
   */
  verifyWajlcAccessToken(
    token: string,
    gracefulPeriodSeconds: number = 0,
  ): WajlcTokenClaims {
    try {
      // Delegate to shared utils
      const protobufClaims = verifyWajlcAccessToken(
        this.apiKey,
        this.secret,
        token,
        gracefulPeriodSeconds,
      );

      // Convert protobuf to plain object
      const claims: WajlcTokenClaims = {
        name: protobufClaims.name,
        userId: protobufClaims.userId,
        roomId: protobufClaims.roomId,
        isAdmin: protobufClaims.isAdmin,
        isHidden: protobufClaims.isHidden,
      };

      return claims;
    } catch (error) {
      this.logger.error(`Invalid token: ${error.message}`);
      throw new Error('Thông tin token không hợp lệ');
    }
  }

  /**
   * Alias for verifyWajlcAccessToken
   * Used by NATS auth callout
   */
  verifyToken(token: string): WajlcTokenClaims {
    return this.verifyWajlcAccessToken(token, 0);
  }

  /**
   * Get claims without verification (unsafe)
   */
  unsafeClaimsWithoutVerification(token: string): WajlcTokenClaims | null {
    try {
      // Decode without verification
      const decoded = jwt.decode(token) as any;

      if (!decoded) {
        return null;
      }

      const claims: WajlcTokenClaims = {
        name: decoded.name,
        userId: decoded.user_id,
        roomId: decoded.room_id,
        isAdmin: decoded.is_admin,
        isHidden: decoded.is_hidden,
      };

      return claims;
    } catch (error) {
      this.logger.error(`Failed to decode token: ${error.message}`);
      return null;
    }
  }

  /**
   * Renew Wajlc token
   * Note: This requires NATS service to check user status
   */
  async renewWajlcToken(
    oldToken: string,
    gracefulPeriodSeconds: number = 0,
  ): Promise<string> {
    // Verify old token first (calls shared utils)
    const claims = this.verifyWajlcAccessToken(oldToken, gracefulPeriodSeconds);

    // Check if user exists in the room
    try {
      const status = await this.natsUserInfoService.getRoomUserStatus(
        claims.roomId,
        claims.userId,
      );
      if (!status || status === '') {
        throw new Error('Không tìm thấy người dùng');
      }
    } catch (error) {
      this.logger.error(
        `Failed to check user status during token renewal: ${error.message}`,
      );
      throw error;
    }

    // Generate new token with same claims (calls shared utils)
    return this.generateWajlcJoinToken(claims);
  }

  /**
   * Validate LiveKit webhook token
   */
  validateLivekitWebhookToken(body: string | Buffer, token: string): boolean {
    try {
      // Convert string to Buffer if needed
      const bodyBuffer = typeof body === 'string' ? Buffer.from(body) : body;

      // Delegate to shared utils
      const isValid = verifyWebhookRequest(
        bodyBuffer,
        this.livekitApiKey,
        this.livekitSecret,
        token,
      );

      return isValid;
    } catch (error) {
      this.logger.error(
        `Failed to validate LiveKit webhook token: ${error.message}`,
      );
      return false;
    }
  }
}
