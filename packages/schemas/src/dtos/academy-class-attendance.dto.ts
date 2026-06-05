import { z } from 'zod';
import { paginationQuerySchema } from './common.dto';

export const academyClassAttendanceStatusSchema = z.enum([
    'PRESENT',
    'ABSENT',
    'LATE',
    'EXCUSED',
]);

export type AcademyClassAttendanceStatus = z.infer<typeof academyClassAttendanceStatusSchema>;

export const academyClassAttendanceCreateDTOSchema = z.object({
    sessionId: z.string().uuid(),
    userId: z.string().uuid(),
    status: academyClassAttendanceStatusSchema,
});

export type AcademyClassAttendanceCreateDTO = z.infer<typeof academyClassAttendanceCreateDTOSchema>;

export const academyClassAttendanceUpdateDTOSchema = z.object({
    status: academyClassAttendanceStatusSchema.optional(),
});

export type AcademyClassAttendanceUpdateDTO = z.infer<typeof academyClassAttendanceUpdateDTOSchema>;

export const academyClassAttendanceQueryDTOSchema = paginationQuerySchema.extend({
    sessionId: z.string().uuid().optional(),
    userId: z.string().uuid().optional(),
    liveClassId: z.string().uuid().optional(),
});

export type AcademyClassAttendanceQueryDTO = z.infer<typeof academyClassAttendanceQueryDTOSchema>;
