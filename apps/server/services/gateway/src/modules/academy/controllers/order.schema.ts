import { z } from 'zod';

/**
 * LIVE: `cohortIds` = đợt/kỳ (Cohort), mỗi cohort có nhiều LiveClass; map chọn lớp cụ thể.
 * VOD: chỉ `vodPackageIds`. Không lẫn cohort với vod.
 */
/** cohortId (Cohort) -> liveClassId (LiveClass) */
const liveClassIdByCohortSchema = z
  .record(z.string().uuid(), z.string().uuid())
  .optional();

export const orderCheckoutSchema = z.object({
  vodPackageIds: z.array(z.string().uuid()).optional(),
  cohortIds: z.array(z.string().uuid()).optional(),
  liveClassIds: z.array(z.string().uuid()).optional(),
  liveClassIdByCohort: liveClassIdByCohortSchema,
  // AI subscription plans
  subscriptionPlanIds: z.array(z.string().uuid()).optional(),
  couponCode: z.string().optional(),
  description: z.string().optional(),
  // Gift fields (explicit, validated)
  isGift: z
    .preprocess(
      (v) => (typeof v === 'string' ? v.toLowerCase() === 'true' : v),
      z.boolean(),
    )
    .optional(),
  recipientEmail: z.string().email().optional(),
  giftMessage: z.string().max(500).optional(),
  paymentMethod: z.preprocess(
    (value) => (typeof value === 'string' ? value.toUpperCase() : value),
    z.enum(['PAYOS', 'BANK_TRANSFER', 'MANUAL', 'COIN']),
  ),
  paymentGateway: z.preprocess(
    (value) => (typeof value === 'string' ? value.toUpperCase() : value),
    z.enum(['PAYOS', 'MOMO', 'STRIPE', 'INTERNAL']).optional(),
  ),
  useWalletBalance: z.boolean().optional(),
});

export const orderPreviewSchema = z.object({
  // New flow
  vodPackageIds: z.array(z.string().uuid()).optional(),
  cohortIds: z.array(z.string().uuid()).optional(),
  liveClassIds: z.array(z.string().uuid()).optional(),
  liveClassIdByCohort: liveClassIdByCohortSchema,
  subscriptionPlanIds: z.array(z.string().uuid()).optional(),
  couponCode: z.string().optional(),
  // Gift fields (explicit, validated)
  isGift: z
    .preprocess(
      (v) => (typeof v === 'string' ? v.toLowerCase() === 'true' : v),
      z.boolean(),
    )
    .optional(),
  recipientEmail: z.string().email().optional(),
  giftMessage: z.string().max(500).optional(),
  description: z.string().optional(),
  useWalletBalance: z.boolean().optional(),
});
