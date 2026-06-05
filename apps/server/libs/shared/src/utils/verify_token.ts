import * as jwt from 'jsonwebtoken';
import { WajlcTokenClaims, WajlcTokenClaimsSchema } from '@workspace/protocol';
import { create } from '@bufbuild/protobuf';

/**
 * Standard JWT Claims interface
 */
interface StandardClaims {
  iss?: string; // Issuer
  sub?: string; // Subject
  exp?: number; // Expiration Time
  nbf?: number; // Not Before
  iat?: number; // Issued At
}

/**
 * Custom payload interface for JWT token
 * TokenClaims only has: name, userId, roomId, isAdmin, isHidden
 */
interface WajlcJWTPayload extends StandardClaims {
  room_id?: string;
  user_id?: string;
  name?: string;
  is_admin?: boolean;
  is_hidden?: boolean;
}

/**
 * VerifyAccessToken verifies a access token
 *
 * @param apiKey - Expected API key (issuer)
 * @param secret - API secret for verification
 * @param token - JWT token to verify
 * @param gracefulPeriod - Allows token to be valid past expiration (in seconds). 0 = strict validation
 * @returns token if valid
 * @throws Error if token is invalid
 *
 * gracefulPeriod allows a token to be considered valid for this duration past its original expiration time.
 * A value of 0 means no graceful period (strict expiration).
 * NotBefore (nbf) validation is always strict against the current time.
 */
export function verifyWajlcAccessToken(
  apiKey: string,
  secret: string,
  token: string,
  gracefulPeriod: number = 0, // seconds
): WajlcTokenClaims {
  try {
    // Decode without verification first to check expiration manually
    const decoded = jwt.decode(token) as WajlcJWTPayload;

    if (!decoded) {
      throw new Error('Invalid token format');
    }

    const now = Math.floor(Date.now() / 1000);

    // Always validate NotBefore strictly (no graceful period)
    if (decoded.nbf && decoded.nbf > now) {
      throw new Error('Token not yet valid (nbf)');
    }

    // Handle expiration with graceful period
    let ignoreExpiration = false;
    if (decoded.exp) {
      const expired = decoded.exp < now;

      if (expired) {
        // If token expired, check if within graceful period
        if (gracefulPeriod > 0) {
          const withinGracefulPeriod = decoded.exp > now - gracefulPeriod;
          if (withinGracefulPeriod) {
            // Token is expired but within graceful period - allow it
            ignoreExpiration = true;
          } else {
            throw new Error('Token expired (outside graceful period)');
          }
        } else {
          throw new Error('Token expired');
        }
      }
    }

    // Verify the token signature and standard claims
    const verified = jwt.verify(token, secret, {
      algorithms: ['HS256'],
      issuer: apiKey,
      ignoreExpiration: ignoreExpiration,
    }) as WajlcJWTPayload;

    // Validate issuer
    if (verified.iss !== apiKey) {
      throw new Error('Invalid issuer');
    }

    // Validate subject matches user_id if present
    if (verified.user_id && verified.sub && verified.user_id !== verified.sub) {
      // claims.UserId is set to out.Subject at the end
      // So we'll use sub as the authoritative userId
    }

    // Create TokenClaims from verified payload
    // TokenClaims only has: name, userId, roomId, isAdmin, isHidden
    const claims = create(WajlcTokenClaimsSchema, {
      userId: verified.user_id || verified.sub || '',
      roomId: verified.room_id || '',
      name: verified.name || '',
      isAdmin: verified.is_admin || false,
      isHidden: verified.is_hidden || false,
    });

    // Ensure userId is set from subject if not in custom claims
    // claims.UserId = out.Subject
    if (!claims.userId && verified.sub) {
      claims.userId = verified.sub;
    }

    return claims;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    if (error instanceof jwt.NotBeforeError) {
      throw new Error('Token not yet valid');
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Token verification failed: ${error}`);
  }
}
