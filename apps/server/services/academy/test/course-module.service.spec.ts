import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CourseModuleService } from '../src/modules/course-profile/course-module.service';
import { PrismaService } from '@server/shared/prisma/prisma.service';
import { AuditLoggerService } from '../src/modules/audit-logger.service';

describe('CourseModuleService', () => {
  let service: CourseModuleService;
  let mockPrisma: any;
  let mockAudit: any;

  beforeEach(async () => {
    mockPrisma = {
      courseProfile: {
        findUnique: jest.fn(),
      },
      module: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((elements) => Promise.all(elements)),
    };

    mockAudit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseModuleService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: AuditLoggerService,
          useValue: mockAudit,
        },
      ],
    }).compile();

    service = module.get<CourseModuleService>(CourseModuleService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should throw BadRequest if profile not found', async () => {
      mockPrisma.courseProfile.findUnique.mockResolvedValue(null);
      await expect(service.create({ courseProfileId: 'p1', title: 'T' })).rejects.toThrow('Invalid courseProfileId');
    });

    it('should throw BadRequest if profile is not DRAFT', async () => {
      mockPrisma.courseProfile.findUnique.mockResolvedValue({ id: 'p1', status: 'PUBLISHED' });
      await expect(service.create({ courseProfileId: 'p1', title: 'T' })).rejects.toThrow('trạng thái DRAFT');
    });

    it('should create module with auto-calculated orderIndex', async () => {
      mockPrisma.courseProfile.findUnique.mockResolvedValue({ id: 'p1', status: 'DRAFT', code: 'PRO-1' });
      mockPrisma.module.count.mockResolvedValue(5);
      mockPrisma.module.create.mockResolvedValue({ id: 'm1', title: 'Mod 1', orderIndex: 6 });

      const result = await service.create({ courseProfileId: 'p1', title: 'Mod 1' }, 'user-1');

      expect(mockPrisma.module.create).toHaveBeenCalledWith({
        data: { courseProfileId: 'p1', title: 'Mod 1', orderIndex: 6 },
      });
      expect(mockAudit.log).toHaveBeenCalled();
      expect(result.id).toBe('m1');
    });
  });

  describe('update', () => {
    it('should throw NotFound if module missing', async () => {
      mockPrisma.module.findUnique.mockResolvedValue(null);
      await expect(service.update('m1', { title: 'New' })).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequest if profile is not DRAFT', async () => {
      mockPrisma.module.findUnique.mockResolvedValue({
        id: 'm1',
        courseProfile: { status: 'PUBLISHED' },
      });
      await expect(service.update('m1', { title: 'New' })).rejects.toThrow('trạng thái DRAFT');
    });

    it('should update module correctly', async () => {
      const before = { id: 'm1', title: 'Old', courseProfile: { status: 'DRAFT', code: 'C1' } };
      mockPrisma.module.findUnique.mockResolvedValue(before);
      mockPrisma.module.update.mockResolvedValue({ id: 'm1', title: 'New' });

      const result = await service.update('m1', { title: 'New' }, 'user-1');

      expect(mockPrisma.module.update).toHaveBeenCalledWith({
        where: { id: 'm1' },
        data: { title: 'New' },
      });
      expect(mockAudit.log).toHaveBeenCalled();
      expect(result.title).toBe('New');
    });
  });

  describe('delete', () => {
    it('should delete module if in DRAFT', async () => {
      mockPrisma.module.findUnique.mockResolvedValue({
        id: 'm1',
        title: 'M',
        courseProfile: { status: 'DRAFT', code: 'C1' },
        _count: { lessons: 5 },
      });

      await service.delete('m1', 'user-1');

      expect(mockPrisma.module.delete).toHaveBeenCalledWith({ where: { id: 'm1' } });
      expect(mockAudit.log).toHaveBeenCalled();
    });
  });

  describe('reorder', () => {
    it('should use two-pass transaction to reorder modules', async () => {
      mockPrisma.courseProfile.findUnique.mockResolvedValue({ id: 'p1', status: 'DRAFT', code: 'C1' });
      
      const moduleIds = ['id1', 'id2'];
      await service.reorder('p1', moduleIds, 'user-1');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      // Verifying that calls exist for both negative and positive indices
      expect(mockPrisma.module.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'id1', courseProfileId: 'p1' },
        data: { orderIndex: -1 },
      }));
      expect(mockPrisma.module.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'id1', courseProfileId: 'p1' },
        data: { orderIndex: 1 },
      }));
    });

    it('should throw if profile not DRAFT', async () => {
        mockPrisma.courseProfile.findUnique.mockResolvedValue({ id: 'p1', status: 'PUBLISHED' });
        await expect(service.reorder('p1', [])).rejects.toThrow('Chỉ có thể thay đổi thứ tự khi CourseProfile ở trạng thái DRAFT');
    });
  });
});
