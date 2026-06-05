import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@server/shared';
import {
  AcademyExamCreateDTO,
  AcademyExamUpdateDTO,
  AcademyExamQueryDTO,
  AcademyExamAddQuestionsDTO,
} from '@workspace/schemas';

@Injectable()
export class ExamService {
  constructor(private readonly prisma: PrismaService) {}

  async createExam(dto: AcademyExamCreateDTO) {
    const { sections, ...data } = dto;
    return this.prisma.academyExam.create({
      data: {
        ...data,
        settings: (data.settings as any) || {},
        sections: {
          create: sections.map((sec) => ({
            title: sec.title,
            instruction: sec.instruction,
            timeLimitSeconds: sec.timeLimitSeconds,
            orderIndex: sec.orderIndex,
            sectionType: sec.sectionType,
            metadata: sec.metadata as any,
          })),
        },
      },
      include: {
        sections: true,
      },
    });
  }

  async updateExam(id: string, dto: AcademyExamUpdateDTO) {
    return this.prisma.academyExam.update({
      where: { id },
      data: {
        ...dto,
        settings: dto.settings as any,
      } as any,
    });
  }

  async findExams(query: AcademyExamQueryDTO) {
    const { courseProfileId, status, examType, q } = query;
    return this.prisma.academyExam.findMany({
      where: {
        courseProfileId: courseProfileId || undefined,
        status,
        examType,
        OR: q ? [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ] : undefined,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getExamDetail(id: string) {
    const exam = await this.prisma.academyExam.findUnique({
      where: { id },
      include: {
        sections: {
          include: {
            questions: {
              include: {
                question: {
                  include: {
                    options: true,
                  },
                },
              },
              orderBy: { orderIndex: 'asc' },
            },
          },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });
    if (!exam) throw new NotFoundException('Exam not found');
    return exam;
  }

  async addQuestionsToSection(dto: AcademyExamAddQuestionsDTO) {
    const { sectionId, questionIds, points } = dto;
    const section = await this.prisma.academyExamSection.findUnique({
      where: { id: sectionId },
    });
    if (!section) throw new NotFoundException('Section not found');

    // Get current max order index
    const lastQuestion = await this.prisma.academyExamQuestion.findFirst({
      where: { sectionId },
      orderBy: { orderIndex: 'desc' },
    });
    let nextOrder = (lastQuestion?.orderIndex ?? -1) + 1;

    const data = questionIds.map((qId) => ({
      examId: section.examId,
      sectionId,
      questionId: qId,
      points,
      orderIndex: nextOrder++,
    }));

    return this.prisma.academyExamQuestion.createMany({
      data,
    });
  }

  async removeQuestionFromExam(examQuestionId: string) {
    return this.prisma.academyExamQuestion.delete({
      where: { id: examQuestionId },
    });
  }

  async deleteExam(id: string) {
    // Khớp FK `AcademyCourseProfileAssessment.exam` (onDelete: Restrict).
    // Kế hoạch đánh giá gắn course profile — áp dụng cho cả LIVE và VOD, không chỉ lớp live.
    const assessments = await this.prisma.academyCourseProfileAssessment.findMany({
      where: { examId: id },
      include: {
        courseProfile: {
          select: {
            title: true,
            code: true,
            cohorts: {
              select: {
                liveClasses: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (assessments.length > 0) {
      const profileLabels = new Set<string>();
      for (const row of assessments) {
        const p = row.courseProfile;
        const label = `${p.title}${p.code ? ` (${p.code})` : ''}`.trim();
        if (label.length > 0) profileLabels.add(label);
      }
      const profilePart =
        profileLabels.size > 0
          ? [...profileLabels].join(', ')
          : `${assessments.length} khóa (course profile)`;

      const liveNames = new Set<string>();
      for (const row of assessments) {
        for (const c of row.courseProfile.cohorts) {
          for (const lc of c.liveClasses) {
            const n = lc.name?.trim();
            if (n) liveNames.add(n);
          }
        }
      }
      const livePart =
        liveNames.size > 0
          ? ` Lớp live liên quan (nếu có): ${[...liveNames].join(', ')}.`
          : '';

      throw new BadRequestException(
        `Bài thi đang được gắn trong kế hoạch đánh giá (LIVE và/hoặc VOD) của: ${profilePart}.${livePart} Vui lòng gỡ khỏi kế hoạch đánh giá trước khi xóa bài thi.`,
      );
    }

    const totalAttempts = await this.prisma.academyExamAttempt.count({
      where: { examId: id },
    });

    if (totalAttempts > 0) {
      throw new BadRequestException(
        `Bài thi này đã có ${totalAttempts} lượt làm bài của học viên (LIVE hoặc VOD). Vui lòng xóa các lượt làm bài trước khi xóa bài thi.`,
      );
    }

    return this.prisma.academyExam.delete({
      where: { id },
    });
  }
}
