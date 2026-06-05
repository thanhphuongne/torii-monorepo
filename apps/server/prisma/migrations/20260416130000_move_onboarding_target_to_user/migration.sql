-- Move onboarding target fields into `users` table (no separate onboarding_surveys table).

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "jlpt_target" VARCHAR(4),
  ADD COLUMN IF NOT EXISTS "current_level" VARCHAR(20);

-- Legacy table (no longer used)
DROP TABLE IF EXISTS "onboarding_surveys" CASCADE;

