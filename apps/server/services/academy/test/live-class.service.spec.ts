import { Test, TestingModule } from '@nestjs/testing';
import { LiveClassService } from '../src/modules/classroom/live-class/live-class.service';
import { LiveScheduleService } from '../src/modules/classroom/live-schedule/live-schedule.service';
import { PrismaService } from '@server/shared/prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('LiveClassService', () => {
  let service: LiveClassService;
  let prisma: PrismaService;
  let liveSchedules: LiveScheduleService;

  const mockPrisma = {
    liveClass: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    cohort: {
      findUnique: jest.fn(),
    },
    liveSchedule: {
      count: jest.fn(),
    },
    assignment: {
      create: jest.fn(),
      update: jest.fn(),
    },
    liveClassAssignment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockLiveSchedules = {
    create: jest.fn(),
    assertNoScheduleConflicts: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LiveClassService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: LiveScheduleService, useValue: mockLiveSchedules },
      ],
    }).compile();

    service = module.get<LiveClassService>(LiveClassService);
    prisma = module.get<PrismaService>(PrismaService);
    liveSchedules = module.get<LiveScheduleService>(LiveScheduleService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should filter by cohortId, status, and instructorId', async () => {
      mockPrisma.liveClass.findMany.mockResolvedValue([]);
      mockPrisma.liveClass.count.mockResolvedValue(0);

      const query = { cohortId: 'c1', status: 'OPENING', instructorId: 'i1' };
      await service.findAll(query as any);

      expect(mockPrisma.liveClass.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              { cohortId: 'c1' },
              { status: 'OPENING' },
              { instructorId: 'i1' },
            ]),
          }),
        }),
      );
    });

    it('should handle complex date logic for month filter', async () => {
      mockPrisma.liveClass.findMany.mockResolvedValue([]);
      mockPrisma.liveClass.count.mockResolvedValue(0);

      await service.findAll({ month: '2024-03' } as any);

      expect(mockPrisma.liveClass.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                cohort: expect.objectContaining({
                  AND: expect.arrayContaining([
                    expect.objectContaining({ startDate: expect.anything() }),
                  ]),
                }),
              }),
            ]),
          }),
        }),
      );
    });

    it('should handle onlyAvailable filter', async () => {
      mockPrisma.liveClass.findMany.mockResolvedValue([]);
      mockPrisma.liveClass.count.mockResolvedValue(0);

      await service.findAll({ onlyAvailable: true } as any);

      expect(mockPrisma.liveClass.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                cohort: expect.objectContaining({
                  AND: expect.arrayContaining([
                    expect.objectContaining({ status: 'OPENING' }),
                  ]),
                }),
              }),
            ]),
          }),
        }),
      );
    });

    it('should handle upcomingRegistration filter', async () => {
      mockPrisma.liveClass.findMany.mockResolvedValue([]);
      mockPrisma.liveClass.count.mockResolvedValue(0);

      await service.findAll({ upcomingRegistration: true } as any);

      expect(mockPrisma.liveClass.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                cohort: expect.objectContaining({
                  AND: expect.arrayContaining([
                    expect.objectContaining({ AND: expect.any(Array) }),
                  ]),
                }),
              }),
            ]),
          }),
        }),
      );
    });

    it('should handle courseProfileId, level, and q search', async () => {
      mockPrisma.liveClass.findMany.mockResolvedValue([]);
      mockPrisma.liveClass.count.mockResolvedValue(0);

      await service.findAll({
        courseProfileId: 'cp1',
        level: 'N3',
        q: 'test-class',
      } as any);

      expect(mockPrisma.liveClass.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              { cohort: { AND: [
                { courseProfile: { level: 'N3' } },
                { courseProfileId: 'cp1' },
              ] } },
              { OR: [
                { code: { contains: 'test-class', mode: 'insensitive' } },
                { name: { contains: 'test-class', mode: 'insensitive' } },
              ] },
            ]),
          }),
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return a class if found', async () => {
      mockPrisma.liveClass.findUnique.mockResolvedValue({ id: 'l1' });
      const result = await service.findById('l1');
      expect(result.id).toBe('l1');
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrisma.liveClass.findUnique.mockResolvedValue(null);
      await expect(service.findById('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const input = {
      cohortId: 'c1',
      code: 'LC01',
      name: 'Class 1',
      instructorId: 'i1',
      maxStudents: 20,
      schedules: [
        { weekday: 1, startTime: '08:00', endTime: '10:00' },
      ],
    } as any;

    it('should throw BadRequestException if cohort missing', async () => {
      mockPrisma.cohort.findUnique.mockResolvedValue(null);
      await expect(service.create(input)).rejects.toThrow('Invalid cohortId');
    });

    it('should throw BadRequestException if cohort is COMPLETED or ARCHIVED', async () => {
      mockPrisma.cohort.findUnique.mockResolvedValue({ id: 'c1', status: 'COMPLETED' });
      await expect(service.create(input)).rejects.toThrow('Không thể tạo lớp LIVE trong Cohort đã kết thúc/lưu trữ');
    });

    it('should create class and schedules while checking for conflicts', async () => {
      mockPrisma.cohort.findUnique.mockResolvedValue({ id: 'c1', status: 'OPENING' });
      mockPrisma.liveClass.create.mockResolvedValue({ id: 'l1', ...input });
      
      const result = await service.create(input);

      expect(result.id).toBe('l1');
      expect(liveSchedules.assertNoScheduleConflicts).toHaveBeenCalled();
      expect(liveSchedules.create).toHaveBeenCalled();
      expect(mockPrisma.liveClass.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const id = 'l1';
    const before = { id, code: 'LC01', status: 'DRAFT' };

    it('should throw NotFoundException if class missing', async () => {
      mockPrisma.liveClass.findUnique.mockResolvedValue(null);
      await expect(service.update(id, {})).rejects.toThrow(NotFoundException);
    });

    it('should fail if invalid status transition', async () => {
      mockPrisma.liveClass.findUnique.mockResolvedValue(before);
      await expect(service.update(id, { status: 'COMPLETED' })).rejects.toThrow('Không hỗ trợ chuyển trạng thái');
    });

    it('should fail to publish (OPENING) if no weekly schedules exist', async () => {
      mockPrisma.liveClass.findUnique.mockResolvedValue(before);
      mockPrisma.liveSchedule.count.mockResolvedValue(0);

      await expect(service.update(id, { status: 'OPENING' })).rejects.toThrow('Lớp LIVE cần có ít nhất 1 lịch học tuần');
    });

    it('should update class and allow transition to OPENING if schedules exist', async () => {
      mockPrisma.liveClass.findUnique.mockResolvedValue(before);
      mockPrisma.liveSchedule.count.mockResolvedValue(1);
      mockPrisma.liveClass.update.mockResolvedValue({ ...before, status: 'OPENING' });

      const result = await service.update(id, { status: 'OPENING' });
      expect(result.status).toBe('OPENING');
    });

    it('should throw BadRequestException if class is ARCHIVED', async () => {
      mockPrisma.liveClass.findUnique.mockResolvedValue({ id, status: 'ARCHIVED' });
      await expect(service.update(id, { status: 'DRAFT' })).rejects.toThrow('Lớp LIVE đã được lưu trữ');
    });
  });

  describe('Assignment Management', () => {
    describe('addAssignment', () => {
      it('should create new master assignment if title/instructions provided', async () => {
        const input = { liveClassId: 'l1', title: 'New A', instructions: 'Notes' };
        mockPrisma.assignment.create.mockResolvedValue({ id: 'a1', title: 'New A' });
        mockPrisma.liveClassAssignment.create.mockResolvedValue({ id: 'link1' });

        await service.addAssignment(input);

        expect(mockPrisma.assignment.create).toHaveBeenCalled();
        expect(mockPrisma.liveClassAssignment.create).toHaveBeenCalledWith(
          expect.objectContaining({ data: expect.objectContaining({ assignmentId: 'a1' }) })
        );
      });

      it('should throw BadRequestException if neither id nor content provided', async () => {
        await expect(service.addAssignment({})).rejects.toThrow('assignmentId or title/instructions required');
      });
    });

    describe('updateAssignment', () => {
      it('should update link and underlying master content conditionally', async () => {
        const existing = { id: 'link1', assignmentId: 'a1' };
        mockPrisma.liveClassAssignment.findUnique.mockResolvedValue(existing);
        mockPrisma.liveClassAssignment.update.mockResolvedValue({ ...existing, titleOverride: 'New' });
        
        await service.updateAssignment('link1', { titleOverride: 'New', title: 'Updated Master' });

        expect(mockPrisma.liveClassAssignment.update).toHaveBeenCalled();
        expect(mockPrisma.assignment.update).toHaveBeenCalledWith(
          expect.objectContaining({ where: { id: 'a1' }, data: expect.objectContaining({ title: 'Updated Master' }) })
        );
      });

      it('should throw NotFoundException if link missing', async () => {
        mockPrisma.liveClassAssignment.findUnique.mockResolvedValue(null);
        await expect(service.updateAssignment('unknown', {})).rejects.toThrow(NotFoundException);
      });
    });

    it('should find assignments for a class', async () => {
      mockPrisma.liveClassAssignment.findMany.mockResolvedValue([]);
      await service.findAssignments('l1');
      expect(mockPrisma.liveClassAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { OR: [{ liveClassId: 'l1' }, { vodPackageId: 'l1' }] },
        }),
      );
    });

    it('should remove assignment', async () => {
      const result = await service.removeAssignment('link1');
      expect(result).toEqual({ ok: true });
      expect(mockPrisma.liveClassAssignment.delete).toHaveBeenCalledWith({ where: { id: 'link1' } });
    });
  });
});
