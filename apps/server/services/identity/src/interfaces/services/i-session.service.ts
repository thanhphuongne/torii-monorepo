import type { RefreshTokenPayload } from '@server/shared';

/**
 * Session Service Interface
 * Defines the contract for session management operations
 */
export interface ISessionService {
  /**
   * Create a new session (refresh token) for a user
   * @param userId - The user's unique identifier
   * @param metadata - Optional metadata (IP address, user agent)
   * @returns The signed JWT refresh token
   */
  createSession(
    userId: string,
    metadata?: { deviceInfo?: string; ipAddress?: string; userAgent?: string },
  ): Promise<{ refreshToken: string; sessionId: string }>;

  /**
   * Verify a refresh token and return session info
   * @param token - The refresh token to verify
   * @returns Payload if valid, null if invalid/expired/revoked
   */
  verifySession(token: string): Promise<RefreshTokenPayload | null>;

  /**
   * Revoke a single session
   * @param tokenHash - The hashed token to revoke
   */
  revokeSession(tokenHash: string): Promise<void>;

  /**
   * Revoke all sessions for a user
   * Useful for logout all devices or password change
   * @param userId - The user's unique identifier
   */
  revokeAllUserSessions(userId: string): Promise<void>;

  /**
   * Cleanup expired and revoked sessions
   * Should be called by a cron job periodically
   * @returns Number of sessions cleaned up
   */
  cleanupExpiredSessions(): Promise<number>;

  /**
   * Get hash from token
   * @param token - The token to hash
   * @returns The SHA-256 hash of the token
   */
  hashTokenPublic(token: string): string;

  /**
   * Get all active sessions for a user
   * @param userId - The user's unique identifier
   */
  getUserSessions(userId: string): Promise<any[]>;

  /**
   * Revoke a specific session by its database ID
   * @param sessionId - The session's unique database identifier
   * @param userId - The owner of the session (for security check)
   */
  revokeSessionById(sessionId: string, userId: string): Promise<void>;

  /**
   * Revoke all sessions for a user EXCEPT the current one
   * @param userId - The user's unique identifier
   * @param currentTokenHash - The hash of the current session token to keep
   */
  revokeAllOtherUserSessions(
    userId: string,
    currentTokenHash: string,
  ): Promise<void>;

  /**
   * Update the token hash for an existing session (Rotation)
   * @param sessionId - The session identifier
   * @param newTokenHash - The new hash to store
   */
  updateSessionTokenHash(
    sessionId: string,
    newTokenHash: string,
  ): Promise<void>;
}
