import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Inject,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@server/shared/prisma/prisma.service';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  LiveScheduleCreateDto,
  LiveScheduleQueryDto,
  LiveScheduleUpdateDto,
} from './dto/live-schedule.dto';
import {
  LiveScheduleConflictPreviewDto,
  LiveScheduleRequestApproveDto,
  LiveScheduleRequestCreateDto,
  LiveScheduleRequestQueryDto,
  LiveScheduleRequestRejectDto,
} from './dto/live-schedule-request.dto';
import { create } from '@bufbuild/protobuf';
import {
  RoomMetadataSchema,
  RoomCreateFeaturesSchema,
  GenerateTokenReqSchema,
  UserInfoSchema,
  UserMetadataSchema,
} from '@workspace/protocol';
import { AppConfigService } from '@server/shared';
import { AuditLoggerService } from '../../audit-logger.service';

@Injectable()
export class LiveScheduleService {
  private readonly logger = new Logger(LiveScheduleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly appConfig: AppConfigService,
    @Inject('NATS_SERVICE') private readonly nats: ClientProxy,
    private readonly audit: AuditLoggerService,
  ) { }

  private buildSessionRoomId() {
    // Generate a short, concise roomId similar to Google Meet (e.g., abc-defg-hij)
    // Here we use 3-3-3 pattern for consistency
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const segment = (len: number) =>
      Array.from({ length: len }, () =>
        chars.charAt(Math.floor(Math.random() * chars.length)),
      ).join('');

    return `${segment(3)}-${segment(3)}-${segment(3)}`;
  }

  private computeDurationMinutes(startTime: string, endTime: string) {
    const [startHour, startMinute] = this.parseHourMinute(startTime);
    const [endHour, endMinute] = this.parseHourMinute(endTime);
    const start = startHour * 60 + startMinute;
    const end = endHour * 60 + endMinute;
    if (end <= start) return 0;
    return end - start;
  }

  private attachComputedScheduleFields(session: {
    sessionDate: Date;
    startTime: string;
    endTime: string;
  }) {
    const dateYmd = this.formatDateInTimeZone(
      session.sessionDate,
      'Asia/Ho_Chi_Minh',
    );
    const scheduledAt = this.buildInstantFromVnDateTime(
      dateYmd,
      session.startTime,
    );
    const endAt = this.buildInstantFromVnDateTime(dateYmd, session.endTime);
    const duration = this.computeDurationMinutes(
      session.startTime,
      session.endTime,
    );
    return { scheduledAt, endAt, duration };
  }

  private async assertTemplateMutable(liveClassId: string) {
    if (!liveClassId) throw new BadRequestException('liveClassId is required');
    const klass = await this.prisma.liveClass.findUnique({
      where: { id: liveClassId },
      select: { status: true },
    });
    if (!klass) throw new BadRequestException('Invalid liveClassId');
    // After class becomes public, template schedules are frozen; changes must go through session requests.
    const status = String(klass.status);
    const allowed = status === 'DRAFT';
    if (!allowed) {
      throw new BadRequestException(
        'LiveSchedule is locked after class is opening. Please use session change requests.',
      );
    }
  }

  async findAll(query: LiveScheduleQueryDto) {
    return this.prisma.liveSchedule.findMany({
      where: { liveClassId: query.liveClassId ?? undefined },
      orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }, { id: 'asc' }],
      include: {
        liveClass: {
          select: {
            id: true,
          },
        },
      },
    });
  }

  async findById(id: string) {
    if (!id) throw new BadRequestException('LiveSchedule id is required');
    const item = await this.prisma.liveSchedule.findUnique({
      where: { id },
      include: {
        liveClass: {
          select: {
            id: true,
          },
        },
      },
    });
    if (!item) throw new NotFoundException('LiveSchedule not found');
    return item;
  }

  async create(input: LiveScheduleCreateDto, requesterId = 'SYSTEM') {
    if (!input.liveClassId) {
      throw new BadRequestException('liveClassId is required');
    }
    const klass = await this.prisma.liveClass.findUnique({
      where: { id: input.liveClassId },
      include: { cohort: true },
    });
    if (!klass) throw new BadRequestException('Invalid liveClassId');
    await this.assertTemplateMutable(input.liveClassId);
    await this.assertNoScheduleConflicts({
      liveClassId: input.liveClassId,
      cohortId: klass.cohortId,
      weekday: input.weekday,
      startTime: input.startTime,
      endTime: input.endTime,
      instructorId: klass.instructorId,
    });

    const roomId = this.buildSessionRoomId();

    const schedule = await this.prisma.liveSchedule.create({
      data: {
        liveClassId: input.liveClassId,
        weekday: input.weekday,
        startTime: input.startTime,
        endTime: input.endTime,
        roomId: roomId,
      },
    });

    // Hybrid: pre-generate instances for near future so UI có data ngay.
    // Migration DB sẽ được chạy sau; nếu bảng chưa tồn tại thì bỏ qua để không chặn tạo template.
    if (klass.cohort?.startDate && klass.cohort?.endDate) {
      try {
        await this.generateInstancesForClassRange(input.liveClassId, requesterId);
      } catch (err) {
        this.logger.warn(
          `generateInstancesForClassRange skipped after create schedule: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    await this.audit.log({
      userId: requesterId,
      action: 'live_schedule.create',
      entity: 'LiveSchedule',
      entityId: schedule.id,
      description: `Created live schedule for liveClass: ${klass.name}`,
      newValues: {
        liveClassId: schedule.liveClassId,
        weekday: schedule.weekday,
        startTime: schedule.startTime,
      },
    });

    return schedule;
  }

  async join(id: string, userId: string, isAdmin = false) {
    if (!id) throw new BadRequestException('LiveSchedule id is required');
    const schedule = await this.prisma.liveSchedule.findUnique({
      where: { id },
      include: {
        liveClass: {
          include: {
            cohort: { include: { courseProfile: { select: { title: true } } } },
            instructor: { select: { id: true } },
          },
        },
      },
    });

    if (!schedule) throw new NotFoundException('Session not found');

    this.assertClassJoinable(schedule.liveClass.status as any);
    this.assertInJoinWindow(
      {
        weekday: schedule.weekday,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
      },
      isAdmin,
    );

    await this.assertJoinPermission(schedule, userId, isAdmin);
    const roomId = await this.ensureScheduleRoomId(
      schedule.id,
      schedule.roomId,
      schedule.liveClassId,
    );

    // 1) Check room active status (contract must match Meet handler: room.isActive)
    const roomExists = await this.sendNatsWithRetry(
      { cmd: 'room.isActive' },
      { roomId },
      2,
    ).catch(() => null);
    const isRoomActive = Boolean(
      roomExists?.res?.isActive ?? roomExists?.res?.status ?? false,
    );

    if (!isRoomActive) {
      if (!isAdmin) {
        throw new BadRequestException(
          'Phòng học chưa được giảng viên khởi tạo.',
        );
      }

      const roomTitle =
        schedule.liveClass.cohort?.courseProfile?.title ||
        schedule.liveClass.name;
      const roomInfo = this.getDefaultRoomInfo(roomId, roomTitle, {
        liveClassId: schedule.liveClassId,
        weekday: schedule.weekday,
        startTime: schedule.startTime,
      });

      await this.sendNatsWithRetry({ cmd: 'room.create' }, roomInfo, 2).catch(
        (err) => {
          this.logger.error(
            `Failed to create room ${roomId} for live class ${schedule.liveClassId}: ${err instanceof Error ? err.message : err
            }`,
          );
          throw new BadRequestException(
            'Không thể khởi tạo phòng học. Vui lòng thử lại.',
          );
        },
      );

      await this.audit.log({
        userId,
        action: 'live_schedule.room_create',
        entity: 'LiveSchedule',
        entityId: schedule.id,
        description: `Created meet room ${roomId} for live schedule`,
        metadata: { roomId, liveClassId: schedule.liveClassId },
      });
    }

    // 2) Generate join token with metadata
    const user = await this.getUserById(userId);

    const joinReq = create(GenerateTokenReqSchema, {
      roomId,
      userInfo: create(UserInfoSchema, {
        userId: userId,
        name: user?.displayName || (isAdmin ? 'Lecturer' : 'Student'),
        isAdmin: isAdmin,
        userMetadata: create(UserMetadataSchema, {
          profilePic: user?.avatarUrl || undefined,
          isAdmin: isAdmin,
        }),
      }),
    });

    const tokenRes = await this.sendNatsWithRetry(
      { cmd: 'user.generateJoinToken' },
      joinReq,
      2,
    );

    await this.audit.log({
      userId,
      action: 'live_schedule.join',
      entity: 'LiveSchedule',
      entityId: schedule.id,
      description: `User joined live schedule ${schedule.id} as ${isAdmin ? 'lecturer' : 'student'}`,
      metadata: {
        roomId,
        liveClassId: schedule.liveClassId,
        role: isAdmin ? 'lecturer' : 'student',
      },
    });

    return {
      token: tokenRes.token,
      roomId,
      userId: userId,
      roomTitle:
        schedule.liveClass.cohort?.courseProfile?.title ||
        schedule.liveClass.name,
    };
  }

  async joinBySessionId(sessionId: string, userId: string, isAdmin = false) {
    if (!sessionId) throw new BadRequestException('sessionId is required');
    const session = await this.prisma.liveScheduleSession.findUnique({
      where: { id: sessionId },
      include: {
        liveClass: {
          include: {
            cohort: { include: { courseProfile: { select: { title: true } } } },
            instructor: { select: { id: true } },
          },
        },
      },
    });

    if (!session) throw new NotFoundException('Session not found');

    if (session.status !== 'SCHEDULED') {
      throw new BadRequestException(
        'Buổi học đã bị hủy hoặc đã được dời. Chỉ buổi có trạng thái SCHEDULED mới được tham gia.',
      );
    }

    this.assertClassJoinable(session.liveClass.status);
    this.assertInJoinWindowForSession(
      {
        sessionDate: session.sessionDate,
        startTime: session.startTime,
        endTime: session.endTime,
      },
      isAdmin,
    );

    // Reuse existing permission logic (class enrollment/role checks) by faking a schedule-like shape.
    await this.assertJoinPermission(
      {
        id: sessionId,
        liveClassId: session.liveClassId,
        liveClass: session.liveClass,
      } as any,
      userId,
      isAdmin,
    );

    const roomId = await this.ensureSessionRoomId(sessionId, session.roomId);

    const roomExists = await this.sendNatsWithRetry(
      { cmd: 'room.isActive' },
      { roomId },
      2,
    ).catch(() => null);
    const isRoomActive = Boolean(
      roomExists?.res?.isActive ?? roomExists?.res?.status ?? false,
    );

    if (!isRoomActive) {
      if (!isAdmin) {
        throw new BadRequestException(
          'Phòng học chưa được giảng viên khởi tạo.',
        );
      }

      const roomTitle =
        session.liveClass.cohort?.courseProfile?.title ||
        session.liveClass.name;
      const roomInfo = this.getDefaultRoomInfo(roomId, roomTitle, {
        liveClassId: session.liveClassId,
        weekday: new Date(session.sessionDate).getUTCDay(),
        startTime: session.startTime,
      });

      await this.sendNatsWithRetry({ cmd: 'room.create' }, roomInfo, 2).catch(
        (err) => {
          this.logger.error(
            `Failed to create room ${roomId} for live session ${sessionId}: ${err instanceof Error ? err.message : err
            }`,
          );
          throw new BadRequestException(
            'Không thể khởi tạo phòng học. Vui lòng thử lại.',
          );
        },
      );

      await this.audit.log({
        userId,
        action: 'live_session.room_create',
        entity: 'LiveScheduleSession',
        entityId: sessionId,
        description: `Created meet room ${roomId} for live session`,
        metadata: { roomId, liveClassId: session.liveClassId },
      });
    }

    const user = await this.getUserById(userId);

    const joinReq = create(GenerateTokenReqSchema, {
      roomId,
      userInfo: create(UserInfoSchema, {
        userId: userId,
        name: user?.displayName || (isAdmin ? 'Lecturer' : 'Student'),
        isAdmin: isAdmin,
        userMetadata: create(UserMetadataSchema, {
          profilePic: user?.avatarUrl || undefined,
          isAdmin: isAdmin,
        }),
      }),
    });

    const tokenRes = await this.sendNatsWithRetry(
      { cmd: 'user.generateJoinToken' },
      joinReq,
      2,
    );

    await this.audit.log({
      userId,
      action: 'live_session.join',
      entity: 'LiveScheduleSession',
      entityId: sessionId,
      description: `User joined live session ${sessionId} as ${isAdmin ? 'lecturer' : 'student'}`,
      metadata: {
        roomId,
        liveClassId: session.liveClassId,
        role: isAdmin ? 'lecturer' : 'student',
      },
    });

    return {
      token: tokenRes.token,
      roomId,
      userId: userId,
      roomTitle:
        session.liveClass.cohort?.courseProfile?.title ||
        session.liveClass.name,
    };
  }

  async update(
    id: string,
    input: LiveScheduleUpdateDto,
    requesterId = 'SYSTEM',
  ) {
    const oldSchedule = await this.findById(id);
    await this.assertTemplateMutable(oldSchedule.liveClassId);
    const klass = await this.prisma.liveClass.findUnique({
      where: { id: oldSchedule.liveClassId },
      include: { cohort: true },
    });
    await this.assertNoScheduleConflicts({
      liveClassId: oldSchedule.liveClassId,
      cohortId: klass?.cohortId,
      weekday: input.weekday ?? oldSchedule.weekday,
      startTime: input.startTime ?? oldSchedule.startTime,
      endTime: input.endTime ?? oldSchedule.endTime,
      instructorId: klass?.instructorId,
      excludeScheduleId: id,
    });

    const updated = await this.prisma.liveSchedule.update({
      where: { id },
      data: {
        weekday: input.weekday,
        startTime: input.startTime,
        endTime: input.endTime,
      },
    });

    const actorId = requesterId === 'SYSTEM' ? null : requesterId;

    // Hybrid: re-generate horizon gần để reflect thay đổi template
    if (klass?.cohort?.startDate && klass?.cohort?.endDate) {
      try {
        await this.generateInstancesForClassRange(
          oldSchedule.liveClassId,
          requesterId,
        );
      } catch (err) {
        this.logger.warn(
          `generateInstancesForClassRange skipped after update schedule: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    await this.audit.log({
      userId: requesterId,
      action: 'live_schedule.update',
      entity: 'LiveSchedule',
      entityId: id,
      description: `Updated live schedule for session ${id}`,
      oldValues: {
        weekday: oldSchedule.weekday,
        startTime: oldSchedule.startTime,
      },
      newValues: {
        weekday: updated.weekday,
        startTime: updated.startTime,
      },
    });

    return updated;
  }

  async listSessionsForClassRange(liveClassId: string, from: Date, to: Date) {
    const items = await this.prisma.liveScheduleSession.findMany({
      where: {
        liveClassId,
        sessionDate: {
          gte: this.startOfDay(from),
          lte: this.startOfDay(to),
        },
        status: { in: ['SCHEDULED', 'COMPLETED', 'ONGOING'] }, // Exclude CANCELLED, RESCHEDULED
      },
      orderBy: [{ sessionDate: 'asc' }, { startTime: 'asc' }, { id: 'asc' }],
    });
    return items.map((s) => ({
      ...s,
      ...this.attachComputedScheduleFields(s),
    }));
  }

  /** Lịch buổi LIVE của học viên trong khoảng ngày + trạng thái điểm danh (nếu có). */
  async getLearnerScheduleWithAttendance(userId: string, from: Date, to: Date) {
    const fromDay = this.startOfDay(from);
    const toDay = this.startOfDay(to);

    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        userId,
        status: 'ACTIVE',
      },
      include: {
        liveClass: {
          select: {
            id: true,
            name: true,
            cohort: {
              include: {
                courseProfile: { select: { title: true, thumbnailUrl: true } },
              },
            },
          },
        },
      },
    });

    const rows: Array<{
      session: Awaited<
        ReturnType<LiveScheduleService['listSessionsForClassRange']>
      >[number];
      courseTitle: string;
      courseThumbnail: string | null;
    }> = [];

    for (const e of enrollments) {
      if (!e.liveClassId || !e.liveClass) continue;
      await this.generateInstancesForClassRange(e.liveClassId, 'SYSTEM');
      const sessions = await this.listSessionsForClassRange(
        e.liveClassId,
        fromDay,
        toDay,
      );
      const courseTitle =
        e.liveClass.cohort?.courseProfile?.title?.trim() || e.liveClass.name;
      const courseThumbnail =
        e.liveClass.cohort?.courseProfile?.thumbnailUrl ?? null;
      for (const s of sessions) {
        rows.push({ session: s, courseTitle, courseThumbnail });
      }
    }

    const sessionIds = [...new Set(rows.map((r) => r.session.id))];
    const attendances =
      sessionIds.length > 0
        ? await this.prisma.classAttendance.findMany({
          where: { userId, sessionId: { in: sessionIds } },
          select: { sessionId: true, status: true },
        })
        : [];
    const attMap = new Map(attendances.map((a) => [a.sessionId, a.status]));

    rows.sort((a, b) => {
      const tA =
        a.session.sessionDate.getTime() - b.session.sessionDate.getTime();
      if (tA !== 0) return tA;
      return (a.session.startTime || '').localeCompare(
        b.session.startTime || '',
      );
    });

    return rows.map((r) => ({
      ...r.session,
      courseTitle: r.courseTitle,
      courseThumbnail: r.courseThumbnail,
      attendanceStatus: attMap.get(r.session.id) ?? null,
    }));
  }

  async generateInstancesForClassRange(
    liveClassId: string,
    requesterId = 'SYSTEM',
  ) {
    if (!liveClassId) throw new BadRequestException('liveClassId is required');
    const klass = await this.prisma.liveClass.findUnique({
      where: { id: liveClassId },
      include: { cohort: true },
    });
    if (!klass) throw new BadRequestException('Invalid liveClassId');

    // Clamp the requested range into the Class boundaries
    const classStart = klass.cohort?.startDate
      ? this.startOfDay(klass.cohort.startDate)
      : null;
    const classEnd = klass.cohort?.endDate
      ? this.startOfDay(klass.cohort.endDate)
      : null;

    if (!classStart || !classEnd) {
      // If no boundaries, we cannot safely target any range.
      return {
        ok: true,
        upserted: 0,
        message: 'Class range is not set. No sessions generated.',
      };
    }

    const start = classStart;
    const end = classEnd;

    if (end < start) {
      // Range is empty or invalid.
      return { ok: true, upserted: 0 };
    }

    const templates = await this.prisma.liveSchedule.findMany({
      where: { liveClassId },
      select: {
        id: true,
        weekday: true,
        startTime: true,
        endTime: true,
        roomId: true,
      },
      orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }, { id: 'asc' }],
    });

    let cursor = start;
    const ops: Array<
      ReturnType<PrismaService['liveScheduleSession']['upsert']>
    > = [];
    const generatedSlots: Array<{
      sessionDate: Date;
      startTime: string;
      endTime: string;
    }> = [];

    while (true) {
      const weekday = cursor.getUTCDay(); // 0-6, align với LiveSchedule.weekday
      const matches = templates.filter((t) => t.weekday === weekday);

      for (const t of matches) {
        const sessionDate = this.startOfDay(cursor);
        generatedSlots.push({
          sessionDate,
          startTime: t.startTime,
          endTime: t.endTime,
        });

        const roomId = t.roomId || this.buildSessionRoomId();

        const actorId = requesterId === 'SYSTEM' ? null : requesterId;

        ops.push(
          this.prisma.liveScheduleSession.upsert({
            where: {
              liveClassId_sessionDate_startTime_endTime: {
                liveClassId,
                sessionDate,
                startTime: t.startTime,
                endTime: t.endTime,
              },
            },
            create: {
              liveClassId,
              scheduleId: t.id,
              sessionDate,
              startTime: t.startTime,
              endTime: t.endTime,
              status: 'SCHEDULED',
              roomId,
              instructorId: klass.instructorId ?? undefined,
              createdBy: actorId,
              updatedBy: actorId,
            },
            update: {
              scheduleId: t.id,
              roomId,
              instructorId: klass.instructorId ?? undefined,
              updatedBy: actorId,
            },
          }),
        );
      }

      if (cursor.getTime() >= end.getTime()) break;
      cursor = this.addDays(cursor, 1);
    }

    await this.prisma.$transaction(ops);

    // After upserting all valid sessions, cleanup "orphaned" template-linked sessions
    // that are still SCHEDULED but no longer match any current template slot in this range.
    // This handles the case where a schedule's time or weekday was changed.
    try {
      await this.prisma.liveScheduleSession.deleteMany({
        where: {
          liveClassId,
          sessionDate: { gte: start, lte: end },
          scheduleId: { not: null },
          status: 'SCHEDULED',
          NOT: {
            OR: generatedSlots.map((slot) => ({
              sessionDate: slot.sessionDate,
              startTime: slot.startTime,
              endTime: slot.endTime,
            })),
          },
        },
      });
    } catch (err) {
      this.logger.warn(
        `Orphan session cleanup failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    // After bulk operations, perform a general perimeter cleanup:
    // Delete any SCHEDULED session (connected to a template) that falls OUTSIDE the class range.
    // This wipes out legacy "ghost" data if openingDate/closingDate was narrowed mid-way.
    try {
      await this.prisma.liveScheduleSession.deleteMany({
        where: {
          liveClassId,
          status: 'SCHEDULED',
          scheduleId: { not: null },
          OR: [
            { sessionDate: { lt: classStart } },
            { sessionDate: { gt: classEnd } },
          ],
        },
      });
    } catch (err) {
      this.logger.error(
        `Perimeter cleanup failed for class ${liveClassId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return { ok: true, upserted: ops.length };
  }

  async delete(id: string, requesterId = 'SYSTEM') {
    if (!id) throw new BadRequestException('LiveSchedule id is required');
    const schedule = await this.prisma.liveSchedule.findUnique({
      where: { id },
      include: {
        liveClass: {
          select: {
            status: true,
            liveSchedules: { select: { id: true } },
          },
        },
      },
    });
    if (!schedule) throw new NotFoundException('LiveSchedule not found');

    const { liveClass: klass } = schedule;
    await this.assertTemplateMutable(schedule.liveClassId);
    const isLastSchedule = klass.liveSchedules.length <= 1;
    const isActiveClass = ['OPENING'].includes(String(klass.status));
    if (isLastSchedule && isActiveClass) {
      throw new BadRequestException(
        'Cannot delete the last schedule of an active class. Cancel the class first.',
      );
    }

    await this.prisma.liveSchedule.delete({ where: { id } });

    await this.audit.log({
      userId: requesterId,
      action: 'live_schedule.delete',
      entity: 'LiveSchedule',
      entityId: id,
      description: `Deleted live schedule session ${id}`,
      metadata: { weekday: schedule.weekday, startTime: schedule.startTime },
    });

    return { ok: true };
  }

  async previewConflict(input: LiveScheduleConflictPreviewDto) {
    if (!input.liveClassId) {
      throw new BadRequestException('liveClassId is required');
    }
    const klass = await this.prisma.liveClass.findUnique({
      where: { id: input.liveClassId },
      select: { instructorId: true, id: true, cohortId: true },
    });
    if (!klass) {
      throw new BadRequestException('Invalid liveClassId');
    }

    const sessionDate = new Date(input.sessionDate);
    if (Number.isNaN(sessionDate.getTime())) {
      throw new BadRequestException('Invalid sessionDate');
    }
    sessionDate.setUTCHours(0, 0, 0, 0);

    const inClassCandidates = await this.prisma.liveScheduleSession.findMany({
      where: {
        liveClassId: input.liveClassId,
        sessionDate,
        id: input.excludeSessionId
          ? { not: input.excludeSessionId }
          : undefined,
        status: { in: ['SCHEDULED'] },
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        liveClassId: true,
      },
    });
    const inClassConflicts = inClassCandidates.filter((candidate) =>
      this.isTimeOverlap(
        input.startTime,
        input.endTime,
        candidate.startTime,
        candidate.endTime,
      ),
    );

    let teacherConflicts: Array<{
      id: string;
      startTime: string;
      endTime: string;
      liveClassId: string;
      classCode: string;
      className: string;
    }> = [];

    if (klass.instructorId) {
      // Check conflict by: teacherId + sessionDate + startTime/endTime overlap
      // Do NOT filter by cohortId — a teacher cannot have two overlapping sessions
      // on the same date/time regardless of which cohort each class belongs to.
      const teacherCandidates = await this.prisma.liveScheduleSession.findMany({
        where: {
          sessionDate,
          id: input.excludeSessionId
            ? { not: input.excludeSessionId }
            : undefined,
          liveClass: {
            instructorId: klass.instructorId,
            status: {
              in: ['DRAFT', 'OPENING'],
            },
          },
        },
        select: {
          id: true,
          startTime: true,
          endTime: true,
          liveClass: {
            select: { id: true, code: true, name: true, cohortId: true },
          },
        },
      });

      teacherConflicts = (teacherCandidates as any[])
        .filter((c) => c.liveClass.id !== input.liveClassId)
        .filter((c: any) =>
          this.isTimeOverlap(
            input.startTime,
            input.endTime,
            c.startTime,
            c.endTime,
          ),
        )
        .map((c) => ({
          id: c.id,
          startTime: c.startTime,
          endTime: c.endTime,
          liveClassId: c.liveClass.id,
          classCode: c.liveClass.code,
          className: c.liveClass.name,
        }));
    }

    const conflict = { inClassConflicts, teacherConflicts };

    return {
      hasConflict:
        conflict.inClassConflicts.length > 0 ||
        conflict.teacherConflicts.length > 0,
      ...conflict,
    };
  }

  async findAllRequests(query: LiveScheduleRequestQueryDto) {
    const fs = require('fs');
    const logMsg = `\n[${new Date().toISOString()}] findAllRequests query: ${JSON.stringify(query)}\n`;
    fs.appendFileSync('/tmp/debug-requests.log', logMsg);

    const fromDate = query.fromDate ? new Date(query.fromDate) : undefined;
    const toDate = query.toDate ? new Date(query.toDate) : undefined;
    const results = await this.prisma.liveScheduleRequest.findMany({
      where: {
        liveClassId: query.liveClassId,
        sessionId: query.sessionId,
        status: query.status as any,
        requestedBy: query.requestedBy,
        requestedDate:
          fromDate || toDate
            ? {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: toDate } : {}),
            }
            : undefined,
      },

      include: {
        session: {
          select: {
            id: true,
            liveClassId: true,
            startTime: true,
            endTime: true,
            sessionDate: true,
            liveClass: {
              select: {
                id: true,
              },
            },
          },
        },
        requester: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    fs.appendFileSync('/tmp/debug-requests.log', `[DEBUG] findAllRequests found ${results.length} results\n`);
    if (results.length > 0) {
      fs.appendFileSync('/tmp/debug-requests.log', `[DEBUG] First result ID: ${results[0].id}\n`);
    }
    return results;
  }

  async createRequest(
    input: LiveScheduleRequestCreateDto,
    requesterId: string,
  ) {
    if (!input.sessionId)
      throw new BadRequestException('sessionId is required');
    const session = await this.prisma.liveScheduleSession.findUnique({
      where: { id: input.sessionId },
      include: {
        liveClass: {
          select: {
            instructorId: true,
            id: true,
            name: true,
          },
        },
      },
    });
    if (!session) throw new NotFoundException('LiveScheduleSession not found');

    await this.assertCanCreateScheduleRequest(
      requesterId,
      session.liveClass.instructorId,
    );

    const requestedDate = new Date(session.sessionDate);

    if (
      !input.proposedDate ||
      !input.proposedStartTime ||
      !input.proposedEndTime
    ) {
      throw new BadRequestException(
        'Reschedule request must provide proposedDate, proposedStartTime, proposedEndTime',
      );
    }

    const preview = await this.previewConflict({
      liveClassId: session.liveClassId,
      sessionDate: input.proposedDate,
      startTime: input.proposedStartTime,
      endTime: input.proposedEndTime,
      excludeSessionId: input.sessionId,
    });
    if (preview.hasConflict) {
      throw new BadRequestException(
        'Proposed reschedule conflicts with existing class/teacher schedules',
      );
    }

    const request = await this.prisma.liveScheduleRequest.create({
      data: {
        sessionId: input.sessionId,
        liveClassId: session.liveClassId,
        requestedBy: requesterId,
        type: 'RESCHEDULE' as any,
        status: 'PENDING' as any,
        reason: input.reason,
        requestedDate: requestedDate,
        originalWeekday: requestedDate.getDay(),
        originalStartTime: session.startTime,
        originalEndTime: session.endTime,
        proposedDate: input.proposedDate
          ? new Date(input.proposedDate)
          : undefined,
        proposedStartTime: input.proposedStartTime,
        proposedEndTime: input.proposedEndTime,
        proposedTeacherId: input.proposedTeacherId,
      },
    });

    await this.audit.log({
      userId: requesterId,
      action: 'live_schedule_request.create',
      entity: 'LiveScheduleRequest',
      entityId: request.id,
      description: `Created RESCHEDULE request for live session ${input.sessionId}`,
      metadata: {
        sessionId: input.sessionId,
        type: 'RESCHEDULE',
        requestedDate: session.sessionDate,
      },
    });

    return request;
  }

  async cancelRequest(id: string, requesterId: string) {
    if (!id)
      throw new BadRequestException('LiveScheduleRequest id is required');
    const request = await this.prisma.liveScheduleRequest.findUnique({
      where: { id },
    });
    if (!request) throw new NotFoundException('LiveScheduleRequest not found');
    if (request.requestedBy !== requesterId) {
      throw new BadRequestException('Only requester can cancel this request');
    }
    if (request.status !== 'PENDING') {
      throw new BadRequestException('Only PENDING request can be cancelled');
    }

    const updated = await this.prisma.liveScheduleRequest.update({
      where: { id },
      data: { status: 'CANCELLED' as any },
    });

    await this.audit.log({
      userId: requesterId,
      action: 'live_schedule_request.cancel',
      entity: 'LiveScheduleRequest',
      entityId: id,
      description: `Cancelled live schedule request ${id}`,
    });

    return updated;
  }

  async approveRequest(
    id: string,
    input: LiveScheduleRequestApproveDto,
    reviewerId: string,
  ) {
    if (!id)
      throw new BadRequestException('LiveScheduleRequest id is required');
    const request = await this.prisma.liveScheduleRequest.findUnique({
      where: { id },
      include: {
        session: true,
      },
    });
    if (!request) throw new NotFoundException('LiveScheduleRequest not found');
    if (request.status !== 'PENDING') {
      throw new BadRequestException('Only PENDING request can be approved');
    }

    if (request.type !== 'RESCHEDULE') {
      throw new BadRequestException(
        'Only RESCHEDULE request type is supported',
      );
    }
    if (
      !request.proposedDate ||
      !request.proposedStartTime ||
      !request.proposedEndTime
    ) {
      throw new BadRequestException(
        'RESCHEDULE request is missing proposed slot',
      );
    }
    const preview = await this.previewConflict({
      liveClassId: request.session.liveClassId,
      sessionDate: request.proposedDate.toISOString().slice(0, 10),
      startTime: request.proposedStartTime,
      endTime: request.proposedEndTime,
      excludeSessionId: request.sessionId,
    });
    if (preview.hasConflict) {
      throw new BadRequestException(
        'Reschedule request now conflicts with existing schedules',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const session = await tx.liveScheduleSession.findUnique({
        where: { id: request.sessionId },
      });

      if (!session) {
        throw new NotFoundException('Original LiveScheduleSession not found');
      }

      if (session.status !== 'SCHEDULED') {
        throw new BadRequestException(
          `Cannot approve request: Original session is currently ${session.status}, must be SCHEDULED`,
        );
      }

      const oldSessionId = request.sessionId;
      const newDate = request.proposedDate!;
      const newStartTime = request.proposedStartTime!;
      const newEndTime = request.proposedEndTime!;

      // 1. Create or Update the new session at the proposed slot
      // Use upsert to handle case where a template session already existed at that slot
      const newSession = await tx.liveScheduleSession.upsert({
        where: {
          liveClassId_sessionDate_startTime_endTime: {
            liveClassId: request.session.liveClassId,
            sessionDate: newDate,
            startTime: newStartTime,
            endTime: newEndTime,
          },
        },
        create: {
          liveClassId: request.session.liveClassId,
          sessionDate: newDate,
          startTime: newStartTime,
          endTime: newEndTime,
          status: 'SCHEDULED',
          scheduleId: null, // Dissociate from template so cleanup/generator doesn't touch it
          roomId: request.session.roomId, // Carry over roomId if possible or create new one
          instructorId:
            request.proposedTeacherId ??
            request.session.instructorId ??
            undefined,
          createdBy: reviewerId,
          updatedBy: reviewerId,
          note: `Bù của buổi dời từ ngày ${request.session.sessionDate.toISOString().slice(0, 10)} (${request.session.startTime})`,
        },
        update: {
          status: 'SCHEDULED', // Ensure it's active
          scheduleId: null, // Dissociate
          instructorId:
            request.proposedTeacherId ??
            request.session.instructorId ??
            undefined,
          updatedBy: reviewerId,
          note: `Bù của buổi dời từ ngày ${request.session.sessionDate.toISOString().slice(0, 10)} (${request.session.startTime})`,
        },
      });

      // 2. Mark the OLD session as RESCHEDULED to "occupy" the slot and hide it from views
      await tx.liveScheduleSession.update({
        where: { id: oldSessionId },
        data: {
          status: 'RESCHEDULED',
          supersededBySessionId: newSession.id,
          updatedBy: reviewerId,
          note: `Đã dời sang ngày ${newDate.toISOString().slice(0, 10)} (${newStartTime})`,
        },
      });

      await tx.liveScheduleRequest.update({
        where: { id },
        data: {
          status: 'APPROVED' as any,
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
          reviewNote: input.reviewNote,
        },
      });

      // 4. Notify Students
      // We run this after the transaction implicitly in the service logic (or here if we want absolute consistency)
      // For performance and reliability, we'll fetch details and emit events AFTER transaction success.
    });

    // Fetch details for notification
    const fullRequest = (await this.prisma.liveScheduleRequest.findUnique({
      where: { id },
      include: {
        session: {
          include: {
            liveClass: {
              include: {
                enrollments: {
                  where: { status: 'ACTIVE' },
                  include: { user: { select: { id: true, email: true, displayName: true } } },
                },
              },
            },
          },
        },
      },
    })) as any;

    if (fullRequest?.session?.liveClass) {
      const session = fullRequest.session;
      const liveClass = session.liveClass;
      const oldVnDate = this.formatDateInTimeZone(session.sessionDate, 'Asia/Ho_Chi_Minh');
      const newVnDate = this.formatDateInTimeZone(fullRequest.proposedDate!, 'Asia/Ho_Chi_Minh');

      const oldDisplay = `${oldVnDate} ${session.startTime}`;
      const newDisplay = `${newVnDate} ${fullRequest.proposedStartTime}`;

      const courseUrl = `${this.appConfig.server.webUrl}/academy/live-classes/${liveClass.id}`;

      for (const enrollment of liveClass.enrollments) {
        if (!enrollment.user.email) continue;

        // 1. Send Email
        this.nats.emit(
          { cmd: 'send_email' },
          {
            type: 'live_class_rescheduled',
            to: enrollment.user.email,
            data: {
              displayName: enrollment.user.displayName || 'Học viên',
              courseName: liveClass.name,
              oldDateTime: oldDisplay,
              newDateTime: newDisplay,
              courseUrl,
              reason: fullRequest.reason,
            },
          },
        );

        // 2. Send In-app Notification
        this.nats.emit(
          { cmd: 'send_notification' },
          {
            recipientId: enrollment.user.id,
            type: 'system',
            payload: {
              title: 'Lịch học đã được thay đổi',
              body: `Buổi học lớp "${liveClass.name}" đã dời từ ${oldDisplay} sang ${newDisplay}.`,
              metadata: {
                entityType: 'LIVE_SCHEDULE_SESSION',
                entityId: session.id,
                liveClassId: liveClass.id,
                oldDateTime: oldDisplay,
                newDateTime: newDisplay,
              },
            },
          },
        );
      }

      this.logger.log(
        `Sent reschedule notifications to ${liveClass.enrollments.length} students for class ${liveClass.id}`,
      );
    }

    await this.audit.log({
      userId: reviewerId,
      action: 'live_schedule_request.approve',
      entity: 'LiveScheduleRequest',
      entityId: id,
      description: `Approved live schedule request ${id}`,
      metadata: { reviewNote: input.reviewNote },
    });

    return this.prisma.liveScheduleRequest.findUnique({ where: { id } });
  }

  async rejectRequest(
    id: string,
    input: LiveScheduleRequestRejectDto,
    reviewerId: string,
  ) {
    if (!id)
      throw new BadRequestException('LiveScheduleRequest id is required');
    const request = await this.prisma.liveScheduleRequest.findUnique({
      where: { id },
    });
    if (!request) throw new NotFoundException('LiveScheduleRequest not found');
    if (request.status !== 'PENDING') {
      throw new BadRequestException('Only PENDING request can be rejected');
    }

    const updated = await this.prisma.liveScheduleRequest.update({
      where: { id },
      data: {
        status: 'REJECTED' as any,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewNote: input.reviewNote,
      },
    });

    if (request.requestedBy && request.requestedBy !== reviewerId) {
      try {
        this.nats.emit(
          { cmd: 'send_notification' },
          {
            recipientId: request.requestedBy,
            type: 'system',
            payload: {
              title: 'Yêu cầu của bạn đã bị từ chối',
              body: 'Yêu cầu dời lịch của bạn đã bị từ chối.',
              metadata: {
                entityType: 'LIVE_SCHEDULE_REQUEST',
                entityId: request.id,
                status: 'REJECTED',
                rejectionReason: input.reviewNote ?? '',
                sessionId: request.sessionId,
                liveClassId: request.liveClassId,
              },
            },
          },
        );
      } catch (error: any) {
        this.logger.warn(
          `Failed to send reject notification for live schedule request ${id}: ${error?.message || String(error)}`,
        );
      }
    }

    await this.audit.log({
      userId: reviewerId,
      action: 'live_schedule_request.reject',
      entity: 'LiveScheduleRequest',
      entityId: id,
      description: `Rejected live schedule request ${id}`,
      metadata: { reviewNote: input.reviewNote },
    });

    return updated;
  }

  private getDefaultRoomInfo(
    roomId: string | null,
    roomTitle = 'Lớp học trực tuyến',
    extra?: {
      liveClassId?: string;
      weekday?: number;
      startTime?: string;
    },
  ) {
    return {
      roomId: roomId,
      liveClassId: extra?.liveClassId,
      weekday: extra?.weekday,
      startTime: extra?.startTime,
      emptyTimeout: 60 * 60 * 2,
      metadata: create(RoomMetadataSchema, {
        roomTitle: roomTitle,
        welcomeMessage:
          'Chào mừng bạn đến với buổi học trực tuyến! Hãy cùng nhau có những trải nghiệm học tập thú vị nhé.',
        roomFeatures: create(RoomCreateFeaturesSchema, {
          allowWebcams: true,
          muteOnStart: false,
          allowScreenShare: true,
          allowRtmp: true,
          adminOnlyWebcams: false,
          allowViewOtherWebcams: true,
          allowViewOtherUsersList: true,
          roomDuration: '0',
          enableAnalytics: true,
          allowVirtualBg: true,
          allowRaiseHand: true,
          recordingFeatures: {
            isAllow: true,
            isAllowCloud: true,
            isAllowLocal: true,
            enableAutoCloudRecording: false,
            onlyRecordAdminWebcams: false,
          },
          chatFeatures: {
            isAllow: true,
            isAllowFileUpload: true,
            maxFileSize: '50',
            allowedFileTypes: ['jpg', 'png', 'zip', 'pdf'],
          },
          whiteboardFeatures: {
            isAllow: true,
          },
          externalMediaPlayerFeatures: {
            isAllow: true,
          },
          waitingRoomFeatures: {
            isActive: true,
          },
          breakoutRoomFeatures: {
            isAllow: true,
            allowedNumberRooms: 6,
          },
          displayExternalLinkFeatures: {
            isAllow: true,
          },
          ingressFeatures: {
            isAllow: true,
          },
          pollsFeatures: {
            isAllow: true,
          },
          insightsFeatures: {
            isAllow: true,
            transcriptionFeatures: {
              isAllow: true,
              isAllowTranslation: true,
              isAllowSpeechSynthesis: true,
            },
            chatTranslationFeatures: {
              isAllow: true,
            },
            aiFeatures: {
              isAllow: true,
              aiTextChatFeatures: {
                isAllow: true,
              },
              meetingSummarizationFeatures: {
                isAllow: true,
              },
            },
          },
          endToEndEncryptionFeatures: {
            isEnabled: false,
            includedChatMessages: false,
            includedWhiteboard: false,
            enabledSelfInsertEncryptionKey: false,
          },
        }),
      }),
    };
  }

  private assertClassJoinable(classStatus: string) {
    if (classStatus !== 'IN_PROGRESS') {
      throw new BadRequestException(
        'Class is not available for live sessions in current status.',
      );
    }
  }

  private assertInJoinWindow(
    schedule: {
      weekday: number;
      startTime: string;
      endTime: string;
    },
    isAdmin: boolean,
  ) {
    // Dev-only bypass to help testing room activation/joins.
    // Enable by setting env: DISABLE_LIVE_SESSION_JOIN_WINDOW=true
    if (isAdmin) {
      return;
    }
    const now = new Date();

    // Schedules are defined in Vietnam local time (Asia/Ho_Chi_Minh).
    const todayYmd = this.formatDateInTimeZone(now, 'Asia/Ho_Chi_Minh'); // yyyy-MM-dd
    // Use noon to avoid any edge issues when converting across timezones.
    const vnNoonInstant = this.buildInstantFromVnDateTime(todayYmd, '12:00');
    const vnNowWeekday = vnNoonInstant.getUTCDay();

    if (vnNowWeekday !== schedule.weekday) {
      throw new BadRequestException('Session is not available on this weekday.');
    }

    const sessionStart = this.buildInstantFromVnDateTime(todayYmd, schedule.startTime);
    const sessionEnd = this.buildInstantFromVnDateTime(todayYmd, schedule.endTime);

    const joinOpenAt = new Date(sessionStart.getTime() - 30 * 60 * 1000);
    const joinCloseAt = new Date(sessionEnd.getTime() + 4 * 60 * 60 * 1000);
    if (now < joinOpenAt || now > joinCloseAt) {
      throw new BadRequestException(
        'Session join window is closed. You can join 30 minutes before start and up to 4 hours after end.',
      );
    }
  }

  private assertInJoinWindowForSession(
    input: {
      sessionDate: Date;
      startTime: string;
      endTime: string;
    },
    isAdmin: boolean,
  ) {
    if (
      isAdmin &&
      process.env.DISABLE_LIVE_SESSION_JOIN_WINDOW === 'true' &&
      process.env.NODE_ENV !== 'production'
    ) {
      return;
    }

    const now = new Date();

    // LIVE schedules are defined in Vietnam local time (Asia/Ho_Chi_Minh).
    // Build join window using VN wall time to avoid UTC +/-7 drift.
    const sessionYmd = this.formatDateInTimeZone(input.sessionDate, 'Asia/Ho_Chi_Minh'); // yyyy-MM-dd
    const sessionStart = this.buildInstantFromVnDateTime(sessionYmd, input.startTime);
    const sessionEnd = this.buildInstantFromVnDateTime(sessionYmd, input.endTime);

    const joinOpenAt = new Date(sessionStart.getTime() - 30 * 60 * 1000);
    const joinCloseAt = new Date(sessionEnd.getTime() + 4 * 60 * 60 * 1000);
    if (now < joinOpenAt || now > joinCloseAt) {
      throw new BadRequestException(
        'Session join window is closed. You can join 30 minutes before start and up to 4 hours after end.',
      );
    }
  }

  private formatDateInTimeZone(date: Date, timeZone: string) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date(date));
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const d = parts.find((p) => p.type === 'day')?.value;
    return `${y}-${m}-${d}`;
  }

  private buildInstantFromVnDateTime(dateYmd: string, timeHHmm: string) {
    const [y, m, d] = dateYmd.split('-').map(Number);
    const [hh, mm] = this.parseHourMinute(timeHHmm);
    // VN timezone is UTC+7 with no DST.
    const utcMs = Date.UTC(y, m - 1, d, hh - 7, mm, 0, 0);
    return new Date(utcMs);
  }

  private async ensureSessionRoomId(
    sessionId: string,
    existingRoomId: string | null,
  ) {
    if (existingRoomId?.trim()) return existingRoomId.trim();
    const roomId = this.buildSessionRoomId();
    await this.prisma.liveScheduleSession.update({
      where: { id: sessionId },
      data: { roomId },
    });
    return roomId;
  }

  private parseHourMinute(time: string) {
    const [hourText, minuteText] = (time || '').split(':');
    const hour = Number(hourText);
    const minute = Number(minuteText);
    if (
      Number.isNaN(hour) ||
      Number.isNaN(minute) ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    ) {
      throw new BadRequestException(`Invalid time format: ${time}`);
    }
    return [hour, minute] as const;
  }

  private startOfDay(d: Date) {
    const x = new Date(d);
    x.setUTCHours(0, 0, 0, 0);
    return x;
  }

  private addDays(d: Date, days: number) {
    const x = new Date(d);
    x.setUTCDate(x.getUTCDate() + days);
    return x;
  }

  private isTimeOverlap(
    startA: string,
    endA: string,
    startB: string,
    endB: string,
  ) {
    const [aStartHour, aStartMinute] = this.parseHourMinute(startA);
    const [aEndHour, aEndMinute] = this.parseHourMinute(endA);
    const [bStartHour, bStartMinute] = this.parseHourMinute(startB);
    const [bEndHour, bEndMinute] = this.parseHourMinute(endB);

    const aStart = aStartHour * 60 + aStartMinute;
    const aEnd = aEndHour * 60 + aEndMinute;
    const bStart = bStartHour * 60 + bStartMinute;
    const bEnd = bEndHour * 60 + bEndMinute;
    if (aEnd <= aStart || bEnd <= bStart) {
      throw new BadRequestException('endTime must be greater than startTime');
    }
    return aStart < bEnd && bStart < aEnd;
  }

  async assertNoScheduleConflicts(input: {
    liveClassId?: string;
    cohortId?: string;
    weekday: number;
    startTime: string;
    endTime: string;
    instructorId?: string | null;
    excludeScheduleId?: string;
  }) {
    const conflict = await this.checkScheduleConflicts(input);
    if (conflict.inClassConflicts.length > 0) {
      throw new BadRequestException(
        'Schedule conflicts with existing slot in this class',
      );
    }
    if (conflict.teacherConflicts.length > 0) {
      throw new BadRequestException(
        'Giảng viên chính bị trùng lịch với một lớp học trực tuyến khác.',
      );
    }
  }

  async checkScheduleConflicts(input: {
    liveClassId?: string;
    cohortId?: string;
    weekday: number;
    startTime: string;
    endTime: string;
    instructorId?: string | null;
    excludeScheduleId?: string;
  }) {
    let targetStart: Date | null = null;
    let targetEnd: Date | null = null;
    let targetCohortId: string | null = input.cohortId || null;

    if (!targetCohortId && input.liveClassId) {
      const k = await this.prisma.liveClass.findUnique({
        where: { id: input.liveClassId },
        select: { cohortId: true, cohort: { select: { startDate: true, endDate: true } } },
      });
      if (k) {
        targetCohortId = k.cohortId;
        targetStart = k.cohort?.startDate || null;
        targetEnd = k.cohort?.endDate || null;
      }
    } else if (targetCohortId) {
      const c = await this.prisma.cohort.findUnique({
        where: { id: targetCohortId },
        select: { startDate: true, endDate: true },
      });
      targetStart = c?.startDate || null;
      targetEnd = c?.endDate || null;
    }
    const inClassCandidates = input.liveClassId ? await this.prisma.liveSchedule.findMany({
      where: {
        liveClassId: input.liveClassId,
        weekday: input.weekday,
        id: input.excludeScheduleId
          ? { not: input.excludeScheduleId }
          : undefined,
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        liveClassId: true,
      },
    }) : [];

    const inClassConflicts = inClassCandidates.filter((candidate) =>
      this.isTimeOverlap(
        input.startTime,
        input.endTime,
        candidate.startTime,
        candidate.endTime,
      ),
    );

    let teacherConflicts: Array<{
      id: string;
      startTime: string;
      endTime: string;
      liveClassId: string;
      classCode: string;
      className: string;
    }> = [];
    if (input.instructorId) {
      // Check conflict by: teacherId + dayOfWeek + startTime/endTime overlap
      // Do NOT filter by cohortId — a teacher cannot teach two overlapping classes
      // in the same weekday/time slot regardless of which cohort each class belongs to.
      const teacherCandidates = await this.prisma.liveSchedule.findMany({
        where: {
          weekday: input.weekday,
          id: input.excludeScheduleId
            ? { not: input.excludeScheduleId }
            : undefined,
          liveClass: {
            instructorId: input.instructorId,
            status: {
              in: ['DRAFT', 'OPENING'],
            },
          },
        },
        select: {
          id: true,
          startTime: true,
          endTime: true,
          liveClass: {
            select: {
              id: true,
              code: true,
              name: true,
              cohortId: true,
            },
          },
        },
      });

      teacherConflicts = teacherCandidates
        .filter(
          (candidate: any) =>
            !input.liveClassId || candidate.liveClass.id !== input.liveClassId,
        )
        .filter((candidate: any) =>
          this.isTimeOverlap(
            input.startTime,
            input.endTime,
            candidate.startTime,
            candidate.endTime,
          ),
        )
        .map((candidate: any) => ({
          id: candidate.id,
          startTime: candidate.startTime,
          endTime: candidate.endTime,
          liveClassId: candidate.liveClass.id,
          classCode: candidate.liveClass.code,
          className: candidate.liveClass.name,
        }));
    }

    return {
      inClassConflicts,
      teacherConflicts,
    };
  }

  private async assertCanCreateScheduleRequest(
    requesterId: string,
    instructorId?: string | null,
  ) {
    const perms = await this.getPermissionsByUserId(requesterId);
    const isTeachingOnly =
      perms.includes('lms.assessment.grade') &&
      !perms.some((p) =>
        [
          'lms.approval.manage',
          'lms.catalog.approve',
          'lms.delivery.approve',
          'lms.commerce.approve',
          'ops.user.manage',
        ].includes(p),
      );
    const isPrimaryTeacher = instructorId === requesterId;
    if (!isTeachingOnly || !isPrimaryTeacher) {
      throw new BadRequestException(
        'Only assigned teaching lecturer can create reschedule requests for their own class',
      );
    }
  }

  private async assertJoinPermission(
    schedule: {
      liveClassId: string;
      liveClass: {
        instructorId?: string | null;
      };
    },
    userId: string,
    isAdmin: boolean,
  ) {
    if (isAdmin) {
      const isPrimaryTeacher = schedule.liveClass.instructorId === userId;
      const perms = await this.getPermissionsByUserId(userId);
      const isAdminOverride = perms.some((p) =>
        ['lms.delivery.approve', 'lms.delivery.manage'].includes(
          p,
        ),
      );
      if (!isPrimaryTeacher && !isAdminOverride) {
        throw new BadRequestException(
          'Only assigned lecturer or authorized staff can start this live room.',
        );
      }
      return;
    }

    const activeEnrollment = await this.prisma.enrollment.findFirst({
      where: {
        liveClassId: schedule.liveClassId,
        userId,
        status: 'ACTIVE',
      },
      select: { id: true },
    });
    if (!activeEnrollment) {
      throw new BadRequestException(
        'You are not actively enrolled in this class.',
      );
    }
  }

  private async getUserById(userId: string) {
    const userRes = await firstValueFrom(
      this.nats.send({ cmd: 'identity.users.findById' }, { id: userId }),
    ).catch(() => null);
    return userRes?.user;
  }

  private async getPermissionsByUserId(userId: string): Promise<string[]> {
    const res = await firstValueFrom(
      this.nats.send(
        { cmd: 'identity.authz.getUserPermissionsByUserId' },
        { userId },
      ),
    ).catch(() => null);
    return (res?.permissions as string[]) || [];
  }

  private async ensureScheduleRoomId(
    scheduleId: string,
    roomId: string | null,
    liveClassId: string,
  ) {
    if (roomId?.trim()) {
      return roomId;
    }

    const generatedRoomId = this.buildSessionRoomId();
    await this.prisma.liveSchedule.update({
      where: { id: scheduleId },
      data: { roomId: generatedRoomId },
    });
    return generatedRoomId;
  }

  private async sendNatsWithRetry(
    pattern: Record<string, string>,
    payload: unknown,
    retries = 2,
    delayMs = 200,
  ) {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await firstValueFrom(this.nats.send(pattern, payload));
      } catch (error) {
        lastError = error;
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }
    throw lastError;
  }
}
