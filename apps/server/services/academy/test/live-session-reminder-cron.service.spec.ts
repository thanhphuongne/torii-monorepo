import { Test, TestingModule } from '@nestjs/testing';
import { LiveSessionReminderCronService } from '../src/modules/classroom/live-session-reminder-cron.service';
import { PrismaService } from '@server/shared/prisma/prisma.service';
import { of, throwError } from 'rxjs';

describe('LiveSessionReminderCronService', () => {
  let service: LiveSessionReminderCronService;
  let prisma: PrismaService;
  let nats: any;

  const mockPrisma = {
    liveScheduleSession: {
      findMany: jest.fn(),
    },
    enrollment: {
      findMany: jest.fn(),
    },
  };

  const mockNats = {
    send: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LiveSessionReminderCronService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: 'NATS_SERVICE', useValue: mockNats },
      ],
    }).compile();

    service = module.get<LiveSessionReminderCronService>(LiveSessionReminderCronService);
    prisma = module.get<PrismaService>(PrismaService);
    nats = module.get('NATS_SERVICE');

    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('notifyLiveSessionsStartingSoon', () => {
    it('should send notifications if session starts in exactly 30 minutes', async () => {
      // Set current time to 2024-03-20 08:00:00 VN (01:00:00 UTC)
      const now = new Date(Date.UTC(2024, 2, 20, 1, 0, 0));
      jest.setSystemTime(now);

      // Session starts at 08:30 VN (01:30 UTC)
      const sessionDate = new Date(Date.UTC(2024, 2, 20, 0, 0, 0)); // UTC 00:00 is same day
      const startTime = '08:30';
      
      const mockSession = {
        id: 's1',
        liveClassId: 'c1',
        sessionDate,
        startTime,
        endTime: '10:30',
        status: 'SCHEDULED',
        liveClass: {
          status: 'OPENING',
          name: 'Class 1',
          cohort: { courseProfile: { title: 'Course 1' } },
        },
      };

      mockPrisma.liveScheduleSession.findMany.mockResolvedValue([mockSession]);
      mockPrisma.enrollment.findMany.mockResolvedValue([{ userId: 'u1' }, { userId: 'u2' }]);
      mockNats.send.mockReturnValue(of({ ok: true }));

      await service.notifyLiveSessionsStartingSoon();

      expect(mockNats.send).toHaveBeenCalledTimes(2);
      expect(mockNats.send).toHaveBeenCalledWith(
        { cmd: 'identity.notification.create' },
        expect.objectContaining({
          userId: 'u1',
          title: 'Buổi học LIVE sắp bắt đầu',
          message: expect.stringContaining('Course 1'),
          dedupeKey: 'LIVE_SESSION:STARTS_IN_30_MIN:s1',
        })
      );
    });

    it('should trigger notification if within 60s window drift', async () => {
      // Current time: 08:00:30 VN (remindAt is 08:00:00) -> 30s drift is OK
      const now = new Date(Date.UTC(2024, 2, 20, 1, 0, 30));
      jest.setSystemTime(now);

      const mockSession = {
        id: 's1',
        liveClassId: 'c1',
        sessionDate: new Date(Date.UTC(2024, 2, 20, 0, 0, 0)),
        startTime: '08:30',
        liveClass: { status: 'OPENING', name: 'N/A', cohort: null },
      };

      mockPrisma.liveScheduleSession.findMany.mockResolvedValue([mockSession]);
      mockPrisma.enrollment.findMany.mockResolvedValue([{ userId: 'u1' }]);
      mockNats.send.mockReturnValue(of({ ok: true }));

      await service.notifyLiveSessionsStartingSoon();

      expect(mockNats.send).toHaveBeenCalled();
    });

    it('should NOT send notification if session is too far (e.g. 40 mins away)', async () => {
      const now = new Date(Date.UTC(2024, 2, 20, 1, 0, 0));
      jest.setSystemTime(now);

      const mockSession = {
        id: 's1',
        liveClassId: 'c1',
        sessionDate: new Date(Date.UTC(2024, 2, 20, 0, 0, 0)),
        startTime: '08:40', // Starts in 40 mins
        liveClass: { status: 'OPENING', name: 'N/A', cohort: null },
      };

      mockPrisma.liveScheduleSession.findMany.mockResolvedValue([mockSession]);

      await service.notifyLiveSessionsStartingSoon();

      expect(mockNats.send).not.toHaveBeenCalled();
    });

    it('should NOT send if no active enrollments', async () => {
      const now = new Date(Date.UTC(2024, 2, 20, 1, 0, 0));
      jest.setSystemTime(now);

      const mockSession = {
        id: 's1',
        liveClassId: 'c1',
        sessionDate: new Date(Date.UTC(2024, 2, 20, 0, 0, 0)),
        startTime: '08:30',
        liveClass: { status: 'OPENING', name: 'N/A', cohort: null },
      };

      mockPrisma.liveScheduleSession.findMany.mockResolvedValue([mockSession]);
      mockPrisma.enrollment.findMany.mockResolvedValue([]); // Empty

      await service.notifyLiveSessionsStartingSoon();

      expect(mockNats.send).not.toHaveBeenCalled();
    });

    it('should handle Prisma query errors gracefully', async () => {
      mockPrisma.liveScheduleSession.findMany.mockRejectedValue(new Error('DB Error'));
      // Should not throw
      await expect(service.notifyLiveSessionsStartingSoon()).resolves.toBeUndefined();
    });

    it('should continue if one notification fails', async () => {
      const now = new Date(Date.UTC(2024, 2, 20, 1, 0, 0));
      jest.setSystemTime(now);

      const mockSession = {
        id: 's1',
        liveClassId: 'c1',
        sessionDate: new Date(Date.UTC(2024, 2, 20, 0, 0, 0)),
        startTime: '08:30',
        liveClass: { status: 'OPENING', name: 'N/A', cohort: null },
      };

      mockPrisma.liveScheduleSession.findMany.mockResolvedValue([mockSession]);
      mockPrisma.enrollment.findMany.mockResolvedValue([{ userId: 'u1' }, { userId: 'u2' }]);
      
      // First fails, second succeeds
      mockNats.send.mockReturnValueOnce(throwError(() => new Error('NATS Error')));
      mockNats.send.mockReturnValueOnce(of({ ok: true }));

      await service.notifyLiveSessionsStartingSoon();

      expect(mockNats.send).toHaveBeenCalledTimes(2);
    });

    it('should throw error for invalid startTime format', async () => {
      const now = new Date(Date.UTC(2024, 2, 20, 1, 0, 0));
      jest.setSystemTime(now);

      const mockSession = {
        id: 's1',
        liveClassId: 'c1',
        sessionDate: new Date(Date.UTC(2024, 2, 20, 0, 0, 0)),
        startTime: 'invalid', // Bad format
        liveClass: { status: 'OPENING', name: 'N/A', cohort: null },
      };

      mockPrisma.liveScheduleSession.findMany.mockResolvedValue([mockSession]);

      // Note: The loop catches errors within its body or just logs them?
      // In service.ts line 89: const sessionStart = this.buildInstantFromVnDateTime(...)
      // buildInstantFromVnDateTime calls parseHourMinute which throws.
      // The loop for s of sessions does NOT have a try/catch, only the top level query has.
      // So this will throw and should be handled.
      await expect(service.notifyLiveSessionsStartingSoon()).rejects.toThrow('Invalid time format');
    });
  });
});
