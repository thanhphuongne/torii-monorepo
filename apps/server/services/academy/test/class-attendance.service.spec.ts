import { Test, TestingModule } from '@nestjs/testing';
import { ClassAttendanceService } from '../src/modules/classroom/class-attendance/class-attendance.service';
import { PrismaService } from '@server/shared/prisma/prisma.service';
import { AuditLoggerService } from '../src/modules/audit-logger.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ClassAttendanceService', () => {
  let service: ClassAttendanceService;
  let prisma: PrismaService;
  let audit: AuditLoggerService;

  const mockPrisma = {
    classAttendance: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    liveScheduleSession: {
      findUnique: jest.fn(),
    },
    enrollment: {
      findFirst: jest.fn(),
    },
  };

  const mockAudit = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassAttendanceService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLoggerService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<ClassAttendanceService>(ClassAttendanceService);
    prisma = module.get<PrismaService>(PrismaService);
    audit = module.get<AuditLoggerService>(AuditLoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should use default pagination and return records', async () => {
      mockPrisma.classAttendance.findMany.mockResolvedValue([]);
      mockPrisma.classAttendance.count.mockResolvedValue(0);

      const result = await service.findAll({});

      expect(result).toEqual({ items: [], total: 0, page: 1, limit: 100 });
      expect(mockPrisma.classAttendance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 100 }),
      );
    });

    it('should filter by sessionId only', async () => {
      await service.findAll({ sessionId: 's1' });
      expect(mockPrisma.classAttendance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { sessionId: 's1' } }),
      );
    });

    it('should filter by userId only', async () => {
      await service.findAll({ userId: 'u1' });
      expect(mockPrisma.classAttendance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'u1' } }),
      );
    });

    it('should filter by classId only', async () => {
      await service.findAll({ classId: 'c1' });
      expect(mockPrisma.classAttendance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { session: { liveClassId: 'c1' } } }),
      );
    });

    it('should handle combined filters and custom pagination', async () => {
      mockPrisma.classAttendance.findMany.mockResolvedValue([]);
      mockPrisma.classAttendance.count.mockResolvedValue(0);

      await service.findAll({ sessionId: 's1', userId: 'u1', page: 2, limit: 10 });

      expect(mockPrisma.classAttendance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sessionId: 's1', userId: 'u1' },
          skip: 10,
          take: 10,
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return a record if found', async () => {
      const mock = { id: 'a1' };
      mockPrisma.classAttendance.findUnique.mockResolvedValue(mock);
      expect(await service.findById('a1')).toEqual(mock);
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrisma.classAttendance.findUnique.mockResolvedValue(null);
      await expect(service.findById('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const input = {
      sessionId: 's1',
      userId: 'u1',
      status: 'PRESENT' as any,
    };

    const mockSession = {
      id: 's1',
      liveClassId: 'lc1',
      sessionDate: new Date(), // Today
    };

    it('should throw NotFoundException if session is missing', async () => {
      mockPrisma.liveScheduleSession.findUnique.mockResolvedValue(null);
      await expect(service.create(input)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if not same day and not admin/staff-academic', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      mockPrisma.liveScheduleSession.findUnique.mockResolvedValue({
        ...mockSession,
        sessionDate: pastDate,
      });

      await expect(service.create(input, 'user-1', 'lecturer')).rejects.toThrow(
        'Attendance can only be recorded on the day of the session',
      );
    });

    it('should allow bypass check for staff-academic', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      mockPrisma.liveScheduleSession.findUnique.mockResolvedValue({
        ...mockSession,
        sessionDate: pastDate,
      });
      mockPrisma.enrollment.findFirst.mockResolvedValue({ id: 'e1' });
      mockPrisma.classAttendance.upsert.mockResolvedValue({ id: 'a1' });

      await service.create(input, 'staff-id', 'staff-academic');
      expect(mockPrisma.classAttendance.upsert).toHaveBeenCalled();
    });

    it('should NOT allow bypass check for staff-operations', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      mockPrisma.liveScheduleSession.findUnique.mockResolvedValue({
        ...mockSession,
        sessionDate: pastDate,
      });

      await expect(service.create(input, 'staff-id', 'staff-operations')).rejects.toThrow(
        'Attendance can only be recorded on the day of the session',
      );
    });

    it('should throw BadRequestException if user has no active enrollment', async () => {
      mockPrisma.liveScheduleSession.findUnique.mockResolvedValue(mockSession);
      mockPrisma.enrollment.findFirst.mockResolvedValue(null);

      await expect(service.create(input)).rejects.toThrow(
        'User does not have an active enrollment in this class',
      );
    });

    it('should upsert record and log audit', async () => {
      mockPrisma.liveScheduleSession.findUnique.mockResolvedValue(mockSession);
      mockPrisma.enrollment.findFirst.mockResolvedValue({ id: 'e1' });
      const mockResult = { id: 'a1', ...input };
      mockPrisma.classAttendance.upsert.mockResolvedValue(mockResult);

      const result = await service.create(input, 'teacher-1');

      expect(result.id).toBe('a1');
      expect(mockPrisma.classAttendance.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sessionId_userId: { sessionId: 's1', userId: 'u1' } },
        }),
      );
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'attendance.record', userId: 'teacher-1' }),
      );
    });
  });

  describe('update', () => {
    const id = 'a1';
    const input = { status: 'ABSENT' as any };
    const existing = {
      id,
      userId: 'u1',
      status: 'PRESENT',
      session: { sessionDate: new Date() },
    };

    it('should throw NotFoundException if record missing', async () => {
      mockPrisma.classAttendance.findUnique.mockResolvedValue(null);
      await expect(service.update(id, input)).rejects.toThrow(NotFoundException);
    });

    it('should skip day check if existing.session is null', async () => {
      mockPrisma.classAttendance.findUnique.mockResolvedValue({ ...existing, session: null });
      mockPrisma.classAttendance.update.mockResolvedValue({ ...existing, ...input });

      await service.update(id, input, 'u1', 'student');
      expect(mockPrisma.classAttendance.update).toHaveBeenCalled();
    });

    it('should allow bypass check for admin on update', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      mockPrisma.classAttendance.findUnique.mockResolvedValue({
        ...existing,
        session: { sessionDate: pastDate },
      });
      mockPrisma.classAttendance.update.mockResolvedValue({ ...existing, ...input });

      await service.update(id, input, 'admin-id', 'admin');
      expect(mockPrisma.classAttendance.update).toHaveBeenCalled();
    });

    it('should update and log audit', async () => {
      mockPrisma.classAttendance.findUnique.mockResolvedValue(existing);
      mockPrisma.classAttendance.update.mockResolvedValue({ ...existing, ...input });

      const result = await service.update(id, input, 'user-1');

      expect(result.status).toBe('ABSENT');
      expect(mockPrisma.classAttendance.update).toHaveBeenCalled();
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'attendance.update',
          oldValues: { status: 'PRESENT' },
          newValues: { status: 'ABSENT' },
        }),
      );
    });
  });

  describe('delete', () => {
    it('should throw error via findById if record missing', async () => {
      mockPrisma.classAttendance.findUnique.mockResolvedValue(null);
      await expect(service.delete('a1')).rejects.toThrow(NotFoundException);
    });

    it('should delete and log audit with default requesterId', async () => {
      mockPrisma.classAttendance.findUnique.mockResolvedValue({ id: 'a1', userId: 'u1' });
      const result = await service.delete('a1');

      expect(result).toEqual({ ok: true });
      expect(mockPrisma.classAttendance.delete).toHaveBeenCalledWith({ where: { id: 'a1' } });
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'SYSTEM', action: 'attendance.delete' }),
      );
    });

    it('should delete and log audit with custom requesterId', async () => {
      mockPrisma.classAttendance.findUnique.mockResolvedValue({ id: 'a1', userId: 'u1' });
      await service.delete('a1', 'admin-1');

      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'admin-1', action: 'attendance.delete' }),
      );
    });
  });
});
