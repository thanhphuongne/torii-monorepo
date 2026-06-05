import { z } from 'zod';
import { AcademyAttemptStatus } from '../enums/academy.enum';

export const academyExamAttemptStartDTOSchema = z.object({
  examId: z.string().uuid(),
  enrollmentId: z.string().uuid(),
  assessmentId: z.string().uuid().optional(),
  // For learner flows, userId is derived from requester token at gateway.
  userId: z.string().uuid().optional(),
});
export type AcademyExamAttemptStartDTO = z.infer<
  typeof academyExamAttemptStartDTOSchema
>;

export const academyExamAttemptSaveAnswersDTOSchema = z.object({
  attemptId: z.string().uuid(),
  draftAnswers: z.record(z.unknown()),
});
export type AcademyExamAttemptSaveAnswersDTO = z.infer<
  typeof academyExamAttemptSaveAnswersDTOSchema
>;

export const academyExamAttemptSubmitDTOSchema = z.object({
  attemptId: z.string().uuid(),
});
export type AcademyExamAttemptSubmitDTO = z.infer<
  typeof academyExamAttemptSubmitDTOSchema
>;

export const academyExamAttemptQueryDTOSchema = z.object({
  examId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  enrollmentId: z.string().uuid().optional(),
  status: z.nativeEnum(AcademyAttemptStatus).optional(),
  latestOnly: z.coerce.boolean().optional(),
});
export type AcademyExamAttemptQueryDTO = z.infer<
  typeof academyExamAttemptQueryDTOSchema
>;

export type AcademyExamAttemptModelDTO = {
  id: string;
  examId: string;
  userId: string;
  enrollmentId?: string | null;
  status: AcademyAttemptStatus;
  score?: number | null;
  maxScore?: number | null;
  percentage?: number | null;
  isPassed?: boolean | null;
  startedAt: string;
  submittedAt?: string | null;
  completedAt?: string | null;
  deadlineAt?: string | null;
  timeTakenSeconds?: number | null;
  draftAnswers?: Record<string, any> | null;
  resultMetadata?: any | null;
  exam?: any | null;
  answers?: any[] | null;
  createdAt: string;
  updatedAt: string;
};
