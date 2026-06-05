import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { LiveScheduleService } from './live-schedule.service';
import {
  LiveScheduleConflictPreviewDto,
  LiveScheduleRequestApproveDto,
  LiveScheduleRequestCreateDto,
  LiveScheduleRequestQueryDto,
  LiveScheduleRequestRejectDto,
} from './dto/live-schedule-request.dto';
import {
  LiveScheduleCreateDto as LiveScheduleBaseCreateDto,
  LiveScheduleQueryDto as LiveScheduleBaseQueryDto,
  LiveScheduleUpdateDto as LiveScheduleBaseUpdateDto,
} from './dto/live-schedule.dto';
import { LiveSessionJoinDto } from './dto/live-session.dto';

@Controller()
export class LiveScheduleHandler {
  constructor(private readonly schedules: LiveScheduleService) { }

  @MessagePattern({ cmd: 'academy.liveSchedule.findAll' })
  findAll(@Payload() query: LiveScheduleBaseQueryDto) {
    return this.schedules.findAll(query);
  }

  @MessagePattern({ cmd: 'academy.liveSchedule.findById' })
  findById(@Payload() data: { id: string }) {
    return this.schedules.findById(data.id);
  }

  @MessagePattern({ cmd: 'academy.liveSchedule.create' })
  create(
    @Payload() input: LiveScheduleBaseCreateDto & { requesterId?: string },
  ) {
    const { requesterId, ...dto } = input;
    return this.schedules.create(dto, requesterId);
  }

  @MessagePattern({ cmd: 'academy.liveSchedule.update' })
  update(
    @Payload()
    data: {
      id: string;
      input: LiveScheduleBaseUpdateDto;
      requesterId?: string;
    },
  ) {
    return this.schedules.update(data.id, data.input, data.requesterId);
  }

  @MessagePattern({ cmd: 'academy.liveSchedule.delete' })
  delete(@Payload() data: { id: string; requesterId?: string }) {
    return this.schedules.delete(data.id, data.requesterId);
  }

  @MessagePattern({ cmd: 'academy.liveSession.joinBySessionId' })
  joinBySessionId(
    @Payload() data: { sessionId: string; userId: string; isAdmin?: boolean },
  ) {
    return this.schedules.joinBySessionId(
      data.sessionId,
      data.userId,
      data.isAdmin,
    );
  }

  @MessagePattern({ cmd: 'academy.liveSession.findAllByClassAndRange' })
  async findAllSessionsByClassAndRange(
    @Payload()
    data: {
      liveClassId: string;
      from: string;
      to: string;
      requesterId?: string;
    },
  ) {
    const fromDate = new Date(data.from);
    const toDate = new Date(data.to);
    await this.schedules.generateInstancesForClassRange(
      data.liveClassId,
      data.requesterId ?? 'SYSTEM',
    );
    return this.schedules.listSessionsForClassRange(
      data.liveClassId,
      fromDate,
      toDate,
    );
  }

  @MessagePattern({ cmd: 'academy.liveSession.getMyScheduleWithAttendance' })
  getMyScheduleWithAttendance(
    @Payload() data: { userId: string; from: string; to: string },
  ) {
    return this.schedules.getLearnerScheduleWithAttendance(
      data.userId,
      new Date(data.from),
      new Date(data.to),
    );
  }

  @MessagePattern({ cmd: 'academy.liveSchedule.previewConflict' })
  previewConflict(@Payload() input: LiveScheduleConflictPreviewDto) {
    return this.schedules.previewConflict(input);
  }

  @MessagePattern({ cmd: 'academy.liveSessionRequest.findAll' })
  findAllRequests(@Payload() query: LiveScheduleRequestQueryDto) {
    const fs = require('fs');
    fs.appendFileSync('/tmp/debug-requests.log', `[NATS] Received academy.liveSessionRequest.findAll with query: ${JSON.stringify(query)}\n`);
    return this.schedules.findAllRequests(query);
  }

  @MessagePattern({ cmd: 'academy.liveSessionRequest.create' })
  createRequest(
    @Payload() data: LiveScheduleRequestCreateDto & { requesterId: string },
  ) {
    const { requesterId, ...input } = data;
    return this.schedules.createRequest(input, requesterId);
  }

  @MessagePattern({ cmd: 'academy.liveSessionRequest.cancel' })
  cancelRequest(@Payload() data: { id: string; requesterId: string }) {
    return this.schedules.cancelRequest(data.id, data.requesterId);
  }

  @MessagePattern({ cmd: 'academy.liveSessionRequest.approve' })
  approveRequest(
    @Payload()
    data: {
      id: string;
      input: LiveScheduleRequestApproveDto;
      reviewerId: string;
    },
  ) {
    return this.schedules.approveRequest(data.id, data.input, data.reviewerId);
  }

  @MessagePattern({ cmd: 'academy.liveSessionRequest.reject' })
  rejectRequest(
    @Payload()
    data: {
      id: string;
      input: LiveScheduleRequestRejectDto;
      reviewerId: string;
    },
  ) {
    return this.schedules.rejectRequest(data.id, data.input, data.reviewerId);
  }

  @MessagePattern({ cmd: 'academy.liveSession.previewConflict' })
  previewSessionConflict(@Payload() input: LiveScheduleConflictPreviewDto) {
    return this.schedules.previewConflict(input);
  }
}
