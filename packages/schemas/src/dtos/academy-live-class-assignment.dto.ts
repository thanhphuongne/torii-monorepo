import { z } from 'zod';

export const academyLiveClassAssignmentCreateDTOSchema = z.object({
  liveClassId: z.string().uuid().optional(),
  vodPackageId: z.string().uuid().optional(),
  title: z.string().min(1).max(255),
  instructions: z.string().min(1),
  openAt: z.coerce.date().optional(),
  deadline: z.coerce.date().optional(),
});
export type AcademyLiveClassAssignmentCreateDTO = z.infer<
  typeof academyLiveClassAssignmentCreateDTOSchema
>;

export const academyLiveClassAssignmentUpdateDTOSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  instructions: z.string().min(1).optional(),
  openAt: z.coerce.date().optional(),
  deadline: z.coerce.date().optional(),
});
export type AcademyLiveClassAssignmentUpdateDTO = z.infer<
  typeof academyLiveClassAssignmentUpdateDTOSchema
>;
