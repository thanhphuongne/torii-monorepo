import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@server/shared';
import { ExamService } from '../src/modules/assessment/exam/exam.service';

describe('ExamService', () => {
  let service: ExamService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      academyExam: {
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
      academyExamSection: {
        findUnique: jest.fn(),
      },
      academyExamQuestion: {
        findFirst: jest.fn(),
        createMany: jest.fn(),
        delete: jest.fn(),
      },
      academyCourseProfileAssessment: {
        findMany: jest.fn(),
      },
      academyExamAttempt: {
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<ExamService>(ExamService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createExam', () => {
    it('should create an exam with sections', async () => {
      const dto = {
        title: 'Exam 1',
        sections: [
          { title: 'Sec 1', orderIndex: 0, sectionType: 'CHOICE' as any },
        ],
      };
      mockPrisma.academyExam.create.mockResolvedValue({ id: 'e1', ...dto });

      const result = await service.createExam(dto as any);

      expect(mockPrisma.academyExam.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          title: 'Exam 1',
          sections: {
            create: [expect.objectContaining({ title: 'Sec 1' })],
          },
        }),
      }));
      expect(result.id).toBe('e1');
    });
  });

  describe('updateExam', () => {
    it('should update exam metadata', async () => {
      const dto = { title: 'Updated' };
      mockPrisma.academyExam.update.mockResolvedValue({ id: 'e1', ...dto });

      const result = await service.updateExam('e1', dto as any);

      expect(mockPrisma.academyExam.update).toHaveBeenCalledWith({
        where: { id: 'e1' },
        data: expect.objectContaining({ title: 'Updated' }),
      });
      expect(result.title).toBe('Updated');
    });
  });

  describe('findExams', () => {
    it('should filter exams by query params', async () => {
      mockPrisma.academyExam.findMany.mockResolvedValue([]);
      await service.findExams({ courseProfileId: 'cp1', q: 'search' });

      expect(mockPrisma.academyExam.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          courseProfileId: 'cp1',
          OR: expect.any(Array),
        }),
      }));
    });
  });

  describe('getExamDetail', () => {
    it('should return exam detail if found', async () => {
      const exam = { id: 'e1', sections: [] };
      mockPrisma.academyExam.findUnique.mockResolvedValue(exam);

      const result = await service.getExamDetail('e1');
      expect(result).toEqual(exam);
    });

    it('should throw NotFound if exam missing', async () => {
      mockPrisma.academyExam.findUnique.mockResolvedValue(null);
      await expect(service.getExamDetail('e1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('addQuestionsToSection', () => {
    it('should throw NotFound if section missing', async () => {
      mockPrisma.academyExamSection.findUnique.mockResolvedValue(null);
      await expect(service.addQuestionsToSection({ sectionId: 's1', questionIds: [], points: 1 })).rejects.toThrow(NotFoundException);
    });

    it('should create question relations with incremented orderIndex', async () => {
      mockPrisma.academyExamSection.findUnique.mockResolvedValue({ id: 's1', examId: 'e1' });
      mockPrisma.academyExamQuestion.findFirst.mockResolvedValue({ orderIndex: 5 });
      mockPrisma.academyExamQuestion.createMany.mockResolvedValue({ count: 2 });

      await service.addQuestionsToSection({ sectionId: 's1', questionIds: ['q1', 'q2'], points: 2 });

      expect(mockPrisma.academyExamQuestion.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({ questionId: 'q1', orderIndex: 6 }),
          expect.objectContaining({ questionId: 'q2', orderIndex: 7 }),
        ],
      });
    });
  });

  describe('removeQuestionFromExam', () => {
    it('should delete specified exam question relation', async () => {
      mockPrisma.academyExamQuestion.delete.mockResolvedValue({ id: 'eq1' });
      await service.removeQuestionFromExam('eq1');
      expect(mockPrisma.academyExamQuestion.delete).toHaveBeenCalledWith({ where: { id: 'eq1' } });
    });
  });

  describe('deleteExam', () => {
    it('should throw BadRequest if exam is linked to assessment plan', async () => {
      mockPrisma.academyCourseProfileAssessment.findMany.mockResolvedValue([
        { courseProfile: { title: 'P1', cohorts: [] } }
      ]);

      await expect(service.deleteExam('e1')).rejects.toThrow(BadRequestException);
      await expect(service.deleteExam('e1')).rejects.toThrow('gỡ khỏi kế hoạch đánh giá');
    });

    it('should throw BadRequest if exam has student attempts', async () => {
      mockPrisma.academyCourseProfileAssessment.findMany.mockResolvedValue([]);
      mockPrisma.academyExamAttempt.count.mockResolvedValue(5);

      await expect(service.deleteExam('e1')).rejects.toThrow(BadRequestException);
      await expect(service.deleteExam('e1')).rejects.toThrow('5 lượt làm bài');
    });

    it('should delete exam if no dependencies exist', async () => {
      mockPrisma.academyCourseProfileAssessment.findMany.mockResolvedValue([]);
      mockPrisma.academyExamAttempt.count.mockResolvedValue(0);
      mockPrisma.academyExam.delete.mockResolvedValue({ id: 'e1' });

      const result = await service.deleteExam('e1');

      expect(mockPrisma.academyExam.delete).toHaveBeenCalledWith({ where: { id: 'e1' } });
      expect(result.id).toBe('e1');
    });
  });
});
