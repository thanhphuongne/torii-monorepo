import {
  Body,
  Controller,
  Delete,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
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
  successResponse,
  ReqWithRequester,
} from '@server/shared';

@Controller('api/academy/course-profiles/:courseProfileId/modules')
@UseGuards(GatewayAuthGuard, PermissionsGuard)
export class ModuleController {
  constructor(@Inject('NATS_SERVICE') private readonly nats: ClientProxy) { }

  @Post()
  @Permissions('lms.catalog.create')
  async create(
    @Param('courseProfileId', new ParseUUIDPipe()) courseProfileId: string,
    @Body() dto: { title: string; orderIndex?: number },
    @Req() req: ReqWithRequester,
  ) {
    const item = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.module.create' },
        { ...dto, courseProfileId, requesterId: req.requester?.sub },
      ),
    );
    return successResponse({ item });
  }

  @Put(':id')
  @Permissions('lms.catalog.update')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: { title?: string; orderIndex?: number },
    @Req() req: ReqWithRequester,
  ) {
    const item = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.module.update' },
        { id, input: dto, requesterId: req.requester?.sub },
      ),
    );
    return successResponse({ item });
  }

  @Delete(':id')
  @Permissions('lms.catalog.delete')
  async delete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: ReqWithRequester,
  ) {
    const result = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.module.delete' },
        { id, requesterId: req.requester?.sub },
      ),
    );
    return successResponse(result);
  }

  @Post('reorder')
  @Permissions('lms.catalog.update')
  async reorder(
    @Param('courseProfileId', new ParseUUIDPipe()) courseProfileId: string,
    @Body() dto: { moduleIds: string[] },
    @Req() req: ReqWithRequester,
  ) {
    const result = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.module.reorder' },
        { ...dto, courseProfileId, requesterId: req.requester?.sub },
      ),
    );
    return successResponse(result);
  }
}
