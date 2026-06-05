-- Phạm vi quiz chỉ còn theo enrollment; bỏ denormalize live_class_id.

-- Gắn enrollment_id cho dữ liệu cũ (user + lớp LIVE) trước khi bỏ cột.
UPDATE "academy_exam_attempts" AS a
SET "enrollment_id" = e."id"
FROM "academy_enrollments" AS e
WHERE a."enrollment_id" IS NULL
  AND a."live_class_id" IS NOT NULL
  AND e."user_id" = a."user_id"
  AND e."live_class_id" = a."live_class_id";

ALTER TABLE "academy_exam_attempts" DROP COLUMN IF EXISTS "live_class_id";
