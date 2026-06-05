-- Simplify AcademyQuestion classification:
-- - Remove legacy metadata field
-- - Drop category tables/links (no longer used)
-- - Add fixed category_type on academy_questions

-- 1) Add enum + column (idempotent-ish via DO blocks)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'academyquestioncategorytype') THEN
    CREATE TYPE "AcademyQuestionCategoryType" AS ENUM ('VOCABULARY', 'GRAMMAR', 'KANJI', 'READING', 'LISTENING');
  END IF;
END $$;

ALTER TABLE "academy_questions"
  ADD COLUMN IF NOT EXISTS "category_type" "AcademyQuestionCategoryType";

-- 2) Drop legacy metadata column
ALTER TABLE "academy_questions" DROP COLUMN IF EXISTS "metadata";

-- 3) Drop category link tables
DROP TABLE IF EXISTS "academy_question_category_links" CASCADE;
DROP TABLE IF EXISTS "academy_question_categories" CASCADE;

