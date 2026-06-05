import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@server/shared/prisma/prisma.service';
import { AuditLoggerService } from '../src/modules/audit-logger.service';
import { AssignmentSubmissionService } from '../src/modules/assessment/assignment-submission/assignment-submission.service';

describe('AssignmentSubmissionService', () => {
  let service: AssignmentSubmissionService;
  let mockPrisma: any;
  let mockAudit: any;

  beforeEach(async () => {
    mockPrisma = {
      assignmentSubmission: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      liveClassAssignment: {
        findUnique: jest.fn(),
      },
    };

    mockAudit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignmentSubmissionService,
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

    service = module.get<AssignmentSubmissionService>(AssignmentSubmissionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return parsed submissions', async () => {
      mockPrisma.assignmentSubmission.findMany.mockResolvedValue([
        { id: '1', content: '{"text":"test"}', liveClassAssignment: { id: 'lca1', liveClassId: 'lc1', assignmentId: 'a1' } },
      ]);

      const result = await service.findAll({ userId: 'u1' });

      expect(result[0].content).toEqual({ text: 'test' });
      expect(result[0].liveClassId).toBe('lc1');
    });
  });

  describe('findById', () => {
    it('should throw NotFound if submission does not exist', async () => {
      mockPrisma.assignmentSubmission.findUnique.mockResolvedValue(null);
      await expect(service.findById('invalid')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequest if not owner and not manager', async () => {
      mockPrisma.assignmentSubmission.findUnique.mockResolvedValue({ id: 's1', userId: 'u1' });
      await expect(service.findById('s1', 'u2', false)).rejects.toThrow('your own submissions');
    });

    it('should return parsed submission if authorized', async () => {
      mockPrisma.assignmentSubmission.findUnique.mockResolvedValue({ 
        id: 's1', userId: 'u1', content: '{"q":1}', 
        liveClassAssignment: { id: 'lca1' } 
      });
      const result = await service.findById('s1', 'u1', false);
      expect(result.content).toEqual({ q: 1 });
    });
  });

  describe('create', () => {
    const dto = { userId: 'u1', classAssessmentId: 'lca1', content: { text: 'Sub' } } as any;

    it('should throw BadRequest if already submitted', async () => {
      mockPrisma.liveClassAssignment.findUnique.mockResolvedValue({ id: 'lca1' });
      mockPrisma.assignmentSubmission.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(service.create(dto, 'u1')).rejects.toThrow('already submitted');
    });

    it('should create and return the new submission', async () => {
      mockPrisma.liveClassAssignment.findUnique.mockResolvedValue({ id: 'lca1' });
      mockPrisma.assignmentSubmission.findFirst.mockResolvedValue(null);
      mockPrisma.assignmentSubmission.create.mockResolvedValue({ id: 'new-s1', userId: 'u1' });
      
      // create() calls findById() at the end
      mockPrisma.assignmentSubmission.findUnique.mockResolvedValue({ 
        id: 'new-s1', userId: 'u1', liveClassAssignment: { id: 'lca1' } 
      });

      const result = await service.create(dto, 'u1');
      expect(result.id).toBe('new-s1');
      expect(mockPrisma.assignmentSubmission.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ content: '{"text":"Sub"}' })
      }));
    });
  });

  describe('update', () => {
    const dto = { score: 9, feedback: 'Great', status: 'GRADED' } as any;

    it('should update score and log audit', async () => {
      const old = { id: 's1', userId: 'u1', liveClassAssignment: { id: 'lca1' } };
      mockPrisma.assignmentSubmission.findUnique.mockResolvedValue(old);
      mockPrisma.assignmentSubmission.update.mockResolvedValue({ ...old, grade: 9, status: 'GRADED' });

      const result = await service.update('s1', dto, 'admin1', true);

      expect(result.grade).toBe(9);
      expect(mockAudit.log).toHaveBeenCalledWith(expect.objectContaining({
        action: 'assignment_submission.grade'
      }));
    });
  });

  describe('delete', () => {
    it('should delete and log audit', async () => {
      mockPrisma.assignmentSubmission.findUnique.mockResolvedValue({ id: 's1', userId: 'u1' });
      const result = await service.delete('s1', 'admin1', true);

      expect(result.ok).toBe(true);
      expect(mockPrisma.assignmentSubmission.delete).toHaveBeenCalled();
      expect(mockAudit.log).toHaveBeenCalledWith(expect.objectContaining({
        action: 'assignment_submission.delete'
      }));
    });
  });
});
