import { Test, TestingModule } from '@nestjs/testing';
import { CohortService } from '../src/modules/classroom/cohort/cohort.service';
import { PrismaService } from '@server/shared/prisma/prisma.service';
import { AuditLoggerService } from '../src/modules/audit-logger.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { of } from 'rxjs';

describe('CohortService', () => {
  let service: CohortService;
  let prisma: PrismaService;
  let audit: AuditLoggerService;
  let nats: any;

  const mockPrisma = {
    cohort: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    auditLog: {
      findFirst: jest.fn(),
    },
    liveClass: {
      count: jest.fn(),
    },
  };

  const mockAudit = {
    log: jest.fn(),
  };

  const mockNats = {
    emit: jest.fn().mockReturnValue(of({})),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CohortService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLoggerService, useValue: mockAudit },
        { provide: 'NATS_SERVICE', useValue: mockNats },
      ],
    }).compile();

    service = module.get<CohortService>(CohortService);
    prisma = module.get<PrismaService>(PrismaService);
    audit = module.get<AuditLoggerService>(AuditLoggerService);
    nats = module.get('NATS_SERVICE');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should filter by courseProfileId and search query', async () => {
      mockPrisma.cohort.findMany.mockResolvedValue([]);
      mockPrisma.cohort.count.mockResolvedValue(0);

      const query = { courseProfileId: 'cp1', q: 'test' };
      await service.findAll(query);

      expect(mockPrisma.cohort.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              { courseProfileId: 'cp1' },
              { OR: [{ code: { contains: 'test', mode: 'insensitive' } }, { name: { contains: 'test', mode: 'insensitive' } }] },
            ]),
          }),
        }),
      );
    });

    it('should filter by onlyAvailable (date logic)', async () => {
      mockPrisma.cohort.findMany.mockResolvedValue([]);
      mockPrisma.cohort.count.mockResolvedValue(0);

      await service.findAll({ onlyAvailable: true });

      expect(mockPrisma.cohort.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({ status: { notIn: ['DRAFT', 'PENDING_APPROVAL', 'COMPLETED', 'ARCHIVED'] } }),
            ]),
          }),
        }),
      );
    });

    it('should filter by status directly', async () => {
      mockPrisma.cohort.findMany.mockResolvedValue([]);
      await service.findAll({ status: 'OPENING' });
      expect(mockPrisma.cohort.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([{ status: 'OPENING' }]),
          }),
        }),
      );
    });
  });

  describe('findById/Public', () => {
    it('should throw NotFoundException if not found', async () => {
      mockPrisma.cohort.findUnique.mockResolvedValue(null);
      await expect(service.findById('c1')).rejects.toThrow(NotFoundException);
      await expect(service.findByIdPublic('c1')).rejects.toThrow(NotFoundException);
    });

    it('should return cohort if found', async () => {
      const mock = { id: 'c1' };
      mockPrisma.cohort.findUnique.mockResolvedValue(mock);
      expect(await service.findById('c1')).toEqual(mock);
    });
  });

  describe('create', () => {
    it('should throw BadRequestException if starting as PENDING_APPROVAL', async () => {
      const data = { status: 'PENDING_APPROVAL' } as any;
      await expect(service.create(data)).rejects.toThrow('Không thể tạo Đợt khai giảng ở trạng thái Chờ duyệt ngay lập tức.');
    });

    it('should create a cohort draft by default', async () => {
      const data = { name: 'Cohort 1', courseProfileId: 'cp1' } as any;
      mockPrisma.cohort.create.mockResolvedValue({ id: 'c1', ...data, status: 'DRAFT' });

      const result = await service.create(data);
      expect(result.status).toBe('DRAFT');
      expect(mockPrisma.cohort.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const id = 'c1';
    const before = { id, code: 'C01', status: 'DRAFT' };

    it('should throw NotFoundException if missing', async () => {
      mockPrisma.cohort.findUnique.mockResolvedValue(null);
      await expect(service.update(id, {})).rejects.toThrow(NotFoundException);
    });

    it('should fail update if status is ARCHIVED', async () => {
      mockPrisma.cohort.findUnique.mockResolvedValue({ ...before, status: 'ARCHIVED' });
      await expect(service.update(id, { status: 'OPENING' })).rejects.toThrow('Đợt khai giảng đã được lưu trữ');
    });

    it('should fail if invalid status transition', async () => {
      mockPrisma.cohort.findUnique.mockResolvedValue(before);
      await expect(service.update(id, { status: 'COMPLETED' })).rejects.toThrow('Không hỗ trợ chuyển trạng thái');
    });

    it('should fail transition to PENDING if no live classes', async () => {
      mockPrisma.cohort.findUnique.mockResolvedValue(before);
      mockPrisma.liveClass.count.mockResolvedValue(0);

      await expect(service.update(id, { status: 'PENDING_APPROVAL' })).rejects.toThrow('Đợt khai giảng cần có ít nhất 1 Lớp học LIVE');
    });

    it('should fail transition to PENDING if course profile not published', async () => {
      mockPrisma.cohort.findUnique.mockResolvedValue({
        ...before,
        courseProfile: { status: 'DRAFT' },
      });
      mockPrisma.liveClass.count.mockResolvedValue(1);

      await expect(service.update(id, { status: 'PENDING_APPROVAL' })).rejects.toThrow('Hồ sơ nội dung (Course Profile) cần được xuất bản');
    });

    it('should allow metadata updates without status change', async () => {
      mockPrisma.cohort.findUnique.mockResolvedValue(before);
      mockPrisma.cohort.update.mockResolvedValue({ ...before, name: 'New Name' });

      await service.update(id, { name: 'New Name' });

      expect(mockPrisma.cohort.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ name: 'New Name' }) }),
      );
    });

    it('should clear rejectionReason when submitting for approval or opening', async () => {
      const current = {
        ...before,
        status: 'DRAFT',
        rejectionReason: 'Old rejection',
        courseProfile: { status: 'PUBLISHED' },
      };
      mockPrisma.cohort.findUnique.mockResolvedValue(current);
      mockPrisma.liveClass.count.mockResolvedValue(1);
      mockPrisma.cohort.update.mockResolvedValue({ ...current, status: 'PENDING_APPROVAL', rejectionReason: null });

      await service.update(id, { status: 'PENDING_APPROVAL' });

      expect(mockPrisma.cohort.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ rejectionReason: null }),
        }),
      );
    });

    it('should resolve recipient correctly for rejection notification', async () => {
      const current = { ...before, status: 'PENDING_APPROVAL' };
      mockPrisma.cohort.findUnique.mockResolvedValue(current);
      mockPrisma.cohort.update.mockResolvedValue({ ...current, status: 'DRAFT' });

      // First call to auditLog.findFirst should exclude the current reviewer
      mockPrisma.auditLog.findFirst.mockResolvedValue({ userId: 'original-creator' });

      await service.update(id, { status: 'DRAFT', rejectionReason: 'Reason' } as any, 'admin-reviewer');

      expect(mockPrisma.auditLog.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: { not: 'admin-reviewer' },
          }),
        }),
      );
      expect(nats.emit).toHaveBeenCalledWith(
        expect.objectContaining({ cmd: 'send_notification' }),
        expect.objectContaining({ recipientId: 'original-creator' }),
      );
    });

    it('should log APPROVE action when moving PENDING -> OPENING', async () => {
      const current = { id, code: 'C01', status: 'PENDING_APPROVAL', courseProfile: { status: 'PUBLISHED' } };
      mockPrisma.cohort.findUnique.mockResolvedValue(current);
      mockPrisma.liveClass.count.mockResolvedValue(1);
      mockPrisma.cohort.update.mockResolvedValue({ id, status: 'OPENING' });
      
      await service.update(id, { status: 'OPENING' }, 'admin-1');

      expect(mockAudit.log).toHaveBeenCalledWith(expect.objectContaining({
        action: 'APPROVE',
        newValues: { status: 'OPENING' },
      }));
    });

    it('should log REJECT action when moving PENDING -> DRAFT', async () => {
      const current = { id, code: 'C01', status: 'PENDING_APPROVAL', courseProfile: { status: 'PUBLISHED' } };
      mockPrisma.cohort.findUnique.mockResolvedValue(current);
      mockPrisma.liveClass.count.mockResolvedValue(1);
      mockPrisma.cohort.update.mockResolvedValue({ id, status: 'DRAFT' });
      mockPrisma.auditLog.findFirst.mockResolvedValue(null); // No recipient for notification

      await service.update(id, { status: 'DRAFT', rejectionReason: 'Typo' } as any, 'admin-1');

      expect(mockAudit.log).toHaveBeenCalledWith(expect.objectContaining({
        action: 'REJECT',
        metadata: { reason: 'Typo' },
      }));
    });

    it('should handle notification if no recent actor found', async () => {
      const current = { id, code: 'C01', status: 'PENDING_APPROVAL', courseProfile: { status: 'PUBLISHED' } };
      mockPrisma.cohort.findUnique.mockResolvedValue(current);
      mockPrisma.liveClass.count.mockResolvedValue(1);
      mockPrisma.cohort.update.mockResolvedValue({ id, status: 'DRAFT' });
      mockPrisma.auditLog.findFirst.mockResolvedValue(null);

      await service.update(id, { status: 'DRAFT' }, 'admin-1');
      expect(nats.emit).not.toHaveBeenCalled();
    });

    it('should handle notification failure gracefully', async () => {
      const current = { ...before, status: 'PENDING_APPROVAL' };
      mockPrisma.cohort.findUnique.mockResolvedValue(current);
      mockPrisma.cohort.update.mockResolvedValue({ ...current, status: 'DRAFT' });
      mockPrisma.auditLog.findFirst.mockResolvedValue({ userId: 'u1' });
      nats.emit.mockImplementation(() => { throw new Error('NATS Fail'); });

      // Should not throw error to the caller
      await expect(service.update(id, { status: 'DRAFT' }, 'admin-1')).resolves.toBeDefined();
    });
  });


  describe('delete', () => {
    it('should delete cohort', async () => {
      const result = await service.delete('c1');
      expect(result).toEqual({ ok: true });
      expect(mockPrisma.cohort.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
    });
  });
});
