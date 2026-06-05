import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Put,
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
  AcademyLiveClassAssignmentUpdateDTO,
  academyLiveClassAssignmentUpdateDTOSchema,
} from '@workspace/schemas';

@Controller('api/academy/live-class-assignments')
@UseGuards(GatewayAuthGuard, PermissionsGuard)
export class LiveClassAssignmentController {
  constructor(@Inject('NATS_SERVICE') private readonly nats: ClientProxy) {}

  @Get(':id')
  @Permissions('lms.assessment.read')
  async findById(@Param('id', new ParseUUIDPipe()) id: string) {
    const item = await firstValueFrom(
      this.nats.send({ cmd: 'academy.liveClass.getAssignmentById' }, { id }),
    );
    return successResponse({ item });
  }

  @Put(':id')
  @Permissions('lms.assessment.create')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(academyLiveClassAssignmentUpdateDTOSchema))
    dto: AcademyLiveClassAssignmentUpdateDTO,
  ) {
    const item = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.liveClass.updateAssignment' },
        {
          id,
          input: dto,
        },
      ),
    );
    return successResponse({ item });
  }

  @Delete(':id')
  @Permissions('lms.assessment.delete')
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: ReqWithRequester,
  ) {
    const result = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.liveClass.removeAssignment' },
        {
          id,
          requesterId: req.requester?.sub,
        },
      ),
    );
    return successResponse(result);
  }
}
