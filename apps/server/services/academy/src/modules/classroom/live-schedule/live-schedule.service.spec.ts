import { of } from 'rxjs';
import { BadRequestException } from '@nestjs/common';
import { LiveScheduleService } from './live-schedule.service';

describe('LiveScheduleService', () => {
  const now = new Date();
  const inWindowStart = new Date(now.getTime() - 10 * 60 * 1000);
  const inWindowEnd = new Date(now.getTime() + 10 * 60 * 1000);
  const startTime = `${String(now.getHours()).padStart(2, '0')}:${String(
    Math.max(0, now.getMinutes() - 5),
  ).padStart(2, '0')}`;
  const endTime = `${String(now.getHours()).padStart(2, '0')}:${String(
    Math.min(59, now.getMinutes() + 5),
  ).padStart(2, '0')}`;

  const scheduleMock = {
    id: 'schedule-id',
    liveClassId: 'class-id',
    roomId: 'room-1',
    weekday: now.getDay(),
    startTime,
    endTime,
    class: {
      id: 'class-id',
      name: 'Class A',
      status: 'OPENING',
      courseProfile: { title: 'Course A' },
      instructor: { id: 'teacher-id' },
    },
  } as any;

  it('uses room.isActive contract and returns token', async () => {
    const prisma = {
      liveSchedule: {
        findUnique: jest.fn().mockResolvedValue(scheduleMock),
        update: jest.fn(),
      },
      enrollment: {
        findFirst: jest.fn().mockResolvedValue({ id: 'enroll-1' }),
      },
    } as any;

    const nats = {
      send: jest.fn((pattern: { cmd: string }) => {
        if (pattern.cmd === 'identity.users.findById') {
          return of({ user: { displayName: 'Student A', role: 'learner' } });
        }
        if (pattern.cmd === 'room.isActive') {
          return of({ isActive: true });
        }
        if (pattern.cmd === 'user.generateJoinToken') {
          return of({ token: 'join-token' });
        }
        return of({});
      }),
    } as any;

    const audit = {
      log: jest.fn().mockResolvedValue(undefined),
    } as any;

    const service = new LiveScheduleService(prisma, {} as any, nats, audit);
    const result = await service.join('schedule-id', 'student-id', false);

    expect(result.token).toBe('join-token');
    expect(nats.send).toHaveBeenCalledWith(
      { cmd: 'room.isActive' },
      { roomId: 'room-1' },
    );
  });

  it('rejects student join when enrollment is not active', async () => {
    const prisma = {
      liveSchedule: {
        findUnique: jest.fn().mockResolvedValue(scheduleMock),
      },
      enrollment: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    } as any;

    const nats = {
      send: jest.fn((pattern: { cmd: string }) => {
        if (pattern.cmd === 'identity.users.findById') {
          return of({ user: { displayName: 'Student A', role: 'learner' } });
        }
        if (pattern.cmd === 'room.isActive') {
          return of({ isActive: true });
        }
        return of({});
      }),
    } as any;

    const audit = {
      log: jest.fn().mockResolvedValue(undefined),
    } as any;

    const service = new LiveScheduleService(prisma, {} as any, nats, audit);

    await expect(
      service.join('schedule-id', 'student-id', false),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
