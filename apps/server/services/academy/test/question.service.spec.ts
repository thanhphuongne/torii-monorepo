import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QuestionService } from '../src/modules/assessment/question/question.service';
import { PrismaService } from '@server/shared/prisma/prisma.service';

describe('QuestionService', () => {
  let service: QuestionService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      academyQuestion: {
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
      academyQuestionOption: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((cb) => cb(mockPrisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<QuestionService>(QuestionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createQuestion', () => {
    it('should create a question with options and stringified correctAnswer', async () => {
      const dto = {
        stem: 'What is 1+1?',
        questionType: 'SINGLE_CHOICE',
        correctAnswer: ['A'],
        options: [{ optionKey: 'A', content: '2', isCorrect: true, orderIndex: 0 }],
      } as any;

      mockPrisma.academyQuestion.create.mockResolvedValue({ id: 'q1', ...dto });

      const result = await service.createQuestion(dto);

      expect(mockPrisma.academyQuestion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          correctAnswer: JSON.stringify(['A']),
          options: {
            create: [expect.objectContaining({ optionKey: 'A' })],
          },
        }),
        include: { options: true },
      });
      expect(result.id).toBe('q1');
    });
  });

  describe('updateQuestion', () => {
    it('should replace options if provided during update', async () => {
      const dto = {
        stem: 'Updated stem',
        options: [{ optionKey: 'B', content: 'New opt', isCorrect: true, orderIndex: 0 }],
      } as any;

      mockPrisma.academyQuestion.update.mockResolvedValue({ id: 'q1' });
      mockPrisma.academyQuestion.findUnique.mockResolvedValue({ id: 'q1', stem: 'Updated stem', options: [] });

      await service.updateQuestion('q1', dto);

      expect(mockPrisma.academyQuestionOption.deleteMany).toHaveBeenCalledWith({
        where: { questionId: 'q1' },
      });
      expect(mockPrisma.academyQuestionOption.createMany).toHaveBeenCalled();
      expect(mockPrisma.academyQuestion.update).toHaveBeenCalled();
    });
  });

  describe('getQuestion', () => {
    it('should throw NotFound if missing', async () => {
      mockPrisma.academyQuestion.findUnique.mockResolvedValue(null);
      await expect(service.getQuestion('missing')).rejects.toThrow(NotFoundException);
    });

    it('should return question if found', async () => {
      mockPrisma.academyQuestion.findUnique.mockResolvedValue({ id: 'q1' });
      const result = await service.getQuestion('q1');
      expect(result.id).toBe('q1');
    });
  });

  describe('deleteQuestion', () => {
    it('should throw BadRequest if question is used in exams', async () => {
      mockPrisma.academyQuestion.findUnique.mockResolvedValue({
        id: 'q1',
        _count: { examQuestions: 1, attemptAnswers: 0 },
      });

      await expect(service.deleteQuestion('q1')).rejects.toThrow('bài thi');
    });

    it('should throw BadRequest if question has history entries', async () => {
        mockPrisma.academyQuestion.findUnique.mockResolvedValue({
          id: 'q1',
          _count: { examQuestions: 0, attemptAnswers: 5 },
        });
  
        await expect(service.deleteQuestion('q1')).rejects.toThrow('học viên thực hiện');
      });

    it('should delete if not used anywhere', async () => {
      mockPrisma.academyQuestion.findUnique.mockResolvedValue({
        id: 'q1',
        _count: { examQuestions: 0, attemptAnswers: 0 },
      });
      mockPrisma.academyQuestion.delete.mockResolvedValue({ id: 'q1' });

      const result = await service.deleteQuestion('q1');

      expect(mockPrisma.academyQuestion.delete).toHaveBeenCalledWith({ where: { id: 'q1' } });
      expect(result.id).toBe('q1');
    });
  });
});
