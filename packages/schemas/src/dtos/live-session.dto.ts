import { z } from 'zod';
import { LiveSessionStatus } from '../enums/live-session.enum';


export const liveSessionCreateDTOSchema = z.object({
    liveClassId: z.string().uuid(),
    lecturerId: z.string().uuid().optional(),
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    scheduledAt: z.string().or(z.date()),
    duration: z.number().min(15).default(90),
});

export type LiveSessionCreateDTO = z.infer<typeof liveSessionCreateDTOSchema>;

export const liveSessionBulkCreateDTOSchema = z.object({
    liveClassId: z.string().uuid(),
    lecturerId: z.string().uuid().optional(),
    titlePrefix: z.string().min(1, 'Title prefix is required'),
    description: z.string().optional(),
    dates: z.array(z.string().or(z.date())).min(1, 'At least one date is required'),
    duration: z.number().min(15).default(90),
});

export type LiveSessionBulkCreateDTO = z.infer<typeof liveSessionBulkCreateDTOSchema>;

export const liveSessionUpdateDTOSchema = z.object({
    lecturerId: z.string().uuid().optional(),
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    scheduledAt: z.string().or(z.date()).optional(),
    duration: z.number().min(15).optional(),
    status: z.nativeEnum(LiveSessionStatus).optional(),
    meetingId: z.string().optional(),
});

export type LiveSessionUpdateDTO = z.infer<typeof liveSessionUpdateDTOSchema>;

export interface LiveSessionResponseDTO {
    id: string;
    liveClassId: string;
    lecturerId: string | null;
    title: string;
    description: string | null;
    scheduledAt: Date;
    duration: number;
    status: string;
    meetingId: string | null;
    scheduleId: string | null;
    createdAt: Date;
    updatedAt: Date;
    /** Điểm danh của user hiện tại cho buổi này; null = chưa có bản ghi */
    attendanceStatus?: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | null;

    lecturer?: {
        id: string;
        displayName: string;
        avatarUrl: string | null;
    };
    liveClass?: any;
}

export interface LiveSessionJoinResponseDTO {
    token: string;
    roomId: string;
    roomTitle: string;
    sid: string;
}
