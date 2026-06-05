import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import type { ClientProxy } from '@nestjs/microservices/client';
import { firstValueFrom } from 'rxjs';
import {
  Public,
  GatewayAuthGuard,
  Permissions,
  PermissionsGuard,
  ZodValidationPipe,
  successResponse,
  successPaginatedResponse,
  ReqWithRequester,
} from '@server/shared';
import {
  AcademyVodPackageCreateDTO,
  AcademyVodPackageQueryDTO,
  AcademyVodPackageUpdateDTO,
  academyVodPackageCreateDTOSchema,
  academyVodPackageQueryDTOSchema,
  academyVodPackageUpdateDTOSchema,
} from '@workspace/schemas';

@Controller('api/academy/vod-packages')
@UseGuards(GatewayAuthGuard, PermissionsGuard)
export class VodPackageController {
  constructor(@Inject('NATS_SERVICE') private readonly nats: ClientProxy) { }

  @Public()
  @Get('public')
  async findAllPublic(
    @Query(new ZodValidationPipe(academyVodPackageQueryDTOSchema))
    query: AcademyVodPackageQueryDTO,
  ) {
    const items = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.vod.findAll' },
        { ...query, status: 'PUBLISHED' },
      ),
    );
    return successResponse(items);
  }

  @Public()
  @Get('public/:id')
  async findByIdPublic(@Param('id', new ParseUUIDPipe()) id: string) {
    const item = await firstValueFrom(
      this.nats.send({ cmd: 'academy.vod.findById' }, { id }),
    );
    return successResponse({ item });
  }

  @Get()
  @Permissions('lms.commerce.read')
  async findAll(
    @Query(new ZodValidationPipe(academyVodPackageQueryDTOSchema))
    query: AcademyVodPackageQueryDTO,
  ) {
    const items = await firstValueFrom(
      this.nats.send({ cmd: 'academy.vod.findAll' }, query),
    );
    return successResponse(items);
  }

  @Get('my-assigned')
  @Permissions('lms.assessment.grade')
  async findMyAssigned(
    @Query(new ZodValidationPipe(academyVodPackageQueryDTOSchema))
    query: AcademyVodPackageQueryDTO,
    @Req() req: ReqWithRequester,
  ) {
    const items = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.vod.findAll' },
        { ...query, instructorId: req.requester?.sub },
      ),
    );
    return successResponse(items);
  }

  @Get('my-assigned/:id/discussion')
  @Permissions('lms.assessment.grade')
  async findMyAssignedDiscussionContext(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: ReqWithRequester,
  ) {
    const item = (await firstValueFrom(
      this.nats.send({ cmd: 'academy.vod.findById' }, { id }),
    )) as any;

    if (item?.instructorId !== req.requester?.sub) {
      throw new ForbiddenException(
        'Bạn chỉ có thể truy cập gói VOD do chính bạn phụ trách.',
      );
    }

    return successResponse(item);
  }

  @Get(':id')
  @Permissions('lms.commerce.read', 'lms.catalog.read')
  async findById(@Param('id', new ParseUUIDPipe()) id: string) {
    const item = await firstValueFrom(
      this.nats.send({ cmd: 'academy.vod.findById' }, { id }),
    );
    return successResponse(item);
  }

  @Post()
  @Permissions('lms.commerce.create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(academyVodPackageCreateDTOSchema))
    dto: AcademyVodPackageCreateDTO,
    @Req() req: ReqWithRequester,
  ) {
    const item = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.vod.create' },
        { ...dto, requesterId: req.requester?.sub },
      ),
    );
    return successResponse(item);
  }

  @Post(':id/submit-for-approval')
  @Permissions('lms.commerce.submit')
  async submitForApproval(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: ReqWithRequester,
  ) {
    const item = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.vod.update' },
        {
          id,
          input: { status: 'PENDING_APPROVAL' },
          requesterId: req.requester?.sub,
        },
      ),
    );
    return successResponse(item);
  }

  @Put(':id')
  @Permissions('lms.commerce.update')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(academyVodPackageUpdateDTOSchema))
    dto: AcademyVodPackageUpdateDTO,
    @Req() req: ReqWithRequester,
  ) {
    const item = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.vod.update' },
        { id, input: dto, requesterId: req.requester?.sub },
      ),
    );
    return successResponse(item);
  }

  @Delete(':id')
  @Permissions('lms.commerce.delete')
  async delete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: ReqWithRequester,
  ) {
    const result = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.vod.delete' },
        { id, requesterId: req.requester?.sub },
      ),
    );
    return successResponse(result);
  }

  @Post(':id/lessons/:lessonId/complete')
  async trackLessonProgress(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('lessonId', new ParseUUIDPipe()) lessonId: string,
    @Req() req: ReqWithRequester,
  ) {
    const result = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.enrollment.trackLessonProgress' },
        { targetId: id, lessonId, userId: req.requester.sub },
      ),
    );
    return successResponse(result);
  }

  @Get(':id/completed-lessons')
  async getCompletedLessons(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: ReqWithRequester,
  ) {
    const result = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.enrollment.getCompletedLessons' },
        { targetId: id, userId: req.requester.sub },
      ),
    );
    return successResponse(result);
  }

  @Get(':id/orders')
  @Permissions('lms.commerce.read')
  async findOrders(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: any,
  ) {
    const result = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.order.admin.findByVodPackage' },
        { vodPackageId: id, query },
      ),
    );
    return successPaginatedResponse(result as any);
  }

  @Get(':id/stats')
  @Permissions('lms.commerce.read')
  async getStats(@Param('id', new ParseUUIDPipe()) id: string) {
    const result = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.order.admin.getStatsByVodPackage' },
        { vodPackageId: id },
      ),
    );
    return successResponse(result);
  }

  @Post(':id/approve')
  @Permissions('lms.commerce.approve')
  async approve(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: ReqWithRequester,
  ) {
    const item = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.vod.update' },
        {
          id,
          input: { status: 'PUBLISHED' },
          requesterId: req.requester?.sub,
        },
      ),
    );
    return successResponse(item);
  }

  @Post(':id/reject')
  @Permissions('lms.commerce.approve')
  async reject(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: { reason: string },
    @Req() req: ReqWithRequester,
  ) {
    const item = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.vod.update' },
        {
          id,
          input: { status: 'DRAFT', rejectionReason: body.reason },
          requesterId: req.requester?.sub,
        },
      ),
    );
    return successResponse(item);
  }
}
