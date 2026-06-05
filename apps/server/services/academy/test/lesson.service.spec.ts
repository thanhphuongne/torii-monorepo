import { Test, TestingModule } from '@nestjs/testing';
import { LessonService } from '../src/modules/lesson/lesson.service';
import { PrismaService } from '@server/shared/prisma/prisma.service';
import { AuditLoggerService } from '../src/modules/audit-logger.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { LessonType } from '@prisma/generated';

describe('LessonService', () => {
  let service: LessonService;
  let prisma: PrismaService;
  let audit: AuditLoggerService;

  const mockPrisma = {
    lesson: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    module: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockAudit = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LessonService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLoggerService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<LessonService>(LessonService);
    prisma = module.get<PrismaService>(PrismaService);
    audit = module.get<AuditLoggerService>(AuditLoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all lessons when no query is provided', async () => {
      mockPrisma.lesson.findMany.mockResolvedValue([]);
      const result = await service.findAll({});
      expect(result).toEqual([]);
      expect(mockPrisma.lesson.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            moduleId: undefined,
            module: undefined,
          },
        }),
      );
    });

    it('should filter by courseProfileId', async () => {
      mockPrisma.lesson.findMany.mockResolvedValue([]);
      await service.findAll({ courseProfileId: 'cp1' });
      expect(mockPrisma.lesson.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            module: { courseProfileId: 'cp1' },
          }),
        }),
      );
    });

    it('should trim search query q', async () => {
      mockPrisma.lesson.findMany.mockResolvedValue([]);
      await service.findAll({ q: '  trimmed  ' });
      expect(mockPrisma.lesson.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            title: { contains: 'trimmed', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('should filter by moduleId', async () => {
      mockPrisma.lesson.findMany.mockResolvedValue([]);
      await service.findAll({ moduleId: 'm1' });
      expect(mockPrisma.lesson.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            moduleId: 'm1',
          }),
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return a lesson if found', async () => {
      const mockLesson = { id: 'l1', title: 'Lesson 1' };
      mockPrisma.lesson.findUnique.mockResolvedValue(mockLesson);

      const result = await service.findById('l1');
      expect(result).toEqual(mockLesson);
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrisma.lesson.findUnique.mockResolvedValue(null);
      await expect(service.findById('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const input = {
      moduleId: 'm1',
      type: 'VIDEO' as const,
      title: 'New Lesson',
      videoUrl: 'http://video.com',
    };

    it('should throw BadRequestException if module not found', async () => {
      mockPrisma.module.findUnique.mockResolvedValue(null);
      await expect(service.create(input)).rejects.toThrow('Invalid moduleId');
    });

    it('should throw BadRequestException if course is not DRAFT', async () => {
      mockPrisma.module.findUnique.mockResolvedValue({
        id: 'm1',
        courseProfile: { status: 'PUBLISHED' },
      });
      await expect(service.create(input)).rejects.toThrow(
        'Không thể thêm/chỉnh sửa Lesson khi CourseProfile chưa ở trạng thái DRAFT.',
      );
    });

    it('should use provided orderIndex', async () => {
      mockPrisma.module.findUnique.mockResolvedValue({
        id: 'm1',
        courseProfile: { status: 'DRAFT' },
      });
      const inputWithOrder = { ...input, orderIndex: 99 };
      mockPrisma.lesson.create.mockResolvedValue({ id: 'l', ...inputWithOrder });

      await service.create(inputWithOrder);

      expect(mockPrisma.lesson.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ orderIndex: 99 }),
        }),
      );
    });

    it('should calculate nextOrder if orderIndex not provided', async () => {
      mockPrisma.module.findUnique.mockResolvedValue({
        id: 'm1',
        courseProfile: { status: 'DRAFT' },
      });
      mockPrisma.lesson.count.mockResolvedValue(10);
      mockPrisma.lesson.create.mockResolvedValue({ id: 'l' });

      await service.create(input);

      expect(mockPrisma.lesson.count).toHaveBeenCalled();
      expect(mockPrisma.lesson.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ orderIndex: 11 }),
        }),
      );
    });

    it('should log audit only if requesterId is provided', async () => {
      mockPrisma.module.findUnique.mockResolvedValue({
        id: 'm1',
        courseProfile: { status: 'DRAFT' },
      });
      mockPrisma.lesson.create.mockResolvedValue({ id: 'l' });

      await service.create(input); // No requesterId
      expect(mockAudit.log).not.toHaveBeenCalled();

      await service.create(input, 'user-1'); // With requesterId
      expect(mockAudit.log).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const id = 'l1';
    const before = { id, title: 'Old Title', moduleId: 'm1' };

    it('should update specific fields', async () => {
      mockPrisma.lesson.findUnique.mockResolvedValue(before);
      mockPrisma.module.findUnique.mockResolvedValue({
        courseProfile: { status: 'DRAFT' },
      });
      mockPrisma.lesson.update.mockResolvedValue({ ...before, title: 'New' });

      await service.update(id, { title: 'New' });

      expect(mockPrisma.lesson.update).toHaveBeenCalledWith({
        where: { id },
        data: {
          title: 'New',
          type: undefined,
          orderIndex: undefined,
          videoUrl: undefined,
          content: undefined,
        },
      });
    });

    it('should allow setting videoUrl and content to undefined (no change)', async () => {
      mockPrisma.lesson.findUnique.mockResolvedValue(before);
      mockPrisma.module.findUnique.mockResolvedValue({
        courseProfile: { status: 'DRAFT' },
      });
      mockPrisma.lesson.update.mockResolvedValue(before);

      await service.update(id, {}); // No fields

      expect(mockPrisma.lesson.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            title: undefined,
            type: undefined,
            orderIndex: undefined,
            videoUrl: undefined,
            content: undefined,
          },
        }),
      );
    });

    it('should throw BadRequestException if status is not DRAFT', async () => {
      mockPrisma.lesson.findUnique.mockResolvedValue(before);
      mockPrisma.module.findUnique.mockResolvedValue({
        courseProfile: { status: 'PUBLISHED' },
      });

      await expect(service.update(id, { title: 'New' })).rejects.toThrow(
        'Không thể chỉnh sửa Lesson khi CourseProfile chưa ở trạng thái DRAFT.',
      );
    });

    it('should log audit if requesterId provided', async () => {
      mockPrisma.lesson.findUnique.mockResolvedValue(before);
      mockPrisma.module.findUnique.mockResolvedValue({
        courseProfile: { status: 'DRAFT' },
      });
      mockPrisma.lesson.update.mockResolvedValue(before);

      await service.update(id, { title: 'New' }, 'admin-1');
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'admin-1', action: 'lesson.update' }),
      );
    });

    it('should allow setting content to null', async () => {
      mockPrisma.lesson.findUnique.mockResolvedValue(before);
      mockPrisma.module.findUnique.mockResolvedValue({
        courseProfile: { status: 'DRAFT' },
      });
      mockPrisma.lesson.update.mockResolvedValue({ ...before, content: null });

      await service.update(id, { content: null });

      expect(mockPrisma.lesson.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ content: null }),
        }),
      );
    });
  });

  describe('delete', () => {
    const id = 'l1';
    const before = { id, title: 'Delete Me', moduleId: 'm1' };

    it('should delete and log audit', async () => {
      mockPrisma.lesson.findUnique.mockResolvedValue(before);
      mockPrisma.module.findUnique.mockResolvedValue({
        courseProfile: { status: 'DRAFT' },
      });

      const result = await service.delete(id, 'user-1');

      expect(result).toEqual({ ok: true });
      expect(mockPrisma.lesson.delete).toHaveBeenCalledWith({ where: { id } });
      expect(mockAudit.log).toHaveBeenCalled();
    });

    it('should throw BadRequestException if status is not DRAFT', async () => {
      mockPrisma.lesson.findUnique.mockResolvedValue(before);
      mockPrisma.module.findUnique.mockResolvedValue({
        courseProfile: { status: 'ARCHIVED' },
      });

      await expect(service.delete(id)).rejects.toThrow(
        'Không thể xóa Lesson khi CourseProfile chưa ở trạng thái DRAFT.',
      );
    });
  });

  describe('reorder', () => {
    const moduleId = 'm1';
    const lessonIds = ['l1', 'l2'];

    it('should reorder using temporary negative and then positive indices', async () => {
      mockPrisma.module.findUnique.mockResolvedValue({
        courseProfile: { status: 'DRAFT' },
      });
      mockPrisma.$transaction.mockImplementation(async (val) => val);

      await service.reorder(moduleId, lessonIds, 'user-1');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      // Total 4 updates (2 per lesson)
      expect(mockPrisma.lesson.update).toHaveBeenCalledTimes(4);

      // Pass 1: negative indices
      expect(mockPrisma.lesson.update).toHaveBeenNthCalledWith(1, expect.objectContaining({ data: { orderIndex: -1 } }));
      expect(mockPrisma.lesson.update).toHaveBeenNthCalledWith(2, expect.objectContaining({ data: { orderIndex: -2 } }));
      // Pass 2: positive indices
      expect(mockPrisma.lesson.update).toHaveBeenNthCalledWith(3, expect.objectContaining({ data: { orderIndex: 1 } }));
      expect(mockPrisma.lesson.update).toHaveBeenNthCalledWith(4, expect.objectContaining({ data: { orderIndex: 2 } }));

      expect(mockAudit.log).toHaveBeenCalled();
    });

    it('should throw if transaction fails', async () => {
      mockPrisma.module.findUnique.mockResolvedValue({ courseProfile: { status: 'DRAFT' } });
      mockPrisma.$transaction.mockRejectedValue(new Error('Tx error'));
      await expect(service.reorder(moduleId, lessonIds)).rejects.toThrow('Tx error');
    });

    it('should throw NotFoundException if module not found', async () => {
      mockPrisma.module.findUnique.mockResolvedValue(null);
      await expect(service.reorder(moduleId, lessonIds)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if status is not DRAFT', async () => {
      mockPrisma.module.findUnique.mockResolvedValue({
        courseProfile: { status: 'PUBLISHED' },
      });
      await expect(service.reorder(moduleId, lessonIds)).rejects.toThrow(
        'Chỉ có thể thay đổi thứ tự khi CourseProfile ở trạng thái DRAFT.',
      );
    });
  });
});
