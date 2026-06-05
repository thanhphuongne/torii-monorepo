import { z } from 'zod';

const liveClassBaseSchema = z.object({
  cohortId: z.string().uuid(),
  code: z.string().min(1).max(150),
  name: z.string().min(1).max(255),
  instructorId: z.string().uuid().optional(),
  maxStudents: z.coerce.number().int().min(1, "Ít nhất 1 học viên").max(30, "Số học viên tối đa là 30").optional().nullable(),
  status: z.enum(['DRAFT', 'OPENING', 'COMPLETED', 'CANCELLED', 'ARCHIVED']).optional(),
  price: z.coerce.number().positive("Giá lớp phải lớn hơn 0").optional().nullable(),
  discountPrice: z.coerce.number().min(0).optional().nullable(),
  thumbnailUrl: z.string().url().optional().nullable(),
  schedules: z.array(z.object({
    weekday: z.number().int().min(0).max(6),
    startTime: z.string(),
    endTime: z.string(),
  })).optional(),
});

const validateDiscountPrice = (data: { price?: number | null; discountPrice?: number | null }, ctx: z.RefinementCtx) => {
  if (data.price != null && data.discountPrice != null && data.discountPrice >= data.price) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['discountPrice'],
      message: 'Giá giảm phải nhỏ hơn giá gốc',
    });
  }
};

export const academyLiveClassCreateDTOSchema = liveClassBaseSchema.superRefine(validateDiscountPrice);
export type AcademyLiveClassCreateDTO = z.infer<typeof academyLiveClassCreateDTOSchema>;

export const academyLiveClassUpdateDTOSchema = liveClassBaseSchema.partial().superRefine(validateDiscountPrice);
export type AcademyLiveClassUpdateDTO = z.infer<typeof academyLiveClassUpdateDTOSchema>;

export const academyLiveClassQueryDTOSchema = z.object({
  cohortId: z.string().uuid().optional(),
  instructorId: z.string().uuid().optional(),
  status: z.string().optional(),
  q: z.string().optional(),
  level: z.string().optional(),
  mode: z.string().optional(), // 'LIVE' | 'VOD'
  month: z.string().optional(), // 'yyyy-MM'
  onlyAvailable: z.coerce.boolean().optional(),
  upcomingRegistration: z.coerce.boolean().optional(),
  courseProfileId: z.string().uuid().optional(),
});
export type AcademyLiveClassQueryDTO = z.infer<typeof academyLiveClassQueryDTOSchema>;

export const academyLiveClassDuplicateDTOSchema = z.object({
  code: z.string().max(150).optional(),
  name: z.string().max(255).optional(),
  instructorId: z.string().uuid().optional(),
});
export type AcademyLiveClassDuplicateDTO = z.infer<typeof academyLiveClassDuplicateDTOSchema>;
