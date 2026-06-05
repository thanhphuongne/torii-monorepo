import { Injectable, Logger, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import {
  SubmitPollResponseReq,
  ClosePollReq,
  PollInfo,
} from '@workspace/protocol';
import { REDIS_CLIENT } from '@server/shared';

const REDIS_PREFIX = 'wajlc:';
const POLLS_KEY = `${REDIS_PREFIX}polls:`;
const POLL_RESPONDENTS_SUB_KEY = ':respondents:';
const POLL_VOTED_USERS_SUB_KEY = ':voted_users';
const POLL_ALL_RES_SUB_KEY = ':all_respondents';
export const POLL_TOTAL_RESP_FIELD = 'total_resp';
export const POLL_COUNT_SUFFIX = '_count';

@Injectable()
export class RedisPollService {
  private readonly logger = new Logger(RedisPollService.name);
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async createRoomPoll(
    roomId: string,
    val: Record<string, string>,
  ): Promise<void> {
    const key = POLLS_KEY + roomId;
    const pipeline = this.redis.pipeline();

    pipeline.hset(key, val);
    pipeline.expire(key, 24 * 60 * 60);

    await pipeline.exec();
  }

  async addPollResponse(r: SubmitPollResponseReq): Promise<void> {
    const respondentsKey = `${POLLS_KEY}${r.roomId}${POLL_RESPONDENTS_SUB_KEY}${r.pollId}`;
    const votedUsersKey = `${respondentsKey}${POLL_VOTED_USERS_SUB_KEY}`;
    const allRespondentsKey = `${respondentsKey}${POLL_ALL_RES_SUB_KEY}`;

    await this.redis.watch(votedUsersKey);

    try {
      const voted = await this.redis.sismember(votedUsersKey, r.userId);

      if (voted === 1) {
        await this.redis.unwatch();
        throw new Error('Người dùng đã bỏ phiếu');
      }

      const voteData = `${r.userId}:${r.selectedOption}:${r.name}`;

      const multi = this.redis.multi();

      multi.sadd(votedUsersKey, r.userId);
      multi.expire(votedUsersKey, 24 * 60 * 60);

      multi.rpush(allRespondentsKey, voteData);
      multi.expire(allRespondentsKey, 24 * 60 * 60);

      multi.hincrby(respondentsKey, POLL_TOTAL_RESP_FIELD, 1);
      multi.hincrby(
        respondentsKey,
        `${r.selectedOption}${POLL_COUNT_SUFFIX}`,
        1,
      );
      multi.expire(respondentsKey, 24 * 60 * 60);

      await multi.exec();
    } catch (error) {
      await this.redis.unwatch();
      throw error;
    }
  }

  async closePoll(r: ClosePollReq): Promise<void> {
    const key = POLLS_KEY + r.roomId;

    await this.redis.watch(key);

    try {
      const result = await this.redis.hget(key, r.pollId);

      if (!result) {
        await this.redis.unwatch();
        throw new Error('Không tìm thấy');
      }

      const info: PollInfo = JSON.parse(result);
      info.isRunning = false;
      info.closedBy = r.userId;

      const marshal = JSON.stringify(info);

      const multi = this.redis.multi();
      multi.hset(key, r.pollId, marshal);

      await multi.exec();
    } catch (error) {
      await this.redis.unwatch();
      throw error;
    }
  }

  async cleanUpPolls(roomId: string, pollIds: string[]): Promise<void> {
    const pipeline = this.redis.pipeline();

    for (const id of pollIds) {
      const respondentsKey = `${POLLS_KEY}${roomId}${POLL_RESPONDENTS_SUB_KEY}${id}`;
      const votedUsersKey = `${respondentsKey}${POLL_VOTED_USERS_SUB_KEY}`;
      const allRespondentsKey = `${respondentsKey}${POLL_ALL_RES_SUB_KEY}`;

      pipeline.del(respondentsKey);
      pipeline.del(votedUsersKey);
      pipeline.del(allRespondentsKey);
    }

    const roomKey = POLLS_KEY + roomId;
    pipeline.del(roomKey);

    await pipeline.exec();
  }

  async getPollsListByRoomId(roomId: string): Promise<string[] | null> {
    try {
      const result = await this.redis.hvals(POLLS_KEY + roomId);
      return result.length > 0 ? result : null;
    } catch (error) {
      if (error.message?.includes('WRONGTYPE')) {
        return null;
      }
      throw error;
    }
  }

  async getPollIdsByRoomId(roomId: string): Promise<string[] | null> {
    try {
      const result = await this.redis.hkeys(POLLS_KEY + roomId);
      return result.length > 0 ? result : null;
    } catch (error) {
      if (error.message?.includes('WRONGTYPE')) {
        return null;
      }
      throw error;
    }
  }

  async getPollAllRespondents(
    roomId: string,
    pollId: string,
  ): Promise<string[] | null> {
    try {
      const key = `${POLLS_KEY}${roomId}${POLL_RESPONDENTS_SUB_KEY}${pollId}${POLL_ALL_RES_SUB_KEY}`;
      const result = await this.redis.lrange(key, 0, -1);
      return result.length > 0 ? result : null;
    } catch (error) {
      if (error.message?.includes('WRONGTYPE')) {
        return null;
      }
      throw error;
    }
  }

  async getPollCountersByPollId(
    roomId: string,
    pollId: string,
  ): Promise<Record<string, string> | null> {
    try {
      const key = `${POLLS_KEY}${roomId}${POLL_RESPONDENTS_SUB_KEY}${pollId}`;
      const result = await this.redis.hgetall(key);
      return Object.keys(result).length > 0 ? result : null;
    } catch (error) {
      if (error.message?.includes('WRONGTYPE')) {
        return null;
      }
      throw error;
    }
  }

  async getPollTotalResponses(roomId: string, pollId: string): Promise<string> {
    try {
      const key = `${POLLS_KEY}${roomId}${POLL_RESPONDENTS_SUB_KEY}${pollId}`;
      const result = await this.redis.hget(key, POLL_TOTAL_RESP_FIELD);
      return result || '0';
    } catch (error) {
      if (error.message?.includes('WRONGTYPE')) {
        return '0';
      }
      throw error;
    }
  }

  async getPollInfoByPollId(
    roomId: string,
    pollId: string,
  ): Promise<string | null> {
    try {
      const result = await this.redis.hget(POLLS_KEY + roomId, pollId);
      return result || null;
    } catch (error) {
      if (error.message?.includes('WRONGTYPE')) {
        return null;
      }
      throw error;
    }
  }
}
