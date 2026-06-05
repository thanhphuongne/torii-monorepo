import {
  Ticket,
  TicketQueryDTO,
  CreateTicketDTO,
  UpdateTicketStatusDTO,
  PaginatedResponseDTO,
} from '@workspace/schemas';

export interface ITicketService {
  /**
   * Create ticket.
   */
  createTicket(
    userId: string,
    dto: CreateTicketDTO,
    requesterId?: string,
  ): Promise<Ticket>;
  /**
   * Get ticket by id.
   */
  getTicketById(id: string): Promise<Ticket>;
  /**
   * Get tickets.
   */
  getTickets(query: TicketQueryDTO): Promise<PaginatedResponseDTO<Ticket>>;
  /**
   * Update ticket status.
   */
  updateTicketStatus(
    id: string,
    handlerId: string,
    dto: UpdateTicketStatusDTO,
    requesterId?: string,
  ): Promise<Ticket>;
  /**
   * Get ticket stats.
   */
  getTicketStats(): Promise<{
    pendingCount: number;
    refundCount: number;
    totalCount: number;
  }>;
  /**
   * Delete ticket.
   */
  deleteTicket(
    id: string,
    userId?: string,
    requesterId?: string,
    isAdmin?: boolean,
  ): Promise<void>;
}
