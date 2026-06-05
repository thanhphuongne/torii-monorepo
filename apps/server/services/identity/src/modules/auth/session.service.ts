import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@server/shared';
import { JwtTokenProvider, type RefreshTokenPayload } from '@server/shared';
import { createHash, randomUUID } from 'crypto';
import type { ISessionService } from '@server/identity/interfaces/services';

@Injectable()
export class SessionService implements ISessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtProvider: JwtTokenProvider,
  ) {}

  /**
   * Create a new session (refresh token) for a user
   * @returns The signed JWT refresh token
   */
  async createSession(
    userId: string,
    metadata?: { deviceInfo?: string; ipAddress?: string; userAgent?: string },
  ): Promise<{ refreshToken: string; sessionId: string }> {
    // 1. Pre-generate the stable session ID (sid)
    const sessionId = randomUUID();

    // 2. Generate JWT using this sid
    const refreshToken = await this.jwtProvider.generateRefreshToken({
      sub: userId,
      sid: sessionId,
    });

    // 3. Hash the token for storage
    const tokenHash = this.hashToken(refreshToken);

    // 4. Create session record in one atomic operation
    await this.prisma.session.create({
      data: {
        id: sessionId, // Use the pre-generated ID
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        deviceInfo: metadata?.deviceInfo || 'Unknown Device',
        userAgent: metadata?.userAgent,
        ipAddress: metadata?.ipAddress,
      },
    });

    this.logger.log(`Session ${sessionId} created for user ${userId}`);
    return { refreshToken, sessionId };
  }

  /**
   * Verify a refresh token and return session info
   */
  async verifySession(token: string): Promise<RefreshTokenPayload | null> {
    try {
      const payload = await this.jwtProvider.verifyRefreshToken(token);
      if (!payload) return null;

      const tokenHash = this.hashToken(token);
      const storedSession = await this.prisma.session.findUnique({
        where: { id: payload.sid },
        select: {
          id: true,
          userId: true,
          tokenHash: true,
          expiresAt: true,
          revokedAt: true,
        },
      });

      // Security: If sid not found OR hash doesn't match, it's a potential replay attack
      if (!storedSession || storedSession.tokenHash !== tokenHash) {
        if (storedSession) {
          this.logger.warn(
            `REPLAY ATTACK DETECTED for session ${storedSession.id} (User: ${storedSession.userId}). Revoking entire session lifecycle...`,
          );
          // Revoke by ID to ensure we kill the current valid session regardless of hash rotation
          await this.revokeSessionById(storedSession.id, storedSession.userId);
        }
        return null;
      }

      if (storedSession.revokedAt || storedSession.expiresAt < new Date()) {
        return null;
      }

      return payload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Revoke a single session
   */
  async revokeSession(tokenHash: string): Promise<void> {
    try {
      await this.prisma.session.updateMany({
        where: {
          tokenHash,
          revokedAt: null, // Only update if not already revoked
        },
        data: {
          revokedAt: new Date(),
        },
      });
      this.logger.log(`Session revoked: ${tokenHash.substring(0, 8)}...`);
    } catch (error) {
      this.logger.error(`Error revoking session: ${error}`);
    }
  }

  /**
   * Revoke all sessions for a user
   * Useful for logout all devices or password change
   */
  async revokeAllUserSessions(userId: string): Promise<void> {
    try {
      const result = await this.prisma.session.updateMany({
        where: {
          userId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });
      this.logger.log(`Revoked ${result.count} sessions for user ${userId}`);
    } catch (error) {
      this.logger.error(`Error revoking all user sessions: ${error}`);
    }
  }

  /**
   * Cleanup expired and revoked sessions
   * Should be called by a cron job periodically
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const result = await this.prisma.session.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            {
              revokedAt: {
                lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Revoked >30 days ago
              },
            },
          ],
        },
      });

      this.logger.log(`Cleaned up ${result.count} expired/old sessions`);
      return result.count;
    } catch (error) {
      this.logger.error(`Error cleaning up sessions: ${error}`);
      return 0;
    }
  }

  /**
   * Hash token using SHA-256
   * @private
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Get hash from token (public helper for controller)
   */
  hashTokenPublic(token: string): string {
    return this.hashToken(token);
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<any[]> {
    return this.prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        deviceInfo: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        tokenHash: true, // Needed to identify "current" session on frontend
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Revoke a specific session by its database ID
   */
  async revokeSessionById(sessionId: string, userId: string): Promise<void> {
    try {
      await this.prisma.session.update({
        where: {
          id: sessionId,
          userId, // Security: ensure user owns the session
        },
        data: {
          revokedAt: new Date(),
        },
      });
      this.logger.log(`Session ${sessionId} revoked by user ${userId}`);
    } catch (error) {
      this.logger.error(`Error revoking session ${sessionId}: ${error}`);
    }
  }

  /**
   * Revoke all sessions for a user EXCEPT the current one
   */
  async revokeAllOtherUserSessions(
    userId: string,
    currentTokenHash: string,
  ): Promise<void> {
    try {
      const result = await this.prisma.session.updateMany({
        where: {
          userId,
          tokenHash: { not: currentTokenHash },
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });
      this.logger.log(
        `Revoked ${result.count} other sessions for user ${userId}`,
      );
    } catch (error) {
      this.logger.error(`Error revoking other user sessions: ${error}`);
    }
  }

  /**
   * Update the token hash for an existing session (Rotation)
   */
  async updateSessionTokenHash(
    sessionId: string,
    newTokenHash: string,
  ): Promise<void> {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        tokenHash: newTokenHash,
      },
    });
  }
}
