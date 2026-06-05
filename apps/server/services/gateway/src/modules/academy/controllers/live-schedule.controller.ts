import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
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
  AcademyLiveScheduleCreateDTO,
  AcademyLiveScheduleQueryDTO,
  AcademyLiveScheduleUpdateDTO,
  academyLiveScheduleConflictPreviewDTOSchema,
  academyLiveScheduleCreateDTOSchema,
  academyLiveScheduleQueryDTOSchema,
  academyLiveScheduleUpdateDTOSchema,
} from '@workspace/schemas';

@Controller('api/academy/live-schedules')
@UseGuards(GatewayAuthGuard, PermissionsGuard)
export class LiveScheduleController {
  constructor(@Inject('NATS_SERVICE') private readonly nats: ClientProxy) {}

  @Get()
  @Permissions('lms.delivery.read')
  async findAll(
    @Query(new ZodValidationPipe(academyLiveScheduleQueryDTOSchema))
    query: AcademyLiveScheduleQueryDTO,
  ) {
    const items = await firstValueFrom(
      this.nats.send({ cmd: 'academy.liveSchedule.findAll' }, query),
    );
    return successResponse({ items });
  }

  @Get(':id')
  @Permissions('lms.delivery.read')
  async findById(@Param('id', new ParseUUIDPipe()) id: string) {
    const item = await firstValueFrom(
      this.nats.send({ cmd: 'academy.liveSchedule.findById' }, { id }),
    );
    return successResponse({ item });
  }

  @Post()
  @Permissions('lms.delivery.create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Req() req: ReqWithRequester,
    @Body(new ZodValidationPipe(academyLiveScheduleCreateDTOSchema))
    dto: AcademyLiveScheduleCreateDTO,
  ) {
    const item = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.liveSchedule.create' },
        {
          ...dto,
          requesterId: req.requester.sub,
        },
      ),
    );
    return successResponse({ item });
  }

  @Put(':id')
  @Permissions('lms.delivery.update')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: ReqWithRequester,
    @Body(new ZodValidationPipe(academyLiveScheduleUpdateDTOSchema))
    dto: AcademyLiveScheduleUpdateDTO,
  ) {
    const item = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.liveSchedule.update' },
        { id, input: dto, requesterId: req.requester.sub },
      ),
    );
    return successResponse({ item });
  }

  @Delete(':id')
  @Permissions('lms.delivery.delete')
  async delete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: ReqWithRequester,
  ) {
    const result = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.liveSchedule.delete' },
        {
          id,
          requesterId: req.requester.sub,
        },
      ),
    );
    return successResponse(result);
  }

  @Post('preview-conflict')
  @Permissions('lms.delivery.manage')
  async previewConflict(
    @Body(new ZodValidationPipe(academyLiveScheduleConflictPreviewDTOSchema))
    dto: AcademyLiveScheduleConflictPreviewDTO,
  ) {
    const result = await firstValueFrom(
      this.nats.send({ cmd: 'academy.liveSchedule.previewConflict' }, dto),
    );
    return successResponse(result);
  }
}
