import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@server/shared/prisma/prisma.service';
import { Prisma } from '@prisma/generated';
import type { JlptMockExamTemplateCreateDto } from './dto/jlpt-mock.dto';
import type { JlptMockExamTemplateUpdateDto } from './dto/jlpt-mock.dto';
import type {
  JlptBankQuestionCreateDto,
  JlptBankQuestionQueryDto,
  JlptBankQuestionUpdateDto,
} from './dto/jlpt-bank.dto';
import type {
  JlptMondaiCreateDto,
  JlptMondaiUpdateDto,
} from './dto/jlpt-mondai.dto';
import type {
  JlptActiveScoringProfileQueryDto,
  JlptAssembleTemplateFromBankDto,
  JlptLevelConfigEnsureDto,
  JlptScoringMappingUpsertDto,
  JlptScoringProfileCreateDto,
} from './dto/jlpt-config.dto';

type AttachQuestionItem = {
  questionId: string;
  sectionId: string;
  mondaiId?: string;
  orderIndex: number;
  weight?: number;
};

type SaveAnswerItem = {
  templateQuestionId: string;
  selectedOptionId?: string;
};

@Injectable()
export class JlptMockService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------
  // JLPT Config (admin)
  // -------------------------

  async listLevels() {
    return this.prisma.jlptLevel.findMany({
      orderBy: [{ code: 'asc' as const }],
      select: {
        id: true,
        code: true,
        nameVi: true,
        totalDurationMinutes: true,
      },
    });
  }

  async listSectionsForLevel(query: JlptActiveScoringProfileQueryDto) {
    const level = await this.prisma.jlptLevel.findUnique({
      where: { code: query.level as any },
      select: { id: true },
    });
    if (!level) return { items: [] as any[] };

    const sections = await this.prisma.jlptSection.findMany({
      where: { levelId: level.id },
      orderBy: [{ orderIndex: 'asc' }],
      select: {
        id: true,
        code: true,
        durationMinutes: true,
        orderIndex: true,
        isListening: true,
        nameVi: true,
      },
    });

    return { items: sections };
  }

  async ensureLevelConfig(input: JlptLevelConfigEnsureDto) {
    const sections = this._defaultSections(input.level as any);
    const totalDurationMinutes = sections.reduce(
      (acc, s) => acc + s.durationMinutes,
      0,
    );

    const level = await this.prisma.jlptLevel.upsert({
      where: { code: input.level as any },
      update: {
        nameVi: input.nameVi ?? undefined,
        totalDurationMinutes,
      },
      create: {
        code: input.level as any,
        nameVi: input.nameVi ?? input.level,
        totalDurationMinutes,
      },
      select: { id: true, code: true },
    });

    await this.prisma.$transaction(
      sections.map((s) =>
        this.prisma.jlptSection.upsert({
          where: {
            levelId_code: {
              levelId: level.id,
              code: s.code as any,
            },
          },
          update: {
            durationMinutes: s.durationMinutes,
            orderIndex: s.orderIndex,
            isListening: s.isListening,
            nameVi: s.title,
          },
          create: {
            levelId: level.id,
            code: s.code as any,
            durationMinutes: s.durationMinutes,
            orderIndex: s.orderIndex,
            isListening: s.isListening,
            nameVi: s.title,
          },
        }),
      ),
    );

    return { ok: true };
  }

  async createScoringProfile(input: JlptScoringProfileCreateDto) {
    const level = await this.prisma.jlptLevel.findUnique({
      where: { code: input.level as any },
      select: { id: true },
    });
    if (!level) throw new BadRequestException('Invalid JLPT level');

    if (input.isActive ?? true) {
      // Ensure only one active profile per level (selectFirst is unstable otherwise).
      await this.prisma.jlptScoringProfile.updateMany({
        where: { levelId: level.id, isActive: true },
        data: { isActive: false },
      });
    }

    const created = await this.prisma.jlptScoringProfile.create({
      data: {
        levelId: level.id,
        name: input.name,
        isActive: input.isActive ?? true,
        minLanguageScaled: input.minLanguageScaled ?? 0,
        minReadingScaled: input.minReadingScaled ?? 0,
        minListeningScaled: input.minListeningScaled ?? 0,
        minTotalScaled: input.minTotalScaled ?? 0,
      },
      select: {
        id: true,
        levelId: true,
        name: true,
        isActive: true,
        minLanguageScaled: true,
        minReadingScaled: true,
        minListeningScaled: true,
        minTotalScaled: true,
      },
    });

    return { item: created };
  }

  async getActiveScoringProfile(query: JlptActiveScoringProfileQueryDto) {
    const level = await this.prisma.jlptLevel.findUnique({
      where: { code: query.level as any },
      select: { id: true },
    });
    if (!level) return { item: null };

    const profile = await this.prisma.jlptScoringProfile.findFirst({
      where: { levelId: level.id, isActive: true },
      orderBy: [{ name: 'asc' }],
      select: {
        id: true,
        name: true,
        isActive: true,
        minLanguageScaled: true,
        minReadingScaled: true,
        minListeningScaled: true,
        minTotalScaled: true,
      },
    });

    return { item: profile ?? null };
  }

  async upsertScoringMappings(input: JlptScoringMappingUpsertDto) {
    const profile = await this.prisma.jlptScoringProfile.findUnique({
      where: { id: input.profileId },
      select: { id: true },
    });
    if (!profile) throw new NotFoundException('Scoring profile not found');
    await this.prisma.$transaction([
      this.prisma.jlptScoringMapping.deleteMany({
        where: { profileId: input.profileId },
      }),
      this.prisma.jlptScoringMapping.createMany({
        data: input.items.map((i) => ({
          profileId: input.profileId,
          domain: i.domain as any,
          rawScore: i.rawScore,
          scaledScore: i.scaledScore,
        })),
      }),
    ]);
    const items = await this.prisma.jlptScoringMapping.findMany({
      where: { profileId: input.profileId },
      orderBy: [{ domain: 'asc' }, { rawScore: 'asc' }],
    });
    return { items };
  }

  async listScoringMappings(profileId: string) {
    const items = await this.prisma.jlptScoringMapping.findMany({
      where: { profileId },
      orderBy: [{ domain: 'asc' }, { rawScore: 'asc' }],
      select: {
        id: true,
        profileId: true,
        domain: true,
        rawScore: true,
        scaledScore: true,
      },
    });
    return { items };
  }

  // -------------------------
  // JLPT Question Bank (admin)
  // -------------------------

  async findAllBankQuestions(query: JlptBankQuestionQueryDto) {
    const page = Math.max(1, Number((query as any).page) || 1);
    const limitRaw = Number((query as any).limit ?? (query as any).take) || 20;
    const limit = Math.min(100, Math.max(1, limitRaw));
    const skip = (page - 1) * limit;

    const andFilters: Prisma.JlptQuestionBankQuestionWhereInput[] = [];
    let levelId: string | undefined;

    if (query.level) {
      const level = await this.prisma.jlptLevel.findUnique({
        where: { code: query.level as any },
        select: { id: true },
      });
      if (!level) {
        return {
          items: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
        };
      }
      levelId = level.id;
      andFilters.push({ levelId: level.id });
    }

    if (query.sectionCode)
      andFilters.push({ sectionCode: query.sectionCode as any });
    if (query.questionType)
      andFilters.push({ questionType: query.questionType as any });
    if (query.difficulty)
      andFilters.push({ difficulty: query.difficulty as any });

    /** Mondai là unique theo (sectionId, code); cùng `code` có thể tồn tại ở nhiều cấp → bắt buộc khớp section + level khi lọc. */
    if (query.mondaiCode) {
      if (!levelId && !query.sectionCode) {
        andFilters.push({
          mondai: { is: { code: query.mondaiCode } },
        });
      } else {
        andFilters.push({
          mondai: {
            is: {
              code: query.mondaiCode,
              section: {
                ...(levelId ? { levelId } : {}),
                ...(query.sectionCode
                  ? { code: query.sectionCode as any }
                  : {}),
              },
            },
          },
        });
      }
    }

    if (query.q) {
      andFilters.push({
        OR: [
          { stemText: { contains: query.q, mode: 'insensitive' } },
          { contextText: { contains: query.q, mode: 'insensitive' } },
        ],
      });
    }

    const where: Prisma.JlptQuestionBankQuestionWhereInput =
      andFilters.length > 0 ? { AND: andFilters } : {};

    const include = {
      mondai: {
        select: { id: true, code: true, titleVi: true, titleJa: true },
      },
      options: { orderBy: [{ orderIndex: 'asc' as const }] },
      level: { select: { code: true } },
    };

    const [total, rows] = await Promise.all([
      this.prisma.jlptQuestionBankQuestion.count({ where }),
      this.prisma.jlptQuestionBankQuestion.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: limit,
        include,
      }),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
      items: rows.map((r) => this.mapBankQuestionToAdmin(r)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findBankQuestionById(id: string) {
    const row = await this.prisma.jlptQuestionBankQuestion.findUnique({
      where: { id },
      include: {
        mondai: {
          select: { id: true, code: true, titleVi: true, titleJa: true },
        },
        options: { orderBy: [{ orderIndex: 'asc' as const }] },
        level: { select: { code: true } },
      },
    });
    if (!row) throw new NotFoundException('Bank question not found');
    return this.mapBankQuestionToAdmin(row);
  }

  /** Payload admin: thêm `levelCode` (Prisma chỉ join `level`). */
  private mapBankQuestionToAdmin(row: {
    level?: { code: string } | null;
    [key: string]: unknown;
  }) {
    const { level, ...rest } = row;
    return {
      ...rest,
      levelCode: level?.code ?? '',
      level: level ? { code: level.code } : null,
    };
  }

  /** Mondai theo cấp + phần thi (đúng cấu trúc JLPT: mỗi level có section → mondai). */
  async listMondaiForBankFilters(query: {
    level: string;
    sectionCode: string;
  }) {
    const level = await this.prisma.jlptLevel.findUnique({
      where: { code: query.level as any },
      select: { id: true },
    });
    if (!level)
      return {
        items: [] as {
          id: string;
          code: string;
          titleVi: string | null;
          titleJa: string | null;
          orderIndex: number;
        }[],
      };

    const items = await this.prisma.jlptMondai.findMany({
      where: {
        section: {
          levelId: level.id,
          code: query.sectionCode as any,
        },
      },
      orderBy: [{ orderIndex: 'asc' }],
      select: {
        id: true,
        code: true,
        titleVi: true,
        titleJa: true,
        descriptionVi: true,
        orderIndex: true,
        recommendedQuestionCount: true,
      },
    });
    return { items };
  }

  async createMondai(input: JlptMondaiCreateDto) {
    const level = await this.prisma.jlptLevel.findUnique({
      where: { code: input.level as any },
      select: { id: true },
    });
    if (!level) throw new BadRequestException('Invalid JLPT level');
    const section = await this.prisma.jlptSection.findFirst({
      where: { levelId: level.id, code: input.sectionCode as any },
      select: { id: true },
    });
    if (!section) throw new BadRequestException('Invalid section for level');
    const dup = await this.prisma.jlptMondai.findUnique({
      where: {
        sectionId_code: { sectionId: section.id, code: input.code },
      },
      select: { id: true },
    });
    if (dup)
      throw new BadRequestException(
        'Mã mondai (code) đã tồn tại trong phần thi này',
      );
    return this.prisma.jlptMondai.create({
      data: {
        sectionId: section.id,
        code: input.code,
        titleVi: input.titleVi ?? null,
        titleJa: input.titleJa ?? null,
        descriptionVi: input.descriptionVi ?? null,
        orderIndex: input.orderIndex,
        recommendedQuestionCount: input.recommendedQuestionCount ?? null,
      },
    });
  }

  async updateMondai(id: string, input: JlptMondaiUpdateDto) {
    const before = await this.prisma.jlptMondai.findUnique({
      where: { id },
      select: { id: true, sectionId: true, code: true },
    });
    if (!before) throw new NotFoundException('Mondai not found');
    if (input.code && input.code !== before.code) {
      const dup = await this.prisma.jlptMondai.findUnique({
        where: {
          sectionId_code: { sectionId: before.sectionId, code: input.code },
        },
        select: { id: true },
      });
      if (dup && dup.id !== id)
        throw new BadRequestException(
          'Mã mondai (code) đã tồn tại trong phần thi này',
        );
    }
    return this.prisma.jlptMondai.update({
      where: { id },
      data: {
        code: input.code ?? undefined,
        titleVi: input.titleVi ?? undefined,
        titleJa: input.titleJa ?? undefined,
        descriptionVi: input.descriptionVi ?? undefined,
        orderIndex: input.orderIndex ?? undefined,
        recommendedQuestionCount: input.recommendedQuestionCount ?? undefined,
      },
    });
  }

  async deleteMondai(id: string) {
    const [bankCount, tplCount] = await Promise.all([
      this.prisma.jlptQuestionBankQuestion.count({ where: { mondaiId: id } }),
      this.prisma.jlptMockExamTemplateQuestion.count({
        where: { mondaiId: id },
      }),
    ]);
    if (bankCount > 0 || tplCount > 0)
      throw new BadRequestException(
        'Không xóa được mondai đang được dùng bởi ngân hàng câu hoặc đề thi',
      );
    await this.prisma.jlptMondai.delete({ where: { id } });
    return { ok: true };
  }

  async createBankQuestion(
    input: JlptBankQuestionCreateDto,
    requesterId?: string,
  ) {
    const level = await this.prisma.jlptLevel.findUnique({
      where: { code: input.level as any },
      select: { id: true },
    });
    if (!level) throw new BadRequestException('Invalid JLPT level');

    let mondaiId: string | null = null;
    if (input.mondaiCode) {
      const section = await this.prisma.jlptSection.findFirst({
        where: { levelId: level.id, code: input.sectionCode as any },
        select: { id: true },
      });
      if (!section) throw new BadRequestException('Invalid section for level');
      const mondai = await this.prisma.jlptMondai.findFirst({
        where: { sectionId: section.id, code: input.mondaiCode },
        select: { id: true },
      });
      mondaiId = mondai?.id ?? null;
    }

    const include = {
      mondai: {
        select: { id: true, code: true, titleVi: true, titleJa: true },
      },
      options: { orderBy: [{ orderIndex: 'asc' as const }] },
      level: { select: { code: true } },
    };

    const created = await this.prisma.jlptQuestionBankQuestion.create({
      data: {
        levelId: level.id,
        sectionCode: input.sectionCode as any,
        mondaiId,
        questionType: input.questionType as any,
        stemText: input.stemText,
        contextText: input.contextText ?? null,
        explanation: input.explanation ?? null,
        difficulty: (input.difficulty as any) ?? 'EASY',
        audioAssetId: input.audioAssetId ?? null,
        imageAssetId: input.imageAssetId ?? null,
        sourceProvider: requesterId ? 'manual' : 'manual',
        sourceRef: null,
        sourcePayload: Prisma.DbNull,
        options: {
          create: input.options.map((o, idx) => ({
            key: o.key,
            contentText: o.contentText,
            isCorrect: !!o.isCorrect,
            orderIndex: o.orderIndex ?? idx,
          })),
        },
      },
      include,
    });
    return this.mapBankQuestionToAdmin(created);
  }

  async updateBankQuestion(
    id: string,
    input: JlptBankQuestionUpdateDto,
    requesterId?: string,
  ) {
    const before = await this.prisma.jlptQuestionBankQuestion.findUnique({
      where: { id },
      select: { id: true, levelId: true, sectionCode: true },
    });
    if (!before) throw new NotFoundException('Bank question not found');

    let mondaiId: string | null | undefined;
    if (input.mondaiCode !== undefined) {
      if (!input.mondaiCode) {
        mondaiId = null;
      } else {
        const section = await this.prisma.jlptSection.findFirst({
          where: {
            levelId: before.levelId,
            code: (input.sectionCode as any) ?? before.sectionCode,
          },
          select: { id: true },
        });
        if (!section)
          throw new BadRequestException('Invalid section for level');
        const mondai = await this.prisma.jlptMondai.findFirst({
          where: { sectionId: section.id, code: input.mondaiCode },
          select: { id: true },
        });
        mondaiId = mondai?.id ?? null;
      }
    }

    const include = {
      mondai: {
        select: { id: true, code: true, titleVi: true, titleJa: true },
      },
      options: { orderBy: [{ orderIndex: 'asc' as const }] },
      level: { select: { code: true } },
    };

    const updated = await this.prisma.jlptQuestionBankQuestion.update({
      where: { id },
      data: {
        questionType: (input.questionType as any) ?? undefined,
        sectionCode: (input.sectionCode as any) ?? undefined,
        mondaiId,
        stemText: input.stemText ?? undefined,
        contextText: input.contextText ?? undefined,
        explanation: input.explanation ?? undefined,
        difficulty: (input.difficulty as any) ?? undefined,
        ...(input.audioAssetId !== undefined
          ? { audioAssetId: input.audioAssetId }
          : {}),
        ...(input.imageAssetId !== undefined
          ? { imageAssetId: input.imageAssetId }
          : {}),
        options:
          input.options !== undefined
            ? {
                deleteMany: {},
                create: input.options.map((o, idx) => ({
                  key: o.key,
                  contentText: o.contentText,
                  isCorrect: !!o.isCorrect,
                  orderIndex: o.orderIndex ?? idx,
                })),
              }
            : undefined,
      },
      include,
    });
    return this.mapBankQuestionToAdmin(updated);
  }

  async deleteBankQuestion(id: string) {
    const question = await this.prisma.jlptQuestionBankQuestion.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!question) throw new NotFoundException('Bank question not found');

    const usageCount = await this.prisma.jlptMockExamTemplateQuestion.count({
      where: { questionId: id },
    });

    if (usageCount > 0) {
      throw new BadRequestException(
        'Không thể xóa câu hỏi đang được sử dụng trong đề thi (JLPT Template). Hãy gỡ câu hỏi khỏi đề thi trước.',
      );
    }

    // Note: Options are deleted automatically via Cascade Delete in Prisma schema
    await this.prisma.jlptQuestionBankQuestion.delete({ where: { id } });

    return { ok: true };
  }

  // -------------------------
  // Templates (learner/admin)
  // -------------------------

  async findAllTemplates(query: {
    level?: string;
    status?: string;
    q?: string;
  }) {
    const andFilters: Prisma.JlptMockExamTemplateWhereInput[] = [];

    if (query.level) {
      const level = await this.prisma.jlptLevel.findUnique({
        where: { code: query.level as any },
        select: { id: true },
      });
      if (!level) return [];
      andFilters.push({ levelId: level.id });
    }

    if (query.status) {
      andFilters.push({ status: query.status as any });
    }

    if (query.q) {
      andFilters.push({
        OR: [
          { title: { contains: query.q, mode: 'insensitive' } },
          { code: { contains: query.q, mode: 'insensitive' } },
        ],
      });
    }

    const where: Prisma.JlptMockExamTemplateWhereInput =
      andFilters.length > 0 ? { AND: andFilters } : {};

    const templates = await this.prisma.jlptMockExamTemplate.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      include: {
        level: { select: { code: true, totalDurationMinutes: true } },
      },
    });

    // Flatten response for frontend (admin + learner) contract:
    // - `levelCode` from `level.code`
    // - `totalDurationMinutes` from `level.totalDurationMinutes`
    return templates.map((t) => ({
      id: t.id,
      code: t.code,
      title: t.title,
      description: t.description,
      status: t.status,
      levelCode: t.level.code,
      totalDurationMinutes: t.level.totalDurationMinutes,
    }));
  }

  async findTemplateById(id: string) {
    const template = await this.prisma.jlptMockExamTemplate.findUnique({
      where: { id },
      include: {
        level: { select: { code: true } },
        sections: {
          orderBy: [{ orderIndex: 'asc' }],
          include: {
            mondai: { orderBy: [{ orderIndex: 'asc' }] },
          },
        },
        questions: {
          orderBy: [{ orderIndex: 'asc' }],
          include: {
            section: { select: { id: true, orderIndex: true, code: true } },
            mondai: {
              select: { id: true, code: true, titleVi: true, titleJa: true },
            },
            question: {
              include: { options: { orderBy: [{ orderIndex: 'asc' }] } },
            },
          },
        },
      },
    });
    if (!template) throw new NotFoundException('JLPT mock template not found');

    // Hide correctness for learner usage (admin can fetch from DB directly if needed)
    const questions = template.questions.map((q) => ({
      id: q.id,
      templateId: q.templateId,
      sectionId: q.sectionId,
      mondaiId: q.mondaiId,
      questionId: q.questionId,
      orderIndex: q.orderIndex,
      weight: q.weight,
      mondai: q.mondai
        ? {
            id: q.mondai.id,
            code: q.mondai.code,
            titleVi: q.mondai.titleVi,
            titleJa: q.mondai.titleJa,
          }
        : null,
      question: {
        id: q.question.id,
        levelId: q.question.levelId,
        sectionCode: q.question.sectionCode,
        mondaiId: q.question.mondaiId,
        questionType: q.question.questionType,
        stemText: q.question.stemText,
        contextText: q.question.contextText,
        difficulty: q.question.difficulty,
        weight: q.question.weight,
        audioAssetId: q.question.audioAssetId,
        imageAssetId: q.question.imageAssetId,
        options: q.question.options.map((o) => ({
          id: o.id,
          key: o.key,
          contentText: o.contentText,
          orderIndex: o.orderIndex,
        })),
      },
    }));

    return {
      ...template,
      levelCode: template.level.code,
      questions,
    };
  }

  async createTemplate(
    input: JlptMockExamTemplateCreateDto,
    requesterId?: string,
  ) {
    const level = await this.prisma.jlptLevel.findUnique({
      where: { code: input.level as any },
      select: { id: true, code: true },
    });
    if (!level) throw new BadRequestException('Invalid JLPT level');

    let resolvedProfileId = input.scoringProfileId;
    if (!resolvedProfileId) {
      const fallback = await this.prisma.jlptScoringProfile.findFirst({
        where: { levelId: level.id, isActive: true },
        orderBy: [{ name: 'asc' }],
        select: { id: true },
      });
      if (!fallback)
        throw new BadRequestException(
          'No active scoring profile for this JLPT level; create one or pass scoringProfileId',
        );
      resolvedProfileId = fallback.id;
    }

    const profile = await this.prisma.jlptScoringProfile.findUnique({
      where: { id: resolvedProfileId },
      select: { id: true, levelId: true },
    });
    if (!profile) throw new BadRequestException('Scoring profile not found');
    if (profile.levelId !== level.id)
      throw new BadRequestException('Scoring profile does not match level');

    const sections = this._defaultSections(level.code as any);

    if ((input.status as any) === 'PUBLISHED') {
      throw new BadRequestException(
        'Không thể tạo mới ở trạng thái PUBLISHED. Hãy tạo DRAFT rồi gắn câu hỏi trước.',
      );
    }

    const created = await this.prisma.jlptMockExamTemplate.create({
      data: {
        levelId: level.id,
        scoringProfileId: resolvedProfileId,
        code: input.code,
        title: input.title,
        description: input.description ?? null,
        status: (input.status as any) ?? 'DRAFT',
        availableFrom: input.availableFrom
          ? new Date(input.availableFrom)
          : null,
        availableTo: input.availableTo ? new Date(input.availableTo) : null,
        maxAttemptsPerUser: input.maxAttemptsPerUser ?? null,
        showDetailedReview: input.showDetailedReview ?? true,
        showCorrectAnswerImmediately:
          input.showCorrectAnswerImmediately ?? false,
        createdBy: requesterId ?? null,
        sections: {
          create: sections.map((s) => ({
            code: s.code as any,
            title: s.title,
            durationMinutes: s.durationMinutes,
            orderIndex: s.orderIndex,
            isListening: s.isListening,
          })),
        },
      },
      include: { sections: true },
    });
    return created;
  }

  async updateTemplate(
    id: string,
    input: JlptMockExamTemplateUpdateDto,
    requesterId?: string,
  ) {
    const before = await this.prisma.jlptMockExamTemplate.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!before) throw new NotFoundException('JLPT mock template not found');

    // Keep: scoringProfileId can be changed but must match level
    let scoringProfileId: string | undefined;
    if (input.scoringProfileId) {
      const tpl = await this.prisma.jlptMockExamTemplate.findUnique({
        where: { id },
        select: { levelId: true },
      });
      if (!tpl) throw new NotFoundException('JLPT mock template not found');
      const profile = await this.prisma.jlptScoringProfile.findUnique({
        where: { id: input.scoringProfileId },
        select: { id: true, levelId: true },
      });
      if (!profile) throw new BadRequestException('Scoring profile not found');
      if (profile.levelId !== tpl.levelId)
        throw new BadRequestException('Scoring profile does not match level');
      scoringProfileId = profile.id;
    }

    const nextStatus = (input.status as any) ?? undefined;
    if (nextStatus === 'PUBLISHED') {
      await this.ensureTemplateHasQuestions(id);
    }

    return this.prisma.jlptMockExamTemplate.update({
      where: { id },
      data: {
        code: input.code ?? undefined,
        title: input.title ?? undefined,
        description: input.description ?? undefined,
        scoringProfileId,
        status: (input.status as any) ?? undefined,
        availableFrom: input.availableFrom
          ? new Date(input.availableFrom)
          : undefined,
        availableTo: input.availableTo
          ? new Date(input.availableTo)
          : undefined,
        maxAttemptsPerUser: input.maxAttemptsPerUser ?? undefined,
        showDetailedReview: input.showDetailedReview ?? undefined,
        showCorrectAnswerImmediately:
          input.showCorrectAnswerImmediately ?? undefined,
        updatedAt: new Date(),
      },
    });
  }

  async deleteTemplate(id: string) {
    const template = await this.prisma.jlptMockExamTemplate.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!template) throw new NotFoundException('JLPT mock template not found');

    // Prisma schema: attempts.template has onDelete: Restrict
    // => refuse deletion if any attempts exist.
    const attemptsCount = await this.prisma.jlptMockAttempt.count({
      where: { templateId: id },
    });
    if (attemptsCount > 0) {
      throw new BadRequestException(
        'Không thể xóa đề thi vì đã có lượt làm bài (attempts). Hãy lưu trữ (ARCHIVED) thay vì xóa.',
      );
    }

    // Cascade will remove sections, template questions, etc.
    await this.prisma.jlptMockExamTemplate.delete({ where: { id } });
    return { ok: true };
  }

  async assembleTemplateFromBank(input: JlptAssembleTemplateFromBankDto) {
    const template = await this.prisma.jlptMockExamTemplate.findUnique({
      where: { id: input.templateId },
      include: {
        sections: { orderBy: [{ orderIndex: 'asc' }] },
      },
    });
    if (!template) throw new NotFoundException('JLPT mock template not found');
    if (template.status === 'ARCHIVED')
      throw new BadRequestException('Template is archived');

    const perMondaiCount = Math.max(1, input.perMondaiCount ?? 1);
    const sectionCodes = new Set(template.sections.map((s) => s.code));
    const mondaiRows = await this.prisma.jlptMondai.findMany({
      where: {
        section: {
          levelId: template.levelId,
          code: { in: [...sectionCodes] as any },
        },
      },
      orderBy: [{ orderIndex: 'asc' }],
      select: {
        id: true,
        section: { select: { code: true } },
      },
    });

    const sectionByCode = new Map(template.sections.map((s) => [s.code, s.id]));
    const questionRows = await this.prisma.jlptQuestionBankQuestion.findMany({
      where: {
        levelId: template.levelId,
        sectionCode: { in: [...sectionCodes] as any },
      },
      select: { id: true, sectionCode: true, mondaiId: true },
    });

    const randomPick = <T>(arr: T[], count: number): T[] => {
      const cloned = [...arr];
      for (let i = cloned.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = cloned[i];
        cloned[i] = cloned[j];
        cloned[j] = t;
      }
      return cloned.slice(0, Math.min(count, cloned.length));
    };

    const items: AttachQuestionItem[] = [];
    let orderIndex = 1;

    if (input.clearExisting) {
      await this.prisma.jlptMockExamTemplateQuestion.deleteMany({
        where: { templateId: input.templateId },
      });
    } else {
      const maxOrder = await this.prisma.jlptMockExamTemplateQuestion.aggregate(
        {
          where: { templateId: input.templateId },
          _max: { orderIndex: true },
        },
      );
      orderIndex = (maxOrder._max.orderIndex ?? 0) + 1;
    }

    for (const m of mondaiRows) {
      const sectionId = sectionByCode.get(m.section.code as any);
      if (!sectionId) continue;
      const candidates = questionRows.filter(
        (q) => q.sectionCode === m.section.code && q.mondaiId === m.id,
      );
      for (const q of randomPick(candidates, perMondaiCount)) {
        items.push({
          questionId: q.id,
          sectionId,
          mondaiId: m.id,
          orderIndex: orderIndex++,
        });
      }
    }

    if (items.length === 0) {
      throw new BadRequestException(
        'Không tìm thấy câu hỏi phù hợp trong bank để random theo cấu hình hiện tại.',
      );
    }

    await this.attachQuestions(input.templateId, items);
    return { ok: true, attachedCount: items.length };
  }

  async attachQuestions(
    templateId: string,
    items: AttachQuestionItem[],
    requesterId?: string,
  ) {
    const template = await this.prisma.jlptMockExamTemplate.findUnique({
      where: { id: templateId },
      select: { id: true, status: true, levelId: true },
    });
    if (!template) throw new NotFoundException('JLPT mock template not found');
    if (template.status === 'ARCHIVED')
      throw new BadRequestException('Template is archived');

    // Minimal validation: section must belong to template
    const sectionIds = [...new Set(items.map((i) => i.sectionId))];
    const sections = await this.prisma.jlptMockExamSection.findMany({
      where: { templateId, id: { in: sectionIds } },
      select: { id: true, code: true },
    });
    if (sections.length !== sectionIds.length)
      throw new BadRequestException('Invalid sectionId');

    const sectionCodeById = new Map(sections.map((s) => [s.id, s.code]));

    const questionIds = [...new Set(items.map((i) => i.questionId))];
    const bankQuestions = await this.prisma.jlptQuestionBankQuestion.findMany({
      where: { id: { in: questionIds } },
      select: { id: true, levelId: true, sectionCode: true, mondaiId: true },
    });
    const qById = new Map(bankQuestions.map((q) => [q.id, q]));
    if (bankQuestions.length !== questionIds.length) {
      throw new BadRequestException(
        'Một số câu hỏi không tồn tại trong ngân hàng.',
      );
    }

    const mondaiToValidate = new Set<string>();
    for (const i of items) {
      const q = qById.get(i.questionId);
      if (!q) continue;
      if (q.levelId !== template.levelId) {
        throw new BadRequestException('Cấp độ câu hỏi không khớp với đề.');
      }
      const secCode = sectionCodeById.get(i.sectionId);
      if (!secCode || q.sectionCode !== secCode) {
        throw new BadRequestException(
          'Phần thi không khớp với câu trong ngân hàng.',
        );
      }
      if (q.mondaiId && i.mondaiId && q.mondaiId !== i.mondaiId) {
        throw new BadRequestException(
          'Mondai gửi lên không khớp với câu trong ngân hàng.',
        );
      }
      const resolved = i.mondaiId ?? q.mondaiId ?? null;
      if (resolved) mondaiToValidate.add(resolved);
    }

    if (mondaiToValidate.size > 0) {
      const mondaiRows = await this.prisma.jlptMondai.findMany({
        where: { id: { in: [...mondaiToValidate] } },
        select: {
          id: true,
          section: { select: { code: true, levelId: true } },
        },
      });
      const mondaiById = new Map(mondaiRows.map((m) => [m.id, m]));
      if (mondaiRows.length !== mondaiToValidate.size) {
        throw new BadRequestException(
          'Một số Mondai không còn tồn tại. Vui lòng chọn lại dạng bài.',
        );
      }
      for (const i of items) {
        const q = qById.get(i.questionId)!;
        const resolved = i.mondaiId ?? q.mondaiId ?? null;
        if (!resolved) continue;
        const mondai = mondaiById.get(resolved);
        const expectedSectionCode = sectionCodeById.get(i.sectionId);
        if (
          !mondai ||
          !expectedSectionCode ||
          mondai.section.levelId !== template.levelId ||
          mondai.section.code !== expectedSectionCode
        ) {
          throw new BadRequestException(
            'Mondai không khớp với cấp độ/phần thi của đề. Vui lòng chọn lại.',
          );
        }
      }
    }

    await this.prisma.$transaction(
      items.map((i) => {
        const q = qById.get(i.questionId)!;
        const resolvedMondaiId = i.mondaiId ?? q.mondaiId ?? null;
        return this.prisma.jlptMockExamTemplateQuestion.upsert({
          where: {
            templateId_orderIndex: { templateId, orderIndex: i.orderIndex },
          },
          create: {
            templateId,
            sectionId: i.sectionId,
            mondaiId: resolvedMondaiId,
            questionId: i.questionId,
            orderIndex: i.orderIndex,
            weight: i.weight != null ? new Prisma.Decimal(i.weight) : null,
          },
          update: {
            sectionId: i.sectionId,
            mondaiId: resolvedMondaiId,
            questionId: i.questionId,
            weight: i.weight != null ? new Prisma.Decimal(i.weight) : null,
          },
        });
      }),
    );

    return { ok: true };
  }

  async deleteTemplateQuestion(id: string) {
    await this.prisma.jlptMockExamTemplateQuestion.delete({
      where: { id },
    });
    return { ok: true };
  }

  // -------------------------
  // Attempts (learner runtime)
  // -------------------------

  async startAttempt(templateId: string, userId?: string) {
    if (!userId) throw new BadRequestException('userId is required');

    const template = await this.prisma.jlptMockExamTemplate.findUnique({
      where: { id: templateId },
      include: {
        level: { select: { code: true } },
        sections: { orderBy: [{ orderIndex: 'asc' }] },
      },
    });
    if (!template) throw new NotFoundException('JLPT mock template not found');
    if (template.status !== 'PUBLISHED')
      throw new ForbiddenException('Template is not available');
    const countQuestions = await this.prisma.jlptMockExamTemplateQuestion.count(
      {
        where: { templateId },
      },
    );
    if (countQuestions <= 0) {
      throw new ForbiddenException('Template has no questions');
    }
    const sectionIds = template.sections.map((s) => s.id);
    const sectionCounts =
      await this.prisma.jlptMockExamTemplateQuestion.groupBy({
        by: ['sectionId'],
        where: { templateId, sectionId: { in: sectionIds } },
        _count: { sectionId: true },
      });
    if (sectionCounts.length < sectionIds.length) {
      throw new ForbiddenException('Template has empty section(s)');
    }

    const now = new Date();
    if (template.availableFrom && now < template.availableFrom)
      throw new ForbiddenException('Not available yet');
    if (template.availableTo && now > template.availableTo)
      throw new ForbiddenException('Expired');

    if (template.maxAttemptsPerUser && template.maxAttemptsPerUser > 0) {
      const count = await this.prisma.jlptMockAttempt.count({
        where: { templateId, userId },
      });
      if (count >= template.maxAttemptsPerUser)
        throw new ForbiddenException('Max attempts reached');
    }

    // Create attempt + attempt sections in one transaction
    return this.prisma.$transaction(async (tx) => {
      const attempt = await tx.jlptMockAttempt.create({
        data: {
          userId,
          templateId,
          levelCode: template.level.code,
          status: 'IN_PROGRESS',
          startedAt: now,
        },
      });

      const attemptSections = template.sections.map((s) => {
        const isFirst = s.orderIndex === 1;
        const endsAt = isFirst
          ? new Date(now.getTime() + s.durationMinutes * 60_000)
          : null;
        return {
          attemptId: attempt.id,
          sectionId: s.id,
          orderIndex: s.orderIndex,
          status: isFirst ? 'ACTIVE' : 'LOCKED',
          startedAt: isFirst ? now : null,
          endsAt,
        };
      });

      await tx.jlptMockAttemptSection.createMany({ data: attemptSections });

      return {
        attemptId: attempt.id,
        serverTime: now.toISOString(),
        currentSectionOrder: 1,
        endsAt: attemptSections
          .find((s) => s.orderIndex === 1)
          ?.endsAt?.toISOString(),
      };
    });
  }

  async saveAnswers(
    attemptId: string,
    answers: SaveAnswerItem[],
    requesterId?: string,
  ) {
    const attempt = await this.prisma.jlptMockAttempt.findUnique({
      where: { id: attemptId },
      select: { id: true, userId: true, status: true },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.status !== 'IN_PROGRESS')
      throw new BadRequestException('Attempt is not in progress');
    if (requesterId && requesterId !== attempt.userId)
      throw new ForbiddenException('Not allowed');

    const tqIds = [...new Set(answers.map((a) => a.templateQuestionId))];
    const tqs = await this.prisma.jlptMockExamTemplateQuestion.findMany({
      where: { id: { in: tqIds } },
      select: { id: true, questionId: true },
    });
    const tqMap = new Map(tqs.map((t) => [t.id, t]));

    await this.prisma.$transaction(
      answers.map((a) => {
        const tq = tqMap.get(a.templateQuestionId);
        if (!tq)
          throw new BadRequestException(
            `Invalid templateQuestionId: ${a.templateQuestionId}`,
          );

        return this.prisma.jlptMockAnswer.upsert({
          where: {
            attemptId_templateQuestionId: {
              attemptId,
              templateQuestionId: a.templateQuestionId,
            },
          },
          create: {
            attemptId,
            templateQuestionId: a.templateQuestionId,
            questionId: tq.questionId,
            selectedOptionId: a.selectedOptionId ?? null,
          },
          update: {
            selectedOptionId: a.selectedOptionId ?? null,
            answeredAt: new Date(),
          },
        });
      }),
    );

    return { ok: true };
  }

  async nextSection(
    attemptId: string,
    currentSectionOrder: number,
    requesterId?: string,
  ) {
    const attempt = await this.prisma.jlptMockAttempt.findUnique({
      where: { id: attemptId },
      select: { id: true, userId: true, status: true },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.status !== 'IN_PROGRESS')
      throw new BadRequestException('Attempt is not in progress');
    if (requesterId && requesterId !== attempt.userId)
      throw new ForbiddenException('Not allowed');

    const current = await this.prisma.jlptMockAttemptSection.findUnique({
      where: {
        attemptId_orderIndex: { attemptId, orderIndex: currentSectionOrder },
      },
      include: { section: true },
    });
    if (!current) throw new NotFoundException('Attempt section not found');
    if (current.status !== 'ACTIVE')
      throw new BadRequestException('Current section is not active');

    const next = await this.prisma.jlptMockAttemptSection.findUnique({
      where: {
        attemptId_orderIndex: {
          attemptId,
          orderIndex: currentSectionOrder + 1,
        },
      },
      include: { section: true },
    });
    if (!next) {
      return { ok: true, done: true };
    }
    if (next.status !== 'LOCKED')
      throw new BadRequestException('Next section is not locked');

    const now = new Date();
    const endsAt = new Date(
      now.getTime() + next.section.durationMinutes * 60_000,
    );

    await this.prisma.$transaction([
      this.prisma.jlptMockAttemptSection.update({
        where: { id: current.id },
        data: { status: 'FINISHED', endedAt: now, endsAt: null },
      }),
      this.prisma.jlptMockAttemptSection.update({
        where: { id: next.id },
        data: { status: 'ACTIVE', startedAt: now, endsAt },
      }),
    ]);

    return {
      ok: true,
      currentSectionOrder: currentSectionOrder + 1,
      serverTime: now.toISOString(),
      endsAt: endsAt.toISOString(),
    };
  }

  async submitAttempt(
    attemptId: string,
    requesterId?: string,
    returnResult: boolean = true,
  ) {
    const attempt = await this.prisma.jlptMockAttempt.findUnique({
      where: { id: attemptId },
      include: {
        template: {
          include: {
            scoringProfile: { include: { mappings: true } },
            questions: { include: { question: true, section: true } },
          },
        },
        answers: true,
      },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.status !== 'IN_PROGRESS')
      throw new BadRequestException('Attempt is not in progress');
    if (requesterId && requesterId !== attempt.userId)
      throw new ForbiddenException('Not allowed');

    // Evaluate correctness
    const answerByTq = new Map(
      attempt.answers.map((a) => [a.templateQuestionId, a]),
    );

    const tqs = attempt.template.questions;
    const questionIds = tqs.map((t) => t.questionId);
    const options = await this.prisma.jlptQuestionBankOption.findMany({
      where: { questionId: { in: questionIds } },
      select: { id: true, questionId: true, isCorrect: true },
    });
    const correctOptionByQuestion = new Map(
      options.filter((o) => o.isCorrect).map((o) => [o.questionId, o.id]),
    );

    // Compute raw/max per domain
    let langRaw = 0;
    let readRaw = 0;
    let listenRaw = 0;
    let langMax = 0;
    let readMax = 0;
    let listenMax = 0;

    const answerUpserts: Prisma.JlptMockAnswerUpsertArgs[] = [];

    for (const tq of tqs) {
      const weight = Number(tq.weight ?? tq.question.weight ?? 1);
      const domain = this._domainForQuestion(tq.question as any);

      if (domain === 'LANGUAGE') langMax += weight;
      if (domain === 'READING') readMax += weight;
      if (domain === 'LISTENING') listenMax += weight;

      const ans = answerByTq.get(tq.id);
      if (!ans || !ans.selectedOptionId) continue;

      const correctOptionId = correctOptionByQuestion.get(tq.questionId);
      const isCorrect =
        !!correctOptionId && ans.selectedOptionId === correctOptionId;

      const awarded = isCorrect ? weight : 0;
      if (domain === 'LANGUAGE') langRaw += awarded;
      if (domain === 'READING') readRaw += awarded;
      if (domain === 'LISTENING') listenRaw += awarded;

      answerUpserts.push({
        where: {
          attemptId_templateQuestionId: {
            attemptId: attempt.id,
            templateQuestionId: tq.id,
          },
        },
        create: {
          attemptId: attempt.id,
          templateQuestionId: tq.id,
          questionId: tq.questionId,
          selectedOptionId: ans.selectedOptionId,
          isCorrect,
          scoreAwarded: new Prisma.Decimal(awarded),
        },
        update: {
          isCorrect,
          scoreAwarded: new Prisma.Decimal(awarded),
        },
      });
    }

    const profile = attempt.template.scoringProfile;
    const scaled = {
      language: this._mapScaled(profile.mappings, 'LANGUAGE', langRaw, langMax),
      reading: this._mapScaled(profile.mappings, 'READING', readRaw, readMax),
      listening: this._mapScaled(
        profile.mappings,
        'LISTENING',
        listenRaw,
        listenMax,
      ),
    };
    const totalScaled = scaled.language + scaled.reading + scaled.listening;

    const passMock = this._isPass(
      (attempt.levelCode as any) ?? 'N5',
      profile,
      scaled.language,
      scaled.reading,
      scaled.listening,
      totalScaled,
    );

    const now = new Date();
    await this.prisma.$transaction([
      ...answerUpserts.map((args) => this.prisma.jlptMockAnswer.upsert(args)),
      this.prisma.jlptMockAttempt.update({
        where: { id: attempt.id },
        data: {
          status: 'SUBMITTED',
          submittedAt: now,
          languageScoreRaw: new Prisma.Decimal(langRaw),
          readingScoreRaw: new Prisma.Decimal(readRaw),
          listeningScoreRaw: new Prisma.Decimal(listenRaw),
          languageScoreScaled: scaled.language,
          readingScoreScaled: scaled.reading,
          listeningScoreScaled: scaled.listening,
          totalScoreScaled: totalScaled,
          passMock,
        },
      }),
      this.prisma.jlptMockAttemptSection.updateMany({
        where: { attemptId: attempt.id, status: { in: ['ACTIVE', 'LOCKED'] } },
        data: { status: 'FINISHED', endedAt: now, endsAt: null },
      }),
    ]);

    if (!returnResult) return;
    return this.getAttemptResult(attemptId, requesterId);
  }

  async getAttemptResult(attemptId: string, requesterId?: string) {
    await this.maybeAutoSubmitExpiredAttempt(attemptId, requesterId);

    const attempt = await this.prisma.jlptMockAttempt.findUnique({
      where: { id: attemptId },
      include: {
        template: { include: { level: true } },
        answers: {
          include: {
            templateQuestion: {
              include: {
                question: { include: { options: true } },
                section: true,
                mondai: true,
              },
            },
            selectedOption: true,
          },
        },
      },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (requesterId && requesterId !== attempt.userId)
      throw new ForbiddenException('Not allowed');
    if (attempt.status !== 'SUBMITTED')
      throw new BadRequestException('Result is not available yet');

    const showReview = attempt.template.showDetailedReview;
    const showCorrect = attempt.template.showCorrectAnswerImmediately;

    const answers = attempt.answers.map((a) => {
      const q = a.templateQuestion.question;
      const correctOption = q.options.find((o) => o.isCorrect);
      return {
        templateQuestionId: a.templateQuestionId,
        questionId: a.questionId,
        section: {
          id: a.templateQuestion.section.id,
          orderIndex: a.templateQuestion.section.orderIndex,
          code: a.templateQuestion.section.code,
        },
        mondai: a.templateQuestion.mondai
          ? {
              id: a.templateQuestion.mondai.id,
              code: a.templateQuestion.mondai.code,
              titleVi: a.templateQuestion.mondai.titleVi,
            }
          : null,
        selectedOptionId: a.selectedOptionId,
        isCorrect: a.isCorrect,
        scoreAwarded: a.scoreAwarded,
        review: showReview
          ? {
              stemText: q.stemText,
              contextText: q.contextText,
              explanation: q.explanation,
              options: q.options
                .sort((x, y) => x.orderIndex - y.orderIndex)
                .map((o) => ({
                  id: o.id,
                  key: o.key,
                  contentText: o.contentText,
                  isCorrect: showCorrect ? o.isCorrect : undefined,
                })),
              correctOptionId: showCorrect ? correctOption?.id : undefined,
            }
          : null,
      };
    });

    return {
      attempt: {
        id: attempt.id,
        templateId: attempt.templateId,
        level: attempt.template.level.code,
        status: attempt.status,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
      },
      scores: {
        languageRaw: attempt.languageScoreRaw,
        readingRaw: attempt.readingScoreRaw,
        listeningRaw: attempt.listeningScoreRaw,
        languageScaled: attempt.languageScoreScaled,
        readingScaled: attempt.readingScoreScaled,
        listeningScaled: attempt.listeningScoreScaled,
        totalScaled: attempt.totalScoreScaled,
        passMock: attempt.passMock,
      },
      answers,
    };
  }

  // -------------------------
  // History (learner)
  // -------------------------
  async findAttemptHistory(requesterId: string, limit = 20) {
    await this.autoSubmitExpiredAttemptsForUser(requesterId);

    return this.prisma.jlptMockAttempt.findMany({
      where: { userId: requesterId },
      orderBy: [{ startedAt: 'desc' }],
      take: limit,
      include: {
        template: { select: { id: true, code: true, title: true } },
      },
    });
  }

  private async maybeAutoSubmitExpiredAttempt(
    attemptId: string,
    requesterId?: string,
  ) {
    const attempt = await this.prisma.jlptMockAttempt.findUnique({
      where: { id: attemptId },
      select: { id: true, userId: true, status: true },
    });

    if (!attempt || attempt.status !== 'IN_PROGRESS') return;
    if (requesterId && requesterId !== attempt.userId) {
      throw new ForbiddenException('Not allowed');
    }

    const now = new Date();
    const expiredSection = await this.prisma.jlptMockAttemptSection.findFirst({
      where: { attemptId, status: 'ACTIVE', endsAt: { lte: now } },
      select: { id: true },
    });

    if (!expiredSection) return;
    await this.submitAttempt(attemptId, requesterId, false);
  }

  private async autoSubmitExpiredAttemptsForUser(requesterId: string) {
    const now = new Date();

    const expiredAttemptIds = await this.prisma.jlptMockAttempt.findMany({
      where: {
        userId: requesterId,
        status: 'IN_PROGRESS',
        sections: {
          some: { status: 'ACTIVE', endsAt: { lte: now } },
        },
      },
      select: { id: true },
    });

    for (const { id } of expiredAttemptIds) {
      try {
        await this.submitAttempt(id, requesterId, false);
      } catch {
        // Ignore: attempt may have been submitted concurrently.
      }
    }
  }

  async getAttemptAnswers(attemptId: string, requesterId?: string) {
    await this.maybeAutoSubmitExpiredAttempt(attemptId, requesterId);

    const attempt = await this.prisma.jlptMockAttempt.findUnique({
      where: { id: attemptId },
      select: { userId: true, status: true },
    });

    if (!attempt) throw new NotFoundException('Attempt not found');
    if (requesterId && requesterId !== attempt.userId)
      throw new ForbiddenException('Not allowed');

    return this.prisma.jlptMockAnswer.findMany({
      where: { attemptId },
      select: {
        templateQuestionId: true,
        selectedOptionId: true,
        answeredAt: true,
      },
      orderBy: [{ answeredAt: 'asc' }],
    });
  }

  // -------------------------
  // helpers
  // -------------------------

  private _defaultSections(levelCode: 'N5' | 'N4' | 'N3' | 'N2' | 'N1') {
    // Official JLPT test times (JLPT guideline)
    if (levelCode === 'N5') {
      return [
        {
          code: 'LANGUAGE_VOCAB',
          title: 'Language Knowledge (Vocabulary)',
          durationMinutes: 25,
          orderIndex: 1,
          isListening: false,
        },
        {
          code: 'LANGUAGE_GRAMMAR_READING',
          title: 'Language Knowledge (Grammar) · Reading',
          durationMinutes: 50,
          orderIndex: 2,
          isListening: false,
        },
        {
          code: 'LISTENING',
          title: 'Listening',
          durationMinutes: 30,
          orderIndex: 3,
          isListening: true,
        },
      ];
    }
    if (levelCode === 'N4') {
      return [
        {
          code: 'LANGUAGE_VOCAB',
          title: 'Language Knowledge (Vocabulary)',
          durationMinutes: 30,
          orderIndex: 1,
          isListening: false,
        },
        {
          code: 'LANGUAGE_GRAMMAR_READING',
          title: 'Language Knowledge (Grammar) · Reading',
          durationMinutes: 60,
          orderIndex: 2,
          isListening: false,
        },
        {
          code: 'LISTENING',
          title: 'Listening',
          durationMinutes: 35,
          orderIndex: 3,
          isListening: true,
        },
      ];
    }
    if (levelCode === 'N3') {
      return [
        {
          code: 'LANGUAGE_VOCAB',
          title: 'Language Knowledge (Vocabulary)',
          durationMinutes: 30,
          orderIndex: 1,
          isListening: false,
        },
        {
          code: 'LANGUAGE_GRAMMAR_READING',
          title: 'Language Knowledge (Grammar) · Reading',
          durationMinutes: 70,
          orderIndex: 2,
          isListening: false,
        },
        {
          code: 'LISTENING',
          title: 'Listening',
          durationMinutes: 40,
          orderIndex: 3,
          isListening: true,
        },
      ];
    }
    if (levelCode === 'N2') {
      return [
        {
          code: 'LANGUAGE_GRAMMAR_READING',
          title: 'Language Knowledge (Vocabulary/Grammar) · Reading',
          durationMinutes: 105,
          orderIndex: 1,
          isListening: false,
        },
        {
          code: 'LISTENING',
          title: 'Listening',
          durationMinutes: 50,
          orderIndex: 2,
          isListening: true,
        },
      ];
    }
    return [
      {
        code: 'LANGUAGE_GRAMMAR_READING',
        title: 'Language Knowledge (Vocabulary/Grammar) · Reading',
        durationMinutes: 110,
        orderIndex: 1,
        isListening: false,
      },
      {
        code: 'LISTENING',
        title: 'Listening',
        durationMinutes: 55,
        orderIndex: 2,
        isListening: true,
      },
    ];
  }

  private async ensureTemplateHasQuestions(templateId: string) {
    const [questionCount, sections] = await Promise.all([
      this.prisma.jlptMockExamTemplateQuestion.count({ where: { templateId } }),
      this.prisma.jlptMockExamSection.findMany({
        where: { templateId },
        select: { id: true },
      }),
    ]);
    if (questionCount <= 0) {
      throw new BadRequestException(
        'Không thể publish đề rỗng (chưa có câu hỏi).',
      );
    }
    const sectionIds = sections.map((s) => s.id);
    const sectionCounts =
      await this.prisma.jlptMockExamTemplateQuestion.groupBy({
        by: ['sectionId'],
        where: { templateId, sectionId: { in: sectionIds } },
        _count: { sectionId: true },
      });
    const covered = new Set(sectionCounts.map((s) => s.sectionId));
    const missing = sectionIds.filter((id) => !covered.has(id));
    if (missing.length > 0) {
      throw new BadRequestException(
        'Không thể publish đề: có section chưa có câu hỏi.',
      );
    }
  }

  private _domainForQuestion(question: { questionType: string }) {
    if (question.questionType === 'LISTENING') return 'LISTENING' as const;
    if (question.questionType === 'READING') return 'READING' as const;
    return 'LANGUAGE' as const;
  }

  private _mapScaled(
    mappings: Array<{ domain: any; rawScore: number; scaledScore: number }>,
    domain: 'LANGUAGE' | 'READING' | 'LISTENING',
    raw: number,
    maxRaw: number,
  ) {
    const rawInt = Math.floor(raw);
    const exact = mappings.find(
      (m) => m.domain === domain && m.rawScore === rawInt,
    );
    if (exact) return exact.scaledScore;
    if (maxRaw <= 0) return 0;
    return Math.max(0, Math.min(60, Math.round((raw / maxRaw) * 60)));
  }

  private _isPass(
    levelCode: string,
    profile: {
      minLanguageScaled: number | null;
      minReadingScaled: number | null;
      minListeningScaled: number | null;
      minTotalScaled: number | null;
    },
    languageScaled: number,
    readingScaled: number,
    listeningScaled: number,
    totalScaled: number,
  ) {
    const minLang = profile.minLanguageScaled ?? 0;
    const minRead = profile.minReadingScaled ?? 0;
    const minListen = profile.minListeningScaled ?? 0;
    const minTotal = profile.minTotalScaled ?? 0;

    // JLPT N4/N5: Pass mark for "Language Knowledge (Vocab/Grammar) + Reading" is a single
    // sectional criterion (38/120). Repo hiện chấm ra 2 domain LANGUAGE/READING (mỗi domain 0..60),
    // nên ta check theo tổng (language + reading).
    if (levelCode === 'N4' || levelCode === 'N5') {
      const minLangRead = minLang + minRead;
      return (
        languageScaled + readingScaled >= minLangRead &&
        listeningScaled >= minListen &&
        totalScaled >= minTotal
      );
    }

    // JLPT N1-N3: Pass mark cho từng scoring section là riêng biệt.
    return (
      languageScaled >= minLang &&
      readingScaled >= minRead &&
      listeningScaled >= minListen &&
      totalScaled >= minTotal
    );
  }
}
