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
  Patch,
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
  ZodValidationPipe,
  successResponse,
  ReqWithRequester,
} from '@server/shared';
import {
  AcademyClassAttendanceCreateDTO,
  AcademyClassAttendanceQueryDTO,
  AcademyClassAttendanceUpdateDTO,
  academyClassAttendanceCreateDTOSchema,
  academyClassAttendanceQueryDTOSchema,
  academyClassAttendanceUpdateDTOSchema,
} from '@workspace/schemas';

@Controller('api/academy/class-attendances')
@UseGuards(GatewayAuthGuard, PermissionsGuard)
export class ClassAttendanceController {
  constructor(@Inject('NATS_SERVICE') private readonly nats: ClientProxy) { }

  @Get()
  @Permissions('lms.delivery.read')
  async findAll(
    @Query(new ZodValidationPipe(academyClassAttendanceQueryDTOSchema))
    query: AcademyClassAttendanceQueryDTO,
  ) {
    const result = await firstValueFrom(
      this.nats.send({ cmd: 'academy.classAttendance.findAll' }, query),
    );
    return successResponse(result);
  }

  @Get(':id')
  @Permissions('lms.delivery.read')
  async findById(@Param('id', new ParseUUIDPipe()) id: string) {
    const item = await firstValueFrom(
      this.nats.send({ cmd: 'academy.classAttendance.findById' }, { id }),
    );
    return successResponse({ item });
  }

  @Post()
  @Permissions('lms.delivery.attendance.manage')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(academyClassAttendanceCreateDTOSchema))
    dto: AcademyClassAttendanceCreateDTO,
    @Req() req: ReqWithRequester,
  ) {
    const item = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.classAttendance.create' },
        {
          ...dto,
          requesterId: req.requester?.sub,
          requesterRole: req.requester?.role,
        },
      ),
    );
    return successResponse({ item });
  }

  @Patch(':id')
  @Permissions('lms.delivery.attendance.manage')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(academyClassAttendanceUpdateDTOSchema))
    dto: AcademyClassAttendanceUpdateDTO,
    @Req() req: ReqWithRequester,
  ) {
    const item = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.classAttendance.update' },
        {
          id,
          input: dto,
          requesterId: req.requester?.sub,
          requesterRole: req.requester?.role,
        },
      ),
    );
    return successResponse({ item });
  }

  @Delete(':id')
  @Permissions('lms.delivery.attendance.manage')
  async delete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: ReqWithRequester,
  ) {
    const result = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.classAttendance.delete' },
        { id, requesterId: req.requester?.sub },
      ),
    );
    return successResponse(result);
  }
}
