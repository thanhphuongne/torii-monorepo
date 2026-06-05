import { z } from 'zod';

export const academyLiveScheduleConflictPreviewDTOSchema = z.object({
  liveClassId: z.string().uuid(),
  excludeSessionId: z.string().uuid().optional(),
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'sessionDate must be yyyy-MM-dd'),
  startTime: z.string().min(1).max(20),
  endTime: z.string().min(1).max(20),
});
export type AcademyLiveScheduleConflictPreviewDTO = z.infer<
  typeof academyLiveScheduleConflictPreviewDTOSchema
>;

export const academyLiveScheduleRequestCreateDTOSchema = z.object({
  sessionId: z.string().uuid(),
  requestedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'requestedDate must be yyyy-MM-dd').optional(),
  proposedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'proposedDate must be yyyy-MM-dd').optional(),
  proposedStartTime: z.string().max(20).optional(),
  proposedEndTime: z.string().max(20).optional(),
  proposedTeacherId: z.string().uuid().optional(),
  reason: z.string().optional(),
});
export type AcademyLiveScheduleRequestCreateDTO = z.infer<
  typeof academyLiveScheduleRequestCreateDTOSchema
>;

export const academyLiveScheduleRequestApproveDTOSchema = z.object({
  reviewNote: z.string().optional(),
});
export type AcademyLiveScheduleRequestApproveDTO = z.infer<
  typeof academyLiveScheduleRequestApproveDTOSchema
>;

export const academyLiveScheduleRequestRejectDTOSchema = z.object({
  reviewNote: z.string().min(1),
});
export type AcademyLiveScheduleRequestRejectDTO = z.infer<
  typeof academyLiveScheduleRequestRejectDTOSchema
>;

export const academyLiveScheduleRequestQueryDTOSchema = z.object({
  liveClassId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  requestedBy: z.string().uuid().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).optional(),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'fromDate must be yyyy-MM-dd').optional(),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'toDate must be yyyy-MM-dd').optional(),
});

export type AcademyLiveScheduleRequestQueryDTO = z.infer<
  typeof academyLiveScheduleRequestQueryDTOSchema
>;
