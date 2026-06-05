import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { JlptMockService } from '../src/modules/jlpt-mock/jlpt-mock.service';
import { PrismaService } from '@server/shared/prisma/prisma.service';
import { Prisma } from '@prisma/generated';

describe('JlptMockService', () => {
  let service: JlptMockService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      jlptLevel: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      jlptSection: {
        findMany: jest.fn(),
        upsert: jest.fn(),
        findFirst: jest.fn(),
      },
      jlptScoringProfile: {
        updateMany: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      jlptScoringMapping: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
        findMany: jest.fn(),
      },
      jlptQuestionBankQuestion: {
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      jlptMondai: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      jlptMockExamTemplate: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      jlptMockExamSection: {
        findMany: jest.fn(),
      },
      jlptMockExamTemplateQuestion: {
        count: jest.fn(),
        aggregate: jest.fn().mockResolvedValue({ _max: { orderIndex: 0 } }),
        deleteMany: jest.fn(),
        upsert: jest.fn().mockImplementation((args) => Promise.resolve(args.create)),
        groupBy: jest.fn(),
      },
      jlptMockAttempt: {
        count: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      jlptMockAttemptSection: {
        createMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        findFirst: jest.fn(),
      },
      jlptMockAnswer: {
        upsert: jest.fn().mockImplementation((args) => Promise.resolve(args.create)),
        findMany: jest.fn(),
      },
      jlptQuestionBankOption: {
          findMany: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((cb) => {
        if (typeof cb === 'function') return cb(mockPrisma);
        return Promise.all(cb);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JlptMockService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<JlptMockService>(JlptMockService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ensureLevelConfig', () => {
    it('should upsert level and its default sections', async () => {
      mockPrisma.jlptLevel.upsert.mockResolvedValue({ id: 'l1', code: 'N5' });
      await service.ensureLevelConfig({ level: 'N5' } as any);
      expect(mockPrisma.jlptLevel.upsert).toHaveBeenCalled();
      expect(mockPrisma.jlptSection.upsert).toHaveBeenCalled();
    });
  });

  describe('assembleTemplateFromBank', () => {
    it('should randomly pick questions and attach to template', async () => {
      mockPrisma.jlptMockExamTemplate.findUnique.mockResolvedValue({
        id: 'tpl1',
        levelId: 'l1',
        status: 'DRAFT',
        sections: [{ id: 's1', code: 'VOCAB' }],
      });
      mockPrisma.jlptMondai.findMany.mockResolvedValue([{ id: 'm1', section: { code: 'VOCAB', levelId: 'l1' } }]);
      mockPrisma.jlptQuestionBankQuestion.findMany.mockResolvedValue([{ id: 'q1', sectionCode: 'VOCAB', mondaiId: 'm1' }]);
      mockPrisma.jlptMockExamTemplateQuestion.aggregate.mockResolvedValue({ _max: { orderIndex: 0 } });
      
      // Mock inner attachQuestions dependencies
      mockPrisma.jlptMockExamSection.findMany.mockResolvedValue([{ id: 's1', code: 'VOCAB' }]);
      // Note: jlptMondai.findMany already mocked above and will be used again in attachQuestions
      mockPrisma.jlptQuestionBankQuestion.findMany.mockResolvedValue([{ id: 'q1', levelId: 'l1', sectionCode: 'VOCAB', mondaiId: 'm1' }]);

      const result = await service.assembleTemplateFromBank({ templateId: 'tpl1', perMondaiCount: 1 });
      
      expect(result.ok).toBe(true);
      expect(mockPrisma.jlptMockExamTemplateQuestion.upsert).toHaveBeenCalled();
    });

    it('should throw if no matching questions found in bank', async () => {
      mockPrisma.jlptMockExamTemplate.findUnique.mockResolvedValue({ id: 'tpl1', sections: [], status: 'DRAFT' });
      mockPrisma.jlptMondai.findMany.mockResolvedValue([]);
      mockPrisma.jlptQuestionBankQuestion.findMany.mockResolvedValue([]);

      await expect(service.assembleTemplateFromBank({ templateId: 'tpl1' })).rejects.toThrow('phù hợp trong bank');
    });
  });

  describe('startAttempt', () => {
    it('should throw Forbidden if template is not published', async () => {
      mockPrisma.jlptMockExamTemplate.findUnique.mockResolvedValue({ id: 'tpl1', status: 'DRAFT' });
      await expect(service.startAttempt('tpl1', 'u1')).rejects.toThrow(ForbiddenException);
    });

    it('should create attempt and sections if valid', async () => {
        const sections = [{ id: 's1', orderIndex: 1, durationMinutes: 30 }];
        mockPrisma.jlptMockExamTemplate.findUnique.mockResolvedValue({ 
            id: 'tpl1', status: 'PUBLISHED', 
            level: { code: 'N5' },
            sections 
        });
        mockPrisma.jlptMockExamTemplateQuestion.count.mockResolvedValue(10);
        mockPrisma.jlptMockExamTemplateQuestion.groupBy.mockResolvedValue([{ sectionId: 's1' }]);
        mockPrisma.jlptMockAttempt.create.mockResolvedValue({ id: 'att1' });

        const result = await service.startAttempt('tpl1', 'u1');

        expect(result.attemptId).toBe('att1');
        expect(mockPrisma.jlptMockAttemptSection.createMany).toHaveBeenCalled();
    });
  });

  describe('submitAttempt', () => {
    it('should calculate scaled score and pass/fail (using separate section logic for N3)', async () => {
        const mockAttempt = {
            id: 'att1',
            userId: 'u1',
            status: 'IN_PROGRESS',
            levelCode: 'N3',
            template: {
                scoringProfile: {
                    mappings: [], // fallback to round(raw/max * 60)
                    minLanguageScaled: 19,
                    minReadingScaled: 19,
                    minListeningScaled: 19,
                    minTotalScaled: 95
                },
                questions: [
                    { id: 'tq1', questionId: 'q1', weight: 1, question: { questionType: 'VOCAB' }, section: { id: 's1' } }
                ]
            },
            answers: [{ templateQuestionId: 'tq1', selectedOptionId: 'optCorrect' }]
        };

        mockPrisma.jlptMockAttempt.findUnique
            .mockResolvedValueOnce(mockAttempt) // First call in submitAttempt
            .mockResolvedValueOnce(mockAttempt) // Call in maybeAutoSubmit... 
            .mockResolvedValue({ ...mockAttempt, status: 'SUBMITTED', template: { level: { code: 'N3' }, showDetailedReview: true }, answers: [] }); // Call in getAttemptResult

        mockPrisma.jlptQuestionBankOption.findMany.mockResolvedValue([{ id: 'optCorrect', questionId: 'q1', isCorrect: true }]);
        mockPrisma.jlptMockAttempt.update.mockResolvedValue({ id: 'att1' });

        const result = await service.submitAttempt('att1', 'u1');

        // Total raw 1/1 -> 100% -> 60 scaled.
        // N3 requirement: Language >= 19, Reading >= 19, Listening >= 19, Total >= 95.
        // Here Language=60, Reading=0, Listening=0 -> Total=60 -> FAILED (passMock=false)
        expect(mockPrisma.jlptMockAttempt.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ totalScoreScaled: 60, passMock: false })
        }));
    });

    it('should use combined scoring for N5', async () => {
        const mockAttempt = {
            id: 'att1',
            userId: 'u1',
            status: 'IN_PROGRESS',
            levelCode: 'N5',
            template: {
                scoringProfile: {
                    mappings: [],
                    minLanguageScaled: 19,
                    minReadingScaled: 19,
                    minListeningScaled: 19,
                    minTotalScaled: 80
                },
                questions: [
                    { id: 'tq1', questionId: 'q1', weight: 40, question: { questionType: 'VOCAB' }, section: { id: 's1' } }
                ]
            },
            answers: [{ templateQuestionId: 'tq1', selectedOptionId: 'optCorrect' }]
        };

        mockPrisma.jlptMockAttempt.findUnique
            .mockResolvedValueOnce(mockAttempt)
            .mockResolvedValueOnce(mockAttempt)
            .mockResolvedValue({ ...mockAttempt, status: 'SUBMITTED', template: { level: { code: 'N2' }, showDetailedReview: true }, answers: [] });

        mockPrisma.jlptQuestionBankOption.findMany.mockResolvedValue([{ id: 'optCorrect', questionId: 'q1', isCorrect: true }]);

        await service.submitAttempt('att1', 'u1');

        // N5 check: (lang+read >= 38) && (listen >= 19) && (total >= 80)
        // Here lang=60, read=0 -> sum=60 >= 38. listen=0 < 19 -> FAILED.
        expect(mockPrisma.jlptMockAttempt.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ passMock: false })
        }));
    });
  });

  describe('deleteMondai', () => {
      it('should block deletion if used in bank or templates', async () => {
          mockPrisma.jlptQuestionBankQuestion.count.mockResolvedValue(1);
          await expect(service.deleteMondai('m1')).rejects.toThrow('đang được dùng');
      });
  });
});
