import { Injectable, Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.provider';

@Injectable()
export class BlacklistService {
  private readonly logger = new Logger(BlacklistService.name);
  private readonly KEY_PREFIX = 'blacklist:token:';

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /**
   * Add a token (jti) to the blacklist
   * @param jti Unique token ID
   * @param ttlSeconds Time to live in seconds (usually remaining validity of the token)
   */
  async blacklist(jti: string, ttlSeconds: number): Promise<void> {
    if (!jti) return;

    // Ensure minimal TTL to avoid immediate expiration issues
    const ttl = Math.max(ttlSeconds, 1);

    await this.redis.set(`${this.KEY_PREFIX}${jti}`, 'revoked', 'EX', ttl);

    this.logger.debug(`Blacklisted token ${jti} for ${ttl}s`);
  }

  /**
   * Check if a token is blacklisted
   * @param jti Unique token ID
   */
  async isBlacklisted(jti: string): Promise<boolean> {
    if (!jti) return false;

    const result = await this.redis.exists(`${this.KEY_PREFIX}${jti}`);
    return result === 1;
  }
}
