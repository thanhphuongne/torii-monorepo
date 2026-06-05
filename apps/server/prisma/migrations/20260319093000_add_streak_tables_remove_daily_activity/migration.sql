-- 1) New streak tables
CREATE TABLE IF NOT EXISTS "streaks" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL UNIQUE,
  "current_streak" INTEGER NOT NULL DEFAULT 0,
  "max_streak" INTEGER NOT NULL DEFAULT 0,
  "last_active_date" VARCHAR(10),
  "freeze_used_today" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_streaks_user_id" ON "streaks" ("user_id");

ALTER TABLE "streaks"
  ADD CONSTRAINT "fk_streaks_user_id"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS "streak_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "date" VARCHAR(10) NOT NULL,
  "status" VARCHAR(20) NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "uq_streak_logs_user_date" UNIQUE ("user_id", "date")
);

CREATE INDEX IF NOT EXISTS "idx_streak_logs_user_id" ON "streak_logs" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_streak_logs_date" ON "streak_logs" ("date");

ALTER TABLE "streak_logs"
  ADD CONSTRAINT "fk_streak_logs_user_id"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- 2) Remove daily_activities (no heatmap/analytics)
DROP TABLE IF EXISTS "daily_activities" CASCADE;

