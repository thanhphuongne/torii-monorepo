import { Test, TestingModule } from '@nestjs/testing';
import { LiveScheduleService } from '../src/modules/classroom/live-schedule/live-schedule.service';
import { PrismaService } from '@server/shared/prisma/prisma.service';
import { AppConfigService } from '@server/shared';
import { AuditLoggerService } from '../src/modules/audit-logger.service';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { of } from 'rxjs';

describe('LiveScheduleService', () => {
  let service: LiveScheduleService;
  let prisma: PrismaService;
  let nats: any;

  const mockPrisma = {
    liveSchedule: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    liveClass: {
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    liveScheduleSession: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
      update: jest.fn(),
    },
    enrollment: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    cohort: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    classAttendance: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockAppConfig = {
    get: jest.fn(),
  };

  const mockAudit = {
    log: jest.fn().mockResolvedValue({}),
  };

  const mockNats = {
    emit: jest.fn(),
    send: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LiveScheduleService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AppConfigService, useValue: mockAppConfig },
        { provide: AuditLoggerService, useValue: mockAudit },
        { provide: 'NATS_SERVICE', useValue: mockNats },
      ],
    }).compile();

    service = module.get<LiveScheduleService>(LiveScheduleService);
    prisma = module.get<PrismaService>(PrismaService);
    nats = module.get('NATS_SERVICE');

    jest.resetAllMocks();
    mockAudit.log.mockResolvedValue({});
    mockPrisma.liveClass.findUnique.mockResolvedValue({ status: 'DRAFT', cohort: { startDate: new Date(), endDate: new Date() } });
    mockPrisma.liveSchedule.findMany.mockResolvedValue([]);
    mockPrisma.$transaction.mockResolvedValue([]);

    // Stable date mock: Jan 1st 2024 is a Monday (weekday 1)
    const mockNow = new Date(Date.UTC(2024, 0, 1, 10, 0)); // 10:00 UTC
    jest.useFakeTimers().setSystemTime(mockNow);

    // Mock date helpers
    jest.spyOn(service as any, 'formatDateInTimeZone').mockReturnValue('2024-01-01');
    jest.spyOn(service as any, 'buildInstantFromVnDateTime').mockImplementation((ymd, hhmm) => {
        const [h, m] = hhmm.split(':').map(Number);
        return new Date(Date.UTC(2024, 0, 1, h, m));
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('retrieval', () => {
    it('should find all schedules for a class', async () => {
      mockPrisma.liveSchedule.findMany.mockResolvedValue([{ id: 's1' }]);
      const result = await service.findAll({ classId: 'c1' });
      expect(result).toHaveLength(1);
    });

    it('should find by id', async () => {
      mockPrisma.liveSchedule.findUnique.mockResolvedValue({ id: 's1' });
      const result = await service.findById('s1');
      expect(result.id).toBe('s1');
    });

    it('should throw if not found', async () => {
      mockPrisma.liveSchedule.findUnique.mockResolvedValue(null);
      await expect(service.findById('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create templates', () => {
    it('should throw BadRequestException if class is not DRAFT', async () => {
      mockPrisma.liveClass.findUnique.mockResolvedValue({ status: 'OPENING' });
      await expect(service.create({ classId: 'c1' } as any)).rejects.toThrow('LiveSchedule is locked');
    });

    it('should create template', async () => {
      mockPrisma.liveSchedule.create.mockResolvedValue({ id: 's1' });
      await service.create({ classId: 'c1', weekday: 1, startTime: '08:00', endTime: '10:00' });
      expect(mockPrisma.liveSchedule.create).toHaveBeenCalled();
    });
  });

  describe('join logic', () => {
    it('should throw if user is not enrolled and not admin', async () => {
      mockPrisma.liveSchedule.findUnique.mockResolvedValue({ 
        id: 's1', 
        liveClassId: 'c1',
        liveClass: { status: 'OPENING', instructorId: 'other' },
        weekday: 1,
        startTime: '10:00',
        endTime: '11:00'
      });
      mockPrisma.enrollment.findFirst.mockResolvedValue(null);
      mockNats.send.mockReturnValue(of({ permissions: [] }));

      await expect(service.join('s1', 'u1', false)).rejects.toThrow('actively enrolled');
    });

    it('should throw if outside join window', async () => {
      mockPrisma.liveSchedule.findUnique.mockResolvedValue({ 
        id: 's1', 
        liveClass: { status: 'OPENING', instructorId: 'u1' },
        weekday: 1,
        startTime: '20:00', // Now is 10:00, so 20:00 is far future
        endTime: '21:00'
      });
      
      await expect(service.join('s1', 'u1', false)).rejects.toThrow('join window is closed');
    });

    it('should join successfully when within window', async () => {
       mockPrisma.liveSchedule.findUnique.mockResolvedValue({ 
        id: 's1', 
        liveClassId: 'c1',
        liveClass: { status: 'OPENING', name: 'Class', instructorId: 'u1', cohort: { courseProfile: { title: 'T1' } } },
        weekday: 1,
        startTime: '10:00', // Exactly now
        endTime: '11:00',
        roomId: 'room-1'
      });
      mockPrisma.enrollment.findFirst.mockResolvedValue({ id: 'e1' });
      
      mockNats.send.mockImplementation((pattern) => {
        if (pattern.cmd === 'identity.authz.getUserPermissionsByUserId') return of({ permissions: [] });
        if (pattern.cmd === 'room.isActive') return of({ res: { isActive: true } });
        if (pattern.cmd === 'identity.users.findById') return of({ user: { id: 'u1', displayName: 'John' } });
        if (pattern.cmd === 'user.generateJoinToken') return of({ token: 'test-token' });
        return of({});
      });

      const result = await service.join('s1', 'u1', false);
      expect(result.token).toBe('test-token');
      expect(result.roomId).toBe('room-1');
    });

    it('should join by sessionId successfully when within window', async () => {
      mockPrisma.liveScheduleSession.findUnique.mockResolvedValue({
        id: 'sess1',
        liveClassId: 'c1',
        status: 'SCHEDULED',
        sessionDate: new Date('2024-01-01'),
        startTime: '10:00', // Exactly now
        endTime: '11:00',
        roomId: 'room-sess',
        liveClass: { status: 'OPENING', name: 'Class', instructorId: 'u1', cohort: { courseProfile: { title: 'T1' } } }
      });
      mockPrisma.enrollment.findFirst.mockResolvedValue({ id: 'e1' });

      mockNats.send.mockImplementation((pattern) => {
        if (pattern.cmd === 'identity.authz.getUserPermissionsByUserId') return of({ permissions: [] });
        if (pattern.cmd === 'room.isActive') return of({ res: { isActive: true } });
        if (pattern.cmd === 'identity.users.findById') return of({ user: { id: 'u1' } });
        if (pattern.cmd === 'user.generateJoinToken') return of({ token: 'sess-token' });
        return of({});
      });

      const result = await service.joinBySessionId('sess1', 'u1', false);
      expect(result.token).toBe('sess-token');
    });
  });

  describe('generateInstances', () => {
    it('should generate sessions based on templates and class range', async () => {
      const today = new Date('2024-01-01');
      mockPrisma.liveClass.findUnique.mockResolvedValue({
        id: 'c1',
        cohort: { startDate: today, endDate: today }
      });
      mockPrisma.liveSchedule.findMany.mockResolvedValue([
        { id: 't1', weekday: 1, startTime: '10:00', endTime: '12:00', roomId: 'r1' }
      ]);
      mockPrisma.liveScheduleSession.upsert.mockResolvedValue({});
      mockPrisma.$transaction.mockResolvedValue([]);

      const result = await service.generateInstancesForClassRange('c1');
      expect(result.ok).toBe(true);
    });
  });

  describe('learner schedule', () => {
    it('should fetch schedule with attendance status', async () => {
      const today = new Date('2024-01-01');
      mockPrisma.enrollment.findMany.mockResolvedValue([
        { liveClassId: 'c1', liveClass: { name: 'C1', cohort: { courseProfile: { title: 'T1' } } } }
      ]);
      mockPrisma.liveClass.findUnique.mockResolvedValue({ cohort: { startDate: today, endDate: today } });
      mockPrisma.liveScheduleSession.findMany.mockResolvedValue([
        { id: 'sess1', sessionDate: today, startTime: '10:00', endTime: '12:00' }
      ]);
      mockPrisma.classAttendance.findMany.mockResolvedValue([{ sessionId: 'sess1', status: 'PRESENT' }]);

      const result = await service.getLearnerScheduleWithAttendance('u1', today, today);
      expect(result[0].attendanceStatus).toBe('PRESENT');
      expect(result[0].courseTitle).toBe('T1');
    });
  });
});
