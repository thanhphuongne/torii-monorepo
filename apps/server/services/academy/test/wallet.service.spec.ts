import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from '../src/modules/wallet/wallet.service';
import { PrismaService } from '@server/shared';

describe('WalletService', () => {
  let service: WalletService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
      },
      walletTransaction: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getBalance', () => {
    it('should return user wallet balance', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ walletBalance: 5000 });
      const balance = await service.getBalance('u1');
      expect(balance).toBe(5000);
    });

    it('should return 0 if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const balance = await service.getBalance('u1');
      expect(balance).toBe(0);
    });
  });

  describe('getTransactions', () => {
    it('should return paginated transactions', async () => {
      const mockTx = [{ id: 't1', amount: 100 }];
      mockPrisma.walletTransaction.findMany.mockResolvedValue(mockTx);
      mockPrisma.walletTransaction.count.mockResolvedValue(1);

      const result = await service.getTransactions('u1', { page: 1, limit: 10 });

      expect(result.data).toEqual(mockTx);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(mockPrisma.walletTransaction.findMany).toHaveBeenCalledWith(expect.objectContaining({
        skip: 0,
        take: 10
      }));
    });

    it('should handle custom pagination', async () => {
        mockPrisma.walletTransaction.findMany.mockResolvedValue([]);
        mockPrisma.walletTransaction.count.mockResolvedValue(25);
  
        const result = await service.getTransactions('u1', { page: 3, limit: 5 });
  
        expect(result.page).toBe(3);
        expect(result.limit).toBe(5);
        expect(result.totalPages).toBe(5);
        expect(mockPrisma.walletTransaction.findMany).toHaveBeenCalledWith(expect.objectContaining({
          skip: 10,
          take: 5
        }));
      });
  });
});
