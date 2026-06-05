-- AlterTable
ALTER TABLE "academy_questions" ADD COLUMN     "category" VARCHAR(50),
ADD COLUMN     "level" VARCHAR(20);

-- CreateTable
CREATE TABLE "academy_question_pools" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(64),
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "course_profile_id" UUID,
    "level" VARCHAR(20),
    "category" VARCHAR(50),
    "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academy_question_pools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_pool_questions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pool_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academy_pool_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "academy_question_pools_code_key" ON "academy_question_pools"("code");

-- CreateIndex
CREATE INDEX "academy_question_pools_course_profile_id_idx" ON "academy_question_pools"("course_profile_id");

-- CreateIndex
CREATE INDEX "academy_question_pools_level_idx" ON "academy_question_pools"("level");

-- CreateIndex
CREATE INDEX "academy_question_pools_category_idx" ON "academy_question_pools"("category");

-- CreateIndex
CREATE INDEX "academy_question_pools_status_idx" ON "academy_question_pools"("status");

-- CreateIndex
CREATE INDEX "academy_pool_questions_pool_id_idx" ON "academy_pool_questions"("pool_id");

-- CreateIndex
CREATE INDEX "academy_pool_questions_question_id_idx" ON "academy_pool_questions"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "academy_pool_questions_pool_id_question_id_key" ON "academy_pool_questions"("pool_id", "question_id");

-- CreateIndex
CREATE INDEX "academy_questions_level_idx" ON "academy_questions"("level");

-- CreateIndex
CREATE INDEX "academy_questions_category_idx" ON "academy_questions"("category");

-- AddForeignKey
ALTER TABLE "academy_quiz_templates" ADD CONSTRAINT "academy_quiz_templates_question_pool_id_fkey" FOREIGN KEY ("question_pool_id") REFERENCES "academy_question_pools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_question_pools" ADD CONSTRAINT "academy_question_pools_course_profile_id_fkey" FOREIGN KEY ("course_profile_id") REFERENCES "academy_course_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_pool_questions" ADD CONSTRAINT "academy_pool_questions_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "academy_question_pools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_pool_questions" ADD CONSTRAINT "academy_pool_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "academy_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
