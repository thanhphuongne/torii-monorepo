import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaService } from '@server/shared/prisma/prisma.service';
import { firstValueFrom } from 'rxjs';

const VN_TZ = 'Asia/Ho_Chi_Minh';
const REMINDER_TYPE_STARTS_IN_30_MIN = 'STARTS_IN_30_MIN';

@Injectable()
export class LiveSessionReminderCronService {
  private readonly logger = new Logger(LiveSessionReminderCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('NATS_SERVICE') private readonly nats: ClientProxy,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async notifyLiveSessionsStartingSoon() {
    const now = new Date();
    const windowMs = 60_000; // tolerate scheduler drift

    // Lookahead window: sessions whose "remindAt" falls around now.
    // remindAt = sessionStart - 30 minutes
    const windowStart = new Date(now.getTime() - windowMs);
    const windowEnd = new Date(now.getTime() + windowMs);

    // Reduce scan scope by only checking sessions around today/tomorrow.
    const fromDay = this.startOfUtcDay(now);
    const toDay = this.addUtcDays(fromDay, 1);

    let sessions: Array<{
      id: string;
      liveClassId: string;
      sessionDate: Date;
      startTime: string;
      endTime: string;
      status: string;
      liveClass: {
        status: string;
        name: string;
        cohort: { courseProfile?: { title?: string | null } | null } | null;
      };
    }> = [];

    try {
      sessions = await this.prisma.liveScheduleSession.findMany({
        where: {
          status: 'SCHEDULED',
          sessionDate: { gte: fromDay, lte: toDay },
          liveClass: {
            status: { in: ['OPENING', 'IN_PROGRESS'] },
          },
        },
        select: {
          id: true,
          liveClassId: true,
          sessionDate: true,
          startTime: true,
          endTime: true,
          status: true,
          liveClass: {
            select: {
              status: true,
              name: true,
              cohort: {
                select: {
                  courseProfile: { select: { title: true } },
                },
              },
            },
          },
        },
        orderBy: [{ sessionDate: 'asc' }, { startTime: 'asc' }, { id: 'asc' }],
      });
    } catch (error: any) {
      this.logger.error(
        `Failed to query live sessions for reminders: ${error?.message || String(error)}`,
        error,
      );
      return;
    }

    if (sessions.length === 0) return;

    for (const s of sessions) {
      const sessionYmd = this.formatDateInTimeZone(s.sessionDate, VN_TZ);
      const sessionStart = this.buildInstantFromVnDateTime(sessionYmd, s.startTime);
      const remindAt = new Date(sessionStart.getTime() - 30 * 60 * 1000);

      // Only notify when remindAt falls into the window around now.
      if (remindAt < windowStart || remindAt > windowEnd) continue;

      // Find active learners enrolled in this class.
      const enrollments = await this.prisma.enrollment.findMany({
        where: {
          liveClassId: s.liveClassId,
          status: 'ACTIVE',
        },
        select: { userId: true },
      });

      if (enrollments.length === 0) continue;

      const courseTitle =
        s.liveClass.cohort?.courseProfile?.title?.trim() || s.liveClass.name;
      const timeText = `${s.startTime} (${sessionYmd})`;

      for (const e of enrollments) {
        const userId = e.userId;
        const dedupeKey = `LIVE_SESSION:${REMINDER_TYPE_STARTS_IN_30_MIN}:${s.id}`;

        await this.sendInAppAndPush({
          userId,
          title: 'Buổi học LIVE sắp bắt đầu',
          message: `Bạn có buổi học "${courseTitle}" sẽ diễn ra sau 30 phút nữa lúc ${timeText}.`,
          dedupeKey,
          metadata: {
            kind: 'LIVE_SESSION_REMINDER',
            remindType: REMINDER_TYPE_STARTS_IN_30_MIN,
            sessionId: s.id,
            liveClassId: s.liveClassId,
            sessionDate: sessionYmd,
            startTime: s.startTime,
            endTime: s.endTime,
            courseTitle,
          },
        });
      }
    }
  }

  private async sendInAppAndPush(input: {
    userId: string;
    title: string;
    message: string;
    dedupeKey: string;
    metadata: Record<string, any>;
  }) {
    try {
      await firstValueFrom(
        this.nats.send(
          { cmd: 'identity.notification.create' },
          {
            userId: input.userId,
            title: input.title,
            message: input.message,
            notificationType: 'live_session',
            metadata: input.metadata,
            sentVia: ['in_app', 'push'],
            dedupeKey: input.dedupeKey,
          },
        ),
      );
    } catch (error: any) {
      this.logger.warn(
        `Failed to send reminder notification to user ${input.userId}: ${error?.message || String(error)}`,
      );
    }
  }

  private startOfUtcDay(d: Date) {
    const x = new Date(d);
    x.setUTCHours(0, 0, 0, 0);
    return x;
  }

  private addUtcDays(d: Date, days: number) {
    const x = new Date(d);
    x.setUTCDate(x.getUTCDate() + days);
    return x;
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
      throw new Error(`Invalid time format: ${time}`);
    }
    return [hour, minute] as const;
  }

  private buildInstantFromVnDateTime(dateYmd: string, timeHHmm: string) {
    const [y, m, d] = dateYmd.split('-').map(Number);
    const [hh, mm] = this.parseHourMinute(timeHHmm);
    const utcMs = Date.UTC(y, m - 1, d, hh - 7, mm, 0, 0);
    return new Date(utcMs);
  }
}

