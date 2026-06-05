import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  Ticket,
  TicketQueryDTO,
  CreateTicketDTO,
  UpdateTicketStatusDTO,
  PaginatedResponseDTO,
  TicketType,
  TicketStatus,
  OrderStatus,
} from '@workspace/schemas';
import { ITicketService } from '@server/academy/interfaces/services';
import {
  ITicketRepository,
  TICKET_REPOSITORY_TOKEN,
} from '@server/academy/interfaces/repositories';
import { EmailService } from '@server/identity/modules/email/email.service';
import { AuditLoggerService } from '../audit-logger.service';
import { PrismaService } from '@server/shared';

@Injectable()
export class TicketService implements ITicketService {
  private readonly logger = new Logger(TicketService.name);

  constructor(
    @Inject(TICKET_REPOSITORY_TOKEN)
    private readonly ticketRepository: ITicketRepository,
    @Inject('NATS_SERVICE')
    private readonly natsClient: ClientProxy,
    private readonly emailService: EmailService,
    private readonly audit: AuditLoggerService,
    private readonly prisma: PrismaService,
  ) { }

  async createTicket(
    userId: string,
    dto: CreateTicketDTO,
    requesterId?: string,
  ): Promise<Ticket> {
    let ticketMetadata = dto.metadata;

    if (dto.type === TicketType.REFUND) {
      let liveClassId = dto.liveClassId;
      let vodPackageId = dto.vodPackageId;

      // Một số client gửi một UUID ở `liveClassId` cho cả LIVE và VOD — suy ra loại theo DB.
      // Resolve target type explicitly to avoid mis-validating VOD as LIVE.
      if (liveClassId && !vodPackageId) {
        const [liveClassExists, vodPackageExists] = await Promise.all([
          this.prisma.liveClass.findUnique({
            where: { id: liveClassId },
            select: { id: true },
          }),
          this.prisma.vodPackage.findUnique({
            where: { id: liveClassId },
            select: { id: true },
          }),
        ]);

        if (!liveClassExists && vodPackageExists) {
          vodPackageId = liveClassId;
          liveClassId = undefined;
        }
      }

      if (!liveClassId && !vodPackageId) {
        throw new BadRequestException(
          'liveClassId hoặc vodPackageId là bắt buộc cho yêu cầu hoàn tiền',
        );
      }

      try {
        const result = liveClassId
          ? await firstValueFrom(
            this.natsClient.send(
              { cmd: 'academy.enrollment.checkByTarget' },
              { userId, targetType: 'CLASS', targetId: liveClassId },
            ),
          )
          : vodPackageId
            ? await firstValueFrom(
              this.natsClient.send(
                { cmd: 'academy.enrollment.checkByTarget' },
                { userId, targetType: 'VOD_PACKAGE', targetId: vodPackageId },
              ),
            )
            : null;

        if (!result || !result.isEnrolled) {
          throw new BadRequestException(
            'Bạn chưa đăng ký khóa học này hoặc đăng ký không còn hiệu lực.',
          );
        }

        const enrollment = result.enrollment;
        const progress = enrollment.progress ?? enrollment.completionPercentage ?? 0;
        const enrolledAt = new Date(enrollment.enrolledAt);
        const originalStatus = enrollment.status;
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - enrolledAt.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (liveClassId) {
          const liveClass = await this.prisma.liveClass.findUnique({
            where: { id: liveClassId },
            select: {
              id: true,
              status: true,
              cohort: {
                select: {
                  startDate: true,
                  enrollmentOpenAt: true,
                  enrollmentCloseAt: true,
                },
              },
            },
          });

          if (!liveClass) {
            throw new BadRequestException('Lớp LIVE không tồn tại.');
          }

          const cohortStartDate = liveClass.cohort?.startDate ?? null;
          if (cohortStartDate && now >= cohortStartDate) {
            throw new BadRequestException(
              'Khóa học LIVE đã rẽ sang giai đoạn học tập (đã khai giảng). Hệ thống không hỗ trợ hoàn tiền sau ngày khai giảng.',
            );
          }

          // If it's a Live Class and we passed the startDate check, it's unconditionally refundable
          // Skip the 14-day and progress checks for Live Classes.
        }

        if (!liveClassId) {
          // Rule for VOD: Within 14 days and < 20% progress
          if (diffDays > 14) {
            throw new BadRequestException(
              'Bạn chỉ có thể yêu cầu hoàn tiền trong vòng 14 ngày kể từ ngày đăng ký khóa học VOD.',
            );
          }

          if (progress > 20) {
            throw new BadRequestException(
              `Khóa học không đủ điều kiện hoàn tiền do bạn đã hoàn thành ${progress}% nội dung (giới hạn là 20%).`,
            );
          }
        }

        let courseTitle = 'Khóa học';
        if (liveClassId) {
          const classResult = await firstValueFrom(
            this.natsClient.send(
              { cmd: 'academy.class.findById' },
              { id: liveClassId },
            ),
          ).catch(() => null);
          courseTitle = classResult?.name || courseTitle;
        } else if (vodPackageId) {
          const vodResult = await firstValueFrom(
            this.natsClient.send(
              { cmd: 'academy.vod.findById' },
              { id: vodPackageId },
            ),
          ).catch(() => null);
          courseTitle = vodResult?.title || courseTitle;
        }

        // Auto-resolve orderId for the ticket if it's a refund
        const orderId = enrollment.sourceOrderId;

        // Fetch order amount and store in metadata so admin doesn't need a separate API call
        let orderAmount = 0;
        if (orderId) {
          try {
            const order = await this.prisma.order.findUnique({
              where: { id: orderId },
              select: { grandTotal: true },
            });
            orderAmount = Number(order?.grandTotal || 0);
          } catch {
            // non-fatal: orderAmount stays 0
          }
        }

        ticketMetadata = {
          ...dto.metadata,
          progress,
          enrolledAt,
          originalStatus,
          courseTitle,
          liveClassId,
          vodPackageId,
          originalOrderId: orderId,
          orderAmount,
        };

        // Create the ticket with the resolved orderId
        const ticket = await this.ticketRepository.create({
          ...dto,
          userId,
          liveClassId: liveClassId || undefined,
          orderId: (dto as any).orderId || orderId,
          metadata: ticketMetadata,
        });

        // Block enrollment access immediately upon refund request
        if (enrollment?.id) {
          await this.prisma.enrollment.update({
            where: { id: enrollment.id },
            data: { status: 'REFUND_PENDING' },
          });
          this.logger.log(`Enrollment ${enrollment.id} locked (REFUND_PENDING) due to refund ticket ${ticket.id}`);
        }

        return ticket;
      } catch (error) {
        if (error instanceof BadRequestException) throw error;
        this.logger.error(
          `Failed to validate refund request: ${error.message}`,
        );
        throw new BadRequestException('Validation failed for refund request');
      }
    }

    return this.ticketRepository.create({
      ...dto,
      userId,
      metadata: ticketMetadata,
    });
  }

  async getTicketById(id: string): Promise<Ticket> {
    const ticket = await this.ticketRepository.findById(id);
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }
    return ticket;
  }

  async getTickets(
    query: TicketQueryDTO,
  ): Promise<PaginatedResponseDTO<Ticket>> {
    const { data, total } = await this.ticketRepository.findAll(query);
    const limit = Number(query.limit) || 10;
    const page = Number(query.page) || 1;

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateTicketStatus(
    id: string,
    handlerId: string,
    dto: UpdateTicketStatusDTO,
    requesterId?: string,
  ): Promise<Ticket> {
    const ticket = await this.getTicketById(id);

    if (
      ticket.status !== TicketStatus.PENDING &&
      ticket.status !== TicketStatus.PROCESSING
    ) {
      throw new BadRequestException('Ticket is already finalized');
    }

    // Simplified Workflow for REFUND tickets
    // No more blocking RESOLVED from PENDING or PROCESSING.

    // Use any cast to bypass workspace type link issues temporarily
    let refundAmount = dto.refundAmount ?? (ticket as any).refundAmount;

    // Auto-calculate refund amount for REFUND tickets if not already set or specifically requested
    if (
      (dto.status === TicketStatus.PROCESSING ||
        dto.status === TicketStatus.RESOLVED) &&
      ticket.type === TicketType.REFUND &&
      !refundAmount
    ) {
      const liveClassId = ticket.liveClassId;
      const vodPackageId = (ticket as any).metadata?.vodPackageId;
      const userId = ticket.userId;

      if ((liveClassId || vodPackageId) && userId) {
        try {
          // Find order for this enrollment if not specified in ticket
          let orderId = ticket.orderId;

          const enrollmentResult = await firstValueFrom(
            this.natsClient.send(
              { cmd: 'academy.enrollment.checkByTarget' },
              liveClassId
                ? { userId, targetType: 'CLASS', targetId: liveClassId }
                : { userId, targetType: 'VOD_PACKAGE', targetId: vodPackageId },
            ),
          ).catch(() => null);

          if (
            enrollmentResult?.isEnrolled &&
            enrollmentResult?.enrollment?.sourceOrderId
          ) {
            orderId = enrollmentResult.enrollment.sourceOrderId;
          }

          // Fetch order details to get the total amount
          if (orderId) {
            const order = await firstValueFrom(
              this.natsClient.send(
                { cmd: 'billing.order.findById' },
                { id: orderId },
              ),
            ).catch(() => null);

            if (order) {
              // 1:1 ratio from VND to Coins
              refundAmount = Number(order.grandTotal || order.amount || 0);
              this.logger.log(
                `Auto-calculated refund amount for ticket ${id}: ${refundAmount} (based on order ${orderId})`,
              );
            }
          }
        } catch (error) {
          this.logger.error(
            `Failed to auto-calculate refund amount for ticket ${id}: ${error.message}`,
          );
        }
      }
    }

    const updatedTicket = await this.ticketRepository.updateStatus(
      id,
      dto.status,
      dto.response,
      handlerId,
      refundAmount,
    );

    if (
      ticket.type === TicketType.REFUND &&
      dto.status === TicketStatus.RESOLVED
    ) {
      await this.handleRefundResolved(updatedTicket, handlerId);
    }

    if (
      ticket.type === TicketType.REFUND &&
      dto.status === TicketStatus.CANCELLED
    ) {
      await this.handleRefundCancelled(updatedTicket);
    }

    await this.audit.log({
      userId: requesterId || handlerId,
      action: 'ticket.update_status',
      entity: 'Ticket',
      entityId: id,
      description: `Updated ticket status to ${dto.status}`,
      oldValues: { status: ticket.status },
      newValues: { status: updatedTicket.status },
      metadata: { handlerId, response: dto.response },
    });

    try {
      let title = '';
      let message = '';

      if (dto.status === TicketStatus.RESOLVED) {
        title =
          ticket.type === TicketType.REFUND
            ? 'Yêu cầu hoàn tiền đã được giải quyết'
            : 'Yêu cầu hỗ trợ đã được giải quyết';
        message =
          ticket.type === TicketType.REFUND
            ? `Yêu cầu hoàn tiền cho khóa học của bạn đã được phê duyệt. ${dto.response || ''}`
            : `Yêu cầu hỗ trợ của bạn đã được xử lý thành công. ${dto.response || ''}`;
      } else if (dto.status === TicketStatus.CANCELLED) {
        title = 'Yêu cầu đã bị hủy';
        message = `Yêu cầu của bạn đã bị hủy. Lý do: ${dto.response || 'Không có lý do cụ thể.'}`;
      } else if (dto.status === TicketStatus.PROCESSING) {
        title = 'Yêu cầu đang được xử lý';
        message = `Yêu cầu của bạn đã được tiếp nhận và đang trong quá trình xử lý.`;
      }

      if (title && message) {
        this.natsClient.emit(
          { cmd: 'send_notification' },
          {
            recipientId: ticket.userId,
            type: 'system',
            payload: {
              title,
              body: message,
              metadata: {
                ticketId: ticket.id,
                status: dto.status,
                type: ticket.type,
              },
            },
          },
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to send notification for ticket ${id}: ${error.message}`,
      );
    }

    return updatedTicket;
  }

  private async handleRefundResolved(ticket: Ticket, handlerId: string) {
    const { userId, liveClassId, orderId } = ticket;
    const refundAmount = (ticket as any).refundAmount;
    const amount = Number(refundAmount || 0);

    return this.prisma.$transaction(async (tx) => {
      // 1. Credit Coins to User
      await tx.user.update({
        where: { id: userId },
        data: {
          walletBalance: { increment: amount },
        },
      });

      // 2. Create Wallet Transaction
      await tx.walletTransaction.create({
        data: {
          userId,
          amount,
          type: 'REFUND',
          referenceId: orderId || ticket.id,
          description: `Hoàn tiền khóa học: ${(ticket.metadata as any)?.courseTitle || ticket.subject} (Mã yêu cầu: #${ticket.id.slice(-6).toUpperCase()})`,
        },
      });

      // 3. Cancel Enrollment
      const vodPackageId = (ticket.metadata as any)?.vodPackageId;

      if (liveClassId || vodPackageId) {
        const where = liveClassId
          ? { userId_liveClassId: { userId, liveClassId } }
          : { userId_vodPackageId: { userId, vodPackageId } };

        const enrollment = await tx.enrollment.findUnique({
          where: where as any,
        });

        if (enrollment) {
          await tx.enrollment.update({
            where: { id: enrollment.id },
            data: { status: 'CANCELLED' },
          });

          // Clear progress data upon refund/cancellation
          await tx.userLessonProgress.deleteMany({
            where: { enrollmentId: enrollment.id },
          });

          await tx.academyExamAttempt.deleteMany({
            where: { enrollmentId: enrollment.id },
          });

          this.logger.log(
            `Enrollment ${enrollment.id} (${liveClassId ? 'Live' : 'VOD'}) cancelled and progress cleared for refund ticket ${ticket.id}`,
          );
        }
      }

      // 4. Mark Order as REFUNDED if orderId is available
      if (orderId) {
        await tx.order.update({
          where: { id: orderId },
          data: { status: OrderStatus.REFUNDED },
        });
      }
    });
  }

  private async handleRefundCancelled(ticket: Ticket) {
    const { userId, liveClassId } = ticket;
    const vodPackageId = (ticket.metadata as any)?.vodPackageId;
    const originalStatus = (ticket.metadata as any)?.originalStatus || 'ACTIVE';

    if (liveClassId || vodPackageId) {
      const where = liveClassId
        ? { userId_liveClassId: { userId, liveClassId } }
        : { userId_vodPackageId: { userId, vodPackageId } };

      const enrollment = await this.prisma.enrollment.findUnique({
        where: where as any,
      });

      if (enrollment && enrollment.status === 'REFUND_PENDING') {
        await this.prisma.enrollment.update({
          where: { id: enrollment.id },
          data: { status: originalStatus },
        });
        this.logger.log(
          `Enrollment ${enrollment.id} restored to ${originalStatus} after refund ticket ${ticket.id} was cancelled/rejected`,
        );
      }
    }
  }

  async getTicketStats(): Promise<{
    pendingCount: number;
    refundCount: number;
    totalCount: number;
  }> {
    const [pendingCount, refundCount, totalCount] = await Promise.all([
      this.ticketRepository.count({ status: TicketStatus.PENDING }),
      this.ticketRepository.count({
        type: TicketType.REFUND,
        status: TicketStatus.PENDING,
      }),
      this.ticketRepository.count({}),
    ]);

    return {
      pendingCount,
      refundCount,
      totalCount,
    };
  }

  async deleteTicket(
    id: string,
    userId?: string,
    requesterId?: string,
    isAdmin?: boolean,
  ): Promise<void> {
    const ticket = await this.ticketRepository.findById(id);
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (!isAdmin && ticket.userId !== userId) {
      throw new BadRequestException('You are not the owner of this ticket');
    }

    if (ticket.status !== TicketStatus.PENDING) {
      throw new BadRequestException('Only pending tickets can be deleted');
    }

    if (isAdmin) {
      if (ticket.type === TicketType.REFUND) {
        await this.handleRefundCancelled(ticket);
      }
      await this.ticketRepository.delete(id);
    } else {
      await this.ticketRepository.updateStatus(
        id,
        TicketStatus.CANCELLED,
        'Yêu cầu đã bị hủy bởi người dùng.',
        requesterId || userId || ticket.userId,
      );
    }

    await this.audit.log({
      userId: requesterId || userId || ticket.userId,
      action: isAdmin ? 'ticket.delete' : 'ticket.cancel',
      entity: 'Ticket',
      entityId: id,
      description: isAdmin
        ? `Deleted ticket: ${ticket.subject} (Admin force)`
        : `Cancelled ticket: ${ticket.subject}`,
      metadata: { subject: ticket.subject, type: ticket.type, isAdmin },
    });
  }
}
