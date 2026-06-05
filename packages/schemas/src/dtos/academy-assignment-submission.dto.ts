import { z } from 'zod';

export const academyAssignmentSubmissionCreateDTOSchema = z.object({
  liveClassId: z.string().uuid(),
  classAssessmentId: z.string().uuid(),
  assignmentTemplateId: z.string().uuid(),
  // For learner flows, userId is derived from requester token at gateway.
  // exam.manage callers may still provide userId explicitly.
  userId: z.string().uuid().optional(),
  status: z.string().max(20).optional(),
  content: z.unknown().optional(),
  fileUrls: z.array(z.string()).optional(),
});
export type AcademyAssignmentSubmissionCreateDTO = z.infer<
  typeof academyAssignmentSubmissionCreateDTOSchema
>;

export const academyAssignmentSubmissionUpdateDTOSchema = z.object({
  status: z.string().max(20).optional(),
  score: z.number().min(0).optional(),
  content: z.unknown().optional(),
  fileUrls: z.array(z.string()).optional(),
  feedback: z.string().optional(),
});
export type AcademyAssignmentSubmissionUpdateDTO = z.infer<
  typeof academyAssignmentSubmissionUpdateDTOSchema
>;

export const academyAssignmentSubmissionQueryDTOSchema = z.object({
  liveClassId: z.string().uuid().optional(),
  classAssessmentId: z.string().uuid().optional(),
  assignmentTemplateId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
});
export type AcademyAssignmentSubmissionQueryDTO = z.infer<
  typeof academyAssignmentSubmissionQueryDTOSchema
>;

export type AcademyAssignmentSubmissionModel = {
  id: string;
  liveClassId: string;
  classAssessmentId: string;
  assignmentTemplateId: string;
  userId: string;
  status: string; // DRAFT, SUBMITTED, GRADED, RETURNED
  score?: number | null;
  content?: any | null;
  fileUrls?: string[] | null;
  feedback?: string | null;
  submittedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};
