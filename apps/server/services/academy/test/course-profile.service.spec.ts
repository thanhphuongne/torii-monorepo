import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CourseProfileService } from '../src/modules/course-profile/course-profile.service';
import { PrismaService } from '@server/shared/prisma/prisma.service';
import { AuditLoggerService } from '../src/modules/audit-logger.service';

describe('CourseProfileService', () => {
  let service: CourseProfileService;
  let mockPrisma: any;
  let mockAudit: any;
  let mockNats: any;

  beforeEach(async () => {
    mockPrisma = {
      courseProfile: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findFirst: jest.fn(),
      },
      module: {
        count: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      lesson: {
        createMany: jest.fn(),
      },
      cohort: { count: jest.fn() },
      vodPackage: { count: jest.fn() },
      $transaction: jest.fn().mockImplementation((cb) => {
        if (typeof cb === 'function') return cb(mockPrisma);
        return Promise.all(cb);
      }),
    };

    mockAudit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    mockNats = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseProfileService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLoggerService, useValue: mockAudit },
        { provide: 'NATS_SERVICE', useValue: mockNats },
      ],
    }).compile();

    service = module.get<CourseProfileService>(CourseProfileService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should throw if course code already exists', async () => {
      mockPrisma.courseProfile.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(service.create({ code: 'C1', title: 'T' })).rejects.toThrow('already exists');
    });

    it('should create profile and log audit', async () => {
      mockPrisma.courseProfile.findUnique.mockResolvedValue(null);
      mockPrisma.courseProfile.create.mockResolvedValue({ id: 'p1', code: 'C1' });

      const result = await service.create({ code: 'C1', title: 'T' }, 'user-1');

      expect(mockPrisma.courseProfile.create).toHaveBeenCalled();
      expect(mockAudit.log).toHaveBeenCalled();
      expect(result.id).toBe('p1');
    });
  });

  describe('update', () => {
    it('should throw if status is not DRAFT', async () => {
      mockPrisma.courseProfile.findUnique.mockResolvedValue({ id: 'p1', status: 'PUBLISHED' });
      await expect(service.update('p1', { title: 'New' })).rejects.toThrow('chỉ cho phép ở trạng thái DRAFT');
    });
  });

  describe('submitForApproval', () => {
    it('should throw if curriculum is empty', async () => {
      mockPrisma.courseProfile.findUnique.mockResolvedValue({ id: 'p1', status: 'DRAFT' });
      mockPrisma.module.count.mockResolvedValue(0);
      await expect(service.submitForApproval('p1')).rejects.toThrow('Chương trình học trống');
    });

    it('should throw if any module is empty', async () => {
      mockPrisma.courseProfile.findUnique.mockResolvedValue({ id: 'p1', status: 'DRAFT' });
      mockPrisma.module.count.mockResolvedValue(1);
      mockPrisma.module.findFirst.mockResolvedValue({ title: 'Module 1' });

      await expect(service.submitForApproval('p1')).rejects.toThrow('không được để module trống');
    });

    it('should update status to PENDING_APPROVAL on success', async () => {
      mockPrisma.courseProfile.findUnique.mockResolvedValue({ id: 'p1', status: 'DRAFT' });
      mockPrisma.module.count.mockResolvedValue(1);
      mockPrisma.module.findFirst.mockResolvedValue(null);
      mockPrisma.courseProfile.update.mockResolvedValue({ id: 'p1', status: 'PENDING_APPROVAL' });

      const result = await service.submitForApproval('p1', 'user-1');
      expect(result.status).toBe('PENDING_APPROVAL');
    });
  });

  describe('duplicate', () => {
    it('should deep clone profile, modules and lessons', async () => {
      const source = {
        id: 's1', code: 'OLD', title: 'Old',
        modules: [
            { id: 'm1', title: 'M1', orderIndex: 1, lessons: [{ title: 'L1', orderIndex: 1 }] }
        ]
      };
      mockPrisma.courseProfile.findUnique.mockResolvedValueOnce(source); // Source check
      mockPrisma.courseProfile.findUnique.mockResolvedValueOnce(null); // New code unique check
      mockPrisma.courseProfile.create.mockResolvedValue({ id: 'new-p' });
      mockPrisma.module.create.mockResolvedValue({ id: 'new-m' });

      await service.duplicate('s1', 'NEW', 'New Title', 'user-1');

      expect(mockPrisma.courseProfile.create).toHaveBeenCalledWith(expect.objectContaining({
          data: expect.objectContaining({ code: 'NEW' })
      }));
      expect(mockPrisma.module.create).toHaveBeenCalled();
      expect(mockPrisma.lesson.createMany).toHaveBeenCalled();
      expect(mockAudit.log).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should throw if has related data', async () => {
      mockPrisma.courseProfile.findUnique.mockResolvedValue({ id: 'p1' });
      mockPrisma.cohort.count.mockResolvedValue(1); // Blocked
      mockPrisma.vodPackage.count.mockResolvedValue(0);
      mockPrisma.module.count.mockResolvedValue(0);

      await expect(service.delete('p1')).rejects.toThrow('dữ liệu liên quan');
    });

    it('should delete if no related data', async () => {
        mockPrisma.courseProfile.findUnique.mockResolvedValue({ id: 'p1', code: 'C1' });
        mockPrisma.cohort.count.mockResolvedValue(0);
        mockPrisma.vodPackage.count.mockResolvedValue(0);
        mockPrisma.module.count.mockResolvedValue(0);
  
        await service.delete('p1', 'user-1');
        expect(mockPrisma.courseProfile.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
      });
  });
});
