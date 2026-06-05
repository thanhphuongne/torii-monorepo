import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TicketService } from '../src/modules/ticket/ticket.service';
import { TICKET_REPOSITORY_TOKEN } from '@server/academy/interfaces/repositories';
import { EmailService } from '@server/identity/modules/email/email.service';
import { AuditLoggerService } from '../src/modules/audit-logger.service';
import { PrismaService } from '@server/shared';
import { of } from 'rxjs';
import { TicketType, TicketStatus, OrderStatus } from '@workspace/schemas';

describe('TicketService', () => {
  let service: TicketService;
  let mockRepo: any;
  let mockNats: any;
  let mockEmail: any;
  let mockAudit: any;
  let mockPrisma: any;

  beforeEach(async () => {
    mockRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      updateStatus: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    };

    mockNats = {
      send: jest.fn(),
      emit: jest.fn(),
    };

    mockEmail = {};

    mockAudit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    mockPrisma = {
      liveClass: { findUnique: jest.fn() },
      vodPackage: { findUnique: jest.fn() },
      order: { findUnique: jest.fn(), update: jest.fn() },
      enrollment: { findUnique: jest.fn(), update: jest.fn() },
      user: { update: jest.fn() },
      walletTransaction: { create: jest.fn() },
      userLessonProgress: { deleteMany: jest.fn() },
      academyExamAttempt: { deleteMany: jest.fn() },
      $transaction: jest.fn().mockImplementation((cb) => cb(mockPrisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketService,
        {
          provide: TICKET_REPOSITORY_TOKEN,
          useValue: mockRepo,
        },
        {
          provide: 'NATS_SERVICE',
          useValue: mockNats,
        },
        {
          provide: EmailService,
          useValue: mockEmail,
        },
        {
          provide: AuditLoggerService,
          useValue: mockAudit,
        },
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<TicketService>(TicketService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTicket', () => {
    it('should create a support ticket simple', async () => {
      const dto = { type: TicketType.SUPPORT, subject: 'Issue', content: 'Help' };
      mockRepo.create.mockResolvedValue({ id: 't1', ...dto });

      const result = await service.createTicket('u1', dto as any);
      expect(result.id).toBe('t1');
      expect(mockRepo.create).toHaveBeenCalled();
    });

    it('should throw BadRequest if refund requested without targets', async () => {
      const dto = { type: TicketType.REFUND, subject: 'Refund' };
      await expect(service.createTicket('u1', dto as any)).rejects.toThrow('liveClassId hoặc vodPackageId là bắt buộc');
    });

    it('should validate refund and create ticket for VOD', async () => {
      const dto = { type: TicketType.REFUND, vodPackageId: 'v1', subject: 'Refund' };
      
      // Enrollment check
      mockNats.send.mockImplementation((pattern: any) => {
        if (pattern.cmd === 'academy.enrollment.checkByTarget') {
          return of({ isEnrolled: true, enrollment: { id: 'en1', enrolledAt: new Date(), progress: 10, sourceOrderId: 'o1' } });
        }
        if (pattern.cmd === 'academy.vod.findById') {
          return of({ title: 'Course Name' });
        }
        return of(null);
      });

      mockPrisma.order.findUnique.mockResolvedValue({ grandTotal: 1000 });
      mockRepo.create.mockResolvedValue({ id: 't-ref' });

      const result = await service.createTicket('u1', dto as any);

      expect(result.id).toBe('t-ref');
      expect(mockPrisma.enrollment.update).toHaveBeenCalledWith(expect.objectContaining({
        data: { status: 'REFUND_PENDING' }
      }));
    });

    it('should throw if progress is over 20%', async () => {
      const dto = { type: TicketType.REFUND, vodPackageId: 'v1', subject: 'Refund' };
      mockNats.send.mockImplementation(() => of({ 
        isEnrolled: true, 
        enrollment: { enrolledAt: new Date(), progress: 25 } 
      }));
      
      await expect(service.createTicket('u1', dto as any)).rejects.toThrow('giới hạn là 20%');
    });
  });

  describe('updateTicketStatus', () => {
    it('should process refund and call handleRefundResolved', async () => {
      const ticket = { id: 't1', type: TicketType.REFUND, status: TicketStatus.PENDING, userId: 'u1', metadata: { courseTitle: 'C1' } };
      mockRepo.findById.mockResolvedValue(ticket);
      mockRepo.updateStatus.mockResolvedValue({ ...ticket, status: TicketStatus.RESOLVED });
      
      const spResolve = jest.spyOn(service as any, 'handleRefundResolved').mockResolvedValue(undefined);

      await service.updateTicketStatus('t1', 'admin', { status: TicketStatus.RESOLVED, response: 'OK' });

      expect(mockRepo.updateStatus).toHaveBeenCalledWith('t1', TicketStatus.RESOLVED, 'OK', 'admin', undefined);
      expect(spResolve).toHaveBeenCalled();
    });

    it('should throw if ticket is already finalized', async () => {
      mockRepo.findById.mockResolvedValue({ status: TicketStatus.RESOLVED });
      await expect(service.updateTicketStatus('t1', 'admin', { status: TicketStatus.RESOLVED })).rejects.toThrow('already finalized');
    });
  });

  describe('handleRefundResolved', () => {
    it('should execute full refund workflow in transaction', async () => {
      const ticket = { 
        id: 't1', userId: 'u1', orderId: 'o1', refundAmount: 1000, 
        liveClassId: 'lc1', metadata: { courseTitle: 'Title' } 
      };
      mockPrisma.enrollment.findUnique.mockResolvedValue({ id: 'en1' });

      await (service as any).handleRefundResolved(ticket, 'admin');

      expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'u1' },
        data: { walletBalance: { increment: 1000 } }
      }));
      expect(mockPrisma.enrollment.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'en1' },
        data: { status: 'CANCELLED' }
      }));
      expect(mockPrisma.userLessonProgress.deleteMany).toHaveBeenCalled();
      expect(mockPrisma.order.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'o1' },
        data: { status: OrderStatus.REFUNDED }
      }));
    });
  });

  describe('deleteTicket', () => {
    it('should update status to CANCELLED for users', async () => {
      const ticket = { id: 't1', userId: 'u1', status: TicketStatus.PENDING };
      mockRepo.findById.mockResolvedValue(ticket);

      await service.deleteTicket('t1', 'u1', 'u1', false);

      expect(mockRepo.updateStatus).toHaveBeenCalledWith('t1', TicketStatus.CANCELLED, expect.any(String), 'u1');
    });

    it('should delete from repo for admins', async () => {
      const ticket = { id: 't1', userId: 'u1', status: TicketStatus.PENDING, type: TicketType.SUPPORT };
      mockRepo.findById.mockResolvedValue(ticket);

      await service.deleteTicket('t1', undefined, 'admin', true);

      expect(mockRepo.delete).toHaveBeenCalledWith('t1');
    });
  });
});
