-- CreateTable
CREATE TABLE "achievements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(64) NOT NULL,
    "category" VARCHAR(32) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "icon" VARCHAR(64),
    "requirements" JSONB NOT NULL DEFAULT '{}',
    "rewards" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_achievements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "achievement_id" UUID NOT NULL,
    "is_unlocked" BOOLEAN NOT NULL DEFAULT false,
    "progress" JSONB DEFAULT '{}',
    "unlocked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_class_attendances" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "live_schedule_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academy_class_attendances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "achievements_code_key" ON "achievements"("code");

-- CreateIndex
CREATE INDEX "user_achievements_user_id_idx" ON "user_achievements"("user_id");

-- CreateIndex
CREATE INDEX "user_achievements_achievement_id_idx" ON "user_achievements"("achievement_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_achievements_user_id_achievement_id_key" ON "user_achievements"("user_id", "achievement_id");

-- CreateIndex
CREATE INDEX "academy_class_attendances_live_schedule_id_idx" ON "academy_class_attendances"("live_schedule_id");

-- CreateIndex
CREATE INDEX "academy_class_attendances_user_id_idx" ON "academy_class_attendances"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "academy_class_attendances_live_schedule_id_user_id_key" ON "academy_class_attendances"("live_schedule_id", "user_id");

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_class_attendances" ADD CONSTRAINT "academy_class_attendances_live_schedule_id_fkey" FOREIGN KEY ("live_schedule_id") REFERENCES "academy_live_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_class_attendances" ADD CONSTRAINT "academy_class_attendances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
