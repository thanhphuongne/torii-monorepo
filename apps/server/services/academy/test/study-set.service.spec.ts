import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { StudySetService } from '../src/modules/study-set/study-set.service';
import { PrismaService } from '@server/shared';
import { GamificationService } from '../src/modules/gamification/gamification.service';
import { ActivityType } from '@prisma/generated';

describe('StudySetService', () => {
  let service: StudySetService;
  let mockPrisma: any;
  let mockGamification: any;

  beforeEach(async () => {
    mockPrisma = {
      studySet: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      setCard: {
        create: jest.fn(),
        createMany: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      setCardSrsProgress: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      user: {
          select: jest.fn()
      },
      $transaction: jest.fn().mockImplementation((cb) => cb(mockPrisma)),
    };

    mockGamification = {
      trackActivity: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudySetService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: GamificationService, useValue: mockGamification },
      ],
    }).compile();

    service = module.get<StudySetService>(StudySetService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSet', () => {
    it('should create a new study set', async () => {
      const dto = { title: 'New Set', description: 'Desc', isPublic: false };
      mockPrisma.studySet.create.mockResolvedValue({ id: 's1', ...dto });

      const result = await service.createSet('u1', dto as any);

      expect(result.id).toBe('s1');
      expect(mockPrisma.studySet.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ userId: 'u1' })
      }));
    });
  });

  describe('clonePublicSetToUser', () => {
    it('should return existing clone if already cloned once', async () => {
      mockPrisma.studySet.findFirst.mockResolvedValueOnce({ id: 'source' }); // For findPublicCatalogSetById
      mockPrisma.studySet.findFirst.mockResolvedValueOnce({ id: 'existing' }); // For existed check

      const result = await service.clonePublicSetToUser('u1', { sourceSetId: 'source' });

      expect(result.id).toBe('existing');
      expect(mockPrisma.studySet.create).not.toHaveBeenCalled();
    });

    it('should clone set and cards in a transaction', async () => {
      const source = { 
          id: 'source', title: 'Source', description: 'D',
          setCards: [{ term: 'T1', definition: 'D1' }] 
      };
      mockPrisma.studySet.findFirst.mockResolvedValueOnce(source); // findPublic
      mockPrisma.studySet.findFirst.mockResolvedValueOnce(null); // existed check
      mockPrisma.studySet.create.mockResolvedValue({ id: 'clone' });
      mockPrisma.studySet.findUniqueOrThrow.mockResolvedValue({ id: 'clone' });

      await service.clonePublicSetToUser('u1', { sourceSetId: 'source' });

      expect(mockPrisma.studySet.create).toHaveBeenCalled();
      expect(mockPrisma.setCard.createMany).toHaveBeenCalled();
    });
  });

  describe('getStudyCards', () => {
    it('should filter cards due for SRS review', async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 100000);
      const future = new Date(now.getTime() + 100000);

      const cards = [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }];
      mockPrisma.studySet.findFirst.mockResolvedValue({ id: 's1', setCards: cards });
      mockPrisma.setCard.findMany.mockResolvedValue(cards);
      
      // Progresses: c1 is due, c2 is future, c3 has no progress (new)
      mockPrisma.setCardSrsProgress.findMany.mockResolvedValue([
        { setCardId: 'c1', nextReviewAt: past },
        { setCardId: 'c2', nextReviewAt: future },
      ]);

      const result = await service.getStudyCards('s1', 'u1');

      expect(result.length).toBe(2); // c1 and c3
      expect(result.map(r => r.id)).toContain('c1');
      expect(result.map(r => r.id)).toContain('c3');
    });
  });

  describe('reviewCard', () => {
    it('should update SRS progress and track gamification', async () => {
      const card = { id: 'c1', studySetId: 's1' };
      mockPrisma.setCard.findFirst.mockResolvedValue(card);
      mockPrisma.setCardSrsProgress.findUnique.mockResolvedValue(null);
      mockPrisma.setCardSrsProgress.upsert.mockResolvedValue({ srsState: 'REVIEWING' });

      const result = await service.reviewCard('c1', 'u1', { quality: 5 });

      expect(mockPrisma.setCardSrsProgress.upsert).toHaveBeenCalled();
      expect(mockGamification.trackActivity).toHaveBeenCalledWith(
          'u1', ActivityType.FLASHCARD_REVIEW, expect.any(Object)
      );
      expect(result.srsState).toBe('REVIEWING');
    });
  });

  describe('getTestQuiz', () => {
    it('should throw if less than 4 cards', async () => {
      mockPrisma.studySet.findFirst.mockResolvedValue({ id: 's1', setCards: [{id: '1'}] });
      await expect(service.getTestQuiz('s1', 'u1')).rejects.toThrow('ít nhất 4 thẻ');
    });

    it('should generate multiple choice and true/false questions', async () => {
      const cards = [
        { id: '1', term: 'T1', definition: 'D1' },
        { id: '2', term: 'T2', definition: 'D2' },
        { id: '3', term: 'T3', definition: 'D3' },
        { id: '4', term: 'T4', definition: 'D4' },
      ];
      mockPrisma.studySet.findFirst.mockResolvedValue({ id: 's1', setCards: cards });

      const result = await service.getTestQuiz('s1', 'u1', 4);

      expect(result.length).toBe(4);
      expect(['multiple_choice', 'true_false']).toContain(result[0].type);
    });
  });
});
