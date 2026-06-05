import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@server/shared';
import { ExamService } from '../src/modules/assessment/exam/exam.service';
import { ExamAttemptService } from '../src/modules/assessment/exam-attempt/exam-attempt.service';
import { AcademyAttemptStatus, AcademyExamStatus } from '@workspace/schemas';

describe('ExamAttemptService', () => {
  let service: ExamAttemptService;
  let mockPrisma: any;
  let mockExamService: any;

  beforeEach(async () => {
    mockPrisma = {
      academyExam: {
        findUnique: jest.fn(),
      },
      enrollment: {
        findUnique: jest.fn(),
      },
      academyExamAttempt: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      academyExamAttemptAnswer: {
        createMany: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((cb) => cb(mockPrisma)),
    };

    mockExamService = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamAttemptService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: ExamService,
          useValue: mockExamService,
        },
      ],
    }).compile();

    service = module.get<ExamAttemptService>(ExamAttemptService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('startAttempt', () => {
    it('should throw BadRequest if userId or enrollmentId missing', async () => {
      await expect(service.startAttempt({ userId: '', enrollmentId: 'e1', examId: 'ex1' } as any)).rejects.toThrow(BadRequestException);
      await expect(service.startAttempt({ userId: 'u1', enrollmentId: '', examId: 'ex1' } as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFound if exam missing or not published', async () => {
      mockPrisma.academyExam.findUnique.mockResolvedValue(null);
      await expect(service.startAttempt({ userId: 'u1', enrollmentId: 'en1', examId: 'ex1' })).rejects.toThrow(NotFoundException);

      mockPrisma.academyExam.findUnique.mockResolvedValue({ id: 'ex1', status: 'DRAFT' });
      await expect(service.startAttempt({ userId: 'u1', enrollmentId: 'en1', examId: 'ex1' })).rejects.toThrow(NotFoundException);
    });

    it('should throw if enrollment mismatch', async () => {
      mockPrisma.academyExam.findUnique.mockResolvedValue({ id: 'ex1', status: AcademyExamStatus.PUBLISHED });
      mockPrisma.enrollment.findUnique.mockResolvedValue(null);
      await expect(service.startAttempt({ userId: 'u1', enrollmentId: 'en1', examId: 'ex1' })).rejects.toThrow(NotFoundException);

      mockPrisma.enrollment.findUnique.mockResolvedValue({ id: 'en1', userId: 'other' });
      await expect(service.startAttempt({ userId: 'u1', enrollmentId: 'en1', examId: 'ex1' })).rejects.toThrow(BadRequestException);
    });

    it('should return existing in-progress attempt', async () => {
      mockPrisma.academyExam.findUnique.mockResolvedValue({ id: 'ex1', status: AcademyExamStatus.PUBLISHED });
      mockPrisma.enrollment.findUnique.mockResolvedValue({ id: 'en1', userId: 'u1' });
      const existing = { id: 'att1', status: AcademyAttemptStatus.IN_PROGRESS };
      mockPrisma.academyExamAttempt.findFirst.mockResolvedValue(existing);

      const result = await service.startAttempt({ userId: 'u1', enrollmentId: 'en1', examId: 'ex1' });
      expect(result.id).toBe('att1');
      expect(mockPrisma.academyExamAttempt.create).not.toHaveBeenCalled();
    });

    it('should create new attempt if none in-progress', async () => {
      mockPrisma.academyExam.findUnique.mockResolvedValue({ id: 'ex1', status: AcademyExamStatus.PUBLISHED });
      mockPrisma.enrollment.findUnique.mockResolvedValue({ id: 'en1', userId: 'u1' });
      mockPrisma.academyExamAttempt.findFirst.mockResolvedValue(null);
      mockPrisma.academyExamAttempt.create.mockResolvedValue({ id: 'att-new', userId: 'u1' });

      const result = await service.startAttempt({ userId: 'u1', enrollmentId: 'en1', examId: 'ex1' });
      expect(result.id).toBe('att-new');
      expect(mockPrisma.academyExamAttempt.create).toHaveBeenCalled();
    });
  });

  describe('submitAttempt', () => {
    const mockFullExam = {
      id: 'ex1',
      settings: { passThreshold: 50 },
      sections: [
        {
          id: 's1',
          questions: [
            {
              id: 'eq1',
              points: 10,
              question: {
                id: 'q1',
                questionType: 'SINGLE_CHOICE',
                options: [{ id: 'opt1', isCorrect: true, optionKey: 'A' }, { id: 'opt2', isCorrect: false, optionKey: 'B' }],
              },
            },
            {
              id: 'eq2',
              points: 20,
              question: {
                id: 'q2',
                questionType: 'MULTIPLE_CHOICE',
                correctAnswer: ['A', 'C'],
                options: [{ optionKey: 'A' }, { optionKey: 'B' }, { optionKey: 'C' }],
              },
            },
          ],
        },
      ],
    };

    it('should calculate scores and pass/fail status correctly', async () => {
      const attempt = {
        id: 'att1',
        status: AcademyAttemptStatus.IN_PROGRESS,
        draftAnswers: {
          q1: 'opt1', // Correct
          q2: ['A', 'C'], // Correct
        },
        exam: mockFullExam,
      };
      mockPrisma.academyExamAttempt.findUnique.mockResolvedValue(attempt);

      await service.submitAttempt('att1');

      expect(mockPrisma.academyExamAttempt.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'att1' },
        data: expect.objectContaining({
          score: 30, // 10 + 20
          percentage: 100,
          isPassed: true,
          status: AcademyAttemptStatus.SUBMITTED,
        }),
      }));
    });

    it('should handle partial/incorrect answers', async () => {
      const attempt = {
        id: 'att1',
        status: AcademyAttemptStatus.IN_PROGRESS,
        draftAnswers: {
          q1: 'opt2', // Wrong
          q2: ['A'], // Partial/Wrong
        },
        exam: mockFullExam,
      };
      mockPrisma.academyExamAttempt.findUnique.mockResolvedValue(attempt);

      await service.submitAttempt('att1');

      expect(mockPrisma.academyExamAttempt.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          score: 0,
          isPassed: false,
        }),
      }));
    });

    it('should throw if attempt not found or already submitted', async () => {
      mockPrisma.academyExamAttempt.findUnique.mockResolvedValue(null);
      await expect(service.submitAttempt('att1')).rejects.toThrow(NotFoundException);

      mockPrisma.academyExamAttempt.findUnique.mockResolvedValue({ status: AcademyAttemptStatus.SUBMITTED });
      await expect(service.submitAttempt('att1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAttemptDetail', () => {
    it('should map answer details into readable format', async () => {
      const attempt = {
        id: 'att1',
        startedAt: new Date(),
        submittedAt: new Date(),
        exam: { title: 'Test Exam' },
        answers: [
          {
            id: 'ans1',
            isCorrect: true,
            scoreAwarded: 10,
            selectedOptionId: 'opt1',
            question: {
              stem: 'Why?',
              explanation: 'Because',
              options: [{ id: 'opt1', optionKey: 'A', content: 'Choice A', isCorrect: true }],
            },
          },
        ],
      };
      mockPrisma.academyExamAttempt.findUnique.mockResolvedValue(attempt);

      const result = await service.getAttemptDetail('att1');

      expect(result.details[0]).toEqual(expect.objectContaining({
        questionText: 'Why?',
        userAnswer: 'A',
        isCorrect: true,
      }));
      expect(result.quizTitle).toBe('Test Exam');
    });

    it('should throw if attempt missing', async () => {
      mockPrisma.academyExamAttempt.findUnique.mockResolvedValue(null);
      await expect(service.getAttemptDetail('att1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should handle latestOnly flag correctly', async () => {
      const attempts = [{ id: 'att2' }];
      mockPrisma.academyExamAttempt.findFirst.mockResolvedValue(attempts[0]);
      
      const result = await service.findAll({ userId: 'u1', latestOnly: true });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('att2');
      expect(mockPrisma.academyExamAttempt.findFirst).toHaveBeenCalled();
    });

    it('should return multiple items if latestOnly is false', async () => {
      mockPrisma.academyExamAttempt.findMany.mockResolvedValue([{ id: 'a1' }, { id: 'a2' }]);
      const result = await service.findAll({ userId: 'u1' });
      expect(result).toHaveLength(2);
    });
  });
});
