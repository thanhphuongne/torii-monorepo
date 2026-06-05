import { z } from 'zod';

export const academyLiveScheduleCreateDTOSchema = z.object({
  liveClassId: z.string().uuid(),
  weekday: z.number().int().min(0),
  startTime: z.string().min(1).max(20),
  endTime: z.string().min(1).max(20),
  location: z.string().max(255).optional(),
  note: z.string().optional(),
  excludedDates: z.any().optional(),
  roomId: z.string().max(64).optional(),
});
export type AcademyLiveScheduleCreateDTO = z.infer<
  typeof academyLiveScheduleCreateDTOSchema
>;

export const academyLiveScheduleUpdateDTOSchema = z.object({
  weekday: z.number().int().min(0).optional(),
  startTime: z.string().max(20).optional(),
  endTime: z.string().max(20).optional(),
  location: z.string().max(255).optional(),
  note: z.string().optional(),
  excludedDates: z.any().optional(),
  roomId: z.string().max(64).optional(),
});
export type AcademyLiveScheduleUpdateDTO = z.infer<
  typeof academyLiveScheduleUpdateDTOSchema
>;

export const academyLiveScheduleQueryDTOSchema = z.object({
  liveClassId: z.string().uuid().optional(),
});
export type AcademyLiveScheduleQueryDTO = z.infer<
  typeof academyLiveScheduleQueryDTOSchema
>;

export type AcademyLiveScheduleModel = {
  id: string;
  liveClassId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  location?: string | null;
  note?: string | null;
  excludedDates?: any | null;
  roomId?: string | null;
  createdAt: string;
  updatedAt: string;
};
