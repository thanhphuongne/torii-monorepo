import { z } from "zod"

export const academyLiveSessionQueryDTOSchema = z.object({
  liveClassId: z.string().uuid(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "from must be yyyy-MM-dd"),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "to must be yyyy-MM-dd"),
})

export type AcademyLiveSessionQueryDTO = z.infer<
  typeof academyLiveSessionQueryDTOSchema
>

const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/

export const academyLiveSessionMyScheduleQueryDTOSchema = z.object({
  from: z.string().regex(dateOnlyRegex, "from must be yyyy-MM-dd").optional(),
  to: z.string().regex(dateOnlyRegex, "to must be yyyy-MM-dd").optional(),
})

export type AcademyLiveSessionMyScheduleQueryDTO = z.infer<
  typeof academyLiveSessionMyScheduleQueryDTOSchema
>

export const academyLiveScheduleSessionModelSchema = z.object({
  id: z.string().uuid(),
  liveClassId: z.string().uuid(),
  scheduleId: z.string().uuid().nullable(),
  sessionDate: z.string().or(z.date()),
  startTime: z.string(),
  endTime: z.string(),
  status: z.string(),
  cancellationReason: z.string().nullable(),
  roomId: z.string().nullable(),
  location: z.string().nullable(),
  note: z.string().nullable(),
  instructorId: z.string().uuid().nullable(),
  supersededBySessionId: z.string().uuid().nullable(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
})

export type AcademyLiveScheduleSessionModel = z.infer<
  typeof academyLiveScheduleSessionModelSchema
>

