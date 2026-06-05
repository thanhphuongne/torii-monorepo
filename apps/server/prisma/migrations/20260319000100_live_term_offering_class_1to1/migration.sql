-- Migration: add LiveTerm, make CourseOffering 1:1 Class

-- 1) Enum for LiveTermStatus
DO $$ BEGIN
  CREATE TYPE "LiveTermStatus" AS ENUM ('DRAFT', 'OPENING', 'ONGOING', 'COMPLETED', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2) LiveTerm table
CREATE TABLE IF NOT EXISTS "academy_live_terms" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "course_profile_id" uuid NOT NULL,
  "term_code" varchar(50) NOT NULL,
  "status" "LiveTermStatus" NOT NULL DEFAULT 'DRAFT',
  "opening_date" timestamptz,
  "closing_date" timestamptz,
  "enrollment_open_at" timestamptz,
  "enrollment_close_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "academy_live_terms_course_profile_id_fkey"
    FOREIGN KEY ("course_profile_id") REFERENCES "academy_course_profiles"("id") ON DELETE CASCADE,
  CONSTRAINT "academy_live_terms_course_profile_id_term_code_key"
    UNIQUE ("course_profile_id", "term_code")
);

CREATE INDEX IF NOT EXISTS "academy_live_terms_course_profile_id_idx" ON "academy_live_terms"("course_profile_id");
CREATE INDEX IF NOT EXISTS "academy_live_terms_status_idx" ON "academy_live_terms"("status");

-- 3) Add termId to academy_classes
ALTER TABLE "academy_classes"
  ADD COLUMN IF NOT EXISTS "term_id" uuid;

DO $$ BEGIN
  ALTER TABLE "academy_classes"
    ADD CONSTRAINT "academy_classes_term_id_fkey"
    FOREIGN KEY ("term_id") REFERENCES "academy_live_terms"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "academy_classes_term_id_idx" ON "academy_classes"("term_id");

-- 4) CourseOffering: add class_id and backfill from join table
ALTER TABLE "academy_course_offerings"
  ADD COLUMN IF NOT EXISTS "class_id" uuid;

-- Backfill: choose is_primary first, else any linked class
UPDATE "academy_course_offerings" o
SET "class_id" = x.class_id
FROM (
  SELECT DISTINCT ON (occ.offering_id)
    occ.offering_id,
    occ.class_id
  FROM "academy_course_offering_classes" occ
  ORDER BY occ.offering_id, occ.is_primary DESC, occ.class_id
) x
WHERE o.id = x.offering_id
  AND o."class_id" IS NULL;

-- Create FK (after backfill)
DO $$ BEGIN
  ALTER TABLE "academy_course_offerings"
    ADD CONSTRAINT "academy_course_offerings_class_id_fkey"
    FOREIGN KEY ("class_id") REFERENCES "academy_classes"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Unique 1:1 between offering and class
DO $$ BEGIN
  ALTER TABLE "academy_course_offerings"
    ADD CONSTRAINT "academy_course_offerings_class_id_key" UNIQUE ("class_id");
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "academy_course_offerings_class_id_idx" ON "academy_course_offerings"("class_id");

-- 5) Drop old join table (now replaced by class_id)
DROP TABLE IF EXISTS "academy_course_offering_classes";

-- 6) Drop old syllabus_id from offerings (class.syllabusId is source of truth)
ALTER TABLE "academy_course_offerings"
  DROP COLUMN IF EXISTS "syllabus_id";

