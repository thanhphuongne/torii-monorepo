import { Injectable } from '@nestjs/common';
import { PrismaService } from '@server/shared';
import {
  Ticket,
  TicketQueryDTO,
  CreateTicketDTO,
  TicketStatus,
} from '@workspace/schemas';
import { ITicketRepository } from '@server/academy/interfaces/repositories';

@Injectable()
export class TicketRepository implements ITicketRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateTicketDTO & { userId: string }): Promise<Ticket> {
    return this.prisma.ticket.create({
      data: {
        userId: data.userId,
        type: data.type as any,
        subject: data.subject,
        description: data.description,
        liveClassId: data.liveClassId || null,
        orderId: data.orderId || null,
        metadata: data.metadata || {},
        status: TicketStatus.PENDING as any,
      },
    }) as any;
  }

  async findById(id: string): Promise<Ticket | null> {
    return this.prisma.ticket.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
            avatarUrl: true,
          },
        },
        handler: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    }) as any;
  }

  async findAll(
    query: TicketQueryDTO,
  ): Promise<{ data: any[]; total: number }> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const { type, status, userId, liveClassId, orderId, search } =
      query as TicketQueryDTO & { search?: string };
    const skip = (page - 1) * limit;

    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (userId) where.userId = userId;
    if (liveClassId) where.liveClassId = liveClassId;
    if (orderId) where.orderId = orderId;
    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return { data, total };
  }

  async updateStatus(
    id: string,
    status: string,
    response?: string,
    handlerId?: string,
    refundAmount?: number,
  ): Promise<Ticket> {
    return this.prisma.ticket.update({
      where: { id },
      data: {
        status: status as any,
        response,
        handlerId,
        refundAmount,
      },
    }) as any;
  }

  async count(where: any): Promise<number> {
    return this.prisma.ticket.count({ where });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.ticket.delete({ where: { id } });
  }
}
