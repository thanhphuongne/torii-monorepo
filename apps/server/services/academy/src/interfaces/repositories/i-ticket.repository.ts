import { Ticket, TicketQueryDTO, CreateTicketDTO } from '@workspace/schemas';

export interface ITicketRepository {
  /**
   * Create data.
   */
  create(data: CreateTicketDTO & { userId: string }): Promise<Ticket>;
  /**
   * Find by id.
   */
  findById(id: string): Promise<Ticket | null>;
  /**
   * Find all.
   */
  findAll(query: TicketQueryDTO): Promise<{ data: any[]; total: number }>;
  /**
   * Update status.
   */
  updateStatus(
    id: string,
    status: string,
    response?: string,
    handlerId?: string,
    refundAmount?: number,
  ): Promise<Ticket>;
  /**
   * Count data.
   */
  count(where: any): Promise<number>;
  /**
   * Delete data.
   */
  delete(id: string): Promise<void>;
}
