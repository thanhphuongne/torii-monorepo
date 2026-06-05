import { z } from 'zod';
import { couponSchema, CouponStatus, CouponDiscountType } from '../models/coupon.model';

const couponCreateDTOBaseSchema = z.object({
  code: z.string().min(1).max(50).regex(/^[A-Z0-9_-]+$/, 'Code must contain only uppercase letters, numbers, hyphens, and underscores'),
  name: z.string().min(1).max(200),
  description: z.string().optional().nullable(),

  // Discount Configuration
  discountType: z.nativeEnum(CouponDiscountType),
  discountValue: z.number().positive(),
  maxDiscountAmount: z.number().positive().optional().nullable(),

  // Conditions
  minOrderValue: z.number().nonnegative().optional().nullable(),

  // Validity Period
  startDate: z.date().or(z.string().datetime()),
  endDate: z.date().or(z.string().datetime()),

  // Usage Limits
  usageLimit: z.number().int().positive().optional().nullable(),
  perUserLimit: z.number().int().positive().default(1),

  // Status
  status: z.nativeEnum(CouponStatus).default(CouponStatus.ACTIVE),
});

const couponDiscountValidation = (data: { discountType?: CouponDiscountType; discountValue?: number }, ctx: z.RefinementCtx) => {
  if (
    data.discountType === CouponDiscountType.PERCENTAGE &&
    typeof data.discountValue === 'number' &&
    data.discountValue > 100
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['discountValue'],
      message: 'Phần trăm giảm không được vượt quá 100%',
    });
  }
};

/**
 * Coupon Create DTO Schema
 */
export const couponCreateDTOSchema = couponCreateDTOBaseSchema.superRefine(couponDiscountValidation);

export type CouponCreateDTO = z.infer<typeof couponCreateDTOSchema>;

/**
 * Coupon Update DTO Schema
 */
export const couponUpdateDTOSchema = couponCreateDTOBaseSchema.partial().extend({
  code: z.string().min(1).max(50).regex(/^[A-Z0-9_-]+$/, 'Code must contain only uppercase letters, numbers, hyphens, and underscores').optional(),
}).superRefine(couponDiscountValidation);

export type CouponUpdateDTO = z.infer<typeof couponUpdateDTOSchema>;

/**
 * Coupon Response DTO Schema
 */
export const couponResponseDTOSchema = couponSchema;

export type CouponResponseDTO = z.infer<typeof couponResponseDTOSchema>;

/**
 * Client chỉ gửi `code` + `orderValue`; `userId` luôn lấy từ JWT ở gateway.
 */
export const couponValidateRequestDTOSchema = z.object({
  code: z.string().min(1),
  orderValue: z.number().nonnegative(),
});

export type CouponValidateRequestDTO = z.infer<typeof couponValidateRequestDTOSchema>;

/**
 * Coupon Validate Response DTO
 */
export const couponValidateResponseDTOSchema = z.object({
  isValid: z.boolean(),
  coupon: couponResponseDTOSchema.optional().nullable(),
  discountAmount: z.number().nonnegative().optional().nullable(),
  message: z.string().optional().nullable(),
});

export type CouponValidateResponseDTO = z.infer<typeof couponValidateResponseDTOSchema>;

/**
 * Coupon Calculate Discount Request DTO
 */
export const couponCalculateDiscountRequestDTOSchema = z.object({
  couponId: z.string().uuid(),
  basePrice: z.number().nonnegative(),
  /** LiveClass hoặc VodPackage — dùng khi tính giảm theo delivery (tùy backend). */
  deliveryTargetId: z.string().uuid().optional(),
});

export type CouponCalculateDiscountRequestDTO = z.infer<typeof couponCalculateDiscountRequestDTOSchema>;

/**
 * Coupon Calculate Discount Response DTO
 */
export const couponCalculateDiscountResponseDTOSchema = z.object({
  discountAmount: z.number().nonnegative(),
  finalPrice: z.number().nonnegative(),
  isValid: z.boolean(),
  message: z.string().optional().nullable(),
});

export type CouponCalculateDiscountResponseDTO = z.infer<typeof couponCalculateDiscountResponseDTOSchema>;

/**
 * Coupon Statistics DTO
 */
export const couponStatisticsDTOSchema = z.object({
  totalCoupons: z.number().int().nonnegative(),
  activeCoupons: z.number().int().nonnegative(),
  expiredCoupons: z.number().int().nonnegative(),
  totalUsage: z.number().int().nonnegative(),
  totalDiscountGiven: z.number().nonnegative(),
});

export type CouponStatisticsDTO = z.infer<typeof couponStatisticsDTOSchema>;

/**
 * Coupon Search Request DTO
 */
export const couponSearchRequestDTOSchema = z.object({
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().optional().default(10),
  search: z.string().optional(),
  status: z.nativeEnum(CouponStatus).optional(),
});

export type CouponSearchRequestDTO = z.infer<typeof couponSearchRequestDTOSchema>;
