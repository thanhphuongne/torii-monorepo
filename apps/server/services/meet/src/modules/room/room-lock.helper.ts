/**
 * Room Lock Helper
 *
 * Provides helper functions for acquiring room creation locks with retry and backoff
 */

import { Logger } from '@nestjs/common';
import { RedisLockService } from '@server/meet/infrastructure/redis/redis-lock.service';

// Constants
const DEFAULT_ROOM_CREATION_MAX_WAIT_TIME = 15 * 1000; // 15 seconds in ms
const DEFAULT_ROOM_CREATION_LOCK_TTL = 60; // 60 seconds
const DEFAULT_WAIT_FOR_ROOM_CREATION_MAX_WAIT_TIME = 15 * 1000; // 15 seconds in ms

// Exponential backoff settings
const BACKOFF_INITIAL_INTERVAL = 100; // 100ms
const BACKOFF_MAX_INTERVAL = 2000; // 2 seconds
const BACKOFF_MULTIPLIER = 2.0;
const BACKOFF_JITTER = 0.2;

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Acquire room creation lock with retry and exponential backoff
 *
 * @param redisLock - RedisLockService instance
 * @param roomId - Room ID to lock
 * @param logger - Logger instance
 * @returns Lock value on success
 * @throws Error on timeout or Redis error
 */
export async function acquireRoomCreationLockWithRetry(
  redisLock: RedisLockService,
  roomId: string,
  logger: Logger,
): Promise<string> {
  const maxWaitTime = DEFAULT_ROOM_CREATION_MAX_WAIT_TIME;
  const lockTTL = DEFAULT_ROOM_CREATION_LOCK_TTL;
  let currentInterval = BACKOFF_INITIAL_INTERVAL;

  const loopStartTime = Date.now();
  logger.log(`Attempting to acquire room creation lock: ${roomId}`);

  while (true) {
    // Try to acquire lock
    try {
      const { acquired, lockValue } = await redisLock.lockRoomCreation(
        roomId,
        lockTTL,
      );

      if (acquired) {
        const duration = Date.now() - loopStartTime;
        logger.log(
          `Successfully acquired room creation lock: ${roomId}, lockValue: ${lockValue}, duration: ${duration}ms`,
        );
        return lockValue;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(
        `Redis error while attempting to acquire room creation lock: ${roomId}, error: ${errorMsg}`,
      );
      throw new Error(
        `Lỗi Redis khi khóa tạo phòng '${roomId}': ${errorMsg}`,
      );
    }

    // Check if timeout reached
    const elapsed = Date.now() - loopStartTime;
    if (elapsed >= maxWaitTime) {
      logger.warn(
        `Timeout while waiting for room creation lock: ${roomId}, maxWaitTime: ${maxWaitTime}ms`,
      );
      throw new Error(
        `Hết thời gian chờ khóa phòng ${roomId}, thao tác đang bị khóa`,
      );
    }

    // Calculate next interval with jitter
    const jitter = Math.random() * BACKOFF_JITTER * currentInterval;
    const waitDuration = currentInterval + jitter;

    logger.debug(
      `Room creation lock not acquired for ${roomId}. Waiting ${waitDuration}ms. Elapsed: ${elapsed}ms`,
    );

    // Wait before retry
    await sleep(waitDuration);

    // Update interval for next iteration (exponential backoff)
    currentInterval = currentInterval * BACKOFF_MULTIPLIER;
    if (currentInterval > BACKOFF_MAX_INTERVAL) {
      currentInterval = BACKOFF_MAX_INTERVAL;
    }
  }
}

/**
 * Wait until room creation lock is released
 *
 * @param redisLock - RedisLockService instance
 * @param roomId - Room ID to check
 * @param logger - Logger instance
 * @throws Error on timeout or Redis error
 */
export async function waitUntilRoomCreationCompletes(
  redisLock: RedisLockService,
  roomId: string,
  logger: Logger,
): Promise<void> {
  const maxWaitTime = DEFAULT_WAIT_FOR_ROOM_CREATION_MAX_WAIT_TIME;
  let currentInterval = BACKOFF_INITIAL_INTERVAL;
  const loopStartTime = Date.now();

  logger.log(`Waiting for room creation to complete: ${roomId}`);

  while (true) {
    // Check if lock still exists
    try {
      const isLocked = await redisLock.isRoomCreationLock(roomId);

      if (!isLocked) {
        logger.log(`Room creation completed for: ${roomId}`);
        return; // Lock released, creation complete
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(
        `Redis error while checking room creation lock: ${roomId}, error: ${errorMsg}`,
      );
      throw new Error(
        `Lỗi Redis khi kiểm tra khóa tạo phòng '${roomId}': ${errorMsg}`,
      );
    }

    // Check if timeout reached
    const elapsed = Date.now() - loopStartTime;
    if (elapsed >= maxWaitTime) {
      logger.warn(
        `Timeout while waiting for room creation to complete: ${roomId}, maxWaitTime: ${maxWaitTime}ms`,
      );
      throw new Error(
        `Hết thời gian chờ hoàn tất tạo phòng '${roomId}'`,
      );
    }

    // Calculate next interval with jitter
    const jitter = Math.random() * BACKOFF_JITTER * currentInterval;
    const waitDuration = currentInterval + jitter;

    logger.debug(
      `Room creation is still in progress for ${roomId}. Waiting ${waitDuration}ms. Elapsed: ${elapsed}ms`,
    );

    // Wait before retry
    await sleep(waitDuration);

    // Update interval for next iteration (exponential backoff)
    currentInterval = currentInterval * BACKOFF_MULTIPLIER;
    if (currentInterval > BACKOFF_MAX_INTERVAL) {
      currentInterval = BACKOFF_MAX_INTERVAL;
    }
  }
}
