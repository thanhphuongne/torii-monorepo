-- Align academy_exam_attempts FK column name with the rest of the academy schema (live_class_id).
ALTER TABLE "academy_exam_attempts" RENAME COLUMN "class_id" TO "live_class_id";
