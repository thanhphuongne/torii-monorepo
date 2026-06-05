import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api-client';
import type {
    LiveSessionResponseDTO,
    LiveSessionJoinResponseDTO,
    StandardApiResponse,
    AcademyLiveScheduleSessionModel,
} from '@workspace/schemas';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
const SCHEDULE_WINDOW_PAST_WEEKS = 2;
const SCHEDULE_WINDOW_FUTURE_WEEKS = 12;
export const LIVE_SESSION_JOIN_OPEN_BEFORE_MINUTES = 30;
export const LIVE_SESSION_JOIN_CLOSE_AFTER_END_HOURS = 4;
const VN_TZ = 'Asia/Ho_Chi_Minh';

export type LiveSessionUiState = 'scheduled' | 'joinable' | 'live' | 'ended';

function parseHHmmToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
}

function computeDurationMinutes(startTime: string, endTime: string): number {
    const start = parseHHmmToMinutes(startTime);
    const end = parseHHmmToMinutes(endTime);
    if (end >= start) return end - start;
    return 0;
}

function buildZonedDateTime(dateInTz: string, timeHHmm: string): Date {
    // Interpret the wall time in VN timezone and convert to an absolute instant.
    // This prevents the common "UTC setUTCHours" +7h drift.
    const local = new Date(`${dateInTz}T${timeHHmm}:00`);
    return fromZonedTime(local, VN_TZ);
}

export function getSessionJoinWindow(session: LiveSessionResponseDTO) {
    const scheduledAt = new Date(session.scheduledAt);
    const durationMinutes = Math.max(1, Number(session.duration || 90));
    const endAt = new Date(scheduledAt.getTime() + durationMinutes * 60 * 1000);
    const joinOpenAt = new Date(
        scheduledAt.getTime() - LIVE_SESSION_JOIN_OPEN_BEFORE_MINUTES * 60 * 1000,
    );
    const joinCloseAt = new Date(
        endAt.getTime() + LIVE_SESSION_JOIN_CLOSE_AFTER_END_HOURS * 60 * 60 * 1000,
    );
    return { scheduledAt, endAt, joinOpenAt, joinCloseAt };
}

export function getLiveSessionUiState(
    session: LiveSessionResponseDTO,
    nowInput?: Date,
): LiveSessionUiState {
    const now = nowInput ?? new Date();
    const { scheduledAt, endAt, joinOpenAt, joinCloseAt } = getSessionJoinWindow(session);

    if (now < joinOpenAt) return 'scheduled';
    if (now >= scheduledAt && now <= endAt) return 'live';
    if (now > joinCloseAt) return 'ended';
    return 'joinable';
}

export function canJoinLiveSessionNow(
    session: LiveSessionResponseDTO,
    nowInput?: Date,
): boolean {
    const now = nowInput ?? new Date();
    const { joinOpenAt, joinCloseAt } = getSessionJoinWindow(session);
    return now >= joinOpenAt && now <= joinCloseAt;
}

function toSessionResponse(
    session: AcademyLiveScheduleSessionModel,
    liveClassId: string,
    now: Date,
): LiveSessionResponseDTO {
    const serverScheduledAt = (session as any)?.scheduledAt;
    const serverEndAt = (session as any)?.endAt;
    const scheduledAt = serverScheduledAt ? new Date(serverScheduledAt) : (() => {
        const dateKey = formatInTimeZone(new Date(session.sessionDate as any), VN_TZ, 'yyyy-MM-dd');
        return buildZonedDateTime(dateKey, session.startTime);
    })();
    const endAt = serverEndAt ? new Date(serverEndAt) : (() => {
        const dateKey = formatInTimeZone(new Date(session.sessionDate as any), VN_TZ, 'yyyy-MM-dd');
        return buildZonedDateTime(dateKey, session.endTime);
    })();
    const duration = computeDurationMinutes(session.startTime, session.endTime);

    const status =
        now >= scheduledAt && now <= endAt
            ? 'live'
            : now > endAt
                ? 'ended'
                : 'scheduled';

    return {
        id: session.id,
        liveClassId,
        lecturerId: null,
        title: session.note?.trim() ? session.note : 'Buoi hoc truc tuyen',
        description: session.location ?? null,
        scheduledAt,
        duration,
        status,
        meetingId: session.roomId ?? null,
        scheduleId: session.scheduleId ?? null,
        createdAt: new Date(session.createdAt as any),
        updatedAt: new Date(session.updatedAt as any),
    };
}

export const liveSessionApi = {
    // Build active session from weekly live schedules of class
    async getActiveSession(liveClassId: string): Promise<LiveSessionResponseDTO | null> {
        try {
            const sessions = await liveSessionApi.getSessions(liveClassId);
            return sessions.find((s) => (s.status || '').toLowerCase() === 'live') ?? null;
        } catch (error) {
            console.error('Error fetching active live session:', error);
            return null;
        }
    },

    // List session instances from /api/academy/live-sessions
    async getSessions(liveClassId: string): Promise<LiveSessionResponseDTO[]> {
        if (!liveClassId) return [];

        const now = new Date();
        const from = new Date(now);
        from.setDate(from.getDate() - SCHEDULE_WINDOW_PAST_WEEKS * 7);
        const to = new Date(now);
        to.setDate(to.getDate() + SCHEDULE_WINDOW_FUTURE_WEEKS * 7);

        const response = await apiClient.get<
            StandardApiResponse<{ items: AcademyLiveScheduleSessionModel[] }>
        >('/api/academy/live-sessions', {
            params: {
                liveClassId,
                from: from.toISOString().slice(0, 10),
                to: to.toISOString().slice(0, 10),
            },
        });

        const sessions = response.data.data?.items ?? [];
        return sessions
            .map((s) => toSessionResponse(s, s.liveClassId, now))
            .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    },

    // POST /api/live-sessions/:sessionId/join/student
    async joinSession(id: string): Promise<LiveSessionJoinResponseDTO> {
        const response = await apiClient.post<
            StandardApiResponse<LiveSessionJoinResponseDTO>
        >(`/api/live-sessions/${id}/join/student`);
        return response.data.data!;
    },

    /** Lịch LIVE của user hiện tại + trạng thái điểm danh từng buổi (server aggregate). */
    async getMySchedule(): Promise<
        (LiveSessionResponseDTO & {
            courseTitle: string;
            courseThumbnail: string | null;
            attendanceStatus?: LiveSessionResponseDTO['attendanceStatus'];
        })[]
    > {
        const now = new Date();
        const from = new Date(now);
        from.setDate(from.getDate() - SCHEDULE_WINDOW_PAST_WEEKS * 7);
        const to = new Date(now);
        to.setDate(to.getDate() + SCHEDULE_WINDOW_FUTURE_WEEKS * 7);

        const response = await apiClient.get<
            StandardApiResponse<{
                items: Array<
                    AcademyLiveScheduleSessionModel & {
                        courseTitle: string;
                        courseThumbnail: string | null;
                        attendanceStatus: string | null;
                    }
                >;
            }>
        >('/api/academy/live-sessions/me', {
            params: {
                from: from.toISOString().slice(0, 10),
                to: to.toISOString().slice(0, 10),
            },
        });

        const items = response.data.data?.items ?? [];
        return items
            .map((s) => ({
                ...toSessionResponse(s, s.liveClassId, now),
                courseTitle: s.courseTitle || 'Khóa học',
                courseThumbnail: s.courseThumbnail ?? null,
                attendanceStatus: (s.attendanceStatus as LiveSessionResponseDTO['attendanceStatus']) ?? null,
            }))
            .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    }
};

export function useMySchedule() {
    return useQuery({
        queryKey: ['my-schedule'],
        queryFn: liveSessionApi.getMySchedule,
        staleTime: 5 * 60 * 1000, // 5 mins
    });
}

export function useClassSchedule(liveClassId?: string) {
    return useQuery({
        queryKey: ['class-schedule', liveClassId],
        queryFn: () => liveSessionApi.getSessions(liveClassId!),
        enabled: !!liveClassId,
        staleTime: 5 * 60 * 1000,
    });
}
