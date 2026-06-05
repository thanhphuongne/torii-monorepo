import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '@server/shared';

import type {
  CommentCreateDTO,
  CommentQueryDTO,
  CommentResponseDTO,
  CommentPaginatedResponse,
  CommentUpdateDTO,
} from '@workspace/schemas';

@Injectable()
export class CommentService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) { }

  private hasStaffOverride(permissions?: string[]): boolean {
    if (!permissions?.length) return false;
    // Staff/admin can bypass enrollment checks
    return (
      permissions.includes('lms.delivery.update') ||
      permissions.includes('lms.delivery.read') ||
      permissions.includes('lms.catalog.update') ||
      permissions.includes('lms.catalog.read')
    );
  }

  private toCommentDTO(
    comment: any,
    currentUserId?: string,
    replyCountOverride?: number,
    requesterPermissions?: string[],
    isVODContext: boolean = false,
  ): CommentResponseDTO {
    const likes = Array.isArray(comment.likes) ? comment.likes : [];
    const isLiked = !!currentUserId && likes.length > 0;

    const replyCount = replyCountOverride ?? comment?._count?.replies ?? 0;
    const likeCount = comment?._count?.likes ?? 0;

    // --- Official Reply Logic ---
    // Only lecturers/instructors get the official "Giảng viên" badge.
    // Admin/staff cannot post in discussions (enforced by assertCanPostToDiscussion).
    // No anonymization: everyone always shows their real display name and avatar.
    const userRole = comment.user?.role;
    const isInstructor = userRole === 'lecturer' || userRole === 'instructor';

    const isOfficialReply = isInstructor;
    const authorRoleLabel: string | undefined = isInstructor ? 'Giảng viên' : undefined;

    const authorData = comment.user
      ? {
        id: comment.user.id,
        displayName: comment.user.displayName,
        avatarUrl: comment.user.avatarUrl ?? undefined,
      }
      : undefined;

    return {
      id: comment.id,
      userId: comment.userId,
      parentCommentId: comment.parentCommentId ?? null,
      content: comment.content,
      status: comment.status,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      author: authorData,
      authorRoleLabel,
      isOfficialReply,
      replyCount,
      likeCount,
      isLiked,
      replies: [],
    };
  }

  private async buildNestedReplies(
    parentId: string,
    depth: number,
    currentUserId?: string,
    requesterPermissions?: string[],
    isVODContext: boolean = false,
  ): Promise<CommentResponseDTO[]> {
    if (depth <= 0) return [];

    const replies = await this.prisma.comment.findMany({
      where: {
        parentCommentId: parentId,
        status: { not: 'deleted' },
      },
      orderBy: { createdAt: 'asc' },
      include: {
        user: true,
        _count: { select: { replies: true, likes: true } },
        ...(currentUserId
          ? {
            likes: {
              where: { userId: currentUserId },
            },
          }
          : {}),
      },
    });

    return Promise.all(
      replies.map(async (reply: any) => {
        const dto = this.toCommentDTO(
          reply,
          currentUserId,
          undefined,
          requesterPermissions,
          isVODContext,
        );
        dto.replies = await this.buildNestedReplies(
          reply.id,
          depth - 1,
          currentUserId,
          requesterPermissions,
          isVODContext,
        );
        return dto;
      }),
    );
  }

  /**
   * Resolve candidate delivery scopes (LiveClass / VodPackage) for DISCUSSION entity.
   * entityId can be:
   *   1) LiveClass.id or VodPackage.id (course-level board)
   *   2) Lesson.id (lesson-level)
   *   3) Topic comment id -> resolved via comment_targets(commentId=topicId,targetId=lessonId)
   */
  private async resolveDeliveryScopeIdsFromDiscussionEntity(
    targetType: string,
    entityId: string,
  ): Promise<string[]> {
    if (targetType !== 'DISCUSSION') {
      throw new BadRequestException(`Unsupported targetType=${targetType}`);
    }

    let current = entityId;
    for (let i = 0; i < 5; i++) {
      // 1) entityId is already a class id or vod package id
      const [klass, vod] = await Promise.all([
        this.prisma.liveClass.findUnique({
          where: { id: current },
          select: { id: true },
        }),
        this.prisma.vodPackage.findUnique({
          where: { id: current },
          select: { id: true },
        }),
      ]);
      if (klass) return [klass.id];
      if (vod) return [vod.id];

      // 2) entityId is a lesson id -> map to all classes and packages of the course profile
      const lesson = await this.prisma.lesson.findUnique({
        where: { id: current },
        select: { module: { select: { courseProfileId: true } } },
      });
      if (lesson?.module?.courseProfileId) {
        const [classes, packages] = await Promise.all([
          this.prisma.liveClass.findMany({
            where: {
              cohort: { courseProfileId: lesson.module.courseProfileId },
            },
            select: { id: true },
          }),
          this.prisma.vodPackage.findMany({
            where: { courseProfileId: lesson.module.courseProfileId },
            select: { id: true },
          }),
        ]);
        const ids = [...classes.map((c) => c.id), ...packages.map((p) => p.id)];
        if (ids.length) return ids;
      }

      // 3) entityId is a topic comment id -> resolve targetId, then continue.
      const commentTarget = await this.prisma.commentTarget.findFirst({
        where: { commentId: current, targetType: 'DISCUSSION' },
        select: { targetId: true },
      });
      if (commentTarget) {
        current = commentTarget.targetId;
        continue;
      }

      break;
    }

    throw new NotFoundException(
      'Discussion target not found (cannot resolve course classes or packages)',
    );
  }

  private async assertCanPostToDiscussion(
    requesterId: string,
    requesterPermissions: string[] | undefined,
    targetType: string,
    entityId: string,
    isWrite: boolean = true,
    deliveryScopeId?: string,
  ): Promise<string[]> {
    const candidateIds = deliveryScopeId
      ? [deliveryScopeId]
      : await this.resolveDeliveryScopeIdsFromDiscussionEntity(targetType, entityId);

    // 2. Load the user's explicit role to handle role-based restrictions
    const user = await this.prisma.user.findUnique({
      where: { id: requesterId },
      select: { role: true },
    });
    const role = user?.role;

    // 3. Admin & Staff Check
    const isStaffOrAdminByPerm = this.hasStaffOverride(requesterPermissions);
    const isInternalRole =
      role === 'admin' ||
      role === 'staff-academic' ||
      role === 'staff-operations';

    if (isWrite) {
      // Per Requirement: Admin and Staff cannot ask or answer questions in Academy Discussion.
      if (isInternalRole || role === 'admin') {
        throw new ForbiddenException(
          'Admin và Nhân viên học vụ chỉ có quyền xem, không được phép đặt câu hỏi hoặc trả lời trong thảo luận bài học.',
        );
      }
    } else {
      // For viewing (isWrite = false), always allow internal staff/admin
      if (isStaffOrAdminByPerm || isInternalRole) return candidateIds;
    }

    // 4. Lecturer Check: Must be the assigned instructor for the class or package
    const [classes, packages] = await Promise.all([
      this.prisma.liveClass.findMany({
        where: { id: { in: candidateIds }, instructorId: requesterId },
        select: { id: true },
      }),
      this.prisma.vodPackage.findMany({
        where: { id: { in: candidateIds }, instructorId: requesterId },
        select: { id: true },
      }),
    ]);

    const assignedIds = [
      ...classes.map((c) => c.id),
      ...packages.map((p) => p.id),
    ];

    if (assignedIds.length > 0) {
      return assignedIds; // Access only to self-managed cohorts/packages
    }

    if (isWrite && (role === 'lecturer' || role === 'instructor')) {
      // Lecturer but not assigned to any of the candidate classes
      throw new ForbiddenException(
        'Chỉ giảng viên phụ trách khóa học này mới có quyền tham gia thảo luận.',
      );
    }

    // 5. Learner Check & Enrollment (Fallback)
    // If not a staff/admin and not the assigned lecturer, must be enrolled.
    const authorizedIds: string[] = [];
    for (const targetId of candidateIds) {
      // Determine if it's a Live Class or VOD Package for the correct enrollment check
      let enrollmentTargetType: 'CLASS' | 'VOD_PACKAGE' = 'CLASS';
      const isVodPackage = await this.prisma.vodPackage.findFirst({
        where: { id: targetId },
        select: { id: true },
      });
      if (isVodPackage) enrollmentTargetType = 'VOD_PACKAGE';

      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'academy.enrollment.checkEligibility' },
          {
            userId: requesterId,
            targetId: targetId,
            targetType: enrollmentTargetType,
          },
        ),
      );
      if (result?.isEnrolled) {
        authorizedIds.push(targetId);
      }
    }

    if (authorizedIds.length > 0) {
      return authorizedIds;
    }

    throw new ForbiddenException(
      'Bạn không có quyền tham gia thảo luận này. Vui lòng đăng ký khóa học.',
    );
  }

  async findAllComments(
    query: CommentQueryDTO,
    currentUserId?: string,
    requesterPermissions?: string[],
  ): Promise<CommentPaginatedResponse> {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const skip = (page - 1) * limit;

    if (!query.entityId || !query.targetType) {
      // keep consistent with current frontend: discussion always sends entityId+targetType
      throw new BadRequestException('entityId and targetType are required');
    }

    let allowedIds: string[] = [];
    if (String(query.targetType) === 'DISCUSSION') {
      if (!currentUserId) {
        throw new ForbiddenException('Unauthorized');
      }
      allowedIds = await this.assertCanPostToDiscussion(
        currentUserId,
        requesterPermissions,
        query.targetType,
        query.entityId,
        false, // isWrite = false (view list)
        query.deliveryScopeId,
      );
    }

    const where: any = {
      status: { not: 'deleted' },
    };

    // If we're fetching replies specifically
    if (query.parentId !== undefined) {
      where.parentCommentId = query.parentId || null;
    } else {
      // Top-level comments must match the specific board/target
      where.targets = {
        some: {
          targetId: query.entityId,
          targetType: query.targetType,
        },
      };

      const filterTargetIds = query.deliveryScopeId
        ? [query.deliveryScopeId]
        : allowedIds;
      if (filterTargetIds.length > 0) {
        where.AND = [
          {
            targets: {
              some: { targetId: query.entityId, targetType: query.targetType },
            },
          },
          {
            targets: {
              some: { targetId: { in: filterTargetIds } },
            },
          },
        ];
        delete where.targets;
      }
    }

    if (query.deliveryScopeId && query.targetType !== 'DISCUSSION') {
      delete where.targets;
      where.AND = [
        {
          targets: {
            some: { targetId: query.entityId, targetType: query.targetType },
          },
        },
        {
          targets: {
            some: { targetId: query.deliveryScopeId },
          },
        },
      ];
    }

    const [rootComments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: true,
          _count: { select: { replies: true, likes: true } },
          ...(currentUserId
            ? {
              likes: { where: { userId: currentUserId } },
            }
            : {}),
        },
      }),
      this.prisma.comment.count({ where }),
    ]);

    const depth = 5; // enough for nested replies in CommentSection recursion

    const data: CommentResponseDTO[] = await Promise.all(
      rootComments.map(async (comment: any) => {
        const replyCount = comment?._count?.replies ?? 0;
        const isVODContext = String(query.targetType) === 'DISCUSSION';
        const dto = this.toCommentDTO(
          comment,
          currentUserId,
          undefined,
          requesterPermissions,
          isVODContext,
        );

        // For lesson-discussion: show "ANSWERED" badge when there are answers.
        if (isVODContext && replyCount > 0) {
          dto.status = 'ANSWERED' as any;
        }

        dto.replies = await this.buildNestedReplies(
          comment.id,
          depth - 1,
          currentUserId,
          requesterPermissions,
          isVODContext,
        );
        return dto;
      }),
    );

    const totalPages = Math.ceil(total / limit) || 1;
    return {
      data,
      total,
      page,
      limit,
      totalPages,
    } as any;
  }

  async getReplies(
    commentId: string,
    depth: number,
    currentUserId?: string,
    requesterPermissions?: string[],
  ): Promise<CommentResponseDTO> {
    if (!currentUserId) {
      throw new ForbiddenException('Unauthorized');
    }

    if (requesterPermissions || currentUserId) {
      // For COURSE discussion replies, `commentId` (topic id) is also a DISCUSSION target source
      await this.assertCanPostToDiscussion(
        currentUserId,
        requesterPermissions,
        'DISCUSSION',
        commentId,
        false, // read mode for replies list
      );
    }

    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        user: true,
        _count: { select: { replies: true, likes: true } },
        targets: true,
        ...(currentUserId
          ? { likes: { where: { userId: currentUserId } } }
          : {}),
      },
    });

    if (!comment || comment.status === 'deleted') {
      throw new NotFoundException('Comment not found');
    }

    const isVODContext = comment.targets.some(
      (t: any) => t.targetType === 'DISCUSSION',
    );
    const dto = this.toCommentDTO(
      comment,
      currentUserId,
      undefined,
      requesterPermissions,
      isVODContext,
    );
    dto.replies = await this.buildNestedReplies(
      comment.id,
      Math.max(0, depth - 1),
      currentUserId,
      requesterPermissions,
      isVODContext,
    );
    return dto;
  }

  async createComment(
    dto: CommentCreateDTO,
    requesterId: string,
    requesterPermissions?: string[],
  ): Promise<CommentResponseDTO> {
    const targetType = dto.targetType;
    const entityId = dto.entityId;
    const parentId = dto.parentId;

    if (!targetType || !entityId) {
      throw new BadRequestException('targetType and entityId are required');
    }

    await this.assertCanPostToDiscussion(
      requesterId,
      requesterPermissions,
      targetType,
      entityId,
      true, // isWrite = true (creating)
      dto.deliveryScopeId,
    );

    if (parentId) {
      const comment = await this.prisma.comment.create({
        data: {
          user: { connect: { id: requesterId } },
          content: dto.content,
          parent: { connect: { id: parentId } },
          status: 'approved',
        },
        include: {
          user: true,
          _count: { select: { replies: true, likes: true } },
          likes: { where: { userId: requesterId } },
        },
      });

      const isVODContext = String(targetType) === 'DISCUSSION';
      const dtoOut = this.toCommentDTO(
        comment as any,
        requesterId,
        0,
        requesterPermissions,
        isVODContext,
      );
      dtoOut.replies = [];
      return dtoOut;
    }

    const comment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.comment.create({
        data: {
          user: { connect: { id: requesterId } },
          content: dto.content,
          status: 'approved',
        },
        include: {
          user: true,
          _count: { select: { replies: true, likes: true } },
          likes: { where: { userId: requesterId } },
        },
      });

      await tx.commentTarget.create({
        data: {
          commentId: created.id,
          targetId: entityId,
          targetType: targetType as any,
        },
      });

      // Self-target: enables nested replies UI to query by `discussionId = topicCommentId`.
      // The topic comment will be found even when `entityId` is the topic's own id.
      await tx.commentTarget.create({
        data: {
          commentId: created.id,
          targetId: created.id,
          targetType: targetType as any,
        },
      });

      if (dto.deliveryScopeId) {
        await tx.commentTarget.create({
          data: {
            commentId: created.id,
            targetId: dto.deliveryScopeId,
            targetType: 'CLASS',
          },
        });
      }

      return created;
    });

    const isVODContext = String(targetType) === 'DISCUSSION';
    const dtoOut = this.toCommentDTO(
      comment as any,
      requesterId,
      0,
      requesterPermissions,
      isVODContext,
    );
    dtoOut.replies = [];
    return dtoOut;
  }

  async updateComment(
    commentId: string,
    dto: CommentUpdateDTO,
    requesterId: string,
  ): Promise<CommentResponseDTO> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        user: true,
        _count: { select: { replies: true, likes: true } },
        likes: { where: { userId: requesterId } },
      },
    });

    if (!comment || comment.status === 'deleted') {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== requesterId) {
      throw new ForbiddenException(
        'Bạn chỉ có thể chỉnh sửa bình luận của mình',
      );
    }

    const updated = await this.prisma.comment.update({
      where: { id: commentId },
      data: { content: dto.content },
      include: {
        user: true,
        _count: { select: { replies: true, likes: true } },
        likes: { where: { userId: requesterId } },
      },
    });

    const dtoOut = this.toCommentDTO(updated as any, requesterId);
    dtoOut.replies = [];
    return dtoOut;
  }

  async deleteComment(commentId: string, requesterId: string): Promise<void> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment || comment.status === 'deleted') {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== requesterId) {
      throw new ForbiddenException('Bạn chỉ có thể xóa bình luận của mình');
    }

    await this.prisma.comment.update({
      where: { id: commentId },
      data: { status: 'deleted', content: '[deleted]' },
    });
  }

  async toggleLike(
    commentId: string,
    requesterId: string,
  ): Promise<{ isLiked: boolean; likeCount: number }> {
    const existingLike = await this.prisma.commentLike.findUnique({
      where: {
        commentId_userId: {
          commentId,
          userId: requesterId,
        },
      },
    });

    if (existingLike) {
      await this.prisma.commentLike.delete({
        where: {
          commentId_userId: {
            commentId,
            userId: requesterId,
          },
        },
      });
    } else {
      await this.prisma.commentLike.create({
        data: {
          commentId,
          userId: requesterId,
        },
      });
    }

    const likeCount = await this.prisma.commentLike.count({
      where: { commentId },
    });

    return { isLiked: !existingLike, likeCount };
  }
}
