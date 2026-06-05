-- Drop legacy difficulty field from academy question bank (no backward compatibility)
ALTER TABLE "academy_questions" DROP COLUMN IF EXISTS "difficulty";

