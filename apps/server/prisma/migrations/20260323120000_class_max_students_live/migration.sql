-- LIVE class capacity (optional). VOD rows keep NULL.
ALTER TABLE "classroom_classes" ADD COLUMN "max_students" INTEGER;
