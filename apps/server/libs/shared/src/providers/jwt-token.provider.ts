import { Injectable } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { TokenPayload } from '@workspace/schemas';
import { AppConfigService } from '../config/app-config.service';

export interface RefreshTokenPayload {
  sub: string; // userId
  sid: string; // Session ID (replaces tokenId)
}

/**
 * 2FA Temporary Token Payload
 * Used for temporary tokens during 2FA verification flow
 */
export interface TwoFactorTempTokenPayload {
  sub: string; // userId (for compatibility with TokenPayload)
  role: string; // user role (for compatibility with TokenPayload)
  userId: string; // user ID (duplicate of sub for clarity)
  email: string; // user email
  method: string; // 2FA method (e.g., 'totp')
  type: '2fa-temp'; // token type identifier
}

@Injectable()
export class JwtTokenProvider {
  private readonly secretKey: string;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;

  constructor(private appConfig: AppConfigService) {
    this.secretKey = this.appConfig.security.jwt.secret;
    this.accessTokenExpiry = this.appConfig.security.jwt.accessExpires;
    this.refreshTokenExpiry = this.appConfig.security.jwt.refreshExpires;
  }

  /**
   * Generate access token (short-lived)
   */
  async generateToken(
    payload: TokenPayload,
    expiresIn?: string,
  ): Promise<string> {
    const { v4: uuidv4 } = await import('uuid');

    return jwt.sign(payload, this.secretKey, {
      expiresIn: expiresIn || this.accessTokenExpiry,
      issuer: this.appConfig.security.jwt.issuer || 'auth.torii.edu',
      audience: this.appConfig.security.jwt.audience || 'torii-client',
      jwtid: uuidv4(), // Unique ID for this token
    });
  }

  /**
   * Generate refresh token (long-lived)
   */
  async generateRefreshToken(payload: RefreshTokenPayload): Promise<string> {
    const { v4: uuidv4 } = await import('uuid');

    return jwt.sign(payload, this.secretKey, {
      expiresIn: this.refreshTokenExpiry,
      issuer: this.appConfig.security.jwt.issuer || 'auth.torii.edu',
      audience: this.appConfig.security.jwt.audience || 'torii-client',
      jwtid: uuidv4(),
    });
  }

  /**
   * Verify access token
   */
  async verifyToken(token: string): Promise<TokenPayload | null> {
    try {
      const decoded = jwt.verify(token, this.secretKey, {
        issuer: this.appConfig.security.jwt.issuer || 'auth.torii.edu',
        audience: this.appConfig.security.jwt.audience || 'torii-client',
      }) as TokenPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * Verify refresh token
   * Validates issuer and audience for security
   */
  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null> {
    try {
      const decoded = jwt.verify(token, this.secretKey, {
        issuer: this.appConfig.security.jwt.issuer || 'auth.torii.edu',
        audience: this.appConfig.security.jwt.audience || 'torii-client',
      }) as RefreshTokenPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate 2FA temporary token (short-lived, for 2FA verification flow)
   */
  async generate2FATempToken(
    payload: TwoFactorTempTokenPayload,
    expiresIn?: string,
  ): Promise<string> {
    return jwt.sign(payload, this.secretKey, {
      expiresIn: expiresIn || '5m', // Default 5 minutes
    });
  }

  /**
   * Verify 2FA temporary token
   */
  async verify2FATempToken(
    token: string,
  ): Promise<TwoFactorTempTokenPayload | null> {
    try {
      const decoded = jwt.verify(
        token,
        this.secretKey,
      ) as TwoFactorTempTokenPayload;
      // Validate token type
      if (decoded.type !== '2fa-temp') {
        return null;
      }
      return decoded;
    } catch (error) {
      return null;
    }
  }
}
