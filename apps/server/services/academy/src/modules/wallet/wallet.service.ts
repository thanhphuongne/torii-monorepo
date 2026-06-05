import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@server/shared';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getBalance(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { walletBalance: true },
    });
    return user?.walletBalance || 0;
  }

  async getTransactions(
    userId: string,
    query: { page?: number; limit?: number },
  ) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 10);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.walletTransaction.count({ where: { userId } }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
