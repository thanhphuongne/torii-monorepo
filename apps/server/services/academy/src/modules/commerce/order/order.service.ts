import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '@server/shared/prisma/prisma.service';
import { OrderStatus, PaymentMethod, PaymentGateway } from '@prisma/generated';
import { CouponService } from '../coupon.service';
import { PayOSService } from '../payos.service';
import { EnrollmentService } from '../../classroom/enrollment/enrollment.service';
import { AuditLoggerService } from '../../audit-logger.service';
import { OrderCheckoutDto, OrderPreviewDto } from './dto/order.dto';
import { Prisma } from '@prisma/generated';
import { AppConfigService } from '@server/shared';
import { AiSubscriptionService } from '../quota/ai-subscription.service';
import * as ExcelJS from 'exceljs';
import type { ClientProxy } from '@nestjs/microservices/client';


@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly couponService: CouponService,
    private readonly payOS: PayOSService,
    private readonly enrollmentService: EnrollmentService,
    private readonly appConfig: AppConfigService,
    private readonly audit: AuditLoggerService,
    private readonly aiSubscriptionService: AiSubscriptionService,
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) { }

  private extractOrderTargets(order: any) {
    const vodPackageIds = new Set<string>();
    const liveClassIds = new Set<string>();
    const cohortIds = new Set<string>();

    for (const item of order.items ?? []) {
      if (item.vodPackageId) vodPackageIds.add(item.vodPackageId);
      if (item.liveClassId) liveClassIds.add(item.liveClassId);
      if (item.cohortId) cohortIds.add(item.cohortId);

      const snapshot = (item.deliverySnapshot ?? {}) as {
        selectedLiveClassId?: string;
      };
      if (snapshot.selectedLiveClassId) {
        liveClassIds.add(snapshot.selectedLiveClassId);
      }
    }

    return { vodPackageIds, liveClassIds, cohortIds };
  }

  private async assertOrderStillPayable(order: any) {
    const targetUserId = await this.resolveTargetUserId(order.userId, {
      isGift: order.metadata?.isGift === true,
      recipientEmail:
        typeof order.metadata?.recipientEmail === 'string'
          ? order.metadata.recipientEmail
          : undefined,
    });

    for (const item of order.items ?? []) {
      if (item.vodPackageId) {
        const existing = await this.prisma.enrollment.findFirst({
          where: {
            userId: targetUserId,
            vodPackageId: item.vodPackageId,
            status: { in: ['ACTIVE', 'COMPLETED'] },
          },
          select: { id: true },
        });
        if (existing) {
          throw new BadRequestException(
            'Đơn hàng không còn hợp lệ: Người học đã sở hữu khóa học này',
          );
        }
      }

      const snapshot = (item.deliverySnapshot ?? {}) as {
        selectedLiveClassId?: string;
      };
      const targetLiveClassId = item.liveClassId ?? snapshot.selectedLiveClassId;
      if (targetLiveClassId) {
        const existing = await this.prisma.enrollment.findFirst({
          where: {
            userId: targetUserId,
            liveClassId: targetLiveClassId,
            status: { in: ['ACTIVE', 'COMPLETED'] },
          },
          select: { id: true },
        });
        if (existing) {
          throw new BadRequestException(
            'Đơn hàng không còn hợp lệ: Người học đã đăng ký lớp học này',
          );
        }
      }
    }

    if (order.couponCode && order.couponId) {
      await this.couponService.validateCoupon(
        order.couponCode,
        order.userId,
        Number(order.subTotal ?? 0),
      );
    }
  }

  private async cancelConflictingPendingOrders(order: any) {
    const targets = this.extractOrderTargets(order);
    if (
      targets.vodPackageIds.size === 0 &&
      targets.liveClassIds.size === 0 &&
      targets.cohortIds.size === 0
    ) {
      return 0;
    }

    const candidates = await this.prisma.order.findMany({
      where: {
        userId: order.userId,
        status: OrderStatus.PENDING,
        id: { not: order.id },
      },
      include: { items: true },
    });

    const conflictingOrderIds = candidates
      .filter((candidate) => {
        const t = this.extractOrderTargets(candidate);
        return (
          [...t.vodPackageIds].some((id) => targets.vodPackageIds.has(id)) ||
          [...t.liveClassIds].some((id) => targets.liveClassIds.has(id)) ||
          [...t.cohortIds].some((id) => targets.cohortIds.has(id))
        );
      })
      .map((o) => o.id);

    if (!conflictingOrderIds.length) return 0;

    await this.prisma.order.updateMany({
      where: { id: { in: conflictingOrderIds }, status: OrderStatus.PENDING },
      data: { status: OrderStatus.CANCELLED },
    });

    return conflictingOrderIds.length;
  }

  async preview(userId: string, input: OrderPreviewDto) {
    const vodPackageIds = Array.from(new Set(input.vodPackageIds ?? []));
    const cohortIds = Array.from(new Set(input.cohortIds ?? []));
    const liveClassIds = Array.from(new Set(input.liveClassIds ?? []));
    const subscriptionPlanIds = Array.from(
      new Set(input.subscriptionPlanIds ?? []),
    );
    const isGift = input.isGift === true;
    const recipientEmail = input.recipientEmail;
    const now = new Date();

    if (isGift) {
      if (!recipientEmail || typeof recipientEmail !== 'string') {
        throw new BadRequestException('Vui lòng nhập email người nhận');
      }

      // 1. Kiểm tra bao quát: Người nhận phải là tài khoản có thực trên hệ thống Torii
      try {
        const response = await firstValueFrom<{ user: { id: string } }>(
          this.natsClient.send(
            { cmd: 'identity.users.findByEmail' },
            { email: recipientEmail.toLowerCase() },
          ),
        );
        if (!response?.user?.id) {
          throw new BadRequestException(
            'Email người nhận chưa đăng ký trong hệ thống',
          );
        }
      } catch (err: any) {
        throw new BadRequestException(
          'Email người nhận chưa đăng ký trong hệ thống',
        );
      }
    }

    if (
      !vodPackageIds.length &&
      !cohortIds.length &&
      !liveClassIds.length &&
      !subscriptionPlanIds.length
    ) {
      throw new BadRequestException('At least one product must be provided');
    }

    const vodPackages = vodPackageIds.length
      ? await this.prisma.vodPackage.findMany({
        where: { id: { in: vodPackageIds }, status: 'PUBLISHED' },
        include: { courseProfile: true },
      })
      : [];
    if (vodPackages.length !== vodPackageIds.length)
      throw new BadRequestException('Some VOD Packages are not available');

    const cohorts = cohortIds.length
      ? await this.prisma.cohort.findMany({
        where: { id: { in: cohortIds }, status: 'OPENING' },
        include: { courseProfile: true },
      })
      : [];
    if (cohorts.length !== cohortIds.length)
      throw new BadRequestException('Some Cohorts are not available');

    const liveClasses = liveClassIds.length
      ? await this.prisma.liveClass.findMany({
        where: { id: { in: liveClassIds }, status: 'OPENING' },
        include: {
          cohort: { include: { courseProfile: true } },
          _count: { select: { enrollments: { where: { status: 'ACTIVE' } } } }
        },
      })
      : [];
    if (liveClasses.length !== liveClassIds.length)
      throw new BadRequestException('Một số lớp học không khả dụng (hoặc đã đóng)');

    for (const vod of vodPackages) {
      // If gift, skip own check for buyer (they can buy multiple times to gift)
      if (isGift) {
        if (recipientEmail) {
          const res = await this.enrollmentService.checkGiftRecipient(recipientEmail, vod.id);
          if (res.isEnrolled) throw new BadRequestException(`Người nhận đã sở hữu gói VOD ${vod.title}`);
        }
        continue;
      }

      const existing = await this.prisma.enrollment.findFirst({
        where: {
          userId,
          status: { in: ['ACTIVE', 'COMPLETED'] },
          vodPackageId: vod.id,
        },
      });
      if (existing) throw new BadRequestException('Bạn đã sở hữu gói VOD này');
    }

    // Direct LiveClass validation
    for (const lc of liveClasses) {
      const cohort = lc.cohort;
      // 1. Check parent cohort dates
      if (
        !cohort.enrollmentOpenAt ||
        !cohort.enrollmentCloseAt ||
        new Date(cohort.enrollmentOpenAt) > now ||
        new Date(cohort.enrollmentCloseAt) < now
      ) {
        throw new BadRequestException(
          `Lớp học ${lc.name} hiện không trong thời gian đăng ký.`,
        );
      }

      // 2. Check if user already enrolled in this cohort (any class)
      if (isGift) {
        if (recipientEmail) {
          const res = await this.enrollmentService.checkGiftRecipient(recipientEmail, cohort.id);
          if (res.isEnrolled) throw new BadRequestException(`Người nhận đã đăng ký khóa học ${cohort.name}`);
        }
      } else {
        const existing = await this.prisma.enrollment.findFirst({
          where: {
            userId,
            status: { in: ['ACTIVE', 'COMPLETED'] },
            liveClass: { cohortId: cohort.id },
          },
        });
        if (existing)
          throw new BadRequestException(
            `Bạn đã đăng ký một lớp trong đợt học ${cohort.name} rồi`,
          );
      }

      // 3. Check capacity
      if (lc.maxStudents && lc._count.enrollments >= lc.maxStudents) {
        throw new BadRequestException(`Lớp học ${lc.name} đã đủ học viên.`);
      }
    }

    const cohortToLiveClass = new Map<string, any>();
    for (const cohort of cohorts) {
      if (
        !cohort.enrollmentOpenAt ||
        !cohort.enrollmentCloseAt ||
        new Date(cohort.enrollmentOpenAt) > now ||
        new Date(cohort.enrollmentCloseAt) < now
      ) {
        throw new BadRequestException(
          'Đợt học hiện không trong thời gian đăng ký.',
        );
      }

      if (isGift) {
        if (recipientEmail) {
          const res = await this.enrollmentService.checkGiftRecipient(recipientEmail, cohort.id);
          if (res.isEnrolled) throw new BadRequestException(`Người nhận đã đăng ký đợt học ${cohort.name}`);
        }
      } else {
        const existing = await this.prisma.enrollment.findFirst({
          where: {
            userId,
            status: { in: ['ACTIVE', 'COMPLETED'] },
            liveClass: { cohortId: cohort.id },
          },
        });
        if (existing)
          throw new BadRequestException(
            `Bạn đã đăng ký đợt học ${cohort.name} rồi`,
          );
      }

      const selectedLiveClassId = input.liveClassIdByCohort?.[cohort.id];
      if (!selectedLiveClassId)
        throw new BadRequestException('Vui lòng chọn lớp Live');

      const liveClass = await this.prisma.liveClass.findUnique({
        where: { id: selectedLiveClassId },
      });
      if (!liveClass || liveClass.cohortId !== cohort.id)
        throw new BadRequestException('Lớp Live không hợp lệ.');

      if (liveClass.maxStudents) {
        const count = await this.prisma.enrollment.count({
          where: { liveClassId: liveClass.id, status: 'ACTIVE' },
        });
        if (count >= liveClass.maxStudents)
          throw new BadRequestException('Lớp đã đủ học viên.');
      }
      cohortToLiveClass.set(cohort.id, liveClass);
    }

    const subscriptionPlans = subscriptionPlanIds.length
      ? await this.prisma.aiSubscriptionPlan.findMany({
        where: { id: { in: subscriptionPlanIds }, isActive: true },
      })
      : [];
    if (subscriptionPlans.length !== subscriptionPlanIds.length)
      throw new BadRequestException(
        'Some subscription plans are not available',
      );

    const subTotal =
      vodPackages.reduce(
        (sum, v) => sum + Number(v.discountPrice ?? v.price),
        0,
      ) +
      cohorts.reduce((sum, c) => {
        const lc = cohortToLiveClass.get(c.id);
        const p = Number(lc?.discountPrice ?? lc?.price ?? 0);
        return sum + p;
      }, 0) +
      liveClasses
        .filter((lc) => !cohortIds.includes(lc.cohortId))
        .reduce(
          (sum, lc) => {
            const p = Number(lc.discountPrice ?? lc.price ?? 0);
            return sum + p;
          },
          0,
        ) +
      subscriptionPlans.reduce((sum, s) => sum + Number(s.price), 0);

    let discountTotal = 0;
    let couponId: string | undefined;

    if (input.couponCode) {
      const coupon = await this.couponService.validateCoupon(
        input.couponCode,
        userId,
        subTotal,
      );
      discountTotal = await this.couponService.calculateDiscount(
        coupon.id,
        subTotal,
      );
      couponId = coupon.id;
    }

    const grandTotalBeforeWallet = Math.max(0, subTotal - discountTotal);
    let walletDiscount = 0;
    let prorationDiscount = 0;

    // --- AI Subscription Proration & Upgrade-only Logic ---
    if (subscriptionPlans.length > 0) {
      const activeSub = await this.aiSubscriptionService.getActiveSubscription(userId);
      if (activeSub) {
        const newPlan = subscriptionPlans[0]; // Currently supporting one subscription per order

        const currentPrice = Number(activeSub.plan.price);
        const newPrice = Number(newPlan.price);

        if (newPrice < currentPrice) {
          throw new BadRequestException(
            `Bạn đang sử dụng gói cao hơn (${activeSub.plan.name}). Không thể hạ cấp cho đến khi gói cũ hết hạn.`,
          );
        }
        if (newPlan.id === activeSub.planId) {
          throw new BadRequestException(
            `Bạn đang sử dụng gói ${activeSub.plan.name}. Vui lòng đợi cho đến khi gói cũ hết hạn để mua tiếp.`,
          );
        }

        // Logic: Nâng cấp (Upgrade)
        const now = new Date();
        const expiresAt = new Date(activeSub.expiresAt);
        const startedAt = new Date(activeSub.startedAt);

        const totalDuration = expiresAt.getTime() - startedAt.getTime();
        const remainingDuration = expiresAt.getTime() - now.getTime();

        if (remainingDuration > 0 && totalDuration > 0) {
          const ratio = remainingDuration / totalDuration;
          prorationDiscount = Math.floor(ratio * currentPrice);
          // Apply as discount
          discountTotal += prorationDiscount;
        }
      }
    }

    const finalGrandTotalBeforeWallet = Math.max(0, subTotal - discountTotal);

    if (input.useWalletBalance && (subscriptionPlans.length > 0 || vodPackages.length > 0 || cohorts.length > 0 || liveClasses.length > 0)) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { walletBalance: true },
      });
      const balance = Number(user?.walletBalance || 0);
      walletDiscount = Math.min(balance, finalGrandTotalBeforeWallet);
    }

    const grandTotal = finalGrandTotalBeforeWallet - walletDiscount;

    return {
      subTotal,
      discountTotal,
      walletDiscount,
      prorationDiscount, // Return this for UI feedback
      grandTotal,
      vodPackages,
      cohorts,
      liveClasses,
      subscriptionPlans,
      couponId,
      cohortToLiveClass,
      inputLiveClassMap: input.liveClassIdByCohort,
    };
  }

  async checkout(userId: string, input: OrderCheckoutDto) {
    this.logger.log('Academy Checkout User');
    const preview = await this.preview(userId, input);

    const orderCode = this.generateOrderCode();
    const orderItemsData = [
      ...preview.vodPackages.map((v: any) => ({
        vodPackageId: v.id,
        price: v.discountPrice ?? v.price,
        deliverySnapshot: {
          title: v.title,
          code: v.code,
          mode: 'VOD',
          basePrice: v.price,
          isDiscounted: !!v.discountPrice,
        } as any,
      })),
      ...preview.cohorts.map((c: any) => {
        const lc = preview.cohortToLiveClass.get(c.id);
        return {
          cohortId: c.id,
          price: lc?.discountPrice ?? lc?.price ?? 0,
          deliverySnapshot: {
            title: c.name,
            code: c.code,
            mode: 'LIVE',
            selectedLiveClassId: lc?.id,
            basePrice: lc?.price ?? 0,
            isDiscounted: !!lc?.discountPrice,
          } as any,
        };
      }),
      ...preview.liveClasses
        .filter((lc: any) => !(input.cohortIds ?? []).includes(lc.cohortId))
        .map((lc: any) => ({
          liveClassId: lc.id,
          price: lc.discountPrice ?? lc.price ?? 0,
          deliverySnapshot: {
            title: lc.name,
            code: lc.code,
            mode: 'LIVE',
            selectedLiveClassId: lc.id,
            basePrice: lc.price ?? 0,
            isDiscounted: !!lc.discountPrice,
            courseProfileId: lc.cohort?.courseProfileId,
          } as any,
        })),
      ...preview.subscriptionPlans.map((s: any) => ({
        subscriptionPlanId: s.id,
        price: s.price,
        deliverySnapshot: {
          title: s.name,
          code: s.code,
          isSubscription: true,
          basePrice: s.price,
        } as any,
      })),
    ];

    const order = await this.prisma.$transaction(async (tx) => {
      // 1. Atomic Wallet Deduction
      if (preview.walletDiscount > 0) {
        const updatedUser = await tx.user.updateMany({
          where: { id: userId, walletBalance: { gte: preview.walletDiscount } },
          data: { walletBalance: { decrement: preview.walletDiscount } },
        });

        if (updatedUser.count === 0) {
          throw new BadRequestException('Số dư ví không đủ hoặc đã thay đổi. Vui lòng thử lại.');
        }

        await tx.walletTransaction.create({
          data: {
            userId,
            amount: preview.walletDiscount,
            type: 'PURCHASE',
            description: `Sử dụng xu cho đơn hàng ${orderCode} (Mua Subscription AI)`,
          },
        });
      }

      // 2. Create Order
      const finalGrandTotal = preview.grandTotal;
      const isPartiallyPaid = preview.walletDiscount > 0;
      const isFullyPaid = finalGrandTotal === 0;

      const orderData: any = {
        code: orderCode,
        userId,
        status: isFullyPaid ? OrderStatus.PAID : OrderStatus.PENDING,
        paidAt: isFullyPaid ? new Date() : undefined,
        subTotal: new Prisma.Decimal(preview.subTotal),
        discountTotal: new Prisma.Decimal(preview.discountTotal),
        grandTotal: new Prisma.Decimal(finalGrandTotal),
        currency: 'VND',
        couponCode: input.couponCode,
        couponId: preview.couponId,
        paymentMethod: isFullyPaid ? PaymentMethod.COIN : input.paymentMethod,
        metadata: {
          isGift: input.isGift === true,
          recipientEmail: input.recipientEmail,
          giftMessage: input.giftMessage,
          walletDiscount: preview.walletDiscount,
          isPartiallyPaid,
        },
        items: { create: orderItemsData },
      };

      return tx.order.create({
        data: orderData,
        include: { items: true },
      });
    });

    if (order.status === OrderStatus.PAID) {
      // Fulfillment for fully paid order
      for (const item of order.items) {
        if (item.subscriptionPlanId) {
          await this.fulfillAiSubscription(this.prisma, userId, item);
        }
      }
      this.natsClient.emit('order.paid', { orderId: order.id });
    }

    await this.audit.log({
      userId,
      action: 'order.create',
      entity: 'Order',
      entityId: order.id,
      description: 'User created order',
      metadata: { orderCode: order.code, grandTotal: preview.grandTotal, walletDiscount: preview.walletDiscount },
    });

    return this.handlePaymentRedirect(order, preview, input);
  }

  public generateOrderCode() {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    return 'ORD-' + dateStr + '-' + randomStr;
  }

  public async handlePaymentRedirect(order: any, preview: any, input: any) {
    console.log(`[DEBUG OrderService.handlePaymentRedirect]`, {
      orderCode: order.code,
      receivedMethod: input.paymentMethod,
      expectedPayOS: PaymentMethod.PAYOS,
      matches: input.paymentMethod === PaymentMethod.PAYOS,
      grandTotal: preview.grandTotal,
    });
    if (input.paymentMethod === PaymentMethod.PAYOS) {
      const cancelledCount = await this.cancelConflictingPendingOrders(order);
      if (cancelledCount > 0) {
        this.logger.warn(
          `Cancelled ${cancelledCount} conflicting pending order(s) for user ${order.userId} before PAYOS redirect`,
        );
      }

      // Generate unique integer max 9007199254740991 (Number.MAX_SAFE_INTEGER)
      // Date.now() returns 13 digits. Math.random * 1000 returns 3 digits.
      const numericOrderCode = Number(
        String(Date.now()) + String(Math.floor(Math.random() * 1000)).padStart(3, '0')
      );
      await this.prisma.order.update({
        where: { id: order.id },
        data: { metadata: { ...order.metadata, numericOrderCode } },
      });

      const paymentLink = await this.payOS.createPaymentLink({
        orderCode: numericOrderCode,
        amount: Number(preview.grandTotal),
        description: `Thanh toan ${order.code.substring(4)}`, // Format: "Thanh toan 20260405-XXXX" (max 24 chars)
        cancelUrl: `${this.appConfig.identity.webLearnerUrl}/payment/cancel?orderCode=${order.code}`,
        returnUrl: `${this.appConfig.identity.webLearnerUrl}/payment/success?orderCode=${order.code}`,
      });

      return {
        id: order.id,
        orderCode: order.code,
        paymentUrl: paymentLink.checkoutUrl,
      };
    }

    if (input.paymentMethod === PaymentMethod.COIN) {
      return this.processCoinPayment(order.userId, order);
    }

    return {
      orderId: order.id,
      orderCode: order.code,
      message: 'Order created. Please proceed with manual payment.',
    };
  }

  private async processCoinPayment(userId: string, order: any) {
    const currentOrder = await this.prisma.order.findUnique({
      where: { id: order.id },
      select: { status: true },
    });
    if (currentOrder?.status === OrderStatus.PAID)
      return {
        orderId: order.id,
        orderCode: order.code,
        message: 'Đơn hàng đã được thanh toán từ trước',
        success: true,
      };

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, walletBalance: true },
    });

    if (!user) throw new NotFoundException('Người dùng không tồn tại');

    const total = Number(order.grandTotal);

    try {
      await this.assertOrderStillPayable(order);

      await this.prisma.$transaction(async (tx) => {
        // 1. Deduct balance safely (Atomic check)
        const updatedUser = await tx.user.updateMany({
          where: { id: userId, walletBalance: { gte: order.grandTotal } },
          data: {
            walletBalance: { decrement: order.grandTotal },
          },
        });

        if (updatedUser.count === 0) {
          throw new BadRequestException(
            'Số dư xu không đủ để thực hiện thanh toán này',
          );
        }

        // 2. Log Wallet Transaction
        await tx.walletTransaction.create({
          data: {
            userId,
            amount: order.grandTotal,
            type: 'PURCHASE',
            referenceId: order.id,
            description: `Thanh toán đơn hàng ${order.code} bằng Xu`,
          },
        });

        // 3. Mark Order as PAID
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.PAID,
            paidAt: new Date(),
          },
        });

        if (order.couponId) {
          await this.couponService.recordUsage(
            tx,
            order.couponId,
            order.userId,
            order.id,
          );
        }

        // 4. Record internal transaction record for bookkeeping
        await tx.transaction.create({
          data: {
            orderId: order.id,
            gateway: PaymentGateway.INTERNAL,
            amount: order.grandTotal,
            status: 'SUCCESS',
            transactionCode: order.code,
            responsePayload: { method: 'COIN' } as any,
          },
        });

        // 5. Fulfillment: ONLY AI Subscriptions (Courses are handled by OrderListener)
        const targetUserId = await this.resolveTargetUserId(
          order.userId,
          {
            isGift: order.metadata?.isGift === true,
            recipientEmail:
              typeof order.metadata?.recipientEmail === 'string'
                ? order.metadata.recipientEmail
                : undefined,
          },
        );
        for (const item of order.items) {
          if (item.subscriptionPlanId) {
            await this.fulfillAiSubscription(tx, targetUserId, item);
          }
        }
      });

      this.logger.log(`Order ${order.code} paid with coins successfully`);

      // Emit order.paid event for external fulfillment (e.g., Course Enrollments)
      this.natsClient.emit('order.paid', { orderId: order.id });

      return {
        orderId: order.id,
        orderCode: order.code,
        message: 'Thanh toán bằng xu thành công!',
        success: true,
      };
    } catch (err: any) {
      this.logger.error(
        `Coin payment failed for order ${order.code}: ${err.message}`,
      );
      throw new BadRequestException(`Thanh toán thất bại: ${err.message}`);
    }
  }
  async handlePaymentSuccess(
    orderCode: string,
    transactionId?: string,
    payload?: any,
  ) {
    if (payload && this.payOS) {
      if (!this.payOS.verifyPaymentWebhookData(payload))
        throw new BadRequestException('Invalid webhook signature');
      if (payload.success !== true && payload.code !== '00')
        throw new BadRequestException('Payment not successful');
    }

    if (transactionId) {
      const existingTransaction = await this.prisma.transaction.findFirst({
        where: {
          gateway: PaymentGateway.PAYOS,
          transactionCode: transactionId,
          status: 'SUCCESS',
        },
        select: { id: true },
      });
      if (existingTransaction) return { ok: true, idempotent: true };
    }

    let order = await this.prisma.order.findUnique({
      where: { code: orderCode },
      include: { items: true },
    });
    if (!order) {
      const numericCode = Number(orderCode);
      if (!isNaN(numericCode)) {
        order = await this.prisma.order.findFirst({
          where: {
            metadata: { path: ['numericOrderCode'], equals: numericCode },
          },
          include: { items: true },
        });
      }
      if (!order) throw new NotFoundException('Order not found');
    }

    return this.processPayment(order, transactionId, payload);
  }

  public async processPayment(
    order: any,
    transactionId?: string,
    payload?: any,
  ) {
    this.logger.log(`[TEST BYPASS] processPayment starting for ${order.id} status=${order.status}`);
    if (order.status === OrderStatus.PAID) return { ok: true };

    await this.assertOrderStillPayable(order);

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.PAID, paidAt: new Date() },
      });

      if (order.couponId)
        await this.couponService.recordUsage(
          tx,
          order.couponId,
          order.userId,
          order.id,
        );

      await tx.transaction.create({
        data: {
          orderId: order.id,
          gateway: PaymentGateway.PAYOS,
          transactionCode: transactionId,
          amount: order.grandTotal,
          status: 'SUCCESS',
          responsePayload: payload || {},
        },
      });

      const targetUserId = await this.resolveTargetUserId(
        order.userId,
        {
          isGift: order.metadata?.isGift === true,
          recipientEmail:
            typeof order.metadata?.recipientEmail === 'string'
              ? order.metadata.recipientEmail
              : undefined,
        },
      );
      for (const item of order.items) {
        if (item.subscriptionPlanId)
          await this.fulfillAiSubscription(tx, targetUserId, item);
      }
    });

    this.logger.log('Order fulfilled');
    this.natsClient.emit('order.paid', { orderId: order.id });

    try {
      this.natsClient.emit(
        { cmd: 'send_notification' },
        {
          recipientId: order.userId,
          type: 'system',
          payload: {
            title: 'Thanh toán thành công',
            body: 'Đơn hàng thành công.',
            metadata: { orderId: order.id, amount: order.grandTotal },
          },
        },
      );
    } catch (e: any) {
      this.logger.error(e.message);
    }

    return { ok: true };
  }

  public async fulfillAiSubscription(tx: any, targetUserId: string, item: any) {
    const now = new Date();

    // Find active subscription for stacking logic
    const activeSub = await tx.aiUserSubscription.findFirst({
      where: { userId: targetUserId, status: 'ACTIVE' },
      orderBy: { expiresAt: 'desc' },
    });

    let newExpiresAt = new Date();
    newExpiresAt.setMonth(newExpiresAt.getMonth() + 1);

    // Note: Stacking logic was removed. Existing active subscriptions are cancelled below.
    // New subscription always starts a clean 1-month cycle from 'now'.

    // Cancel old ones (or update them to EXTENDED/EXPIRED)
    await tx.aiUserSubscription.updateMany({
      where: { userId: targetUserId, status: 'ACTIVE' },
      data: { status: 'CANCELLED' },
    });

    // Create new one starting from the right point, or just creating a new one that captures the full period
    await tx.aiUserSubscription.create({
      data: {
        userId: targetUserId,
        planId: item.subscriptionPlanId,
        planCode: item.deliverySnapshot?.code || 'unknown',
        startedAt: now,
        expiresAt: newExpiresAt,
        status: 'ACTIVE',
      },
    });
  }

  public async resolveTargetUserId(
    buyerId: string,
    input: { isGift?: boolean; recipientEmail?: string },
  ): Promise<string> {
    if (input?.isGift && input?.recipientEmail) {
      const recipientEmail = input.recipientEmail.toLowerCase();
      try {
        const response = await firstValueFrom<{ user: { id: string } }>(
          this.natsClient.send(
            { cmd: 'identity.users.findByEmail' },
            { email: recipientEmail },
          ),
        );
        if (response?.user?.id) return response.user.id;
        throw new BadRequestException(
          `Không tìm thấy người nhận với email ${recipientEmail}`,
        );
      } catch (err: any) {
        this.logger.error(`Failed to resolve gift recipient: ${err.message}`);
        throw new BadRequestException(
          err.message || 'Lỗi khi xác định người nhận quà',
        );
      }
    }
    return buyerId;
  }

  // --- Admin CRUD ---
  async admin_findAll(query: any) {
    const where: any = {};
    if (query.userId) where.userId = query.userId;
    if (query.status) where.status = query.status;
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate)
        where.createdAt.gte = new Date(query.startDate + 'T00:00:00.000Z');
      if (query.endDate)
        where.createdAt.lte = new Date(query.endDate + 'T23:59:59.999Z');
    }
    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { user: { email: { contains: query.search, mode: 'insensitive' } } },
        {
          user: { displayName: { contains: query.search, mode: 'insensitive' } },
        },
      ];
    }

    const limit = Math.max(1, Number(query.limit || 20));
    const skip = query.page ? (Math.max(1, Number(query.page)) - 1) * limit : 0;

    const [total, items] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        include: {
          user: { select: { email: true, displayName: true } },
          items: {
            include: { vodPackage: true, cohort: true, liveClass: true, subscriptionPlan: true },
          },
          transactions: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
    ]);
    return {
      data: items,
      total,
      limit,
      page: Math.floor(skip / limit) + 1,
      totalPages: Math.ceil(total / limit),
    };
  }

  async admin_getStats(query: any) {
    const where: any = {};
    if (query.status) where.status = query.status;
    const [totalOrders, rev] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.aggregate({
        where: { ...where, status: OrderStatus.PAID },
        _sum: { grandTotal: true },
      }),
    ]);
    return { totalOrders, totalRevenue: Number(rev._sum.grandTotal || 0) };
  }

  async admin_findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { email: true, displayName: true } },
        items: {
          include: { vodPackage: true, cohort: true, liveClass: true, subscriptionPlan: true },
        },
        transactions: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async admin_updateStatus(
    id: string,
    status: OrderStatus,
    requesterId = 'SYSTEM',
  ) {
    return this.prisma.order.update({ where: { id }, data: { status } });
  }

  async admin_getTransactions(orderId: string) {
    return this.prisma.transaction.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createDepositRequest(userId: string, targetAmount: number) {
    throw new BadRequestException('Not supported');
  }

  async processWalletPayment(userId: string, orderCode: string) {
    throw new BadRequestException('Not supported');
  }

  async getByCodeForUser(userId: string, code: string) {
    let order = await this.prisma.order.findFirst({
      where: { code, userId },
      include: {
        items: {
          include: { vodPackage: true, cohort: true, liveClass: true, subscriptionPlan: true },
        },
        enrollments: { select: { liveClassId: true, vodPackageId: true } },
      },
    });
    if (!order) {
      const numericCode = Number(code);
      if (!isNaN(numericCode)) {
        order = await this.prisma.order.findFirst({
          where: {
            userId,
            metadata: { path: ['numericOrderCode'], equals: numericCode },
          } as any,
          include: {
            items: {
              include: {
                vodPackage: true,
                cohort: true,
                liveClass: true,
                subscriptionPlan: true,
              },
            },
            enrollments: { select: { liveClassId: true, vodPackageId: true } },
          },
        });
      }
    }
    if (!order || order.userId !== userId)
      throw new NotFoundException('Order not found');

    const itemResults = order.items.map((item) => {
      const snapshot = (item.deliverySnapshot ?? {}) as {
        selectedLiveClassId?: string;
        mode?: string;
      };
      const selectedLc = snapshot.selectedLiveClassId;
      const expectedLiveClassIds =
        snapshot.mode === 'LIVE' && selectedLc ? [selectedLc] : [];
      const enrolledLiveClassIds = order.enrollments
        .filter(
          (e) => e.liveClassId && expectedLiveClassIds.includes(e.liveClassId),
        )
        .map((e) => e.liveClassId!);
      const missingLiveClassIds = expectedLiveClassIds.filter(
        (id) => !enrolledLiveClassIds.includes(id),
      );
      const productName =
        item.vodPackage?.title ??
        item.cohort?.name ??
        item.subscriptionPlan?.name ??
        (snapshot as any).title ??
        '—';
      const productCode =
        item.vodPackage?.code ??
        item.cohort?.code ??
        item.subscriptionPlan?.code ??
        '—';
      const productId =
        item.vodPackageId ??
        item.cohortId ??
        item.subscriptionPlanId ??
        item.id;

      return {
        productId,
        productCode,
        productName,
        expectedLiveClassIds,
        enrolledLiveClassIds,
        missingLiveClassIds,
      };
    });

    return {
      id: order.id,
      code: order.code,
      status: order.status,
      paidAt: order.paidAt,
      grandTotal: order.grandTotal,
      currency: order.currency,
      items: itemResults,
    };
  }

  async findAllForUser(userId: string, query: any) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: { vodPackage: true, cohort: true, subscriptionPlan: true },
        },
      },
    });
  }

  async admin_cancel(id: string, requesterId?: string) {
    return this.prisma.order.update({
      where: { id },
      data: { status: 'CANCELLED' as any },
    });
  }

  async findOneForUser(userId: string, id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order || order.userId !== userId)
      throw new NotFoundException('Order not found');
    return order;
  }

  async repayOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: { vodPackage: true, cohort: true, subscriptionPlan: true },
        },
      },
    });

    if (!order || order.userId !== userId) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        'Đơn hàng không ở trạng thái chờ thanh toán',
      );
    }

    const now = new Date();
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
    if (order.createdAt < fifteenMinutesAgo) {
      // Auto cancel if user tries to repay an old order
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELLED },
      });
      throw new BadRequestException('Đơn hàng đã quá hạn thanh toán (15 phút)');
    }

    await this.assertOrderStillPayable(order);

    // Re-construct preview data for handlePaymentRedirect
    const preview = {
      grandTotal: Number(order.grandTotal),
      vodPackages: order.items
        .filter((i) => i.vodPackage)
        .map((i) => i.vodPackage),
      cohorts: order.items.filter((i) => i.cohort).map((i) => i.cohort),
      subscriptionPlans: order.items
        .filter((i) => i.subscriptionPlan)
        .map((i) => i.subscriptionPlan),
    };

    const input = {
      paymentMethod: order.paymentMethod,
    };

    return this.handlePaymentRedirect(order, preview, input);
  }

  async handleOrderAutoCancellation() {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    const ordersToCancel = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING,
        createdAt: { lt: fifteenMinutesAgo },
      },
      select: { id: true, code: true, userId: true, metadata: true },
    });

    if (ordersToCancel.length > 0) {
      this.logger.log(
        `Auto-cancelling ${ordersToCancel.length} expired orders`,
      );

      await this.prisma.$transaction(async (tx) => {
        await tx.order.updateMany({
          where: { id: { in: ordersToCancel.map((o) => o.id) } },
          data: { status: OrderStatus.CANCELLED },
        });

        // Refund wallet coins for orders that had partial coin payment
        for (const order of ordersToCancel) {
          const meta = order.metadata as any;
          const walletDiscount = Number(meta?.walletDiscount ?? 0);
          if (walletDiscount > 0) {
            await tx.user.update({
              where: { id: order.userId },
              data: { walletBalance: { increment: walletDiscount } },
            });
            await tx.walletTransaction.create({
              data: {
                userId: order.userId,
                amount: walletDiscount,
                type: 'REFUND',
                description: `Hoàn xu do đơn hàng ${order.code} hết hạn thanh toán`,
              },
            });
            this.logger.log(
              `Refunded ${walletDiscount} coins to user ${order.userId} for cancelled order ${order.code}`,
            );
          }
        }
      });

      for (const order of ordersToCancel) {
        await this.audit.log({
          userId: 'SYSTEM',
          action: 'order.auto_cancel',
          entity: 'Order',
          entityId: order.id,
          description: `Hệ thống tự động hủy đơn hàng ${order.code} do quá hạn 15 phút`,
        });
      }
    }
    return ordersToCancel.length;
  }

  async admin_findOrdersByCohort(cohortId: string, query: any) {
    const where: any = {
      items: { some: { cohortId } },
    };
    if (query?.status) where.status = query.status;
    if (query?.userId) where.userId = query.userId;
    if (query?.startDate || query?.endDate) {
      where.createdAt = {};
      if (query.startDate)
        where.createdAt.gte = new Date(query.startDate + 'T00:00:00.000Z');
      if (query.endDate)
        where.createdAt.lte = new Date(query.endDate + 'T23:59:59.999Z');
    }
    if (query?.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { user: { email: { contains: query.search, mode: 'insensitive' } } },
        {
          user: { displayName: { contains: query.search, mode: 'insensitive' } },
        },
      ];
    }

    const limit = Math.max(1, Number(query?.limit || 20));
    const skip = query?.page ? (Math.max(1, Number(query.page)) - 1) * limit : 0;

    const [total, items] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        include: {
          user: { select: { email: true, displayName: true } },
          items: {
            include: {
              vodPackage: true,
              cohort: true,
              liveClass: true,
              subscriptionPlan: true,
            },
          },
          transactions: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
    ]);

    return {
      data: items,
      total,
      limit,
      page: Math.floor(skip / limit) + 1,
      totalPages: Math.ceil(total / limit),
    };
  }

  async admin_getStatsByCohort(cohortId: string) {
    const [totalOrders, rev] = await Promise.all([
      this.prisma.order.count({
        where: { items: { some: { cohortId } } },
      }),
      this.prisma.order.aggregate({
        where: { status: OrderStatus.PAID, items: { some: { cohortId } } },
        _sum: { grandTotal: true },
      }),
    ]);
    return { totalOrders, totalRevenue: Number(rev._sum.grandTotal || 0) };
  }

  async admin_findOrdersByVodPackage(vodPackageId: string, query: any) {
    const where: any = {
      items: { some: { vodPackageId } },
    };
    if (query?.status) where.status = query.status;
    if (query?.userId) where.userId = query.userId;
    if (query?.startDate || query?.endDate) {
      where.createdAt = {};
      if (query.startDate)
        where.createdAt.gte = new Date(query.startDate + 'T00:00:00.000Z');
      if (query.endDate)
        where.createdAt.lte = new Date(query.endDate + 'T23:59:59.999Z');
    }
    if (query?.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { user: { email: { contains: query.search, mode: 'insensitive' } } },
        {
          user: { displayName: { contains: query.search, mode: 'insensitive' } },
        },
      ];
    }

    const limit = Math.max(1, Number(query?.limit || 20));
    const skip = query?.page ? (Math.max(1, Number(query.page)) - 1) * limit : 0;

    const [total, items] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        include: {
          user: { select: { email: true, displayName: true } },
          items: {
            include: {
              vodPackage: true,
              cohort: true,
              liveClass: true,
              subscriptionPlan: true,
            },
          },
          transactions: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
    ]);

    return {
      data: items,
      total,
      limit,
      page: Math.floor(skip / limit) + 1,
      totalPages: Math.ceil(total / limit),
    };
  }

  async admin_getStatsByVodPackage(vodPackageId: string) {
    const [totalOrders, rev] = await Promise.all([
      this.prisma.order.count({
        where: { items: { some: { vodPackageId } } },
      }),
      this.prisma.order.aggregate({
        where: { status: OrderStatus.PAID, items: { some: { vodPackageId } } },
        _sum: { grandTotal: true },
      }),
    ]);
    return { totalOrders, totalRevenue: Number(rev._sum.grandTotal || 0) };
  }

  async admin_exportOrders(query: any) {
    const where: any = {};
    if (query.userId) where.userId = query.userId;
    if (query.status && query.status !== 'all') where.status = query.status;

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate)
        where.createdAt.gte = new Date(query.startDate + 'T00:00:00.000Z');
      if (query.endDate)
        where.createdAt.lte = new Date(query.endDate + 'T23:59:59.999Z');
    }

    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { user: { email: { contains: query.search, mode: 'insensitive' } } },
        {
          user: { displayName: { contains: query.search, mode: 'insensitive' } },
        },
      ];
    }

    const items = await this.prisma.order.findMany({
      where,
      include: {
        user: { select: { email: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Orders');

    worksheet.columns = [
      { header: 'Mã đơn hàng', key: 'code', width: 25 },
      { header: 'Khách hàng', key: 'user', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Ngày tạo', key: 'createdAt', width: 20 },
      { header: 'Trạng thái', key: 'status', width: 15 },
      { header: 'Tổng tiền', key: 'grandTotal', width: 15 },
      { header: 'Phương thức', key: 'paymentMethod', width: 15 },
    ];

    items.forEach((order) => {
      worksheet.addRow({
        code: order.code,
        user: order.user?.displayName || 'N/A',
        email: order.user?.email || 'N/A',
        createdAt: order.createdAt.toLocaleString('vi-VN'),
        status: order.status,
        grandTotal: Number(order.grandTotal),
        paymentMethod: order.paymentMethod,
      });
    });

    const buffer = await workbook.csv.writeBuffer();
    return buffer;
  }
}

