import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  GatewayAuthGuard,
  Permissions,
  PermissionsGuard,
  ReqWithRequester,
  ZodValidationPipe,
  successResponse,
} from '@server/shared';
import {
  AcademyLiveScheduleConflictPreviewDTO,
  AcademyLiveScheduleRequestApproveDTO,
  AcademyLiveScheduleRequestCreateDTO,
  AcademyLiveScheduleRequestQueryDTO,
  AcademyLiveScheduleRequestRejectDTO,
  academyLiveScheduleConflictPreviewDTOSchema,
  academyLiveScheduleRequestApproveDTOSchema,
  academyLiveScheduleRequestCreateDTOSchema,
  academyLiveScheduleRequestQueryDTOSchema,
  academyLiveScheduleRequestRejectDTOSchema,
} from '@workspace/schemas';

@Controller('api/academy/live-sessions/requests')
@UseGuards(GatewayAuthGuard, PermissionsGuard)
export class LiveSessionRequestController {
  constructor(@Inject('NATS_SERVICE') private readonly nats: ClientProxy) {}

  @Get()
  @Permissions('lms.delivery.request.read')
  async findAll(
    @Query(new ZodValidationPipe(academyLiveScheduleRequestQueryDTOSchema))
    query: AcademyLiveScheduleRequestQueryDTO,
  ) {
    const items = await firstValueFrom(
      this.nats.send({ cmd: 'academy.liveSessionRequest.findAll' }, query),
    );
    return successResponse({ items });
  }

  @Post()
  @Permissions('lms.delivery.request.create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Req() req: ReqWithRequester,
    @Body(new ZodValidationPipe(academyLiveScheduleRequestCreateDTOSchema))
    dto: AcademyLiveScheduleRequestCreateDTO,
  ) {
    const item = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.liveSessionRequest.create' },
        {
          ...dto,
          requesterId: req.requester.sub,
        },
      ),
    );
    return successResponse({ item });
  }

  @Post(':id/cancel')
  @Permissions('lms.delivery.request.cancel')
  async cancel(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: ReqWithRequester,
  ) {
    const item = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.liveSessionRequest.cancel' },
        {
          id,
          requesterId: req.requester.sub,
        },
      ),
    );
    return successResponse({ item });
  }

  @Post(':id/approve')
  @Permissions('lms.delivery.approve')
  async approve(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: ReqWithRequester,
    @Body(new ZodValidationPipe(academyLiveScheduleRequestApproveDTOSchema))
    dto: AcademyLiveScheduleRequestApproveDTO,
  ) {
    const item = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.liveSessionRequest.approve' },
        {
          id,
          input: dto,
          reviewerId: req.requester.sub,
        },
      ),
    );
    return successResponse({ item });
  }

  @Post(':id/reject')
  @Permissions('lms.delivery.approve')
  async reject(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: ReqWithRequester,
    @Body(new ZodValidationPipe(academyLiveScheduleRequestRejectDTOSchema))
    dto: AcademyLiveScheduleRequestRejectDTO,
  ) {
    const item = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.liveSessionRequest.reject' },
        {
          id,
          input: dto,
          reviewerId: req.requester.sub,
        },
      ),
    );
    return successResponse({ item });
  }

  @Post('/preview-conflict')
  @Permissions('lms.delivery.request.create')
  async previewConflict(
    @Body(new ZodValidationPipe(academyLiveScheduleConflictPreviewDTOSchema))
    dto: AcademyLiveScheduleConflictPreviewDTO,
  ) {
    const result = await firstValueFrom(
      this.nats.send({ cmd: 'academy.liveSession.previewConflict' }, dto),
    );
    return successResponse(result);
  }
}
