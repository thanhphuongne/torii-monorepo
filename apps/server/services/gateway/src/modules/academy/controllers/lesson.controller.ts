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
  ForbiddenException,
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
  AcademyLessonCreateDTO,
  academyLessonCreateDTOSchema,
  AcademyLessonQueryDTO,
  academyLessonQueryDTOSchema,
  AcademyLessonUpdateDTO,
  academyLessonUpdateDTOSchema,
} from '@workspace/schemas';

@Controller('api/academy/lessons')
@UseGuards(GatewayAuthGuard, PermissionsGuard)
export class LessonController {
  constructor(@Inject('NATS_SERVICE') private readonly nats: ClientProxy) { }

  @Get()
  async findAll(
    @Query(new ZodValidationPipe(academyLessonQueryDTOSchema))
    query: AcademyLessonQueryDTO,
    @Req() req: ReqWithRequester,
  ) {
    const requester = req.requester;
    const hasContentRead = requester.permissions?.includes('lms.catalog.read');

    if (!hasContentRead) {
      if (!query.courseProfileId) {
        throw new ForbiddenException(
          'courseProfileId is required for learners',
        );
      }
      const result = await firstValueFrom(
        this.nats.send(
          { cmd: 'academy.enrollment.checkEligibility' },
          {
            userId: requester.sub,
            targetId: query.courseProfileId,
            targetType: 'COURSE_PROFILE',
          },
        ),
      );
      if (!result?.isEnrolled) {
        throw new ForbiddenException('You are not enrolled in this course');
      }
    }

    const items = await firstValueFrom(
      this.nats.send({ cmd: 'academy.lesson.findAll' }, query),
    );
    return successResponse({ items });
  }

  @Get(':id')
  async findById(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: ReqWithRequester,
  ) {
    const requester = req.requester;
    const hasContentRead = requester.permissions?.includes('lms.catalog.read');

    if (!hasContentRead) {
      // Find lesson first to get courseProfileId
      const lesson = await firstValueFrom(
        this.nats.send({ cmd: 'academy.lesson.findById' }, { id }),
      );
      if (!lesson) throw new ForbiddenException('Lesson not found');
      const courseProfileId = lesson.module?.courseProfileId;

      if (!courseProfileId) {
        throw new ForbiddenException(
          'Lesson is not associated with any course',
        );
      }

      const result = await firstValueFrom(
        this.nats.send(
          { cmd: 'academy.enrollment.checkEligibility' },
          {
            userId: requester.sub,
            targetId: courseProfileId,
            targetType: 'COURSE_PROFILE',
          },
        ),
      );
      if (!result?.isEnrolled) {
        throw new ForbiddenException(
          'You are not enrolled in a course providing this lesson',
        );
      }
    }

    const item = await firstValueFrom(
      this.nats.send({ cmd: 'academy.lesson.findById' }, { id }),
    );
    return successResponse({ item });
  }

  @Post()
  @Permissions('lms.catalog.create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(academyLessonCreateDTOSchema))
    dto: AcademyLessonCreateDTO,
    @Req() req: ReqWithRequester,
  ) {
    const item = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.lesson.create' },
        { ...dto, requesterId: req.requester?.sub },
      ),
    );
    return successResponse({ item });
  }

  @Put(':id')
  @Permissions('lms.catalog.update')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(academyLessonUpdateDTOSchema))
    dto: AcademyLessonUpdateDTO,
    @Req() req: ReqWithRequester,
  ) {
    const item = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.lesson.update' },
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
        { cmd: 'academy.lesson.delete' },
        { id, requesterId: req.requester?.sub },
      ),
    );
    return successResponse(result);
  }

  @Post('reorder')
  @Permissions('lms.catalog.update')
  async reorder(
    @Body() dto: { moduleId: string; lessonIds: string[] },
    @Req() req: ReqWithRequester,
  ) {
    const result = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.lesson.reorder' },
        { ...dto, requesterId: req.requester?.sub },
      ),
    );
    return successResponse(result);
  }
}
