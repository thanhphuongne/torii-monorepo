import { z } from 'zod';

export const academyCohortBaseSchema = z.object({
  courseProfileId: z.string().uuid(),
  code: z.string().min(1).max(150),
  name: z.string().min(1).max(255),
  status: z.enum(['DRAFT', 'PENDING_APPROVAL', 'OPENING', 'COMPLETED', 'ARCHIVED']).optional(),
  enrollmentOpenAt: z.coerce.date().optional().nullable(),
  enrollmentCloseAt: z.coerce.date().optional().nullable(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  rejectionReason: z.string().optional().nullable(),
});

const refineDateSequence = (schema: z.ZodType<any, any, any>) =>
  schema.refine(data => {
    if (data.enrollmentOpenAt && data.enrollmentCloseAt) {
      return new Date(data.enrollmentOpenAt) < new Date(data.enrollmentCloseAt);
    }
    return true;
  }, {
    message: "Ngày mở đăng ký phải trước ngày đóng đăng ký",
    path: ["enrollmentOpenAt"],
  }).refine(data => {
    if (data.enrollmentCloseAt && data.startDate) {
      return new Date(data.enrollmentCloseAt) < new Date(data.startDate);
    }
    return true;
  }, {
    message: "Ngày đóng đăng ký phải trước ngày khai giảng",
    path: ["enrollmentCloseAt"],
  }).refine(data => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) < new Date(data.endDate);
    }
    return true;
  }, {
    message: "Ngày khai giảng phải trước ngày kết thúc",
    path: ["startDate"],
  });

export const academyCohortCreateDTOSchema = refineDateSequence(academyCohortBaseSchema);
export type AcademyCohortCreateDTO = z.infer<typeof academyCohortCreateDTOSchema>;

export const academyCohortUpdateDTOSchema = refineDateSequence(academyCohortBaseSchema.partial());
export type AcademyCohortUpdateDTO = z.infer<typeof academyCohortUpdateDTOSchema>;

export const academyCohortQueryDTOSchema = z.object({
  courseProfileId: z.string().uuid().optional(),
  status: z.string().optional(),
  q: z.string().optional(),
  onlyAvailable: z.coerce.boolean().optional(),
});
export type AcademyCohortQueryDTO = z.infer<typeof academyCohortQueryDTOSchema>;
