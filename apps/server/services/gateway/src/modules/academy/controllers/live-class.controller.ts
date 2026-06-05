import {
  BadRequestException,
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
  NotFoundException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  GatewayAuthGuard,
  Permissions,
  PermissionsGuard,
  Public,
  ZodValidationPipe,
  successResponse,
  ReqWithRequester,
} from '@server/shared';
import { ForbiddenException } from '@nestjs/common';
import {
  AcademyLiveClassAssignmentCreateDTO,
  AcademyLiveClassCreateDTO,
  AcademyLiveClassDuplicateDTO,
  AcademyLiveClassQueryDTO,
  AcademyLiveClassUpdateDTO,
  academyLiveClassAssignmentCreateDTOSchema,
  academyLiveClassCreateDTOSchema,
  academyLiveClassDuplicateDTOSchema,
  academyLiveClassQueryDTOSchema,
  academyLiveClassUpdateDTOSchema,
} from '@workspace/schemas';

@Controller('api/academy/live-classes')
@UseGuards(GatewayAuthGuard, PermissionsGuard)
export class LiveClassController {
  constructor(@Inject('NATS_SERVICE') private readonly nats: ClientProxy) { }

  private async assertLecturerOwnsClassIfScoped(
    req: ReqWithRequester,
    liveClassId: string,
  ) {
    const requester = req.requester;
    const perms = requester?.permissions || [];
    const isGlobalAcademicManager =
      perms.includes('lms.delivery.approve') ||
      perms.includes('lms.catalog.approve') ||
      perms.includes('lms.commerce.approve') ||
      perms.includes('ops.user.manage');

    if (isGlobalAcademicManager) return;

    const item = await firstValueFrom(
      this.nats.send({ cmd: 'academy.liveClass.findById' }, { id: liveClassId }),
    );
    if (!item?.id) throw new NotFoundException('Live class not found');
    if (item.instructorId !== requester.sub) {
      throw new ForbiddenException(
        'Lecturer can only manage live classes assigned to them',
      );
    }
  }

  @Get()
  @Permissions('lms.delivery.read')
  async findAll(@Query() query: any) {
    const items = await firstValueFrom(
      this.nats.send({ cmd: 'academy.liveClass.findAll' }, query),
    );
    return successResponse(items);
  }

  @Public()
  @Get('public')
  async findAllPublic(
    @Query(new ZodValidationPipe(academyLiveClassQueryDTOSchema))
    query: AcademyLiveClassQueryDTO,
  ) {
    const q = query as any;
    if (q.mode === 'VOD') {
      const items = await firstValueFrom(
        this.nats.send(
          { cmd: 'academy.vod.findAll' },
          { ...query, status: 'PUBLISHED' },
        ),
      );
      return successResponse(items);
    }

    const items = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.liveClass.findAll' },
        { ...query, status: 'OPENING', onlyAvailable: true },
      ),
    );
    return successResponse(items);
  }

  @Public()
  @Get('public/:id')
  async findPublicById(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('mode') mode?: 'LIVE' | 'VOD',
  ) {
    // Detail page can pass mode explicitly; if missing, fallback LIVE -> VOD.
    if (mode === 'VOD') {
      const item = await firstValueFrom(
        this.nats.send({ cmd: 'academy.vod.findById' }, { id }),
      );
      return successResponse({ item: { ...item, mode: 'VOD' } });
    }

    try {
      const item = await firstValueFrom(
        this.nats.send({ cmd: 'academy.liveClass.findById' }, { id }),
      );
      return successResponse({ item: { ...item, mode: 'LIVE' } });
    } catch {
      const item = await firstValueFrom(
        this.nats.send({ cmd: 'academy.vod.findById' }, { id }),
      );
      return successResponse({ item: { ...item, mode: 'VOD' } });
    }
  }

  @Get(':id')
  async findById(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: ReqWithRequester,
  ) {
    const requester = req.requester;
    const hasReadPerm = requester.permissions?.includes('lms.delivery.read');

    if (!hasReadPerm) {
      // Nếu user không có quyền đọc trực tiếp thì cần check enrollment theo đúng loại:
      // - LIVE: liveClassId
      // - VOD: vodPackageId
      const liveResult = await firstValueFrom(
        this.nats.send(
          { cmd: 'academy.enrollment.checkByTarget' },
          { userId: requester.sub, targetType: 'CLASS', targetId: id },
        ),
      );
      if (!liveResult?.isEnrolled) {
        const vodResult = await firstValueFrom(
          this.nats.send(
            { cmd: 'academy.enrollment.checkByTarget' },
            { userId: requester.sub, targetType: 'VOD_PACKAGE', targetId: id },
          ),
        );
        if (!vodResult?.isEnrolled) {
          throw new ForbiddenException('You are not enrolled in this class');
        }
      }
    }

    // Endpoint này được dùng cho cả LIVE class và VOD package.
    // Nếu lookup LIVE không thấy thì fallback sang VOD.
    try {
      const item = await firstValueFrom(
        this.nats.send({ cmd: 'academy.liveClass.findById' }, { id }),
      );
      return successResponse({ item });
    } catch {
      const vodItem = await firstValueFrom(
        this.nats.send({ cmd: 'academy.vod.findById' }, { id }),
      );
      return successResponse({ item: { ...vodItem, mode: 'VOD' } });
    }
  }

  @Get(':id/curriculum')
  async getCurriculum(@Param('id', new ParseUUIDPipe()) id: string) {
    try {
      const item = await firstValueFrom(
        this.nats.send({ cmd: 'academy.liveClass.findById' }, { id }),
      );

      const courseProfile = item.cohort?.courseProfile;
      if (!courseProfile) {
        throw new NotFoundException('Curriculum not found for this class');
      }

      return successResponse({
        curriculum: {
          id: courseProfile.id,
          modules: courseProfile.modules || [],
        },
      });
    } catch {
      const vodItem = await firstValueFrom(
        this.nats.send({ cmd: 'academy.vod.findById' }, { id }),
      );

      const courseProfile = vodItem.courseProfile;
      if (!courseProfile) {
        throw new NotFoundException(
          'Curriculum not found for this VOD package',
        );
      }

      return successResponse({
        curriculum: {
          id: courseProfile.id,
          modules: courseProfile.modules || [],
        },
      });
    }
  }

  @Post()
  @Permissions('lms.delivery.create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(academyLiveClassCreateDTOSchema))
    dto: AcademyLiveClassCreateDTO,
    @Req() req: ReqWithRequester,
  ) {
    const item = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.liveClass.create' },
        { ...dto, requesterId: req.requester?.sub },
      ),
    );
    return successResponse(item);
  }

  @Put(':id')
  @Permissions('lms.delivery.update')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(academyLiveClassUpdateDTOSchema))
    dto: AcademyLiveClassUpdateDTO,
    @Req() req: ReqWithRequester,
  ) {
    await this.assertLecturerOwnsClassIfScoped(req, id);
    const item = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.liveClass.update' },
        { id, input: dto, requesterId: req.requester?.sub },
      ),
    );
    return successResponse(item);
  }

  @Delete(':id')
  @Permissions('lms.delivery.delete')
  async delete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: ReqWithRequester,
  ) {
    await this.assertLecturerOwnsClassIfScoped(req, id);
    const result = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.liveClass.delete' },
        { id, requesterId: req.requester?.sub },
      ),
    );
    return successResponse(result);
  }

  // --- Assignments ---

  @Get(':id/assignments')
  async findAssignments(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: ReqWithRequester,
  ) {
    const requester = req.requester;
    const hasReadPerm = requester.permissions?.includes('lms.delivery.read');

    if (!hasReadPerm) {
      const enrollment = await firstValueFrom(
        this.nats.send(
          { cmd: 'academy.enrollment.checkByTarget' },
          { userId: requester.sub, targetType: 'CLASS', targetId: id },
        ),
      );
      if (!enrollment?.isEnrolled) {
        throw new ForbiddenException('You are not enrolled in this class');
      }
    }

    const items = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.liveClass.findAssignments' },
        { liveClassId: id },
      ),
    );
    return successResponse({ items });
  }

  @Post(':id/assignments')
  @Permissions('lms.delivery.manage')
  async addAssignment(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(academyLiveClassAssignmentCreateDTOSchema))
    dto: AcademyLiveClassAssignmentCreateDTO,
    @Req() req: ReqWithRequester,
  ) {
    await this.assertLecturerOwnsClassIfScoped(req, id);
    const item = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.liveClass.addAssignment' },
        { 
          ...dto, 
          liveClassId: dto.vodPackageId ? undefined : id,
          vodPackageId: dto.vodPackageId ? dto.vodPackageId : undefined,
        },
      ),
    );
    return successResponse({ item });
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
}
