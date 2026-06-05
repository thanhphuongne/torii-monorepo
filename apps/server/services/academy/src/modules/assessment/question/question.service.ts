import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@server/shared';
import {
  AcademyQuestionCreateDTO,
  AcademyQuestionUpdateDTO,
  AcademyQuestionQueryDTO,
} from '@workspace/schemas';

@Injectable()
export class QuestionService {
  constructor(private readonly prisma: PrismaService) {}

  async createQuestion(dto: AcademyQuestionCreateDTO) {
    return this.prisma.$transaction(async (tx) => {
      const { options, parentId, ...data } = dto;
      
      const question = await tx.academyQuestion.create({
        data: {
          ...data,
          questionType: data.questionType as any,
          correctAnswer: Array.isArray(data.correctAnswer) 
            ? JSON.stringify(data.correctAnswer) 
            : data.correctAnswer,
          parent: parentId ? { connect: { id: parentId } } : undefined,
          options: options ? {
            create: options.map((opt) => ({
              optionKey: opt.optionKey,
              content: opt.content,
              isCorrect: opt.isCorrect,
              orderIndex: opt.orderIndex,
            })),
          } : undefined,
        },
        include: {
          options: true,
        },
      });

      return question;
    });
  }

  async updateQuestion(id: string, dto: AcademyQuestionUpdateDTO) {
    return this.prisma.$transaction(async (tx) => {
      const { options, parentId, ...data } = dto;

      // Update basic fields
      await tx.academyQuestion.update({
        where: { id },
        data: {
          ...data,
          questionType: data.questionType as any,
          correctAnswer: Array.isArray(data.correctAnswer) 
            ? JSON.stringify(data.correctAnswer) 
            : data.correctAnswer,
          parent: parentId ? { connect: { id: parentId } } : undefined,
        },
      });

      // Update options if provided (replaces existing options for simplicity in this version)
      if (options) {
        await tx.academyQuestionOption.deleteMany({
          where: { questionId: id },
        });
        await tx.academyQuestionOption.createMany({
          data: options.map((opt) => ({
            questionId: id,
            optionKey: opt.optionKey,
            content: opt.content,
            isCorrect: opt.isCorrect,
            orderIndex: opt.orderIndex,
          })),
        });
      }

      return tx.academyQuestion.findUnique({
        where: { id },
        include: {
          options: true,
        },
      });
    });
  }

  async findQuestions(query: AcademyQuestionQueryDTO) {
    const { questionType, level, categoryType, reviewStatus, q } = query;
    return this.prisma.academyQuestion.findMany({
      where: {
        questionType: questionType as any,
        level,
        categoryType: categoryType as any,
        reviewStatus,
        OR: q ? [
          { stem: { contains: q, mode: 'insensitive' } } as any,
          { explanation: { contains: q, mode: 'insensitive' } } as any,
        ] : undefined,
      },
      include: {
        options: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getQuestion(id: string) {
    const question = await this.prisma.academyQuestion.findUnique({
      where: { id },
      include: {
        options: true,
      },
    });
    if (!question) throw new NotFoundException('Question not found');
    return question;
  }

  async deleteQuestion(id: string) {
    const question = await this.prisma.academyQuestion.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            examQuestions: true,
            attemptAnswers: true,
          },
        },
      },
    });

    if (!question) throw new NotFoundException('Không tìm thấy câu hỏi');

    if (question._count.examQuestions > 0 || question._count.attemptAnswers > 0) {
      throw new BadRequestException(
        'Câu hỏi này đang được sử dụng trong bài thi hoặc đã có học viên thực hiện. Không thể xóa.'
      );
    }

    return this.prisma.academyQuestion.delete({
      where: { id },
    });
  }
}
