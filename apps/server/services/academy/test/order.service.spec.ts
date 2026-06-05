import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '@server/shared/prisma/prisma.service';
import { CouponService } from '../src/modules/commerce/coupon.service';
import { PayOSService } from '../src/modules/commerce/payos.service';
import { EnrollmentService } from '../src/modules/classroom/enrollment/enrollment.service';
import { AuditLoggerService } from '../src/modules/audit-logger.service';
import { AppConfigService } from '@server/shared';
import { AiSubscriptionService } from '../src/modules/commerce/quota/ai-subscription.service';
import { OrderService } from '../src/modules/commerce/order/order.service';
import { of, throwError } from 'rxjs';
import { OrderStatus, PaymentMethod, PaymentGateway, Prisma } from '@prisma/generated';

describe('OrderService', () => {
  let service: OrderService;
  let mockPrisma: any;
  let mockCoupon: any;
  let mockPayOS: any;
  let mockEnrollment: any;
  let mockAppConfig: any;
  let mockAudit: any;
  let mockAiSubscription: any;
  let mockNats: any;

  beforeEach(async () => {
    mockPrisma = {
      vodPackage: { findMany: jest.fn() },
      cohort: { findMany: jest.fn() },
      liveClass: { findMany: jest.fn(), findUnique: jest.fn() },
      enrollment: { findFirst: jest.fn(), count: jest.fn() },
      aiSubscriptionPlan: { findMany: jest.fn() },
      order: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn() },
      user: { findUnique: jest.fn(), updateMany: jest.fn() },
      walletTransaction: { create: jest.fn() },
      transaction: { create: jest.fn(), findFirst: jest.fn() },
      aiUserSubscription: { findFirst: jest.fn(), updateMany: jest.fn(), create: jest.fn() },
      $transaction: jest.fn().mockImplementation((cb) => cb(mockPrisma)),
    };

    mockCoupon = {
      validateCoupon: jest.fn(),
      calculateDiscount: jest.fn(),
      recordUsage: jest.fn(),
    };

    mockPayOS = {
      createPaymentLink: jest.fn(),
      verifyPaymentWebhookData: jest.fn(),
    };

    mockEnrollment = {
      checkGiftRecipient: jest.fn(),
    };

    mockAppConfig = {
      identity: { webLearnerUrl: 'http://localhost' },
    };

    mockAudit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    mockAiSubscription = {};

    mockNats = {
      send: jest.fn(),
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CouponService, useValue: mockCoupon },
        { provide: PayOSService, useValue: mockPayOS },
        { provide: EnrollmentService, useValue: mockEnrollment },
        { provide: AppConfigService, useValue: mockAppConfig },
        { provide: AuditLoggerService, useValue: mockAudit },
        { provide: AiSubscriptionService, useValue: mockAiSubscription },
        { provide: 'NATS_SERVICE', useValue: mockNats },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('preview', () => {
    it('should throw BadRequest if no products provided', async () => {
      await expect(service.preview('u1', {})).rejects.toThrow('At least one product must be provided');
    });

    it('should throw if recipient not registered for gifts', async () => {
      mockNats.send.mockReturnValue(of({ user: null }));
      await expect(service.preview('u1', { isGift: true, recipientEmail: 'new@test.com', vodPackageIds: ['v1'] }))
        .rejects.toThrow('Email người nhận chưa đăng ký');
    });

    it('should validate capacity for live classes', async () => {
      mockPrisma.liveClass.findMany.mockResolvedValue([{
        id: 'lc1', status: 'OPENING', maxStudents: 10, _count: { enrollments: 10 }, name: 'Class 1',
        cohort: { enrollmentOpenAt: new Date(Date.now() - 1000), enrollmentCloseAt: new Date(Date.now() + 1000) }
      }]);
      await expect(service.preview('u1', { liveClassIds: ['lc1'] })).rejects.toThrow('đã đủ học viên');
    });

    it('should check buyer enrollment status', async () => {
      mockPrisma.vodPackage.findMany.mockResolvedValue([{ id: 'v1', status: 'PUBLISHED', price: 100 }]);
      mockPrisma.enrollment.findFirst.mockResolvedValue({ id: 'en1' });
      await expect(service.preview('u1', { vodPackageIds: ['v1'] })).rejects.toThrow('Bạn đã sở hữu gói VOD này');
    });

    it('should calculate grandTotal with valid coupon', async () => {
      mockPrisma.vodPackage.findMany.mockResolvedValue([{ id: 'v1', status: 'PUBLISHED', price: 100, discountPrice: 80 }]);
      mockPrisma.enrollment.findFirst.mockResolvedValue(null);
      mockCoupon.validateCoupon.mockResolvedValue({ id: 'c1' });
      mockCoupon.calculateDiscount.mockResolvedValue(10);

      const result = await service.preview('u1', { vodPackageIds: ['v1'], couponCode: 'SAVE10' });

      expect(result.subTotal).toBe(80);
      expect(result.discountTotal).toBe(10);
      expect(result.grandTotal).toBe(70);
      expect(result.couponId).toBe('c1');
    });
  });

  describe('checkout', () => {
    it('should create order and redirect to PayOS', async () => {
      const previewResult = {
        subTotal: 100, discountTotal: 0, grandTotal: 100,
        vodPackages: [{ id: 'v1', title: 'V', price: 100 }],
        cohorts: [], liveClasses: [], subscriptionPlans: [],
        couponId: null, cohortToLiveClass: new Map()
      };
      jest.spyOn(service, 'preview').mockResolvedValue(previewResult as any);
      mockPrisma.order.create.mockResolvedValue({ id: 'o1', code: 'ORD-1', metadata: {} });
      mockPayOS.createPaymentLink.mockResolvedValue({ checkoutUrl: 'http://pay.os/123' });

      const result = await service.checkout('u1', { vodPackageIds: ['v1'], paymentMethod: PaymentMethod.PAYOS });

      expect(mockPrisma.order.create).toHaveBeenCalled();
      expect(mockAudit.log).toHaveBeenCalled();
      expect((result as any).paymentUrl).toBe('http://pay.os/123');
    });
  });

  describe('processCoinPayment', () => {
    it('should throw if insufficient balance', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ status: 'PENDING' });
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', walletBalance: 50 });
      mockPrisma.user.updateMany.mockResolvedValue({ count: 0 }); // updateMany returns count of updated rows

      const order = { id: 'o1', grandTotal: 100, userId: 'u1' };
      await expect((service as any).processCoinPayment('u1', order)).rejects.toThrow('Số dư xu không đủ');
    });

    it('should fulfillment AI subscription on successful coin payment', async () => {
      const order = {
        id: 'o1', grandTotal: 50, userId: 'u1', code: 'ORD-1',
        items: [{ subscriptionPlanId: 'sp1', offeringSnapshot: { code: 'AI_GOLD' } }],
        metadata: { isGift: false }
      };
      mockPrisma.order.findUnique.mockResolvedValue({ status: 'PENDING' });
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', walletBalance: 1000 });
      mockPrisma.user.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.aiUserSubscription.findFirst.mockResolvedValue(null);

      await (service as any).processCoinPayment('u1', order);

      expect(mockPrisma.aiUserSubscription.create).toHaveBeenCalled();
      expect(mockNats.emit).toHaveBeenCalledWith('order.paid', { orderId: 'o1' });
    });
  });

  describe('handlePaymentSuccess', () => {
    it('should ensure idempotency if transaction exists', async () => {
      mockPrisma.transaction.findFirst.mockResolvedValue({ id: 't1' });
      const result = await service.handlePaymentSuccess('ORD-1', 'trans-1');
      expect(result).toEqual({ ok: true, idempotent: true });
      expect(mockPrisma.order.findUnique).not.toHaveBeenCalled();
    });

    it('should update order to PAID and fulfill subscription', async () => {
      const order = { id: 'o1', code: 'ORD-1', status: 'PENDING', userId: 'u1', grandTotal: 100, items: [] };
      mockPrisma.transaction.findFirst.mockResolvedValue(null);
      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockPayOS.verifyPaymentWebhookData.mockReturnValue(true);

      const result = await service.handlePaymentSuccess('ORD-1', 'trans-1', { success: true, code: '00' });

      expect(result).toEqual({ ok: true });
      expect(mockPrisma.order.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: 'PAID' })
      }));
    });
  });

  describe('fulfillAiSubscription', () => {
    it('should stack expiration date if active subscription exists', async () => {
      const now = new Date();
      const future = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000); // 10 days in future
      mockPrisma.aiUserSubscription.findFirst.mockResolvedValue({ expiresAt: future });

      await (service as any).fulfillAiSubscription(mockPrisma, 'u1', { subscriptionPlanId: 'p1' });

      // Check create call
      const createCall = mockPrisma.aiUserSubscription.create.mock.calls[0][0];
      const expectedExpires = new Date(future);
      expectedExpires.setMonth(expectedExpires.getMonth() + 1);

      expect(createCall.data.expiresAt.getTime()).toBeCloseTo(expectedExpires.getTime(), -3); // Within 1s
    });
  });
});
