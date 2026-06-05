import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { create, toJsonString } from '@bufbuild/protobuf';
import {
  ActivatePollsReq,
  CreatePollReq,
  SubmitPollResponseReq,
  ClosePollReq,
  PollInfo,
  PollInfoSchema,
  PollResponsesResult,
  PollResponsesResultOptions,
  PollResponsesResultOptionsSchema,
  PollResponsesResultSchema,
  PollsStats,
  PollsStatsSchema,
  NatsMsgServerToClientEvents,
  AnalyticsEventType,
  AnalyticsEvents,
  AnalyticsDataMsg,
} from '@workspace/protocol';
import { RedisPollService } from '@server/meet/infrastructure/redis/redis-poll.service';
import { NatsRoomService } from '@server/meet/infrastructure/nats/nats-room.service';
import { NatsRoomEventsService } from '@server/meet/infrastructure/nats/nats-room-events.service';
import { NatsSystemEventsService } from '@server/meet/infrastructure/nats/nats-system-events.service';
import { AnalyticsService } from '@server/meet/modules/analytics/analytics.service';

@Injectable()
export class PollsService {
  private readonly logger = new Logger(PollsService.name);

  constructor(
    private readonly redisPollService: RedisPollService,
    private readonly natsRoomService: NatsRoomService,
    private readonly natsRoomEventsService: NatsRoomEventsService,
    private readonly natsSystemEventsService: NatsSystemEventsService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  async manageActivation(req: ActivatePollsReq): Promise<void> {
    const roomMeta = await this.natsRoomService.getRoomMetadataStruct(
      req.roomId,
    );
    if (!roomMeta) {
      throw new Error('Không tìm thấy metadata phòng');
    }

    if (!roomMeta.roomFeatures?.pollsFeatures) {
      throw new Error('Phòng chưa bật tính năng bình chọn');
    }

    roomMeta.roomFeatures.pollsFeatures.isActive = req.isActive;
    await this.natsRoomEventsService.updateAndBroadcastRoomMetadata(
      req.roomId,
      roomMeta,
    );
  }

  async createPoll(r: CreatePollReq): Promise<string> {
    const log = this.logger;
    log.log(`Request to create poll for room: ${r.roomId}, user: ${r.userId}`);

    const pollId = uuidv4();
    log.log(`Generated pollId: ${pollId}`);

    const pollReq = { ...r, pollId };
    await this.createRoomPollHash(pollReq);

    try {
      await this.natsSystemEventsService.broadcastSystemEventToEveryoneExceptUserId(
        NatsMsgServerToClientEvents.POLL_CREATED,
        r.roomId,
        pollId,
        r.userId,
      );
    } catch (err) {
      log.error(`error sending POLL_CREATED event: ${err.message}`);
    }

    // Analytics tracking
    const toRecord = {
      poll_id: pollId,
      question: r.question,
      options: r.options,
    };
    const val = JSON.stringify(toRecord);
    try {
      await this.analyticsService.handleEvent({
        eventType: AnalyticsEventType.ROOM,
        eventName: AnalyticsEvents.ANALYTICS_EVENT_ROOM_POLL_ADDED,
        roomId: r.roomId,
        hsetValue: val,
      } as AnalyticsDataMsg);
    } catch (err) {
      log.error(`failed to send analytics: ${err.message}`);
    }

    log.log('successfully created poll');
    return pollId;
  }

  private async createRoomPollHash(r: CreatePollReq): Promise<void> {
    const p = create(PollInfoSchema, {
      id: r.pollId,
      roomId: r.roomId,
      question: r.question,
      options: r.options,
      isRunning: true,
      created: Math.floor(Date.now() / 1000).toString(), // int64 -> string for protocol
      createdBy: r.userId,
      closedBy: '',
    });

    const pollVal: Record<string, string> = {};
    pollVal[r.pollId] = toJsonString(PollInfoSchema, p);

    await this.redisPollService.createRoomPoll(r.roomId, pollVal);
  }

  async userSubmitResponse(r: SubmitPollResponseReq): Promise<void> {
    const log = this.logger;
    log.log(
      `request to submit poll response for room: ${r.roomId}, user: ${r.userId}, poll: ${r.pollId}`,
    );

    await this.redisPollService.addPollResponse(r);

    // Analytics tracking
    const toRecord = {
      poll_id: r.pollId,
      selected_option: r.selectedOption,
    };
    const val = JSON.stringify(toRecord);
    try {
      await this.analyticsService.handleEvent({
        eventType: AnalyticsEventType.USER,
        eventName: AnalyticsEvents.ANALYTICS_EVENT_USER_VOTED_POLL,
        roomId: r.roomId,
        userId: r.userId,
        hsetValue: val,
      } as AnalyticsDataMsg);
    } catch (err) {
      log.error(`failed to send analytics: ${err.message}`);
    }

    log.log('successfully submitted poll response');
  }

  async closePoll(r: ClosePollReq): Promise<void> {
    const log = this.logger;
    log.log(
      `request to close poll for room: ${r.roomId}, user: ${r.userId}, poll: ${r.pollId}`,
    );

    await this.redisPollService.closePoll(r);

    try {
      await this.natsSystemEventsService.broadcastSystemEventToRoom(
        NatsMsgServerToClientEvents.POLL_CLOSED,
        r.roomId,
        r.pollId,
        undefined,
      );
    } catch (err) {
      log.error(`error sending POLL_CLOSED event: ${err.message}`);
    }

    // Analytics tracking
    try {
      await this.analyticsService.handleEvent({
        eventType: AnalyticsEventType.ROOM,
        eventName: AnalyticsEvents.ANALYTICS_EVENT_ROOM_POLL_ENDED,
        roomId: r.roomId,
        hsetValue: r.pollId,
      } as AnalyticsDataMsg);
    } catch (err) {
      log.error(`failed to send analytics: ${err.message}`);
    }

    log.log('successfully closed poll');
  }

  async cleanUpPolls(roomId: string): Promise<void> {
    const log = this.logger;
    log.log(`cleaning up polls for room: ${roomId}`);

    const pollIds = await this.redisPollService.getPollIdsByRoomId(roomId);

    if (!pollIds || pollIds.length === 0) {
      log.log('no polls to clean up');
      return;
    }

    await this.redisPollService.cleanUpPolls(roomId, pollIds);

    log.log('successfully cleaned up polls');
  }

  async listPolls(roomId: string): Promise<PollInfo[]> {
    const polls: PollInfo[] = [];

    const result = await this.redisPollService.getPollsListByRoomId(roomId);

    if (!result || result.length === 0) {
      return polls;
    }

    for (const pi of result) {
      try {
        const info: PollInfo = JSON.parse(pi);
        polls.push(info);
      } catch (err) {
        continue;
      }
    }

    return polls;
  }

  async userSelectedOption(
    roomId: string,
    pollId: string,
    userId: string,
  ): Promise<string> {
    const allRespondents = await this.redisPollService.getPollAllRespondents(
      roomId,
      pollId,
    );

    if (!allRespondents) {
      return '0';
    }

    for (const respondent of allRespondents) {
      const parts = respondent.split(':');
      if (parts[0] === userId) {
        return parts[1]; // Returns selected option as string
      }
    }

    return '0';
  }

  async getPollResponsesDetails(
    roomId: string,
    pollId: string,
  ): Promise<Record<string, string>> {
    let result = await this.redisPollService.getPollCountersByPollId(
      roomId,
      pollId,
    );

    if (!result) {
      result = {};
    }

    try {
      const allRespondents = await this.redisPollService.getPollAllRespondents(
        roomId,
        pollId,
      );
      const jsonRespondents = JSON.stringify(allRespondents || []);
      result['all_respondents'] = jsonRespondents;
    } catch (err) {
      this.logger.warn(`could not fetch all_respondents list: ${err.message}`);
    }

    if (!result['total_resp']) {
      result['total_resp'] = '0';
    }

    return result;
  }

  async getResponsesResult(
    roomId: string,
    pollId: string,
  ): Promise<PollResponsesResult> {
    const log = this.logger;
    log.log(
      `request to get response result for room: ${roomId}, poll: ${pollId}`,
    );

    const pStr = await this.redisPollService.getPollInfoByPollId(
      roomId,
      pollId,
    );
    if (!pStr) {
      throw new Error('Không tìm thấy bình chọn');
    }
    const p: PollInfo = JSON.parse(pStr);

    if (p.isRunning) {
      throw new Error('Bình chọn vẫn đang mở');
    }

    const counters = await this.redisPollService.getPollCountersByPollId(
      roomId,
      pollId,
    );
    if (!counters) {
      throw new Error('Không tìm thấy số liệu bình chọn');
    }
    const totalResp = counters['total_resp'] || '0'; // String from Redis

    const opts: PollResponsesResultOptions[] = [];
    for (const o of p.options) {
      const count = counters[`${o.id}_count`] || '0'; // String from Redis
      opts.push(
        create(PollResponsesResultOptionsSchema, {
          id: o.id.toString(), // Convert uint32 to string for protocol
          text: o.text,
          voteCount: count, // Already string
        }),
      );
    }

    return create(PollResponsesResultSchema, {
      question: p.question,
      totalResponses: totalResp, // String
      options: opts,
    });
  }

  async getPollsStats(roomId: string): Promise<PollsStats> {
    const log = this.logger;
    log.log(`request to get polls stats for room: ${roomId}`);

    const result = await this.redisPollService.getPollsListByRoomId(roomId);

    if (!result || result.length === 0) {
      return create(PollsStatsSchema, {
        totalPolls: '0',
        totalRunning: '0',
      });
    }

    let totalRunning = 0;
    for (const pi of result) {
      try {
        const info: PollInfo = JSON.parse(pi);
        if (info.isRunning) {
          totalRunning++;
        }
      } catch (err) {
        continue;
      }
    }

    return create(PollsStatsSchema, {
      totalPolls: result.length.toString(), // Convert to string for protocol
      totalRunning: totalRunning.toString(), // Convert to string for protocol
    });
  }

  async getPollTotalResponses(roomId: string, pollId: string): Promise<string> {
    return await this.redisPollService.getPollTotalResponses(roomId, pollId);
  }
}
