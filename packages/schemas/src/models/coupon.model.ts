import { z } from 'zod';

/**
 * Coupon Status Enum
 */
export enum CouponStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  EXPIRED = 'EXPIRED',
}

/**
 * Coupon Discount Type Enum
 */
export enum CouponDiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
}

/**
 * Coupon Schema
 */
export const couponSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  description: z.string().optional().nullable(),

  // Discount Configuration
  discountType: z.nativeEnum(CouponDiscountType),
  discountValue: z.number().positive(),
  maxDiscountAmount: z.number().positive().optional().nullable(),

  // Conditions
  minOrderValue: z.number().nonnegative().optional().nullable(),

  // Validity Period
  startDate: z.date().optional().nullable(),
  endDate: z.date().optional().nullable(),

  // Usage Limits
  usageLimit: z.number().int().positive().optional().nullable(),
  usageCount: z.number().int().nonnegative().default(0),
  perUserLimit: z.number().int().positive().default(1),

  // Status
  status: z.nativeEnum(CouponStatus).default(CouponStatus.ACTIVE),

  // Additional fields
  metadata: z.record(z.any()).optional().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Coupon = z.infer<typeof couponSchema>;

/**
 * Coupon Usage Schema
 */
export const couponUsageSchema = z.object({
  id: z.string().uuid(),
  couponId: z.string().uuid(),
  userId: z.string().uuid(),
  orderId: z.string().uuid().optional().nullable(),
  discountAmount: z.number().nonnegative(),
  usedAt: z.date(),
});

export type CouponUsage = z.infer<typeof couponUsageSchema>;

