import { z } from 'zod';

export const onboardingSurveyDTOSchema = z.object({
  /// Mục tiêu JLPT dùng để gợi ý khoá học (N5..N1).
  /// Được mirror sang `user.userMetadata.jlptTarget` để dashboard lọc catalog.
  jlptTarget: z
    .string()
    .regex(/^N[1-5]$/i, 'jlptTarget phải là N1..N5')
    .optional(),

  /// Trình độ hiện tại (tuỳ chọn) — để hiển thị / mở rộng sau.
  currentLevel: z.string().optional(),
});

export type OnboardingSurveyDTO = z.infer<typeof onboardingSurveyDTOSchema>;
