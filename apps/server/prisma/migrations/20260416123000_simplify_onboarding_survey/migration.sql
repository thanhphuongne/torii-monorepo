-- Simplify onboarding survey to minimal fields for course recommendation.
-- Keep only `jlpt_target` + optional `current_level`.

ALTER TABLE "onboarding_surveys"
  DROP COLUMN IF EXISTS "target_completion_time",
  DROP COLUMN IF EXISTS "purpose",
  DROP COLUMN IF EXISTS "jlpt_target_date",
  DROP COLUMN IF EXISTS "study_frequency",
  DROP COLUMN IF EXISTS "study_time_per_session";

ALTER TABLE "onboarding_surveys"
  ADD COLUMN IF NOT EXISTS "jlpt_target" VARCHAR(4);

-- Ensure current_level column type is constrained but keep data if present
ALTER TABLE "onboarding_surveys"
  ALTER COLUMN "current_level" TYPE VARCHAR(20);

