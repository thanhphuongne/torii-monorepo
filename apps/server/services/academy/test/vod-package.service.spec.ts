import { Test, TestingModule } from '@nestjs/testing';
import { VodPackageService } from '../src/modules/classroom/vod-package/vod-package.service';
import { PrismaService } from '@server/shared/prisma/prisma.service';
import { AuditLoggerService } from '../src/modules/audit-logger.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('VodPackageService', () => {
  let service: VodPackageService;
  let prisma: PrismaService;
  let audit: AuditLoggerService;
  let nats: any;

  const mockPrisma = {
    vodPackage: {
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
  };

  const mockAudit = {
    log: jest.fn().mockResolvedValue({}),
  };

  const mockNats = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VodPackageService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLoggerService, useValue: mockAudit },
        { provide: 'NATS_SERVICE', useValue: mockNats },
      ],
    }).compile();

    service = module.get<VodPackageService>(VodPackageService);
    prisma = module.get<PrismaService>(PrismaService);
    audit = module.get<AuditLoggerService>(AuditLoggerService);
    nats = module.get('NATS_SERVICE');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return list of packages', async () => {
      mockPrisma.vodPackage.findMany.mockResolvedValue([]);
      mockPrisma.vodPackage.count.mockResolvedValue(0);
      const result = await service.findAll({});
      expect(result.items).toEqual([]);
    });

    it('should filter by search query', async () => {
      mockPrisma.vodPackage.findMany.mockResolvedValue([]);
      await service.findAll({ q: 'test' });
      expect(mockPrisma.vodPackage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { code: { contains: 'test', mode: 'insensitive' } },
            ]),
          }),
        })
      );
    });
  });

  describe('findById', () => {
    it('should return package and include relations', async () => {
      mockPrisma.vodPackage.findUnique.mockResolvedValue({ id: 'v1' });
      const result = await service.findById('v1');
      expect(result.id).toBe('v1');
      expect(mockPrisma.vodPackage.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ include: expect.anything() })
      );
    });

    it('should throw NotFound if not exists', async () => {
      mockPrisma.vodPackage.findUnique.mockResolvedValue(null);
      await expect(service.findById('v1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create with defaults', async () => {
      const data = { code: 'V1', title: 'T1', price: 100, courseProfileId: 'c1' };
      mockPrisma.vodPackage.create.mockResolvedValue({ id: 'v1', ...data });
      const result = await service.create(data as any);
      expect(result.id).toBe('v1');
      expect(mockPrisma.vodPackage.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'DRAFT' }) })
      );
    });
  });

  describe('update', () => {
    const id = 'v1';
    const before = { id, status: 'DRAFT', courseProfile: { status: 'PUBLISHED' } };

    it('should fail transition if course profile is not published', async () => {
      mockPrisma.vodPackage.findUnique.mockResolvedValue({
        ...before,
        courseProfile: { status: 'DRAFT' },
      });
      await expect(service.update(id, { status: 'PUBLISHED' }))
        .rejects.toThrow('Hồ sơ nội dung (Course Profile) cần được xuất bản');
    });

    it('should fail if trying to set to DRAFT from PUBLISHED', async () => {
      mockPrisma.vodPackage.findUnique.mockResolvedValue({ ...before, status: 'PUBLISHED' });
      await expect(service.update(id, { status: 'DRAFT' }))
        .rejects.toThrow('Gói VOD đã được xuất bản, không thể hạ về bản nháp');
    });

    it('should fail if ARCHIVED', async () => {
      mockPrisma.vodPackage.findUnique.mockResolvedValue({ ...before, status: 'ARCHIVED' });
      await expect(service.update(id, { status: 'PUBLISHED' }))
        .rejects.toThrow('Gói VOD đã được lưu trữ');
    });

    it('should resolve recipient and notify on REJECT', async () => {
      const pending = { ...before, status: 'PENDING_APPROVAL', code: 'V1' };
      mockPrisma.vodPackage.findUnique.mockResolvedValue(pending);
      mockPrisma.vodPackage.update.mockResolvedValue({ ...pending, status: 'DRAFT' });
      mockPrisma.auditLog.findFirst.mockResolvedValue({ userId: 'original-creator' });

      await service.update(id, { status: 'DRAFT' }, 'admin-1');

      expect(mockNats.emit).toHaveBeenCalledWith(
        { cmd: 'send_notification' },
        expect.objectContaining({ recipientId: 'original-creator' })
      );
    });

    it('should update and log audit', async () => {
      mockPrisma.vodPackage.findUnique.mockResolvedValue(before);
      mockPrisma.vodPackage.update.mockResolvedValue({ ...before, status: 'PUBLISHED' });

      const result = await service.update(id, { status: 'PUBLISHED' }, 'admin-1');

      expect(result.status).toBe('PUBLISHED');
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'UPDATE_STATUS' })
      );
    });
  });

  describe('delete', () => {
    it('should delete package', async () => {
      mockPrisma.vodPackage.delete.mockResolvedValue({ id: 'v1' });
      const result = await service.delete('v1');
      expect(result.ok).toBe(true);
      expect(mockPrisma.vodPackage.delete).toHaveBeenCalledWith({ where: { id: 'v1' } });
    });
  });
});
