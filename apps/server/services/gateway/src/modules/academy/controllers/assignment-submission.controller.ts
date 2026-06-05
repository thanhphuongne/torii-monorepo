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
  PermissionsGuard,
  ZodValidationPipe,
  successResponse,
  ReqWithRequester,
} from '@server/shared';
import { ForbiddenException } from '@nestjs/common';
import {
  AcademyAssignmentSubmissionCreateDTO,
  AcademyAssignmentSubmissionQueryDTO,
  AcademyAssignmentSubmissionUpdateDTO,
  academyAssignmentSubmissionCreateDTOSchema,
  academyAssignmentSubmissionQueryDTOSchema,
  academyAssignmentSubmissionUpdateDTOSchema,
} from '@workspace/schemas';

@Controller('api/academy/assignment-submissions')
@UseGuards(GatewayAuthGuard, PermissionsGuard)
export class AssignmentSubmissionController {
  constructor(@Inject('NATS_SERVICE') private readonly nats: ClientProxy) {}

  private hasExamManagePermission(req: ReqWithRequester): boolean {
    const permissions = req.requester?.permissions || [];
    return (
      permissions.includes('lms.assessment.update') ||
      permissions.includes('lms.assessment.grade')
    );
  }

  private hasDeliveryReadPermission(req: ReqWithRequester): boolean {
    const permissions = req.requester?.permissions || [];
    return permissions.includes('lms.delivery.read');
  }

  private async assertLearnerEnrolledInLiveClass(
    userId: string,
    liveClassId: string,
  ) {
    const result = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.enrollment.checkByTarget' },
        { userId, targetType: 'CLASS', targetId: liveClassId },
      ),
    );
    if (!result?.isEnrolled) {
      throw new ForbiddenException('You are not enrolled in this class');
    }
  }

  @Get()
  async findAll(
    @Query(new ZodValidationPipe(academyAssignmentSubmissionQueryDTOSchema))
    query: AcademyAssignmentSubmissionQueryDTO,
    @Req() req: ReqWithRequester,
  ) {
    const requester = req.requester;
    const isExamManager = this.hasExamManagePermission(req);
    const hasDeliveryRead = this.hasDeliveryReadPermission(req);

    if (!isExamManager && !hasDeliveryRead) {
      if (!query.liveClassId) {
        throw new ForbiddenException('liveClassId is required for learners');
      }
      await this.assertLearnerEnrolledInLiveClass(
        requester.sub,
        query.liveClassId,
      );
    }

    const items = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.assignmentSubmission.findAll' },
        {
          ...query,
          requesterId: req.requester?.sub,
          isExamManager,
          canViewAll: isExamManager || hasDeliveryRead,
          userId:
            isExamManager || hasDeliveryRead
              ? query.userId
              : req.requester?.sub,
        },
      ),
    );
    return successResponse({ items });
  }

  @Get(':id')
  async findById(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: ReqWithRequester,
  ) {
    const requester = req.requester;
    const isExamManager = this.hasExamManagePermission(req);
    const hasDeliveryRead = this.hasDeliveryReadPermission(req);

    const item = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.assignmentSubmission.findById' },
        { id, requesterId: req.requester?.sub, isExamManager },
      ),
    );

    if (!isExamManager && !hasDeliveryRead) {
      const liveClassId = item?.liveClassAssignment?.liveClassId;
      if (!liveClassId) {
        throw new ForbiddenException(
          'Submission is not associated with any live class',
        );
      }
      await this.assertLearnerEnrolledInLiveClass(requester.sub, liveClassId);
    }

    return successResponse({ item });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(academyAssignmentSubmissionCreateDTOSchema))
    dto: AcademyAssignmentSubmissionCreateDTO,
    @Req() req: ReqWithRequester,
  ) {
    const requester = req.requester;
    const isExamManager = this.hasExamManagePermission(req);
    const hasDeliveryRead = this.hasDeliveryReadPermission(req);
    const resolvedUserId =
      isExamManager && dto.userId ? dto.userId : req.requester?.sub;

    if (!isExamManager && !hasDeliveryRead) {
      await this.assertLearnerEnrolledInLiveClass(
        requester.sub,
        dto.liveClassId,
      );
    }

    const item = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.assignmentSubmission.create' },
        {
          ...dto,
          userId: resolvedUserId,
          requesterId: req.requester?.sub,
          isExamManager,
        },
      ),
    );
    return successResponse({ item });
  }

  @Put(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(academyAssignmentSubmissionUpdateDTOSchema))
    dto: AcademyAssignmentSubmissionUpdateDTO,
    @Req() req: ReqWithRequester,
  ) {
    const requester = req.requester;
    const isExamManager = this.hasExamManagePermission(req);
    const hasDeliveryRead = this.hasDeliveryReadPermission(req);

    if (!isExamManager && !hasDeliveryRead) {
      const existing = await firstValueFrom(
        this.nats.send(
          { cmd: 'academy.assignmentSubmission.findById' },
          { id, requesterId: req.requester?.sub, isExamManager },
        ),
      );
      const liveClassId = existing?.liveClassAssignment?.liveClassId;
      if (!liveClassId) {
        throw new ForbiddenException(
          'Submission is not associated with any live class',
        );
      }
      await this.assertLearnerEnrolledInLiveClass(requester.sub, liveClassId);
    }

    const item = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.assignmentSubmission.update' },
        { id, input: dto, requesterId: req.requester?.sub, isExamManager },
      ),
    );
    return successResponse({ item });
  }

  @Delete(':id')
  @UseGuards(GatewayAuthGuard, PermissionsGuard)
  async delete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: ReqWithRequester,
  ) {
    const isExamManager = this.hasExamManagePermission(req);
    if (!isExamManager) {
      throw new ForbiddenException(
        'lms.assessment.update or lms.assessment.grade permission is required',
      );
    }
    const result = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.assignmentSubmission.delete' },
        { id, requesterId: req.requester?.sub, isExamManager },
      ),
    );
    return successResponse(result);
  }
}
