import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@server/shared';
import { AcademyAssessmentKind } from '@workspace/schemas';
import { AssessmentPlanService } from '../src/modules/assessment/assessment-plan/assessment-plan.service';

describe('AssessmentPlanService', () => {
  let service: AssessmentPlanService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      academyCourseProfileAssessment: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      liveClass: {
        findUnique: jest.fn(),
      },
      vodPackage: {
        findUnique: jest.fn(),
      },
      enrollment: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
      academyExamAttempt: {
        findMany: jest.fn(),
      },
      lesson: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((cb) => cb(mockPrisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssessmentPlanService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<AssessmentPlanService>(AssessmentPlanService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPlanByCourseProfileId', () => {
    it('should return assessments for a course profile', async () => {
      const mockResult = [{ id: 'a1', courseProfileId: 'cp1' }];
      mockPrisma.academyCourseProfileAssessment.findMany.mockResolvedValue(mockResult);

      const result = await service.getPlanByCourseProfileId('cp1');

      expect(mockPrisma.academyCourseProfileAssessment.findMany).toHaveBeenCalledWith({
        where: { courseProfileId: 'cp1', isActive: true },
        include: expect.any(Object),
        orderBy: { orderIndex: 'asc' },
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('updatePlan', () => {
    it('should update the plan within a transaction', async () => {
      const dto = {
        courseProfileId: 'cp1',
        items: [
          {
            examId: 'e1',
            assessmentKind: AcademyAssessmentKind.FINAL_EXAM,
            orderIndex: 0,
            isRequired: true,
            isActive: true,
          },
          {
            examId: 'e2',
            assessmentKind: AcademyAssessmentKind.LESSON_CHECKPOINT,
            triggerLessonId: 'l1',
            moduleId: 'm1',
            orderIndex: 1,
            isRequired: true,
            isActive: true,
          }
        ],
      };

      await service.updatePlan(dto);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.academyCourseProfileAssessment.deleteMany).toHaveBeenCalledWith({
        where: { courseProfileId: 'cp1' },
      });
      expect(mockPrisma.academyCourseProfileAssessment.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({ assessmentKind: AcademyAssessmentKind.FINAL_EXAM, triggerLessonId: null }),
          expect.objectContaining({ assessmentKind: AcademyAssessmentKind.LESSON_CHECKPOINT, triggerLessonId: 'l1' }),
        ],
      });
    });
  });

  describe('getLearnerAssessmentStatus', () => {
    it('should throw if neither deliveryTargetId nor enrollmentId is provided', async () => {
      await expect(service.getLearnerAssessmentStatus({ userId: 'u1' })).rejects.toThrow(
        'Either deliveryTargetId or enrollmentId must be provided',
      );
    });

    it('should throw NotFound if delivery target (LiveClass/VOD) does not exist', async () => {
      mockPrisma.liveClass.findUnique.mockResolvedValue(null);
      mockPrisma.vodPackage.findUnique.mockResolvedValue(null);

      await expect(
        service.getLearnerAssessmentStatus({ userId: 'u1', deliveryTargetId: 'invalid' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if enrollmentId provided but not found for user', async () => {
      mockPrisma.enrollment.findFirst.mockResolvedValue(null);
      await expect(
        service.getLearnerAssessmentStatus({ userId: 'u1', enrollmentId: 'en1' })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequest if enrollment mismatch with delivery target', async () => {
      mockPrisma.liveClass.findUnique.mockResolvedValue({ id: 'lc1', cohort: { courseProfileId: 'cp1' } });
      mockPrisma.enrollment.findFirst.mockResolvedValue(null); // No enrollment for this target
      
      await expect(
        service.getLearnerAssessmentStatus({ userId: 'u1', enrollmentId: 'en1', deliveryTargetId: 'lc1' })
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle liveClass delivery target and map status correctly', async () => {
      mockPrisma.liveClass.findUnique.mockResolvedValue({
        id: 'lc1',
        cohort: { courseProfileId: 'cp1' },
      });
      const plan = [
        { id: 'a1', examId: 'e1', assessmentKind: 'FINAL_EXAM', isRequired: true, exam: { title: 'Exam 1' } },
        { id: 'a2', examId: 'e2', assessmentKind: 'FINAL_EXAM', isRequired: true, exam: { title: 'Exam 2' } },
        { id: 'a3', examId: 'e3', assessmentKind: 'FINAL_EXAM', isRequired: true, exam: { title: 'Exam 3' } },
      ];
      mockPrisma.academyCourseProfileAssessment.findMany.mockResolvedValue(plan);
      
      const enrollment = { id: 'en1' };
      mockPrisma.enrollment.findFirst.mockResolvedValue(enrollment);

      const attempts = [
        { examId: 'e1', status: 'SUBMITTED', isPassed: true, id: 'att1', score: 10 },
        { examId: 'e2', status: 'SUBMITTED', isPassed: false, id: 'att2', score: 2 },
        { examId: 'e3', status: 'IN_PROGRESS', id: 'att3' },
      ];
      mockPrisma.academyExamAttempt.findMany.mockResolvedValue(attempts);

      const result = await service.getLearnerAssessmentStatus({ userId: 'u1', deliveryTargetId: 'lc1' });

      expect(result[0].status).toBe('PASSED');
      expect(result[1].status).toBe('FAILED');
      expect(result[2].status).toBe('IN_PROGRESS');
    });
  });

  describe('canAccessLesson', () => {
    it('should throw NotFound if lesson does not exist', async () => {
      mockPrisma.lesson.findUnique.mockResolvedValue(null);
      await expect(
        service.canAccessLesson({ userId: 'u1', lessonId: 'invalid', enrollmentId: 'en1' })
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow access if no milestones are required', async () => {
      mockPrisma.lesson.findUnique.mockResolvedValue({
        id: 'l1',
        module: { courseProfileId: 'cp1', orderIndex: 1 },
        orderIndex: 1,
        moduleId: 'm1',
      });
      mockPrisma.academyCourseProfileAssessment.findMany.mockResolvedValue([]); // No required milestones

      const result = await service.canAccessLesson({ userId: 'u1', lessonId: 'l1', enrollmentId: 'en1' });
      expect(result.allowed).toBe(true);
    });

    it('should block access if a LESSON_CHECKPOINT in the same module is not passed', async () => {
      const targetLesson = {
        id: 'l2', orderIndex: 10, moduleId: 'm1',
        module: { courseProfileId: 'cp1', orderIndex: 1 },
      };
      mockPrisma.lesson.findUnique.mockResolvedValue(targetLesson);

      const milestone = {
        id: 'a1', examId: 'e1', assessmentKind: 'LESSON_CHECKPOINT',
        triggerLesson: { id: 'l1', orderIndex: 5 },
        moduleId: 'm1', isActive: true, isRequired: true,
      };
      mockPrisma.academyCourseProfileAssessment.findMany.mockResolvedValue([milestone]);
      mockPrisma.academyExamAttempt.findMany.mockResolvedValue([]); // No passed attempts

      const result = await service.canAccessLesson({ userId: 'u1', lessonId: 'l2', enrollmentId: 'en1' });
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('hoàn thành bài kiểm tra');
    });

    it('should block access if a milestone in a PREVIOUS module is not passed', async () => {
      const targetLesson = {
        id: 'l10', orderIndex: 1, moduleId: 'm2',
        module: { courseProfileId: 'cp1', orderIndex: 2 }, // Current module index 2
      };
      mockPrisma.lesson.findUnique.mockResolvedValue(targetLesson);

      const milestone = {
        id: 'a1', examId: 'e1', assessmentKind: 'MODULE_CHECKPOINT',
        module: { id: 'm1', orderIndex: 1 }, // Milestone in previous module 1
        isActive: true, isRequired: true,
      };
      mockPrisma.academyCourseProfileAssessment.findMany.mockResolvedValue([milestone]);
      mockPrisma.academyExamAttempt.findMany.mockResolvedValue([]);

      const result = await service.canAccessLesson({ userId: 'u1', lessonId: 'l10', enrollmentId: 'en1' });
      
      expect(result.allowed).toBe(false);
    });

    it('should allow access if all blocking milestones are passed', async () => {
      mockPrisma.lesson.findUnique.mockResolvedValue({
        id: 'l2', orderIndex: 10, moduleId: 'm1',
        module: { courseProfileId: 'cp1', orderIndex: 1 },
      });
      const milestone = {
        id: 'a1', examId: 'e1', assessmentKind: 'LESSON_CHECKPOINT',
        triggerLesson: { id: 'l1', orderIndex: 5 },
        moduleId: 'm1', isActive: true, isRequired: true,
      };
      mockPrisma.academyCourseProfileAssessment.findMany.mockResolvedValue([milestone]);
      
      // Found passed attempt
      mockPrisma.academyExamAttempt.findMany.mockResolvedValue([
        { examId: 'e1', isPassed: true, status: 'SUBMITTED' }
      ]);

      const result = await service.canAccessLesson({ userId: 'u1', lessonId: 'l2', enrollmentId: 'en1' });
      expect(result.allowed).toBe(true);
    });
  });
});
