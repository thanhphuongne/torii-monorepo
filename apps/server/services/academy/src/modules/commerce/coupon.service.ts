import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@server/shared/prisma/prisma.service';
import { AuditLoggerService } from '../audit-logger.service';
import {
  CouponStatus,
  CouponDiscountType,
} from '@prisma/generated';

/** Coupon tạo khi học viên đổi điểm lấy quà — chỉ hiển thị ở web-learner, không quản trị ở admin list */
const COUPON_SOURCE_GAMIFICATION_REWARD = 'GAMIFICATION_REWARD';

@Injectable()
export class CouponService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLoggerService,
  ) { }

  private normalizeDiscountType(
    value: unknown,
  ): CouponDiscountType | undefined {
    if (value === undefined || value === null) return undefined;
    if (value === CouponDiscountType.PERCENTAGE || value === 'percentage')
      return CouponDiscountType.PERCENTAGE;
    if (value === CouponDiscountType.FIXED_AMOUNT || value === 'fixed_amount')
      return CouponDiscountType.FIXED_AMOUNT;
    throw new BadRequestException('Invalid discountType');
  }

  /** Coupon cá nhân (đổi điểm / owner) — không nằm trong danh sách quản trị hệ thống */
  private isRewardOrPersonalCoupon(c: {
    ownerId: string | null;
    source: string | null;
  }): boolean {
    if (c.ownerId != null) return true;
    if (c.source === COUPON_SOURCE_GAMIFICATION_REWARD) return true;
    return false;
  }

  private normalizeStatus(value: unknown): CouponStatus | undefined {
    if (value === undefined || value === null) return undefined;
    if (value === CouponStatus.ACTIVE || value === 'active')
      return CouponStatus.ACTIVE;
    if (
      value === CouponStatus.INACTIVE ||
      value === 'inactive' ||
      value === 'expired'
    )
      return CouponStatus.INACTIVE;
    throw new BadRequestException('Invalid status');
  }

  private assertDiscountValueValid(
    discountType: CouponDiscountType,
    discountValue: number,
  ) {
    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      throw new BadRequestException('Invalid discountValue');
    }
    if (
      discountType === CouponDiscountType.PERCENTAGE &&
      discountValue > 100
    ) {
      throw new BadRequestException(
        'Phần trăm giảm không được vượt quá 100%',
      );
    }
  }

  async findByCode(code: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }

  /**
   * Kiểm tra mã giảm giá (thời hạn, owner, min order, limit…).
   * Không lọc theo từng dòng giỏ — ghi danh theo LiveClass / VodPackage sau khi thanh toán.
   */
  async validateCoupon(code: string, userId: string, orderValue: number) {
    const coupon = await this.findByCode(code);

    if (coupon.ownerId != null && coupon.ownerId !== userId) {
      throw new BadRequestException(
        'Mã giảm giá này không áp dụng cho tài khoản của bạn',
      );
    }

    if (coupon.status !== CouponStatus.ACTIVE) {
      throw new BadRequestException('Coupon is not active');
    }

    const now = new Date();
    if (coupon.startDate && coupon.startDate > now) {
      throw new BadRequestException('Coupon is not yet valid');
    }
    if (coupon.endDate && coupon.endDate < now) {
      throw new BadRequestException('Coupon has expired');
    }

    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit reached');
    }

    if (
      coupon.minOrderValue !== null &&
      orderValue < Number(coupon.minOrderValue)
    ) {
      throw new BadRequestException(
        `Minimum order value of ${coupon.minOrderValue} required`,
      );
    }

    // Check per-user limit
    const userUsageCount = await this.prisma.couponUsage.count({
      where: { couponId: coupon.id, userId },
    });
    if (userUsageCount >= coupon.perUserLimit) {
      throw new BadRequestException(
        'You have reached the usage limit for this coupon',
      );
    }

    return coupon;
  }

  async getMyCoupons(userId: string) {
    // 1) Personal coupons explicitly assigned to this user (e.g. redeemed from gamification rewards)
    const ownedCouponsPromise = this.prisma.coupon.findMany(
      // Cast to any to avoid tight coupling to generated Prisma types during schema evolution.
      {
        where: {
          ownerId: userId,
        },
        orderBy: { createdAt: 'desc' },
      } as any,
    );

    // 2) Coupon đã từng dùng trong đơn (lịch sử)
    const usagesPromise = this.prisma.couponUsage.findMany({
      where: { userId },
      include: { coupon: true },
      orderBy: { usedAt: 'desc' },
    });

    const [ownedCoupons, usages] = await Promise.all([
      ownedCouponsPromise,
      usagesPromise,
    ]);

    const seen = new Set<string>();
    const result: any[] = [];

    // Add owned coupons first so they always appear even if never used.
    for (const coupon of ownedCoupons) {
      if (seen.has(coupon.id)) continue;
      seen.add(coupon.id);
      result.push(coupon);
    }

    // Then merge in coupons that have been used by the user.
    for (const usage of usages) {
      if (!usage.coupon || seen.has(usage.couponId)) continue;
      seen.add(usage.couponId);
      result.push({
        ...usage.coupon,
        lastUsedAt: usage.usedAt,
      });
    }

    return result;
  }

  async calculateDiscount(couponId: string, orderValue: number) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id: couponId },
    });
    if (!coupon) return 0;

    let discount = 0;
    if (coupon.discountType === CouponDiscountType.PERCENTAGE) {
      discount = orderValue * (Number(coupon.discountValue) / 100);
      if (
        coupon.maxDiscountAmount !== null &&
        discount > Number(coupon.maxDiscountAmount)
      ) {
        discount = Number(coupon.maxDiscountAmount);
      }
    } else {
      discount = Number(coupon.discountValue);
    }

    return Math.min(discount, orderValue);
  }

  async recordUsage(
    tx: any,
    couponId: string,
    userId: string,
    orderId: string,
  ) {
    const coupon = await tx.coupon.update({
      where: { id: couponId },
      data: { usageCount: { increment: 1 } },
    });

    // Automatically deactivate if limit reached
    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
      await tx.coupon.update({
        where: { id: couponId },
        data: { status: CouponStatus.INACTIVE },
      });
    }

    await tx.couponUsage.create({
      data: {
        couponId,
        userId,
        orderId,
      },
    });
  }

  // --- Admin CRUD (chỉ coupon hệ thống: không có owner đổi điểm, không source gamification) ---

  async admin_findAll() {
    return this.prisma.coupon.findMany({
      where: {
        ownerId: null,
        OR: [
          { source: null },
          { source: { not: COUPON_SOURCE_GAMIFICATION_REWARD } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async admin_findOne(id: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
    });
    if (!coupon) throw new NotFoundException('Coupon not found');
    if (this.isRewardOrPersonalCoupon(coupon))
      throw new NotFoundException('Coupon not found');
    return coupon;
  }

  async admin_create(data: any, requesterId = 'SYSTEM') {
    const cleaned = { ...(data ?? {}) };
    const { discountType, status, ...rest } = cleaned;

    const normalizedDiscountType = this.normalizeDiscountType(discountType);
    const normalizedDiscountValue = Number(rest.discountValue);
    if (!normalizedDiscountType) {
      throw new BadRequestException('Invalid discountType');
    }
    this.assertDiscountValueValid(
      normalizedDiscountType,
      normalizedDiscountValue,
    );

    const coupon = await this.prisma.coupon.create({
      data: {
        ...rest,
        ownerId: null,
        code: String(cleaned.code).toUpperCase(),
        discountType: normalizedDiscountType,
        discountValue: normalizedDiscountValue,
        status: this.normalizeStatus(status),
        source: (cleaned as { source?: string }).source ?? 'MANUAL',
      },
    });

    await this.audit.log({
      userId: requesterId,
      action: 'coupon.create',
      entity: 'Coupon',
      entityId: coupon.id,
      description: `Created coupon: ${coupon.code} (${coupon.discountType} - ${coupon.discountValue})`,
      newValues: {
        code: coupon.code,
        discountType: coupon.discountType,
        status: coupon.status,
      },
    });

    return coupon;
  }

  async admin_update(id: string, data: any, requesterId = 'SYSTEM') {
    const old = await this.admin_findOne(id);
    const cleaned = { ...(data ?? {}) };
    const { discountType, status, ...rest } = cleaned;

    const normalizedDiscountType =
      this.normalizeDiscountType(discountType) ?? old.discountType;
    const normalizedDiscountValue =
      rest.discountValue !== undefined
        ? Number(rest.discountValue)
        : Number(old.discountValue);
    this.assertDiscountValueValid(
      normalizedDiscountType,
      normalizedDiscountValue,
    );

    const updated = await this.prisma.coupon.update({
      where: { id },
      data: {
        ...rest,
        code:
          cleaned.code !== undefined && cleaned.code !== null
            ? String(cleaned.code).toUpperCase()
            : undefined,
        discountType: this.normalizeDiscountType(discountType),
        discountValue:
          rest.discountValue !== undefined
            ? normalizedDiscountValue
            : undefined,
        status: this.normalizeStatus(status),
      },
    });

    await this.audit.log({
      userId: requesterId,
      action: 'coupon.update',
      entity: 'Coupon',
      entityId: id,
      description: `Updated coupon: ${old.code}`,
      oldValues: { status: old.status, discountValue: old.discountValue },
      newValues: {
        status: updated.status,
        discountValue: updated.discountValue,
      },
    });

    return updated;
  }

  async admin_delete(id: string, requesterId = 'SYSTEM') {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
      include: {
        _count: {
          select: { usages: true },
        },
      },
    });
    if (!coupon) throw new NotFoundException('Coupon not found');
    if (this.isRewardOrPersonalCoupon(coupon))
      throw new NotFoundException('Coupon not found');

    const orderCount = await this.prisma.order.count({
      where: { couponId: id },
    });
    const hasBeenUsed = coupon._count.usages > 0 || orderCount > 0;

    if (hasBeenUsed) {
      const updated = await this.prisma.coupon.update({
        where: { id },
        data: { status: CouponStatus.INACTIVE },
      });
      await this.audit.log({
        userId: requesterId,
        action: 'coupon.deactivate',
        entity: 'Coupon',
        entityId: id,
        description: `Deactivated coupon: ${coupon.code} (preserved for order history)`,
        metadata: { code: coupon.code },
      });
      return updated;
    }

    await this.prisma.coupon.delete({ where: { id } });
    await this.audit.log({
      userId: requesterId,
      action: 'coupon.delete',
      entity: 'Coupon',
      entityId: id,
      description: `Deleted coupon: ${coupon.code}`,
      metadata: { code: coupon.code },
    });
    return { ok: true };
  }
}
