import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/generated';
import { PrismaService } from '@server/shared/prisma/prisma.service';
import {
  AssignmentSubmissionCreateDto,
  AssignmentSubmissionQueryDto,
  AssignmentSubmissionUpdateDto,
} from './dto/assignment-submission.dto';
import { AuditLoggerService } from '../../audit-logger.service';

@Injectable()
export class AssignmentSubmissionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLoggerService,
  ) {}
  
  private parseContent(submission: any) {
    if (!submission) return submission;
    if (typeof submission.content === 'string') {
      try {
        submission.content = JSON.parse(submission.content);
      } catch (e) {
        // Keep as is if not valid JSON
      }
    }
    return submission;
  }

  async findAll(
    query: AssignmentSubmissionQueryDto,
    requesterId?: string,
    isExamManager = false,
    canViewAll = false,
  ) {
    const effectiveUserId =
      isExamManager || canViewAll
        ? query.userId
        : (requesterId ?? query.userId);
    const where: Prisma.AssignmentSubmissionWhereInput = {
      liveClassAssignmentId: query.classAssessmentId ?? undefined,
      userId: effectiveUserId ?? undefined,
    };
    if (query.liveClassId) {
      where.liveClassAssignment = { liveClassId: query.liveClassId };
    }
    const submissions = await this.prisma.assignmentSubmission.findMany({
      where,
      include: {
        user: {
          select: { id: true, displayName: true, email: true },
        },
        liveClassAssignment: {
          select: { id: true, liveClassId: true, assignmentId: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return submissions.map((item) => {
      const parsed = this.parseContent(item);
      return {
        ...parsed,
        classAssessmentId: parsed.liveClassAssignmentId,
        assignmentTemplateId: parsed.liveClassAssignment?.assignmentId,
        liveClassId: parsed.liveClassAssignment?.liveClassId,
      };
    });
  }

  async findById(id: string, requesterId?: string, isExamManager = false) {
    const item = await this.prisma.assignmentSubmission.findUnique({
      where: { id },
      include: {
        liveClassAssignment: {
          select: { id: true, liveClassId: true, assignmentId: true },
        },
      },
    });
    if (!item) throw new NotFoundException('AssignmentSubmission not found');
    if (
      !isExamManager &&
      requesterId &&
      requesterId !== 'SYSTEM' &&
      item.userId !== requesterId
    ) {
      throw new BadRequestException('You can only access your own submissions');
    }
    const parsed = this.parseContent(item);
    return {
      ...parsed,
      classAssessmentId: parsed.liveClassAssignmentId,
      assignmentTemplateId: parsed.liveClassAssignment?.assignmentId,
      liveClassId: parsed.liveClassAssignment?.liveClassId,
    };
  }

  async create(
    input: AssignmentSubmissionCreateDto,
    requesterId = 'SYSTEM',
    isExamManager = false,
  ) {
    if (!input.userId) {
      throw new BadRequestException('Missing userId for assignment submission');
    }
    if (
      !isExamManager &&
      requesterId &&
      requesterId !== 'SYSTEM' &&
      input.userId !== requesterId
    ) {
      throw new BadRequestException(
        'You can only create submissions for yourself',
      );
    }

    if (!input.classAssessmentId) {
      throw new BadRequestException(
        'Missing classAssessmentId for assignment submission',
      );
    }

    const classAssignment = await this.prisma.liveClassAssignment.findUnique({
      where: { id: input.classAssessmentId },
      select: { id: true },
    });
    if (!classAssignment) {
      throw new BadRequestException('Invalid classAssessmentId');
    }

    const existing = await this.prisma.assignmentSubmission.findFirst({
      where: {
        liveClassAssignmentId: input.classAssessmentId,
        userId: input.userId,
      },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException(
        'You have already submitted this assignment',
      );
    }

    const result = await this.prisma.assignmentSubmission.create({
      data: {
        liveClassAssignmentId: input.classAssessmentId,
        userId: input.userId,
        status: (input.status as any) ?? 'SUBMITTED',
        submittedAt:
          (input.status ?? 'SUBMITTED').toUpperCase() === 'SUBMITTED'
            ? new Date()
            : null,
        content:
          typeof input.content === 'object'
            ? JSON.stringify(input.content)
            : input.content ?? null,
        fileUrls: input.fileUrls ?? [],
      },
    });

    const parsed = this.parseContent(result);
    // Since create and findUnique return slightly different include structures, 
    // we fetch again or just include relations in create
    // Let's use fetch again for simplicity and consistency
    return this.findById(result.id, requesterId, isExamManager);
  }

  async update(
    id: string,
    input: AssignmentSubmissionUpdateDto,
    requesterId = 'SYSTEM',
    isExamManager = false,
  ) {
    const oldSubmission = await this.findById(id, requesterId, isExamManager);

    const updated = await this.prisma.assignmentSubmission.update({
      where: { id },
      data: {
        status: input.status as any,
        grade:
          input.score !== undefined
            ? new Prisma.Decimal(input.score)
            : undefined,
        feedback: input.feedback ?? undefined,
        gradedAt: input.score !== undefined ? new Date() : undefined,
        submittedAt:
          input.status && input.status.toUpperCase() === 'SUBMITTED'
            ? new Date()
            : undefined,
        content:
          typeof input.content === 'object'
            ? JSON.stringify(input.content)
            : input.content ?? undefined,
        fileUrls: input.fileUrls ?? undefined,
      },
    });

    if (input.score !== undefined) {
      await this.audit.log({
        userId: requesterId,
        action: 'assignment_submission.grade',
        entity: 'AssignmentSubmission',
        entityId: id,
        description: `Graded assignment submission for user ${oldSubmission.userId}. Score: ${input.score}`,
        oldValues: { grade: oldSubmission.grade?.toString() },
        newValues: { grade: updated.grade?.toString(), status: updated.status },
      });
    }

    return this.parseContent(updated);
  }

  async delete(id: string, requesterId = 'SYSTEM', isExamManager = false) {
    const submission = await this.findById(id, requesterId, isExamManager);
    await this.prisma.assignmentSubmission.delete({ where: { id } });

    await this.audit.log({
      userId: requesterId,
      action: 'assignment_submission.delete',
      entity: 'AssignmentSubmission',
      entityId: id,
      description: `Deleted assignment submission for user ${submission.userId}`,
      metadata: {
        userId: submission.userId,
        classAssignmentId:
          (submission as any).liveClassAssignmentId ||
          (submission as any).classAssignmentId,
      },
    });

    return { ok: true };
  }
}
