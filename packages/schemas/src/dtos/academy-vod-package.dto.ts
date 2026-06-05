import { z } from 'zod';

export const academyVodPackageBaseSchema = z.object({
  courseProfileId: z.string().uuid(),
  code: z.string().min(1).max(150),
  title: z.string().min(1).max(255),
  price: z.coerce.number().min(0),
  discountPrice: z.coerce.number().min(0).optional().nullable(),
  thumbnailUrl: z.string().url().optional().nullable(),
  status: z.enum(['DRAFT', 'PENDING_APPROVAL', 'PUBLISHED', 'ARCHIVED']).optional(),
  rejectionReason: z.string().optional().nullable(),
  instructorId: z.string().uuid("Vui lòng chọn giảng viên phụ trách"),
});

const refineDiscountPrice = (schema: z.ZodType<any, any, any>) => 
  schema.refine(data => {
    if (data.discountPrice != null && data.price != null) {
      return Number(data.discountPrice) < Number(data.price);
    }
    return true;
  }, {
    message: "Giá giảm phải nhỏ hơn giá gốc",
    path: ["discountPrice"],
  });

export const academyVodPackageCreateDTOSchema = refineDiscountPrice(academyVodPackageBaseSchema);
export type AcademyVodPackageCreateDTO = z.infer<typeof academyVodPackageCreateDTOSchema>;

export const academyVodPackageUpdateDTOSchema = refineDiscountPrice(academyVodPackageBaseSchema.partial());
export type AcademyVodPackageUpdateDTO = z.infer<typeof academyVodPackageUpdateDTOSchema>;

export const academyVodPackageQueryDTOSchema = z.object({
  courseProfileId: z.string().uuid().optional(),
  instructorId: z.string().uuid().optional(),
  status: z.string().optional(),
  q: z.string().optional(),
  level: z.string().optional(),
});
export type AcademyVodPackageQueryDTO = z.infer<typeof academyVodPackageQueryDTOSchema>;
