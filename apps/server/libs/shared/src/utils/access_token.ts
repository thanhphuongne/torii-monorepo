import * as jwt from 'jsonwebtoken';
import { AccessToken, VideoGrant } from 'livekit-server-sdk';
import { WajlcTokenClaims } from '@workspace/protocol';

/**
 *
 * @param apiKey - API key (issuer)
 * @param secret - API secret for signing
 * @param userId - User ID (subject)
 * @param tokenValidity - Token validity duration in seconds
 * @param claims - token claims
 * @returns JWT token string
 */
export function generateWajlcJWTAccessToken(
  apiKey: string,
  secret: string,
  userId: string,
  tokenValidity: number, // seconds
  claims: WajlcTokenClaims,
): string {
  // Create JWT payload with custom claims
  // TokenClaims only has: name, userId, roomId, isAdmin, isHidden
  const payload = {
    // Custom token claims (snake_case)
    room_id: claims.roomId,
    user_id: claims.userId,
    name: claims.name,
    is_admin: claims.isAdmin,
    is_hidden: claims.isHidden,
  };

  // Sign with HS256 algorithm (equivalent to jose.HS256)
  // jsonwebtoken automatically adds standard claims via options
  return jwt.sign(payload, secret, {
    algorithm: 'HS256',
    issuer: apiKey,
    subject: userId,
    expiresIn: tokenValidity, // seconds
  });
}

/**
 * GenerateLivekitAccessToken generates a LiveKit access token
 *
 * @param apiKey - LiveKit API key
 * @param secret - LiveKit API secret
 * @param tokenValidity - Token validity duration in seconds
 * @param claims - token claims
 * @returns LiveKit JWT token string
 */
export async function generateLivekitAccessToken(
  apiKey: string,
  secret: string,
  tokenValidity: number, // seconds
  claims: WajlcTokenClaims,
): Promise<string> {
  // Create VideoGrant equivalent
  const grant: VideoGrant = {
    roomJoin: true,
    room: claims.roomId,
    roomAdmin: claims.isAdmin,
    hidden: claims.isHidden,
  };

  // Create AccessToken using livekit-server-sdk
  const at = new AccessToken(apiKey, secret, {
    identity: claims.userId,
    name: claims.name,
    ttl: tokenValidity,
  });

  at.addGrant(grant);

  // livekit-server-sdk toJwt() returns Promise<string>
  return await at.toJwt();
}

/**
 * GenerateTokenForDownloadRecording generates a token for downloading recordings
 *
 * Path format: sub_path/roomSid/filename
 *
 * @param path - Recording file path
 * @param apiKey - API key (issuer)
 * @param apiSecret - API secret for signing
 * @param tokenValidity - Token validity duration in seconds
 * @returns JWT token string
 */
export function generateTokenForDownloadRecording(
  path: string,
  apiKey: string,
  apiSecret: string,
  tokenValidity: number, // seconds
): string {
  const payload = {
    // Empty payload, only standard claims in options
  };

  return jwt.sign(payload, apiSecret, {
    algorithm: 'HS256',
    issuer: apiKey,
    subject: path, // format: sub_path/roomSid/filename
    expiresIn: tokenValidity, // seconds
  });
}
