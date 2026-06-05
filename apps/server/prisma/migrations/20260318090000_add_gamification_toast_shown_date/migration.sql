-- Add gamification toast/modal gating date
ALTER TABLE "user_gamification"
ADD COLUMN IF NOT EXISTS "last_toast_shown_date" VARCHAR(10);

