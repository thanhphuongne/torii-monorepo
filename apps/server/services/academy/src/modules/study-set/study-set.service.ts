import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@server/shared';
import { ActivityType, Prisma } from '@prisma/generated';
import {
  CreateStudySetDto,
  UpdateStudySetDto,
  CreateSetCardDto,
  UpdateSetCardDto,
  ReviewSetCardDto,
  ClonePublicStudySetDto,
  ShareStudySetDto,
} from './study-set.dto';
import { calculateSrsInterval } from './srs.utils';
import { GamificationService } from '../gamification/gamification.service';
@Injectable()
export class StudySetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gamification: GamificationService,
  ) { }

  // --- Study Set Methods ---
  private generateShareToken() {
    return `ss_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
  }

  async createSet(userId: string, data: CreateStudySetDto) {
    const result = await this.prisma.studySet.create({
      data: {
        ...data,
        userId,
        sourceType: 'USER',
        shareToken: null,
      },
      include: {
        _count: { select: { setCards: true } },
      },
    });

    return result;
  }

  async findAllSets(userId: string) {
    return this.prisma.studySet.findMany({
      where: { userId, sourceType: 'USER' },
      include: {
        _count: { select: { setCards: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findPublicCatalogSets(q?: string) {
    const where: Prisma.StudySetWhereInput = {
      isPublic: true,
    };

    if (q?.trim()) {
      where.OR = [
        { title: { contains: q.trim(), mode: 'insensitive' } },
        { description: { contains: q.trim(), mode: 'insensitive' } },
      ];
    }

    return this.prisma.studySet.findMany({
      where,
      include: {
        user: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
        _count: { select: { setCards: true } },
      },
      orderBy: [
        { sourceType: 'asc' }, // SYSTEM (0) first, then USER (1)? Wait, it's an enum.
        { updatedAt: 'desc' },
      ],
      take: 50,
    });
  }

  async findPublicCatalogSetById(id: string) {
    const set = await this.prisma.studySet.findFirst({
      where: { id, isPublic: true },
      include: {
        setCards: { orderBy: { createdAt: 'desc' } },
        _count: { select: { setCards: true } },
      },
    });
    if (!set) throw new NotFoundException('Public Study Set not found');
    return set;
  }

  async clonePublicSetToUser(userId: string, data: ClonePublicStudySetDto) {
    const source = await this.findPublicCatalogSetById(data.sourceSetId);

    const existed = await this.prisma.studySet.findFirst({
      where: {
        userId,
        settings: {
          path: ['clonedFromSetId'],
          equals: source.id,
        },
      },
      include: { _count: { select: { setCards: true } } },
    });
    if (existed) return existed;

    return this.prisma.$transaction(async (tx) => {
      const clonedSet = await tx.studySet.create({
        data: {
          userId,
          title: data.title || source.title,
          description: source.description,
          isPublic: false,
          sourceType: 'USER',
          shareToken: null,
          settings: {
            clonedFromSetId: source.id,
            sourceType: 'PUBLIC_CATALOG',
          },
        },
        include: { _count: { select: { setCards: true } } },
      });

      if (source.setCards.length > 0) {
        await tx.setCard.createMany({
          data: source.setCards.map((card) => ({
            studySetId: clonedSet.id,
            term: card.term,
            definition: card.definition,
            hint: card.hint,
            mediaUrl: card.mediaUrl,
            languageDetails:
              card.languageDetails === null
                ? Prisma.JsonNull
                : (card.languageDetails as Prisma.InputJsonValue),
            tags: card.tags,
            sourceDocumentId: card.sourceDocumentId,
          })),
        });
      }

      return tx.studySet.findUniqueOrThrow({
        where: { id: clonedSet.id },
        include: { _count: { select: { setCards: true } } },
      });
    });
  }

  async findSetById(id: string, userId: string) {
    const set = await this.prisma.studySet.findFirst({
      where: {
        id,
        OR: [
          { userId },
          { isPublic: true },
        ],
      },
      include: {
        setCards: {
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { setCards: true } },
      },
    });
    if (!set) throw new NotFoundException('Study Set not found');
    return set;
  }

  async updateSharing(id: string, userId: string, data: ShareStudySetDto) {
    await this.findSetById(id, userId);
    const updated = await this.prisma.studySet.update({
      where: { id },
      data: {
        isPublic: data.isPublic,
        shareToken: data.isPublic ? this.generateShareToken() : null,
      },
      include: { _count: { select: { setCards: true } } },
    });
    return updated;
  }

  async findPublicSharedSetByToken(token: string) {
    const item = await this.prisma.studySet.findFirst({
      where: {
        shareToken: token,
        isPublic: true,
        sourceType: 'USER',
      },
      include: {
        setCards: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!item) throw new NotFoundException('Public shared Study Set not found');
    return item;
  }

  async adminFindSystemSets() {
    return this.prisma.studySet.findMany({
      where: { sourceType: 'SYSTEM' },
      include: { _count: { select: { setCards: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async adminCreateSystemSet(requesterId: string, data: CreateStudySetDto) {
    return this.prisma.studySet.create({
      data: {
        ...data,
        userId: requesterId,
        sourceType: 'SYSTEM',
        isPublic: data.isPublic ?? true,
      },
      include: { _count: { select: { setCards: true } } },
    });
  }

  async adminUpdateSystemSet(id: string, data: UpdateStudySetDto) {
    const existed = await this.prisma.studySet.findFirst({
      where: { id, sourceType: 'SYSTEM' },
    });
    if (!existed) throw new NotFoundException('System Study Set not found');

    return this.prisma.studySet.update({
      where: { id },
      data,
      include: { _count: { select: { setCards: true } } },
    });
  }

  async adminDeleteSystemSet(id: string) {
    const existed = await this.prisma.studySet.findFirst({
      where: { id, sourceType: 'SYSTEM' },
    });
    if (!existed) throw new NotFoundException('System Study Set not found');

    await this.prisma.studySet.delete({ where: { id } });
    return { ok: true };
  }

  async adminFindSystemSetById(id: string) {
    const set = await this.prisma.studySet.findFirst({
      where: { id, sourceType: 'SYSTEM' },
      include: {
        setCards: { orderBy: { createdAt: 'asc' } },
        _count: { select: { setCards: true } },
      },
    });
    if (!set) throw new NotFoundException('System Study Set not found');
    return set;
  }

  async adminCreateCard(setId: string, data: CreateSetCardDto) {
    const set = await this.prisma.studySet.findFirst({
      where: { id: setId, sourceType: 'SYSTEM' },
    });
    if (!set) throw new NotFoundException('System Study Set not found');
    return this.prisma.setCard.create({
      data: { ...data, studySetId: setId },
    });
  }

  async adminUpdateCard(cardId: string, data: UpdateSetCardDto) {
    const card = await this.prisma.setCard.findFirst({
      where: { id: cardId, studySet: { sourceType: 'SYSTEM' } },
    });
    if (!card) throw new NotFoundException('Card not found in system set');
    return this.prisma.setCard.update({ where: { id: cardId }, data });
  }

  async adminDeleteCard(cardId: string) {
    const card = await this.prisma.setCard.findFirst({
      where: { id: cardId, studySet: { sourceType: 'SYSTEM' } },
    });
    if (!card) throw new NotFoundException('Card not found in system set');
    await this.prisma.setCard.delete({ where: { id: cardId } });
    return { ok: true };
  }

  async updateSet(id: string, userId: string, data: UpdateStudySetDto) {
    await this.findSetById(id, userId); // check exists
    const updated = await this.prisma.studySet.update({
      where: { id },
      data,
    });

    return updated;
  }

  async deleteSet(id: string, userId: string) {
    await this.findSetById(id, userId); // check exists
    await this.prisma.studySet.delete({
      where: { id },
    });

    return { ok: true };
  }

  // --- Set Card Methods ---

  async createCard(setId: string, userId: string, data: CreateSetCardDto) {
    await this.findSetById(setId, userId); // verify ownership
    const result = await this.prisma.setCard.create({
      data: {
        ...data,
        studySetId: setId,
      },
    });

    // Logging card creation might be too verbose for standard users,
    // but if we need tracing we can add it here.
    return result;
  }

  async updateCard(cardId: string, userId: string, data: UpdateSetCardDto) {
    const card = await this.prisma.setCard.findFirst({
      where: { id: cardId, studySet: { userId } },
    });
    if (!card) throw new NotFoundException('Card not found');

    return this.prisma.setCard.update({
      where: { id: cardId },
      data,
    });
  }

  async deleteCard(cardId: string, userId: string) {
    const card = await this.prisma.setCard.findFirst({
      where: { id: cardId, studySet: { userId } },
    });
    if (!card) throw new NotFoundException('Card not found');

    return this.prisma.setCard.delete({
      where: { id: cardId },
    });
  }

  // --- Study Flow / SRS ---

  async getStudyCards(setId: string, userId: string) {
    await this.findSetById(setId, userId);
    const allCards = await this.prisma.setCard.findMany({
      where: { studySetId: setId },
      orderBy: { createdAt: 'asc' },
    });
    if (allCards.length === 0) return [];

    const progresses = await this.prisma.setCardSrsProgress.findMany({
      where: {
        userId,
        setCardId: { in: allCards.map((c) => c.id) },
      },
    });
    const progressMap = new Map(progresses.map((p) => [p.setCardId, p]));
    const now = new Date();

    return allCards
      .filter((card) => {
        const progress = progressMap.get(card.id);
        if (!progress) return true;
        return progress.nextReviewAt <= now;
      })
      .map((card) => {
        const progress = progressMap.get(card.id);
        return {
          ...card,
          srsState: progress?.srsState ?? 'LEARNING',
          interval: progress?.interval ?? 0,
          nextReviewAt: progress?.nextReviewAt ?? card.createdAt,
        };
      });
  }

  async reviewCard(cardId: string, userId: string, data: ReviewSetCardDto) {
    const card = await this.prisma.setCard.findFirst({
      where: {
        id: cardId,
        studySet: {
          OR: [
            { userId },
            { isPublic: true },
          ],
        },
      },
    });
    if (!card) throw new NotFoundException('Card not found');

    const existingProgress = await this.prisma.setCardSrsProgress.findUnique({
      where: {
        userId_setCardId: {
          userId,
          setCardId: card.id,
        },
      },
    });

    const srsUpdates = calculateSrsInterval(
      (existingProgress?.srsState as any) ?? 'LEARNING',
      existingProgress?.interval ?? 0,
      data.quality,
    );

    const updatedProgress = await this.prisma.setCardSrsProgress.upsert({
      where: {
        userId_setCardId: {
          userId,
          setCardId: card.id,
        },
      },
      create: {
        userId,
        setCardId: card.id,
        ...srsUpdates,
      },
      update: {
        ...srsUpdates,
      },
    });

    // Gamification hook: flashcard review
    this.gamification
      .trackActivity(userId, ActivityType.FLASHCARD_REVIEW, {
        studySetId: card.studySetId,
        cardId: card.id,
        quality: data.quality,
      })
      .catch(() => {
        // Ignore gamification errors for core SRS flow
      });

    return {
      ...card,
      srsState: updatedProgress.srsState,
      interval: updatedProgress.interval,
      nextReviewAt: updatedProgress.nextReviewAt,
    };
  }

  // --- Extra Study Modes ---

  async getTestQuiz(
    setId: string,
    userId: string,
    count: number = 20,
    types: string = 'multiple_choice,true_false',
  ) {
    const set = await this.findSetById(setId, userId);
    const cards = set.setCards;

    if (cards.length < 4) {
      throw new Error('Cần ít nhất 4 thẻ trong bộ để tạo Test Mode');
    }

    const selectedTypes = types.split(',');
    const numItems = Math.min(count, cards.length);
    const shuffledCards = [...cards]
      .sort(() => 0.5 - Math.random())
      .slice(0, numItems);

    const questions = shuffledCards.map((card) => {
      const type =
        selectedTypes[Math.floor(Math.random() * selectedTypes.length)];

      if (type === 'multiple_choice') {
        // Get 3 random distractors
        const distractors = cards
          .filter((c) => c.id !== card.id)
          .sort(() => 0.5 - Math.random())
          .slice(0, 3)
          .map((c) => c.definition);

        const options = [...distractors, card.definition].sort(
          () => 0.5 - Math.random(),
        );

        return {
          id: card.id,
          type: 'multiple_choice',
          question: card.term,
          options,
          correctAnswer: card.definition,
        };
      } else {
        // true_false
        const isTrue = Math.random() > 0.5;
        const falseAnswer =
          cards
            .filter((c) => c.id !== card.id)
            .sort(() => 0.5 - Math.random())[0]?.definition || 'Sai';

        return {
          id: card.id,
          type: 'true_false',
          question: card.term,
          displayedAnswer: isTrue ? card.definition : falseAnswer,
          correctAnswer: isTrue,
        };
      }
    });

    return questions;
  }

  async getMatchGame(setId: string, userId: string, count: number = 6) {
    await this.findSetById(setId, userId); // check exists/ownership
    const cards = await this.prisma.setCard.findMany({
      where: { studySetId: setId },
    });

    if (cards.length < 2) {
      throw new Error('Cần ít nhất 2 thẻ trong bộ để tạo Match Game');
    }

    const numItems = Math.min(count, cards.length);
    const selectedCards = [...cards]
      .sort(() => 0.5 - Math.random())
      .slice(0, numItems);

    const pairs = selectedCards.map((card) => ({
      id: card.id,
      term: card.term,
      definition: card.definition,
    }));

    return pairs;
  }
}
