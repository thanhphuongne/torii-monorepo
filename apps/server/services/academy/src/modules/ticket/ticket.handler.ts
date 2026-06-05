import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TICKET_SERVICE_TOKEN } from '@server/academy/interfaces/services';
import { ITicketService } from '@server/academy/interfaces/services';
import {
  CreateTicketDTO,
  TicketQueryDTO,
  UpdateTicketStatusDTO,
  TicketStatus,
  TicketType,
  RefundQueryDTO,
  UpdateRefundStatusDTO,
  RefundStatus,
} from '@workspace/schemas';

@Controller()
export class TicketHandler {
  constructor(
    @Inject(TICKET_SERVICE_TOKEN)
    private readonly ticketService: ITicketService,
  ) {}

  @MessagePattern({ cmd: 'academy.ticket.create' })
  async createTicket(
    @Payload()
    payload: {
      userId: string;
      dto: CreateTicketDTO;
      requesterId?: string;
    },
  ) {
    return this.ticketService.createTicket(
      payload.userId,
      payload.dto,
      payload.requesterId,
    );
  }

  @MessagePattern({ cmd: 'academy.ticket.findAll' })
  async getTickets(@Payload() query: TicketQueryDTO) {
    return this.ticketService.getTickets(query);
  }

  @MessagePattern({ cmd: 'academy.ticket.findById' })
  async getTicketById(@Payload() payload: { id: string }) {
    return this.ticketService.getTicketById(payload.id);
  }

  @MessagePattern({ cmd: 'academy.ticket.updateStatus' })
  async updateTicketStatus(
    @Payload()
    payload: {
      id: string;
      handlerId: string;
      dto: UpdateTicketStatusDTO;
      requesterId?: string;
    },
  ) {
    return this.ticketService.updateTicketStatus(
      payload.id,
      payload.handlerId,
      payload.dto,
      payload.requesterId,
    );
  }

  @MessagePattern({ cmd: 'academy.analytics.tickets' })
  async getTicketStats() {
    return this.ticketService.getTicketStats();
  }

  @MessagePattern({ cmd: 'academy.ticket.delete' })
  async deleteTicket(
    @Payload()
    payload: {
      id: string;
      userId?: string;
      requesterId?: string;
      isAdmin?: boolean;
    },
  ) {
    await this.ticketService.deleteTicket(
      payload.id,
      payload.userId,
      payload.requesterId,
      payload.isAdmin,
    );
    return { success: true };
  }

  // --- Specialized Refund Handlers (Mapped to TicketService) ---

  @MessagePattern({ cmd: 'academy.refund.findAll' })
  async getRefunds(@Payload() query: RefundQueryDTO) {
    // Map RefundQueryDTO to TicketQueryDTO
    const ticketQuery: TicketQueryDTO = {
      ...query,
      type: TicketType.REFUND,
      status: this.mapRefundStatusToTicketStatus(query.status),
    };
    return this.ticketService.getTickets(ticketQuery);
  }

  @MessagePattern({ cmd: 'academy.refund.findById' })
  async getRefundById(@Payload() payload: { id: string }) {
    // Just wrap ticket findById
    return this.ticketService.getTicketById(payload.id);
  }

  @MessagePattern({ cmd: 'academy.refund.updateStatus' })
  async updateRefundStatus(
    @Payload()
    payload: {
      id: string;
      dto: UpdateRefundStatusDTO;
      requesterId: string;
    },
  ) {
    // Map Refund update to Ticket update
    const ticketDto: UpdateTicketStatusDTO = {
      status: this.mapRefundStatusToTicketStatus(
        payload.dto.status,
      ) as TicketStatus,
      response: payload.dto.adminNote || payload.dto.reason || undefined,
      refundAmount: undefined, // Let service auto-calculate or use metadata if needed
    };

    return this.ticketService.updateTicketStatus(
      payload.id,
      payload.requesterId, // HandlerId
      ticketDto,
      payload.requesterId,
    );
  }

  private mapRefundStatusToTicketStatus(
    status?: RefundStatus,
  ): TicketStatus | undefined {
    if (!status) return undefined;
    switch (status) {
      case RefundStatus.PENDING:
        return TicketStatus.PENDING;
      case RefundStatus.COMPLETED:
        return TicketStatus.RESOLVED;
      case RefundStatus.REJECTED:
        return TicketStatus.CANCELLED;
      default:
        return undefined;
    }
  }
}
