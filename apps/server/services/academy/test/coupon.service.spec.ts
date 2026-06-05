import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@server/shared/prisma/prisma.service';
import { AuditLoggerService } from '../src/modules/audit-logger.service';
import { CouponService } from '../src/modules/commerce/coupon.service';
import { CouponStatus, CouponDiscountType, CouponScope } from '@prisma/generated';

describe('CouponService', () => {
  let service: CouponService;
  let mockPrisma: any;
  let mockAudit: any;

  beforeEach(async () => {
    mockPrisma = {
      coupon: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      couponUsage: {
        count: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
      order: {
        count: jest.fn(),
      },
    };

    mockAudit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: AuditLoggerService,
          useValue: mockAudit,
        },
      ],
    }).compile();

    service = module.get<CouponService>(CouponService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateCoupon', () => {
    it('should throw NotFound if coupon does not exist', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue(null);
      await expect(service.validateCoupon('INVALID', 'u1', 100, [])).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequest if coupon belongs to another user', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({ id: 'c1', code: 'MYCODE', ownerId: 'other' });
      await expect(service.validateCoupon('MYCODE', 'u1', 100, [])).rejects.toThrow('không áp dụng cho tài khoản của bạn');
    });

    it('should throw BadRequest if coupon is inactive', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({ id: 'c1', code: 'OFF', status: CouponStatus.INACTIVE });
      await expect(service.validateCoupon('OFF', 'u1', 100, [])).rejects.toThrow('Coupon is not active');
    });

    it('should throw BadRequest if coupon has expired', async () => {
      const past = new Date(Date.now() - 100000);
      mockPrisma.coupon.findUnique.mockResolvedValue({ id: 'c1', code: 'OLD', status: CouponStatus.ACTIVE, endDate: past });
      await expect(service.validateCoupon('OLD', 'u1', 100, [])).rejects.toThrow('Coupon has expired');
    });

    it('should throw BadRequest if usage limit reached', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({ id: 'c1', status: CouponStatus.ACTIVE, usageLimit: 10, usageCount: 10 });
      await expect(service.validateCoupon('CODE', 'u1', 100, [])).rejects.toThrow('usage limit reached');
    });

    it('should throw if minOrderValue not met', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({ id: 'c1', status: CouponStatus.ACTIVE, minOrderValue: 500, perUserLimit: 1 });
      await expect(service.validateCoupon('CODE', 'u1', 100, [])).rejects.toThrow('Minimum order value');
    });

    it('should throw if perUserLimit reached', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({ id: 'c1', status: CouponStatus.ACTIVE, perUserLimit: 1 });
      mockPrisma.couponUsage.count.mockResolvedValue(1);
      await expect(service.validateCoupon('CODE', 'u1', 100, [])).rejects.toThrow('reached the usage limit for this coupon');
    });

    it('should throw if scope mismatch for SPECIFIC_OFFERING', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({
        id: 'c1', status: CouponStatus.ACTIVE, perUserLimit: 5,
        scope: CouponScope.SPECIFIC_OFFERING,
        metadata: { applicableTargetIds: ['prod-1'] }
      });
      mockPrisma.couponUsage.count.mockResolvedValue(0);

      await expect(service.validateCoupon('CODE', 'u1', 100, ['prod-2'])).rejects.toThrow('not applicable to the selected products');
    });

    it('should succeed if all checks pass', async () => {
      const coupon = { id: 'c1', status: CouponStatus.ACTIVE, perUserLimit: 5, scope: CouponScope.GLOBAL };
      mockPrisma.coupon.findUnique.mockResolvedValue(coupon);
      mockPrisma.couponUsage.count.mockResolvedValue(0);

      const result = await service.validateCoupon('CODE', 'u1', 100, []);
      expect(result.id).toBe('c1');
    });
  });

  describe('calculateDiscount', () => {
    it('should return fixed amount discount', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({ discountType: CouponDiscountType.FIXED_AMOUNT, discountValue: 50 });
      const result = await service.calculateDiscount('c1', 200);
      expect(result).toBe(50);
    });

    it('should return percentage discount with max limit', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({
        discountType: CouponDiscountType.PERCENTAGE,
        discountValue: 10,
        maxDiscountAmount: 5
      });
      const result = await service.calculateDiscount('c1', 100);
      expect(result).toBe(5); // 10% of 100 is 10, but capped at 5
    });

    it('should not exceed order value', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({ discountType: CouponDiscountType.FIXED_AMOUNT, discountValue: 500 });
      const result = await service.calculateDiscount('c1', 100);
      expect(result).toBe(100);
    });
  });

  describe('getMyCoupons', () => {
    it('should merge owned and used coupons', async () => {
      mockPrisma.coupon.findMany.mockResolvedValue([{ id: 'c1', code: 'OWNED' }]);
      mockPrisma.couponUsage.findMany.mockResolvedValue([
        { couponId: 'c1', coupon: { id: 'c1', code: 'OWNED' } },
        { couponId: 'c2', coupon: { id: 'c2', code: 'USED' } }
      ]);

      const result = await service.getMyCoupons('u1');
      expect(result).toHaveLength(2);
      expect(result[0].code).toBe('OWNED');
      expect(result[1].code).toBe('USED');
    });
  });

  describe('recordUsage', () => {
    it('should increment usage count and deactivate if limit reached', async () => {
      const tx = mockPrisma;
      tx.coupon.update.mockResolvedValue({ id: 'c1', usageLimit: 5, usageCount: 5, status: CouponStatus.ACTIVE });

      await service.recordUsage(tx, 'c1', 'u1', 'o1');

      expect(tx.coupon.update).toHaveBeenCalledWith(expect.objectContaining({
        data: { usageCount: { increment: 1 } }
      }));
      expect(tx.coupon.update).toHaveBeenCalledWith(expect.objectContaining({
        data: { status: CouponStatus.INACTIVE }
      }));
      expect(tx.couponUsage.create).toHaveBeenCalled();
    });
  });

  describe('admin_create', () => {
    it('should throw if percentage > 100', async () => {
      const data = { code: 'BIG', discountType: 'percentage', discountValue: 105 };
      await expect(service.admin_create(data)).rejects.toThrow('vượt quá 100%');
    });

    it('should normalize and create coupon', async () => {
      const data = { code: 'test', discountType: 'fixed_amount', discountValue: 50, status: 'active' };
      mockPrisma.coupon.create.mockResolvedValue({ id: 'c1', ...data, code: 'TEST' });

      const result = await service.admin_create(data);
      expect(result.code).toBe('TEST');
      expect(mockAudit.log).toHaveBeenCalled();
    });
  });
});
